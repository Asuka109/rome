#!/bin/bash
# Rome desktop — rebuild the bundled Alpine guest qcow2.
#
# The qcow2 lives in Git LFS at packages/desktop/lima/images/. End users
# never run this script; the .app ships the committed image. Run this
# only when you need to bump the Alpine base, the package list, or the
# image-build number.
#
# Strategy:
#   1. Download Alpine's official `nocloud + uefi + cloudinit` arm64
#      cloud image (SHA-512 pinned below).
#   2. Resize the qcow2, attach via qemu-nbd, growpart, resize2fs.
#   3. chroot in (qemu-user-static does cross-arch on x86_64 hosts) and
#      `apk add` the extras Rome needs (containerd + nerdctl + …).
#   4. Enable OpenRC services + drop a default containerd config.
#   5. Detach, replace the committed image, print SHA-256.
#   6. `git add` reminds you to commit (LFS handles the size).
#
# Why a cloud-image base instead of building from scratch with
# alpine-make-vm-image: alpine-make-vm-image's UEFI mode drops the
# kernel at /boot/startup.nsh for the firmware's EFI Shell. Apple
# Virtualization.framework's vz EFI ships no shell, so that image
# transitions to "running" then "stopped" within a second of boot.
# Alpine's cloud images have grub-efi-arm64 at /EFI/BOOT/BOOTAA64.EFI
# and cloud-init wired for the NoCloud datasource Lima uses for SSH
# key injection — the project's own QA-tested vz boot path.
#
# Requires Linux + root (qemu-nbd, chroot). On macOS, this script
# self-re-execs in a privileged Docker container.
#
# Usage:
#   ./scripts/update-guest-image.sh
#   ALPINE_VERSION=3.21.8 ./scripts/update-guest-image.sh

set -euo pipefail

# -----------------------------------------------------------------------------
# Pinned inputs. Bump on a desktop release boundary.
# -----------------------------------------------------------------------------
: "${ALPINE_VERSION:=3.21.7}"
: "${ARCH:=aarch64}"
# Bump when this script's customization changes without ALPINE_VERSION
# bumping (e.g. CVE patch, package list tweak). Surfaces in the output
# filename so Lima treats it as a new image and rebuilds the cached VM.
: "${ROME_IMAGE_BUILD:=2}"

# Extras installed on top of the cloud-image base. Every line MUST be in
# the pinned Alpine release's main/community repos. No edge.
PKGS="containerd nerdctl cni-plugins qemu-guest-agent iptables ip6tables"

# Final qcow2 capacity (thin-provisioned). Sized so containerd's content
# store can hold the Rome OCI image plus user-pulled images without the
# end user resizing.
: "${DISK_SIZE_GB:=20}"

BASE_URL="https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VERSION%.*}/releases/cloud/nocloud_alpine-${ALPINE_VERSION}-${ARCH}-uefi-cloudinit-r0.qcow2"
BASE_SHA512="9837b968763c2f620aa81cab3dc26b7f914ffa935245c9e929e339559f0f2fecdfd281e5cf82457ecfd6a9b6726a8a8ec40fb35d99dd8fd9b27d3b76c304dac7"

IMAGE_FILENAME="rome-guest-${ARCH}-${ALPINE_VERSION}-${ROME_IMAGE_BUILD}.qcow2"

# -----------------------------------------------------------------------------
# Layout — resolve repo paths from this script's location.
# -----------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESKTOP_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
IMAGES_DIR="${DESKTOP_ROOT}/lima/images"

# -----------------------------------------------------------------------------
# Docker re-exec — qemu-nbd + chroot need Linux + root.
# -----------------------------------------------------------------------------
if [[ "$(uname -s)" != "Linux" ]] || [[ "$(id -u)" != "0" ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo "Need Docker to run this on macOS — install Docker Desktop, OrbStack, etc." >&2
    exit 1
  fi
  REPO_ROOT="$(cd "${DESKTOP_ROOT}/../.." && pwd)"
  REL_SCRIPT="${BASH_SOURCE[0]#${REPO_ROOT}/}"
  echo "Re-executing in privileged Docker (needs qemu-nbd + chroot)..."
  exec docker run --rm --privileged \
    -e ALPINE_VERSION="${ALPINE_VERSION}" \
    -e ARCH="${ARCH}" \
    -e ROME_IMAGE_BUILD="${ROME_IMAGE_BUILD}" \
    -e DISK_SIZE_GB="${DISK_SIZE_GB}" \
    -v "${REPO_ROOT}:/work" \
    -w /work \
    --platform linux/amd64 \
    ubuntu:24.04 \
    bash "/work/${REL_SCRIPT}" "$@"
fi

# -----------------------------------------------------------------------------
# In Docker as root from here down.
# -----------------------------------------------------------------------------
echo "Installing build dependencies..."
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends \
  qemu-utils \
  qemu-user-static \
  binfmt-support \
  cloud-guest-utils \
  curl \
  ca-certificates \
  e2fsprogs >/dev/null

WORK_DIR="$(mktemp -d /tmp/rome-guest-build.XXXXXX)"
trap 'cleanup' EXIT

NBD_DEV=""
MOUNT_DIR=""
cleanup() {
  set +e
  if [[ -n "${MOUNT_DIR}" && -d "${MOUNT_DIR}" ]]; then
    umount -R "${MOUNT_DIR}" 2>/dev/null
    rmdir "${MOUNT_DIR}" 2>/dev/null
  fi
  if [[ -n "${NBD_DEV}" ]]; then
    qemu-nbd --disconnect "${NBD_DEV}" >/dev/null 2>&1
  fi
  rm -rf "${WORK_DIR}"
}

BASE_PATH="${WORK_DIR}/base.qcow2"
IMAGE_PATH="${IMAGES_DIR}/${IMAGE_FILENAME}"

mkdir -p "${IMAGES_DIR}"

echo
echo "Building ${IMAGE_FILENAME}"
echo "  base:     ${BASE_URL}"
echo "  packages: ${PKGS}"
echo "  capacity: ${DISK_SIZE_GB}G"
echo

echo "Downloading base image..."
curl -fsSL "${BASE_URL}" -o "${BASE_PATH}"

observed_sha512="$(sha512sum "${BASE_PATH}" | awk '{print $1}')"
if [[ "${observed_sha512}" != "${BASE_SHA512}" ]]; then
  echo "Base image SHA-512 mismatch:" >&2
  echo "  expected: ${BASE_SHA512}" >&2
  echo "  observed: ${observed_sha512}" >&2
  exit 1
fi
echo "Base SHA-512 OK"

echo "Resizing qcow2 to ${DISK_SIZE_GB}G..."
cp "${BASE_PATH}" "${IMAGE_PATH}.partial"
qemu-img resize -q "${IMAGE_PATH}.partial" "${DISK_SIZE_GB}G"

echo "Attaching via qemu-nbd..."
modprobe nbd max_part=16 || true
for dev in /dev/nbd{0..15}; do
  if qemu-nbd --connect="${dev}" --cache=writeback "${IMAGE_PATH}.partial" 2>/dev/null; then
    NBD_DEV="${dev}"
    break
  fi
done
if [[ -z "${NBD_DEV}" ]]; then
  echo "Could not attach qcow2 to any /dev/nbdN device." >&2
  exit 1
fi
echo "  attached as ${NBD_DEV}"

# Identify partitions defensively (EFI fat32 + ext4 root).
sleep 1
EFI_PART=""
ROOT_PART=""
for part in "${NBD_DEV}"p1 "${NBD_DEV}"p2 "${NBD_DEV}"p3; do
  [[ -b "${part}" ]] || continue
  case "$(blkid -o value -s TYPE "${part}" 2>/dev/null || true)" in
    vfat) EFI_PART="${part}" ;;
    ext4 | ext3) ROOT_PART="${part}" ;;
  esac
done
[[ -n "${ROOT_PART}" && -n "${EFI_PART}" ]] || {
  echo "Could not identify partitions on ${NBD_DEV}." >&2
  exit 1
}
echo "  EFI:  ${EFI_PART}"
echo "  Root: ${ROOT_PART}"

# Grow root partition to the new capacity, then catch the fs up.
ROOT_PART_NUM="${ROOT_PART##*p}"
echo "Growing root partition + filesystem..."
growpart "${NBD_DEV}" "${ROOT_PART_NUM}" >/dev/null 2>&1 || {
  rc=$?
  [[ "${rc}" -gt 1 ]] && {
    echo "growpart failed (rc=${rc})" >&2
    exit "${rc}"
  }
}
partprobe "${NBD_DEV}" >/dev/null 2>&1 || true
e2fsck -fy "${ROOT_PART}" >/dev/null 2>&1 || true
resize2fs "${ROOT_PART}" >/dev/null

MOUNT_DIR="$(mktemp -d /tmp/rome-guest-mnt.XXXXXX)"
mount "${ROOT_PART}" "${MOUNT_DIR}"
mount "${EFI_PART}" "${MOUNT_DIR}/boot"
mount --bind /dev "${MOUNT_DIR}/dev"
mount --bind /proc "${MOUNT_DIR}/proc"
mount --bind /sys "${MOUNT_DIR}/sys"
mount -t tmpfs tmpfs "${MOUNT_DIR}/run"
cp /etc/resolv.conf "${MOUNT_DIR}/etc/resolv.conf"

echo "Installing packages in chroot..."
chroot "${MOUNT_DIR}" /sbin/apk update >/dev/null
# shellcheck disable=SC2086
chroot "${MOUNT_DIR}" /sbin/apk add --no-cache ${PKGS}

echo "Configuring services..."
# Postinstall — inline so this script is self-contained.
chroot "${MOUNT_DIR}" /bin/sh -eu <<'POSTINSTALL'
# Enable our extras. The base cloud image already has sshd, networking,
# cloud-init-*, hostname, etc. on default/boot runlevels.
rc-update add containerd default
rc-update add qemu-guest-agent default

# Drop a default containerd config. Lima's user-mode containerd is OFF
# (rome.yaml sets containerd.user=false); we run system-mode at
# /run/containerd/containerd.sock and `sudo nerdctl ...` connects there.
mkdir -p /etc/containerd
containerd config default > /etc/containerd/config.toml
POSTINSTALL

echo "Tearing down mounts..."
sync
umount -R "${MOUNT_DIR}"
rmdir "${MOUNT_DIR}"
MOUNT_DIR=""
qemu-nbd --disconnect "${NBD_DEV}"
NBD_DEV=""

# Atomic-ish swap into place.
mv "${IMAGE_PATH}.partial" "${IMAGE_PATH}"

# Remove any older rome-guest-* files so LFS doesn't accumulate stale
# images on every bump. Each PR should only carry one current image.
for old in "${IMAGES_DIR}"/rome-guest-*.qcow2; do
  [[ "${old}" != "${IMAGE_PATH}" && -f "${old}" ]] && rm -f "${old}"
done

hash="$(sha256sum "${IMAGE_PATH}" | awk '{print $1}')"
bytes="$(stat -c '%s' "${IMAGE_PATH}")"

cat <<EOF

Built: ${IMAGE_PATH}
  sha256: ${hash}
  bytes:  ${bytes}

Next steps (on the host, not inside Docker):
  1. Update images[0].location in packages/desktop/lima/templates/rome.yaml
     to point at: ${IMAGE_FILENAME}
  2. git add packages/desktop/lima/images/${IMAGE_FILENAME} \\
            packages/desktop/lima/templates/rome.yaml
  3. git commit -m "chore(desktop): bump guest image to ${IMAGE_FILENAME}"
EOF
