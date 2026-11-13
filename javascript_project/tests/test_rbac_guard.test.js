import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateViewAccess } from '../src/rbac_guard.js';

test('test_09_rbac_guard_allow_admin: Autorizacion de pestanas administrativas y agendas al rol Administrador sin vista de reserva de cliente', () => {
  const financeAccess = evaluateViewAccess('ADMIN', 'view-admin-finance');
  const labAccess = evaluateViewAccess('ADMIN', 'view-sefi-lab');
  const tariffsAccess = evaluateViewAccess('ADMIN', 'view-tariffs');
  const chairAccess = evaluateViewAccess('ADMIN', 'view-chair-mode');
  const clientBookingAccess = evaluateViewAccess('ADMIN', 'view-booking');

  assert.equal(financeAccess.allowed, true);
  assert.equal(labAccess.allowed, true);
  assert.equal(tariffsAccess.allowed, true);
  assert.equal(chairAccess.allowed, true);
  assert.equal(clientBookingAccess.allowed, false);
});

test('test_10_rbac_guard_restrict_barber: Restriccion estricta de pestanas administrativas al rol Barbero', () => {
  const barberChairAccess = evaluateViewAccess('BARBERO', 'view-chair-mode');
  const barberFinanceAccess = evaluateViewAccess('BARBERO', 'view-admin-finance');
  const barberLabAccess = evaluateViewAccess('BARBERO', 'view-sefi-lab');
  const barberTariffsAccess = evaluateViewAccess('BARBERO', 'view-tariffs');

  assert.equal(barberChairAccess.allowed, true);
  assert.equal(barberFinanceAccess.allowed, false);
  assert.equal(barberLabAccess.allowed, false);
  assert.equal(barberTariffsAccess.allowed, false);
});
