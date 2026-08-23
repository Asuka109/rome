# rome-edge DNS singleton.
#
# A tiny dnsmasq that answers `*.rome.localhost` with Traefik's rome-edge IP so
# IN-CONTAINER lookups resolve the SAME name the browser uses. The browser hits
# Traefik via loopback (host-published :3000); containers forward `*.rome.localhost`
# here (see the `dns:` on each service in compose.dev.yml), and this points them
# back at Traefik on the bridge. Both legs then route by Host through Traefik.
#
# It self-resolves the `traefik` service to its current rome-edge IP on a loop, so
# a Traefik restart (new IP) can't strand the wildcard.
FROM alpine:3.20

RUN apk add --no-cache dnsmasq bind-tools

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 53/udp + 53/tcp — the container's rome-edge IP is used verbatim as the `dns:`
# upstream by every worktree service (dev-up.sh inspects it into ROME_DNSMASQ_IP).
EXPOSE 53/udp 53/tcp

ENTRYPOINT ["/entrypoint.sh"]
