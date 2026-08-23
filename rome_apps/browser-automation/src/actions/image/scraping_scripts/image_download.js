/**
 * image_download.js
 *
 * Browser-side script for downloading a previously generated ChatGPT image.
 * This runs after the conversation page has been refreshed so it can resolve
 * the final image asset from a clean page load.
 *
 * Entry point: downloadGeneratedChatGPTImage()
 * Returns: { imageUrl, mimeType, imageDataBase64, width, height }
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Find generated images within the conversation response area only.
 * Avoids matching gallery images or sidebar elements.
 */
function findConversationImages() {
  const results = [];
  const seen = new Set();

  const scope = document.querySelector("main") || document;

  for (const img of scope.querySelectorAll("img")) {
    const src = img.currentSrc || img.src || "";
    if (
      src.includes("/backend-api/estuary/content") &&
      !src.includes("gizmo_id") &&
      !seen.has(src)
    ) {
      seen.add(src);
      results.push({
        src,
        alt: img.alt || "",
        width: img.naturalWidth || undefined,
        height: img.naturalHeight || undefined,
      });
    }
  }

  return results;
}

/**
 * Parse the latest generated image from the conversation page.
 */
function getGeneratedImage() {
  const images = findConversationImages();
  if (images.length > 0) {
    return images[0];
  }

  throw new Error(
    'ChatGPT reported "Image created", but no generated image URL was found after refresh',
  );
}

/**
 * Wait for the refreshed conversation DOM to render the generated image.
 */
async function waitForGeneratedImage(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const images = findConversationImages();
    if (images.length > 0) {
      return images[0];
    }

    await sleep(500);
  }

  return getGeneratedImage();
}

/**
 * Try to get a higher-resolution version of the image.
 */
async function resolveBestImageSource(item) {
  if (item.src && !item.src.includes("thumbnail")) {
    return item;
  }

  const openButton = document.querySelector('button[aria-label^="Generated image:"]');
  if (openButton) {
    openButton.click();
    await sleep(1000);

    const dialogImage = Array.from(
      document.querySelectorAll('[role="dialog"] img, dialog img, [data-state="open"] img'),
    ).find((img) => {
      const src = img.currentSrc || img.src || "";
      return src.includes("/backend-api/estuary/content") && !src.includes("gizmo_id");
    });

    if (dialogImage) {
      const fullSrc = dialogImage.currentSrc || dialogImage.src;
      const closeButton = document.querySelector(
        '[role="dialog"] button[aria-label="Close"], dialog button[aria-label="Close"]',
      );
      if (closeButton) {
        closeButton.click();
      }
      await sleep(300);

      return {
        ...item,
        src: fullSrc,
        width: dialogImage.naturalWidth || item.width,
        height: dialogImage.naturalHeight || item.height,
      };
    }

    const closeButton = document.querySelector(
      '[role="dialog"] button[aria-label="Close"], dialog button[aria-label="Close"]',
    );
    if (closeButton) {
      closeButton.click();
    }
    await sleep(300);
  }

  return item;
}

/**
 * Convert a Uint8Array to a base64 string.
 */
function uint8ArrayToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = "";
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Fetch image data and return as base64.
 */
async function fetchImagePayload(imageUrl) {
  const response = await fetch(imageUrl, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to download generated image: ${response.status}`);
  }

  const blob = await response.blob();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return {
    mimeType: blob.type || response.headers.get("content-type") || "application/octet-stream",
    base64: uint8ArrayToBase64(bytes),
  };
}

async function downloadGeneratedChatGPTImage() {
  const generatedImage = await waitForGeneratedImage();
  const resolvedImage = await resolveBestImageSource(generatedImage);
  const payload = await fetchImagePayload(resolvedImage.src);

  return {
    imageUrl: resolvedImage.src,
    mimeType: payload.mimeType,
    imageDataBase64: payload.base64,
    width: resolvedImage.width,
    height: resolvedImage.height,
  };
}
