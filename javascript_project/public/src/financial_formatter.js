/**
 * Módulo Desacoplado: Formateador Financiero para Moneda Colombiana (COP) y Porcentajes.
 */
export function formatCOP(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || !Number.isFinite(amount)) {
    throw new TypeError('El monto para formatCOP debe ser un número finito válido.');
  }
  const isNegative = amount < 0;
  const rounded = Math.round(Math.abs(amount));
  const withDots = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isNegative ? `-$ ${withDots}` : `$ ${withDots}`;
}

export function formatPercentage(value, isDecimalRatio = false) {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new TypeError('El valor para formatPercentage debe ser un número finito válido.');
  }
  const normalized = isDecimalRatio ? value * 100 : value;
  return `${normalized.toFixed(2)}%`;
}
