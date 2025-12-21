#!/usr/bin/env bash
set -euo pipefail

# Verifies the OpenAI key embedded in an AAB (if present) and prints masked info + SHA256.
# Usage: ./scripts/verify_aab_key.sh [path/to/aab]

AAB=${1:-latest.aab}

if [ ! -f "$AAB" ]; then
  echo "AAB not found at $AAB"
  echo "Place the built AAB at the repo root as 'latest.aab' or pass its path as the first arg."
  exit 1
fi

echo "Extracting app.config from $AAB..."
cfg=$(unzip -p "$AAB" base/assets/app.config 2>/dev/null || true)
if [ -z "$cfg" ]; then
  echo "No app.config found inside AAB."
  exit 1
fi

key=$(echo "$cfg" | grep -oE 'sk-[A-Za-z0-9_-]{16,}' | head -n1 || true)
if [ -z "$key" ]; then
  echo "No OpenAI sk-... key found in AAB."
  exit 0
fi

prefix=${key:0:6}
suffix=${key: -6}
len=${#key}
sha=$(echo -n "$key" | shasum -a 256 | awk '{print $1}')

echo "Found OpenAI key in AAB: ${prefix}...${suffix} len=${len}"
echo "SHA256: $sha"

echo "(Do NOT paste the full key publicly.)"
