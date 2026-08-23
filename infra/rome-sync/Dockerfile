# Rome dev source-sync sidecar.
#
# A tiny image whose only job is to bridge host source into the container-owned
# /workspace volume. It bind-mounts the worktree READ-ONLY at /src and runs a
# local mutagen one-way-replica session (/src -> /workspace) that honors
# .gitignore — so node_modules/dist/.next are never copied in and the rome
# container owns all generated state inside the volume.
#
# mutagen is baked in here, so `pnpm dev:all` needs no host-side mutagen. Both
# endpoints are local paths in this one container, so there is no ssh/docker
# transport (and none of its restart-survival fragility). The rome service
# mounts the same volume but never
# sees /src; the read-only bind + one-way sync mean the container can never
# write back to the host worktree, so host `pnpm install` / `pnpm db:generate`
# stay authoritative.

FROM alpine:3.21

# Bump to pick up a newer mutagen; asset names follow
# mutagen_linux_<arch>_v<VERSION>.tar.gz (verified against the v0.18.1 release).
# v0.18.1 carries the Docker Engine v28+ compatibility fix.
ARG MUTAGEN_VERSION=0.18.1

RUN apk add --no-cache ca-certificates curl \
    && arch="$(uname -m)" \
    && case "$arch" in \
         x86_64) march=amd64 ;; \
         aarch64 | arm64) march=arm64 ;; \
         *) echo "rome-sync: unsupported arch '$arch'" >&2; exit 1 ;; \
       esac \
    && curl -fsSL \
         "https://github.com/mutagen-io/mutagen/releases/download/v${MUTAGEN_VERSION}/mutagen_linux_${march}_v${MUTAGEN_VERSION}.tar.gz" \
         -o /tmp/mutagen.tar.gz \
    && tar -xzf /tmp/mutagen.tar.gz -C /usr/local/bin \
    && rm /tmp/mutagen.tar.gz \
    && mutagen version

# Compose overrides `user:` to the host uid:gid so files mutagen writes into the
# volume are owned by the same uid the rome container runs as. That uid usually
# has no /etc/passwd entry; some Go stdlib paths call user.Current(), so make
# the file appendable and let the entrypoint add an entry (the arbitrary-uid
# container trick). Pre-create /workspace world-writable so a fresh named volume
# inherits permissive ownership (Docker seeds the volume from the image at the
# mountpoint).
RUN chmod 0666 /etc/passwd \
    && mkdir -p /workspace \
    && chmod 0777 /workspace

# HOME + mutagen's data dir on a world-writable path so the daemon starts for any
# uid without a home directory.
ENV HOME=/tmp
ENV MUTAGEN_DATA_DIRECTORY=/tmp/.mutagen

COPY entrypoint.sh /usr/local/bin/rome-sync-entrypoint
RUN chmod 0755 /usr/local/bin/rome-sync-entrypoint

ENTRYPOINT ["/usr/local/bin/rome-sync-entrypoint"]
