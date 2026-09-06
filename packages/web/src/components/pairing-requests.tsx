import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { fetchPairings, resolvePairing, type PairingRequest } from "@/lib/pairing-api";

export function PairingRequests() {
  const { t } = useTranslation("settings");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["pairings"],
    queryFn: fetchPairings,
    refetchInterval: 5_000,
  });
  if (!query.data?.length) return null;
  return (
    <section aria-labelledby="pairing-requests-title" className="space-y-3">
      <div>
        <h3 id="pairing-requests-title" className="text-ui text-foreground">
          {t("pairing.title")}
        </h3>
        <p className="text-aux text-muted-foreground">{t("pairing.description")}</p>
      </div>
      {query.data.map((request) => (
        <PairingRequestCard
          key={request.id}
          request={request}
          onDecision={async (decision) => {
            await resolvePairing(request.id, decision);
            await queryClient.invalidateQueries({ queryKey: ["pairings"] });
          }}
        />
      ))}
    </section>
  );
}

export function PairingRequestCard({
  request,
  onDecision,
}: {
  request: PairingRequest;
  onDecision: (decision: "approve" | "reject") => Promise<void>;
}) {
  const { t } = useTranslation("settings");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const decide = async (decision: "approve" | "reject") => {
    setBusy(true);
    setResult(null);
    try {
      await onDecision(decision);
      setResult(t(decision === "approve" ? "pairing.approved" : "pairing.rejected"));
    } catch (error) {
      setResult(error instanceof Error ? error.message : t("pairing.failed"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <article className="rounded-8 border border-border bg-surface p-4">
      <p className="text-ui text-foreground">{request.displayName || request.channelUserId}</p>
      <p className="text-aux text-muted-foreground">
        {request.channel} · {request.channelUserId}
      </p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => void decide("approve")}>
          {t("pairing.approve")}
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void decide("reject")}>
          {t("pairing.reject")}
        </Button>
      </div>
      {(request.pairingUrl || request.cli) && (
        <details className="mt-3 text-aux">
          <summary className="cursor-pointer text-muted-foreground">
            {t("pairing.otherWays")}
          </summary>
          {request.pairingUrl && (
            <p className="mt-2 break-all">
              <a className="text-info-fg underline" href={request.pairingUrl}>
                {t("pairing.openLink")}
              </a>
            </p>
          )}
          {request.cli && (
            <div className="mt-2 space-y-1">
              <p className="text-muted-foreground">{t("pairing.cli")}</p>
              <code className="block overflow-x-auto rounded-4 bg-surface-raised p-2">
                {request.cli.approve}
              </code>
              <code className="block overflow-x-auto rounded-4 bg-surface-raised p-2">
                {request.cli.reject}
              </code>
            </div>
          )}
        </details>
      )}
      <p role="status" aria-live="polite" className="mt-2 text-aux text-muted-foreground">
        {result}
      </p>
    </article>
  );
}
