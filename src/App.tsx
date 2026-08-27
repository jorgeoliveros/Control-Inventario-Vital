import React, { useState, useEffect, useCallback } from 'react';
import { InventoryProvider, useInventory } from './context/InventoryContext';
import { Header } from './components/Header';
import { DashboardMetrics } from './components/DashboardMetrics';
import { StockAlertsBanner } from './components/StockAlertsBanner';
import { InventoryTab } from './components/InventoryTab';
import { EntriesTab } from './components/EntriesTab';
import { ExitsTab } from './components/ExitsTab';
import { ReportsTab } from './components/ReportsTab';
import { AlertsTab } from './components/AlertsTab';
import { AuditTab } from './components/AuditTab';
import { UsersTab } from './components/UsersTab';
import { ProductModal } from './components/modals/ProductModal';
import { StockEntryModal } from './components/modals/StockEntryModal';
import { StockExitModal } from './components/modals/StockExitModal';
import { ProductHistoryModal } from './components/modals/ProductHistoryModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { SwitchUserModal } from './components/modals/SwitchUserModal';
import { UserModal } from './components/modals/UserModal';
import { 
  ActiveTab, 
  Product, 
  StockEntry, 
  StockExit, 
  User, 
  AuditLogEntry, 
  UserRole,
  AuditSeverity,
  AuditModule
} from './types';
import { rolePresets } from './data/initialData';
import { supabase } from './supabaseClient';
import { 
  X,
  AlertTriangle,
  Info
} from 'lucide-react';

interface SupabaseErrorModalData {
  title: string;
  message: string;
  details?: string;
  code?: string;
  hint?: string;
}

const MainApp: React.FC = () => {
  const { 
    products, 
    setProducts, 
    setEntries, 
    setExits, 
    setUsers, 
    setAuditLogs,
    currentUser,
    addProduct, 
    updateProduct, 
    deleteProduct, 
    addUser,
    updateUser,
    deleteUser,
    registerStockEntry, 
    registerStockExit,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');

  // Supabase Loading & Synchronization States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'saving' | 'synced' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [syncedCounts, setSyncedCounts] = useState<{
    products: number;
    entries: number;
    exits: number;
    users: number;
    audit: number;
  }>({ products: 0, entries: 0, exits: 0, users: 0, audit: 0 });

  // Visual error alert state for Supabase operations
  const [supabaseErrorAlert, setSupabaseErrorAlert] = useState<SupabaseErrorModalData | null>(null);

  // Modal States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entrySelectedProduct, setEntrySelectedProduct] = useState<Product | null>(null);
  const [entrySuggestedQty, setEntrySuggestedQty] = useState<number | undefined>(undefined);

  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitSelectedProduct, setExitSelectedProduct] = useState<Product | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historySelectedProduct, setHistorySelectedProduct] = useState<Product | null>(null);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Helper para registrar en la tabla bitacora_auditoria de Supabase
  const logAuditToSupabase = useCallback(async ({
    modulo,
    severidad = 'info',
    descripcion,
    recurso_afectado = '',
    detalles = {},
  }: {
    modulo: string;
    severidad?: 'info' | 'success' | 'warning' | 'critical' | 'danger';
    descripcion: string;
    recurso_afectado?: string;
    detalles?: Record<string, any>;
  }) => {
    try {
      const mappedSeverity = severidad === 'danger' ? 'critical' : severidad;
      await supabase.from('bitacora_auditoria').insert([{
        usuario_id: currentUser?.id || null,
        usuario_nombre: currentUser?.name || 'Sistema',
        usuario_rol: currentUser?.role || 'admin',
        modulo: modulo,
        severidad: mappedSeverity,
        descripcion: descripcion,
        recurso_afectado: recurso_afectado,
        detalles: detalles,
      }]);
    } catch (err) {
      console.warn('Bitácora en Supabase aviso de inserción:', err);
    }
  }, [currentUser]);

  // 1. CARGA INICIAL COMPLETA DESDE SUPABASE
  const fetchAllDataFromSupabase = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('loading');
    setStatusMessage('Sincronizando tablas desde Supabase...');

    const counts = { products: 0, entries: 0, exits: 0, users: 0, audit: 0 };

    try {
      // 1.1 Cargar inventario
      let mappedProducts: Product[] = [];
      const prodMap = new Map<string, Product>();

      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('*');

      if (invError) {
        console.error("Error cargando inventario:", invError);
      } else if (invData && Array.isArray(invData)) {
        mappedProducts = invData.map((item: any) => {
          const p: Product = {
            id: String(item.id).toLowerCase(),
            name: item.nombre || item.name || 'Sin nombre',
            sku: item.sku || `SKU-${item.id}`,
            category: item.categoria || item.category || 'General',
            currentStock: Number(item.cantidad ?? item.currentStock ?? 0),
            sellingPrice: Number(item.precio ?? item.sellingPrice ?? 0),
            costPrice: Number(item.costo ?? item.costPrice ?? (Number(item.precio || 0) * 0.6)),
            minStock: Number(item.min_stock ?? item.minStock ?? 5),
            unit: item.unidad || item.unit || 'unidades',
            supplier: item.proveedor || item.supplier || 'Proveedor',
            description: item.descripcion || item.description || '',
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
            updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
          };
          prodMap.set(p.id, p);
          return p;
        });
        setProducts(mappedProducts);
        counts.products = mappedProducts.length;
      }

      // 1.2 Cargar entradas_stock
      const { data: entriesData, error: entriesError } = await supabase
        .from('entradas_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (entriesError) {
        console.error("Error cargando entradas_stock:", entriesError);
      } else if (entriesData && Array.isArray(entriesData)) {
        const mappedEntries: StockEntry[] = entriesData.map((e: any) => {
          const targetId = String(e.producto_id || e.productId || '').toLowerCase();
          const matchedProd = prodMap.get(targetId);
          return {
            id: String(e.id),
            productId: targetId,
            productName: e.producto_nombre || e.productName || matchedProd?.name || 'Producto',
            productSku: e.producto_sku || e.productSku || matchedProd?.sku || '',
            quantity: Number(e.cantidad ?? e.quantity ?? 0),
            unitCost: Number(e.costo_unitario ?? e.unitCost ?? 0),
            totalCost: Number(e.costo_total ?? e.totalCost ?? (Number(e.cantidad || 0) * Number(e.costo_unitario || 0))),
            supplier: e.proveedor || e.supplier || matchedProd?.supplier || 'Proveedor',
            invoiceRef: e.invoice_ref || e.invoiceRef || '',
            date: e.fecha || e.date || e.created_at || new Date().toISOString(),
            notes: e.notas || e.notes || '',
            updateProductCost: Boolean(e.update_product_cost ?? e.updateProductCost ?? false),
            registeredBy: e.registrado_por || e.registeredBy || 'Admin',
          };
        });
        setEntries(mappedEntries);
        counts.entries = mappedEntries.length;
      }

      // 1.3 Cargar salidas_stock (con lectura directa de campos)
      const { data: exitsData, error: exitsError } = await supabase
        .from('salidas_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (exitsError) {
        console.error("Error cargando salidas_stock:", exitsError);
      } else if (exitsData && Array.isArray(exitsData)) {
        const mappedExits: StockExit[] = exitsData.map((s: any) => {
          const targetId = String(s.producto_id || s.productId || '').toLowerCase();
          const matchedProd = prodMap.get(targetId);
          const qty = Number(s.cantidad || 0);
          const unitPrice = Number(s.precio_unitario || 0);
          const unitCost = Number(s.costo_unitario || 0);
          const rev = Number(s.ingreso_total ?? (qty * unitPrice));
          const cost = Number(unitCost * qty);
          const profit = Number(s.utilidad_neta ?? (rev - cost));
          const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
          const clientName = (s.cliente || s.customerName || s.customer_name || '').trim();

          return {
            id: String(s.id),
            productId: targetId,
            productName: matchedProd?.name || s.producto_nombre || 'Producto',
            productSku: matchedProd?.sku || s.producto_sku || '',
            quantity: qty,
            unitSellingPrice: unitPrice,
            unitCostPrice: unitCost,
            totalRevenue: rev,
            totalCost: cost,
            profit: profit,
            profitMarginPercent: margin,
            type: 'sale',
            channel: s.canal_venta || s.channel || 'Tienda Web',
            customerName: clientName || 'Consumidor Final',
            orderRef: s.orden_ref || s.orderRef || '',
            date: s.fecha || s.date || s.created_at || new Date().toISOString(),
            notes: s.notas || s.notes || '',
            registeredBy: s.registrado_por || s.registeredBy || 'Admin',
          };
        });
        setExits(mappedExits);
        counts.exits = mappedExits.length;
      }

      // 1.4 Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('*');

      if (usersError) {
        console.error("Error cargando usuarios:", usersError);
      } else if (usersData && Array.isArray(usersData)) {
        const mappedUsers: User[] = usersData.map((u: any) => {
          const roleKey = (u.rol || u.role || 'sales_rep') as string;
          const normalizedRole: UserRole = 
            roleKey === 'admin' ? 'admin' :
            roleKey === 'store_manager' || roleKey === 'manager' ? 'manager' :
            roleKey === 'warehouse_clerk' || roleKey === 'warehouse' ? 'warehouse' :
            roleKey === 'financial_auditor' || roleKey === 'auditor' ? 'auditor' : 'sales';

          const preset = rolePresets[normalizedRole] || rolePresets.sales;
          const userPerms = u.permisos && typeof u.permisos === 'object' 
            ? { ...preset.permissions, ...u.permisos } 
            : preset.permissions;

          const avatarColors: Array<User['avatarColor']> = ['emerald', 'sky', 'amber', 'purple', 'rose', 'indigo'];
          const avatarColor = avatarColors[Math.abs(String(u.id).charCodeAt(0)) % avatarColors.length] || 'emerald';

          const initials = (u.nombre || u.name || 'U')
            .split(' ')
            .map((n: string) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

          return {
            id: String(u.id),
            name: u.nombre || u.name || 'Usuario',
            email: u.email || '',
            role: normalizedRole,
            roleTitle: u.cargo || u.roleTitle || preset.title,
            avatarColor: avatarColor,
            initials: initials,
            status: u.estado === 'inactive' || u.status === 'inactive' ? 'inactive' : 'active',
            pin: u.pin_seguridad || u.pin || '1234',
            createdAt: u.created_at || u.createdAt || new Date().toISOString(),
            lastLogin: u.ultimo_acceso || u.lastLogin || new Date().toISOString(),
            permissions: userPerms,
          };
        });
        setUsers(mappedUsers);
        counts.users = mappedUsers.length;
      }

      // 1.5 Cargar bitacora_auditoria
      const { data: auditData, error: auditError } = await supabase
        .from('bitacora_auditoria')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (auditError) {
        console.error("Error cargando bitacora_auditoria:", auditError);
      } else if (auditData && Array.isArray(auditData)) {
        const mappedAudit: AuditLogEntry[] = auditData.map((b: any) => ({
          id: String(b.id),
          timestamp: b.created_at || b.timestamp || new Date().toISOString(),
          userId: String(b.usuario_id || b.userId || ''),
          userName: b.usuario_nombre || b.userName || 'Sistema',
          userEmail: b.usuario_email || b.userEmail || '',
          userRole: (b.usuario_rol || b.userRole || 'admin') as UserRole,
          userAvatarColor: b.userAvatarColor || 'emerald',
          action: b.accion || b.action || 'SETTINGS_UPDATE',
          actionTitle: b.modulo || b.actionTitle || 'Movimiento',
          module: (b.modulo?.toLowerCase() || 'inventory') as AuditModule,
          severity: (b.severidad === 'critical' ? 'danger' : b.severidad || 'info') as AuditSeverity,
          targetId: b.recurso_afectado || b.targetId || '',
          targetName: b.recurso_nombre || b.targetName || '',
          description: b.descripcion || b.description || '',
          details: b.detalles || b.details || {},
        }));
        setAuditLogs(mappedAudit);
        counts.audit = mappedAudit.length;
      }

      setSyncedCounts(counts);
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setStatusMessage(`Supabase sincronizado: ${counts.products} productos, ${counts.entries} entradas, ${counts.exits} salidas.`);
    } catch (err: any) {
      console.error('Error general sincronizando datos con Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(err?.message || 'Error de conexión con Supabase');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setStatusMessage(prev => prev.startsWith('Supabase sincronizado') ? '' : prev);
      }, 4500);
    }
  }, [setProducts, setEntries, setExits, setUsers, setAuditLogs]);

  useEffect(() => {
    fetchAllDataFromSupabase();
  }, [fetchAllDataFromSupabase]);

  const handleSaveProductToSupabase = async (formData: any, isEdit: boolean, id?: string) => {
    setIsSaving(true);
    setSyncStatus('saving');

    try {
      const payloadInventario = {
        nombre: formData.name,
        sku: formData.sku,
        categoria: formData.category,
        cantidad: Number(formData.currentStock),
        precio: Number(formData.sellingPrice),
        costo: Number(formData.costPrice),
        min_stock: Number(formData.minStock || 5),
        unidad: formData.unit || 'unidades',
        proveedor: formData.supplier || '',
        descripcion: formData.description || '',
      };

      if (isEdit && id) {
        const { error } = await supabase
          .from('inventario')
          .update(payloadInventario)
          .eq('id', id);

        if (error) throw error;
        updateProduct(id, formData);
      } else {
        const { data, error } = await supabase
          .from('inventario')
          .insert([payloadInventario])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          const newProd: Product = {
            ...formData,
            id: String(data[0].id).toLowerCase(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setProducts(prev => [newProd, ...prev]);
        }
      }
      fetchAllDataFromSupabase();
    } catch (err: any) {
      console.error('Error guardando producto:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockEntryToSupabase = async (entryData: any) => {
    setIsSaving(true);
    try {
      const targetProd = products.find(p => p.id.toLowerCase() === entryData.productId.toLowerCase());
      const productoId = targetProd ? targetProd.id : entryData.productId;
      const cantidad = Number(entryData.quantity);
      const costo_unitario = Number(entryData.unitCost);
      const costo_total = Number((cantidad * costo_unitario).toFixed(2));

      const payloadEntrada = {
        producto_id: productoId,
        cantidad,
        costo_unitario,
        costo_total,
        proveedor: entryData.supplier || '',
        notas: entryData.notes || '',
      };

      const { error } = await supabase.from('entradas_stock').insert([payloadEntrada]);
      if (error) throw error;

      if (targetProd) {
        await supabase
          .from('inventario')
          .update({ cantidad: targetProd.currentStock + cantidad })
          .eq('id', targetProd.id);
      }
      fetchAllDataFromSupabase();
    } catch (err: any) {
      console.error("Error entrada:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStockExitToSupabase = async (exitData: any) => {
    setIsSaving(true);
    try {
      const targetProd = products.find(p => p.id.toLowerCase() === exitData.productId.toLowerCase());
      const productoId = targetProd ? targetProd.id : exitData.productId;
      const cantidad = Number(exitData.quantity);
      const precio_unitario = Number(exitData.unitSellingPrice ?? (targetProd ? targetProd.sellingPrice : 0));
      const costo_unitario = Number(targetProd ? targetProd.costPrice : (exitData.unitCostPrice ?? 0));
      const ingreso_total = Number((cantidad * precio_unitario).toFixed(2));
      const utilidad_neta = Number((ingreso_total - (cantidad * costo_unitario)).toFixed(2));

      const payloadSalida = {
        producto_id: productoId,
        cantidad,
        precio_unitario,
        costo_unitario,
        ingreso_total,
        utilidad_neta,
        canal_venta: exitData.channel || 'Tienda Web',
        cliente: (exitData.customerName || '').trim() || 'Consumidor Final',
        orden_ref: exitData.orderRef || '',
        notas: exitData.notes || '',
      };

      const { error } = await supabase.from('salidas_stock').insert([payloadSalida]);
      if (error) throw error;

      if (targetProd) {
        await supabase
          .from('inventario')
          .update({ cantidad: Math.max(0, targetProd.currentStock - cantidad) })
          .eq('id', targetProd.id);
      }
      fetchAllDataFromSupabase();
    } catch (err: any) {
      console.error("Error salida:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveUserToSupabase = async (userData: any, isEdit: boolean, id?: string) => {
    setIsSaving(true);
    try {
      const payloadUsuario = {
        nombre: userData.name?.trim(),
        email: userData.email?.trim(),
        rol: userData.role || 'sales',
        cargo: userData.roleTitle?.trim() || 'Asesor Comercial',
        estado: 'active',
        pin_seguridad: userData.pin?.trim() || '1234',
        permisos: userData.permissions || {},
      };

      if (isEdit && id) {
        await supabase.from('usuarios').update(payloadUsuario).eq('id', id);
      } else {
        await supabase.from('usuarios').insert([payloadUsuario]);
      }
      fetchAllDataFromSupabase();
    } catch (err: any) {
      console.error("Error usuario:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProductFromSupabase = async (id: string, name: string) => {
    setIsSaving(true);
    try {
      await supabase.from('inventario').delete().eq('id', id);
      fetchAllDataFromSupabase();
    } catch (err: any) {
      console.error('Fallo al eliminar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsProductModalOpen(true);
  };

  const handleQuickEntry = (product?: Product, suggestedQty?: number) => {
    setEntrySelectedProduct(product || null);
    setEntrySuggestedQty(suggestedQty);
    setIsEntryModalOpen(true);
  };

  const handleQuickExit = (product?: Product) => {
    setExitSelectedProduct(product || null);
    setIsExitModalOpen(true);
  };

  const handleViewHistory = (product: Product) => {
    setHistorySelectedProduct(product);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewProduct={handleOpenNewProduct}
        onOpenEntry={() => handleQuickEntry()}
        onOpenExit={() => handleQuickExit()}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSwitchUser={() => setIsSwitchUserModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <DashboardMetrics />

        {activeTab !== 'alerts' && (
          <StockAlertsBanner
            onQuickRestock={(p) => handleQuickEntry(p, Math.max(p.minStock * 2 - p.currentStock, 10))}
            onViewAllAlerts={() => setActiveTab('alerts')}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            onOpenNewProduct={handleOpenNewProduct}
            onEditProduct={handleEditProduct}
            onQuickEntry={(p) => handleQuickEntry(p)}
            onQuickExit={(p) => handleQuickExit(p)}
            onViewHistory={handleViewHistory}
            onDeleteProduct={handleDeleteProductFromSupabase}
          />
        )}

        {activeTab === 'entries' && (
          <EntriesTab onOpenNewEntry={() => handleQuickEntry()} />
        )}

        {activeTab === 'exits' && (
          <ExitsTab onOpenNewExit={() => handleQuickExit()} />
        )}

        {activeTab === 'reports' && (
          <ReportsTab />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab
            onQuickRestock={(p, qty) => handleQuickEntry(p, qty)}
            onOpenNewProduct={handleOpenNewProduct}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTab />
        )}

        {activeTab === 'users' && (
          <UsersTab onSaveUser={handleSaveUserToSupabase} />
        )}
      </main>

      <footer className="border-t border-stone-200 bg-white py-4 mt-auto text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span className="font-semibold text-stone-600">
            VITAL &middot; Sistema de Gestión de Inventarios y Control de Stock
          </span>
        </div>
      </footer>

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
        onSave={handleSaveProductToSupabase}
      />

      <StockEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        selectedProduct={entrySelectedProduct}
        suggestedQuantity={entrySuggestedQty}
        onSaveEntry={handleStockEntryToSupabase}
      />

      <StockExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        selectedProduct={exitSelectedProduct}
        onSaveExit={handleStockExitToSupabase}
      />

      <ProductHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        product={historySelectedProduct}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <SwitchUserModal
        isOpen={isSwitchUserModalOpen}
        onClose={() => setIsSwitchUserModalOpen(false)}
        onOpenNewUserModal={() => setIsUserModalOpen(true)}
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSaveUser={handleSaveUserToSupabase}
      />
    </div>
  );
};

export default function App() {
  return (
    <InventoryProvider>
      <MainApp />
    </InventoryProvider>
  );
}
