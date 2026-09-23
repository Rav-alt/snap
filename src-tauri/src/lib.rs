// The Rust side of Snap.
//
// This file defines the "commands" — Rust functions the React frontend can
// call through Tauri's invoke(). These handle the native work the browser
// layer can't do: reading/writing files and launching applications.

use std::fs;
use std::io::ErrorKind;
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Command;

use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};
use winapi::shared::minwindef::{BOOL, DWORD, FALSE, LPARAM, TRUE};
use winapi::shared::windef::HWND;
use winapi::um::winuser::{
    EnumWindows, GetWindowThreadProcessId, IsWindowVisible, SetWindowPos, ShowWindow, HWND_TOP,
    SWP_NOACTIVATE, SWP_NOZORDER, SW_MAXIMIZE,
};

// These structs mirror the TypeScript types in src/types/workspace.ts.
// `serde` turns them to/from JSON automatically. Field names here match the
// JSON keys exactly (all lowercase), so no renaming is needed.

/// Where/how to place an app's window. Presets carry explicit pixels computed
/// by the frontend, so Rust doesn't need to know the screen size.
#[derive(Serialize, Deserialize, Clone)]
struct WindowLayout {
    mode: String, // "default" | "maximized" | "left" | ... | "custom"
    #[serde(default)]
    x: Option<i32>,
    #[serde(default)]
    y: Option<i32>,
    #[serde(default)]
    width: Option<i32>,
    #[serde(default)]
    height: Option<i32>,
}

#[derive(Serialize, Deserialize)]
struct Application {
    name: String,
    path: String,
    // Extra command-line arguments (e.g. Chrome URLs/flags). `default` means
    // old saved data without this field still loads (as an empty list).
    #[serde(default)]
    args: Vec<String>,
    // Optional window placement. Old saved data without this loads as None.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    window: Option<WindowLayout>,
}

/// A Chrome profile: its folder name (used with --profile-directory) and the
/// friendly display name the user recognizes.
#[derive(Serialize)]
struct ChromeProfile {
    directory: String,
    name: String,
}

#[derive(Serialize, Deserialize)]
struct Workspace {
    id: String,
    name: String,
    icon: String,
    shortcut: String,
    applications: Vec<Application>,
}

/// The result of trying to launch a single application. Sent back to React
/// so the UI can report exactly which apps started and which failed.
#[derive(Serialize)]
struct LaunchOutcome {
    name: String,
    path: String,
    ok: bool,
    error: Option<String>, // a human-friendly message when ok == false
}

/// An application detected on the machine (from a Start Menu shortcut).
#[derive(Serialize, Deserialize)]
struct DetectedApp {
    name: String,
    path: String,
}

/// Work out the full path to our data file, inside the OS's per-app data
/// folder (e.g. C:\Users\<you>\AppData\Roaming\com.snap.app\workspaces.json).
/// We never hardcode a path — Tauri gives us the correct location per-OS.
fn workspaces_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve the app data directory: {e}"))?;
    Ok(dir.join("workspaces.json"))
}

/// Read and parse the workspaces file. Shared by load and launch.
fn read_workspaces(app: &AppHandle) -> Result<Vec<Workspace>, String> {
    let file = workspaces_file(app)?;

    if !file.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(&file)
        .map_err(|e| format!("Could not read the workspaces file: {e}"))?;

    serde_json::from_str(&contents).map_err(|e| format!("The workspaces file is corrupted: {e}"))
}

/// Load all saved workspaces. Empty list on first run (no file) — not an error.
#[tauri::command]
fn load_workspaces(app: AppHandle) -> Result<Vec<Workspace>, String> {
    read_workspaces(&app)
}

/// Save the given workspaces, replacing whatever was there before.
/// Creates the data folder if it doesn't exist yet.
#[tauri::command]
fn save_workspaces(app: AppHandle, workspaces: Vec<Workspace>) -> Result<(), String> {
    let file = workspaces_file(&app)?;

    if let Some(dir) = file.parent() {
        fs::create_dir_all(dir)
            .map_err(|e| format!("Could not create the data folder: {e}"))?;
    }

    // Pretty-print so the file is human-readable if you ever open it.
    let json = serde_json::to_string_pretty(&workspaces)
        .map_err(|e| format!("Could not turn workspaces into JSON: {e}"))?;

    fs::write(&file, json).map_err(|e| format!("Could not write the workspaces file: {e}"))?;

    Ok(())
}

/// Launch every application in the workspace with the given id.
///
/// Returns one LaunchOutcome per application. We deliberately try to start
/// ALL of them and collect the results — one missing app must not stop the
/// others. The outer Err is only for "couldn't even find the workspace".
#[tauri::command]
fn launch_workspace(app: AppHandle, id: String) -> Result<Vec<LaunchOutcome>, String> {
    let workspaces = read_workspaces(&app)?;

    let workspace = workspaces
        .into_iter()
        .find(|w| w.id == id)
        .ok_or_else(|| format!("Workspace \"{id}\" was not found."))?;

    let mut outcomes = Vec::new();

    for application in &workspace.applications {
        let chrome = is_chrome(&application.path);
        let mut command = Command::new(&application.path);

        if chrome {
            // Chrome positions reliably via flags. Skip any window flags baked
            // into args (legacy) and set them from the structured layout.
            for arg in &application.args {
                if arg.starts_with("--window-position=")
                    || arg.starts_with("--window-size=")
                    || arg == "--start-maximized"
                {
                    continue;
                }
                command.arg(arg);
            }
            if let Some(layout) = &application.window {
                for flag in chrome_window_flags(layout) {
                    command.arg(flag);
                }
            }
        } else {
            command.args(&application.args);
        }

        match command.spawn() {
            Ok(child) => {
                // Non-Chrome apps are positioned via the Windows API once their
                // window appears (best-effort — see position_window_later).
                if !chrome {
                    if let Some(layout) = &application.window {
                        if layout.mode != "default" {
                            position_window_later(child.id(), layout.clone());
                        }
                    }
                }
                outcomes.push(LaunchOutcome {
                    name: application.name.clone(),
                    path: application.path.clone(),
                    ok: true,
                    error: None,
                });
            }
            Err(e) => outcomes.push(LaunchOutcome {
                name: application.name.clone(),
                path: application.path.clone(),
                ok: false,
                error: Some(friendly_launch_error(&e)),
            }),
        }
    }

    Ok(outcomes)
}

/// Turn a raw OS error into a message a person can actually understand,
/// instead of exposing something like "os error 2".
fn friendly_launch_error(e: &std::io::Error) -> String {
    match e.kind() {
        ErrorKind::NotFound => "The application could not be found at this path.".to_string(),
        ErrorKind::PermissionDenied => {
            "Permission denied — this app may require administrator rights.".to_string()
        }
        _ => format!("Could not start the application ({e})."),
    }
}

// --- Window positioning ----------------------------------------------------

fn is_chrome(path: &str) -> bool {
    path.to_lowercase().ends_with("chrome.exe")
}

/// Turn a layout into the Chrome flags that place its window.
fn chrome_window_flags(layout: &WindowLayout) -> Vec<String> {
    let mut flags = Vec::new();
    match layout.mode.as_str() {
        "default" => {}
        "maximized" => flags.push("--start-maximized".to_string()),
        _ => {
            if let (Some(x), Some(y)) = (layout.x, layout.y) {
                flags.push(format!("--window-position={},{}", x, y));
            }
            if let (Some(w), Some(h)) = (layout.width, layout.height) {
                flags.push(format!("--window-size={},{}", w, h));
            }
        }
    }
    flags
}

struct FindWindow {
    pid: u32,
    hwnd: HWND,
}

// Called once per top-level window by EnumWindows. Stops when it finds a
// visible window owned by the process we're looking for.
unsafe extern "system" fn enum_windows_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
    let data = &mut *(lparam as *mut FindWindow);
    let mut window_pid: DWORD = 0;
    GetWindowThreadProcessId(hwnd, &mut window_pid);
    if window_pid == data.pid && IsWindowVisible(hwnd) != 0 {
        data.hwnd = hwnd;
        return FALSE; // stop enumerating
    }
    TRUE
}

fn find_main_window(pid: u32) -> Option<HWND> {
    let mut data = FindWindow {
        pid,
        hwnd: std::ptr::null_mut(),
    };
    unsafe {
        EnumWindows(Some(enum_windows_proc), &mut data as *mut _ as LPARAM);
    }
    if data.hwnd.is_null() {
        None
    } else {
        Some(data.hwnd)
    }
}

/// Position a launched app's window once it appears. Best-effort: it polls for
/// a few seconds and does nothing if no matching window shows up (e.g. the app
/// launched through a separate launcher process, so the PID never owns a window).
fn position_window_later(pid: u32, layout: WindowLayout) {
    std::thread::spawn(move || {
        for _ in 0..25 {
            if let Some(hwnd) = find_main_window(pid) {
                unsafe {
                    if layout.mode == "maximized" {
                        ShowWindow(hwnd, SW_MAXIMIZE);
                    } else if let (Some(x), Some(y), Some(w), Some(h)) =
                        (layout.x, layout.y, layout.width, layout.height)
                    {
                        SetWindowPos(
                            hwnd,
                            HWND_TOP,
                            x,
                            y,
                            w,
                            h,
                            SWP_NOZORDER | SWP_NOACTIVATE,
                        );
                    }
                }
                return;
            }
            std::thread::sleep(std::time::Duration::from_millis(200));
        }
    });
}

/// Detect installed applications by scanning the Start Menu for shortcuts and
/// resolving each one to its target .exe.
///
/// We shell out to PowerShell's WScript.Shell COM object to read shortcut
/// targets — the same mechanism Windows itself uses — so NO extra Rust
/// dependency is needed. The scan runs in a hidden window.
#[tauri::command]
fn detect_apps() -> Result<Vec<DetectedApp>, String> {
    // CREATE_NO_WINDOW stops a console window from flashing during the scan.
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;

    let script = r#"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$shell = New-Object -ComObject WScript.Shell
$dirs = @(
  "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
  "$env:AppData\Microsoft\Windows\Start Menu\Programs"
)
$apps = foreach ($dir in $dirs) {
  Get-ChildItem -Path $dir -Filter *.lnk -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    $target = $shell.CreateShortcut($_.FullName).TargetPath
    if ($target -and $target.ToLower().EndsWith('.exe') -and (Test-Path -LiteralPath $target)) {
      [PSCustomObject]@{ name = $_.BaseName; path = $target }
    }
  }
}
$apps | Sort-Object path -Unique | Sort-Object name | ConvertTo-Json -Compress
"#;

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|e| format!("Could not run the app scan: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();

    // No shortcuts found (or nothing resolved to an .exe) → empty list.
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(Vec::new());
    }

    // ConvertTo-Json emits a single object (not an array) when there's exactly
    // one result, so we accept both shapes.
    let value: serde_json::Value = serde_json::from_str(trimmed)
        .map_err(|e| format!("Could not read the detected app list: {e}"))?;

    let apps: Vec<DetectedApp> = match value {
        serde_json::Value::Array(_) => serde_json::from_value(value)
            .map_err(|e| format!("Could not parse the detected apps: {e}"))?,
        serde_json::Value::Object(_) => {
            let single: DetectedApp = serde_json::from_value(value)
                .map_err(|e| format!("Could not parse the detected app: {e}"))?;
            vec![single]
        }
        _ => Vec::new(),
    };

    Ok(apps)
}

/// Extract an application's icon from its .exe and return it as a PNG
/// `data:` URL that React can drop straight into an <img>. Returns an error
/// (which the UI treats as "no icon, use the letter fallback") if the file
/// has no icon or can't be read.
#[tauri::command]
fn get_app_icon(path: String) -> Result<String, String> {
    // 32px is a good balance of crispness and size for our small tiles.
    let png = systemicons::get_icon(&path, 32)
        .map_err(|e| format!("Could not read the app icon: {e:?}"))?;

    let encoded = base64::engine::general_purpose::STANDARD.encode(&png);
    Ok(format!("data:image/png;base64,{encoded}"))
}

/// List the user's Chrome profiles by reading Chrome's `Local State` file,
/// which maps each profile folder ("Default", "Profile 1", …) to its display
/// name. Returns an empty list if Chrome isn't installed.
#[tauri::command]
fn detect_chrome_profiles() -> Result<Vec<ChromeProfile>, String> {
    let local_app_data =
        std::env::var("LOCALAPPDATA").map_err(|e| format!("Could not find LOCALAPPDATA: {e}"))?;

    let path = PathBuf::from(local_app_data)
        .join("Google")
        .join("Chrome")
        .join("User Data")
        .join("Local State");

    // Chrome not installed / never run → no profiles, not an error.
    if !path.exists() {
        return Ok(Vec::new());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Could not read Chrome's profile list: {e}"))?;
    let json: serde_json::Value = serde_json::from_str(&contents)
        .map_err(|e| format!("Could not parse Chrome's profile list: {e}"))?;

    let mut profiles = Vec::new();
    if let Some(cache) = json
        .get("profile")
        .and_then(|p| p.get("info_cache"))
        .and_then(|c| c.as_object())
    {
        for (directory, info) in cache {
            let name = info
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or(directory)
                .to_string();
            profiles.push(ChromeProfile {
                directory: directory.clone(),
                name,
            });
        }
    }

    profiles.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(profiles)
}

// Demo command from the starter — kept for reference.
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Bring the main window back into view (from the tray).
fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Load the global-shortcut plugin (desktop only). The shortcuts
            // themselves are registered from the frontend, per workspace.
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_global_shortcut::Builder::new().build())?;

            // Load the autostart plugin. When Windows launches Snap at login it
            // passes "--minimized", so we can start hidden in the tray.
            #[cfg(desktop)]
            app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--minimized"]),
            ))?;

            // System tray: keeps Snap alive in the background so global
            // shortcuts keep working after the window is closed.
            let show = MenuItem::with_id(app, "show", "Show Snap", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Snap", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Snap")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_main_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            // If Windows auto-started us at login, go straight to the tray
            // instead of popping the window open.
            #[cfg(desktop)]
            if std::env::args().any(|arg| arg == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }

            Ok(())
        })
        // Closing the window HIDES it (to the tray) instead of quitting, so
        // Snap keeps running in the background. "Quit Snap" in the tray exits.
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        // Every command must be listed here to be reachable from React.
        .invoke_handler(tauri::generate_handler![
            greet,
            load_workspaces,
            save_workspaces,
            launch_workspace,
            detect_apps,
            get_app_icon,
            detect_chrome_profiles
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
