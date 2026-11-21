import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subtotal, applyDiscount, total } from '../src/cart.js';

test('subtotal sums price × qty', () => {
  assert.equal(subtotal([{ price: 250, qty: 2 }, { price: 100, qty: 1 }]), 600);
});

test('applyDiscount 10%', () => {
  assert.equal(applyDiscount(1000, 10), 900);
});

test('applyDiscount rejects out of range', () => {
  assert.throws(() => applyDiscount(1000, 120), RangeError);
});

test('total with no discount', () => {
  assert.equal(total([{ price: 199, qty: 3 }]), 597);
});
