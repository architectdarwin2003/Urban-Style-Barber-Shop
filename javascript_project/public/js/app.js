import { formatCOP, formatPercentage } from '../../src/financial_formatter.js';
import { calculateBookingTotals } from '../../src/booking_calculator.js';
import { filterAvailableSlots, syncOfflineSchedule } from '../../src/schedule_manager.js';
import { evaluateViewAccess } from '../../src/rbac_guard.js';

const CANDIDATE_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00'
];

const CASES = {
  base: { label: 'Remodelacion de Estaciones ($12.000.000)', inv: 12000000, rate: 12, flows: [4500000, 5200000, 6100000], forceBisection: false },
  insumos: { label: 'Compra de Insumos al por Mayor ($4.200.000)', inv: 4200000, rate: 12, flows: [1850000, 1950000, 2100000], forceBisection: false },
  tiempos: { label: 'Mejora de Agenda y Turnos ($6.500.000)', inv: 6500000, rate: 12, flows: [2900000, 3200000, 3600000], forceBisection: false },
  biseccion: { label: 'Calculo de Respaldo por Biseccion', inv: 12000000, rate: 12, flows: [4500000, 5200000, 6100000], forceBisection: true },
};

const state = {
  theme: 'dark',
  isAuthenticated: false,
  role: 'CLIENTE',
  userName: '',
  username: '',
  userBarberId: '',
  activeView: 'view-booking',
  authTab: 'login',
  canRegisterAdmin: true,
  registerRole: 'CLIENTE',
  services: [],
  barbers: [],
  bookings: [],
  financialBaseline: { monthly_revenue_accumulated: 14850000, fixed_costs: {} },
  semaphore: { status: 'VERDE', label: 'Rentable', monthly_revenue: 14850000, total_costs: 11800000, net_margin: 3050000, coverage_pct: 125.85 },
  selectedBaseId: 'srv-corte-signature',
  selectedAddonIds: ['add-barba'],
  selectedBarberId: 'barber-mateo',
  selectedDate: '2026-11-11',
  selectedSlot: '13:00',
  selectedPayment: 'NEQUI',
  clientName: '',
  clientPhone: '',
  lookupQuery: '',
  chairBarberId: 'barber-mateo',
  sefiCaseKey: 'base',
  sefiResult: null,
  editingService: null,
  editingBarber: null,
  toast: null,
  lastCreatedBooking: null,
  confirmModal: null,
};

let toastTimer = null;
let bookingBannerTimer = null;
let pendingConfirmAction = null;

async function callBridge(action, payload = {}) {
  const res = await fetch('/api/bridge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || 'Error en la operacion.');
  return data;
}

function showToast(type, message) {
  if (toastTimer) clearTimeout(toastTimer);
  state.toast = { type, message };
  renderApp();
  toastTimer = setTimeout(() => {
    state.toast = null;
    const el = document.getElementById('toast-overlay');
    if (el) el.remove();
  }, 3200);
}

function showBookingBanner(booking) {
  if (bookingBannerTimer) clearTimeout(bookingBannerTimer);
  state.lastCreatedBooking = booking;
  renderApp();
  bookingBannerTimer = setTimeout(() => {
    state.lastCreatedBooking = null;
    const el = document.getElementById('booking-confirm-banner');
    if (el) el.remove();
  }, 3500);
}

function openConfirmModal(title, message, confirmLabel, onConfirm) {
  pendingConfirmAction = onConfirm;
  state.confirmModal = { title, message, confirmLabel: confirmLabel || 'Confirmar' };
  renderApp();
}

function closeConfirmModal() {
  pendingConfirmAction = null;
  state.confirmModal = null;
  renderApp();
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.documentElement.classList.toggle('light', theme === 'light');
  try { localStorage.setItem('sefi_theme', theme); } catch { /* ignore */ }
}

function getDefaultViewForRole(role) {
  if (role === 'ADMIN') return 'view-admin-finance';
  if (role === 'BARBERO') return 'view-chair-mode';
  return 'view-booking';
}

function isClientOwnerOfBooking(booking) {
  const bkUser = String(booking.client_username || '').trim().toLowerCase();
  const bkName = String(booking.client_name || '').trim().toLowerCase();
  const actUser = String(state.username || '').trim().toLowerCase();
  const actName = String(state.userName || '').trim().toLowerCase();
  return (actUser && bkUser === actUser) || (actName && bkName === actName);
}

function setSessionUser(user, canRegisterAdmin) {
  state.isAuthenticated = true;
  state.role = user.role;
  state.userName = user.name;
  state.username = user.username;
  state.userBarberId = user.barber_id || '';
  if (typeof canRegisterAdmin === 'boolean') state.canRegisterAdmin = canRegisterAdmin;
  if (user.role === 'BARBERO' && user.barber_id) {
    state.chairBarberId = user.barber_id;
  }
  if (user.role === 'CLIENTE') {
    state.clientName = user.name;
    state.clientPhone = user.phone || '';
    state.lookupQuery = '';
  }
  state.activeView = getDefaultViewForRole(user.role);
  try {
    localStorage.setItem('urban_style_user', JSON.stringify(user));
  } catch { /* ignore */ }
}

function clearSession() {
  state.isAuthenticated = false;
  state.role = 'CLIENTE';
  state.userName = '';
  state.username = '';
  state.userBarberId = '';
  state.authTab = 'login';
  state.lastCreatedBooking = null;
  try {
    localStorage.removeItem('urban_style_user');
  } catch { /* ignore */ }
}

function renderBarberLogo(size = 'lg') {
  const dim = size === 'lg' ? 'w-16 h-16' : 'w-9 h-9';
  return `
    <div class="${dim} rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
      <svg class="${size === 'lg' ? 'w-9 h-9' : 'w-5 h-5'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="6" cy="6" r="3"></circle>
        <circle cx="6" cy="18" r="3"></circle>
        <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
        <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
        <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
      </svg>
    </div>
  `;
}

function renderThemeIconButton(isDark) {
  const sunSvg = `
    <svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  `;
  const moonSvg = `
    <svg class="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  `;
  return `
    <button id="btn-theme-toggle" type="button" aria-label="${isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}" title="${isDark ? 'Modo claro' : 'Modo oscuro'}" class="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-slate-300 bg-slate-100 hover:bg-slate-200'}">
      ${isDark ? sunSvg : moonSvg}
    </button>
  `;
}

export async function bootstrapApp() {
  const savedTheme = (() => { try { return localStorage.getItem('sefi_theme'); } catch { return null; } })();
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');

  try {
    const savedUser = JSON.parse(localStorage.getItem('urban_style_user') || 'null');
    if (savedUser && savedUser.role && savedUser.username) {
      setSessionUser(savedUser);
    }
  } catch { /* ignore */ }

  try {
    const data = await callBridge('bootstrap');
    state.services = data.services || [];
    state.barbers = data.barbers || [];
    state.bookings = data.bookings || [];
    state.financialBaseline = data.financial_baseline || state.financialBaseline;
    state.semaphore = data.semaphore || state.semaphore;
    if (typeof data.can_register_admin === 'boolean') {
      state.canRegisterAdmin = data.can_register_admin;
    }
    syncOfflineSchedule(window.localStorage, state.bookings);
  } catch {
    const cached = syncOfflineSchedule(window.localStorage);
    state.bookings = cached.bookings || [];
  }

  try {
    const c = CASES[state.sefiCaseKey];
    const evalData = await callBridge('evaluate_finance', {
      role: 'ADMIN',
      initial_investment: c.inv,
      discount_rate: c.rate / 100,
      cash_flows: c.flows,
      force_bisection: c.forceBisection,
    });
    state.sefiResult = evalData.result;
  } catch { /* ignore */ }

  renderApp();
}

function renderToastOverlay(isDark) {
  if (!state.toast) return '';
  const isErr = state.toast.type === 'error';
  return `
    <div id="toast-overlay" role="status" aria-live="polite" class="fixed bottom-6 right-6 z-50 max-w-md px-4 py-3 rounded-xl border shadow-lg text-sm flex items-center justify-between gap-4 ${
      isErr
        ? 'bg-red-950/95 border-red-500/60 text-red-100'
        : isDark ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-100' : 'bg-emerald-50 border-emerald-300 text-emerald-900'
    }">
      <span>${state.toast.message}</span>
      <button id="btn-close-toast" type="button" aria-label="Cerrar aviso" class="text-xs font-semibold opacity-75 hover:opacity-100">Cerrar</button>
    </div>
  `;
}

function renderConfirmModal(isDark, cardClass) {
  if (!state.confirmModal) return '';
  return `
    <div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <div class="max-w-md w-full rounded-2xl border p-6 shadow-2xl ${cardClass}">
        <h3 id="confirm-modal-title" class="text-lg font-bold">${state.confirmModal.title}</h3>
        <p class="text-sm text-slate-400 mt-2 leading-relaxed">${state.confirmModal.message}</p>
        <div class="flex items-center justify-end gap-3 mt-6">
          <button id="btn-modal-cancel" type="button" class="px-4 py-2 rounded-lg text-xs font-semibold border ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-200' : 'border-slate-300 hover:bg-slate-100 text-slate-700'}">Cancelar</button>
          <button id="btn-modal-confirm" type="button" class="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950">${state.confirmModal.confirmLabel}</button>
        </div>
      </div>
    </div>
  `;
}

function renderLoginScreen(isDark, bgClass, cardClass, inputClass) {
  const adminBlocked = state.registerRole === 'ADMIN' && !state.canRegisterAdmin;
  return `
    <div class="min-h-screen flex flex-col justify-between ${bgClass}">
      <header class="w-full max-w-[1360px] mx-auto px-6 py-5 flex items-center justify-between">
        <div class="flex items-center gap-3">
          ${renderBarberLogo('sm')}
          <span class="text-base font-bold tracking-tight">Urban Style Barber Shop</span>
        </div>
        <div class="flex items-center gap-3">
          ${renderThemeIconButton(isDark)}
        </div>
      </header>

      <main class="flex-1 flex items-center justify-center px-4 py-8">
        <div class="w-full max-w-md rounded-2xl border p-8 shadow-2xl ${cardClass}">
          <div class="flex flex-col items-center text-center mb-6">
            ${renderBarberLogo('lg')}
            <p class="text-[11px] font-semibold uppercase tracking-widest text-amber-500 mt-4">Medellin · El Poblado</p>
            <h1 class="text-2xl font-bold tracking-tight mt-1">Urban Style Barber Shop</h1>
            <p class="text-xs text-slate-400 mt-1">Ingresa con tu cuenta o registrate para continuar</p>
          </div>

          <div class="grid grid-cols-2 gap-1 p-1 rounded-xl mb-6 ${isDark ? 'bg-slate-950 border border-slate-800' : 'bg-slate-100 border border-slate-200'}">
            <button type="button" data-auth-tab="login" class="py-2 rounded-lg text-xs font-bold transition-colors ${state.authTab === 'login' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}">Iniciar sesion</button>
            <button type="button" data-auth-tab="register" class="py-2 rounded-lg text-xs font-bold transition-colors ${state.authTab === 'register' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'}">Crear cuenta</button>
          </div>

          ${state.authTab === 'login' ? `
            <form id="form-login" class="space-y-4">
              <div>
                <label for="login-username" class="block text-xs font-medium mb-1">Usuario</label>
                <input id="login-username" type="text" required placeholder="Ingresa tu usuario" class="w-full rounded-lg border px-3.5 py-2.5 text-sm ${inputClass}" />
              </div>
              <div>
                <label for="login-password" class="block text-xs font-medium mb-1">Contrasena</label>
                <input id="login-password" type="password" required placeholder="Ingresa tu contrasena" class="w-full rounded-lg border px-3.5 py-2.5 text-sm ${inputClass}" />
              </div>
              <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors">Continuar</button>
            </form>
          ` : `
            <form id="form-register" class="space-y-3.5">
              <div>
                <label for="reg-name" class="block text-xs font-medium mb-1">Nombre completo</label>
                <input id="reg-name" type="text" required placeholder="Ej. Carlos Restrepo" class="w-full rounded-lg border px-3.5 py-2 text-sm ${inputClass}" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label for="reg-username" class="block text-xs font-medium mb-1">Usuario</label>
                  <input id="reg-username" type="text" required placeholder="Ej. carlos" class="w-full rounded-lg border px-3.5 py-2 text-sm ${inputClass}" />
                </div>
                <div>
                  <label for="reg-role" class="block text-xs font-medium mb-1">Tipo de cuenta</label>
                  <select id="reg-role" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}">
                    <option value="CLIENTE" ${state.registerRole === 'CLIENTE' ? 'selected' : ''}>Cliente</option>
                    <option value="ADMIN" ${state.registerRole === 'ADMIN' ? 'selected' : ''}>Administrador (unico)</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="reg-phone" class="block text-xs font-medium mb-1">Telefono celular</label>
                <input id="reg-phone" type="tel" required placeholder="3001234567" class="w-full rounded-lg border px-3.5 py-2 text-sm font-mono ${inputClass}" />
              </div>
              <div>
                <label for="reg-password" class="block text-xs font-medium mb-1">Crear contrasena</label>
                <input id="reg-password" type="password" required minlength="4" placeholder="Minimo 4 caracteres" class="w-full rounded-lg border px-3.5 py-2 text-sm ${inputClass}" />
              </div>
              ${adminBlocked ? `
                <p class="text-xs text-red-400 bg-red-950/40 border border-red-500/40 rounded-lg p-2.5">
                  Ya se registro la cuenta unica de Administrador. No es posible crear otra a menos que la cuenta actual sea eliminada.
                </p>
              ` : ''}
              <button type="submit" ${adminBlocked ? 'disabled' : ''} class="w-full py-3 rounded-xl font-bold text-sm transition-colors ${adminBlocked ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}">Crear cuenta e ingresar</button>
            </form>
          `}
        </div>
      </main>

      <footer class="w-full max-w-[1360px] mx-auto px-6 py-4 text-center text-xs text-slate-500">
        Urban Style Barber Shop · Horario de atencion 08:00 a 20:00
      </footer>
      ${renderToastOverlay(isDark)}
    </div>
  `;
}

export function renderApp() {
  const root = document.getElementById('app-root') || document.getElementById('root');
  if (!root) return;

  const isDark = state.theme === 'dark';
  const bgClass = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const cardClass = isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const inputClass = isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900';

  if (!state.isAuthenticated) {
    root.innerHTML = renderLoginScreen(isDark, bgClass, cardClass, inputClass);
    bindLoginEvents();
    return;
  }

  const allTabs = [
    { id: 'view-booking', label: 'Reservar Cita' },
    { id: 'view-my-appointment', label: 'Mis Reservas' },
    { id: 'view-chair-mode', label: state.role === 'ADMIN' ? 'Agendas de Barberos' : 'Agenda de Barberos' },
    { id: 'view-admin-finance', label: 'Caja y Finanzas' },
    { id: 'view-sefi-lab', label: 'Evaluar Inversion' },
    { id: 'view-tariffs', label: 'Precios y Servicios' },
    { id: 'view-barbers', label: 'Barberos' },
  ];
  const visibleTabs = allTabs.filter((t) => evaluateViewAccess(state.role, t.id).allowed);
  if (!evaluateViewAccess(state.role, state.activeView).allowed) {
    state.activeView = visibleTabs[0]?.id || getDefaultViewForRole(state.role);
  }

  root.innerHTML = `
    <div class="min-h-screen flex flex-col justify-between transition-colors ${bgClass}">
      <div>
        <header class="sticky top-0 z-30 border-b backdrop-blur-md ${isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200'}">
          <div class="max-w-[1360px] mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
            <div class="flex items-center gap-3 shrink-0">
              ${renderBarberLogo('sm')}
              <span class="text-base font-bold tracking-tight whitespace-nowrap">Urban Style Barber Shop</span>
            </div>

            <nav class="flex items-center gap-1 overflow-x-auto" aria-label="Navegacion principal">
              ${visibleTabs.map((t) => `
                <button data-nav-view="${t.id}" type="button" class="px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  state.activeView === t.id
                    ? 'bg-amber-500 text-slate-950'
                    : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }">${t.label}</button>
              `).join('')}
            </nav>

            <div class="flex items-center gap-3 shrink-0">
              <div class="text-right hidden sm:block">
                <p class="text-xs font-semibold leading-tight">${state.userName}</p>
                <p class="text-[11px] text-amber-500 font-mono">${state.role}</p>
              </div>
              ${renderThemeIconButton(isDark)}
              <button id="btn-logout" type="button" class="px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${isDark ? 'border-red-500/40 text-red-300 hover:bg-red-950/50' : 'border-red-300 text-red-700 hover:bg-red-50'}">
                Cerrar sesion
              </button>
            </div>
          </div>
        </header>

        <main class="max-w-[1360px] mx-auto px-6 py-8">
          ${renderActiveView(isDark, cardClass, inputClass)}
        </main>
      </div>

      <footer class="border-t py-4 px-6 text-xs text-slate-500 ${isDark ? 'border-slate-900' : 'border-slate-200'}">
        <div class="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>Urban Style Barber Shop · Medellin</span>
          ${state.role === 'ADMIN' ? `
            <button id="btn-delete-admin" type="button" class="text-xs font-semibold text-red-400 hover:text-red-300 underline">
              Eliminar cuenta de Administrador
            </button>
          ` : '<span>Horario de atencion: 08:00 a 20:00</span>'}
        </div>
      </footer>

      ${renderToastOverlay(isDark)}
      ${renderConfirmModal(isDark, cardClass)}
    </div>
  `;

  bindWorkspaceEvents();
}

function renderActiveView(isDark, cardClass, inputClass) {
  switch (state.activeView) {
    case 'view-my-appointment': return renderMyAppointmentView(isDark, cardClass, inputClass);
    case 'view-chair-mode': return renderChairModeView(isDark, cardClass, inputClass);
    case 'view-admin-finance': return renderAdminFinanceView(isDark, cardClass, inputClass);
    case 'view-sefi-lab': return renderSefiLabView(isDark, cardClass, inputClass);
    case 'view-tariffs': return renderTariffsView(isDark, cardClass, inputClass);
    case 'view-barbers': return renderBarbersCrudView(isDark, cardClass, inputClass);
    default: return renderBookingView(isDark, cardClass, inputClass);
  }
}

function renderBookingView(isDark, cardClass, inputClass) {
  const baseServices = state.services.filter((s) => s.category === 'BASE');
  const addonServices = state.services.filter((s) => s.category === 'ADDON');
  const selectedBase = baseServices.find((s) => s.id === state.selectedBaseId) || baseServices[0] || { id: 'srv-1', name: 'Corte Degradado (Fade)', price_cop: 35000, duration_minutes: 35 };
  const selectedAddons = addonServices.filter((s) => state.selectedAddonIds.includes(s.id));
  const totals = calculateBookingTotals(selectedBase, selectedAddons);
  const freeSlots = filterAvailableSlots(
    CANDIDATE_SLOTS,
    state.bookings.filter((b) => b.date === state.selectedDate),
    state.selectedBarberId === 'auto' ? 'barber-mateo' : state.selectedBarberId
  );

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div class="lg:col-span-8 space-y-6">
        <section class="rounded-2xl border p-6 ${cardClass}">
          <h1 class="text-xl font-bold mb-1">1. Elige tu corte principal</h1>
          <p class="text-xs text-slate-400 mb-4">Selecciona el servicio que deseas realizarte hoy.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${baseServices.map((s) => `
              <button type="button" data-base-id="${s.id}" class="text-left p-4 rounded-xl border transition-all ${
                selectedBase.id === s.id ? 'border-amber-500 bg-amber-500/10' : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
              }">
                <div class="flex justify-between items-start gap-2">
                  <span class="font-semibold text-sm">${s.name}</span>
                  <span class="font-mono font-bold text-sm text-amber-500">${formatCOP(s.price_cop)}</span>
                </div>
                <p class="text-xs text-slate-400 mt-1">${s.description || ''} · ${s.duration_minutes} min</p>
              </button>
            `).join('')}
          </div>
        </section>

        <section class="rounded-2xl border p-6 ${cardClass}">
          <h2 class="text-lg font-bold mb-1">2. Servicios adicionales (opcional)</h2>
          <p class="text-xs text-slate-400 mb-4">El valor y el tiempo se suman automaticamente a tu cita.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${addonServices.map((a) => {
              const active = state.selectedAddonIds.includes(a.id);
              return `
                <button type="button" data-addon-id="${a.id}" class="text-left p-3.5 rounded-xl border transition-all ${
                  active ? 'border-amber-500 bg-amber-500/10' : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                }">
                  <div class="flex justify-between items-center">
                    <span class="text-sm font-medium">${a.name}</span>
                    <span class="font-mono text-xs font-semibold text-amber-500">+${formatCOP(a.price_cop)}</span>
                  </div>
                  <span class="text-xs text-slate-400">+${a.duration_minutes} min</span>
                </button>
              `;
            }).join('')}
          </div>
        </section>

        <section class="rounded-2xl border p-6 ${cardClass}">
          <h2 class="text-lg font-bold mb-4">3. Barbero y hora de tu cita</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label for="booking-barber" class="block text-xs font-medium mb-1">Barbero</label>
              <select id="booking-barber" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}">
                <option value="auto" ${state.selectedBarberId === 'auto' ? 'selected' : ''}>Cualquier barbero disponible</option>
                ${state.barbers.map((b) => `<option value="${b.id}" ${state.selectedBarberId === b.id ? 'selected' : ''}>${b.name} (${b.specialty})</option>`).join('')}
              </select>
            </div>
            <div>
              <label for="booking-payment" class="block text-xs font-medium mb-1">Medio de pago en barberia</label>
              <select id="booking-payment" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}">
                ${['EFECTIVO', 'NEQUI', 'BANCOLOMBIA', 'DAVIPLATA'].map((m) => `<option value="${m}" ${state.selectedPayment === m ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
          </div>

          <p class="text-xs font-medium mb-2">Horarios disponibles (08:00 a 20:00)</p>
          <div class="flex flex-wrap gap-2">
            ${freeSlots.map((slot) => `
              <button type="button" data-slot="${slot}" class="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border ${
                state.selectedSlot === slot ? 'bg-amber-500 text-slate-950 border-amber-500' : isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
              }">${slot}</button>
            `).join('')}
          </div>
        </section>
      </div>

      <div class="lg:col-span-4">
        <aside class="rounded-2xl border p-6 sticky top-20 ${cardClass}">
          <h2 class="text-lg font-bold mb-4">Resumen de tu Reserva</h2>
          <div class="space-y-2 text-sm border-b pb-4 mb-4 ${isDark ? 'border-slate-800' : 'border-slate-200'}">
            <div class="flex justify-between">
              <span class="text-slate-400">Servicio principal:</span>
              <span class="font-semibold">${selectedBase.name}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Adicionales (${totals.addonCount}):</span>
              <span>${selectedAddons.map((a) => a.name).join(', ') || 'Ninguno'}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Duracion total:</span>
              <span class="font-mono font-semibold">${totals.totalDurationMinutes} min</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Hora elegida:</span>
              <span class="font-mono font-semibold">${state.selectedSlot}</span>
            </div>
            <div class="flex justify-between text-base pt-2">
              <span class="font-bold">Total a pagar:</span>
              <span class="font-mono font-bold text-amber-500">${formatCOP(totals.totalPriceCOP)}</span>
            </div>
          </div>

          <form id="form-create-booking" class="space-y-3">
            <div>
              <label for="booking-client-name" class="block text-xs font-medium mb-1">Tu nombre completo</label>
              <input id="booking-client-name" type="text" required value="${state.clientName}" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
            </div>
            <div>
              <label for="booking-client-phone" class="block text-xs font-medium mb-1">Celular / WhatsApp</label>
              <input id="booking-client-phone" type="tel" required value="${state.clientPhone}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <button type="submit" class="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors">
              Confirmar Reserva
            </button>
          </form>

          ${state.lastCreatedBooking ? `
            <div id="booking-confirm-banner" class="mt-4 p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-xs space-y-1">
              <p class="font-bold text-emerald-400">Reserva confirmada (${state.lastCreatedBooking.id})</p>
              <p>Barbero: ${state.lastCreatedBooking.barber_name} · ${state.lastCreatedBooking.start_time} - ${state.lastCreatedBooking.end_time}</p>
            </div>
          ` : ''}
        </aside>
      </div>
    </div>
  `;
}

function renderMyAppointmentView(isDark, cardClass, inputClass) {
  const q = state.lookupQuery.trim().toLowerCase();
  const activeBookings = state.bookings.filter((b) => {
    const status = String(b.status || '').toUpperCase();
    if (status === 'COMPLETADA' || status === 'CANCELADA' || status === 'PAUSA') {
      return false;
    }
    if (!isClientOwnerOfBooking(b)) {
      return false;
    }
    if (!q) return true;
    return (
      String(b.id || '').toLowerCase().includes(q) ||
      String(b.client_name || '').toLowerCase().includes(q) ||
      String(b.client_phone || '').toLowerCase().includes(q)
    );
  });

  return `
    <section class="max-w-3xl mx-auto rounded-2xl border p-6 ${cardClass}">
      <h1 class="text-xl font-bold mb-1">Consultar mis Reservas Activas</h1>
      <p class="text-xs text-slate-400 mb-4">Busca tus citas personales por numero de reserva (ej. bk-1002) o por tu nombre. Por privacidad y seguridad solo se muestran las reservas de tu cuenta; la cancelacion de citas esta reservada al Barbero asignado o al Administrador.</p>

      <div class="flex gap-2 mb-6">
        <input id="input-lookup-query" type="text" value="${state.lookupQuery}" placeholder="Buscar en mis reservas por codigo (ej. bk-1002) o por mi nombre" class="flex-1 rounded-lg border px-3 py-2 text-sm ${inputClass}" />
        <button id="btn-lookup-search" type="button" class="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs">Buscar</button>
        <button id="btn-lookup-clear" type="button" class="px-3 py-2 rounded-lg border text-xs font-semibold ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}">Ver mis citas</button>
      </div>

      <div class="space-y-3">
        ${activeBookings.length === 0 ? `<p class="text-sm text-slate-400 py-4">No tienes reservas activas que coincidan con "${state.lookupQuery || state.userName}".</p>` : activeBookings.map((b) => `
          <div class="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isDark ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}">
            <div>
              <div class="flex items-center gap-2">
                <span class="font-mono text-xs text-amber-500 font-bold">${b.id}</span>
                <span class="font-bold text-sm">${b.base_service_name}</span>
                <span class="text-xs text-slate-400">· ${b.status}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">Cliente: ${b.client_name} (${b.client_phone}) · Barbero: ${b.barber_name}</p>
              <p class="text-xs font-mono mt-0.5">Horario: ${b.start_time} - ${b.end_time} (${b.duration_minutes} min) · ${formatCOP(b.total_cop)}</p>
            </div>
            <div class="flex items-center gap-2">
              <select data-reschedule-select="${b.id}" aria-label="Nueva hora para ${b.id}" class="rounded-lg border px-2 py-1.5 text-xs font-mono ${inputClass}">
                ${['10:30', '13:00', '15:00', '16:30', '18:00'].map((h) => `<option value="${h}">${h}</option>`).join('')}
              </select>
              <button type="button" data-reschedule-btn="${b.id}" class="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/50 text-amber-400 hover:bg-amber-500/10">Cambiar hora</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderChairModeView(isDark, cardClass, inputClass) {
  const barberBookings = state.bookings.filter((b) => b.barber_id === state.chairBarberId);
  const inChair = barberBookings.find((b) => b.status === 'EN_SILLA');
  const nextQueue = barberBookings.filter((b) => b.status === 'CONFIRMADA');
  const breaksToday = barberBookings.filter((b) => b.status === 'PAUSA');
  const canModifyThisBarber = state.role === 'BARBERO' && state.userBarberId === state.chairBarberId;
  const canCancelClientBooking = state.role === 'ADMIN' || (state.role === 'BARBERO' && state.userBarberId === state.chairBarberId);
  const breakLimitReached = breaksToday.length >= 2;

  return `
    <div class="space-y-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold">${state.role === 'ADMIN' ? 'Agendas de Barberos y Control de Citas' : 'Agenda de Barberos'}</h1>
          <p class="text-xs text-slate-400">
            ${state.role === 'ADMIN'
              ? 'Como Administrador puedes supervisar todas las agendas y cancelar cualquier reserva activa.'
              : canModifyThisBarber
                ? 'Gestiona tus clientes, cancela citas de tu estacion si es necesario y registra hasta 2 descansos de 30 min.'
                : 'Modo consulta de solo lectura: puedes ver la agenda de tus companeros, pero no modificar ni cancelar sus citas.'}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-xs font-mono text-slate-400">Descansos hoy: ${breaksToday.length} / 2</span>
          <select id="chair-barber-select" aria-label="Seleccionar barbero" class="rounded-lg border px-3 py-2 text-sm ${inputClass}">
            ${state.barbers.map((b) => `<option value="${b.id}" ${state.chairBarberId === b.id ? 'selected' : ''}>${b.name} (${b.specialty})</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 rounded-2xl border p-6 ${cardClass}">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-500">Cliente en atencion</span>
          ${inChair ? `
            <h2 class="text-2xl font-bold mt-2">${inChair.client_name}</h2>
            <p class="text-sm text-slate-400 mt-1">${inChair.base_service_name} ${(inChair.addon_names || []).length ? '+ ' + inChair.addon_names.join(', ') : ''}</p>
            <p class="font-mono text-sm mt-2">${inChair.start_time} - ${inChair.end_time} · ${formatCOP(inChair.total_cop)}</p>
          ` : `<p class="text-sm text-slate-400 my-6">No hay cliente en silla en este momento.</p>`}

          ${canModifyThisBarber ? `
            <div class="mt-6 space-y-3">
              <button id="btn-complete-cut" type="button" class="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm">
                Terminar corte en curso
              </button>
              <div class="flex gap-2">
                <input id="input-break-time" type="time" value="13:00" aria-label="Hora de descanso" class="rounded-lg border px-3 py-2 text-xs font-mono ${inputClass}" />
                <button id="btn-pause-break" type="button" ${breakLimitReached ? 'disabled' : ''} class="flex-1 py-2.5 rounded-xl border text-xs font-semibold ${
                  breakLimitReached
                    ? 'border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
                }">
                  ${breakLimitReached ? 'Limite de 2 descansos alcanzado' : 'Tomar descanso de 30 min'}
                </button>
              </div>
            </div>
          ` : `
            <div class="mt-6 p-3.5 rounded-xl border text-xs ${isDark ? 'border-slate-800 bg-slate-950 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'}">
              Solo el barbero titular de esta estacion puede finalizar cortes o registrar descansos en su agenda.
            </div>
          `}
        </div>

        <div class="lg:col-span-7 rounded-2xl border p-6 ${cardClass}">
          <h2 class="text-lg font-bold mb-4">Citas y descansos del dia (${barberBookings.length})</h2>
          <div class="space-y-2.5">
            ${barberBookings.map((b) => {
              const isCancellable = canCancelClientBooking && (b.status === 'CONFIRMADA' || b.status === 'EN_SILLA');
              return `
                <div class="p-3.5 rounded-xl border flex flex-wrap justify-between items-center gap-3 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}">
                  <div>
                    <span class="font-mono text-xs font-bold text-amber-500">${b.id} · ${b.start_time} - ${b.end_time}</span>
                    <p class="font-semibold text-sm">${b.client_name} · ${b.base_service_name}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="text-right">
                      <span class="text-xs font-mono font-semibold">${b.status}</span>
                      <p class="text-xs font-mono text-slate-400">${formatCOP(b.total_cop)}</p>
                    </div>
                    ${isCancellable ? `
                      <button type="button" data-cancel-btn="${b.id}" class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-red-500/50 text-red-400 hover:bg-red-500/10">
                        Cancelar reserva
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          <p class="text-xs text-slate-400 mt-4">Clientes en espera hoy: ${nextQueue.length}</p>
        </div>
      </div>
    </div>
  `;
}

function renderAdminFinanceView(isDark, cardClass, inputClass) {
  const sem = state.semaphore;
  const fc = state.financialBaseline.fixed_costs || {};
  const completedTotal = state.bookings.filter((b) => b.status === 'COMPLETADA').reduce((acc, b) => acc + Number(b.total_cop || 0), 0);

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-7 rounded-2xl border p-6 ${cardClass}">
        <h1 class="text-xl font-bold mb-1">Estado de Caja y Punto de Equilibrio</h1>
        <p class="text-xs text-slate-400 mb-6">Compara los ingresos del mes frente a los gastos fijos del local.</p>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
            <span class="text-xs text-slate-400">Ingresos del Mes</span>
            <p class="text-lg font-mono font-bold mt-1">${formatCOP(sem.monthly_revenue)}</p>
          </div>
          <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
            <span class="text-xs text-slate-400">Gastos Fijos</span>
            <p class="text-lg font-mono font-bold mt-1">${formatCOP(sem.total_costs)}</p>
          </div>
          <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
            <span class="text-xs text-slate-400">Estado (${sem.status})</span>
            <p class="text-lg font-bold text-amber-500 mt-1">${sem.label}</p>
            <span class="text-xs font-mono text-slate-400">Cobertura: ${formatPercentage(sem.coverage_pct)}</span>
          </div>
        </div>

        <form id="form-breakeven" class="space-y-3">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="be-revenue" class="block text-xs font-medium mb-1">Ingresos acumulados del mes (COP)</label>
              <input id="be-revenue" type="number" value="${state.financialBaseline.monthly_revenue_accumulated || 14850000}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="be-arriendo" class="block text-xs font-medium mb-1">Arriendo del local (COP)</label>
              <input id="be-arriendo" type="number" value="${fc.arriendo_local_poblado || 4800000}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="be-servicios" class="block text-xs font-medium mb-1">Servicios publicos e internet (COP)</label>
              <input id="be-servicios" type="number" value="${fc.servicios_epm_fibra || 1150000}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="be-nomina" class="block text-xs font-medium mb-1">Nomina base e insumos (COP)</label>
              <input id="be-nomina" type="number" value="${(fc.nomina_base_seguridad_social || 4200000) + (fc.insumos_cuchillas_tonicos || 1650000)}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
          </div>
          <button type="submit" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
            Actualizar Punto de Equilibrio
          </button>
        </form>
      </div>

      <div class="lg:col-span-5 rounded-2xl border p-6 ${cardClass}">
        <h2 class="text-lg font-bold mb-1">Comisiones de Barberos Hoy</h2>
        <p class="text-xs text-slate-400 mb-4">Total recaudado en cortes terminados hoy: <strong class="font-mono text-amber-500">${formatCOP(completedTotal)}</strong></p>
        <div class="space-y-3">
          ${state.barbers.map((b) => {
            const barberGross = state.bookings
              .filter((bk) => bk.barber_id === b.id && bk.status === 'COMPLETADA')
              .reduce((acc, bk) => acc + Number(bk.total_cop || 0), 0);
            const comm = Math.round(barberGross * b.commission_pct);
            return `
              <div class="p-3.5 rounded-xl border flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
                <div>
                  <p class="font-semibold text-sm">${b.name}</p>
                  <span class="text-xs text-slate-400">Comision pactada: ${formatPercentage(b.commission_pct, true)}</span>
                </div>
                <div class="text-right font-mono">
                  <p class="text-sm font-bold text-amber-500">${formatCOP(comm)}</p>
                  <span class="text-xs text-slate-400">Bruto: ${formatCOP(barberGross)}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderSefiLabView(isDark, cardClass, inputClass) {
  const c = CASES[state.sefiCaseKey] || CASES.base;
  const r = state.sefiResult;

  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-6 rounded-2xl border p-6 ${cardClass}">
        <h1 class="text-xl font-bold mb-1">Evaluar Inversion de la Barberia (VAN y TIR)</h1>
        <p class="text-xs text-slate-400 mb-4">Simula si una inversion en equipos, remodelacion o insumos es rentable.</p>

        <div class="flex flex-wrap gap-2 mb-4">
          ${Object.entries(CASES).map(([key, item]) => `
            <button type="button" data-sefi-case="${key}" class="px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              state.sefiCaseKey === key ? 'bg-amber-500 text-slate-950 border-amber-500' : isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
            }">${item.label}</button>
          `).join('')}
        </div>

        <form id="form-sefi-eval" class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="sefi-inv" class="block text-xs font-medium mb-1">Inversion inicial (COP)</label>
              <input id="sefi-inv" type="number" required value="${c.inv}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="sefi-rate" class="block text-xs font-medium mb-1">Tasa de descuento anual (%)</label>
              <input id="sefi-rate" type="number" step="0.1" required value="${c.rate}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label for="sefi-f1" class="block text-xs font-medium mb-1">Flujo Ano 1 (COP)</label>
              <input id="sefi-f1" type="number" required value="${c.flows[0]}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="sefi-f2" class="block text-xs font-medium mb-1">Flujo Ano 2 (COP)</label>
              <input id="sefi-f2" type="number" required value="${c.flows[1]}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
            <div>
              <label for="sefi-f3" class="block text-xs font-medium mb-1">Flujo Ano 3 (COP)</label>
              <input id="sefi-f3" type="number" required value="${c.flows[2]}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
          </div>
          <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
            Calcular Rentabilidad (VAN y TIR)
          </button>
        </form>
      </div>

      <div class="lg:col-span-6 rounded-2xl border p-6 ${cardClass}">
        <h2 class="text-lg font-bold mb-4">Resultado del Analisis</h2>
        ${r ? `
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
              <span class="text-xs text-slate-400">Valor Actual Neto (VAN)</span>
              <p class="text-xl font-mono font-bold mt-1 text-amber-500">${formatCOP(r.van)}</p>
            </div>
            <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
              <span class="text-xs text-slate-400">Decision Recomendada</span>
              <p class="text-xl font-bold mt-1">${r.verdict}</p>
            </div>
            <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
              <span class="text-xs text-slate-400">Tasa Interna de Retorno (TIR)</span>
              <p class="text-xl font-mono font-bold mt-1">${formatPercentage(r.tir_percentage)}</p>
            </div>
            <div class="p-4 rounded-xl border ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-slate-50'}">
              <span class="text-xs text-slate-400">Metodo de Calculo</span>
              <p class="text-sm font-semibold mt-1">${r.method}</p>
              <span class="text-xs font-mono text-slate-400">${r.iterations} iteraciones</span>
            </div>
          </div>
        ` : `<p class="text-sm text-slate-400">Ejecuta el calculo para ver los resultados.</p>`}
      </div>
    </div>
  `;
}

function renderTariffsView(isDark, cardClass, inputClass) {
  const ed = state.editingService || { id: '', name: '', category: 'BASE', price_cop: 35000, duration_minutes: 35, description: '' };
  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 rounded-2xl border p-6 ${cardClass}">
        <h1 class="text-lg font-bold mb-4">${ed.id ? 'Editar Servicio' : 'Agregar Servicio al Catalogo'}</h1>
        <form id="form-tariff" class="space-y-3">
          <input id="srv-id" type="hidden" value="${ed.id}" />
          <div>
            <label for="srv-name" class="block text-xs font-medium mb-1">Nombre del servicio</label>
            <input id="srv-name" type="text" required value="${ed.name}" placeholder="Ej. Corte Clasico" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <label for="srv-cat" class="block text-xs font-medium mb-1">Tipo</label>
              <select id="srv-cat" class="w-full rounded-lg border px-2 py-2 text-xs ${inputClass}">
                <option value="BASE" ${ed.category === 'BASE' ? 'selected' : ''}>Principal</option>
                <option value="ADDON" ${ed.category === 'ADDON' ? 'selected' : ''}>Adicional</option>
              </select>
            </div>
            <div>
              <label for="srv-price" class="block text-xs font-medium mb-1">Precio (COP)</label>
              <input id="srv-price" type="number" required value="${ed.price_cop}" class="w-full rounded-lg border px-2 py-2 text-xs font-mono ${inputClass}" />
            </div>
            <div>
              <label for="srv-dur" class="block text-xs font-medium mb-1">Minutos</label>
              <input id="srv-dur" type="number" required value="${ed.duration_minutes}" class="w-full rounded-lg border px-2 py-2 text-xs font-mono ${inputClass}" />
            </div>
          </div>
          <div>
            <label for="srv-desc" class="block text-xs font-medium mb-1">Descripcion</label>
            <input id="srv-desc" type="text" value="${ed.description || ''}" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
          </div>
          <button type="submit" class="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
            Guardar Servicio
          </button>
        </form>
      </div>

      <div class="lg:col-span-7 rounded-2xl border p-6 ${cardClass}">
        <h2 class="text-lg font-bold mb-4">Precios y Servicios Vigentes (${state.services.length})</h2>
        <div class="space-y-2.5">
          ${state.services.map((s) => `
            <div class="p-3.5 rounded-xl border flex justify-between items-center gap-3 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}">
              <div>
                <p class="font-semibold text-sm">${s.name} <span class="text-xs text-slate-400">(${s.category === 'BASE' ? 'Principal' : 'Adicional'})</span></p>
                <span class="text-xs font-mono text-amber-500">${formatCOP(s.price_cop)} · ${s.duration_minutes} min</span>
              </div>
              <div class="flex gap-2">
                <button type="button" data-edit-srv="${s.id}" class="px-2.5 py-1 rounded border text-xs ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}">Editar</button>
                <button type="button" data-del-srv="${s.id}" class="px-2.5 py-1 rounded border border-red-500/40 text-red-400 text-xs hover:bg-red-500/10">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderBarbersCrudView(isDark, cardClass, inputClass) {
  const eb = state.editingBarber || { id: '', name: '', specialty: 'Degradados y Barba', commission_pct: 0.50, status_label: 'Disponible hoy', next_free_slot: '09:00', username: '' };
  return `
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-5 rounded-2xl border p-6 ${cardClass}">
        <h1 class="text-lg font-bold mb-1">${eb.id ? 'Editar Barbero' : 'Registrar Nuevo Barbero'}</h1>
        <p class="text-xs text-slate-400 mb-4">Crea o actualiza los barberos del local y sus credenciales de acceso.</p>
        <form id="form-barber-crud" class="space-y-3">
          <input id="barber-crud-id" type="hidden" value="${eb.id}" />
          <div>
            <label for="barber-crud-name" class="block text-xs font-medium mb-1">Nombre completo del barbero</label>
            <input id="barber-crud-name" type="text" required value="${eb.name}" placeholder="Ej. Esteban Vallejo" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="barber-crud-spec" class="block text-xs font-medium mb-1">Especialidad</label>
              <input id="barber-crud-spec" type="text" required value="${eb.specialty}" placeholder="Ej. Corte Clasico y Barba" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
            </div>
            <div>
              <label for="barber-crud-comm" class="block text-xs font-medium mb-1">Comision (%)</label>
              <input id="barber-crud-comm" type="number" min="10" max="90" required value="${Math.round((eb.commission_pct || 0.5) * 100)}" class="w-full rounded-lg border px-3 py-2 text-sm font-mono ${inputClass}" />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="barber-crud-user" class="block text-xs font-medium mb-1">Usuario de acceso</label>
              <input id="barber-crud-user" type="text" required value="${eb.username || ''}" placeholder="Ej. esteban" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
            </div>
            <div>
              <label for="barber-crud-pass" class="block text-xs font-medium mb-1">${eb.id ? 'Nueva clave (opcional)' : 'Contrasena de acceso'}</label>
              <input id="barber-crud-pass" type="password" ${eb.id ? '' : 'required'} placeholder="Ej. barbero123" class="w-full rounded-lg border px-3 py-2 text-sm ${inputClass}" />
            </div>
          </div>
          <div class="flex gap-2">
            <button type="submit" class="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs">
              ${eb.id ? 'Actualizar Barbero' : 'Guardar Barbero'}
            </button>
            ${eb.id ? `<button id="btn-cancel-edit-barber" type="button" class="px-3 py-2.5 rounded-xl border text-xs font-semibold ${isDark ? 'border-slate-700' : 'border-slate-300'}">Cancelar</button>` : ''}
          </div>
        </form>
      </div>

      <div class="lg:col-span-7 rounded-2xl border p-6 ${cardClass}">
        <h2 class="text-lg font-bold mb-4">Equipo de Barberos Activos (${state.barbers.length})</h2>
        <div class="space-y-2.5">
          ${state.barbers.map((b) => `
            <div class="p-4 rounded-xl border flex flex-wrap justify-between items-center gap-3 ${isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'}">
              <div>
                <p class="font-bold text-sm">${b.name}</p>
                <p class="text-xs text-slate-400">${b.specialty} · Usuario: <span class="font-mono text-amber-500">${b.username || b.id.replace('barber-', '')}</span></p>
                <span class="text-xs font-mono text-slate-400">Comision: ${formatPercentage(b.commission_pct, true)}</span>
              </div>
              <div class="flex gap-2">
                <button type="button" data-edit-barber="${b.id}" class="px-3 py-1.5 rounded-lg border text-xs font-semibold ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}">Editar</button>
                <button type="button" data-del-barber="${b.id}" class="px-3 py-1.5 rounded-lg border border-red-500/40 text-red-400 text-xs font-semibold hover:bg-red-500/10">Eliminar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function bindCommonEvents() {
  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    renderApp();
  });

  document.getElementById('btn-close-toast')?.addEventListener('click', () => {
    if (toastTimer) clearTimeout(toastTimer);
    state.toast = null;
    renderApp();
  });

  document.getElementById('btn-modal-cancel')?.addEventListener('click', () => {
    closeConfirmModal();
  });

  document.getElementById('btn-modal-confirm')?.addEventListener('click', async () => {
    const fn = pendingConfirmAction;
    closeConfirmModal();
    if (typeof fn === 'function') {
      await fn();
    }
  });
}

function bindLoginEvents() {
  bindCommonEvents();

  document.querySelectorAll('[data-auth-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.authTab = btn.getAttribute('data-auth-tab') || 'login';
      renderApp();
    });
  });

  document.getElementById('reg-role')?.addEventListener('change', (e) => {
    state.registerRole = e.target.value;
    renderApp();
  });

  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const res = await callBridge('login', { username, password });
      setSessionUser(res.user, res.can_register_admin);
      showToast('ok', `Bienvenido, ${res.user.name}.`);
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.getElementById('form-register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const name = document.getElementById('reg-name').value;
      const username = document.getElementById('reg-username').value;
      const role = document.getElementById('reg-role').value;
      const phone = document.getElementById('reg-phone').value;
      const password = document.getElementById('reg-password').value;
      const res = await callBridge('register', { name, username, role, phone, password });
      setSessionUser(res.user, res.can_register_admin);
      showToast('ok', `Cuenta creada para ${res.user.name}.`);
    } catch (err) {
      showToast('error', err.message);
    }
  });
}

function bindWorkspaceEvents() {
  bindCommonEvents();

  document.getElementById('btn-logout')?.addEventListener('click', () => {
    openConfirmModal(
      'Cerrar sesion',
      '¿Estas seguro de que deseas cerrar tu sesion actual en Urban Style Barber Shop?',
      'Si, cerrar sesion',
      async () => {
        clearSession();
        showToast('ok', 'Has cerrado sesion correctamente.');
      }
    );
  });

  document.getElementById('btn-delete-admin')?.addEventListener('click', () => {
    openConfirmModal(
      'Eliminar cuenta de Administrador',
      '¿Estas seguro de que deseas eliminar la cuenta unica de Administrador? Se cerrara tu sesion y quedara habilitado el registro de un nuevo Administrador.',
      'Si, eliminar cuenta',
      async () => {
        try {
          const res = await callBridge('delete_admin_account', { role: state.role, username: state.username });
          state.canRegisterAdmin = Boolean(res.can_register_admin);
          clearSession();
          showToast('ok', 'Cuenta de Administrador eliminada. Ahora puedes registrar una nueva.');
        } catch (err) {
          showToast('error', err.message);
        }
      }
    );
  });

  document.querySelectorAll('[data-nav-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-nav-view');
      const guard = evaluateViewAccess(state.role, targetView);
      if (!guard.allowed) {
        showToast('error', guard.reason);
        return;
      }
      state.activeView = targetView;
      renderApp();
    });
  });

  document.querySelectorAll('[data-base-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedBaseId = btn.getAttribute('data-base-id');
      renderApp();
    });
  });

  document.querySelectorAll('[data-addon-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-addon-id');
      if (state.selectedAddonIds.includes(id)) {
        state.selectedAddonIds = state.selectedAddonIds.filter((x) => x !== id);
      } else {
        state.selectedAddonIds = [...state.selectedAddonIds, id];
      }
      renderApp();
    });
  });

  document.getElementById('booking-barber')?.addEventListener('change', (e) => {
    state.selectedBarberId = e.target.value;
    renderApp();
  });

  document.getElementById('booking-payment')?.addEventListener('change', (e) => {
    state.selectedPayment = e.target.value;
  });

  document.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.selectedSlot = btn.getAttribute('data-slot');
      renderApp();
    });
  });

  document.getElementById('form-create-booking')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      state.clientName = document.getElementById('booking-client-name').value;
      state.clientPhone = document.getElementById('booking-client-phone').value;
      const res = await callBridge('create_booking', {
        client_name: state.clientName,
        client_phone: state.clientPhone,
        client_username: state.username,
        barber_id: state.selectedBarberId,
        base_service_id: state.selectedBaseId,
        addon_ids: state.selectedAddonIds,
        date: state.selectedDate,
        start_time: state.selectedSlot,
        payment_method: state.selectedPayment,
      });
      state.bookings = res.bookings;
      syncOfflineSchedule(window.localStorage, state.bookings);
      showBookingBanner(res.booking);
      showToast('ok', `Reserva confirmada (${res.booking.id}) a las ${res.booking.start_time}.`);
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.getElementById('btn-lookup-search')?.addEventListener('click', () => {
    state.lookupQuery = document.getElementById('input-lookup-query').value;
    renderApp();
  });

  document.getElementById('btn-lookup-clear')?.addEventListener('click', () => {
    state.lookupQuery = '';
    renderApp();
  });

  document.querySelectorAll('[data-cancel-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-cancel-btn');
      openConfirmModal(
        'Cancelar reserva',
        `¿Estas seguro de que deseas cancelar la reserva ${id}?`,
        'Si, cancelar reserva',
        async () => {
          try {
            const res = await callBridge('cancel_booking', {
              booking_id: id,
              hours_until: 24,
              actor_role: state.role,
              actor_barber_id: state.userBarberId,
              actor_username: state.username,
              actor_name: state.userName,
            });
            state.bookings = res.bookings;
            showToast('ok', 'Reserva cancelada correctamente.');
          } catch (err) {
            showToast('error', err.message);
          }
        }
      );
    });
  });

  document.querySelectorAll('[data-reschedule-btn]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-reschedule-btn');
      const sel = document.querySelector(`[data-reschedule-select="${id}"]`);
      const newHour = sel?.value || '15:00';
      openConfirmModal(
        'Cambiar hora de reserva',
        `¿Confirmas el cambio de horario de tu reserva ${id} para las ${newHour}?`,
        'Si, cambiar hora',
        async () => {
          try {
            const res = await callBridge('reschedule_booking', {
              booking_id: id,
              start_time: newHour,
              hours_until: 24,
              actor_role: state.role,
              actor_barber_id: state.userBarberId,
              actor_username: state.username,
              actor_name: state.userName,
            });
            state.bookings = res.bookings;
            showToast('ok', 'Horario de cita actualizado.');
          } catch (err) {
            showToast('error', err.message);
          }
        }
      );
    });
  });

  document.getElementById('chair-barber-select')?.addEventListener('change', (e) => {
    state.chairBarberId = e.target.value;
    renderApp();
  });

  document.getElementById('btn-complete-cut')?.addEventListener('click', () => {
    openConfirmModal(
      'Terminar corte en curso',
      '¿Confirmas que has terminado el corte actual? La reserva pasara a estado completada y dejara de aparecer en las consultas activas del cliente.',
      'Si, terminar corte',
      async () => {
        try {
          const res = await callBridge('complete_chair_cut', {
            barber_id: state.chairBarberId,
            actor_role: state.role,
            actor_barber_id: state.userBarberId,
          });
          state.bookings = res.bookings;
          showToast('ok', 'Corte finalizado y siguiente turno actualizado.');
        } catch (err) {
          showToast('error', err.message);
        }
      }
    );
  });

  document.getElementById('btn-pause-break')?.addEventListener('click', () => {
    const start = document.getElementById('input-break-time')?.value || '13:00';
    openConfirmModal(
      'Registrar descanso de 30 min',
      `¿Confirmas registrar un descanso de 30 minutos a partir de las ${start}? Recuerda que tienes maximo 2 descansos por dia.`,
      'Si, tomar descanso',
      async () => {
        try {
          const res = await callBridge('pause_barber_break', {
            barber_id: state.chairBarberId,
            actor_role: state.role,
            actor_barber_id: state.userBarberId,
            start_time: start,
            date: state.selectedDate,
          });
          state.bookings = res.bookings;
          showToast('ok', 'Descanso de 30 minutos registrado.');
        } catch (err) {
          showToast('error', err.message);
        }
      }
    );
  });

  document.getElementById('form-breakeven')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const rev = Number(document.getElementById('be-revenue').value);
      const arr = Number(document.getElementById('be-arriendo').value);
      const srv = Number(document.getElementById('be-servicios').value);
      const nom = Number(document.getElementById('be-nomina').value);
      const res = await callBridge('evaluate_breakeven', {
        role: state.role,
        monthly_revenue: rev,
        fixed_costs: { arriendo_local_poblado: arr, servicios_epm_fibra: srv, nomina_base_seguridad_social: nom },
      });
      state.financialBaseline.monthly_revenue_accumulated = rev;
      state.semaphore = res.semaphore;
      showToast('ok', 'Punto de equilibrio actualizado.');
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.querySelectorAll('[data-sefi-case]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.sefiCaseKey = btn.getAttribute('data-sefi-case');
      const c = CASES[state.sefiCaseKey];
      const res = await callBridge('evaluate_finance', {
        role: state.role,
        initial_investment: c.inv,
        discount_rate: c.rate / 100,
        cash_flows: c.flows,
        force_bisection: c.forceBisection,
      });
      state.sefiResult = res.result;
      renderApp();
    });
  });

  document.getElementById('form-sefi-eval')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const inv = Number(document.getElementById('sefi-inv').value);
      const rate = Number(document.getElementById('sefi-rate').value) / 100;
      const flows = [
        Number(document.getElementById('sefi-f1').value),
        Number(document.getElementById('sefi-f2').value),
        Number(document.getElementById('sefi-f3').value),
      ];
      const res = await callBridge('evaluate_finance', {
        role: state.role,
        initial_investment: inv,
        discount_rate: rate,
        cash_flows: flows,
        force_bisection: state.sefiCaseKey === 'biseccion',
      });
      state.sefiResult = res.result;
      showToast('ok', 'Calculo financiero completado.');
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.getElementById('form-tariff')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const service = {
        id: document.getElementById('srv-id').value,
        name: document.getElementById('srv-name').value,
        category: document.getElementById('srv-cat').value,
        price_cop: Number(document.getElementById('srv-price').value),
        duration_minutes: Number(document.getElementById('srv-dur').value),
        description: document.getElementById('srv-desc').value,
      };
      const res = await callBridge('upsert_service', { role: state.role, service });
      state.services = res.services;
      state.editingService = null;
      showToast('ok', 'Catalogo de servicios actualizado.');
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.querySelectorAll('[data-edit-srv]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-srv');
      state.editingService = state.services.find((s) => s.id === id) || null;
      renderApp();
    });
  });

  document.querySelectorAll('[data-del-srv]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-srv');
      const srv = state.services.find((s) => s.id === id);
      openConfirmModal(
        'Eliminar servicio del catalogo',
        `¿Estas seguro de que deseas eliminar el servicio "${srv?.name || id}"?`,
        'Si, eliminar servicio',
        async () => {
          try {
            const res = await callBridge('delete_service', { role: state.role, service_id: id });
            state.services = res.services;
            showToast('ok', 'Servicio eliminado del catalogo.');
          } catch (err) {
            showToast('error', err.message);
          }
        }
      );
    });
  });

  document.getElementById('form-barber-crud')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const barber = {
        id: document.getElementById('barber-crud-id').value,
        name: document.getElementById('barber-crud-name').value,
        specialty: document.getElementById('barber-crud-spec').value,
        commission_pct: Number(document.getElementById('barber-crud-comm').value) / 100,
        username: document.getElementById('barber-crud-user').value,
        password: document.getElementById('barber-crud-pass').value,
        status_label: 'Disponible hoy',
        next_free_slot: '09:00',
      };
      const res = await callBridge('upsert_barber', { role: state.role, barber });
      state.barbers = res.barbers;
      state.editingBarber = null;
      showToast('ok', 'Datos del barbero guardados correctamente.');
    } catch (err) {
      showToast('error', err.message);
    }
  });

  document.getElementById('btn-cancel-edit-barber')?.addEventListener('click', () => {
    state.editingBarber = null;
    renderApp();
  });

  document.querySelectorAll('[data-edit-barber]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-edit-barber');
      state.editingBarber = state.barbers.find((b) => b.id === id) || null;
      renderApp();
    });
  });

  document.querySelectorAll('[data-del-barber]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-del-barber');
      const b = state.barbers.find((x) => x.id === id);
      openConfirmModal(
        'Eliminar barbero del equipo',
        `¿Estas seguro de que deseas eliminar al barbero "${b?.name || id}" y su cuenta de acceso?`,
        'Si, eliminar barbero',
        async () => {
          try {
            const res = await callBridge('delete_barber', { role: state.role, barber_id: id });
            state.barbers = res.barbers;
            if (state.chairBarberId === id && state.barbers[0]) {
              state.chairBarberId = state.barbers[0].id;
            }
            showToast('ok', 'Barbero eliminado correctamente.');
          } catch (err) {
            showToast('error', err.message);
          }
        }
      );
    });
  });
}

let appBooted = false;

export async function bootSefiTiApp() {
  if (appBooted) return;
  appBooted = true;
  await bootstrapApp();
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    bootSefiTiApp();
  });
}
