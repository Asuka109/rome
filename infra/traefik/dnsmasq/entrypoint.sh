#!/bin/sh
# rome-edge DNS singleton entrypoint.
#
# Answers every `*.rome.localhost` name with Traefik's CURRENT rome-edge IP, so a
# container that looks up e.g. `<slug>.rome.localhost` lands on Traefik
# and gets Host-routed exactly like the browser does. Everything else is forwarded
# to the container's own embedded Docker resolver (127.0.0.11) so normal DNS
# (npmjs.org, other service names) still works for anyone pointed here.
#
# `traefik` resolves via 127.0.0.11 because dnsmasq and Traefik share the
# rome-traefik compose project (service-name alias on rome-edge). We re-resolve on
# a loop and SIGHUP dnsmasq when the IP changes, so a Traefik restart that hands it
# a new bridge IP heals within one tick instead of stranding the wildcard.
set -eu

CONF_DIR=/etc/dnsmasq.d
CONF="$CONF_DIR/rome-edge.conf"
mkdir -p "$CONF_DIR"

resolve_traefik() {
  # First A record for the `traefik` compose service on rome-edge.
  getent ahostsv4 traefik 2>/dev/null | awk 'NR==1 {print $1}'
}

write_conf() {
  # $1 = traefik ip.
  #   local=/rome.localhost/  — be AUTHORITATIVE for the zone: answer only from
  #     local config, NEVER forward. Without this, AAAA queries for
  #     *.rome.localhost get forwarded to the upstream Docker resolver, which
  #     fabricates `::1` for anything under `.localhost` (RFC 6761). Node's fetch
  #     then grabs that `::1` under verbatim ordering and connects to nothing.
  #     `local` makes AAAA return a clean NODATA, so Node falls back to the A
  #     record below (Traefik) — the whole point.
  #   address=/rome.localhost/<ip> — wildcard A for every *.rome.localhost name
  #     (<slug>…, obs, …) -> Traefik.
  {
    printf 'local=/rome.localhost/\n'
    printf 'address=/rome.localhost/%s\n' "$1"
  } >"$CONF"
}

ip="$(resolve_traefik || true)"
while [ -z "${ip:-}" ]; do
  echo "dnsmasq: waiting for the traefik service to be resolvable on rome-edge ..." >&2
  sleep 1
  ip="$(resolve_traefik || true)"
done
write_conf "$ip"
echo "dnsmasq: *.rome.localhost -> traefik@$ip" >&2

# Re-resolve loop: if Traefik's IP changes, rewrite + SIGHUP so dnsmasq reloads
# the conf dir without a restart. Backgrounded before we exec dnsmasq.
(
  while :; do
    sleep 10
    next="$(resolve_traefik || true)"
    if [ -n "${next:-}" ] && [ "$next" != "$ip" ]; then
      echo "dnsmasq: traefik moved $ip -> $next, reloading" >&2
      ip="$next"
      write_conf "$ip"
      kill -HUP 1 2>/dev/null || true
    fi
  done
) &

# --no-daemon: PID 1 so SIGHUP above reloads it; --no-resolv + --server=127.0.0.11
# forwards non-rome.localhost queries to the embedded Docker DNS in THIS container
# (reachable only from our own netns), which in turn reaches the host/upstream.
exec dnsmasq \
  --keep-in-foreground \
  --no-daemon \
  --log-facility=- \
  --no-resolv \
  --server=127.0.0.11 \
  --conf-dir="$CONF_DIR",*.conf
