import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBookingTotals } from '../src/booking_calculator.js';

test('test_04_calculate_service_totals_base_only: Sumatoria de precio y duracion para servicio base unico', () => {
  const baseService = { id: 'srv-1', name: 'Corte Degradado (Fade)', price_cop: 35000, duration_minutes: 35 };
  const result = calculateBookingTotals(baseService, []);
  assert.equal(result.totalPriceCOP, 35000);
  assert.equal(result.totalDurationMinutes, 35);
  assert.equal(result.addonCount, 0);
});

test('test_05_calculate_service_totals_with_addons: Calculo compuesto de servicio base + multiples adicionales', () => {
  const baseService = { id: 'srv-1', name: 'Corte Degradado (Fade)', price_cop: 35000, duration_minutes: 35 };
  const addons = [
    { id: 'add-barba', name: 'Arreglo de Barba', price_cop: 15000, duration_minutes: 20 },
    { id: 'add-cejas', name: 'Limpieza de Cejas', price_cop: 8000, duration_minutes: 10 },
  ];
  const result = calculateBookingTotals(baseService, addons);
  assert.equal(result.totalPriceCOP, 58000);
  assert.equal(result.totalDurationMinutes, 65);
  assert.equal(result.addonCount, 2);
});

test('test_06_calculate_service_totals_invalid_data: Validacion de datos ante arreglos corruptos de adicionales', () => {
  const baseService = { id: 'srv-1', name: 'Corte Degradado (Fade)', price_cop: 35000, duration_minutes: 35 };
  assert.throws(
    () => calculateBookingTotals(baseService, 'no-es-arreglo'),
    { name: 'TypeError' }
  );
  assert.throws(
    () => calculateBookingTotals(baseService, [{ price_cop: -5000, duration_minutes: 10 }]),
    { name: 'TypeError' }
  );
});
