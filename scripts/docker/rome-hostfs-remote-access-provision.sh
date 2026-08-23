#!/bin/sh
set -eu

target_user="${1:-}"
authorized_keys_path="${2:-}"
ssh_public_key="${3:-}"

if [ -z "$target_user" ] || [ -z "$authorized_keys_path" ] || [ -z "$ssh_public_key" ]; then
  echo "usage: $0 <target-user> <authorized-keys-path> <ssh-public-key>" >&2
  exit 1
fi

user_home="$(getent passwd "$target_user" | cut -d: -f6)"
if [ -z "$user_home" ]; then
  echo "unknown user: $target_user" >&2
  exit 1
fi

ssh_dir="$(dirname "$authorized_keys_path")"

mkdir -p "$ssh_dir"
touch "$authorized_keys_path"

if ! grep -Fqx "$ssh_public_key" "$authorized_keys_path"; then
  printf '%s\n' "$ssh_public_key" >>"$authorized_keys_path"
fi

chown "$target_user:$target_user" "$ssh_dir" "$authorized_keys_path"
chmod g-s,u=rwx,go= "$ssh_dir"
chmod 600 "$authorized_keys_path"
