import test from 'node:test';
import assert from 'node:assert/strict';
import { filterAvailableSlots, syncOfflineSchedule } from '../src/schedule_manager.js';

test('test_07_schedule_filter_available_slots: Filtrado de cupos libres excluyendo citas en curso u ocupadas', () => {
  const candidateSlots = ['08:00', '09:00', '10:00', '11:00', '12:00'];
  const bookings = [
    { barber_id: 'barber-mateo', start_time: '09:00', duration_minutes: 60, status: 'CONFIRMADA' },
    { barber_id: 'barber-mateo', start_time: '11:00', duration_minutes: 60, status: 'EN_SILLA' },
    { barber_id: 'barber-mateo', start_time: '12:00', duration_minutes: 45, status: 'CANCELADA' },
  ];

  const freeSlots = filterAvailableSlots(candidateSlots, bookings, 'barber-mateo');
  assert.deepEqual(freeSlots, ['08:00', '10:00', '12:00']);
});

test('test_08_schedule_offline_cache_serialization: Serialización y recuperación íntegra de la agenda en localStorage', () => {
  const memoryStore = new Map();
  const mockLocalStorage = {
    getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
    setItem: (key, val) => memoryStore.set(key, String(val)),
  };

  const sampleAgenda = [
    { id: 'bk-1001', client_name: 'Camilo Echeverri', start_time: '10:00', total_cop: 58000 },
  ];

  syncOfflineSchedule(mockLocalStorage, sampleAgenda);
  const recovered = syncOfflineSchedule(mockLocalStorage);

  assert.equal(recovered.bookings.length, 1);
  assert.equal(recovered.bookings[0].id, 'bk-1001');
  assert.equal(recovered.bookings[0].client_name, 'Camilo Echeverri');
  assert.ok(recovered.syncedAt.length > 0);
});
