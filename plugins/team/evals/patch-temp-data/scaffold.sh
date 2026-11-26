#!/usr/bin/env bash
# Tiny project with a UI state (empty orders) that needs the API to return [].
set -e
source "$(dirname "${BASH_SOURCE[0]}")/../_fixtures/tiny-node.sh"
cat > src/orders.js <<'JS'
export async function fetchOrders() {
  const res = await fetch('https://api.example.invalid/orders');
  return res.json();
}
export function renderOrders(list) {
  if (list.length === 0) return 'No orders yet';
  return list.map((o) => `#${o.id} ${o.status}`).join('\n');
}
JS
git add -A && git -c user.name=eval -c user.email=eval@example.invalid commit -qm orders
