/**
 * Return the app-local part of a runtime artifact id.
 *
 * Runtime references stay canonical (`<app-id>:<local-name>`), while labels
 * shown inside an already identified app context use the local name.
 */
export function artifactLocalName(id: string): string {
  const separator = id.indexOf(":");
  return separator < 0 ? id : id.slice(separator + 1);
}

/** The owning app id carried by a canonical artifact id, when present. */
export function artifactOwnerId(id: string): string | null {
  const separator = id.indexOf(":");
  return separator < 0 ? null : id.slice(0, separator);
}
