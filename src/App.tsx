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
import { supabase, isSupabaseConfigured } from './supabaseClient';
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
      if (!isSupabaseConfigured) {
        return;
      }
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

  // 1. CARGA INICIAL COMPLETA DESDE SUPABASE (inventario, entradas_stock, salidas_stock, usuarios, bitacora_auditoria)
  const fetchAllDataFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setSyncStatus('idle');
      return;
    }

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
      } else if (invData && Array.isArray(invData) && invData.length > 0) {
        mappedProducts = invData.map((item: any) => {
          const p: Product = {
            id: String(item.id),
            name: item.nombre || item.name || 'Sin nombre',
            sku: item.sku || `SKU-${item.id}`,
            category: item.categoria || item.category || 'General',
            currentStock: Number(item.cantidad ?? item.stock ?? item.stock_actual ?? item.current_stock ?? item.currentStock ?? 0),
            sellingPrice: Number(item.precio ?? item.precio_venta ?? item.sellingPrice ?? 0),
            costPrice: Number(item.costo ?? item.costo_unitario ?? item.costPrice ?? (Number(item.precio || 0) * 0.6)),
            minStock: Number(item.min_stock ?? item.minStock ?? 5),
            unit: item.unidad || item.unit || 'unidades',
            supplier: item.proveedor || item.supplier || 'Proveedor',
            description: item.descripcion || item.description || '',
            createdAt: item.created_at || item.createdAt || new Date().toISOString(),
            updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
          };
          prodMap.set(p.id, p);
          if (p.sku) prodMap.set(p.sku, p);
          return p;
        });
        setProducts(mappedProducts);
        counts.products = mappedProducts.length;
      }

      // 1.2 Cargar entradas_stock
      const { data: entriesData, error: entriesError } = await supabase
        .from('entradas_stock')
        .select('*');

      if (entriesError) {
        console.error("Error cargando entradas_stock:", entriesError);
      } else if (entriesData && Array.isArray(entriesData)) {
        const mappedEntries: StockEntry[] = entriesData.map((e: any) => {
          const matchedProd = prodMap.get(String(e.producto_id || e.productId || ''));
          return {
            id: String(e.id),
            productId: String(e.producto_id || e.productId || ''),
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
        mappedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEntries(mappedEntries);
        counts.entries = mappedEntries.length;
      }

      // 1.3 Cargar salidas_stock
      let exitsDataList: any[] | null = null;
      
      // Intentar consulta con relación a inventario
      const { data: exitsDataWithInv, error: exitsErrorWithInv } = await supabase
        .from('salidas_stock')
        .select('*, inventario(nombre, sku)');

      if (exitsErrorWithInv) {
        console.warn("Consulta con relación a inventario falló, reintentando select(*):", exitsErrorWithInv);
        const { data: exitsDataSimple, error: exitsErrorSimple } = await supabase
          .from('salidas_stock')
          .select('*');
        if (exitsErrorSimple) {
          console.error("Error cargando salidas_stock:", exitsErrorSimple);
        } else {
          exitsDataList = exitsDataSimple;
        }
      } else {
        exitsDataList = exitsDataWithInv;
      }

      if (exitsDataList && Array.isArray(exitsDataList)) {
        const mappedExits: StockExit[] = exitsDataList.map((s: any) => {
          const qty = Number(s.cantidad || 0);
          const unitPrice = Number(s.precio_unitario || 0);
          const unitCost = Number(s.costo_unitario || 0);
          const rev = Number(s.ingreso_total ?? (qty * unitPrice));
          const cost = Number(unitCost * qty);
          const profit = Number(s.utilidad_neta ?? (rev - cost));
          const margin = rev > 0 ? Number(((profit / rev) * 100).toFixed(1)) : 0;
          const matchedProd = prodMap.get(String(s.producto_id || s.productId || ''));

          const invRel = Array.isArray(s.inventario) ? s.inventario[0] : s.inventario;
          const productName = invRel?.nombre || s.producto_nombre || matchedProd?.name || 'Venta / Producto';
          const productSku = invRel?.sku || s.producto_sku || matchedProd?.sku || 'S/N';
          const clientName = (s.cliente || s.customerName || s.customer_name || s.nombre_cliente || s.cliente_nombre || '').trim();

          return {
            id: String(s.id),
            productId: String(s.producto_id || s.productId || ''),
            productName: productName,
            productSku: productSku,
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
        mappedExits.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExits(mappedExits);
        counts.exits = mappedExits.length;
      }

      // 1.4 Cargar usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('usuarios')
        .select('*');

      if (usersError) {
        console.error("Error cargando usuarios:", usersError);
      } else if (usersData && Array.isArray(usersData) && usersData.length > 0) {
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
      let rawAuditData: any[] | null = null;
      const { data: auditData, error: auditError } = await supabase
        .from('bitacora_auditoria')
        .select('*');

      if (auditError) {
        console.error("Error cargando bitacora_auditoria:", auditError);
      } else if (auditData && Array.isArray(auditData)) {
        rawAuditData = auditData;
      }

      if (rawAuditData && rawAuditData.length > 0) {
        const mappedAudit: AuditLogEntry[] = rawAuditData.map((b: any) => ({
          id: String(b.id),
          timestamp: b.created_at || b.fecha || b.timestamp || new Date().toISOString(),
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
        mappedAudit.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setAuditLogs(mappedAudit.slice(0, 100));
        counts.audit = mappedAudit.length;
      }

      setSyncedCounts(counts);
      setSyncStatus('synced');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setStatusMessage(`Supabase sincronizado: ${counts.products} productos, ${counts.entries} entradas, ${counts.exits} salidas, ${counts.users} usuarios.`);
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

        if (error) {
          console.error("Error actualizando inventario:", error);
          setSupabaseErrorAlert({
            title: 'Error al actualizar Producto (inventario)',
            message: error.message || 'Error al actualizar el producto en la base de datos.',
            details: error.details || JSON.stringify(error),
            code: error.code,
            hint: error.hint,
          });
          throw error;
        }

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
          .insert([payloadInventario])
          .select();

        if (error) {
          console.error("Error insertando en inventario:", error);
          setSupabaseErrorAlert({
            title: 'Error al crear Producto (inventario)',
            message: error.message || 'Error al registrar el producto en la base de datos.',
            details: error.details || JSON.stringify(error),
            code: error.code,
            hint: error.hint,
          });
          throw error;
        }

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

  // 3. ENTRADAS: INSERT EN entradas_stock (con producto_id UUID) + UPDATE STOCK EN inventario + REGISTRO EN bitacora_auditoria
  const handleStockEntryToSupabase = async (entryData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Registrando entrada de stock en Supabase...');

    try {
      // Obtener producto seleccionado y su UUID
      const targetProd = products.find(p => String(p.id) === String(entryData.productId) || p.sku === String(entryData.productId));
      const productoId = targetProd ? targetProd.id : entryData.productId;

      const cantidad = Number(entryData.quantity);
      const costo_unitario = Number(entryData.unitCost);
      const costo_total = Number((cantidad * costo_unitario).toFixed(2));
      const proveedor = entryData.supplier || (targetProd ? targetProd.supplier : '') || 'Proveedor';
      const notas = entryData.notes || '';

      // Estructura exacta requerida por la tabla entradas_stock
      const payloadEntrada = {
        producto_id: productoId,
        cantidad: cantidad,
        costo_unitario: costo_unitario,
        costo_total: costo_total,
        proveedor: proveedor,
        notas: notas,
      };

      // 3.1 Inserción en entradas_stock
      const { data, error } = await supabase
        .from('entradas_stock')
        .insert([payloadEntrada])
        .select();

      if (error) {
        console.error("Error entrada:", error);
        setSupabaseErrorAlert({
          title: 'Error al registrar Entrada (entradas_stock)',
          message: error.message || 'Fallo en la inserción de la entrada en Supabase.',
          details: error.details || JSON.stringify(error),
          code: error.code,
          hint: error.hint,
        });
        throw error;
      }

      // 3.2 Actualizar inventario (cantidad y opcionalmente costo)
      if (targetProd) {
        const newStock = Number(targetProd.currentStock) + cantidad;
        const updateFields: any = { cantidad: newStock };
        if (entryData.updateProductCost) {
          updateFields.costo = costo_unitario;
        }

        const { error: invErr } = await supabase
          .from('inventario')
          .update(updateFields)
          .eq('id', targetProd.id);

        if (invErr) {
          console.warn("Reintentando actualización de inventario por SKU o columnas alternativas:", invErr);
          if (targetProd.sku) {
            await supabase.from('inventario').update(updateFields).eq('sku', targetProd.sku);
          }
          // Intentar actualizar columna 'stock' si 'cantidad' no existiera
          await supabase.from('inventario').update({ stock: newStock }).eq('id', targetProd.id);
        }
      }

      // 3.3 Registrar en bitacora_auditoria
      await logAuditToSupabase({
        modulo: 'Entradas',
        severidad: 'success',
        descripcion: `Ingreso de stock: +${cantidad} unidades de "${targetProd?.name || 'Producto'}" (${proveedor}). Costo total: $${costo_total.toLocaleString()}.`,
        recurso_afectado: targetProd?.sku || String(productoId),
        detalles: { payloadEntrada, totalCost: costo_total },
      });

      // Actualizar estado local en contexto
      registerStockEntry({
        ...entryData,
        productId: productoId,
        quantity: cantidad,
        unitCost: costo_unitario,
        totalCost: costo_total,
        supplier: proveedor,
      });

      // Garantizar actualización reactiva inmediata en el estado de productos
      setProducts(prev =>
        prev.map(p => {
          if (String(p.id) === String(productoId) || (targetProd && p.sku === targetProd.sku)) {
            return {
              ...p,
              currentStock: Number(p.currentStock) + cantidad,
              costPrice: entryData.updateProductCost ? costo_unitario : p.costPrice,
              supplier: proveedor || p.supplier,
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        })
      );

      setSyncStatus('synced');
      setStatusMessage(`Ingreso de +${cantidad} unidades guardado en Supabase.`);
    } catch (err: any) {
      console.error("Error entrada:", err);
      // Mantener consistencia local
      registerStockEntry(entryData);
      setProducts(prev =>
        prev.map(p => {
          if (String(p.id) === String(entryData.productId)) {
            return {
              ...p,
              currentStock: Number(p.currentStock) + Number(entryData.quantity),
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        })
      );
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err?.message || 'Error en entradas_stock'}`);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  // 4. SALIDAS / VENTAS: INSERT EN salidas_stock (con producto_id UUID y cálculos previos) + UPDATE STOCK EN inventario + REGISTRO EN bitacora_auditoria
  const handleStockExitToSupabase = async (exitData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Registrando salida/venta en Supabase...');

    try {
      // Obtener producto seleccionado y su UUID
      const targetProd = products.find(p => String(p.id) === String(exitData.productId) || p.sku === String(exitData.productId));
      const productoId = targetProd ? targetProd.id : exitData.productId;

      const cantidad = Number(exitData.quantity);
      const precio_unitario = Number(exitData.unitSellingPrice ?? (targetProd ? targetProd.sellingPrice : 0));
      const costo_unitario = Number(targetProd ? targetProd.costPrice : (exitData.unitCostPrice ?? 0));

      // Cálculos exigidos antes del insert
      const ingreso_total = Number((cantidad * precio_unitario).toFixed(2));
      const costo_total_mercantil = Number((cantidad * costo_unitario).toFixed(2));
      const utilidad_neta = Number((ingreso_total - costo_total_mercantil).toFixed(2));

      const canal_venta = exitData.channel || 'Tienda Web';
      const cliente = (exitData.customerName || exitData.cliente || '').trim() || 'Consumidor Final';
      const orden_ref = exitData.orderRef || '';
      const notas = exitData.notes || '';

      // Estructura exacta requerida por la tabla salidas_stock (incluyendo cliente)
      const payloadSalida = {
        producto_id: productoId,
        cantidad: cantidad,
        precio_unitario: precio_unitario,
        costo_unitario: costo_unitario,
        ingreso_total: ingreso_total,
        utilidad_neta: utilidad_neta,
        canal_venta: canal_venta,
        cliente: cliente,
        orden_ref: orden_ref,
        notas: notas,
      };

      // 4.1 Inserción en salidas_stock
      const { data, error } = await supabase
        .from('salidas_stock')
        .insert([payloadSalida])
        .select();

      if (error) {
        console.error("Error salida:", error);
        setSupabaseErrorAlert({
          title: 'Error al registrar Salida (salidas_stock)',
          message: error.message || 'Fallo en la inserción de la salida en Supabase.',
          details: error.details || JSON.stringify(error),
          code: error.code,
          hint: error.hint,
        });
        throw error;
      }

      // 4.2 Descontar stock en inventario
      if (targetProd) {
        const newStock = Math.max(0, Number(targetProd.currentStock) - cantidad);
        const { error: invErr } = await supabase
          .from('inventario')
          .update({ cantidad: newStock })
          .eq('id', targetProd.id);

        if (invErr) {
          console.warn("Reintentando descuento de stock por SKU o columnas alternativas:", invErr);
          if (targetProd.sku) {
            await supabase.from('inventario').update({ cantidad: newStock }).eq('sku', targetProd.sku);
          }
          // Intentar actualizar columna 'stock' si 'cantidad' no existiera
          await supabase.from('inventario').update({ stock: newStock }).eq('id', targetProd.id);
        }
      }

      // 4.3 Registrar en bitacora_auditoria
      await logAuditToSupabase({
        modulo: 'Salidas',
        severidad: 'info',
        descripcion: `Despacho de stock: -${cantidad} unidades de "${targetProd?.name || 'Producto'}" para "${cliente}" vía ${canal_venta}. Total: $${ingreso_total.toLocaleString()}.`,
        recurso_afectado: targetProd?.sku || String(productoId),
        detalles: { payloadSalida, cliente, ingreso_total, utilidad_neta },
      });

      // Actualizar estado local
      const res = registerStockExit({
        ...exitData,
        productId: productoId,
        quantity: cantidad,
        unitSellingPrice: precio_unitario,
        customerName: cliente,
      });

      // Garantizar actualización reactiva inmediata en el estado de productos
      setProducts(prev =>
        prev.map(p => {
          if (String(p.id) === String(productoId) || (targetProd && p.sku === targetProd.sku)) {
            return {
              ...p,
              currentStock: Math.max(0, Number(p.currentStock) - cantidad),
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        })
      );

      setSyncStatus('synced');
      setStatusMessage(`Salida de -${cantidad} unidades (${cliente}) guardada en Supabase.`);
      return res;
    } catch (err: any) {
      console.error("Error salida:", err);
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err?.message || 'Error en salidas_stock'}`);
      const res = registerStockExit(exitData);
      setProducts(prev =>
        prev.map(p => {
          if (String(p.id) === String(exitData.productId)) {
            return {
              ...p,
              currentStock: Math.max(0, Number(p.currentStock) - Number(exitData.quantity)),
              updatedAt: new Date().toISOString(),
            };
          }
          return p;
        })
      );
      return res;
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  // 5. USUARIOS: INSERT & UPDATE EN usuarios (validando email y campos estrictos) + REGISTRO EN bitacora_auditoria
  const handleSaveUserToSupabase = async (userData: any, isEdit: boolean, id?: string) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage(isEdit ? 'Actualizando usuario en Supabase...' : 'Guardando nuevo usuario en Supabase...');

    try {
      // Validación estricta de email
      const emailTrimmed = userData.email ? String(userData.email).trim() : '';
      if (!emailTrimmed) {
        const validationMsg = 'El correo electrónico no puede estar vacío.';
        console.error("Error usuario:", validationMsg);
        setSupabaseErrorAlert({
          title: 'Validación de Usuario',
          message: validationMsg,
          details: 'El campo "email" es obligatorio en la tabla usuarios.',
        });
        throw new Error(validationMsg);
      }

      // Estructura exacta requerida para la tabla usuarios
      const payloadUsuario = {
        nombre: userData.name?.trim() || 'Usuario',
        email: emailTrimmed,
        rol: userData.role || 'sales',
        cargo: userData.roleTitle?.trim() || rolePresets[userData.role as UserRole]?.title || 'Asesor Comercial',
        estado: 'active',
        pin_seguridad: userData.pin?.trim() || '1234',
        permisos: userData.permissions || {},
      };

      if (isEdit && id) {
        const { error } = await supabase
          .from('usuarios')
          .update(payloadUsuario)
          .eq('id', id);

        if (error) {
          console.error("Error usuario:", error);
          setSupabaseErrorAlert({
            title: 'Error al actualizar Usuario (usuarios)',
            message: error.message || 'Fallo en la actualización del usuario.',
            details: error.details || JSON.stringify(error),
            code: error.code,
            hint: error.hint,
          });
          throw error;
        }

        updateUser(id, userData);

        await logAuditToSupabase({
          modulo: 'Usuarios',
          severidad: 'info',
          descripcion: `Usuario "${userData.name}" (${emailTrimmed}) actualizado en el sistema.`,
          recurso_afectado: emailTrimmed,
          detalles: { id, updates: payloadUsuario },
        });

        setSyncStatus('synced');
        setStatusMessage(`Usuario "${userData.name}" actualizado.`);
      } else {
        const { data, error } = await supabase
          .from('usuarios')
          .insert([payloadUsuario])
          .select();

        if (error) {
          console.error("Error usuario:", error);
          setSupabaseErrorAlert({
            title: 'Error al crear Usuario (usuarios)',
            message: error.message || 'Fallo en la inserción del usuario.',
            details: error.details || JSON.stringify(error),
            code: error.code,
            hint: error.hint,
          });
          throw error;
        }

        const insertedUser = data && data[0] ? data[0] : null;
        if (insertedUser) {
          const newUserObj: User = {
            id: String(insertedUser.id),
            name: insertedUser.nombre || userData.name,
            email: insertedUser.email || emailTrimmed,
            role: insertedUser.rol || userData.role,
            roleTitle: insertedUser.cargo || userData.roleTitle,
            avatarColor: userData.avatarColor || 'emerald',
            initials: (userData.name || 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase(),
            status: insertedUser.estado || 'active',
            pin: insertedUser.pin_seguridad || userData.pin || '1234',
            createdAt: insertedUser.created_at || new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            permissions: userData.permissions,
          };
          setUsers(prev => [newUserObj, ...prev]);
        } else {
          addUser(userData);
        }

        await logAuditToSupabase({
          modulo: 'Usuarios',
          severidad: 'success',
          descripcion: `Nuevo usuario "${userData.name}" (${emailTrimmed}) creado con rol ${userData.role}.`,
          recurso_afectado: emailTrimmed,
          detalles: { payloadUsuario },
        });

        setSyncStatus('synced');
        setStatusMessage(`Usuario "${userData.name}" creado en Supabase.`);
      }
    } catch (err: any) {
      console.error("Error usuario:", err);
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err.message || 'Fallo en usuarios'}`);
      if (isEdit && id) {
        updateUser(id, userData);
      } else {
        addUser(userData);
      }
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 4500);
    }
  };

  // 6. ELIMINAR PRODUCTO: DELETE EN inventario + REGISTRO EN bitacora_auditoria
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

      if (error) {
        console.error("Error eliminando producto:", error);
        setSupabaseErrorAlert({
          title: 'Error al eliminar Producto (inventario)',
          message: error.message,
          details: error.details,
          code: error.code,
        });
        throw error;
      }

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
          <UsersTab onSaveUser={handleSaveUserToSupabase} />
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-auto text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span className="font-semibold text-stone-600">
            VITAL &middot; Sistema de Gestión de Inventarios y Control de Stock
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
        onSaveUser={handleSaveUserToSupabase}
      />

      {/* Visual Error Modal for Supabase Failures */}
      {supabaseErrorAlert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                    {supabaseErrorAlert.title}
                  </h3>
                  <button
                    onClick={() => setSupabaseErrorAlert(null)}
                    className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-rose-700 font-semibold mt-1">
                  {supabaseErrorAlert.message}
                </p>
                {supabaseErrorAlert.details && (
                  <div className="mt-3 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs font-mono break-words max-h-40 overflow-y-auto">
                    <span className="font-bold block text-stone-500 mb-1">Detalles técnicos:</span>
                    {supabaseErrorAlert.details}
                  </div>
                )}
                {supabaseErrorAlert.hint && (
                  <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>Sugerencia: {supabaseErrorAlert.hint}</span>
                  </div>
                )}
                {supabaseErrorAlert.code && (
                  <span className="inline-block mt-2 text-[10px] font-mono text-stone-400">
                    Código de error: {supabaseErrorAlert.code}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSupabaseErrorAlert(null)}
                className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

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
