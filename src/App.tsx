import { ApplicationProviders } from "./app/providers";
import { Router } from "./app/routes";

function App() {
  return (
    <ApplicationProviders>
      <Router />
    </ApplicationProviders>
  );
}

export default App;
