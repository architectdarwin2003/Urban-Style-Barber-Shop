import test from 'node:test';
import assert from 'node:assert/strict';
import { formatCOP, formatPercentage } from '../src/financial_formatter.js';

test('test_01_formatCOP_standard: Conversión a formato de moneda colombiana con separador de miles ($ XX.XXX.XXX)', () => {
  assert.equal(formatCOP(35000), '$ 35.000');
  assert.equal(formatCOP(14850000), '$ 14.850.000');
  assert.equal(formatCOP(0), '$ 0');
});

test('test_02_formatCOP_invalid_input: Lanzamiento de TypeError ante valores no numéricos', () => {
  assert.throws(() => formatCOP('35000'), { name: 'TypeError' });
  assert.throws(() => formatCOP(NaN), { name: 'TypeError' });
  assert.throws(() => formatCOP(null), { name: 'TypeError' });
});

test('test_03_formatPercentage: Formateo correcto a cadena porcentual con dos decimales (XX.XX%)', () => {
  assert.equal(formatPercentage(18.456), '18.46%');
  assert.equal(formatPercentage(0.18456, true), '18.46%');
  assert.equal(formatPercentage(12, false), '12.00%');
});
