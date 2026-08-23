export function escapeMarkdownText(text: string): string {
  return text.replace(/[\r\n]+/g, " ").replace(/([\\`*_{}\[\]<>()#+\-.!|])/g, "\\$1");
}
