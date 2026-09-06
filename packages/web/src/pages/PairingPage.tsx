import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PairingRequestCard } from "@/components/pairing-requests";
import { fetchPairings, resolvePairing, type PairingRequest } from "@/lib/pairing-api";

export default function PairingPage() {
  const { t } = useTranslation("settings");
  const { id = "" } = useParams();
  const token = useMemo(() => new URLSearchParams(location.hash.slice(1)).get("token") ?? "", []);
  const [request, setRequest] = useState<PairingRequest | null>();
  useEffect(() => {
    void fetchPairings()
      .then((rows) => setRequest(rows.find((row) => row.id === id) ?? null))
      .catch(() => setRequest(null));
  }, [id]);
  return (
    <div className="mx-auto w-full max-w-xl p-6">
      <h1 className="text-title text-foreground">{t("pairing.pageTitle")}</h1>
      <p className="mt-1 text-body text-muted-foreground">{t("pairing.pageDescription")}</p>
      <div className="mt-6">
        {request === undefined ? (
          <p role="status">{t("pairing.loading")}</p>
        ) : request === null ? (
          <p role="status">{t("pairing.unavailable")}</p>
        ) : (
          <PairingRequestCard
            request={{ ...request, pairingUrl: null, cli: null }}
            onDecision={(decision) => resolvePairing(request.id, decision, token)}
          />
        )}
      </div>
    </div>
  );
}
