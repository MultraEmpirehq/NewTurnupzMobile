#!/bin/bash
# Copies the Android release secrets into this repo's GitHub secrets, straight
# from the files they live in, without printing any of them.
#
#   scripts/set-release-secrets.sh <production .env file> <Play service account .json>
#
# Needs: `gh auth login` first. Reads the upload key's settings from
# ~/.turnupz/turnupz-upload-2026.properties (override with PROPS=...).
set -euo pipefail

ENV_FILE=${1:?"Pass the production .env file"}
PLAY_JSON=${2:?"Pass the Play service account .json file"}
PROPS=${PROPS:-$HOME/.turnupz/turnupz-upload-2026.properties}
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

prop() { grep "^$1=" "$PROPS" | head -1 | cut -d= -f2-; }
put() { gh secret set "$1" --repo "$REPO" >/dev/null && echo "set $1"; }

store=$(prop TURNUPZ_UPLOAD_STORE_FILE)
store=${store/#\~/$HOME}
[ -f "$store" ] || { echo "Upload key not found at the path in $PROPS" >&2; exit 1; }

base64 -i "$store" | put ANDROID_UPLOAD_KEYSTORE_BASE64
printf '%s' "$(prop TURNUPZ_UPLOAD_STORE_PASSWORD)" | put ANDROID_UPLOAD_STORE_PASSWORD
printf '%s' "$(prop TURNUPZ_UPLOAD_KEY_ALIAS)" | put ANDROID_UPLOAD_KEY_ALIAS
printf '%s' "$(prop TURNUPZ_UPLOAD_KEY_PASSWORD)" | put ANDROID_UPLOAD_KEY_PASSWORD
put MOBILE_ENV_PRODUCTION < "$ENV_FILE"
put PLAY_SERVICE_ACCOUNT_JSON < "$PLAY_JSON"

echo "Done for $REPO. EXPO_TOKEN is set separately: gh secret set EXPO_TOKEN"
