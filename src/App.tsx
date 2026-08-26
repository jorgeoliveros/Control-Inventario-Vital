import React, { useState } from 'react';
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

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('inventory');

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

      {/* Footer note */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-auto text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-semibold text-stone-700">
            VITAL &middot; Sistema de Gestión de Inventarios, Trazabilidad y Control de Rentabilidad
          </span>
          <span className="text-[11px] text-stone-400">
            Bitácora de movimientos inmutable &middot; Control de accesos RBAC
          </span>
        </div>
      </footer>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <StockEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        selectedProduct={entrySelectedProduct}
        suggestedQuantity={entrySuggestedQty}
      />

      <StockExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        selectedProduct={exitSelectedProduct}
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
