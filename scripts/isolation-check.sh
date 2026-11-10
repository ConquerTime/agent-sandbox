#!/usr/bin/env bash
# Verifies multi-tenant isolation against a running pod-server.
set -euo pipefail

BASE="${POD_SERVER_URL:-http://localhost:7000}"

echo "Using pod-server at $BASE"

create() {
  local name="$1"
  curl -sf -X POST "$BASE/api/projects" \
    -H 'Content-Type: application/json' \
    -d "{\"name\":\"$name\"}"
}

P1=$(create iso-check-a)
P2=$(create iso-check-b)
ID1=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).project.id)" "$P1")
ID2=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).project.id)" "$P2")

echo "project A=$ID1"
echo "project B=$ID2"

H1=$(curl -sf "$BASE/p/$ID1/agent/api/health")
H2=$(curl -sf "$BASE/p/$ID2/agent/api/health")
echo "$H1" | grep -q "$ID1"
echo "$H2" | grep -q "$ID2"
echo "proxy routes hit distinct containers"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VOL1="$ROOT/apps/pod-server/data/volumes/$ID1"
VOL2="$ROOT/apps/pod-server/data/volumes/$ID2"
echo "secret-a" > "$VOL1/secret.txt"
echo "secret-b" > "$VOL2/secret.txt"

curl -sf -X POST "$BASE/api/projects/$ID1/stop" >/dev/null
test -f "$VOL1/secret.txt"
echo "stop keeps volume"

curl -sf "$BASE/api/projects/$ID1/ready" >/dev/null
test -f "$VOL1/secret.txt"
echo "ready restores same volume"

curl -sf -X DELETE "$BASE/api/projects/$ID1" >/dev/null
test ! -e "$VOL1"
test -f "$VOL2/secret.txt"
echo "delete removes only target volume"

curl -sf -X DELETE "$BASE/api/projects/$ID2" >/dev/null
echo "isolation-check passed"
