import type {
  ImageGenerationContext,
  ImageGenerationInterface,
  ImageGenerationOutcome,
  ImageGenerationProvider,
  ImageGenerationProviderInfo,
  ImageGenerationRequest,
  ImageProviderAvailability,
  ImageProviderGenerateResult,
} from "@rome-os/app-runtime";
import { createLogger } from "../../logger.js";

const log = createLogger("image-generation");

/**
 * Provider registry + selection for the image generation capability.
 *
 * `generate` walks the providers in registration order: an unavailable
 * provider (advisory `availability()` or a fail-closed `unavailable` generate
 * result) falls through to the next one, while a `failed` result stops the
 * sweep — that provider ran and refused or errored, and retrying the same
 * prompt on another backend is a policy decision this layer does not take.
 * When nothing can serve the request, the outcome carries every provider's
 * reason and remedy so callers can tell the user exactly what to connect.
 */
export function createImageGenerationService(options: {
  providers: ImageGenerationProvider[];
}): ImageGenerationInterface {
  const providers = [...options.providers];

  return {
    listProviders(): ImageGenerationProviderInfo[] {
      return providers.map(({ id, displayName }) => ({ id, displayName }));
    },

    async generate(
      request: ImageGenerationRequest,
      ctx?: ImageGenerationContext,
    ): Promise<ImageGenerationOutcome> {
      const unavailable: Array<ImageGenerationProviderInfo & { reason: string; remedy: string }> =
        [];

      for (const provider of providers) {
        let availability: ImageProviderAvailability;
        try {
          availability = await provider.availability();
        } catch (err) {
          // Availability is advisory; generate() is the fail-closed gate.
          log.warn("image provider availability check failed", {
            provider: provider.id,
            error: err instanceof Error ? err.message : String(err),
          });
          availability = { available: true };
        }
        if (!availability.available) {
          unavailable.push({
            id: provider.id,
            displayName: provider.displayName,
            reason: availability.reason,
            remedy: availability.remedy,
          });
          continue;
        }

        let result: ImageProviderGenerateResult;
        try {
          result = await provider.generate(request, ctx);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          log.warn("image provider generate threw", { provider: provider.id, error: message });
          return { status: "failed", providerId: provider.id, message };
        }

        if (result.status === "ok") {
          return { status: "ok", providerId: provider.id, image: result.image };
        }
        if (result.status === "unavailable") {
          unavailable.push({
            id: provider.id,
            displayName: provider.displayName,
            reason: result.reason,
            remedy: result.remedy,
          });
          continue;
        }
        return { status: "failed", providerId: provider.id, message: result.message };
      }

      return { status: "unavailable", providers: unavailable };
    },
  };
}
