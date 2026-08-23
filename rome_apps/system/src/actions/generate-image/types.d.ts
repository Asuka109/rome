export interface GenerateImageOutput {
  /** Absolute local path of the saved image (valid as a send_message attachment source). */
  imagePath: string;
  /** Dashboard asset URL serving the same file (renders inline in webchat markdown). */
  imageUrl: string;
  mimeType: string;
  /** Id of the image generation provider that produced the image (e.g. "codex"). */
  provider: string;
  /** The prompt the image model actually used, when it revised the input. */
  revisedPrompt?: string;
}
