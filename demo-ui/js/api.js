/**
 * TALLER ERP — API CLIENT
 * Connects to all 16 NestJS controllers & endpoints.
 * Includes automatic offline/demo fallback store for robust standalone resilience.
 */

// Initial Seed Data for the Offline/Demo Reactive Store
const DEFAULT_MOCK_DATA = {
  users: [
    {
      id: 'usr-admin-1',
      email: 'admin@taller.com',
      firstName: 'Admin',
      lastName: 'Principal',
      role: 'ADMIN',
      kpiTitle: 'Director de Taller',
      isActive: true,
      permissions: ['*']
    },
    {
      id: 'usr-tech-1',
      email: 'carlos.mecanico@taller.com',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      role: 'TECHNICIAN',
      kpiTitle: 'Técnico Especialista en Frenos',
      isActive: true,
      permissions: ['work-order:read', 'work-order:status', 'inventory:read']
    },
    {
      id: 'usr-advisor-1',
      email: 'lucia.asesora@taller.com',
      firstName: 'Lucía',
      lastName: 'Torres',
      role: 'SERVICE_ADVISOR',
      kpiTitle: 'Asesora de Servicio Senior',
      isActive: true,
      permissions: ['client:read', 'client:write', 'work-order:read', 'work-order:write', 'quotation:read', 'quotation:write']
    }
  ],
  clients: [
    {
      id: 'cli-001',
      name: 'Roberto Gómez Bolaños',
      clientType: 'FISICA',
      phone: '55 4192 8831',
      email: 'roberto.gomez@gmail.com',
      segment: 'VIP',
      hasDebt: false,
      rfc: 'GOBR8001019X8',
      businessName: 'ROBERTO GOMEZ BOLAÑOS',
      zipCode: '03100',
      taxRegime: '612',
      cfdiUse: 'G03',
      isActive: true
    },
    {
      id: 'cli-002',
      name: 'Transportes Logísticos Express S.A. de C.V.',
      clientType: 'MORAL',
      phone: '55 8899 1234',
      email: 'flotillas@logisticaexpress.mx',
      segment: 'FRECUENTE',
      hasDebt: true,
      rfc: 'TLE1503209A1',
      businessName: 'TRANSPORTES LOGISTICOS EXPRESS SA DE CV',
      zipCode: '06700',
      taxRegime: '601',
      cfdiUse: 'I03',
      isActive: true
    },
    {
      id: 'cli-003',
      name: 'Mariana Silva Pérez',
      clientType: 'FISICA',
      phone: '55 1234 5678',
      email: 'mariana.silva@outlook.com',
      segment: 'NUEVO',
      hasDebt: false,
      rfc: 'SIPM920514981',
      businessName: 'MARIANA SILVA PEREZ',
      zipCode: '04100',
      taxRegime: '605',
      cfdiUse: 'S01',
      isActive: true
    }
  ],
  vehicles: [
    {
      id: 'veh-001',
      clientId: 'cli-001',
      plates: 'PXZ-482-B',
      vin: '3N1AB7AP8KY291048',
      brand: 'Nissan',
      model: 'Sentra Advance',
      year: 2021,
      color: 'Gris Grafito',
      vehicleType: 'AUTO',
      currentMileage: 58200,
      isActive: true
    },
    {
      id: 'veh-002',
      clientId: 'cli-002',
      plates: 'LE-991-TR',
      vin: '1FTFW1ED4MFA19283',
      brand: 'Ford',
      model: 'F-150 Lariat',
      year: 2022,
      color: 'Blanco Oxford',
      vehicleType: 'CAMIONETA',
      currentMileage: 112500,
      isActive: true
    },
    {
      id: 'veh-003',
      clientId: 'cli-003',
      plates: 'MYZ-102-A',
      vin: 'WAUZZZF27NA018274',
      brand: 'Audi',
      model: 'Q5 S-Line',
      year: 2023,
      color: 'Azul Navarra',
      vehicleType: 'CAMIONETA',
      currentMileage: 28400,
      isActive: true
    }
  ],
  services: [
    {
      id: 'srv-001',
      code: 'SRV-AFIN-01',
      concept: 'Afinación Mayor Completa (4 Cilindros)',
      category: 'AFINACION_Y_MANTENIMIENTO',
      system: 'Motor',
      family: 'Afinación',
      estimatedMinutes: 120,
      basePrice: '1450.00',
      costPrice: '600.00',
      notes: 'Lavado de inyectores por ultrasonido, cuerpo de aceleración y bujías.',
      prices: [
        { vehicleType: 'AUTO', price: '1450.00' },
        { vehicleType: 'CAMIONETA', price: '1850.00' },
        { vehicleType: 'CAMION', price: '2400.00' }
      ],
      isActive: true
    },
    {
      id: 'srv-002',
      code: 'SRV-FREN-01',
      concept: 'Cambio de Balatas Delanteras y Rectificado de Discos',
      category: 'FRENOS_Y_SUSPENSION',
      system: 'Frenos',
      family: 'Discos',
      estimatedMinutes: 90,
      basePrice: '850.00',
      costPrice: '350.00',
      notes: 'Incluye purgado de líquido y lubricación de pernos corredera.',
      prices: [
        { vehicleType: 'AUTO', price: '850.00' },
        { vehicleType: 'CAMIONETA', price: '1100.00' },
        { vehicleType: 'CAMION', price: '1600.00' }
      ],
      isActive: true
    },
    {
      id: 'srv-003',
      code: 'SRV-DIAG-01',
      concept: 'Escaneo y Diagnóstico Computarizado OBD-II',
      category: 'ELECTRICO_Y_DIAGNOSTICO',
      system: 'Electrónica',
      family: 'Sensores',
      estimatedMinutes: 45,
      basePrice: '450.00',
      costPrice: '100.00',
      notes: 'Lectura de códigos de falla DTC y flujo de datos en tiempo real.',
      prices: [
        { vehicleType: 'AUTO', price: '450.00' },
        { vehicleType: 'CAMIONETA', price: '450.00' },
        { vehicleType: 'CAMION', price: '700.00' }
      ],
      isActive: true
    }
  ],
  inventory: [
    {
      id: 'art-001',
      code: 'REF-BAL-D01',
      name: 'Juego de Balatas Delanteras Cerámicas',
      description: 'Balatas de alto rendimiento sin ruido para Nissan / Sentra',
      brand: 'Brembo Ceramic',
      articleType: 'PARTE_EN_VENTA',
      unit: 'Juego',
      costPrice: '620.00',
      salePrice: '1150.00',
      stock: 4,
      minStock: 5, // Triggers lowStock alert!
      location: 'Estante B-2',
      isActive: true
    },
    {
      id: 'art-002',
      code: 'REF-ACE-5W30',
      name: 'Aceite Sintético 5W-30 Dexos1 Gen3',
      description: 'Garrafa 5 Litros motor a gasolina',
      brand: 'Mobil 1 Full Synthetic',
      articleType: 'CONSUMIBLE',
      unit: 'Garrafa',
      costPrice: '580.00',
      salePrice: '920.00',
      stock: 18,
      minStock: 6,
      location: 'Estante A-1',
      isActive: true
    },
    {
      id: 'art-003',
      code: 'REF-BUJ-IRID',
      name: 'Bujía de Iridio Laser',
      description: 'Electrodo ultrafino larga duración 100,000 km',
      brand: 'NGK Laser Iridium',
      articleType: 'PARTE_EN_VENTA',
      unit: 'Pieza',
      costPrice: '140.00',
      salePrice: '260.00',
      stock: 2,
      minStock: 8, // Low stock alert!
      location: 'Cajón C-4',
      isActive: true
    }
  ],
  tools: [
    {
      id: 'tool-001',
      name: 'Escáner Profesional de Diagnóstico Automotriz',
      serialNumber: 'AUTEL-MS906PRO-8491',
      brand: 'Autel MaxiSys',
      model: 'MS906Pro',
      condition: 'BUENO',
      status: 'DISPONIBLE',
      location: 'Cabina de Diagnóstico',
      assignedToUserId: null,
      isActive: true
    },
    {
      id: 'tool-002',
      name: 'Torquímetro Digital 1/2" 20-250 ft-lb',
      serialNumber: 'SNAP-TRQ-9921',
      brand: 'Snap-on',
      model: 'TechAngle',
      condition: 'BUENO',
      status: 'EN_USO',
      location: 'Bahía 1',
      assignedToUserId: 'usr-tech-1',
      isActive: true
    }
  ],
  custody: [
    {
      id: 'cst-001',
      workOrderId: 'wo-001',
      description: 'Discos y balatas usadas sustituidas (solicitadas por el cliente para inspección)',
      quantity: 2,
      condition: 'Desgaste severo al 90%',
      location: 'Repisa de Custodia C-1',
      isReturned: false,
      createdAt: new Date().toISOString()
    }
  ],
  suppliers: [
    {
      id: 'sup-001',
      name: 'Refaccionaria California Mayorista',
      contactName: 'Ing. Fernando Trejo',
      phone: '55 5729 4400',
      email: 'pedidos@refacc-california.com.mx',
      rfc: 'RCA8203159L2',
      address: 'Calzada de Tlalpan #1280, CDMX',
      notes: 'Entrega en taller en 90 minutos para refacciones de stock rápido.',
      isActive: true
    }
  ],
  specialOrderParts: [
    {
      id: 'sop-001',
      workOrderId: 'wo-002',
      supplierId: 'sup-001',
      partName: 'Bomba de Agua Original Ford OEM',
      partNumber: 'HL3Z-8501-A',
      quantity: 1,
      estimatedCost: '3200.00',
      status: 'PEDIDA',
      trackingNotes: 'Llega hoy por mensajería al mediodía'
    }
  ],
  workOrders: [
    {
      id: 'wo-001',
      code: 'OT-0001',
      clientId: 'cli-001',
      vehicleId: 'veh-001',
      serviceAdvisorId: 'usr-advisor-1',
      technicianId: 'usr-tech-1',
      operationalStatus: 'EN_REPARACION',
      commercialStatus: 'APROBADA_TOTAL',
      billingStatus: 'LISTA_PARA_FACTURAR',
      initialMileage: 58200,
      fuelLevel: 65,
      failureDescription: 'Vibración fuerte en volante al frenar a más de 60 km/h y chillido agudo.',
      estaRetrasada: false,
      portalToken: 'd8f2a1b9-7a3e-4b2c-9821-391849102837',
      estimatedDeliveryDate: new Date(Date.now() + 86400000 * 2).toISOString(),
      entryDate: new Date(Date.now() - 86400000).toISOString(),
      checklist: {
        hasKeys: true,
        hasSpareTire: true,
        hasJack: true,
        hasTools: true,
        hasFireExtinguisher: false,
        personalItems: 'Lentes oscuros en visera',
        exteriorDamage: [{ component: 'salpicadera_derecha', damageType: 'rayon_ligero' }]
      },
      notes: [
        {
          id: 'note-1',
          content: 'Se confirma alabeo en ambos discos delanteros de 0.08 mm (tolerancia máx 0.02 mm).',
          isClientVisible: true,
          authorName: 'Carlos Mendoza (Técnico)',
          createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
        }
      ],
      photos: [
        {
          id: 'photo-1',
          url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
          category: 'INSPECTION',
          isPublic: true,
          caption: 'Medición de espesor de discos con micrómetro'
        }
      ]
    },
    {
      id: 'wo-002',
      code: 'OT-0002',
      clientId: 'cli-002',
      vehicleId: 'veh-002',
      serviceAdvisorId: 'usr-advisor-1',
      technicianId: 'usr-tech-1',
      operationalStatus: 'CONTROL_CALIDAD',
      commercialStatus: 'CIERRE_PENDIENTE',
      billingStatus: 'PENDIENTE_DATOS',
      initialMileage: 112500,
      fuelLevel: 40,
      failureDescription: 'Mantenimiento mayor y fuga de anticongelante por carcasa de termostato.',
      estaRetrasada: true, // Flagged delayed!
      portalToken: 'f1e4b9c8-1122-3344-5566-778899aabbcc',
      estimatedDeliveryDate: new Date(Date.now() - 3600000 * 5).toISOString(),
      entryDate: new Date(Date.now() - 86400000 * 3).toISOString(),
      checklist: {
        hasKeys: true,
        hasSpareTire: true,
        hasJack: true,
        hasTools: true,
        hasFireExtinguisher: true,
        personalItems: 'Herramientas de trabajo en batea',
        exteriorDamage: []
      },
      notes: [
        {
          id: 'note-2',
          content: 'Retraso de 2 horas debido a demora en entrega de empaque de termostato por proveedor.',
          isClientVisible: false,
          authorName: 'Lucía Torres (Asesora)',
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
        }
      ],
      photos: []
    }
  ],
  quotations: {
    'wo-001': {
      id: 'q-001',
      workOrderId: 'wo-001',
      subtotal: 2000.00,
      discountType: 'PERCENT',
      discountValue: 5.00,
      discountAmount: 100.00,
      aplicaIva: true,
      taxAmount: 304.00,
      total: 2204.00,
      clientApprovalStatus: 'APROBADA_TOTAL',
      lines: [
        {
          id: 'ql-001',
          lineType: 'SERVICE',
          serviceId: 'srv-002',
          concept: 'Cambio de Balatas Delanteras y Rectificado de Discos',
          quantity: 1,
          unitPrice: 850.00,
          finalPrice: 850.00,
          approvalStatus: 'APPROVED',
          priceOverrideReason: null
        },
        {
          id: 'ql-002',
          lineType: 'PART',
          articleId: 'art-001',
          concept: 'Juego de Balatas Delanteras Cerámicas Brembo',
          quantity: 1,
          unitPrice: 1150.00,
          finalPrice: 1150.00,
          approvalStatus: 'APPROVED',
          priceOverrideReason: null
        }
      ]
    },
    'wo-002': {
      id: 'q-002',
      workOrderId: 'wo-002',
      subtotal: 4650.00,
      discountType: 'FIXED',
      discountValue: 150.00,
      discountAmount: 150.00,
      aplicaIva: true,
      taxAmount: 720.00,
      total: 5220.00,
      clientApprovalStatus: 'APROBADA_TOTAL',
      lines: [
        {
          id: 'ql-003',
          lineType: 'SERVICE',
          serviceId: 'srv-001',
          concept: 'Afinación Mayor Completa (SUV/Camioneta)',
          quantity: 1,
          unitPrice: 1850.00,
          finalPrice: 1850.00,
          approvalStatus: 'APPROVED',
          priceOverrideReason: null
        },
        {
          id: 'ql-004',
          lineType: 'PART',
          articleId: 'art-002',
          concept: 'Aceite Sintético 5W-30 Dexos1 (2 garrafas)',
          quantity: 2,
          unitPrice: 920.00,
          finalPrice: 920.00,
          approvalStatus: 'APPROVED',
          priceOverrideReason: null
        },
        {
          id: 'ql-005',
          lineType: 'PART',
          articleId: 'art-003',
          concept: 'Bujía de Iridio Laser (Juego 4)',
          quantity: 4,
          unitPrice: 260.00,
          finalPrice: 240.00,
          approvalStatus: 'APPROVED',
          priceOverrideReason: 'Descuento por paquete de afinación autorizado por dirección'
        }
      ]
    }
  },
  commercialCloses: {
    'wo-002': {
      workOrderId: 'wo-002',
      frozenTotal: 5220.00,
      requiresInvoice: true,
      notes: 'Cierre confirmado para entrega de flotilla express',
      closedAt: new Date().toISOString()
    }
  },
  payments: [
    {
      id: 'pay-001',
      workOrderId: 'wo-001',
      type: 'ADVANCE',
      paymentMethod: 'TRANSFER',
      amount: 1000.00,
      terminalCommission: 0.00,
      netAmount: 1000.00,
      reference: 'SPEI-992144',
      notes: 'Anticipo al dejar el vehículo en taller',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'pay-002',
      workOrderId: 'wo-002',
      type: 'ADVANCE',
      paymentMethod: 'CARD',
      amount: 2000.00,
      terminalCommission: 70.00,
      netAmount: 1930.00,
      reference: 'AUTH-481920',
      notes: 'Anticipo pago con tarjeta en terminal',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  ],
  receivables: [
    {
      id: 'cxc-002',
      workOrderId: 'wo-002',
      originalAmount: 5220.00,
      paidAmount: 2000.00,
      balance: 3220.00,
      status: 'PARTIAL',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    }
  ],
  cashMovements: [
    {
      id: 'cm-001',
      type: 'INCOME',
      amount: 1000.00,
      concept: 'Anticipo OT-0001 (SPEI)',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 'cm-002',
      type: 'INCOME',
      amount: 1930.00, // Net after card commission!
      concept: 'Anticipo OT-0002 (Terminal Tarjeta Neta)',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'cm-003',
      type: 'EXPENSE',
      amount: 240.00,
      concept: 'Insumos de cafetería y agua purificada para sala de espera',
      createdAt: new Date(Date.now() - 3600000 * 6).toISOString()
    }
  ],
  invoices: [
    {
      id: 'inv-001',
      invoiceNumber: 'FAC-0001',
      workOrderId: 'wo-001',
      receiverRfc: 'GOBR8001019X8',
      receiverName: 'ROBERTO GOMEZ BOLAÑOS',
      receiverZipCode: '03100',
      receiverTaxRegime: '612',
      cfdiUse: 'G03',
      paymentMethodSat: 'PUE',
      paymentFormSat: '03',
      subtotal: 1900.00,
      discountAmount: 100.00,
      taxAmount: 304.00,
      total: 2204.00,
      status: 'ISSUED',
      uuid: '6fa459ea-ee7e-11ea-adc1-0242ac120002',
      createdAt: new Date().toISOString()
    }
  ]
};

// Local storage persistent mock store
class MockStore {
  constructor() {
    this.key = CONFIG.STORAGE_KEYS.MOCK_DB;
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(this.key);
      if (stored) return JSON.parse(stored);
    } catch (e) {
      console.warn('Could not read mock db from localStorage', e);
    }
    this.save(DEFAULT_MOCK_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
  }

  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data || this.data));
    } catch (e) {
      console.warn('Could not save mock db to localStorage', e);
    }
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
    this.save();
    return this.data;
  }
}

const mockDb = new MockStore();

// Core API Service
const API = {
  isLive: false,

  getBaseUrl() {
    const override = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL_OVERRIDE);
    return override || CONFIG.API_BASE_URL;
  },

  getHeaders(isMultipart = false) {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(path, options = {}) {
    const url = `${this.getBaseUrl()}${path.startsWith('/') ? path : '/' + path}`;
    const opts = {
      ...options,
      headers: {
        ...this.getHeaders(options.isMultipart),
        ...(options.headers || {})
      }
    };

    if (opts.body && typeof opts.body === 'object' && !options.isMultipart) {
      opts.body = JSON.stringify(opts.body);
    }

    try {
      const res = await fetch(url, opts);
      if (res.ok) {
        this.isLive = true;
        if (res.status === 204) return null;
        return await res.json();
      }
      // If unauthorized, refresh token could be tried
      const errBody = await res.json().catch(() => ({}));
      const error = new Error(errBody.message || `Error ${res.status}: ${res.statusText}`);
      error.status = res.status;
      error.data = errBody;
      throw error;
    } catch (err) {
      // If network error, mark offline
      if (err.name === 'TypeError' || err.message.includes('fetch')) {
        this.isLive = false;
      }
      throw err;
    }
  },

  // Healthcheck: probes NestJS backend
  async ping() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/users/me`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(2500)
      });
      this.isLive = (res.status >= 200 && res.status < 500);
      return this.isLive;
    } catch (e) {
      this.isLive = false;
      return false;
    }
  },

  /* -------------------------------------------------------------
     1. AUTH ENDPOINTS (/auth)
     ------------------------------------------------------------- */
  async login(email, password) {
    try {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      if (res && res.accessToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, res.refreshToken);
        }
      }
      return res;
    } catch (err) {
      // Mock Fallback
      const user = mockDb.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (user) {
        const fakeToken = 'mock_jwt_token_' + Date.now();
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, fakeToken);
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_USER, JSON.stringify(user));
        return { accessToken: fakeToken, refreshToken: 'mock_refresh_token', user };
      }
      throw new Error('Credenciales inválidas (usuario o contraseña erróneos)');
    }
  },

  async logout() {
    const refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
    try {
      if (refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: { refreshToken }
        });
      }
    } catch (e) {
      // Ignore network failure on logout
    } finally {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(CONFIG.STORAGE_KEYS.ACTIVE_USER);
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      return await this.request('/auth/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword }
      });
    } catch (err) {
      // Mock fallback: always succeed
      return { success: true };
    }
  },

  /* -------------------------------------------------------------
     2. USERS ENDPOINTS (/users)
     ------------------------------------------------------------- */
  async getMe() {
    try {
      const res = await this.request('/users/me');
      localStorage.setItem(CONFIG.STORAGE_KEYS.ACTIVE_USER, JSON.stringify(res));
      return res;
    } catch (err) {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.ACTIVE_USER);
      if (stored) return JSON.parse(stored);
      return mockDb.data.users[0];
    }
  },

  async getUsers(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/users?${query}`);
    } catch (err) {
      return { data: mockDb.data.users, total: mockDb.data.users.length };
    }
  },

  async createUser(userData) {
    try {
      return await this.request('/users', {
        method: 'POST',
        body: userData
      });
    } catch (err) {
      const newUser = {
        id: 'usr-' + Date.now(),
        isActive: true,
        permissions: ['work-order:read'],
        ...userData
      };
      mockDb.data.users.push(newUser);
      mockDb.save();
      return newUser;
    }
  },

  async updateUser(id, updateData) {
    try {
      return await this.request(`/users/${id}`, {
        method: 'PATCH',
        body: updateData
      });
    } catch (err) {
      const idx = mockDb.data.users.findIndex(u => u.id === id);
      if (idx !== -1) {
        mockDb.data.users[idx] = { ...mockDb.data.users[idx], ...updateData };
        mockDb.save();
        return mockDb.data.users[idx];
      }
      throw err;
    }
  },

  async updateUserPermissions(id, permissions) {
    try {
      return await this.request(`/users/${id}/permissions`, {
        method: 'PUT',
        body: { permissions }
      });
    } catch (err) {
      const user = mockDb.data.users.find(u => u.id === id);
      if (user) {
        user.permissions = permissions.filter(p => p.granted).map(p => p.permissionId);
        mockDb.save();
      }
      return { success: true };
    }
  },

  async deactivateUser(id) {
    try {
      return await this.request(`/users/${id}`, { method: 'DELETE' });
    } catch (err) {
      const user = mockDb.data.users.find(u => u.id === id);
      if (user) {
        user.isActive = false;
        mockDb.save();
      }
      return { success: true };
    }
  },

  /* -------------------------------------------------------------
     3. CLIENTS ENDPOINTS (/clients)
     ------------------------------------------------------------- */
  async getClients(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/clients?${query}`);
    } catch (err) {
      let filtered = [...mockDb.data.clients];
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.email.toLowerCase().includes(s));
      }
      return { data: filtered, total: filtered.length };
    }
  },

  async getClient(id) {
    try {
      return await this.request(`/clients/${id}`);
    } catch (err) {
      const cli = mockDb.data.clients.find(c => c.id === id);
      if (!cli) throw new Error('Cliente no encontrado');
      return cli;
    }
  },

  async createClient(data) {
    try {
      return await this.request('/clients', { method: 'POST', body: data });
    } catch (err) {
      const newCli = {
        id: 'cli-' + Date.now(),
        segment: 'NUEVO',
        hasDebt: false,
        isActive: true,
        ...data
      };
      mockDb.data.clients.unshift(newCli);
      mockDb.save();
      return newCli;
    }
  },

  async updateClient(id, data) {
    try {
      return await this.request(`/clients/${id}`, { method: 'PATCH', body: data });
    } catch (err) {
      const idx = mockDb.data.clients.findIndex(c => c.id === id);
      if (idx !== -1) {
        mockDb.data.clients[idx] = { ...mockDb.data.clients[idx], ...data };
        mockDb.save();
        return mockDb.data.clients[idx];
      }
      throw err;
    }
  },

  async deactivateClient(id) {
    try {
      return await this.request(`/clients/${id}`, { method: 'DELETE' });
    } catch (err) {
      const c = mockDb.data.clients.find(item => item.id === id);
      if (c) c.isActive = false;
      mockDb.save();
      return { success: true };
    }
  },

  async recalculateTag(id) {
    try {
      return await this.request(`/clients/${id}/recalculate-tag`, { method: 'POST' });
    } catch (err) {
      const c = mockDb.data.clients.find(item => item.id === id);
      if (c) {
        c.segment = 'VIP'; // Simulated promotion
        mockDb.save();
      }
      return { success: true };
    }
  },

  /* -------------------------------------------------------------
     4. VEHICLES ENDPOINTS (/vehicles)
     ------------------------------------------------------------- */
  async getVehicles(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/vehicles?${query}`);
    } catch (err) {
      let filtered = [...mockDb.data.vehicles];
      if (params.clientId) {
        filtered = filtered.filter(v => v.clientId === params.clientId);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(v => v.plates.toLowerCase().includes(s) || v.brand.toLowerCase().includes(s) || v.model.toLowerCase().includes(s));
      }
      return { data: filtered, total: filtered.length };
    }
  },

  async lookupVin(vin) {
    try {
      return await this.request(`/vehicles/vin-lookup/${vin}`);
    } catch (err) {
      // Mock VIN decoder simulation
      return {
        vin: vin,
        brand: vin.startsWith('3N') ? 'Nissan' : vin.startsWith('1FT') ? 'Ford' : 'Toyota',
        model: vin.startsWith('3N') ? 'Sentra Exclusive' : vin.startsWith('1FT') ? 'F-150 SuperCrew' : 'Corolla LE',
        year: 2022,
        vehicleType: vin.startsWith('1FT') ? 'CAMIONETA' : 'AUTO'
      };
    }
  },

  async createVehicle(data) {
    try {
      return await this.request('/vehicles', { method: 'POST', body: data });
    } catch (err) {
      const newVeh = {
        id: 'veh-' + Date.now(),
        isActive: true,
        ...data
      };
      mockDb.data.vehicles.push(newVeh);
      mockDb.save();
      return newVeh;
    }
  },

  async updateVehicle(id, data) {
    try {
      return await this.request(`/vehicles/${id}`, { method: 'PATCH', body: data });
    } catch (err) {
      const idx = mockDb.data.vehicles.findIndex(v => v.id === id);
      if (idx !== -1) {
        mockDb.data.vehicles[idx] = { ...mockDb.data.vehicles[idx], ...data };
        mockDb.save();
        return mockDb.data.vehicles[idx];
      }
      throw err;
    }
  },

  /* -------------------------------------------------------------
     5. SERVICES ENDPOINTS (/services)
     ------------------------------------------------------------- */
  async getServices(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/services?${query}`);
    } catch (err) {
      let filtered = [...mockDb.data.services];
      if (params.category) filtered = filtered.filter(s => s.category === params.category);
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(item => item.concept.toLowerCase().includes(s) || item.code.toLowerCase().includes(s));
      }
      return { data: filtered, total: filtered.length };
    }
  },

  async createService(data) {
    try {
      return await this.request('/services', { method: 'POST', body: data });
    } catch (err) {
      const newSrv = {
        id: 'srv-' + Date.now(),
        isActive: true,
        prices: data.prices || [
          { vehicleType: 'AUTO', price: data.basePrice },
          { vehicleType: 'CAMIONETA', price: (Number(data.basePrice) * 1.25).toFixed(2) },
          { vehicleType: 'CAMION', price: (Number(data.basePrice) * 1.6).toFixed(2) }
        ],
        ...data
      };
      mockDb.data.services.push(newSrv);
      mockDb.save();
      return newSrv;
    }
  },

  async updateService(id, data) {
    try {
      return await this.request(`/services/${id}`, { method: 'PATCH', body: data });
    } catch (err) {
      const idx = mockDb.data.services.findIndex(s => s.id === id);
      if (idx !== -1) {
        mockDb.data.services[idx] = { ...mockDb.data.services[idx], ...data };
        mockDb.save();
        return mockDb.data.services[idx];
      }
      throw err;
    }
  },

  async setServicePrices(id, prices) {
    try {
      return await this.request(`/services/${id}/prices`, { method: 'PUT', body: { prices } });
    } catch (err) {
      const srv = mockDb.data.services.find(s => s.id === id);
      if (srv) {
        srv.prices = prices;
        mockDb.save();
      }
      return srv;
    }
  },

  /* -------------------------------------------------------------
     6. INVENTORY ENDPOINTS (/inventory)
     ------------------------------------------------------------- */
  async getArticles(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/inventory/articles?${query}`);
    } catch (err) {
      let filtered = [...mockDb.data.inventory];
      if (params.lowStock === 'true' || params.lowStock === true) {
        filtered = filtered.filter(a => a.stock <= a.minStock);
      }
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(a => a.name.toLowerCase().includes(s) || a.code.toLowerCase().includes(s));
      }
      return { data: filtered, total: filtered.length };
    }
  },

  async getLowStock() {
    try {
      return await this.request('/inventory/low-stock');
    } catch (err) {
      return mockDb.data.inventory.filter(a => a.stock <= a.minStock);
    }
  },

  async createArticle(data) {
    try {
      return await this.request('/inventory/articles', { method: 'POST', body: data });
    } catch (err) {
      const newArt = { id: 'art-' + Date.now(), isActive: true, ...data };
      mockDb.data.inventory.push(newArt);
      mockDb.save();
      return newArt;
    }
  },

  async createStockMovement(data) {
    try {
      return await this.request('/inventory/movements', { method: 'POST', body: data });
    } catch (err) {
      const art = mockDb.data.inventory.find(a => a.id === data.articleId);
      if (art) {
        const qty = Number(data.quantity);
        if (data.movementType === 'ENTRY') art.stock += qty;
        else if (data.movementType === 'EXIT') art.stock = Math.max(0, art.stock - qty);
        else if (data.movementType === 'ADJUSTMENT') art.stock = qty;
        mockDb.save();
      }
      return { success: true };
    }
  },

  /* -------------------------------------------------------------
     7. TOOLS & CUSTODY ENDPOINTS (/inventory/tools & /inventory/custody)
     ------------------------------------------------------------- */
  async getTools(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/inventory/tools?${query}`);
    } catch (err) {
      return { data: mockDb.data.tools, total: mockDb.data.tools.length };
    }
  },

  async createTool(data) {
    try {
      return await this.request('/inventory/tools', { method: 'POST', body: data });
    } catch (err) {
      const newTool = { id: 'tool-' + Date.now(), status: 'DISPONIBLE', ...data };
      mockDb.data.tools.push(newTool);
      mockDb.save();
      return newTool;
    }
  },

  async getCustodyItems(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/inventory/custody?${query}`);
    } catch (err) {
      return { data: mockDb.data.custody, total: mockDb.data.custody.length };
    }
  },

  async createCustodyItem(data) {
    try {
      return await this.request('/inventory/custody', { method: 'POST', body: data });
    } catch (err) {
      const newItem = { id: 'cst-' + Date.now(), isReturned: false, createdAt: new Date().toISOString(), ...data };
      mockDb.data.custody.unshift(newItem);
      mockDb.save();
      return newItem;
    }
  },

  async markCustodyReturned(id) {
    try {
      return await this.request(`/inventory/custody/${id}/return`, { method: 'POST' });
    } catch (err) {
      const item = mockDb.data.custody.find(c => c.id === id);
      if (item) item.isReturned = true;
      mockDb.save();
      return item;
    }
  },

  /* -------------------------------------------------------------
     8. SUPPLIERS & SPECIAL ORDERS
     ------------------------------------------------------------- */
  async getSuppliers(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/suppliers?${query}`);
    } catch (err) {
      return { data: mockDb.data.suppliers, total: mockDb.data.suppliers.length };
    }
  },

  async createSupplier(data) {
    try {
      return await this.request('/suppliers', { method: 'POST', body: data });
    } catch (err) {
      const newSup = { id: 'sup-' + Date.now(), isActive: true, ...data };
      mockDb.data.suppliers.push(newSup);
      mockDb.save();
      return newSup;
    }
  },

  async getSpecialOrderParts(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/special-order-parts?${query}`);
    } catch (err) {
      return { data: mockDb.data.specialOrderParts, total: mockDb.data.specialOrderParts.length };
    }
  },

  async createSpecialOrderPart(data) {
    try {
      return await this.request('/special-order-parts', { method: 'POST', body: data });
    } catch (err) {
      const newPart = { id: 'sop-' + Date.now(), status: 'PEDIDA', ...data };
      mockDb.data.specialOrderParts.push(newPart);
      mockDb.save();
      return newPart;
    }
  },

  /* -------------------------------------------------------------
     9. WORK ORDERS ENDPOINTS (/work-orders)
     ------------------------------------------------------------- */
  async getWorkOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/work-orders?${query}`);
    } catch (err) {
      let filtered = [...mockDb.data.workOrders];
      if (params.status) filtered = filtered.filter(w => w.operationalStatus === params.status);
      if (params.delayedOnly === 'true' || params.delayedOnly === true) filtered = filtered.filter(w => w.estaRetrasada);
      if (params.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter(w => w.code.toLowerCase().includes(s) || w.failureDescription.toLowerCase().includes(s));
      }
      return { data: filtered, total: filtered.length };
    }
  },

  async getWorkOrder(id) {
    try {
      return await this.request(`/work-orders/${id}`);
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === id);
      if (!wo) throw new Error('Orden de trabajo no encontrada');
      // Enrich with client, vehicle, notes, photos, and quotation
      const client = mockDb.data.clients.find(c => c.id === wo.clientId);
      const vehicle = mockDb.data.vehicles.find(v => v.id === wo.vehicleId);
      const quotation = mockDb.data.quotations[id] || null;
      return { ...wo, client, vehicle, quotation };
    }
  },

  async createWorkOrder(data) {
    try {
      return await this.request('/work-orders', { method: 'POST', body: data });
    } catch (err) {
      const codeNum = mockDb.data.workOrders.length + 1;
      const code = `OT-${String(codeNum).padStart(4, '0')}`;
      const id = 'wo-' + Date.now();
      const newWo = {
        id,
        code,
        clientId: data.clientId,
        vehicleId: data.vehicleId,
        serviceAdvisorId: 'usr-admin-1',
        technicianId: null,
        operationalStatus: 'RECIBIDA',
        commercialStatus: 'SIN_COTIZAR',
        billingStatus: 'NO_REQUERIDA',
        initialMileage: Number(data.mileageIn || 0),
        fuelLevel: Number(data.fuelLevel || 50),
        failureDescription: data.failureDescription,
        estaRetrasada: false,
        portalToken: 'portal-' + Date.now(),
        estimatedDeliveryDate: data.estimatedDelivery || new Date(Date.now() + 86400000 * 2).toISOString(),
        entryDate: new Date().toISOString(),
        checklist: data.checklist || { hasKeys: true },
        notes: [],
        photos: []
      };
      // Init empty quotation
      mockDb.data.quotations[id] = {
        id: 'q-' + Date.now(),
        workOrderId: id,
        subtotal: 0,
        discountType: 'PERCENT',
        discountValue: 0,
        discountAmount: 0,
        aplicaIva: true,
        taxAmount: 0,
        total: 0,
        clientApprovalStatus: 'PENDING',
        lines: []
      };
      mockDb.data.workOrders.unshift(newWo);
      mockDb.save();
      return newWo;
    }
  },

  async changeOperationalStatus(id, status) {
    try {
      return await this.request(`/work-orders/${id}/status`, {
        method: 'POST',
        body: { status }
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === id);
      if (wo) {
        wo.operationalStatus = status;
        mockDb.save();
      }
      return wo;
    }
  },

  async toggleDelayed(id, estaRetrasada) {
    try {
      return await this.request(`/work-orders/${id}/delayed`, {
        method: 'PATCH',
        body: { estaRetrasada }
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === id);
      if (wo) {
        wo.estaRetrasada = estaRetrasada;
        mockDb.save();
      }
      return wo;
    }
  },

  async addNote(id, content, isClientVisible = false) {
    try {
      return await this.request(`/work-orders/${id}/notes`, {
        method: 'POST',
        body: { content, isClientVisible }
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === id);
      const note = {
        id: 'note-' + Date.now(),
        content,
        isClientVisible,
        authorName: 'Usuario Actual',
        createdAt: new Date().toISOString()
      };
      if (wo) {
        if (!wo.notes) wo.notes = [];
        wo.notes.unshift(note);
        mockDb.save();
      }
      return note;
    }
  },

  async uploadPhoto(id, category, isPublic, caption, fileUrl) {
    try {
      // In live backend it's multipart/form-data
      return await this.request(`/work-orders/${id}/photos`, {
        method: 'POST',
        body: { category, isPublic, caption, photo: fileUrl }
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === id);
      const photo = {
        id: 'photo-' + Date.now(),
        url: fileUrl || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
        category: category || 'PROCESS',
        isPublic: Boolean(isPublic),
        caption: caption || 'Foto agregada a la orden'
      };
      if (wo) {
        if (!wo.photos) wo.photos = [];
        wo.photos.unshift(photo);
        mockDb.save();
      }
      return photo;
    }
  },

  /* -------------------------------------------------------------
     10. QUOTATIONS ENDPOINTS (/work-orders/:woId/quotation)
     ------------------------------------------------------------- */
  async getQuotation(woId) {
    try {
      return await this.request(`/work-orders/${woId}/quotation`);
    } catch (err) {
      return mockDb.data.quotations[woId] || {
        id: 'q-' + Date.now(),
        workOrderId: woId,
        subtotal: 0,
        discountType: 'PERCENT',
        discountValue: 0,
        discountAmount: 0,
        aplicaIva: true,
        taxAmount: 0,
        total: 0,
        clientApprovalStatus: 'PENDING',
        lines: []
      };
    }
  },

  async addQuotationLine(woId, lineData) {
    try {
      return await this.request(`/work-orders/${woId}/quotation/lines`, {
        method: 'POST',
        body: lineData
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      if (!quote) throw err;
      
      let price = 500;
      let concept = lineData.concept || 'Partida de cotización';

      if (lineData.lineType === 'SERVICE' && lineData.serviceId) {
        const s = mockDb.data.services.find(srv => srv.id === lineData.serviceId);
        if (s) {
          price = Number(s.basePrice);
          concept = s.concept;
        }
      } else if (lineData.lineType === 'PART' && lineData.articleId) {
        const a = mockDb.data.inventory.find(art => art.id === lineData.articleId);
        if (a) {
          price = Number(a.salePrice);
          concept = a.name;
        }
      }

      const newLine = {
        id: 'ql-' + Date.now(),
        lineType: lineData.lineType,
        serviceId: lineData.serviceId || null,
        articleId: lineData.articleId || null,
        concept,
        quantity: Number(lineData.quantity || 1),
        unitPrice: price,
        finalPrice: price,
        approvalStatus: 'PENDING',
        priceOverrideReason: null
      };

      quote.lines.push(newLine);
      this._recalculateQuote(quote);
      mockDb.save();

      // Advance commercial status of WO
      const wo = mockDb.data.workOrders.find(w => w.id === woId);
      if (wo && wo.commercialStatus === 'SIN_COTIZAR') {
        wo.commercialStatus = 'COTIZADA';
      }
      return newLine;
    }
  },

  async overrideLinePrice(woId, lineId, finalPrice, reason) {
    try {
      return await this.request(`/work-orders/${woId}/quotation/lines/${lineId}/override-price`, {
        method: 'PATCH',
        body: { finalPrice, reason }
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      if (quote) {
        const line = quote.lines.find(l => l.id === lineId);
        if (line) {
          line.finalPrice = Number(finalPrice);
          line.priceOverrideReason = reason;
          this._recalculateQuote(quote);
          mockDb.save();
        }
      }
      return quote;
    }
  },

  async approveQuotationLines(woId, decisions) {
    try {
      return await this.request(`/work-orders/${woId}/quotation/approve`, {
        method: 'POST',
        body: { decisions }
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      if (quote) {
        decisions.forEach(d => {
          const l = quote.lines.find(line => line.id === d.lineId);
          if (l) {
            l.approvalStatus = d.status;
            l.rejectionReason = d.rejectionReason || null;
          }
        });
        const approvedCount = quote.lines.filter(l => l.approvalStatus === 'APPROVED').length;
        if (approvedCount === quote.lines.length) quote.clientApprovalStatus = 'APROBADA_TOTAL';
        else if (approvedCount > 0) quote.clientApprovalStatus = 'APROBADA_PARCIAL';
        else quote.clientApprovalStatus = 'REJECTED';

        this._recalculateQuote(quote);
        mockDb.save();

        const wo = mockDb.data.workOrders.find(w => w.id === woId);
        if (wo) {
          wo.commercialStatus = quote.clientApprovalStatus;
          if (approvedCount > 0 && wo.operationalStatus === 'EN_ESPERA_APROBACION') {
            wo.operationalStatus = 'EN_REPARACION';
          }
        }
      }
      return quote;
    }
  },

  async setQuotationDiscount(woId, discountType, discountValue, aplicaIva = true) {
    try {
      return await this.request(`/work-orders/${woId}/quotation/discount`, {
        method: 'POST',
        body: { discountType, discountValue, aplicaIva }
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      if (quote) {
        quote.discountType = discountType;
        quote.discountValue = Number(discountValue);
        quote.aplicaIva = Boolean(aplicaIva);
        this._recalculateQuote(quote);
        mockDb.save();
      }
      return quote;
    }
  },

  async removeQuotationLine(woId, lineId) {
    try {
      return await this.request(`/work-orders/${woId}/quotation/lines/${lineId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      if (quote) {
        quote.lines = quote.lines.filter(l => l.id !== lineId);
        this._recalculateQuote(quote);
        mockDb.save();
      }
      return { success: true };
    }
  },

  _recalculateQuote(quote) {
    let subtotal = 0;
    quote.lines.forEach(l => {
      subtotal += Number(l.quantity) * Number(l.finalPrice);
    });
    quote.subtotal = Number(subtotal.toFixed(2));

    let discountAmount = 0;
    if (quote.discountType === 'PERCENT') {
      discountAmount = quote.subtotal * (Number(quote.discountValue || 0) / 100);
    } else {
      discountAmount = Math.min(Number(quote.discountValue || 0), quote.subtotal);
    }
    quote.discountAmount = Number(discountAmount.toFixed(2));

    const taxableBase = Math.max(0, quote.subtotal - quote.discountAmount);
    quote.taxAmount = quote.aplicaIva ? Number((taxableBase * 0.16).toFixed(2)) : 0;
    quote.total = Number((taxableBase + quote.taxAmount).toFixed(2));
  },

  /* -------------------------------------------------------------
     11. COMMERCIAL CLOSE & INVOICING
     ------------------------------------------------------------- */
  async executeCommercialClose(woId, requiresInvoice = false, notes = '') {
    try {
      return await this.request(`/work-orders/${woId}/commercial-close`, {
        method: 'POST',
        body: { requiresInvoice, notes }
      });
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      const total = quote ? quote.total : 1500;
      
      // Calculate already paid advances
      const existingPayments = mockDb.data.payments.filter(p => p.workOrderId === woId);
      const totalPaid = existingPayments.reduce((acc, p) => acc + Number(p.amount), 0);
      const balance = Math.max(0, total - totalPaid);

      const closeObj = {
        workOrderId: woId,
        frozenTotal: total,
        requiresInvoice,
        notes,
        closedAt: new Date().toISOString()
      };
      mockDb.data.commercialCloses[woId] = closeObj;

      // Upsert CxC
      const existingCxc = mockDb.data.receivables.find(r => r.workOrderId === woId);
      if (existingCxc) {
        existingCxc.originalAmount = total;
        existingCxc.paidAmount = totalPaid;
        existingCxc.balance = balance;
        existingCxc.status = balance === 0 ? 'PAID' : 'PARTIAL';
      } else {
        mockDb.data.receivables.push({
          id: 'cxc-' + Date.now(),
          workOrderId: woId,
          originalAmount: total,
          paidAmount: totalPaid,
          balance,
          status: balance === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'OPEN',
          createdAt: new Date().toISOString()
        });
      }

      // Update WO billing & commercial status
      const wo = mockDb.data.workOrders.find(w => w.id === woId);
      if (wo) {
        wo.commercialStatus = balance === 0 ? 'COBRADA_TOTAL' : 'CIERRE_PENDIENTE';
        if (!requiresInvoice) {
          wo.billingStatus = 'NO_REQUERIDA';
        } else {
          const client = mockDb.data.clients.find(c => c.id === wo.clientId);
          wo.billingStatus = (client && client.rfc && client.zipCode) ? 'LISTA_PARA_FACTURAR' : 'PENDIENTE_DATOS';
        }
      }

      mockDb.save();
      return closeObj;
    }
  },

  async getPendingInvoicingQueue(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/invoicing/pending?${query}`);
    } catch (err) {
      const pendingList = mockDb.data.workOrders
        .filter(wo => wo.billingStatus === 'PENDIENTE_DATOS' || wo.billingStatus === 'LISTA_PARA_FACTURAR')
        .map(wo => {
          const client = mockDb.data.clients.find(c => c.id === wo.clientId);
          const quote = mockDb.data.quotations[wo.id];
          const missingFields = [];
          if (!client || !client.rfc) missingFields.push('RFC');
          if (!client || !client.zipCode) missingFields.push('Código Postal');
          if (!client || !client.taxRegime) missingFields.push('Régimen Fiscal');
          if (!client || !client.cfdiUse) missingFields.push('Uso CFDI');
          return {
            workOrderId: wo.id,
            workOrderCode: wo.code,
            clientId: wo.clientId,
            clientName: client ? client.name : 'Cliente General',
            billingStatus: wo.billingStatus,
            totalAmount: quote ? quote.total : 0,
            missingFields
          };
        });
      return { data: pendingList, total: pendingList.length };
    }
  },

  async updateFiscalData(woId, fiscalData) {
    try {
      return await this.request(`/invoicing/work-orders/${woId}/fiscal-data`, {
        method: 'PUT',
        body: fiscalData
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === woId);
      if (wo) {
        wo.billingStatus = 'LISTA_PARA_FACTURAR';
        const client = mockDb.data.clients.find(c => c.id === wo.clientId);
        if (client && fiscalData.applyToClient) {
          client.rfc = fiscalData.rfc;
          client.businessName = fiscalData.businessName;
          client.zipCode = fiscalData.zipCode;
          client.taxRegime = fiscalData.taxRegime;
          client.cfdiUse = fiscalData.cfdiUse;
        }
        mockDb.save();
      }
      return { success: true };
    }
  },

  async emitInvoice(woId, satData) {
    try {
      return await this.request(`/invoicing/work-orders/${woId}/emit`, {
        method: 'POST',
        body: satData
      });
    } catch (err) {
      const wo = mockDb.data.workOrders.find(w => w.id === woId);
      const client = wo ? mockDb.data.clients.find(c => c.id === wo.clientId) : null;
      const quote = wo ? mockDb.data.quotations[woId] : null;

      const foliosCount = mockDb.data.invoices.length + 1;
      const invoiceNumber = `FAC-${String(foliosCount).padStart(4, '0')}`;

      const newInvoice = {
        id: 'inv-' + Date.now(),
        invoiceNumber,
        workOrderId: woId,
        receiverRfc: client ? client.rfc : 'XAXX010101000',
        receiverName: client ? client.businessName || client.name : 'Público en General',
        receiverZipCode: client ? client.zipCode : '03100',
        receiverTaxRegime: client ? client.taxRegime : '612',
        cfdiUse: client ? client.cfdiUse : 'G03',
        paymentMethodSat: satData.paymentMethodSat || 'PUE',
        paymentFormSat: satData.paymentFormSat || '03',
        subtotal: quote ? quote.subtotal : 1000,
        discountAmount: quote ? quote.discountAmount : 0,
        taxAmount: quote ? quote.taxAmount : 160,
        total: quote ? quote.total : 1160,
        status: 'ISSUED',
        uuid: 'sat-uuid-' + Math.random().toString(36).substring(2, 12),
        notes: satData.notes || '',
        createdAt: new Date().toISOString()
      };

      mockDb.data.invoices.unshift(newInvoice);
      if (wo) wo.billingStatus = 'FACTURADA';
      mockDb.save();
      return newInvoice;
    }
  },

  async getInvoices(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/invoicing/invoices?${query}`);
    } catch (err) {
      return { data: mockDb.data.invoices, total: mockDb.data.invoices.length };
    }
  },

  async cancelInvoice(id, satReasonCode, cancellationReason) {
    try {
      return await this.request(`/invoicing/invoices/${id}/cancel`, {
        method: 'POST',
        body: { satReasonCode, cancellationReason }
      });
    } catch (err) {
      const inv = mockDb.data.invoices.find(i => i.id === id);
      if (inv) {
        inv.status = 'CANCELLED';
        inv.cancellationReason = cancellationReason;
        const wo = mockDb.data.workOrders.find(w => w.id === inv.workOrderId);
        if (wo) wo.billingStatus = 'CANCELADA';
        mockDb.save();
      }
      return inv;
    }
  },

  /* -------------------------------------------------------------
     12. PAYMENTS & FINANCE ENDPOINTS (/payments & /finance)
     ------------------------------------------------------------- */
  async getPaymentSummary(woId) {
    try {
      return await this.request(`/work-orders/${woId}/payments/summary`);
    } catch (err) {
      const quote = mockDb.data.quotations[woId];
      const total = quote ? quote.total : 0;
      const pays = mockDb.data.payments.filter(p => p.workOrderId === woId);
      const paid = pays.reduce((acc, p) => acc + Number(p.amount), 0);
      return {
        totalBilled: total,
        totalPaid: paid,
        balanceDue: Math.max(0, total - paid),
        paymentsCount: pays.length
      };
    }
  },

  async getPayments(woId) {
    try {
      return await this.request(`/work-orders/${woId}/payments`);
    } catch (err) {
      return mockDb.data.payments.filter(p => p.workOrderId === woId);
    }
  },

  async createPayment(woId, data) {
    try {
      return await this.request(`/work-orders/${woId}/payments`, {
        method: 'POST',
        body: data
      });
    } catch (err) {
      const amt = Number(data.amount);
      const comm = Number(data.terminalCommission || 0);
      const net = amt - comm;

      const newPay = {
        id: 'pay-' + Date.now(),
        workOrderId: woId,
        type: data.type,
        paymentMethod: data.paymentMethod,
        amount: amt,
        terminalCommission: comm,
        netAmount: net,
        reference: data.reference || '',
        notes: data.notes || '',
        createdAt: new Date().toISOString()
      };

      mockDb.data.payments.unshift(newPay);

      // Register Cash Movement
      mockDb.data.cashMovements.unshift({
        id: 'cm-' + Date.now(),
        type: 'INCOME',
        amount: net,
        concept: `Pago OT (${data.paymentMethod}) - Ref: ${data.reference || 'N/A'}`,
        createdAt: new Date().toISOString()
      });

      // Update CxC & WO
      const cxc = mockDb.data.receivables.find(r => r.workOrderId === woId);
      if (cxc) {
        cxc.paidAmount += amt;
        cxc.balance = Math.max(0, cxc.originalAmount - cxc.paidAmount);
        cxc.status = cxc.balance === 0 ? 'PAID' : 'PARTIAL';
      }

      const wo = mockDb.data.workOrders.find(w => w.id === woId);
      if (wo) {
        wo.commercialStatus = (cxc && cxc.balance === 0) ? 'COBRADA_TOTAL' : 'COBRADA_PARCIAL';
      }

      mockDb.save();
      return newPay;
    }
  },

  async getReceivables(params = {}) {
    const query = new URLSearchParams(params).toString();
    try {
      return await this.request(`/finance/receivables?${query}`);
    } catch (err) {
      const enriched = mockDb.data.receivables.map(r => {
        const wo = mockDb.data.workOrders.find(w => w.id === r.workOrderId);
        const client = wo ? mockDb.data.clients.find(c => c.id === wo.clientId) : null;
        return {
          ...r,
          workOrderCode: wo ? wo.code : 'OT-XXXX',
          clientName: client ? client.name : 'Cliente'
        };
      });
      return { data: enriched, total: enriched.length };
    }
  },

  async getCashMovements() {
    try {
      return await this.request('/finance/cash-movements');
    } catch (err) {
      return mockDb.data.cashMovements;
    }
  },

  async createCashMovement(type, amount, concept) {
    try {
      return await this.request('/finance/cash-movements', {
        method: 'POST',
        body: { type, amount, concept }
      });
    } catch (err) {
      const newMv = {
        id: 'cm-' + Date.now(),
        type,
        amount: Number(amount),
        concept,
        createdAt: new Date().toISOString()
      };
      mockDb.data.cashMovements.unshift(newMv);
      mockDb.save();
      return newMv;
    }
  },

  async getFinancialReport(from, to) {
    try {
      const q = new URLSearchParams({ from, to }).toString();
      return await this.request(`/finance/report?${q}`);
    } catch (err) {
      // Computes aggregated financial totals
      let grossSales = 0;
      let totalDiscounts = 0;
      let totalIva = 0;

      Object.values(mockDb.data.quotations).forEach(q => {
        grossSales += q.subtotal;
        totalDiscounts += q.discountAmount;
        totalIva += q.taxAmount;
      });

      let totalCommissions = 0;
      let cashNet = 0;

      mockDb.data.payments.forEach(p => {
        totalCommissions += Number(p.terminalCommission || 0);
      });

      mockDb.data.cashMovements.forEach(cm => {
        if (cm.type === 'INCOME') cashNet += cm.amount;
        else if (cm.type === 'EXPENSE') cashNet -= cm.amount;
      });

      return {
        grossSales,
        totalDiscounts,
        totalIva,
        totalCommissions,
        netCashFlow: cashNet,
        periodFrom: from || '2026-01-01',
        periodTo: to || new Date().toISOString()
      };
    }
  }
};
