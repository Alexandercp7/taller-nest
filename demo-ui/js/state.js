/**
 * TALLER ERP — APPLICATION STATE & EVENT BUS
 * Manages active route, user session, modals, and toasts.
 */

class AppState {
  constructor() {
    this.currentView = 'dashboard';
    this.user = null;
    this.selectedWorkOrderId = null;
    this.listeners = {};
    this.cachedData = {
      workOrders: [],
      clients: [],
      vehicles: [],
      services: [],
      inventory: [],
      lowStock: [],
      receivables: [],
      invoices: []
    };
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }

  setView(viewName, params = {}) {
    this.currentView = viewName;
    if (params.workOrderId) {
      this.selectedWorkOrderId = params.workOrderId;
    }
    this.emit('view:change', { view: viewName, params });
  }

  showToast(type, title, msg, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    toast.innerHTML = `
      <div class="toast-icon" style="font-weight: bold; font-size: 1.1rem;">${icons[type] || 'ℹ'}</div>
      <div class="toast-content">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
      this.emit('modal:open', modalId);
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
      this.emit('modal:close', modalId);
    }
  }

  closeAllModals() {
    document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
    document.body.style.overflow = '';
  }
}

const STATE = new AppState();
