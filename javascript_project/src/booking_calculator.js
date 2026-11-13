function validateServiceItem(item, label) {
  if (!item || typeof item !== 'object') {
    throw new TypeError(`${label} no es valido.`);
  }
  const price = Number(item.price_cop ?? item.price);
  const duration = Number(item.duration_minutes ?? item.duration);

  if (!Number.isFinite(price) || price < 0) {
    throw new TypeError(`${label} tiene un precio invalido.`);
  }
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new TypeError(`${label} tiene una duracion invalida.`);
  }
  return { price, duration };
}

export function calculateBookingTotals(baseService, addons = []) {
  const base = validateServiceItem(baseService, 'Servicio principal');

  if (!Array.isArray(addons)) {
    throw new TypeError('Los servicios adicionales deben ser una lista.');
  }

  let totalPriceCOP = base.price;
  let totalDurationMinutes = base.duration;

  for (let i = 0; i < addons.length; i += 1) {
    const addon = validateServiceItem(addons[i], `Adicional ${i}`);
    totalPriceCOP += addon.price;
    totalDurationMinutes += addon.duration;
  }

  return {
    totalPriceCOP,
    totalDurationMinutes,
    addonCount: addons.length,
  };
}

export function calculateBarberDailyCommission(bookings, barberId, commissionRate = 0.5) {
  if (!Array.isArray(bookings)) {
    throw new TypeError('Las citas deben ser una lista.');
  }
  if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 1) {
    throw new RangeError('La comision debe estar entre 0 y 1.');
  }

  const completed = bookings.filter(
    (b) => b && b.barber_id === barberId && String(b.status).toUpperCase() === 'COMPLETADA'
  );

  const grossRevenueCOP = completed.reduce((acc, b) => acc + Number(b.total_cop || 0), 0);
  const netCommissionCOP = Math.round(grossRevenueCOP * commissionRate);

  return {
    completedCount: completed.length,
    grossRevenueCOP,
    netCommissionCOP,
    commissionRate,
  };
}
