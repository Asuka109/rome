import OnboardPage from "../OnboardPage";
import { BootstrapPreview } from "./BootstrapPreview";

// The real OnboardPage, opening on the profile step.
//
// `needs-onboarding` is the phase every signed-in box reaches onboarding
// through. `needs-account` opens the same stepper one step earlier, on
// create-account, and the page captures that choice at mount.
export default function OnboardPreviewPage() {
  return (
    <BootstrapPreview bootstrap={{ phase: "needs-onboarding" }}>
      <OnboardPage />
    </BootstrapPreview>
  );
}
