export function formatCOP(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
    throw new TypeError('El monto debe ser un numero valido.');
  }

  const isNegative = amount < 0;
  const rounded = Math.round(Math.abs(amount));
  const withDots = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return isNegative ? `-$ ${withDots}` : `$ ${withDots}`;
}

export function formatPercentage(value, isDecimalRatio = false) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError('El valor porcentual debe ser un numero valido.');
  }
  const normalized = isDecimalRatio ? value * 100 : value;
  return `${normalized.toFixed(2)}%`;
}
