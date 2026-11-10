#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
docker build -f "$ROOT/apps/agent/Dockerfile" -t agent-sandbox-agent:latest "$ROOT"
echo "Built agent-sandbox-agent:latest"
