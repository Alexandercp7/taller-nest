/**
 * TALLER ERP — CORE APPLICATION CONTROLLER
 * Integrates all 16 modules, views, event bindings and domain flows.
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Inicializando Taller ERP...');
  
  // 1. Initialize API Connection and Active User
  await initSessionAndConnection();

  // 2. Setup Navigation & View Switching
  setupNavigation();

  // 3. Setup Global Modals & Listeners
  setupModals();

  // 4. Initial Render
  await refreshAllData();
  renderCurrentView();

  // Periodically check live connection
  setInterval(checkBackendStatus, 15000);
});

/* ==========================================================================
   SESSION & CONNECTION MANAGEMENT
   ========================================================================== */
async function initSessionAndConnection() {
  const isOnline = await API.ping();
  updateConnectionPill(isOnline);

  if (isOnline) {
    const existingToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    if (!existingToken) {
      try {
        await API.login(CONFIG.DEFAULT_ADMIN_EMAIL, CONFIG.DEFAULT_ADMIN_PASS);
      } catch (err) {
        console.warn('Auto-login attempt failed', err);
      }
    }
  }

  try {
    const user = await API.getMe();
    STATE.user = user;
    updateUserBadge(user);
  } catch (e) {
    // If token expired, retry login once
    if (isOnline) {
      try {
        await API.login(CONFIG.DEFAULT_ADMIN_EMAIL, CONFIG.DEFAULT_ADMIN_PASS);
        const retryUser = await API.getMe();
        STATE.user = retryUser;
        updateUserBadge(retryUser);
        return;
      } catch (loginErr) {
        console.warn('Retry login failed', loginErr);
      }
    }
    console.warn('Could not fetch /users/me, using fallback admin', e);
    STATE.user = mockDb.data.users[0];
    updateUserBadge(STATE.user);
  }
}

async function checkBackendStatus() {
  const isOnline = await API.ping();
  updateConnectionPill(isOnline);
}

function updateConnectionPill(isOnline) {
  const pill = document.getElementById('connection-status-pill');
  const dot = document.getElementById('connection-status-dot');
  const txt = document.getElementById('connection-status-text');
  if (!pill) return;

  if (isOnline) {
    pill.className = 'connection-pill online';
    dot.className = 'status-dot online';
    txt.textContent = '🟢 Backend Conectado';
    pill.title = `Conectado a ${API.getBaseUrl()}`;
  } else {
    pill.className = 'connection-pill offline';
    dot.className = 'status-dot offline';
    txt.textContent = '🟡 Modo Demo Local';
    pill.title = `Servidor offline en ${API.getBaseUrl()}. Usando almacén reactivo local`;
  }
}

function updateUserBadge(user) {
  const avatar = document.getElementById('sidebar-user-avatar');
  const name = document.getElementById('sidebar-user-name');
  const role = document.getElementById('sidebar-user-role');
  if (avatar && user) avatar.textContent = (user.firstName || user.email || 'A')[0].toUpperCase();
  if (name && user) name.textContent = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  if (role && user) role.textContent = user.role || 'ADMIN';
}

/* ==========================================================================
   NAVIGATION & VIEW ROUTING
   ========================================================================== */
function setupNavigation() {
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const viewName = item.getAttribute('data-view');
      if (viewName) {
        STATE.setView(viewName);
      }
    });
  });

  // State event listener for route change
  STATE.on('view:change', ({ view, params }) => {
    // Update active nav item
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-view') === view);
    });

    // Update active view pane
    document.querySelectorAll('.view-pane').forEach(el => {
      el.classList.remove('active');
    });
    const targetPane = document.getElementById(`view-${view}`);
    if (targetPane) targetPane.classList.add('active');

    // Update Header Titles
    updatePageTitles(view);

    // Render View Content
    renderView(view, params);
  });

  // Subtabs generic listener
  document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetTab = btn.getAttribute('data-tab');
      const container = parent.parentElement;
      container.querySelectorAll('.invoicing-subtab, .finance-subtab, .inv-subtab, .crm-subtab, .wo-subpane').forEach(pane => {
        pane.style.display = (pane.id === `tab-${targetTab}` || pane.id === targetTab) ? 'block' : 'none';
      });
    });
  });
}

function updatePageTitles(view) {
  const heading = document.getElementById('page-title-heading');
  const breadcrumb = document.getElementById('page-breadcrumb-text');
  
  const map = {
    'dashboard': { title: 'Tablero de Control', sub: 'ERP Automotriz / Resumen General' },
    'work-orders': { title: 'Órdenes de Trabajo', sub: 'Recepción, Diagnóstico & Flujo Operativo' },
    'quotations': { title: 'Cotizador & Presupuestos', sub: 'Partidas, Aprobaciones e IVA Desglosado' },
    'commercial-close': { title: 'Cierre Comercial', sub: 'Congelación de Importes & Generación de CxC' },
    'invoicing': { title: 'Facturación SAT', sub: 'CFDI 4.0, Bandeja de Faltantes & Emisión' },
    'finance': { title: 'Caja, Pagos & CxC', sub: 'Cobranza, Comisiones Terminal & Flujo de Efectivo' },
    'inventory': { title: 'Inventario & Almacén', sub: 'Refacciones, Herramientas, Custodia & Proveedores' },
    'services': { title: 'Catálogo de Servicios', sub: 'Mano de Obra & Matriz de Precios por Vehículo' },
    'crm': { title: 'Clientes & Padrón Vehicular', sub: 'Segmentación, Detección de Deuda & Decodificador VIN' },
    'users': { title: 'Personal & Accesos IAM', sub: 'Usuarios, Roles y Permisos Granulares' }
  };

  const info = map[view] || { title: 'Taller ERP', sub: 'Sistema Automotriz' };
  if (heading) heading.textContent = info.title;
  if (breadcrumb) breadcrumb.textContent = info.sub;
}

/* ==========================================================================
   DATA REFRESH & VIEW RENDERING
   ========================================================================== */
async function refreshAllData() {
  try {
    const [woRes, cliRes, vehRes, srvRes, invRes, cxcRes] = await Promise.all([
      API.getWorkOrders(),
      API.getClients(),
      API.getVehicles(),
      API.getServices(),
      API.getArticles(),
      API.getReceivables()
    ]);

    STATE.cachedData.workOrders = woRes.data || [];
    STATE.cachedData.clients = cliRes.data || [];
    STATE.cachedData.vehicles = vehRes.data || [];
    STATE.cachedData.services = srvRes.data || [];
    STATE.cachedData.inventory = invRes.data || [];
    STATE.cachedData.receivables = cxcRes.data || [];

    // Update badge indicators
    const delayedCount = STATE.cachedData.workOrders.filter(w => w.estaRetrasada).length;
    const badgeDelayed = document.getElementById('badge-delayed-count');
    if (badgeDelayed) {
      badgeDelayed.textContent = delayedCount;
      badgeDelayed.style.display = delayedCount > 0 ? 'inline-block' : 'none';
    }

    const lowStockCount = STATE.cachedData.inventory.filter(a => a.stock <= a.minStock).length;
    const badgeLowStock = document.getElementById('badge-low-stock');
    if (badgeLowStock) {
      badgeLowStock.textContent = lowStockCount;
      badgeLowStock.style.display = lowStockCount > 0 ? 'inline-block' : 'none';
    }

  } catch (err) {
    console.error('Error refreshing data:', err);
  }
}

function renderCurrentView() {
  renderView(STATE.currentView);
}

function renderView(viewName, params = {}) {
  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'work-orders':
      renderWorkOrdersView();
      break;
    case 'quotations':
      renderQuotationsView(params.workOrderId || STATE.selectedWorkOrderId);
      break;
    case 'commercial-close':
      renderCommercialCloseView(params.workOrderId || STATE.selectedWorkOrderId);
      break;
    case 'invoicing':
      renderInvoicingView();
      break;
    case 'finance':
      renderFinanceView();
      break;
    case 'inventory':
      renderInventoryView();
      break;
    case 'services':
      renderServicesView();
      break;
    case 'crm':
      renderCrmView();
      break;
    case 'users':
      renderUsersView();
      break;
  }
}

/* ==========================================================================
   VIEW 1: DASHBOARD
   ========================================================================== */
async function renderDashboard() {
  const wos = STATE.cachedData.workOrders;
  const activeWos = wos.filter(w => w.operationalStatus !== 'CERRADA' && w.operationalStatus !== 'CANCELADA');
  const delayedWos = wos.filter(w => w.estaRetrasada);
  const inRepairWos = wos.filter(w => w.operationalStatus === 'EN_REPARACION');

  // KPIs
  document.getElementById('kpi-active-wo').textContent = activeWos.length;
  document.getElementById('kpi-in-repair').textContent = inRepairWos.length;
  document.getElementById('kpi-delayed-wo').textContent = delayedWos.length;

  const lowStock = STATE.cachedData.inventory.filter(a => a.stock <= a.minStock);
  document.getElementById('kpi-low-stock-count').textContent = lowStock.length;

  // Receivables Balance
  const cxc = STATE.cachedData.receivables;
  const totalDue = cxc.reduce((acc, r) => acc + Number(r.balance || 0), 0);
  const openCxc = cxc.filter(r => r.status === 'OPEN' || r.status === 'PARTIAL');
  document.getElementById('kpi-receivables-balance').textContent = FORMAT.currency(totalDue);
  document.getElementById('kpi-open-cxc-count').textContent = openCxc.length;

  // Revenue this month from cash movements
  const cash = await API.getCashMovements();
  const netIncome = cash.reduce((acc, cm) => acc + (cm.type === 'INCOME' ? Number(cm.amount) : -Number(cm.amount)), 0);
  document.getElementById('kpi-revenue-month').textContent = FORMAT.currency(netIncome);

  // Invoicing pending count
  const pendingInvoices = await API.getPendingInvoicingQueue();
  const pendingCount = (pendingInvoices.data || []).length;
  document.getElementById('dash-pending-inv-badge').textContent = `${pendingCount} pendientes`;
  const navBadgeInv = document.getElementById('badge-pending-invoice');
  if (navBadgeInv) {
    navBadgeInv.textContent = pendingCount;
    navBadgeInv.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  // Recent Work Orders Table
  const tbody = document.getElementById('dashboard-recent-wo-table');
  if (!tbody) return;
  tbody.innerHTML = '';

  const recents = [...wos].slice(0, 5);
  if (recents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 24px;">No hay órdenes registradas.</td></tr>`;
    return;
  }

  recents.forEach(wo => {
    const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
    const vehicle = STATE.cachedData.vehicles.find(v => v.id === wo.vehicleId);
    const stConfig = ENUMS.OperationalStatus[wo.operationalStatus] || { label: wo.operationalStatus, badge: 'badge-neutral' };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="font-mono text-gold" style="font-weight: 700;">${wo.code}</span></td>
      <td><strong>${client ? client.name : 'Cliente'}</strong></td>
      <td>${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plates})` : 'Vehículo'}</td>
      <td><span class="badge ${stConfig.badge}">${stConfig.label}</span></td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${FORMAT.date(wo.estimatedDeliveryDate)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openWorkOrderDetail('${wo.id}')">Ver Detalle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   VIEW 2: WORK ORDERS (KANBAN & TABLE)
   ========================================================================== */
function renderWorkOrdersView() {
  const wos = STATE.cachedData.workOrders;
  const isTableView = document.getElementById('btn-view-table')?.classList.contains('active');

  const filterStatus = document.getElementById('filter-wo-status')?.value;
  const filterDelayed = document.getElementById('filter-wo-delayed')?.checked;
  const searchTerm = (document.getElementById('search-wo')?.value || '').toLowerCase();

  let filtered = wos.filter(w => {
    if (filterStatus && w.operationalStatus !== filterStatus) return false;
    if (filterDelayed && !w.estaRetrasada) return false;
    if (searchTerm) {
      const client = STATE.cachedData.clients.find(c => c.id === w.clientId);
      const vehicle = STATE.cachedData.vehicles.find(v => v.id === w.vehicleId);
      const matchCode = w.code.toLowerCase().includes(searchTerm);
      const matchDesc = w.failureDescription.toLowerCase().includes(searchTerm);
      const matchClient = client && client.name.toLowerCase().includes(searchTerm);
      const matchPlates = vehicle && vehicle.plates.toLowerCase().includes(searchTerm);
      if (!matchCode && !matchDesc && !matchClient && !matchPlates) return false;
    }
    return true;
  });

  if (isTableView) {
    document.getElementById('wo-kanban-container').style.display = 'none';
    document.getElementById('wo-table-container').style.display = 'block';
    renderWorkOrdersTable(filtered);
  } else {
    document.getElementById('wo-kanban-container').style.display = 'flex';
    document.getElementById('wo-table-container').style.display = 'none';
    renderWorkOrdersKanban(filtered);
  }
}

function renderWorkOrdersKanban(orders) {
  const container = document.getElementById('wo-kanban-container');
  if (!container) return;
  container.innerHTML = '';

  // 11 Strict Operational States
  const columns = [
    'RECIBIDA',
    'EN_DIAGNOSTICO',
    'EN_ESPERA_COTIZACION',
    'EN_ESPERA_APROBACION',
    'EN_REPARACION',
    'CONTROL_CALIDAD',
    'LISTA_PARA_ENTREGA',
    'ENTREGADA',
    'CERRADA'
  ];

  columns.forEach(stKey => {
    const colOrders = orders.filter(o => o.operationalStatus === stKey);
    const meta = ENUMS.OperationalStatus[stKey] || { label: stKey };

    const col = document.createElement('div');
    col.className = 'kanban-col';
    col.innerHTML = `
      <div class="kanban-col-header">
        <div class="kanban-col-title">
          <span>${meta.label}</span>
          <span class="kanban-col-count">${colOrders.length}</span>
        </div>
      </div>
      <div class="kanban-cards-wrap" id="kanban-col-${stKey}"></div>
    `;

    const cardsWrap = col.querySelector('.kanban-cards-wrap');
    if (colOrders.length === 0) {
      cardsWrap.innerHTML = `<div style="text-align:center; padding: 24px 10px; color: var(--text-muted); font-size: 0.8rem;">Sin órdenes</div>`;
    } else {
      colOrders.forEach(wo => {
        const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
        const vehicle = STATE.cachedData.vehicles.find(v => v.id === wo.vehicleId);

        const card = document.createElement('div');
        card.className = `ot-card ${wo.estaRetrasada ? 'delayed' : ''}`;
        card.onclick = () => openWorkOrderDetail(wo.id);

        card.innerHTML = `
          <div class="ot-card-header">
            <span class="ot-code">${wo.code}</span>
            ${wo.estaRetrasada ? '<span class="badge badge-crimson pulsing">Retrasada</span>' : ''}
          </div>
          <div class="ot-client">${client ? client.name : 'Cliente'}</div>
          <div class="ot-vehicle">
            <span>🚗</span>
            <span>${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plates})` : 'Vehículo'}</span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${wo.failureDescription}
          </div>
          <div class="ot-footer">
            <span>⛽ ${wo.fuelLevel}%</span>
            <span>📅 ${FORMAT.date(wo.estimatedDeliveryDate)}</span>
          </div>
        `;
        cardsWrap.appendChild(card);
      });
    }
    container.appendChild(col);
  });
}

function renderWorkOrdersTable(orders) {
  const tbody = document.getElementById('wo-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding: 32px;">No se encontraron órdenes con los filtros seleccionados.</td></tr>`;
    return;
  }

  orders.forEach(wo => {
    const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
    const vehicle = STATE.cachedData.vehicles.find(v => v.id === wo.vehicleId);
    const op = ENUMS.OperationalStatus[wo.operationalStatus] || { label: wo.operationalStatus, badge: 'badge-neutral' };
    const com = ENUMS.CommercialStatus[wo.commercialStatus] || { label: wo.commercialStatus, badge: 'badge-neutral' };

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="font-mono text-gold" style="font-weight: 700;">${wo.code}</span></td>
      <td><strong>${client ? client.name : 'Cliente'}</strong></td>
      <td>${vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plates})` : 'Vehículo'}</td>
      <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${wo.failureDescription}</td>
      <td><span class="badge ${op.badge}">${op.label}</span></td>
      <td><span class="badge ${com.badge}">${com.label}</span></td>
      <td>${FORMAT.date(wo.estimatedDeliveryDate)}</td>
      <td>${wo.estaRetrasada ? '<span class="badge badge-crimson">Sí</span>' : '<span class="badge badge-neutral">No</span>'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openWorkOrderDetail('${wo.id}')">Detalle</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   WORK ORDER DETAIL (FSM PIPELINE, NOTES, PHOTOS, PORTAL)
   ========================================================================== */
async function openWorkOrderDetail(woId) {
  STATE.selectedWorkOrderId = woId;
  const wo = await API.getWorkOrder(woId);
  if (!wo) return;

  const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
  const vehicle = STATE.cachedData.vehicles.find(v => v.id === wo.vehicleId);

  document.getElementById('modal-wo-code').textContent = `${wo.code} — ${client ? client.name : ''}`;
  document.getElementById('modal-wo-subtitle').textContent = `Ingresada el ${FORMAT.dateTime(wo.entryDate)}`;

  // Delayed toggle button state
  const btnDelayed = document.getElementById('btn-toggle-wo-delayed');
  if (btnDelayed) {
    btnDelayed.textContent = wo.estaRetrasada ? 'Quitar Marca de Retraso' : 'Marcar como Retrasada';
    btnDelayed.className = wo.estaRetrasada ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm';
    btnDelayed.onclick = async () => {
      await API.toggleDelayed(wo.id, !wo.estaRetrasada);
      STATE.showToast('info', 'Retraso', `Orden ${wo.code} ${!wo.estaRetrasada ? 'marcada como retrasada' : 'desmarcada'}`);
      await refreshAllData();
      openWorkOrderDetail(wo.id);
    };
  }

  // FSM Pipeline Stepper
  renderFsmStepper(wo);

  // Info Tab
  document.getElementById('modal-wo-client-name').textContent = client ? client.name : '—';
  document.getElementById('modal-wo-vehicle-desc').textContent = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : '—';
  document.getElementById('modal-wo-plates').textContent = vehicle ? vehicle.plates : '—';
  document.getElementById('modal-wo-mileage').textContent = wo.initialMileage || 0;
  document.getElementById('modal-wo-fuel').textContent = wo.fuelLevel || 50;
  document.getElementById('modal-wo-failure-desc').textContent = wo.failureDescription;
  document.getElementById('modal-wo-personal-items').textContent = wo.checklist?.personalItems || 'Ninguna declarada';

  // Checklist Summary
  const chkWrap = document.getElementById('modal-wo-checklist-summary');
  if (chkWrap && wo.checklist) {
    chkWrap.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
        <span class="badge ${wo.checklist.hasKeys ? 'badge-emerald' : 'badge-neutral'}">Llaves: ${wo.checklist.hasKeys ? 'Sí' : 'No'}</span>
        <span class="badge ${wo.checklist.hasSpareTire ? 'badge-emerald' : 'badge-neutral'}">Llanta Refacción: ${wo.checklist.hasSpareTire ? 'Sí' : 'No'}</span>
        <span class="badge ${wo.checklist.hasJack ? 'badge-emerald' : 'badge-neutral'}">Gato: ${wo.checklist.hasJack ? 'Sí' : 'No'}</span>
        <span class="badge ${wo.checklist.hasTools ? 'badge-emerald' : 'badge-neutral'}">Herramientas: ${wo.checklist.hasTools ? 'Sí' : 'No'}</span>
        <span class="badge ${wo.checklist.hasFireExtinguisher ? 'badge-emerald' : 'badge-neutral'}">Extintor: ${wo.checklist.hasFireExtinguisher ? 'Sí' : 'No'}</span>
      </div>
    `;
  }

  // Notes Tab
  renderNotesFeed(wo.notes || []);

  // Photos Tab
  renderPhotosGrid(wo.photos || []);

  // Portal Tab
  document.getElementById('modal-portal-token-val').textContent = wo.portalToken || 'portal-uuid-sample';
  document.getElementById('btn-copy-portal-token').onclick = () => {
    const portalUrl = `${window.location.origin}/portal?token=${wo.portalToken}`;
    navigator.clipboard?.writeText(portalUrl);
    STATE.showToast('success', 'Enlace Copiado', 'Enlace de portal para el cliente copiado al portapapeles');
  };

  STATE.openModal('modal-wo-detail');
}

function renderFsmStepper(wo) {
  const stepper = document.getElementById('modal-fsm-stepper');
  if (!stepper) return;
  stepper.innerHTML = '';

  const states = [
    'RECIBIDA',
    'EN_DIAGNOSTICO',
    'EN_ESPERA_COTIZACION',
    'EN_ESPERA_APROBACION',
    'EN_REPARACION',
    'CONTROL_CALIDAD',
    'LISTA_PARA_ENTREGA',
    'ENTREGADA',
    'CERRADA'
  ];

  const currentIdx = states.indexOf(wo.operationalStatus);

  states.forEach((st, idx) => {
    const meta = ENUMS.OperationalStatus[st] || { label: st };
    const stepEl = document.createElement('div');
    const isCompleted = currentIdx > idx;
    const isCurrent = currentIdx === idx;

    stepEl.className = `fsm-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`;
    stepEl.innerHTML = `
      <span class="fsm-dot"></span>
      <span>${meta.label}</span>
    `;
    stepper.appendChild(stepEl);

    if (idx < states.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'fsm-arrow';
      arrow.textContent = '→';
      stepper.appendChild(arrow);
    }
  });

  document.getElementById('modal-wo-current-status-lbl').textContent = ENUMS.OperationalStatus[wo.operationalStatus]?.label || wo.operationalStatus;

  // Next allowed transitions (FSM rules)
  const selectNext = document.getElementById('select-next-status');
  selectNext.innerHTML = '';

  const allowedTransitions = getAllowedTransitions(wo.operationalStatus);
  allowedTransitions.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st;
    opt.textContent = ENUMS.OperationalStatus[st]?.label || st;
    selectNext.appendChild(opt);
  });

  const btnAdvance = document.getElementById('btn-advance-status');
  btnAdvance.onclick = async () => {
    const nextSt = selectNext.value;
    if (!nextSt) return;
    try {
      await API.changeOperationalStatus(wo.id, nextSt);
      STATE.showToast('success', 'FSM Avanzada', `Estado operativo cambiado a ${ENUMS.OperationalStatus[nextSt]?.label || nextSt}`);
      await refreshAllData();
      openWorkOrderDetail(wo.id);
    } catch (e) {
      STATE.showToast('error', 'Error FSM', e.message);
    }
  };
}

function getAllowedTransitions(current) {
  const fsmMap = {
    RECIBIDA: ['EN_DIAGNOSTICO', 'CANCELADA'],
    EN_DIAGNOSTICO: ['EN_ESPERA_COTIZACION', 'CANCELADA'],
    EN_ESPERA_COTIZACION: ['EN_ESPERA_APROBACION', 'CANCELADA'],
    EN_ESPERA_APROBACION: ['EN_REPARACION', 'EN_ESPERA_COTIZACION', 'CANCELADA'],
    EN_REPARACION: ['CONTROL_CALIDAD', 'CANCELADA'],
    CONTROL_CALIDAD: ['LISTA_PARA_ENTREGA', 'EN_REPARACION'],
    LISTA_PARA_ENTREGA: ['ENTREGADA'],
    ENTREGADA: ['CERRADA', 'EN_GARANTIA'],
    EN_GARANTIA: ['EN_REPARACION'],
    CERRADA: [],
    CANCELADA: []
  };
  return fsmMap[current] || [];
}

function renderNotesFeed(notes) {
  const feed = document.getElementById('modal-wo-notes-feed');
  if (!feed) return;
  feed.innerHTML = '';

  if (notes.length === 0) {
    feed.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 18px;">Sin notas registradas.</div>`;
    return;
  }

  notes.forEach(n => {
    const bubble = document.createElement('div');
    bubble.className = `note-bubble ${n.isClientVisible ? 'client-visible' : 'internal'}`;
    bubble.innerHTML = `
      <div class="note-meta">
        <strong>${n.authorName || 'Personal del Taller'}</strong>
        <span>
          <span class="badge ${n.isClientVisible ? 'badge-emerald' : 'badge-gold'}" style="margin-right: 8px;">
            ${n.isClientVisible ? 'Visible al Cliente' : 'Nota Interna'}
          </span>
          ${FORMAT.dateTime(n.createdAt)}
        </span>
      </div>
      <div style="font-size: 0.88rem; color: #fff; margin-top: 4px;">
        ${n.content}
      </div>
    `;
    feed.appendChild(bubble);
  });
}

function renderPhotosGrid(photos) {
  const grid = document.getElementById('modal-wo-photos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  if (photos.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px;">Sin fotografías cargadas.</div>`;
    return;
  }

  photos.forEach(p => {
    const card = document.createElement('div');
    card.className = 'photo-thumb-card';
    card.innerHTML = `
      <img src="${p.url}" class="photo-thumb-img" alt="${p.caption || 'Foto OT'}">
      <span class="photo-badge-category">${p.category}</span>
      <div style="padding: 6px 10px; font-size: 0.72rem; color: var(--text-secondary); background: var(--bg-surface-elevated);">
        ${p.caption || 'Sin descripción'}
      </div>
    `;
    grid.appendChild(card);
  });
}

/* ==========================================================================
   VIEW 3: QUOTATIONS (PARTIDAS, PRICE OVERRIDE, APPROVAL)
   ========================================================================== */
async function renderQuotationsView(selectedWoId) {
  const select = document.getElementById('select-quote-wo');
  select.innerHTML = '<option value="">-- Seleccionar Orden de Trabajo --</option>';

  const wos = STATE.cachedData.workOrders;
  wos.forEach(wo => {
    const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
    const opt = document.createElement('option');
    opt.value = wo.id;
    opt.textContent = `${wo.code} — ${client ? client.name : 'Cliente'}`;
    if (wo.id === selectedWoId) opt.selected = true;
    select.appendChild(opt);
  });

  const activeId = selectedWoId || select.value;
  if (!activeId) {
    document.getElementById('quotation-detail-wrap').style.opacity = '0.4';
    document.getElementById('quote-header-info').textContent = 'Seleccione una orden de la lista superior';
    return;
  }

  STATE.selectedWorkOrderId = activeId;
  document.getElementById('quotation-detail-wrap').style.opacity = '1';

  const wo = wos.find(w => w.id === activeId);
  const client = STATE.cachedData.clients.find(c => c.id === wo?.clientId);
  const vehicle = STATE.cachedData.vehicles.find(v => v.id === wo?.vehicleId);

  document.getElementById('quote-header-info').textContent = `${wo.code} · ${client?.name || 'Cliente'} · ${vehicle?.brand || ''} ${vehicle?.model || ''} (${vehicle?.plates || ''})`;

  // Fetch quotation
  const quote = await API.getQuotation(activeId);
  renderQuotationLines(quote);
}

function renderQuotationLines(quote) {
  const tbody = document.getElementById('quote-lines-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const badgeApp = document.getElementById('quote-approval-badge');
  badgeApp.textContent = quote.clientApprovalStatus || 'PENDING';
  badgeApp.className = `badge ${quote.clientApprovalStatus === 'APROBADA_TOTAL' ? 'badge-emerald' : quote.clientApprovalStatus === 'APROBADA_PARCIAL' ? 'badge-gold' : 'badge-neutral'}`;

  // Update summary totals
  document.getElementById('lbl-quote-subtotal').textContent = FORMAT.currency(quote.subtotal);
  document.getElementById('lbl-quote-discount').textContent = `-${FORMAT.currency(quote.discountAmount)}`;
  document.getElementById('lbl-quote-taxbase').textContent = FORMAT.currency(quote.subtotal - quote.discountAmount);
  document.getElementById('lbl-quote-iva').textContent = FORMAT.currency(quote.taxAmount);
  document.getElementById('lbl-quote-total').textContent = FORMAT.currency(quote.total);

  // Discount Inputs
  document.getElementById('quote-discount-type').value = quote.discountType || 'PERCENT';
  document.getElementById('quote-discount-val').value = quote.discountValue || 0;
  document.getElementById('quote-apply-iva').checked = quote.aplicaIva !== false;

  if (!quote.lines || quote.lines.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 32px;">No hay partidas presupuestadas en esta orden.</td></tr>`;
    return;
  }

  quote.lines.forEach(l => {
    const isOverridden = l.priceOverrideReason;
    const approvalClass = l.approvalStatus === 'APPROVED' ? 'badge-emerald' : l.approvalStatus === 'REJECTED' ? 'badge-crimson' : 'badge-neutral';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge ${l.lineType === 'SERVICE' ? 'badge-sapphire' : 'badge-purple'}">${l.lineType === 'SERVICE' ? 'Mano de Obra' : 'Refacción'}</span></td>
      <td>
        <strong>${l.concept}</strong>
        ${isOverridden ? `<div style="font-size: 0.72rem; color: var(--gold-400);">Override: "${l.priceOverrideReason}"</div>` : ''}
      </td>
      <td class="font-mono">${l.quantity}</td>
      <td class="font-mono">${FORMAT.currency(l.unitPrice)}</td>
      <td class="font-mono text-gold" style="font-weight: 700;">${FORMAT.currency(l.finalPrice)}</td>
      <td><span class="badge ${approvalClass}">${l.approvalStatus || 'PENDING'}</span></td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="openPriceOverrideModal('${l.id}', '${l.finalPrice}')" title="Ajuste de precio manual con motivo">Override</button>
          <button class="btn btn-danger btn-sm" onclick="removeQuoteLine('${quote.workOrderId}', '${l.id}')">✕</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openPriceOverrideModal(lineId, currentPrice) {
  document.getElementById('override-line-id').value = lineId;
  document.getElementById('override-price-val').value = currentPrice;
  document.getElementById('override-reason').value = '';
  STATE.openModal('modal-price-override');
}

async function removeQuoteLine(woId, lineId) {
  if (!confirm('¿Desea eliminar esta partida de la cotización?')) return;
  await API.removeQuotationLine(woId, lineId);
  STATE.showToast('info', 'Partida Eliminada', 'Línea removida y totales recalculados');
  renderQuotationsView(woId);
}

/* ==========================================================================
   VIEW 4: COMMERCIAL CLOSE
   ========================================================================== */
async function renderCommercialCloseView(selectedWoId) {
  const select = document.getElementById('select-close-wo');
  select.innerHTML = '<option value="">-- Seleccionar Orden Terminada --</option>';

  const wos = STATE.cachedData.workOrders;
  wos.forEach(wo => {
    const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
    const opt = document.createElement('option');
    opt.value = wo.id;
    opt.textContent = `${wo.code} — ${client ? client.name : 'Cliente'} (${ENUMS.OperationalStatus[wo.operationalStatus]?.label || wo.operationalStatus})`;
    if (wo.id === selectedWoId) opt.selected = true;
    select.appendChild(opt);
  });

  const activeId = selectedWoId || select.value;
  if (!activeId) return;

  const quote = await API.getQuotation(activeId);
  const paySummary = await API.getPaymentSummary(activeId);

  document.getElementById('close-frozen-preview').textContent = FORMAT.currency(quote.total);
  document.getElementById('close-advances-preview').textContent = FORMAT.currency(paySummary.totalPaid);
  document.getElementById('close-balance-preview').textContent = FORMAT.currency(Math.max(0, quote.total - paySummary.totalPaid));
}

/* ==========================================================================
   VIEW 5: INVOICING (FACTURACIÓN SAT)
   ========================================================================== */
async function renderInvoicingView() {
  // 1. Pending Queue
  const pendingRes = await API.getPendingInvoicingQueue();
  const pendingTbody = document.getElementById('invoicing-pending-body');
  pendingTbody.innerHTML = '';

  const pendingList = pendingRes.data || [];
  if (pendingList.length === 0) {
    pendingTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 32px;">No hay órdenes pendientes de facturación.</td></tr>`;
  } else {
    pendingList.forEach(item => {
      const isReady = item.billingStatus === 'LISTA_PARA_FACTURAR';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="font-mono text-gold">${item.workOrderCode}</strong></td>
        <td>${item.clientName}</td>
        <td><span class="badge ${isReady ? 'badge-sapphire' : 'badge-crimson'}">${isReady ? 'Lista p/ Facturar' : 'Faltan Datos'}</span></td>
        <td style="font-size: 0.8rem;">
          ${item.missingFields.length > 0 ? `<span class="text-crimson">⚠️ Faltan: ${item.missingFields.join(', ')}</span>` : '<span class="text-emerald">✓ Datos SAT Validados</span>'}
        </td>
        <td class="font-mono">${FORMAT.currency(item.totalAmount)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="openFiscalDataModal('${item.workOrderId}')">Capturar RFC</button>
            <button class="btn btn-primary btn-sm" ${!isReady ? 'disabled' : ''} onclick="openEmitInvoiceModal('${item.workOrderId}')">Emitir CFDI</button>
          </div>
        </td>
      `;
      pendingTbody.appendChild(tr);
    });
  }

  // 2. Emitted Invoices
  const invoicesRes = await API.getInvoices();
  const historyTbody = document.getElementById('invoicing-history-body');
  historyTbody.innerHTML = '';

  const invoices = invoicesRes.data || [];
  if (invoices.length === 0) {
    historyTbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: var(--text-muted); padding: 32px;">No se han emitido facturas aún.</td></tr>`;
  } else {
    invoices.forEach(inv => {
      const isIssued = inv.status === 'ISSUED';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="font-mono text-gold">${inv.invoiceNumber}</strong></td>
        <td style="font-size: 0.78rem;">${FORMAT.date(inv.createdAt)}</td>
        <td class="font-mono">${inv.receiverRfc}</td>
        <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${inv.receiverName}</td>
        <td class="font-mono">${FORMAT.currency(inv.subtotal)}</td>
        <td class="font-mono">${FORMAT.currency(inv.taxAmount)}</td>
        <td class="font-mono text-gold" style="font-weight: 700;">${FORMAT.currency(inv.total)}</td>
        <td><span class="badge ${isIssued ? 'badge-emerald' : 'badge-crimson'}">${isIssued ? 'Emitida' : 'Cancelada'}</span></td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-secondary btn-sm" onclick="viewDigitalInvoice('${inv.id}')">Ver CFDI</button>
            ${isIssued ? `<button class="btn btn-danger btn-sm" onclick="openCancelInvoiceModal('${inv.id}')">Cancelar</button>` : ''}
          </div>
        </td>
      `;
      historyTbody.appendChild(tr);
    });
  }
}

function openFiscalDataModal(woId) {
  document.getElementById('fiscal-wo-id').value = woId;
  const wo = STATE.cachedData.workOrders.find(w => w.id === woId);
  const client = wo ? STATE.cachedData.clients.find(c => c.id === wo.clientId) : null;

  document.getElementById('fiscal-rfc').value = client?.rfc || '';
  document.getElementById('fiscal-name').value = client?.businessName || client?.name || '';
  document.getElementById('fiscal-zip').value = client?.zipCode || '';
  document.getElementById('fiscal-regime').value = client?.taxRegime || '612';
  document.getElementById('fiscal-use').value = client?.cfdiUse || 'G03';

  STATE.openModal('modal-fiscal-data');
}

function openEmitInvoiceModal(woId) {
  document.getElementById('emit-wo-id').value = woId;
  STATE.openModal('modal-emit-invoice');
}

async function viewDigitalInvoice(invoiceId) {
  const invRes = await API.getInvoices();
  const inv = (invRes.data || []).find(i => i.id === invoiceId);
  if (!inv) return;

  const card = document.getElementById('cfdi-card-content');
  card.innerHTML = `
    <div class="cfdi-header">
      <div>
        <div class="cfdi-title">TALLER AUTOMOTRIZ DE SERVICIO S.A. DE C.V.</div>
        <div style="font-size: 0.85rem; color: #475569;">RFC: TAS2001019X0 · Matriz Centro Automotriz</div>
        <div style="font-size: 0.8rem; color: #475569;">Régimen: 601 - General de Ley Personas Morales</div>
      </div>
      <div style="text-align: right;">
        <div class="font-mono" style="font-size: 1.3rem; font-weight: 800; color: #b45309;">${inv.invoiceNumber}</div>
        <div style="font-size: 0.78rem; color: #64748b;">Estatus: <strong>${inv.status === 'ISSUED' ? 'VIGENTE' : 'CANCELADA'}</strong></div>
        <div style="font-size: 0.78rem; color: #64748b;">Fecha: ${FORMAT.dateTime(inv.createdAt)}</div>
      </div>
    </div>

    <div class="cfdi-box">
      <strong>DATOS DEL RECEPTOR (CLIENTE)</strong>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
        <div><strong>Razón Social:</strong> ${inv.receiverName}</div>
        <div><strong>RFC:</strong> <span class="font-mono">${inv.receiverRfc}</span></div>
        <div><strong>Código Postal:</strong> ${inv.receiverZipCode}</div>
        <div><strong>Régimen Fiscal SAT:</strong> ${inv.receiverTaxRegime}</div>
        <div><strong>Uso CFDI:</strong> ${inv.cfdiUse}</div>
        <div><strong>Forma de Pago:</strong> ${inv.paymentFormSat} (${inv.paymentMethodSat})</div>
      </div>
    </div>

    <table class="cfdi-table">
      <thead>
        <tr>
          <th>Clave SAT</th>
          <th>Descripción</th>
          <th>Cant.</th>
          <th>P. Unitario</th>
          <th>Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="font-mono">78181500</td>
          <td>Servicio de mantenimiento y reparación automotriz</td>
          <td>1</td>
          <td class="font-mono">${FORMAT.currency(inv.subtotal)}</td>
          <td class="font-mono">${FORMAT.currency(inv.subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 20px;">
      <div style="width: 280px; font-size: 0.9rem; line-height: 1.8;">
        <div style="display: flex; justify-content: space-between;">
          <span>Subtotal:</span>
          <span class="font-mono">${FORMAT.currency(inv.subtotal)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>Descuento:</span>
          <span class="font-mono">-${FORMAT.currency(inv.discountAmount || 0)}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>IVA 16%:</span>
          <span class="font-mono">${FORMAT.currency(inv.taxAmount)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 1.1rem; border-top: 1px solid #0f172a; padding-top: 4px;">
          <span>TOTAL:</span>
          <span class="font-mono" style="color: #b45309;">${FORMAT.currency(inv.total)}</span>
        </div>
      </div>
    </div>

    <div style="border-top: 1px dashed #cbd5e1; padding-top: 14px; font-size: 0.72rem; color: #64748b;">
      <div><strong>Folio Fiscal (UUID SAT Simulado):</strong> <span class="font-mono">${inv.uuid || '6fa459ea-ee7e-11ea-adc1-0242ac120002'}</span></div>
      <div style="margin-top: 4px;" class="cfdi-stamp">Sello Digital: FE+a78G91hA0kLLx99aV029mZ8B0192laK0192kAaB881+1928019a==</div>
    </div>
  `;

  STATE.openModal('modal-invoice-viewer');
}

function openCancelInvoiceModal(invoiceId) {
  document.getElementById('cancel-inv-id').value = invoiceId;
  STATE.openModal('modal-cancel-invoice');
}

/* ==========================================================================
   VIEW 6: FINANCE (RECEIVABLES, CASH, REPORT)
   ========================================================================== */
async function renderFinanceView() {
  // 1. Receivables
  const rTbody = document.getElementById('receivables-table-body');
  rTbody.innerHTML = '';

  const cxc = await API.getReceivables();
  const list = cxc.data || [];
  if (list.length === 0) {
    rTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 32px;">No hay cuentas por cobrar registradas.</td></tr>`;
  } else {
    list.forEach(r => {
      const isPaid = r.balance <= 0 || r.status === 'PAID';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="font-mono text-gold">${r.workOrderCode}</strong></td>
        <td>${r.clientName}</td>
        <td class="font-mono">${FORMAT.currency(r.originalAmount)}</td>
        <td class="font-mono text-emerald">${FORMAT.currency(r.paidAmount)}</td>
        <td class="font-mono text-gold" style="font-weight: 700;">${FORMAT.currency(r.balance)}</td>
        <td><span class="badge ${isPaid ? 'badge-emerald' : 'badge-gold'}">${isPaid ? 'Pagada' : 'Saldo Pendiente'}</span></td>
        <td>
          ${!isPaid ? `<button class="btn btn-primary btn-sm" onclick="openPaymentModalForWo('${r.workOrderId}', '${r.balance}')">Abonar / Liquidar</button>` : '<span class="text-emerald">✓ Liquidado</span>'}
        </td>
      `;
      rTbody.appendChild(tr);
    });
  }

  // 2. Cash Movements
  const cmTbody = document.getElementById('cash-movements-table-body');
  cmTbody.innerHTML = '';
  const cms = await API.getCashMovements();
  if (cms.length === 0) {
    cmTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted); padding: 32px;">Sin movimientos de caja.</td></tr>`;
  } else {
    cms.forEach(cm => {
      const isIncome = cm.type === 'INCOME';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-size: 0.8rem;">${FORMAT.dateTime(cm.createdAt)}</td>
        <td><span class="badge ${isIncome ? 'badge-emerald' : 'badge-crimson'}">${isIncome ? 'Ingreso (+)' : 'Egreso / Gasto (-)'}</span></td>
        <td>${cm.concept}</td>
        <td class="font-mono ${isIncome ? 'text-emerald' : 'text-crimson'}" style="font-weight: 700;">
          ${isIncome ? '+' : '-'}${FORMAT.currency(cm.amount)}
        </td>
      `;
      cmTbody.appendChild(tr);
    });
  }

  // 3. Consolidated Report
  const rpt = await API.getFinancialReport();
  document.getElementById('rpt-gross-sales').textContent = FORMAT.currency(rpt.grossSales);
  document.getElementById('rpt-discounts').textContent = `-${FORMAT.currency(rpt.totalDiscounts)}`;
  document.getElementById('rpt-iva').textContent = FORMAT.currency(rpt.totalIva);
  document.getElementById('rpt-commissions').textContent = `-${FORMAT.currency(rpt.totalCommissions)}`;
  document.getElementById('rpt-net-flow').textContent = FORMAT.currency(rpt.netCashFlow);
}

function openPaymentModalForWo(woId, balance) {
  document.getElementById('pay-select-wo').value = woId;
  document.getElementById('pay-pending-balance').textContent = FORMAT.currency(balance);
  document.getElementById('pay-amount').value = balance;
  STATE.openModal('modal-new-payment');
}

/* ==========================================================================
   VIEW 7: INVENTORY, TOOLS, CUSTODY, SUPPLIERS
   ========================================================================== */
async function renderInventoryView() {
  // Articles
  const aTbody = document.getElementById('inventory-articles-body');
  aTbody.innerHTML = '';
  const articles = STATE.cachedData.inventory;
  articles.forEach(a => {
    const isLow = a.stock <= a.minStock;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="font-mono text-gold">${a.code}</span></td>
      <td><strong>${a.name}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${a.description || ''}</span></td>
      <td><span class="badge ${a.articleType === 'PARTE_EN_VENTA' ? 'badge-sapphire' : 'badge-neutral'}">${a.articleType === 'PARTE_EN_VENTA' ? 'En Venta' : 'Consumible'}</span></td>
      <td>${a.brand}</td>
      <td class="font-mono">${FORMAT.currency(a.costPrice)}</td>
      <td class="font-mono text-emerald" style="font-weight: 700;">${FORMAT.currency(a.salePrice)}</td>
      <td class="font-mono ${isLow ? 'text-crimson' : ''}" style="font-weight: 700;">${a.stock} ${a.unit}</td>
      <td class="font-mono">${a.minStock}</td>
      <td><span class="badge ${isLow ? 'badge-crimson pulsing' : 'badge-emerald'}">${isLow ? 'Stock Bajo' : 'Normal'}</span></td>
    `;
    aTbody.appendChild(tr);
  });

  // Tools
  const tools = await API.getTools();
  const tTbody = document.getElementById('tools-table-body');
  tTbody.innerHTML = '';
  (tools.data || []).forEach(t => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${t.name}</strong></td>
      <td class="font-mono text-gold">${t.serialNumber}</td>
      <td>${t.brand} ${t.model || ''}</td>
      <td><span class="badge badge-sapphire">${t.condition}</span></td>
      <td><span class="badge ${t.status === 'DISPONIBLE' ? 'badge-emerald' : 'badge-gold'}">${t.status}</span></td>
      <td>${t.location || 'Taller'}</td>
    `;
    tTbody.appendChild(tr);
  });

  // Custody
  const custody = await API.getCustodyItems();
  const cTbody = document.getElementById('custody-table-body');
  cTbody.innerHTML = '';
  (custody.data || []).forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="font-mono text-gold">${c.workOrderId}</span></td>
      <td>${c.description}</td>
      <td>${c.quantity}</td>
      <td>${c.condition}</td>
      <td>${c.location}</td>
      <td><span class="badge ${c.isReturned ? 'badge-neutral' : 'badge-gold'}">${c.isReturned ? 'Devuelta' : 'En Resguardo'}</span></td>
      <td>
        ${!c.isReturned ? `<button class="btn btn-secondary btn-sm" onclick="returnCustodyItem('${c.id}')">Devolver a Cliente</button>` : '—'}
      </td>
    `;
    cTbody.appendChild(tr);
  });

  // Suppliers
  const sups = await API.getSuppliers();
  const sTbody = document.getElementById('suppliers-table-body');
  sTbody.innerHTML = '';
  (sups.data || []).forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.name}</strong></td>
      <td>${s.contactName || '—'}</td>
      <td>${s.phone || '—'}</td>
      <td>${s.email || '—'}</td>
      <td class="font-mono">${s.rfc || '—'}</td>
      <td style="font-size: 0.8rem; color: var(--text-secondary);">${s.notes || ''}</td>
    `;
    sTbody.appendChild(tr);
  });
}

async function returnCustodyItem(id) {
  await API.markCustodyReturned(id);
  STATE.showToast('success', 'Custodia', 'Pieza marcada como devuelta al cliente');
  renderInventoryView();
}

/* ==========================================================================
   VIEW 8: SERVICES & PRICES
   ========================================================================== */
function renderServicesView() {
  const tbody = document.getElementById('services-table-body');
  tbody.innerHTML = '';
  const services = STATE.cachedData.services;

  services.forEach(s => {
    const autoPrice = s.prices?.find(p => p.vehicleType === 'AUTO')?.price || s.basePrice;
    const camionetaPrice = s.prices?.find(p => p.vehicleType === 'CAMIONETA')?.price || (Number(s.basePrice) * 1.25).toFixed(2);
    const camionPrice = s.prices?.find(p => p.vehicleType === 'CAMION')?.price || (Number(s.basePrice) * 1.6).toFixed(2);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="font-mono text-gold" style="font-weight: 700;">${s.code}</span></td>
      <td><strong>${s.concept}</strong><br><span style="font-size: 0.75rem; color: var(--text-muted);">${s.notes || ''}</span></td>
      <td><span class="badge badge-sapphire">${ENUMS.ServiceCategory[s.category] || s.category}</span></td>
      <td class="font-mono">${s.estimatedMinutes} min</td>
      <td class="font-mono">${FORMAT.currency(autoPrice)}</td>
      <td class="font-mono">${FORMAT.currency(camionetaPrice)}</td>
      <td class="font-mono text-gold" style="font-weight: 700;">${FORMAT.currency(camionPrice)}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="alert('Código de servicio: ' + '${s.code}')">Editar</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   VIEW 9: CRM (CLIENTS & VEHICLES)
   ========================================================================== */
function renderCrmView() {
  // Clients
  const cTbody = document.getElementById('clients-table-body');
  cTbody.innerHTML = '';
  const clients = STATE.cachedData.clients;

  clients.forEach(c => {
    const segmentBadge = c.segment === 'VIP' ? 'badge-gold' : c.segment === 'FRECUENTE' ? 'badge-emerald' : 'badge-neutral';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${c.name}</strong></td>
      <td><span class="badge badge-neutral">${c.clientType === 'FISICA' ? 'Persona Física' : 'Persona Moral'}</span></td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td><span class="badge ${segmentBadge}">${c.segment || 'NUEVO'}</span></td>
      <td><span class="badge ${c.hasDebt ? 'badge-crimson' : 'badge-emerald'}">${c.hasDebt ? 'Con Deuda' : 'Al Corriente'}</span></td>
      <td class="font-mono">${c.rfc || '—'}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="recalcClientTag('${c.id}')" title="Recalcular etiqueta y deuda">Recalcular Tag</button>
      </td>
    `;
    cTbody.appendChild(tr);
  });

  // Vehicles
  const vTbody = document.getElementById('vehicles-table-body');
  vTbody.innerHTML = '';
  const vehicles = STATE.cachedData.vehicles;

  vehicles.forEach(v => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong class="font-mono text-gold">${v.plates}</strong></td>
      <td>${v.brand} ${v.model}</td>
      <td class="font-mono">${v.year}</td>
      <td class="font-mono" style="font-size: 0.78rem;">${v.vin || '—'}</td>
      <td><span class="badge badge-sapphire">${ENUMS.VehicleType[v.vehicleType] || v.vehicleType}</span></td>
      <td>${v.color || '—'}</td>
      <td class="font-mono">${v.currentMileage || 0} km</td>
    `;
    vTbody.appendChild(tr);
  });
}

async function recalcClientTag(id) {
  await API.recalculateTag(id);
  STATE.showToast('success', 'Segmentación', 'Etiqueta de cliente recalculada con éxito');
  await refreshAllData();
  renderCrmView();
}

/* ==========================================================================
   VIEW 10: USERS & PERMISSIONS (IAM)
   ========================================================================== */
async function renderUsersView() {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';
  const res = await API.getUsers();
  const users = res.data || [];

  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${u.firstName || ''} ${u.lastName || ''}</strong></td>
      <td>${u.email}</td>
      <td><span class="badge ${u.role === 'ADMIN' ? 'badge-gold' : 'badge-sapphire'}">${u.role}</span></td>
      <td>${u.kpiTitle || '—'}</td>
      <td><span class="badge ${u.isActive ? 'badge-emerald' : 'badge-crimson'}">${u.isActive ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="alert('Permisos de ${u.email}: ' + JSON.stringify('${u.permissions}'))">Permisos</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ==========================================================================
   MODAL WIRING & FORM SUBMISSIONS
   ========================================================================== */
function setupModals() {
  // Populate Catalogs in select dropdowns
  populateCatalogs();

  // Fuel Slider in Reception
  const fuelSlider = document.getElementById('new-wo-fuel-slider');
  const fuelVal = document.getElementById('fuel-display-val');
  const fuelBar = document.getElementById('fuel-gauge-bar');
  if (fuelSlider) {
    fuelSlider.addEventListener('input', () => {
      fuelVal.textContent = `${fuelSlider.value}%`;
      fuelBar.style.width = `${fuelSlider.value}%`;
    });
  }

  // Quick New WO Button
  document.getElementById('btn-quick-new-wo')?.addEventListener('click', () => {
    populateCatalogs();
    STATE.openModal('modal-new-work-order');
  });

  // Switch User / Connection Button
  document.getElementById('btn-switch-user')?.addEventListener('click', () => {
    const newRole = prompt('Selecciona rol para simular sesión (ADMIN, DIRECTOR, SERVICE_ADVISOR, TECHNICIAN):', 'ADMIN');
    if (newRole) {
      const u = mockDb.data.users[0];
      u.role = newRole.toUpperCase();
      STATE.user = u;
      updateUserBadge(u);
      STATE.showToast('info', 'Sesión Actualizada', `Ahora actuando como rol: ${newRole.toUpperCase()}`);
    }
  });

  // Connection status pill click
  document.getElementById('connection-status-pill')?.addEventListener('click', () => {
    document.getElementById('cfg-api-url').value = API.getBaseUrl();
    document.getElementById('cfg-connection-diagnostic').textContent = API.isLive ? '🟢 Backend respondiendo correctamente' : '🟡 Backend offline (Modo Demo Activo)';
    STATE.openModal('modal-api-config');
  });

  document.getElementById('btn-test-connection')?.addEventListener('click', async () => {
    const isOnline = await API.ping();
    document.getElementById('cfg-connection-diagnostic').textContent = isOnline ? '🟢 Conexión exitosa' : '🔴 No se pudo conectar al endpoint';
    updateConnectionPill(isOnline);
  });

  document.getElementById('btn-save-api-config')?.addEventListener('click', async () => {
    const newUrl = document.getElementById('cfg-api-url').value.trim();
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL_OVERRIDE, newUrl);
    STATE.showToast('success', 'Configuración', 'URL de API actualizada');
    STATE.closeModal('modal-api-config');
    await checkBackendStatus();
  });

  document.getElementById('btn-reset-mock-db')?.addEventListener('click', () => {
    if (confirm('¿Restablecer todos los datos demo a los valores iniciales?')) {
      mockDb.reset();
      window.location.reload();
    }
  });

  // New Work Order Submission
  document.getElementById('btn-submit-new-wo')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const clientId = document.getElementById('new-wo-client').value;
    const vehicleId = document.getElementById('new-wo-vehicle').value;
    const failureDescription = document.getElementById('new-wo-failure').value;
    const mileageIn = document.getElementById('new-wo-mileage').value;
    const fuelLevel = document.getElementById('new-wo-fuel-slider').value;
    const estimatedDelivery = document.getElementById('new-wo-delivery').value;

    if (!clientId || !vehicleId || !failureDescription) {
      STATE.showToast('warning', 'Campos Incompletos', 'Cliente, Vehículo y Falla son obligatorios');
      return;
    }

    const checklist = {
      hasKeys: document.getElementById('chk-keys').checked,
      hasSpareTire: document.getElementById('chk-spare').checked,
      hasJack: document.getElementById('chk-jack').checked,
      hasTools: document.getElementById('chk-tools').checked,
      hasFireExtinguisher: document.getElementById('chk-extinguisher').checked,
      personalItems: document.getElementById('new-wo-personal-items').value || ''
    };

    try {
      const newWo = await API.createWorkOrder({
        clientId,
        vehicleId,
        failureDescription,
        mileageIn,
        fuelLevel,
        estimatedDelivery,
        checklist
      });

      STATE.showToast('success', 'Orden Creada', `Orden ${newWo.code} registrada con checklist e inicialización de cotización`);
      STATE.closeModal('modal-new-work-order');
      await refreshAllData();
      renderWorkOrdersView();
    } catch (err) {
      STATE.showToast('error', 'Error al crear', err.message);
    }
  });

  // VIN Lookup Button
  document.getElementById('btn-lookup-vin')?.addEventListener('click', async () => {
    const vin = document.getElementById('veh-vin').value.trim();
    if (vin.length < 5) {
      STATE.showToast('warning', 'VIN Incompleto', 'Introduce al menos 5 caracteres del VIN');
      return;
    }
    const res = await API.lookupVin(vin);
    if (res) {
      document.getElementById('veh-brand').value = res.brand || '';
      document.getElementById('veh-model').value = res.model || '';
      document.getElementById('veh-year').value = res.year || 2022;
      document.getElementById('veh-type').value = res.vehicleType || 'AUTO';
      STATE.showToast('info', 'VIN Decodificado', `Vehículo detectado: ${res.brand} ${res.model}`);
    }
  });

  // New Client Submission
  document.getElementById('btn-submit-new-client')?.addEventListener('click', async () => {
    const name = document.getElementById('cli-name').value.trim();
    const phone = document.getElementById('cli-phone').value.trim();
    const email = document.getElementById('cli-email').value.trim();
    const clientType = document.getElementById('cli-type').value;
    const rfc = document.getElementById('cli-rfc').value.trim();

    if (!name || !phone) {
      STATE.showToast('warning', 'Campos Requeridos', 'Nombre y Teléfono son requeridos');
      return;
    }

    await API.createClient({ name, phone, email, clientType, rfc });
    STATE.showToast('success', 'Cliente Guardado', `${name} añadido al CRM`);
    STATE.closeModal('modal-new-client');
    await refreshAllData();
    populateCatalogs();
    renderCrmView();
  });

  // New Vehicle Submission
  document.getElementById('btn-submit-new-vehicle')?.addEventListener('click', async () => {
    const clientId = document.getElementById('veh-client-id').value;
    const plates = document.getElementById('veh-plates').value.trim();
    const vehicleType = document.getElementById('veh-type').value;
    const brand = document.getElementById('veh-brand').value.trim();
    const model = document.getElementById('veh-model').value.trim();
    const year = Number(document.getElementById('veh-year').value || 2022);
    const color = document.getElementById('veh-color').value.trim();
    const vin = document.getElementById('veh-vin').value.trim();

    if (!clientId || !plates) {
      STATE.showToast('warning', 'Campos Requeridos', 'Cliente y Placa son obligatorios');
      return;
    }

    await API.createVehicle({ clientId, plates, vehicleType, brand, model, year, color, vin });
    STATE.showToast('success', 'Vehículo Guardado', `Placa ${plates} registrada`);
    STATE.closeModal('modal-new-vehicle');
    await refreshAllData();
    populateCatalogs();
    renderCrmView();
  });

  // Quotation Line Modals
  document.getElementById('btn-add-service-line')?.addEventListener('click', () => {
    document.getElementById('modal-quote-line-title').textContent = 'Agregar Mano de Obra / Servicio';
    document.getElementById('quote-line-type').value = 'SERVICE';
    document.getElementById('group-quote-service').style.display = 'block';
    document.getElementById('group-quote-part').style.display = 'none';
    STATE.openModal('modal-add-quote-line');
  });

  document.getElementById('btn-add-part-line')?.addEventListener('click', () => {
    document.getElementById('modal-quote-line-title').textContent = 'Agregar Refacción del Inventario';
    document.getElementById('quote-line-type').value = 'PART';
    document.getElementById('group-quote-service').style.display = 'none';
    document.getElementById('group-quote-part').style.display = 'block';
    STATE.openModal('modal-add-quote-line');
  });

  document.getElementById('btn-submit-quote-line')?.addEventListener('click', async () => {
    const lineType = document.getElementById('quote-line-type').value;
    const serviceId = document.getElementById('quote-select-service').value;
    const articleId = document.getElementById('quote-select-part').value;
    const quantity = document.getElementById('quote-line-qty').value;
    const concept = document.getElementById('quote-line-concept').value;

    const woId = STATE.selectedWorkOrderId;
    if (!woId) return;

    await API.addQuotationLine(woId, { lineType, serviceId, articleId, quantity, concept });
    STATE.showToast('success', 'Partida Agregada', 'Se recalculó el subtotal de la cotización');
    STATE.closeModal('modal-add-quote-line');
    renderQuotationsView(woId);
  });

  // Price Override Submission
  document.getElementById('btn-submit-override')?.addEventListener('click', async () => {
    const lineId = document.getElementById('override-line-id').value;
    const price = document.getElementById('override-price-val').value;
    const reason = document.getElementById('override-reason').value.trim();

    if (!price || !reason) {
      STATE.showToast('warning', 'Justificación Obligatoria', 'El motivo de auditoría y precio son obligatorios (RF-20)');
      return;
    }

    const woId = STATE.selectedWorkOrderId;
    await API.overrideLinePrice(woId, lineId, price, reason);
    STATE.showToast('success', 'Precio Modificado', 'Ajuste auditado aplicado a la cotización');
    STATE.closeModal('modal-price-override');
    renderQuotationsView(woId);
  });

  // Save Quotation Global Discount
  document.getElementById('btn-save-quote-discount')?.addEventListener('click', async () => {
    const type = document.getElementById('quote-discount-type').value;
    const val = document.getElementById('quote-discount-val').value;
    const aplicaIva = document.getElementById('quote-apply-iva').checked;

    const woId = STATE.selectedWorkOrderId;
    await API.setQuotationDiscount(woId, type, val, aplicaIva);
    STATE.showToast('success', 'Descuento e IVA', 'Cálculos actualizados correctamente');
    renderQuotationsView(woId);
  });

  // Client Approval Modal
  document.getElementById('btn-open-approval-modal')?.addEventListener('click', async () => {
    const woId = STATE.selectedWorkOrderId;
    if (!woId) return;
    const quote = await API.getQuotation(woId);
    const tbody = document.getElementById('quote-approval-lines-body');
    tbody.innerHTML = '';

    quote.lines.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${l.concept}</strong> (${l.quantity})</td>
        <td class="font-mono">${FORMAT.currency(l.finalPrice)}</td>
        <td>
          <select class="select app-line-decision" data-line-id="${l.id}" style="width: 140px;">
            <option value="APPROVED" ${l.approvalStatus === 'APPROVED' ? 'selected' : ''}>Autorizar</option>
            <option value="REJECTED" ${l.approvalStatus === 'REJECTED' ? 'selected' : ''}>Rechazar</option>
          </select>
        </td>
        <td>
          <input type="text" class="input app-line-reason" data-line-id="${l.id}" placeholder="Motivo de rechazo..." value="${l.rejectionReason || ''}">
        </td>
      `;
      tbody.appendChild(tr);
    });

    STATE.openModal('modal-approve-quote');
  });

  document.getElementById('btn-submit-approval')?.addEventListener('click', async () => {
    const woId = STATE.selectedWorkOrderId;
    const decisions = [];
    document.querySelectorAll('.app-line-decision').forEach(sel => {
      const lineId = sel.getAttribute('data-line-id');
      const status = sel.value;
      const reasonInput = document.querySelector(`.app-line-reason[data-line-id="${lineId}"]`);
      decisions.push({
        lineId,
        status,
        rejectionReason: status === 'REJECTED' ? (reasonInput?.value || 'Rechazado por cliente') : null
      });
    });

    await API.approveQuotationLines(woId, decisions);
    STATE.showToast('success', 'Aprobación Registrada', 'Estatus comercial y partidas actualizadas');
    STATE.closeModal('modal-approve-quote');
    await refreshAllData();
    renderQuotationsView(woId);
  });

  // Commercial Close Confirm
  document.getElementById('btn-confirm-commercial-close')?.addEventListener('click', async () => {
    const woId = document.getElementById('select-close-wo').value;
    const requiresInvoice = document.getElementById('close-requires-invoice').checked;
    const notes = document.getElementById('close-notes').value;

    if (!woId) {
      STATE.showToast('warning', 'Selección Requerida', 'Seleccione una orden para cierre');
      return;
    }

    try {
      await API.executeCommercialClose(woId, requiresInvoice, notes);
      STATE.showToast('success', 'Cierre Confirmado', 'Importe congelado, CxC generada y estado fiscal resuelto (RF-22)');
      await refreshAllData();
      if (requiresInvoice) {
        STATE.setView('invoicing');
      } else {
        STATE.setView('finance');
      }
    } catch (e) {
      STATE.showToast('error', 'Error en Cierre', e.message);
    }
  });

  // Fiscal Data Submission
  document.getElementById('btn-submit-fiscal-data')?.addEventListener('click', async () => {
    const woId = document.getElementById('fiscal-wo-id').value;
    const rfc = document.getElementById('fiscal-rfc').value.trim();
    const businessName = document.getElementById('fiscal-name').value.trim();
    const zipCode = document.getElementById('fiscal-zip').value.trim();
    const taxRegime = document.getElementById('fiscal-regime').value;
    const cfdiUse = document.getElementById('fiscal-use').value;
    const applyToClient = document.getElementById('fiscal-apply-to-client').checked;

    if (rfc.length < 12 || zipCode.length !== 5) {
      STATE.showToast('warning', 'Validación SAT', 'RFC debe tener 12-13 caracteres y C.P. exactamente 5 dígitos');
      return;
    }

    await API.updateFiscalData(woId, { rfc, businessName, zipCode, taxRegime, cfdiUse, applyToClient });
    STATE.showToast('success', 'Datos SAT Validados', 'Orden transicionada a LISTA_PARA_FACTURAR');
    STATE.closeModal('modal-fiscal-data');
    renderInvoicingView();
  });

  // Emit Invoice Submission
  document.getElementById('btn-submit-emit-invoice')?.addEventListener('click', async () => {
    const woId = document.getElementById('emit-wo-id').value;
    const paymentMethodSat = document.getElementById('emit-method-sat').value;
    const paymentFormSat = document.getElementById('emit-form-sat').value;
    const notes = document.getElementById('emit-notes').value;

    try {
      const inv = await API.emitInvoice(woId, { paymentMethodSat, paymentFormSat, notes });
      STATE.showToast('success', 'Factura Emitida', `Folio generado: ${inv.invoiceNumber}`);
      STATE.closeModal('modal-emit-invoice');
      renderInvoicingView();
      viewDigitalInvoice(inv.id);
    } catch (e) {
      STATE.showToast('error', 'Error emisión', e.message);
    }
  });

  // Cancel Invoice Submission
  document.getElementById('btn-submit-cancel-invoice')?.addEventListener('click', async () => {
    const invId = document.getElementById('cancel-inv-id').value;
    const reasonCode = document.getElementById('cancel-sat-reason').value;
    const desc = document.getElementById('cancel-desc-reason').value.trim();

    if (!desc) {
      STATE.showToast('warning', 'Motivo Requerido', 'Debe ingresar una justificación');
      return;
    }

    await API.cancelInvoice(invId, reasonCode, desc);
    STATE.showToast('info', 'Factura Cancelada', 'Factura cancelada y OT revertida a CANCELADA');
    STATE.closeModal('modal-cancel-invoice');
    renderInvoicingView();
  });

  // Payment Submission
  document.getElementById('pay-method')?.addEventListener('change', (e) => {
    document.getElementById('group-terminal-comm').style.display = e.target.value === 'CARD' ? 'block' : 'none';
  });

  document.getElementById('btn-submit-payment')?.addEventListener('click', async () => {
    const woId = document.getElementById('pay-select-wo').value;
    const type = document.getElementById('pay-type').value;
    const paymentMethod = document.getElementById('pay-method').value;
    const amount = Number(document.getElementById('pay-amount').value || 0);
    const terminalCommission = Number(document.getElementById('pay-terminal-comm').value || 0);
    const reference = document.getElementById('pay-reference').value;

    if (amount <= 0) {
      STATE.showToast('warning', 'Monto Inválido', 'El monto debe ser mayor a cero');
      return;
    }

    try {
      await API.createPayment(woId, { type, paymentMethod, amount, terminalCommission, reference });
      STATE.showToast('success', 'Cobro Registrado', 'Abono registrado a la CxC y movimiento de caja generado');
      STATE.closeModal('modal-new-payment');
      await refreshAllData();
      renderFinanceView();
    } catch (e) {
      STATE.showToast('error', 'Error en Pago', e.message);
    }
  });

  // Manual Cash Movement
  document.getElementById('btn-submit-cash-movement')?.addEventListener('click', async () => {
    const type = document.getElementById('cm-type').value;
    const amount = document.getElementById('cm-amount').value;
    const concept = document.getElementById('cm-concept').value.trim();

    if (!amount || !concept) {
      STATE.showToast('warning', 'Campos Requeridos', 'Monto y Concepto son obligatorios');
      return;
    }

    await API.createCashMovement(type, amount, concept);
    STATE.showToast('success', 'Caja Actualizada', 'Movimiento manual registrado');
    STATE.closeModal('modal-cash-movement');
    renderFinanceView();
  });

  // Add Note in Work Order Detail
  document.getElementById('btn-submit-note')?.addEventListener('click', async () => {
    const woId = STATE.selectedWorkOrderId;
    const content = document.getElementById('new-note-content').value.trim();
    const isClientVisible = document.getElementById('new-note-client-visible').checked;

    if (!content) return;

    await API.addNote(woId, content, isClientVisible);
    document.getElementById('new-note-content').value = '';
    STATE.showToast('success', 'Nota Agregada', 'Nota guardada en la bitácora técnica');
    openWorkOrderDetail(woId);
  });

  // Add Photo trigger
  document.getElementById('btn-add-photo-trigger')?.addEventListener('click', async () => {
    const woId = STATE.selectedWorkOrderId;
    const url = prompt('Introduce la URL de la fotografía técnica:', 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80');
    if (url) {
      const caption = prompt('Descripción / Pie de foto:', 'Inspección de componentes');
      await API.uploadPhoto(woId, 'PROCESS', true, caption, url);
      STATE.showToast('success', 'Foto Cargada', 'Evidencia fotográfica añadida');
      openWorkOrderDetail(woId);
    }
  });

  // Kanban / Table Toggle buttons
  document.getElementById('btn-view-kanban')?.addEventListener('click', () => {
    document.getElementById('btn-view-kanban').classList.add('active');
    document.getElementById('btn-view-table').classList.remove('active');
    renderWorkOrdersView();
  });

  document.getElementById('btn-view-table')?.addEventListener('click', () => {
    document.getElementById('btn-view-table').classList.add('active');
    document.getElementById('btn-view-kanban').classList.remove('active');
    renderWorkOrdersView();
  });

  // Search input debounce in Work Orders
  document.getElementById('search-wo')?.addEventListener('input', () => {
    renderWorkOrdersView();
  });
  document.getElementById('filter-wo-status')?.addEventListener('change', () => {
    renderWorkOrdersView();
  });
  document.getElementById('filter-wo-delayed')?.addEventListener('change', () => {
    renderWorkOrdersView();
  });

  // Quotation selector change
  document.getElementById('select-quote-wo')?.addEventListener('change', (e) => {
    renderQuotationsView(e.target.value);
  });

  // Commercial Close selector change
  document.getElementById('select-close-wo')?.addEventListener('change', (e) => {
    renderCommercialCloseView(e.target.value);
  });
}

function populateCatalogs() {
  // Client dropdowns
  const cliSelects = ['new-wo-client', 'veh-client-id'];
  cliSelects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '<option value="">-- Seleccionar Cliente --</option>';
    STATE.cachedData.clients.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${c.clientType})`;
      el.appendChild(opt);
    });
  });

  // Vehicle dropdowns for new WO
  const vehSelect = document.getElementById('new-wo-vehicle');
  if (vehSelect) {
    vehSelect.innerHTML = '<option value="">-- Seleccionar Vehículo --</option>';
    STATE.cachedData.vehicles.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.id;
      opt.textContent = `${v.plates} · ${v.brand} ${v.model} (${v.color})`;
      vehSelect.appendChild(opt);
    });
  }

  // Work Orders for Payments
  const payWoSelect = document.getElementById('pay-select-wo');
  if (payWoSelect) {
    payWoSelect.innerHTML = '';
    STATE.cachedData.workOrders.forEach(wo => {
      const client = STATE.cachedData.clients.find(c => c.id === wo.clientId);
      const opt = document.createElement('option');
      opt.value = wo.id;
      opt.textContent = `${wo.code} — ${client ? client.name : 'Cliente'}`;
      payWoSelect.appendChild(opt);
    });
  }

  // Services dropdown in quotation modal
  const srvSelect = document.getElementById('quote-select-service');
  if (srvSelect) {
    srvSelect.innerHTML = '';
    STATE.cachedData.services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.code} · ${s.concept} (${FORMAT.currency(s.basePrice)})`;
      srvSelect.appendChild(opt);
    });
  }

  // Inventory parts dropdown in quotation modal
  const partSelect = document.getElementById('quote-select-part');
  if (partSelect) {
    partSelect.innerHTML = '';
    STATE.cachedData.inventory.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.code} · ${a.name} (${FORMAT.currency(a.salePrice)} - Stock: ${a.stock})`;
      partSelect.appendChild(opt);
    });
  }

  // Operational status filter in Work Orders view
  const filterWo = document.getElementById('filter-wo-status');
  if (filterWo) {
    filterWo.innerHTML = '<option value="">Todos los Estados</option>';
    Object.keys(ENUMS.OperationalStatus).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = ENUMS.OperationalStatus[key].label;
      filterWo.appendChild(opt);
    });
  }

  // SAT Catalogs
  const regimeSelect = document.getElementById('fiscal-regime');
  if (regimeSelect) {
    regimeSelect.innerHTML = '';
    ENUMS.SatTaxRegimes.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.code;
      opt.textContent = r.label;
      regimeSelect.appendChild(opt);
    });
  }

  const useSelect = document.getElementById('fiscal-use');
  if (useSelect) {
    useSelect.innerHTML = '';
    ENUMS.SatCfdiUses.forEach(u => {
      const opt = document.createElement('option');
      opt.value = u.code;
      opt.textContent = u.label;
      useSelect.appendChild(opt);
    });
  }

  const formSatSelect = document.getElementById('emit-form-sat');
  if (formSatSelect) {
    formSatSelect.innerHTML = '';
    ENUMS.SatPaymentForms.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.code;
      opt.textContent = f.label;
      formSatSelect.appendChild(opt);
    });
  }

  const cancelReasonSelect = document.getElementById('cancel-sat-reason');
  if (cancelReasonSelect) {
    cancelReasonSelect.innerHTML = '';
    ENUMS.SatCancelReasons.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.code;
      opt.textContent = c.label;
      cancelReasonSelect.appendChild(opt);
    });
  }
}
