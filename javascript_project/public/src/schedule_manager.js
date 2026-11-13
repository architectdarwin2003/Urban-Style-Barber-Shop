/**
 * Módulo Desacoplado: Gestor de Horarios y Persistencia Resiliente Offline (LocalStorage).
 */
export const SCHEDULE_CACHE_KEY = 'sefi_ti_urban_style_offline_schedule_v1';

export function filterAvailableSlots(candidateSlots, bookings, barberId) {
  if (!Array.isArray(candidateSlots) || !Array.isArray(bookings)) {
    throw new TypeError('candidateSlots y bookings deben ser arreglos.');
  }
  const activeStatuses = new Set(['CONFIRMADA', 'EN_SILLA', 'PAUSA']);
  const toMin = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
  };
  const busyIntervals = bookings
    .filter(
      (b) =>
        b &&
        (!barberId || barberId === 'auto' || b.barber_id === barberId) &&
        activeStatuses.has(String(b.status || 'CONFIRMADA').toUpperCase())
    )
    .map((b) => {
      const start = toMin(b.start_time);
      const duration = Number(b.duration_minutes || 35);
      return { start, end: start + duration };
    });

  return candidateSlots.filter((slot) => {
    const slotMin = toMin(slot);
    return !busyIntervals.some((interval) => slotMin >= interval.start && slotMin < interval.end);
  });
}

export function syncOfflineSchedule(storageAdapter, newSchedule = null) {
  if (
    !storageAdapter ||
    typeof storageAdapter.getItem !== 'function' ||
    typeof storageAdapter.setItem !== 'function'
  ) {
    throw new TypeError('Se requiere un adaptador de almacenamiento compatible con LocalStorage.');
  }
  if (Array.isArray(newSchedule)) {
    const payload = {
      syncedAt: new Date().toISOString(),
      bookings: newSchedule,
    };
    storageAdapter.setItem(SCHEDULE_CACHE_KEY, JSON.stringify(payload));
    return payload;
  }
  const raw = storageAdapter.getItem(SCHEDULE_CACHE_KEY);
  if (!raw) {
    return { syncedAt: '', bookings: [] };
  }
  const parsed = JSON.parse(raw);
  return {
    syncedAt: String(parsed.syncedAt || ''),
    bookings: Array.isArray(parsed.bookings) ? parsed.bookings : [],
  };
}
