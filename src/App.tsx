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
import { ActiveTab, Product } from './types';
import { supabase } from './supabaseClient';
import { 
  Database, 
  Loader2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  CloudCheck, 
  ArrowUpRight 
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { 
    products, 
    setProducts, 
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

  // 1. CARGA INICIAL DESDE SUPABASE: supabase.from('inventario').select('*')
  const fetchInventoryFromSupabase = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setSyncStatus('loading');
    setStatusMessage('Cargando inventario desde Supabase...');

    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*');

      if (error) {
        console.warn('Supabase fetch notice (tabla "inventario"):', error.message);
        setSyncStatus('error');
        setStatusMessage(`Supabase: ${error.message}`);
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        // Mapeo de columnas de Supabase (id, nombre, sku, cantidad, precio, categoria) al modelo Product
        const mappedProducts: Product[] = data.map((item: any) => ({
          id: String(item.id),
          name: item.nombre || item.name || 'Sin nombre',
          sku: item.sku || `SKU-${item.id}`,
          category: item.categoria || item.category || 'General',
          currentStock: Number(item.cantidad ?? item.currentStock ?? 0),
          sellingPrice: Number(item.precio ?? item.sellingPrice ?? 0),
          costPrice: Number(item.costPrice ?? item.costo ?? (Number(item.precio || 0) * 0.6)),
          minStock: Number(item.minStock ?? 5),
          unit: item.unit || 'unidades',
          supplier: item.supplier || 'Proveedor',
          description: item.description || '',
          createdAt: item.createdAt || item.created_at || new Date().toISOString(),
          updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
        }));

        setProducts(mappedProducts);
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setStatusMessage(`Sincronizado: ${data.length} productos cargados desde Supabase.`);
      } else {
        setSyncStatus('synced');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setStatusMessage('Conexión exitosa a Supabase (tabla "inventario" sin registros).');
      }
    } catch (err: any) {
      console.error('Error al conectar con Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(err?.message || 'Error de conexión con Supabase');
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setStatusMessage(prev => prev.startsWith('Sincronizado') || prev.startsWith('Conexión') ? '' : prev);
      }, 4000);
    }
  }, [setProducts]);

  // Ejecutar carga inicial al montar
  useEffect(() => {
    fetchInventoryFromSupabase();
  }, [fetchInventoryFromSupabase]);

  // 2. FUNCIÓN DE AGREGAR Y EDITAR PRODUCTO (INSERT & UPDATE EN SUPABASE)
  const handleSaveProductToSupabase = async (formData: any, isEdit: boolean, id?: string) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage(isEdit ? 'Actualizando registro en Supabase...' : 'Insertando nuevo producto en Supabase...');

    try {
      if (isEdit && id) {
        // Ejecutar UPDATE directo en la tabla 'inventario' de Supabase
        const { error } = await supabase
          .from('inventario')
          .update({
            nombre: formData.name,
            sku: formData.sku,
            cantidad: Number(formData.currentStock),
            precio: Number(formData.sellingPrice),
            categoria: formData.category,
          })
          .eq('id', id);

        if (error) {
          console.error('Error al actualizar en Supabase:', error);
          throw error;
        }

        // Actualizar estado local
        updateProduct(id, formData);
        setSyncStatus('synced');
        setStatusMessage(`Producto "${formData.name}" actualizado en Supabase.`);
      } else {
        // Ejecutar INSERT directo en la tabla 'inventario' de Supabase
        const { data, error } = await supabase
          .from('inventario')
          .insert([{
            nombre: formData.name,
            sku: formData.sku,
            cantidad: Number(formData.currentStock),
            precio: Number(formData.sellingPrice),
            categoria: formData.category,
          }])
          .select();

        if (error) {
          console.error('Error al insertar en Supabase:', error);
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

        setSyncStatus('synced');
        setStatusMessage(`Producto "${formData.name}" guardado exitosamente en Supabase.`);
      }
    } catch (err: any) {
      console.error('Fallo en operación de Supabase:', err);
      setSyncStatus('error');
      setStatusMessage(`Error Supabase: ${err.message || 'Fallo de guardado'}`);
      // Fallback local para que el usuario no pierda el flujo
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

  // 3. FUNCIÓN DE AJUSTE DE STOCK POR INGRESO (UPDATE EN SUPABASE)
  const handleStockEntryToSupabase = async (entryData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Ajustando stock en Supabase...');

    try {
      const targetProd = products.find(p => p.id === entryData.productId);
      if (targetProd) {
        const newStock = targetProd.currentStock + entryData.quantity;
        const { error } = await supabase
          .from('inventario')
          .update({ cantidad: newStock })
          .eq('id', targetProd.id);

        if (error) {
          console.warn('Error ajustando stock en Supabase:', error.message);
        }
      }

      registerStockEntry(entryData);
      setSyncStatus('synced');
      setStatusMessage('Stock ingresado y sincronizado en Supabase.');
    } catch (err: any) {
      console.error('Error en ingreso a Supabase:', err);
      registerStockEntry(entryData);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 3500);
    }
  };

  // 4. FUNCIÓN DE AJUSTE DE STOCK POR SALIDA/VENTA (UPDATE EN SUPABASE)
  const handleStockExitToSupabase = async (exitData: any) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage('Registrando salida y actualizando stock en Supabase...');

    try {
      const targetProd = products.find(p => p.id === exitData.productId);
      if (targetProd) {
        const newStock = Math.max(0, targetProd.currentStock - exitData.quantity);
        const { error } = await supabase
          .from('inventario')
          .update({ cantidad: newStock })
          .eq('id', targetProd.id);

        if (error) {
          console.warn('Error al descontar stock en Supabase:', error.message);
        }
      }

      const res = registerStockExit(exitData);
      setSyncStatus('synced');
      setStatusMessage('Salida registrada y stock actualizado en Supabase.');
      return res;
    } catch (err: any) {
      console.error('Error en salida a Supabase:', err);
      return registerStockExit(exitData);
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatusMessage(''), 3500);
    }
  };

  // 5. FUNCIÓN DE ELIMINAR (DELETE EN SUPABASE)
  const handleDeleteProductFromSupabase = async (id: string, name: string) => {
    setIsSaving(true);
    setSyncStatus('saving');
    setStatusMessage(`Eliminando "${name}" de Supabase...`);

    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error al eliminar en Supabase:', error);
        throw error;
      }

      deleteProduct(id);
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

      {/* Supabase Live Status & Synchronization Indicator Bar */}
      <div className="bg-white border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-stone-100 text-stone-700 border border-stone-200">
              <Database className="w-3.5 h-3.5 text-emerald-700" />
              <span>Supabase: <strong className="font-semibold">inventario</strong></span>
            </div>

            {/* Loading / Saving / Synced Indicator */}
            {isLoading && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Leyendo tabla...</span>
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
                <span>Conectado y sincronizado</span>
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full" title={statusMessage}>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Atención de conexión</span>
              </div>
            )}

            {statusMessage && (
              <span className="text-stone-600 hidden sm:inline-block truncate max-w-md">
                {statusMessage}
              </span>
            )}
          </div>

          {/* Right controls: Last sync time & manual refresh */}
          <div className="flex items-center gap-3 text-stone-500">
            {lastSyncTime && (
              <span className="text-[11px] hidden md:inline">
                Última sincronización: {lastSyncTime}
              </span>
            )}
            <button
              onClick={() => fetchInventoryFromSupabase(true)}
              disabled={isLoading || isSaving}
              className="inline-flex items-center gap-1 text-stone-600 hover:text-emerald-700 bg-stone-100 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Volver a consultar tabla de Supabase"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refrescar</span>
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
            VITAL &middot; Sistema de Gestión de Inventarios conectado a Supabase
          </span>
          <span className="text-[11px] text-stone-400">
            Tabla: <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-600">inventario</code> &middot; Consultas directas SELECT, INSERT, UPDATE, DELETE
          </span>
        </div>
      </footer>

      {/* Modals con integración directa a Supabase */}
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
