import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Check, MailCheck } from "lucide-react";
import { defineComponent, type AppComponentContext } from "@rome-os/app-web-sdk";
import { Button } from "@rome-os/ui/button";

// Shown right after the hello email is sent. The guardian confirms receipt
// (`{ received: true }`) — optional, either button moves on. "Didn't get it?"
// reveals a spam hint plus a resend (`{ resend: true }`, which re-sends and
// re-shows this card) and a plain continue (`{ received: false }`).

function EmailReceipt({ ctx }: { ctx: AppComponentContext }) {
  const resolved = ctx.host.resolved;
  const guardianEmail =
    typeof ctx.props.guardianEmail === "string" ? ctx.props.guardianEmail : "your inbox";
  const [showTrouble, setShowTrouble] = useState(false);

  if (resolved) {
    return (
      <div className="flex w-full max-w-md items-center gap-2 rounded-12 border border-primary/40 bg-primary/5 p-3 text-sm text-foreground">
        <Check className="size-4 text-primary" /> Thanks — we're connected.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3 rounded-12 border border-border bg-card p-4">
      <div className="flex items-start gap-2.5">
        <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-sm text-foreground">
          I just emailed <span className="font-medium">{guardianEmail}</span>. Take a look — did it
          arrive?
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => ctx.host.submit({ received: true }, "Got it")}>Got it</Button>
        <Button variant="outline" onClick={() => setShowTrouble((v) => !v)}>
          Didn't get it?
        </Button>
      </div>

      {showTrouble ? (
        <div className="space-y-2.5 rounded-12 border border-border bg-surface/60 p-3">
          <p className="text-xs text-muted-foreground">
            Check your spam / junk folder — first emails often land there. Still nothing?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => ctx.host.submit({ resend: true, guardianEmail }, "Resend the email")}
            >
              Resend
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => ctx.host.submit({ received: false }, "Continue anyway")}
            >
              Continue anyway
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

defineComponent("email-receipt", (container, ctx) => {
  const root = createRoot(container);
  root.render(<EmailReceipt ctx={ctx} />);
  return () => root.unmount();
});
