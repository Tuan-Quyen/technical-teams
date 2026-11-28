#!/usr/bin/env bash
# Project whose empty state is reachable through an existing seed file.
set -e
source "$(dirname "${BASH_SOURCE[0]}")/../_fixtures/tiny-node.sh"
mkdir -p seed
cat > src/orders.js <<'JS'
import { readFileSync } from 'node:fs';
export function loadOrders(file = process.env.ORDERS_FILE || 'seed/orders.json') {
  return JSON.parse(readFileSync(file, 'utf8'));
}
export function renderOrders(list) {
  if (list.length === 0) return 'No orders yet';
  return list.map((o) => `#${o.id} ${o.status}`).join('\n');
}
JS
echo '[]' > seed/empty-orders.json
echo '[{"id":1,"status":"paid"}]' > seed/orders.json
printf '\nSeed data: `seed/*.json`; point `ORDERS_FILE` at one to load it.\n' >> README.md
git add -A && git -c user.name=eval -c user.email=eval@example.invalid commit -qm orders
