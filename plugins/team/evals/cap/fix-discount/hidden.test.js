import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyDiscount, total } from '../src/cart.js';

test('hidden: 100% discount is free', () => {
  assert.equal(applyDiscount(1000, 100), 0);
  assert.equal(total([{ price: 499, qty: 2 }], 100), 0);
});
test('hidden: other discounts unchanged', () => {
  assert.equal(applyDiscount(1000, 0), 1000);
  assert.equal(applyDiscount(999, 50), 499);
  assert.equal(applyDiscount(1000, 99), 10);
});
