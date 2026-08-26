export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export type ExitType = 'sale' | 'damaged' | 'adjustment' | 'sample' | 'return_to_supplier';

export type SalesChannel = 'Tienda Web' | 'WhatsApp' | 'Instagram' | 'Punto Físico' | 'MercadoLibre' | 'Otro';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string;
  costPrice: number;       // Costo real unitario de compra
  sellingPrice: number;    // Precio de venta al público
  currentStock: number;    // Stock disponible actual
  minStock: number;        // Umbral mínimo para disparar alerta
  unit: string;            // 'unidades' | 'frascos' | 'cajas' | 'paquetes' | 'g' | 'ml'
  supplier?: string;       // Proveedor habitual
  location?: string;       // Ubicación en almacén/estante
  createdAt: string;
  updatedAt: string;
}

export interface StockEntry {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitCost: number;        // Costo de compra unitario en este lote
  totalCost: number;       // quantity * unitCost
  supplier: string;
  invoiceRef?: string;     // Número de factura / lote / comprobante
  date: string;            // ISO String
  notes?: string;
  updateProductCost: boolean; // Si actualiza el costo base del producto
  registeredBy?: string;   // Nombre o ID de usuario que registró
}

export interface StockExit {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitSellingPrice: number;// Precio unitario cobrado
  unitCostPrice: number;   // Costo real unitario al momento de salida
  totalRevenue: number;    // quantity * unitSellingPrice
  totalCost: number;       // quantity * unitCostPrice
  profit: number;          // totalRevenue - totalCost
  profitMarginPercent: number; // ((profit / totalRevenue) * 100)
  type: ExitType;
  channel: SalesChannel;
  customerName?: string;
  orderRef?: string;       // N° de pedido / recibo
  date: string;            // ISO String
  notes?: string;
  registeredBy?: string;   // Nombre o ID de usuario que registró
}

// User & Role Management Types
export type UserRole = 'admin' | 'manager' | 'warehouse' | 'sales' | 'auditor';

export interface UserPermissions {
  canManageProducts: boolean;      // Crear y editar productos
  canDeleteProducts: boolean;      // Eliminar productos del catálogo
  canEditCostPrices: boolean;      // Ver y modificar costos de adquisición
  canRegisterEntries: boolean;     // Registrar ingresos / compras
  canDeleteEntries: boolean;       // Eliminar registros de entradas
  canRegisterExits: boolean;       // Registrar salidas / ventas
  canDeleteExits: boolean;         // Eliminar registros de ventas/salidas
  canViewFinancialReports: boolean;// Consultar dashboard financiero y utilidades
  canManageUsers: boolean;         // Crear, editar y dar permisos a usuarios
  canManageSettings: boolean;      // Modificar parámetros del sistema y base de datos
  canExportData: boolean;          // Descargar reportes CSV / JSON
  canViewAuditLogs: boolean;       // Ver la bitácora de auditoría
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatarColor: 'emerald' | 'sky' | 'amber' | 'purple' | 'rose' | 'indigo';
  initials: string;
  status: 'active' | 'inactive';
  pin?: string;
  createdAt: string;
  lastLogin: string;
  permissions: UserPermissions;
}

// Audit Log / Bitácora Types
export type AuditModule = 'inventory' | 'entries' | 'exits' | 'reports' | 'users' | 'settings' | 'security';
export type AuditSeverity = 'info' | 'success' | 'warning' | 'danger';

export type AuditActionType =
  | 'PRODUCT_CREATE'
  | 'PRODUCT_UPDATE'
  | 'PRODUCT_DELETE'
  | 'STOCK_ENTRY'
  | 'STOCK_ENTRY_DELETE'
  | 'STOCK_EXIT'
  | 'STOCK_EXIT_DELETE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_SWITCH'
  | 'SETTINGS_UPDATE'
  | 'DATA_EXPORT'
  | 'DATABASE_RESET'
  | 'DATABASE_CLEAR';

export interface AuditLogEntry {
  id: string;
  timestamp: string;               // ISO String
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  userAvatarColor: string;
  action: AuditActionType;
  actionTitle: string;
  module: AuditModule;
  severity: AuditSeverity;
  targetId?: string;               // ID o SKU del recurso afectado
  targetName?: string;             // Nombre del recurso afectado
  description: string;             // Detalle humano del cambio
  details?: Record<string, any>;   // Diff o metadata extendida
}

export type ActiveTab = 'inventory' | 'entries' | 'exits' | 'reports' | 'alerts' | 'audit' | 'users';

export type CurrencyCode = 'USD' | 'CRC' | 'EUR' | 'MXN' | 'COP';

export interface AppSettings {
  currency: CurrencyCode;
  currencySymbol: string;
  businessName: string;
  taxRate: number; // Porcentaje de impuesto opcional si aplica
  enableAuditLock: boolean; // Si requiere PIN para acciones críticas
}

