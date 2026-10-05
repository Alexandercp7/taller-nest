/**
 * TALLER ERP — CONFIGURATION & DOMAIN ENUMS
 * Standard configuration, endpoints and business constants
 */

const CONFIG = {
  API_BASE_URL: window.location.origin.includes('localhost') 
    ? `${window.location.origin}/api/v1` 
    : 'http://localhost:3000/api/v1',
  DEFAULT_ADMIN_EMAIL: 'admin@taller.com',
  DEFAULT_ADMIN_PASS: 'NuevaPassword1234!',
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'taller_access_token',
    REFRESH_TOKEN: 'taller_refresh_token',
    ACTIVE_USER: 'taller_active_user',
    API_URL_OVERRIDE: 'taller_api_url_override',
    MOCK_DB: 'taller_erp_mock_db_v1'
  }
};

// Domain Constants & Enums matching Prisma & Business Rules
const ENUMS = {
  OperationalStatus: {
    RECIBIDA: { label: 'Recibida', badge: 'badge-neutral', order: 1 },
    EN_DIAGNOSTICO: { label: 'En Diagnóstico', badge: 'badge-sapphire', order: 2 },
    EN_ESPERA_COTIZACION: { label: 'En Cotización', badge: 'badge-purple', order: 3 },
    EN_ESPERA_APROBACION: { label: 'En Espera Aprobación', badge: 'badge-gold', order: 4 },
    EN_REPARACION: { label: 'En Reparación', badge: 'badge-gold', order: 5 },
    CONTROL_CALIDAD: { label: 'Control Calidad', badge: 'badge-sapphire', order: 6 },
    LISTA_PARA_ENTREGA: { label: 'Lista p/ Entrega', badge: 'badge-emerald', order: 7 },
    ENTREGADA: { label: 'Entregada', badge: 'badge-emerald', order: 8 },
    CERRADA: { label: 'Cerrada', badge: 'badge-neutral', order: 9 },
    EN_GARANTIA: { label: 'En Garantía', badge: 'badge-crimson', order: 10 },
    CANCELADA: { label: 'Cancelada', badge: 'badge-crimson', order: 11 }
  },
  
  CommercialStatus: {
    SIN_COTIZAR: { label: 'Sin Cotizar', badge: 'badge-neutral' },
    COTIZADA: { label: 'Cotizada', badge: 'badge-sapphire' },
    APROBADA_PARCIAL: { label: 'Aprobada Parcial', badge: 'badge-gold' },
    APROBADA_TOTAL: { label: 'Aprobada Total', badge: 'badge-emerald' },
    EN_EJECUCION: { label: 'En Ejecución', badge: 'badge-gold' },
    CIERRE_PENDIENTE: { label: 'Cierre Pendiente', badge: 'badge-gold' },
    COBRADA_PARCIAL: { label: 'Cobrada Parcial', badge: 'badge-gold' },
    COBRADA_TOTAL: { label: 'Cobrada Total', badge: 'badge-emerald' }
  },

  BillingStatus: {
    NO_REQUERIDA: { label: 'No Requerida', badge: 'badge-neutral' },
    PENDIENTE_DATOS: { label: 'Pendiente Datos', badge: 'badge-crimson' },
    LISTA_PARA_FACTURAR: { label: 'Lista p/ Facturar', badge: 'badge-sapphire' },
    FACTURADA: { label: 'Facturada', badge: 'badge-emerald' },
    CANCELADA: { label: 'Cancelada', badge: 'badge-crimson' }
  },

  VehicleType: {
    AUTO: 'Sedán / Auto',
    CAMIONETA: 'SUV / Camioneta',
    CAMION: 'Pesado / Camión'
  },

  ServiceCategory: {
    AFINACION_Y_MANTENIMIENTO: 'Afinación y Mantenimiento',
    FRENOS_Y_SUSPENSION: 'Frenos y Suspensión',
    MECANICA_GENERAL: 'Mecánica General',
    MECANICA_RAPIDA: 'Mecánica Rápida',
    ELECTRICO_Y_DIAGNOSTICO: 'Eléctrico y Diagnóstico',
    TORNO_Y_MAQUINADO: 'Torno y Maquinado'
  },

  PaymentMethod: {
    CASH: 'Efectivo',
    CARD: 'Tarjeta (Terminal)',
    TRANSFER: 'Transferencia SPEI',
    CHECK: 'Cheque'
  },

  PaymentType: {
    ADVANCE: 'Anticipo',
    FINAL_SETTLEMENT: 'Liquidación Final'
  },

  SatPaymentMethods: [
    { code: 'PUE', label: 'PUE - Pago en una sola exhibición' },
    { code: 'PPD', label: 'PPD - Pago en parcialidades o diferido' }
  ],

  SatPaymentForms: [
    { code: '01', label: '01 - Efectivo' },
    { code: '03', label: '03 - Transferencia electrónica' },
    { code: '04', label: '04 - Tarjeta de crédito' },
    { code: '28', label: '28 - Tarjeta de débito' },
    { code: '99', label: '99 - Por definir' }
  ],

  SatTaxRegimes: [
    { code: '601', label: '601 - General de Ley Personas Morales' },
    { code: '605', label: '605 - Sueldos y Salarios' },
    { code: '606', label: '606 - Arrendamiento' },
    { code: '612', label: '612 - Personas Físicas con Actividades Empresariales' },
    { code: '626', label: '626 - Régimen Simplificado de Confianza (RESICO)' }
  ],

  SatCfdiUses: [
    { code: 'G03', label: 'G03 - Gastos en general' },
    { code: 'G01', label: 'G01 - Adquisición de mercancías' },
    { code: 'I03', label: 'I03 - Equipo de transporte' },
    { code: 'CP01', label: 'CP01 - Pagos' },
    { code: 'S01', label: 'S01 - Sin efectos fiscales' }
  ],

  SatCancelReasons: [
    { code: '01', label: '01 - Comprobante emitido con errores con relación' },
    { code: '02', label: '02 - Comprobante emitido con errores sin relación' },
    { code: '03', label: '03 - No se llevó a cabo la operación' },
    { code: '04', label: '04 - Operación nominativa relacionada en comprobante global' }
  ]
};

// Formatter Helpers
const FORMAT = {
  currency: (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  },
  
  date: (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  dateTime: (val) => {
    if (!val) return '—';
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
