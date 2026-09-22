// App is now just the entry point that renders our main page.
// As Snap grows (settings, etc.) this is where top-level routing would live.

import { WorkspacesPage } from "./pages/WorkspacesPage";

function App() {
  return <WorkspacesPage />;
}

export default App;
