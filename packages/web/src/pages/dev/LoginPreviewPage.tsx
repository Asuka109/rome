import LoginPage from "../LoginPage";
import { BootstrapPreview } from "./BootstrapPreview";

// The real LoginPage, in the one phase that renders its sign-in view.
//
// `local` is the method the form branch serves. The `cloud` method renders a
// different view, so a second entry would be a second specimen rather than a
// variant of this one.
export default function LoginPreviewPage() {
  return (
    <BootstrapPreview bootstrap={{ phase: "needs-signin", method: "local" }}>
      <LoginPage />
    </BootstrapPreview>
  );
}
