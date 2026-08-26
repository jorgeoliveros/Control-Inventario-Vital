import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, StockEntry, StockExit, AppSettings, User, UserPermissions, AuditLogEntry, AuditActionType, AuditModule, AuditSeverity } from '../types';
import { initialProducts, initialStockEntries, initialStockExits, initialSettings, initialUsers, initialAuditLogs, rolePresets } from '../data/initialData';
import { calculateProfitMargin } from '../utils/formatters';

interface InventoryContextType {
  products: Product[];
  entries: StockEntry[];
  exits: StockExit[];
  settings: AppSettings;
  users: User[];
  currentUser: User;
  auditLogs: AuditLogEntry[];
  // User & Permission methods
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string, pin?: string) => { success: boolean; error?: string };
  addUser: (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => { success: boolean; error?: string };
  hasPermission: (permission: keyof UserPermissions) => boolean;
  // Audit Log methods
  logAuditEvent: (entry: {
    action: AuditActionType;
    actionTitle: string;
    module: AuditModule;
    severity?: AuditSeverity;
    targetId?: string;
    targetName?: string;
    description: string;
    details?: Record<string, any>;
    customUser?: User;
  }) => void;
  clearAuditLogs: () => void;
  // Core Business operations
  addProduct: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  registerStockEntry: (entryData: {
    productId: string;
    quantity: number;
    unitCost: number;
    supplier: string;
    invoiceRef?: string;
    date: string;
    notes?: string;
    updateProductCost: boolean;
  }) => StockEntry | null;
  registerStockExit: (exitData: {
    productId: string;
    quantity: number;
    unitSellingPrice?: number;
    type: StockExit['type'];
    channel: StockExit['channel'];
    customerName?: string;
    orderRef?: string;
    date: string;
    notes?: string;
  }) => { exit: StockExit; error?: string } | null;
  deleteStockEntry: (id: string) => void;
  deleteStockExit: (id: string) => void;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetToDemoData: () => void;
  clearAllData: () => void;
  // Computed metrics
  lowStockProducts: Product[];
  outOfStockProducts: Product[];
  criticalAlertCount: number;
  totalInventoryCost: number;
  totalInventoryRetailValue: number;
  totalPotentialProfit: number;
  totalRevenue: number;
  totalCOGS: number;
  totalRealizedProfit: number;
  overallMarginPercent: number;
  totalItemsInStock: number;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PRODUCTS: 'vital_inventory_products_v2',
  ENTRIES: 'vital_inventory_entries_v2',
  EXITS: 'vital_inventory_exits_v2',
  SETTINGS: 'vital_inventory_settings_v2',
  USERS: 'vital_inventory_users_v2',
  CURRENT_USER_ID: 'vital_inventory_current_user_id_v2',
  AUDIT_LOGS: 'vital_inventory_audit_logs_v2',
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialProducts;
  });

  const [entries, setEntries] = useState<StockEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialStockEntries;
  });

  const [exits, setExits] = useState<StockExit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXITS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialStockExits;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialSettings;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialUsers;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
    if (saved) return saved;
    return initialUsers[0]?.id || 'user-admin-1';
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return initialAuditLogs;
  });

  const currentUser = useMemo(() => {
    const found = users.find(u => u.id === currentUserId);
    return found || users[0] || initialUsers[0];
  }, [users, currentUserId]);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXITS, JSON.stringify(exits));
  }, [exits]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Helper to log audit events
  const logAuditEvent = (entryData: {
    action: AuditActionType;
    actionTitle: string;
    module: AuditModule;
    severity?: AuditSeverity;
    targetId?: string;
    targetName?: string;
    description: string;
    details?: Record<string, any>;
    customUser?: User;
  }) => {
    const actor = entryData.customUser || currentUser;
    const newLog: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: actor.id,
      userName: actor.name,
      userEmail: actor.email,
      userRole: actor.role,
      userAvatarColor: actor.avatarColor,
      action: entryData.action,
      actionTitle: entryData.actionTitle,
      module: entryData.module,
      severity: entryData.severity || 'info',
      targetId: entryData.targetId,
      targetName: entryData.targetName,
      description: entryData.description,
      details: entryData.details,
    };

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const clearAuditLogs = () => {
    setAuditLogs([]);
    logAuditEvent({
      action: 'DATABASE_CLEAR',
      actionTitle: 'Vaciado de Bitácora',
      module: 'security',
      severity: 'danger',
      description: 'El administrador vació el registro histórico de la bitácora.',
    });
  };

  // Permission check helper
  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser || currentUser.status === 'inactive') return false;
    if (currentUser.role === 'admin') return true;
    return !!currentUser.permissions?.[permission];
  };

  // User Management
  const setCurrentUser = (user: User) => {
    setCurrentUserId(user.id);
  };

  const switchUser = (userId: string, pin?: string): { success: boolean; error?: string } => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Usuario no encontrado.' };
    }
    if (targetUser.status === 'inactive') {
      return { success: false, error: 'Este usuario está inactivo. Contacta a un Administrador.' };
    }

    if (settings.enableAuditLock && targetUser.pin && pin && targetUser.pin !== pin) {
      return { success: false, error: 'PIN de seguridad incorrecto.' };
    }

    // Update lastLogin
    setUsers(prev =>
      prev.map(u => (u.id === userId ? { ...u, lastLogin: new Date().toISOString() } : u))
    );
    setCurrentUserId(userId);

    logAuditEvent({
      action: 'USER_SWITCH',
      actionTitle: 'Cambio de Sesión Activa',
      module: 'security',
      severity: 'info',
      targetId: targetUser.id,
      targetName: targetUser.name,
      description: `Sesión activa cambiada a ${targetUser.name} (${targetUser.roleTitle}).`,
      customUser: targetUser,
    });

    return { success: true };
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt' | 'lastLogin'>): User => {
    const initials = userData.name
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'US';

    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      initials,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);

    logAuditEvent({
      action: 'USER_CREATE',
      actionTitle: 'Nuevo Usuario Registrado',
      module: 'users',
      severity: 'success',
      targetId: newUser.id,
      targetName: newUser.name,
      description: `Creó el usuario "${newUser.name}" con rol "${newUser.roleTitle}" (${newUser.email}).`,
      details: { role: newUser.role, permissions: newUser.permissions },
    });

    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    const existing = users.find(u => u.id === id);
    if (!existing) return;

    let newInitials = existing.initials;
    if (updates.name && updates.name !== existing.name) {
      newInitials = updates.name
        .split(' ')
        .filter(Boolean)
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'US';
    }

    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          return {
            ...u,
            ...updates,
            initials: newInitials,
          };
        }
        return u;
      })
    );

    logAuditEvent({
      action: 'USER_UPDATE',
      actionTitle: 'Usuario Modificado',
      module: 'users',
      severity: 'info',
      targetId: id,
      targetName: updates.name || existing.name,
      description: `Modificó datos/permisos del usuario "${updates.name || existing.name}".`,
      details: { updates },
    });
  };

  const deleteUser = (id: string): { success: boolean; error?: string } => {
    const target = users.find(u => u.id === id);
    if (!target) return { success: false, error: 'Usuario no encontrado.' };

    const admins = users.filter(u => u.role === 'admin' && u.status === 'active');
    if (target.role === 'admin' && admins.length <= 1) {
      return { success: false, error: 'No puedes eliminar el único Administrador activo del sistema.' };
    }

    if (target.id === currentUserId) {
      return { success: false, error: 'No puedes eliminar tu propio usuario activo en sesión.' };
    }

    setUsers(prev => prev.filter(u => u.id !== id));

    logAuditEvent({
      action: 'USER_DELETE',
      actionTitle: 'Usuario Eliminado',
      module: 'users',
      severity: 'danger',
      targetId: target.id,
      targetName: target.name,
      description: `Eliminó permanentemente el usuario "${target.name}" (${target.email}).`,
    });

    return { success: true };
  };

  // Product Actions
  const addProduct = (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setProducts(prev => [newProduct, ...prev]);

    // If initial stock was given > 0, log an initial stock entry automatically
    if (newProduct.currentStock > 0) {
      const initialEntry: StockEntry = {
        id: `entry-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        productSku: newProduct.sku,
        quantity: newProduct.currentStock,
        unitCost: newProduct.costPrice,
        totalCost: Number((newProduct.currentStock * newProduct.costPrice).toFixed(2)),
        supplier: newProduct.supplier || 'Inventario Inicial',
        invoiceRef: 'INICIAL',
        date: newProduct.createdAt,
        notes: 'Carga de inventario inicial',
        updateProductCost: false,
        registeredBy: currentUser.name,
      };
      setEntries(prev => [initialEntry, ...prev]);
    }

    const margin = calculateProfitMargin(newProduct.costPrice, newProduct.sellingPrice);

    logAuditEvent({
      action: 'PRODUCT_CREATE',
      actionTitle: 'Nuevo Producto Agregado',
      module: 'inventory',
      severity: 'success',
      targetId: newProduct.sku,
      targetName: newProduct.name,
      description: `Registró producto "${newProduct.name}" (SKU: ${newProduct.sku}) con stock inicial ${newProduct.currentStock} ${newProduct.unit}, costo $${newProduct.costPrice.toFixed(2)}, venta $${newProduct.sellingPrice.toFixed(2)} (${margin.marginPercent}% margen).`,
      details: { sku: newProduct.sku, cost: newProduct.costPrice, price: newProduct.sellingPrice, stock: newProduct.currentStock },
    });

    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    const existing = products.find(p => p.id === id);
    if (!existing) return;

    setProducts(prev =>
      prev.map(p => {
        if (p.id === id) {
          return {
            ...p,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    const priceChanged = updates.sellingPrice !== undefined && updates.sellingPrice !== existing.sellingPrice;
    const costChanged = updates.costPrice !== undefined && updates.costPrice !== existing.costPrice;

    let desc = `Actualizó el producto "${existing.name}" (SKU: ${existing.sku}).`;
    if (priceChanged || costChanged) {
      desc = `Modificó valores financieros en "${existing.name}": `;
      if (costChanged) desc += `Costo $${existing.costPrice.toFixed(2)} ➔ $${(updates.costPrice ?? existing.costPrice).toFixed(2)}. `;
      if (priceChanged) desc += `Precio $${existing.sellingPrice.toFixed(2)} ➔ $${(updates.sellingPrice ?? existing.sellingPrice).toFixed(2)}.`;
    }

    logAuditEvent({
      action: 'PRODUCT_UPDATE',
      actionTitle: priceChanged || costChanged ? 'Actualización de Precios/Costos' : 'Edición de Producto',
      module: 'inventory',
      severity: priceChanged || costChanged ? 'warning' : 'info',
      targetId: existing.sku,
      targetName: existing.name,
      description: desc,
      details: { updates, previous: { costPrice: existing.costPrice, sellingPrice: existing.sellingPrice, minStock: existing.minStock } },
    });
  };

  const deleteProduct = (id: string) => {
    const existing = products.find(p => p.id === id);
    if (!existing) return;

    setProducts(prev => prev.filter(p => p.id !== id));

    logAuditEvent({
      action: 'PRODUCT_DELETE',
      actionTitle: 'Producto Eliminado',
      module: 'inventory',
      severity: 'danger',
      targetId: existing.sku,
      targetName: existing.name,
      description: `Eliminó permanentemente "${existing.name}" (SKU: ${existing.sku}) que tenía ${existing.currentStock} unidades registradas.`,
      details: { sku: existing.sku, lastStock: existing.currentStock },
    });
  };

  // Stock Entry Action (Ingreso de mercancía)
  const registerStockEntry = (entryData: {
    productId: string;
    quantity: number;
    unitCost: number;
    supplier: string;
    invoiceRef?: string;
    date: string;
    notes?: string;
    updateProductCost: boolean;
  }): StockEntry | null => {
    const product = products.find(p => p.id === entryData.productId);
    if (!product) return null;

    const totalCost = Number((entryData.quantity * entryData.unitCost).toFixed(2));
    const newEntry: StockEntry = {
      id: `entry-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: entryData.quantity,
      unitCost: entryData.unitCost,
      totalCost,
      supplier: entryData.supplier,
      invoiceRef: entryData.invoiceRef,
      date: entryData.date || new Date().toISOString(),
      notes: entryData.notes,
      updateProductCost: entryData.updateProductCost,
      registeredBy: currentUser.name,
    };

    // Update Product: increase stock and optionally update costPrice
    setProducts(prev =>
      prev.map(p => {
        if (p.id === entryData.productId) {
          return {
            ...p,
            currentStock: p.currentStock + entryData.quantity,
            costPrice: entryData.updateProductCost ? entryData.unitCost : p.costPrice,
            supplier: entryData.supplier || p.supplier,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    setEntries(prev => [newEntry, ...prev]);

    logAuditEvent({
      action: 'STOCK_ENTRY',
      actionTitle: `Ingreso de Stock (+${entryData.quantity} u.)`,
      module: 'entries',
      severity: 'info',
      targetId: product.sku,
      targetName: product.name,
      description: `Ingresó +${entryData.quantity} ${product.unit} de "${product.name}" (${entryData.supplier || 'Proveedor'}) por $${totalCost.toFixed(2)} (#${entryData.invoiceRef || 'S/N'}). Stock resultante: ${product.currentStock + entryData.quantity}.`,
      details: { quantity: entryData.quantity, unitCost: entryData.unitCost, totalCost, supplier: entryData.supplier, invoiceRef: entryData.invoiceRef },
    });

    return newEntry;
  };

  // Stock Exit Action (Salida / Venta registrada)
  const registerStockExit = (exitData: {
    productId: string;
    quantity: number;
    unitSellingPrice?: number;
    type: StockExit['type'];
    channel: StockExit['channel'];
    customerName?: string;
    orderRef?: string;
    date: string;
    notes?: string;
  }): { exit: StockExit; error?: string } | null => {
    const product = products.find(p => p.id === exitData.productId);
    if (!product) return null;

    if (product.currentStock < exitData.quantity) {
      return {
        exit: {} as StockExit,
        error: `Stock insuficiente. Disponibles: ${product.currentStock} ${product.unit}, solicitados: ${exitData.quantity}`,
      };
    }

    const unitSellingPrice = exitData.unitSellingPrice ?? product.sellingPrice;
    const unitCostPrice = product.costPrice;

    const isSale = exitData.type === 'sale';
    const totalRevenue = isSale ? Number((exitData.quantity * unitSellingPrice).toFixed(2)) : 0;
    const totalCost = Number((exitData.quantity * unitCostPrice).toFixed(2));
    const profit = Number((totalRevenue - totalCost).toFixed(2));
    const profitMarginPercent = totalRevenue > 0 ? Number(((profit / totalRevenue) * 100).toFixed(2)) : (isSale ? -100 : 0);

    const newExit: StockExit = {
      id: `exit-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      quantity: exitData.quantity,
      unitSellingPrice: isSale ? unitSellingPrice : 0,
      unitCostPrice,
      totalRevenue,
      totalCost,
      profit,
      profitMarginPercent,
      type: exitData.type,
      channel: exitData.channel,
      customerName: exitData.customerName,
      orderRef: exitData.orderRef,
      date: exitData.date || new Date().toISOString(),
      notes: exitData.notes,
      registeredBy: currentUser.name,
    };

    // Deduct stock from product
    setProducts(prev =>
      prev.map(p => {
        if (p.id === exitData.productId) {
          return {
            ...p,
            currentStock: Math.max(0, p.currentStock - exitData.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );

    setExits(prev => [newExit, ...prev]);

    const remaining = product.currentStock - exitData.quantity;
    const typeLabel = isSale ? 'Venta' : exitData.type === 'damaged' ? 'Merma / Dañado' : exitData.type === 'sample' ? 'Muestra' : 'Ajuste';

    logAuditEvent({
      action: 'STOCK_EXIT',
      actionTitle: isSale ? `Venta Registrada (-${exitData.quantity} u.)` : `Salida por ${typeLabel} (-${exitData.quantity} u.)`,
      module: 'exits',
      severity: remaining <= product.minStock ? 'warning' : 'success',
      targetId: product.sku,
      targetName: product.name,
      description: isSale
        ? `Despachó -${exitData.quantity} u. de "${product.name}" vía ${exitData.channel} a ${exitData.customerName || 'Cliente'}. Cobro: $${totalRevenue.toFixed(2)}, Utilidad: +$${profit.toFixed(2)}. Stock restante: ${remaining}.`
        : `Salida de -${exitData.quantity} u. de "${product.name}" por concepto de ${typeLabel}. Stock restante: ${remaining}.`,
      details: { quantity: exitData.quantity, totalRevenue, profit, channel: exitData.channel, orderRef: exitData.orderRef, customer: exitData.customerName },
    });

    return { exit: newExit };
  };

  const deleteStockEntry = (id: string) => {
    const target = entries.find(e => e.id === id);
    if (target) {
      logAuditEvent({
        action: 'STOCK_ENTRY_DELETE',
        actionTitle: 'Registro de Ingreso Anulado',
        module: 'entries',
        severity: 'warning',
        targetId: target.productSku,
        targetName: target.productName,
        description: `Eliminó el registro de ingreso de ${target.quantity} u. de "${target.productName}" (#${target.invoiceRef || 'S/N'}).`,
      });
    }
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const deleteStockExit = (id: string) => {
    const target = exits.find(e => e.id === id);
    if (target) {
      logAuditEvent({
        action: 'STOCK_EXIT_DELETE',
        actionTitle: 'Registro de Salida Anulado',
        module: 'exits',
        severity: 'warning',
        targetId: target.productSku,
        targetName: target.productName,
        description: `Eliminó el registro de salida/venta de ${target.quantity} u. de "${target.productName}" (#${target.orderRef || 'S/N'}).`,
      });
    }
    setExits(prev => prev.filter(e => e.id !== id));
  };

  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
    logAuditEvent({
      action: 'SETTINGS_UPDATE',
      actionTitle: 'Ajustes del Sistema Modificados',
      module: 'settings',
      severity: 'info',
      description: 'Se actualizaron parámetros de moneda, nombre de la tienda o políticas de seguridad.',
      details: updates,
    });
  };

  const resetToDemoData = () => {
    setProducts(initialProducts);
    setEntries(initialStockEntries);
    setExits(initialStockExits);
    setSettings(initialSettings);
    setUsers(initialUsers);
    setAuditLogs(initialAuditLogs);
    setCurrentUserId(initialUsers[0].id);

    logAuditEvent({
      action: 'DATABASE_RESET',
      actionTitle: 'Restauración de Catálogo Demo',
      module: 'settings',
      severity: 'warning',
      description: 'El sistema fue restaurado a los valores predeterminados de demostración con 5 usuarios y catálogo VITAL.',
    });
  };

  const clearAllData = () => {
    setProducts([]);
    setEntries([]);
    setExits([]);
    logAuditEvent({
      action: 'DATABASE_CLEAR',
      actionTitle: 'Vaciado Total de Catálogo',
      module: 'settings',
      severity: 'danger',
      description: 'Se eliminaron todos los productos, registros de entradas y salidas para iniciar en blanco.',
    });
  };

  // Computed metrics
  const lowStockProducts = useMemo(
    () => products.filter(p => p.currentStock <= p.minStock && p.currentStock > 0),
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter(p => p.currentStock <= 0),
    [products]
  );

  const criticalAlertCount = lowStockProducts.length + outOfStockProducts.length;

  const { totalInventoryCost, totalInventoryRetailValue, totalPotentialProfit, totalItemsInStock } = useMemo(() => {
    let cost = 0;
    let retail = 0;
    let items = 0;
    products.forEach(p => {
      cost += p.currentStock * p.costPrice;
      retail += p.currentStock * p.sellingPrice;
      items += p.currentStock;
    });
    return {
      totalInventoryCost: Number(cost.toFixed(2)),
      totalInventoryRetailValue: Number(retail.toFixed(2)),
      totalPotentialProfit: Number((retail - cost).toFixed(2)),
      totalItemsInStock: items,
    };
  }, [products]);

  const { totalRevenue, totalCOGS, totalRealizedProfit, overallMarginPercent } = useMemo(() => {
    let rev = 0;
    let cogs = 0;
    let prof = 0;
    exits.forEach(e => {
      rev += e.totalRevenue;
      cogs += e.totalCost;
      prof += e.profit;
    });
    const margin = rev > 0 ? Number(((prof / rev) * 100).toFixed(2)) : 0;
    return {
      totalRevenue: Number(rev.toFixed(2)),
      totalCOGS: Number(cogs.toFixed(2)),
      totalRealizedProfit: Number(prof.toFixed(2)),
      overallMarginPercent: margin,
    };
  }, [exits]);

  return (
    <InventoryContext.Provider
      value={{
        products,
        entries,
        exits,
        settings,
        users,
        currentUser,
        auditLogs,
        setCurrentUser,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        hasPermission,
        logAuditEvent,
        clearAuditLogs,
        addProduct,
        updateProduct,
        deleteProduct,
        setProducts,
        registerStockEntry,
        registerStockExit,
        deleteStockEntry,
        deleteStockExit,
        updateSettings,
        resetToDemoData,
        clearAllData,
        lowStockProducts,
        outOfStockProducts,
        criticalAlertCount,
        totalInventoryCost,
        totalInventoryRetailValue,
        totalPotentialProfit,
        totalRevenue,
        totalCOGS,
        totalRealizedProfit,
        overallMarginPercent,
        totalItemsInStock,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};

