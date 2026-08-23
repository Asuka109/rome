import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/fetch-json";
import { useTheme } from "@/hooks/use-theme";

// Keep in sync with FEEDBACK_BODY_MAX on the backend; the textarea caps input
// client-side so the user gets immediate feedback, the server enforces it.
const BODY_MAX = 4_000;

// Global feedback dialog: free text plus the context the dashboard owns
// (route, theme, UA, viewport). The instance attaches server-measured
// diagnostics and relays the report to Rome Cloud for triage. Controlled, so the
// launcher can live in the profile dropdown (which unmounts its items on
// select) while the dialog persists in the shell.
export function ShareFeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const { theme, resolved } = useTheme();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const trimmed = body.trim();
  const canSubmit = trimmed.length > 0 && trimmed.length <= BODY_MAX && !submitting;

  function close() {
    if (submitting) return;
    setBody("");
    onClose();
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await fetchJson<{ ok: true }>("/api/feedback", {
        method: "POST",
        json: {
          body: trimmed,
          client: {
            route: location.pathname,
            theme,
            mode: resolved,
            userAgent: navigator.userAgent,
            language: navigator.language,
            viewport: { w: window.innerWidth, h: window.innerHeight },
          },
        },
        fallback: t("feedback.error"),
      });
      toast.success(t("feedback.sent"));
      setBody("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("feedback.error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      ariaLabel={t("feedback.title")}
      initialFocusRef={textareaRef}
    >
      <DialogHeader onClose={close}>
        <DialogTitle>{t("feedback.title")}</DialogTitle>
      </DialogHeader>
      <DialogBody>
        <DialogDescription className="mb-3">{t("feedback.description")}</DialogDescription>
        <Textarea
          ref={textareaRef}
          value={body}
          maxLength={BODY_MAX}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("feedback.placeholder")}
          rows={5}
          aria-label={t("feedback.title")}
        />
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={close} disabled={submitting}>
          {t("feedback.cancel")}
        </Button>
        <Button type="button" onClick={submit} disabled={!canSubmit}>
          {submitting ? t("feedback.sending") : t("feedback.submit")}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
