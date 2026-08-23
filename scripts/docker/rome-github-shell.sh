# shellcheck shell=bash  # sourced into the in-container rome shell, no shebang
ROME_GITHUB_TOKEN_FILE="${ROME_GITHUB_TOKEN_FILE:-/run/rome/github-oauth-token}"

__rome_github_token() {
  if [ -r "$ROME_GITHUB_TOKEN_FILE" ]; then
    tr -d '\r\n' <"$ROME_GITHUB_TOKEN_FILE"
  fi
}

gh() {
  GH_TOKEN="$(__rome_github_token)" \
  GH_PROMPT_DISABLED=1 \
    command gh "$@"
}

git() {
  GH_TOKEN="$(__rome_github_token)" \
  GH_PROMPT_DISABLED=1 \
  GIT_CONFIG_COUNT=4 \
  GIT_CONFIG_KEY_0=credential.https://github.com.helper \
  GIT_CONFIG_VALUE_0='' \
  GIT_CONFIG_KEY_1=credential.https://github.com.helper \
  GIT_CONFIG_VALUE_1='!gh auth git-credential' \
  GIT_CONFIG_KEY_2=url.https://github.com/.insteadOf \
  GIT_CONFIG_VALUE_2=git@github.com: \
  GIT_CONFIG_KEY_3=url.https://github.com/.insteadOf \
  GIT_CONFIG_VALUE_3=ssh://git@github.com/ \
    command git "$@"
}
