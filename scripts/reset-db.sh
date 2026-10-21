#!/usr/bin/env bash
# Réinitialise une base LOCALE de développement (refuse toute URL non locale).
set -euo pipefail
URL="${1:-${DATABASE_URL:-}}"
case "$URL" in *localhost*|*127.0.0.1*) ;; *) echo "Refus : base non locale."; exit 1;; esac
psql "$URL" -qc "drop schema public cascade; create schema public;" && psql "$URL" -qc "drop schema if exists drizzle cascade;"
DATABASE_URL="$URL" npx tsx scripts/migrate.ts
