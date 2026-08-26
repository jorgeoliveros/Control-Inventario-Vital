import React, { useState } from 'react';
import { 
  Package, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Settings as SettingsIcon,
  Sparkles,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { ActiveTab, CurrencyCode } from '../types';
import { formatCurrency } from '../utils/formatters';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewProduct: () => void;
  onOpenEntry: () => void;
  onOpenExit: () => void;
  onOpenSettings: () => void;
  onOpenSwitchUser: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewProduct,
  onOpenEntry,
  onOpenExit,
  onOpenSettings,
  onOpenSwitchUser,
}) => {
  const { 
    criticalAlertCount, 
    totalInventoryRetailValue, 
    totalRealizedProfit, 
    settings, 
    updateSettings,
    currentUser,
    hasPermission,
    auditLogs
  } = useInventory();

  const currencies: { code: CurrencyCode; symbol: string; label: string }[] = [
    { code: 'USD', symbol: '$', label: 'USD ($)' },
    { code: 'CRC', symbol: '₡', label: 'CRC (₡)' },
    { code: 'EUR', symbol: '€', label: 'EUR (€)' },
    { code: 'MXN', symbol: '$', label: 'MXN ($)' },
    { code: 'COP', symbol: '$', label: 'COP ($)' },
  ];

  const getAvatarBg = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-700 text-white';
      case 'sky': return 'bg-sky-600 text-white';
      case 'amber': return 'bg-amber-600 text-white';
      case 'purple': return 'bg-purple-600 text-white';
      case 'rose': return 'bg-rose-600 text-white';
      case 'indigo': return 'bg-indigo-600 text-white';
      default: return 'bg-stone-800 text-white';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'manager': return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'warehouse': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'sales': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'auditor': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  const canManageProducts = hasPermission('canManageProducts');
  const canRegisterEntries = hasPermission('canRegisterEntries');
  const canRegisterExits = hasPermission('canRegisterExits');
  const canViewFinancials = hasPermission('canViewFinancialReports');
  const canViewAudit = hasPermission('canViewAuditLogs');
  const canManageUsers = hasPermission('canManageUsers');

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs" id="main-header">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-3 sm:gap-4">
          
          {/* Logo & Store Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl shadow-xs tracking-tight font-['Outfit',sans-serif]">
              V
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-['Outfit',sans-serif] font-bold text-xl tracking-wide text-stone-900">
                  VITAL
                </span>
                <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Inventarios
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                Tienda Virtual &middot; Control de Stock y Rentabilidad
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar on Desktop (only if user has financial permissions) */}
          {canViewFinancials && (
            <div className="hidden xl:flex items-center gap-5 text-xs bg-stone-50 px-3.5 py-1.5 rounded-xl border border-stone-200">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500">Valor Inventario:</span>
                <span className="font-semibold text-stone-800">
                  {formatCurrency(totalInventoryRetailValue, settings.currencySymbol)}
                </span>
              </div>
              <div className="w-px h-3.5 bg-stone-300"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500">Ganancia Neta:</span>
                <span className="font-semibold text-emerald-700">
                  +{formatCurrency(totalRealizedProfit, settings.currencySymbol)}
                </span>
              </div>
            </div>
          )}

          {/* User Session Switcher & Action Controls */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Active User Pill / Switcher */}
            <button
              id="btn-active-user-switcher"
              onClick={onOpenSwitchUser}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 hover:border-stone-300 transition-all cursor-pointer shadow-2xs group"
              title="Cambiar de usuario / Ver permisos"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs font-['Outfit',sans-serif] ${getAvatarBg(currentUser.avatarColor)}`}>
                {currentUser.initials}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-stone-900 group-hover:text-emerald-800 transition-colors flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  <ChevronDown className="w-3 h-3 text-stone-400" />
                </div>
                <div className="text-[10px] text-stone-500 truncate max-w-[120px]">
                  {currentUser.roleTitle}
                </div>
              </div>
            </button>

            {/* Currency Selector */}
            <div className="relative hidden sm:block">
              <select
                id="currency-selector"
                value={settings.currency}
                onChange={(e) => {
                  const selected = currencies.find(c => c.code === e.target.value);
                  if (selected) {
                    updateSettings({ currency: selected.code, currencySymbol: selected.symbol });
                  }
                }}
                className="text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-lg px-2.5 py-2 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                title="Cambiar Moneda"
              >
                {currencies.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Action: New Stock Entry */}
            {canRegisterEntries && (
              <button
                id="btn-quick-entry"
                onClick={onOpenEntry}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Registrar Ingreso de Mercancía"
              >
                <ArrowDownToLine className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden lg:inline">Ingreso</span>
              </button>
            )}

            {/* Quick Action: New Sale / Exit */}
            {canRegisterExits && (
              <button
                id="btn-quick-exit"
                onClick={onOpenExit}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                title="Registrar Salida / Venta"
              >
                <ArrowUpFromLine className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden lg:inline">Venta / Salida</span>
              </button>
            )}

            {/* Quick Action: New Product */}
            {canManageProducts && (
              <button
                id="btn-quick-new-product"
                onClick={onOpenNewProduct}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nuevo Producto</span>
              </button>
            )}

            {/* Settings button */}
            <button
              id="btn-header-settings"
              onClick={onOpenSettings}
              className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg border border-transparent transition-colors cursor-pointer"
              title="Opciones y Base de Datos"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto border-t border-stone-100 pt-1 pb-2 scrollbar-none gap-2">
          <nav className="flex items-center gap-1 sm:gap-1.5">
            
            {/* Inventario General */}
            <button
              id="tab-nav-inventory"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'inventory'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventario</span>
            </button>

            {/* Ingresos */}
            <button
              id="tab-nav-entries"
              onClick={() => setActiveTab('entries')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'entries'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ArrowDownToLine className="w-4 h-4" />
              <span>Ingresos</span>
            </button>

            {/* Salidas & Ventas */}
            <button
              id="tab-nav-exits"
              onClick={() => setActiveTab('exits')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'exits'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ArrowUpFromLine className="w-4 h-4" />
              <span>Salidas & Ventas</span>
            </button>

            {/* Reportes */}
            <button
              id="tab-nav-reports"
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reportes</span>
            </button>

            {/* Alertas */}
            <button
              id="tab-nav-alerts"
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap relative ${
                activeTab === 'alerts'
                  ? 'bg-rose-700 text-white shadow-2xs'
                  : criticalAlertCount > 0
                  ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${criticalAlertCount > 0 && activeTab !== 'alerts' ? 'animate-bounce' : ''}`} />
              <span>Alertas</span>
              {criticalAlertCount > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    activeTab === 'alerts' ? 'bg-white text-rose-800' : 'bg-rose-600 text-white'
                  }`}
                >
                  {criticalAlertCount}
                </span>
              )}
            </button>

            {/* Bitácora de Auditoría */}
            <button
              id="tab-nav-audit"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bitácora</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                {auditLogs.length}
              </span>
            </button>

            {/* Usuarios & Roles */}
            <button
              id="tab-nav-users"
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'users'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <Users className="w-4 h-4 text-purple-600" />
              <span>Usuarios</span>
            </button>

          </nav>
        </div>
      </div>
    </header>
  );
};
