import React from 'react';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertOctagon, 
  Percent, 
  ArrowUpRight, 
  Boxes,
  ShoppingCart,
  Lock
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { formatCurrency, formatNumber } from '../utils/formatters';

export const DashboardMetrics: React.FC = () => {
  const {
    products,
    settings,
    totalInventoryCost,
    totalInventoryRetailValue,
    totalPotentialProfit,
    totalRevenue,
    totalCOGS,
    totalRealizedProfit,
    overallMarginPercent,
    lowStockProducts,
    outOfStockProducts,
    totalItemsInStock,
    exits,
    hasPermission,
  } = useInventory();

  const canViewFinancials = hasPermission('canViewFinancialReports');
  const canViewCosts = hasPermission('canEditCostPrices') || canViewFinancials;

  // Total units sold
  const totalUnitsSold = exits.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" id="dashboard-metrics-grid">
      
      {/* 1. Valor del Inventario */}
      <div 
        id="metric-card-inventory-value"
        className="bg-white rounded-xl p-4.5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Valor de Inventario
          </span>
          <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
            <Boxes className="w-4 h-4" />
          </div>
        </div>
        <div>
          {canViewFinancials ? (
            <>
              <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900">
                {formatCurrency(totalInventoryRetailValue, settings.currencySymbol)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span>Costo Real: <strong className="text-stone-700 font-semibold">{canViewCosts ? formatCurrency(totalInventoryCost, settings.currencySymbol) : '••••'}</strong></span>
                <span className="text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                  +{formatCurrency(totalPotentialProfit, settings.currencySymbol)} pot.
                </span>
              </div>
            </>
          ) : (
            <div className="py-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-sm font-semibold">
                <Lock className="w-4 h-4 text-stone-400" />
                <span>Confidencial</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1 pt-2 border-t border-stone-100">
                {formatNumber(totalItemsInStock)} unidades físicas en stock
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Ventas Totales */}
      <div 
        id="metric-card-total-sales"
        className="bg-white rounded-xl p-4.5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Ventas Registradas
          </span>
          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
        </div>
        <div>
          {canViewFinancials ? (
            <>
              <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900">
                {formatCurrency(totalRevenue, settings.currencySymbol)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span>{formatNumber(exits.length)} transacciones</span>
                <span className="text-sky-800 font-medium bg-sky-50 px-1.5 py-0.5 rounded text-[11px]">
                  {formatNumber(totalUnitsSold)} u. despachadas
                </span>
              </div>
            </>
          ) : (
            <div>
              <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900">
                {formatNumber(totalUnitsSold)} <span className="text-xs font-normal text-stone-500">unidades</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span>{formatNumber(exits.length)} despachos realizados</span>
                <span className="text-emerald-700 font-medium text-[11px]">En curso</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Ganancia Neta Realizada & Margen */}
      <div 
        id="metric-card-realized-profit"
        className="bg-white rounded-xl p-4.5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Ganancia Neta Realizada
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div>
          {canViewFinancials ? (
            <>
              <div className="text-2xl font-bold font-['Outfit',sans-serif] text-emerald-700">
                +{formatCurrency(totalRealizedProfit, settings.currencySymbol)}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-100">
                <span>Costo Mercancía (COGS): <strong>{formatCurrency(totalCOGS, settings.currencySymbol)}</strong></span>
                <span className="font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[11px]">
                  {overallMarginPercent}% margen
                </span>
              </div>
            </>
          ) : (
            <div className="py-1">
              <div className="flex items-center gap-1.5 text-stone-400 text-sm font-semibold">
                <Lock className="w-4 h-4 text-stone-400" />
                <span>Restringido por Rol</span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1 pt-2 border-t border-stone-100">
                Solo accesible para gerencia y auditores
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Estado de Existencias & Alertas */}
      <div 
        id="metric-card-stock-status"
        className="bg-white rounded-xl p-4.5 border border-stone-200 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Salud de Stock
          </span>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            outOfStockProducts.length > 0 || lowStockProducts.length > 0 
              ? 'bg-amber-50 text-amber-700' 
              : 'bg-emerald-50 text-emerald-700'
          }`}>
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900">
              {formatNumber(products.length)}
            </span>
            <span className="text-xs text-stone-500">
              productos ({formatNumber(totalItemsInStock)} u. en total)
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs pt-2 border-t border-stone-100">
            {outOfStockProducts.length > 0 && (
              <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                {outOfStockProducts.length} Agotados
              </span>
            )}
            {lowStockProducts.length > 0 && (
              <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold text-[11px]">
                {lowStockProducts.length} Stock Bajo
              </span>
            )}
            {outOfStockProducts.length === 0 && lowStockProducts.length === 0 && (
              <span className="text-emerald-700 font-medium text-[11px]">
                ✓ Todo el catálogo abastecido
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
