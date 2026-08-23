export const FLIGHT_PRICE_PATTERN_SOURCE = String.raw`^From\s+[^0-9]*([0-9][0-9,.]*)`;

export function matchFlightPrice(label) {
  return String(label || "").match(new RegExp(FLIGHT_PRICE_PATTERN_SOURCE, "i"));
}
