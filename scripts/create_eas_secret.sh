#!/usr/bin/env bash
set -euo pipefail

# Creates an EAS project-scoped secret named OPENAI_API_KEY using eas-cli.
# Usage: ./scripts/create_eas_secret.sh [sk-NEW_KEY]

if ! command -v eas >/dev/null 2>&1; then
  echo "eas CLI not found. Install with: npm i -g eas-cli"
  exit 1
fi

if [ -n "${1-}" ]; then
  KEY="$1"
else
  echo -n "Paste new OpenAI key (sk-...): ";
  read -r KEY
fi

if [ -z "${KEY}" ]; then
  echo "No key provided. Aborting."
  exit 1
fi

echo "Logging into EAS (interactive if necessary)..."
eas login || true

echo "Creating/overwriting project secret OPENAI_API_KEY..."
eas secret:create --name OPENAI_API_KEY --value "$KEY" --scope project

echo "Done. Secret OPENAI_API_KEY created. Rebuild with eas build --platform android --profile preview"
