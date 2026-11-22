#!/usr/bin/env bash
# Scaffold for the smoke evals: a tiny Node project with one planted bug, committed once.
set -e
mkdir -p src test
cat > package.json <<'JSON'
{ "name": "tiny-shop", "version": "1.0.0", "type": "module", "scripts": { "test": "node --test" } }
JSON
cat > src/cart.js <<'JS'
// Total of a cart: sum of price * qty for each line.
export function cartTotal(lines) {
  let total = 0;
  for (let i = 1; i < lines.length; i++) total += lines[i].price * lines[i].qty;
  return total;
}
JS
cat > test/cart.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cartTotal } from '../src/cart.js';
test('sums every line', () => {
  assert.equal(cartTotal([{ price: 2, qty: 3 }, { price: 5, qty: 1 }]), 11);
});
JS
printf '# tiny-shop\n\nA tiny cart library.\n' > README.md
git init -q && git add -A && git -c user.name=eval -c user.email=eval@example.invalid commit -qm init
