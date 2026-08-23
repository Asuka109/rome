import { Hono } from "hono";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppStoreReader } from "../../apps/store-service.js";

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function appStoreRoutes(appStore: AppStoreReader): Hono {
  const app = new Hono();

  app.get("/app-store/listings", async (c) => {
    const result = await appStore.listListings({
      sort: c.req.query("sort"),
      query: c.req.query("q"),
      limit: parseOptionalNumber(c.req.query("limit")),
      offset: parseOptionalNumber(c.req.query("offset")),
    });
    c.header("Cache-Control", "no-store");
    return c.json(result.body, result.status as ContentfulStatusCode);
  });

  // Listing detail proxy. The two URL shapes mirror Rome Cloud's:
  //   - GET /app-store/listings/<name>            unscoped
  //   - GET /app-store/listings/@<handle>/<slug>  scoped
  const handleListingDetail = async (c: Context, listingId: string) => {
    const result = await appStore.getListing({ listingId });
    c.header("Cache-Control", "no-store");
    return c.json(result.body, result.status as ContentfulStatusCode);
  };

  app.get("/app-store/listings/:handle", async (c) => {
    const handle = c.req.param("handle");
    return handleListingDetail(c, handle);
  });

  app.get("/app-store/listings/:handle/:slug", async (c) => {
    const handle = c.req.param("handle");
    const slug = c.req.param("slug");
    return handleListingDetail(c, `${handle}/${slug}`);
  });

  return app;
}
