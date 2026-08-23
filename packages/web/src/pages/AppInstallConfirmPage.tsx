import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AppInstallConfirm } from "@/components/AppInstallConfirm";
import { PageShell } from "@/shell/PageShell";

export default function AppInstallConfirmPage() {
  const { t } = useTranslation("apps");
  const navigate = useNavigate();
  const params = useParams<{ handle: string; slug?: string }>();
  const [searchParams] = useSearchParams();
  const requestedVersion = searchParams.get("v");

  const rawHandle = params.handle ?? "";
  const rawSlug = params.slug;
  const listingId = rawSlug !== undefined ? `${rawHandle}/${rawSlug}` : rawHandle;

  const handleInstalled = useCallback(
    (name: string) => {
      toast.success(t("installed.installSuccess", { name }));
      navigate("/apps");
    },
    [navigate, t],
  );

  const handleCancel = useCallback(() => {
    navigate("/apps");
  }, [navigate]);

  return (
    <PageShell>
      {/* The confirm card keeps its own narrow measure; the frame around it is
          the shared one, so the card starts at the same x as every page's h1. */}
      <div className="max-w-xl">
        <AppInstallConfirm
          listingId={listingId}
          requestedVersion={requestedVersion}
          onInstalled={handleInstalled}
          onCancel={handleCancel}
        />
      </div>
    </PageShell>
  );
}
