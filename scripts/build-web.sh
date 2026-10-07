#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT"
bash scripts/build-wasm.sh

mkdir -p "$ROOT/web/public/wasm"
cp "$ROOT/dist/wasm/jed-core.wasm" "$ROOT/web/public/wasm/jed-core.wasm"
cp "$ROOT/dist/wasm/wasm_exec.js" "$ROOT/web/public/wasm/wasm_exec.js"
cp "$ROOT/dist/wasm/jed-core.js" "$ROOT/web/public/wasm/jed-core.js"

npm --prefix "$ROOT/web" run build
