// Inline cards (connect, login) re-mount with `host.resolved === true` after any
// outcome — success OR dismiss. The submitted result is the only signal that
// tells them apart: a dismiss resolves with `{ dismissed: true }`, a real
// completion with the card's own payload (`{ status: "connected" }`, etc.). A
// card that keys its terminal view off `resolved` alone wrongly renders a
// dismissed card as connected/signed-in, so every card must gate success on this.
export function wasDismissed(result: Record<string, unknown> | undefined): boolean {
  return result?.dismissed === true;
}
