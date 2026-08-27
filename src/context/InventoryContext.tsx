import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Product, StockEntry, StockExit, AppSettings, User, UserPermissions, AuditLogEntry, AuditActionType, AuditModule, AuditSeverity } from '../types';
import { initialSettings, initialUsers, rolePresets } from '../data/initialData';
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
  setEntries: React.Dispatch<React.SetStateAction<StockEntry[]>>;
  setExits: React.Dispatch<React.SetStateAction<StockExit[]>>;
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLogEntry[]>>;
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

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Arreglos inicializados vacíos para depender exclusivamente de Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [exits, setExits] = useState<StockExit[]>([]);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [currentUserId, setCurrentUserId] = useState<string>(initialUsers[0]?.id || 'user-admin-1');

  const currentUser = useMemo(() => {
    const found = users.find(u => u.id === currentUserId);
    return found || users[0] || initialUsers[0];
  }, [users, currentUserId]);

  const logAuditEvent = (entryData: any) => {};
  const clearAuditLogs = () => setAuditLogs([]);

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser || currentUser.status === 'inactive') return false;
    if (currentUser.role === 'admin') return true;
    return !!currentUser.permissions?.[permission];
  };

  const setCurrentUser = (user: User) => setCurrentUserId(user.id);

  const switchUser = (userId: string, pin?: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return { success: false, error: 'Usuario no encontrado.' };
    setCurrentUserId(userId);
    return { success: true };
  };

  const addUser = (userData: any) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
      initials: 'US',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    return newUser;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => (u.id === id ? { ...u, ...updates } : u)));
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    return { success: true };
  };

  const addProduct = (productData: any) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const registerStockEntry = (entryData: any) => {
    const product = products.find(p => p.id === entryData.productId);
    const totalCost = Number((entryData.quantity * entryData.unitCost).toFixed(2));
    const newEntry: StockEntry = {
      id: `entry-${Date.now()}`,
      productId: entryData.productId,
      productName: product?.name || 'Producto',
      productSku: product?.sku || '',
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
    setEntries(prev => [newEntry, ...prev]);
    return newEntry;
  };

  const registerStockExit = (exitData: any) => {
    const product = products.find(p => p.id === exitData.productId);
    const unitSellingPrice = exitData.unitSellingPrice ?? (product?.sellingPrice || 0);
    const unitCostPrice = product?.costPrice || 0;
    const totalRevenue = Number((exitData.quantity * unitSellingPrice).toFixed(2));
    const totalCost = Number((exitData.quantity * unitCostPrice).toFixed(2));
    const profit = Number((totalRevenue - totalCost).toFixed(2));

    const newExit: StockExit = {
      id: `exit-${Date.now()}`,
      productId: exitData.productId,
      productName: product?.name || 'Producto',
      productSku: product?.sku || '',
      quantity: exitData.quantity,
      unitSellingPrice,
      unitCostPrice,
      totalRevenue,
      totalCost,
      profit,
      profitMarginPercent: totalRevenue > 0 ? Number(((profit / totalRevenue) * 100).toFixed(2)) : 0,
      type: exitData.type,
      channel: exitData.channel,
      customerName: exitData.customerName,
      orderRef: exitData.orderRef,
      date: exitData.date || new Date().toISOString(),
      notes: exitData.notes,
      registeredBy: currentUser.name,
    };
    setExits(prev => [newExit, ...prev]);
    return { exit: newExit };
  };

  const deleteStockEntry = (id: string) => setEntries(prev => prev.filter(e => e.id !== id));
  const deleteStockExit = (id: string) => setExits(prev => prev.filter(e => e.id !== id));
  const updateSettings = (updates: Partial<AppSettings>) => setSettings(prev => ({ ...prev, ...updates }));
  const resetToDemoData = () => {};
  const clearAllData = () => {
    setProducts([]);
    setEntries([]);
    setExits([]);
  };

  const lowStockProducts = useMemo(() => products.filter(p => p.currentStock <= p.minStock && p.currentStock > 0), [products]);
  const outOfStockProducts = useMemo(() => products.filter(p => p.currentStock <= 0), [products]);
  const criticalAlertCount = lowStockProducts.length + outOfStockProducts.length;

  const { totalInventoryCost, totalInventoryRetailValue, totalPotentialProfit, totalItemsInStock } = useMemo(() => {
    let cost = 0, retail = 0, items = 0;
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
    let rev = 0, cogs = 0, prof = 0;
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
        products, entries, exits, settings, users, currentUser, auditLogs,
        setCurrentUser, switchUser, addUser, updateUser, deleteUser, hasPermission,
        logAuditEvent, clearAuditLogs, addProduct, updateProduct, deleteProduct,
        setProducts, setEntries, setExits, setUsers, setAuditLogs,
        registerStockEntry, registerStockExit, deleteStockEntry, deleteStockExit,
        updateSettings, resetToDemoData, clearAllData,
        lowStockProducts, outOfStockProducts, criticalAlertCount,
        totalInventoryCost, totalInventoryRetailValue, totalPotentialProfit,
        totalRevenue, totalCOGS, totalRealizedProfit, overallMarginPercent, totalItemsInStock,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within an InventoryProvider');
  return context;
};
