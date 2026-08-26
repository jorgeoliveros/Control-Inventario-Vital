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
  Database, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Layers
} from 'lucide-react';

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
    registerStockEntry, 
    registerStockExit,
    logAuditEvent 
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
      console.warn('Bitácora en Supabase no disponible o aviso de inserción:', err);
    }
  }, [currentUser]);

  // 1. CARGA INICIAL COMPLETA DESDE SUPABASE (inventario, entradas_stock, salidas_stock, usuarios, bitacora_auditoria)
  const fetchAllDataFromSupabase = useCallback(async () => {
    setIsLoading(true);
    setSyncStatus('loading');
    setStatusMessage('Sincronizando tablas desde Supabase...');

    const counts = { products: 0, entries: 0, exits: 0, users: 0, audit: 0 };

    try {
      // 1.1 Cargar inventario
      const { data: invData, error: invError } = await supabase
        .from('inventario')
        .select('*');

      if (!invError && invData && Array.isArray(invData) && invData.length > 0) {
        const mappedProducts: Product[] = invData.map((item: any) => ({
          id: String(item.id),
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
        }));
        setProducts(mappedProducts);
        counts.products = mappedProducts.length;
      }

      // 1.2 Cargar entradas_stock
      const { data: entriesData, error: entriesError } = await supabase
        .from('entradas_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (!entriesError && entriesData && Array.isArray(entriesData) && entriesData.length > 0) {
        const mappedEntries: StockEntry[] = entriesData.map((e: any) => ({
          id: String(e.id),
          productId: String(e.producto_id || e.productId || ''),
          productName: e.producto_nombre || e.productName || 'Producto',
          productSku: e.producto_sku || e.productSku || '',
          quantity: Number(e.cantidad ?? e.quantity ?? 0),
          unitCost: Number(e.costo_unitario ?? e.unitCost ?? 0),
          totalCost: Number(e.costo_total ?? e.totalCost ?? (Number(e.cantidad || 0) * Number(e.costo_unitario || 0))),
          supplier: e.proveedor || e.supplier || 'Proveedor',
          invoiceRef: e.invoice_ref || e.invoiceRef || '',
          date: e.fecha || e.date || e.created_at || new Date().toISOString(),
          notes: e.notas || e.notes || '',
          updateProductCost: Boolean(e.update_product_cost ?? e.updateProductCost ?? false),
          registeredBy: e.registrado_por || e.registeredBy || 'Admin',
        }));
        setEntries(mappedEntries);
        counts.entries = mappedEntries.length;
      }

      // 1.3 Cargar salidas_stock
      const { data: exitsData, error: exitsError } = await supabase
        .from('salidas_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (!exitsError && exitsData && Array.isArray(exitsData) && exitsData.length > 0) {
        const mappedExits: StockExit[] = exitsData.map((s: any) => {
          const rev = Number(s.ingreso_total ?? s.totalRevenue ?? (Number(s.cantidad || 0) * Number(s.precio_unitario || 0)));
          const cost = Number(s.costo_unitario ?? 0) * Number(s.cantidad || 0);
          const profit = Number(s.utilidad_neta ?? s.profit ?? (rev - cost));
          const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;

          return {
            id: String(s.id),
            productId: String(s.producto_id || s.productId || ''),
            productName: s.producto_nombre || s.productName || 'Producto',
            productSku: s.producto_sku || s.productSku || '',
            quantity: Number(s.cantidad ?? s.quantity ?? 0),
            unitSellingPrice: Number(s.precio_unitario ?? s.unitSellingPrice ?? 0),
            unitCostPrice: Number(s.costo_unitario ?? s.unitCostPrice ?? 0),
            totalRevenue: rev,
            totalCost: cost,
            profit: profit,
            profitMarginPercent: margin,
            type: s.tipo || s.type || 'sale',
            channel: s.canal_venta || s.channel || 'Tienda Web',
            customerName: s.cliente || s.customerName || '',
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

      if (!usersError && usersData && Array.isArray(usersData) && usersData.length > 0) {
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

      if (!auditError && auditData && Array.isArray(auditData) && auditData.length > 0) {
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
      setStatusMessage(`Supabase sincronizado: ${counts.products} productos, ${counts.entries} entradas, ${counts.exits} salidas, ${counts.users} usuarios.`);
    } catch (err: any) {
      console.error('Error sincronizando datos con Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(err?.message || 'Error de conexión con Supabase');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setStatusMessage(prev => prev.startsWith('Supabase sincronizado') ? '' : prev);
      }, 4500);
    }
  }, [setProducts, setEntries, setExits, setUsers, setAuditLogs]);

  // Carga inicial al montar el componente
  useEffect(() => {
    fetchAllDataFromSupabase();
  }, [fetchAllDataFromSupabase]);

  // 2. PRODUCTOS: INSERT & UPDATE EN inventario + REGISTRO EN bitacora_auditoria
  const handleSaveProductToSupabase = async (formData: any, isEdit: boolean, id?: string) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage(isEdit ? 'Actualizando producto en Supabase...' : 'Guardando nuevo producto en Supabase...');

    try {
      if (isEdit && id) {
        const { error } = await supabase
          .from('inventario')
          .update({
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
          })
          .eq('id', id);

        if (error) throw error;

        updateProduct(id, formData);

        // Bitácora en Supabase
        await logAuditToSupabase({
          modulo: 'Inventario',
          severidad: 'info',
          descripcion: `Producto "${formData.name}" (SKU: ${formData.sku}) actualizado en catálogo.`,
          recurso_afectado: formData.sku,
          detalles: { id, updates: formData },
        });

        setSyncStatus('synced');
        setStatusMessage(`Producto "${formData.name}" actualizado con éxito.`);
      } else {
        const { data, error } = await supabase
          .from('inventario')
          .insert([{
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
          }])
          .select();

        if (error) throw error;

        const insertedItem = data && data[0] ? data[0] : null;
        if (insertedItem) {
          const newProd: Product = {
            ...formData,
            id: String(insertedItem.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setProducts(prev => [newProd, ...prev]);
        } else {
          addProduct(formData);
        }

        // Bitácora en Supabase
        await logAuditToSupabase({
          modulo: 'Inventario',
          severidad: 'success',
          descripcion: `Nuevo producto "${formData.name}" (SKU: ${formData.sku}) creado con stock inicial de ${formData.currentStock} ${formData.unit || 'unidades'}.`,
          recurso_afectado: formData.sku,
          detalles: { formData },
        });

        setSyncStatus('synced');
        setStatusMessage(`Producto "${formData.name}" registrado en Supabase.`);
      }
    } catch (err: any) {
      console.error('Error guardando producto en Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err.message || 'Fallo de guardado'}`);
      if (isEdit && id) {
        updateProduct(id, formData);
      } else {
        addProduct(formData);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  // 3. ENTRADAS: INSERT EN entradas_stock + UPDATE STOCK EN inventario + REGISTRO EN bitacora_auditoria
  const handleStockEntryToSupabase = async (entryData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Registrando entrada de stock en Supabase...');

    try {
      const targetProd = products.find(p => p.id === entryData.productId);
      const totalCost = Number((entryData.quantity * entryData.unitCost).toFixed(2));

      // 3.1 Insertar en la tabla entradas_stock
      const { data: insertedEntry, error: entryErr } = await supabase
        .from('entradas_stock')
        .insert([{
          producto_id: entryData.productId,
          cantidad: Number(entryData.quantity),
          costo_unitario: Number(entryData.unitCost),
          costo_total: totalCost,
          proveedor: entryData.supplier || (targetProd ? targetProd.supplier : 'Proveedor'),
          notas: entryData.notes || '',
          fecha: entryData.date || new Date().toISOString(),
        }])
        .select();

      if (entryErr) {
        console.warn('Aviso insertando en entradas_stock:', entryErr.message);
      }

      // 3.2 Actualizar inventario (cantidad y opcionalmente costo)
      if (targetProd) {
        const newStock = targetProd.currentStock + Number(entryData.quantity);
        const updateFields: any = { cantidad: newStock };
        if (entryData.updateProductCost) {
          updateFields.costo = Number(entryData.unitCost);
        }

        const { error: invErr } = await supabase
          .from('inventario')
          .update(updateFields)
          .eq('id', targetProd.id);

        if (invErr) {
          console.warn('Aviso actualizando stock en inventario:', invErr.message);
        }
      }

      // 3.3 Registrar en bitacora_auditoria
      await logAuditToSupabase({
        modulo: 'Entradas',
        severidad: 'success',
        descripcion: `Ingreso de stock: +${entryData.quantity} unidades de "${targetProd?.name || 'Producto'}" (${entryData.supplier}). Costo total: $${totalCost.toLocaleString()}.`,
        recurso_afectado: targetProd?.sku || entryData.productId,
        detalles: { entryData, totalCost },
      });

      // Actualizar estado local
      registerStockEntry(entryData);
      setSyncStatus('synced');
      setStatusMessage(`Ingreso de +${entryData.quantity} unidades guardado en Supabase.`);
    } catch (err: any) {
      console.error('Error al registrar entrada en Supabase:', err);
      registerStockEntry(entryData);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  // 4. SALIDAS / VENTAS: INSERT EN salidas_stock + UPDATE STOCK EN inventario + REGISTRO EN bitacora_auditoria
  const handleStockExitToSupabase = async (exitData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Registrando salida/venta en Supabase...');

    try {
      const targetProd = products.find(p => p.id === exitData.productId);
      const unitSellingPrice = Number(exitData.unitSellingPrice ?? (targetProd ? targetProd.sellingPrice : 0));
      const unitCostPrice = targetProd ? targetProd.costPrice : 0;
      const totalRevenue = Number((exitData.quantity * unitSellingPrice).toFixed(2));
      const totalCost = Number((exitData.quantity * unitCostPrice).toFixed(2));
      const profit = Number((totalRevenue - totalCost).toFixed(2));

      // 4.1 Insertar en la tabla salidas_stock
      const { error: exitErr } = await supabase
        .from('salidas_stock')
        .insert([{
          producto_id: exitData.productId,
          cantidad: Number(exitData.quantity),
          precio_unitario: unitSellingPrice,
          costo_unitario: unitCostPrice,
          ingreso_total: totalRevenue,
          utilidad_neta: profit,
          canal_venta: exitData.channel || 'Tienda Web',
          orden_ref: exitData.orderRef || '',
          notas: exitData.notes || '',
          fecha: exitData.date || new Date().toISOString(),
        }]);

      if (exitErr) {
        console.warn('Aviso insertando en salidas_stock:', exitErr.message);
      }

      // 4.2 Descontar stock en inventario
      if (targetProd) {
        const newStock = Math.max(0, targetProd.currentStock - Number(exitData.quantity));
        const { error: invErr } = await supabase
          .from('inventario')
          .update({ cantidad: newStock })
          .eq('id', targetProd.id);

        if (invErr) {
          console.warn('Aviso descontando stock en inventario:', invErr.message);
        }
      }

      // 4.3 Registrar en bitacora_auditoria
      await logAuditToSupabase({
        modulo: 'Salidas',
        severidad: 'info',
        descripcion: `Despacho de stock: -${exitData.quantity} unidades de "${targetProd?.name || 'Producto'}" vía ${exitData.channel || 'Tienda'}. Total: $${totalRevenue.toLocaleString()}.`,
        recurso_afectado: targetProd?.sku || exitData.productId,
        detalles: { exitData, totalRevenue, profit },
      });

      // Actualizar estado local
      const res = registerStockExit(exitData);
      setSyncStatus('synced');
      setStatusMessage(`Salida de -${exitData.quantity} unidades guardada en Supabase.`);
      return res;
    } catch (err: any) {
      console.error('Error al registrar salida en Supabase:', err);
      return registerStockExit(exitData);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4000);
    }
  };

  // 5. ELIMINAR PRODUCTO: DELETE EN inventario + REGISTRO EN bitacora_auditoria
  const handleDeleteProductFromSupabase = async (id: string, name: string) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage(`Eliminando "${name}" de Supabase...`);

    try {
      const targetProd = products.find(p => p.id === id);

      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (error) throw error;

      deleteProduct(id);

      // Bitácora en Supabase
      await logAuditToSupabase({
        modulo: 'Inventario',
        severidad: 'critical',
        descripcion: `Producto "${name}" (SKU: ${targetProd?.sku || id}) eliminado definitivamente del sistema.`,
        recurso_afectado: targetProd?.sku || id,
        detalles: { id, name },
      });

      setSyncStatus('synced');
      setStatusMessage(`"${name}" eliminado correctamente de Supabase.`);
    } catch (err: any) {
      console.error('Fallo al eliminar de Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err.message || 'Fallo al eliminar'}`);
      deleteProduct(id);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  // Quick Action Handlers
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
      {/* Header & Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewProduct={handleOpenNewProduct}
        onOpenEntry={() => handleQuickEntry()}
        onOpenExit={() => handleQuickExit()}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSwitchUser={() => setIsSwitchUserModalOpen(true)}
      />

      {/* Supabase Multi-Table Live Synchronization Indicator Bar */}
      <div className="bg-white border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Status badge & Sync indicator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Supabase conectado:</span>
              <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500">
                <span className="bg-stone-200/70 px-1 py-0.2 rounded" title="inventario">inv ({syncedCounts.products})</span>
                <span className="bg-stone-200/70 px-1 py-0.2 rounded" title="entradas_stock">ent ({syncedCounts.entries})</span>
                <span className="bg-stone-200/70 px-1 py-0.2 rounded" title="salidas_stock">sal ({syncedCounts.exits})</span>
                <span className="bg-stone-200/70 px-1 py-0.2 rounded" title="usuarios">usr ({syncedCounts.users})</span>
                <span className="bg-stone-200/70 px-1 py-0.2 rounded" title="bitacora_auditoria">aud ({syncedCounts.audit})</span>
              </div>
            </div>

            {/* Loading / Saving / Synced Indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sincronizando 5 tablas...</span>
              </div>
            )}

            {isSaving && (
              <div className="flex items-center gap-1.5 text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Guardando en Supabase...</span>
              </div>
            )}

            {!isLoading && !isSaving && syncStatus === 'synced' && (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Tablas sincronizadas</span>
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full" title={statusMessage}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Atención de conexión</span>
              </div>
            )}

            {statusMessage && (
              <span className="text-stone-600 hidden lg:inline-block truncate max-w-md">
                {statusMessage}
              </span>
            )}
          </div>

          {/* Right controls: Last sync time & manual refresh */}
          <div className="flex items-center gap-3 text-stone-500">
            {lastSyncTime && (
              <span className="text-[11px] hidden md:inline">
                Sincronizado: {lastSyncTime}
              </span>
            )}
            <button
              onClick={() => fetchAllDataFromSupabase()}
              disabled={isLoading || isSaving}
              className="inline-flex items-center gap-1 text-stone-600 hover:text-emerald-700 bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Volver a consultar todas las tablas de Supabase"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sincronizar Tablas</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Global Key Metrics Dashboard */}
        <DashboardMetrics />

        {/* Stock Alerts Notice Banner */}
        {activeTab !== 'alerts' && (
          <StockAlertsBanner
            onQuickRestock={(p) => handleQuickEntry(p, Math.max(p.minStock * 2 - p.currentStock, 10))}
            onViewAllAlerts={() => setActiveTab('alerts')}
          />
        )}

        {/* Tab Modules */}
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
          <UsersTab />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-auto text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-stone-700">
            VITAL &middot; Sistema de Gestión de Inventarios sincronizado con Supabase
          </span>
          <span className="text-[11px] text-stone-400">
            Tablas: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">inventario</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">entradas_stock</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">salidas_stock</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">usuarios</code>, <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">bitacora_auditoria</code>
          </span>
        </div>
      </footer>

      {/* Modals con sincronización directa a Supabase */}
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
