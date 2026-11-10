#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker build -t agent-sandbox-placeholder:latest "$ROOT/docker/placeholder"
echo "Built agent-sandbox-placeholder:latest"
