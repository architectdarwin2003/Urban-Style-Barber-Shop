const ROLE_VIEW_MATRIX = {
  CLIENTE: new Set(['view-booking', 'view-my-appointment']),
  BARBERO: new Set(['view-chair-mode']),
  ADMIN: new Set([
    'view-admin-finance',
    'view-sefi-lab',
    'view-tariffs',
    'view-barbers',
    'view-chair-mode',
  ]),
};

export function evaluateViewAccess(role, viewId) {
  const normalizedRole = String(role || '').trim().toUpperCase();
  const normalizedView = String(viewId || '').trim();

  if (!ROLE_VIEW_MATRIX[normalizedRole]) {
    return {
      allowed: false,
      role: normalizedRole,
      viewId: normalizedView,
      reason: 'Perfil no reconocido.',
    };
  }

  const allowed = ROLE_VIEW_MATRIX[normalizedRole].has(normalizedView);

  return {
    allowed,
    role: normalizedRole,
    viewId: normalizedView,
    reason: allowed ? 'Acceso permitido.' : 'No tienes permisos para abrir esta seccion.',
  };
}

export function getAllowedViewsForRole(role) {
  const normalizedRole = String(role || '').trim().toUpperCase();
  const set = ROLE_VIEW_MATRIX[normalizedRole];
  return set ? Array.from(set) : [];
}
