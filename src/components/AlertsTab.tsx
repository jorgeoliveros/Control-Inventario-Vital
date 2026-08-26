import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  AlertOctagon, 
  ArrowDownToLine, 
  CheckCircle2, 
  Package, 
  TrendingDown, 
  DollarSign, 
  Building2,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product } from '../types';
import { formatCurrency, formatNumber, getStockStatus, getStockStatusLabel } from '../utils/formatters';

interface AlertsTabProps {
  onQuickRestock: (product: Product, suggestedQty?: number) => void;
  onOpenNewProduct: () => void;
}

export const AlertsTab: React.FC<AlertsTabProps> = ({ onQuickRestock, onOpenNewProduct }) => {
  const { products, settings } = useInventory();

  // Find all critical products (out of stock + low stock)
  const criticalProducts = useMemo(() => {
    return products
      .filter(p => p.currentStock <= p.minStock)
      .map(p => {
        const targetHealthy = Math.max(p.minStock * 2, 10);
        const deficit = Math.max(0, targetHealthy - p.currentStock);
        const estimatedRestockCost = Number((deficit * p.costPrice).toFixed(2));
        const status = getStockStatus(p.currentStock, p.minStock);

        return {
          ...p,
          targetHealthy,
          deficit,
          estimatedRestockCost,
          status,
        };
      })
      .sort((a, b) => {
        // Out of stock first, then by stock ascending
        if (a.currentStock === 0 && b.currentStock > 0) return -1;
        if (b.currentStock === 0 && a.currentStock > 0) return 1;
        return a.currentStock - b.currentStock;
      });
  }, [products]);

  // Aggregated alert metrics
  const alertMetrics = useMemo(() => {
    const outOfStockCount = criticalProducts.filter(p => p.currentStock === 0).length;
    const lowStockCount = criticalProducts.filter(p => p.currentStock > 0).length;
    let totalDeficitUnits = 0;
    let totalEstimatedCost = 0;

    criticalProducts.forEach(p => {
      totalDeficitUnits += p.deficit;
      totalEstimatedCost += p.estimatedRestockCost;
    });

    return {
      outOfStockCount,
      lowStockCount,
      totalDeficitUnits,
      totalEstimatedCost,
    };
  }, [criticalProducts]);

  return (
    <div className="space-y-6" id="alerts-tab-container">
      
      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Agotados */}
        <div className="bg-white rounded-xl p-5 border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              Productos Agotados
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-rose-700">
            {formatNumber(alertMetrics.outOfStockCount)}
          </div>
          <p className="text-[11px] text-rose-600 mt-1 font-medium">
            Urgencia Alta: 0 unidades disponibles
          </p>
        </div>

        {/* 2. Stock Bajo */}
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
              Stock en Nivel Crítico
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-amber-800">
            {formatNumber(alertMetrics.lowStockCount)}
          </div>
          <p className="text-[11px] text-amber-700 mt-1 font-medium">
            Stock igual o inferior al mínimo
          </p>
        </div>

        {/* 3. Unidades Sugeridas a Reordenar */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Unidades a Reponer
            </span>
            <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900">
            {formatNumber(alertMetrics.totalDeficitUnits)} u.
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Para alcanzar nivel óptimo de seguridad
          </p>
        </div>

        {/* 4. Inversión Estimada Requerida */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Inversión Estimada
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-sky-900">
            {formatCurrency(alertMetrics.totalEstimatedCost, settings.currencySymbol)}
          </div>
          <p className="text-[11px] text-stone-500 mt-1">
            Costo de compra al proveedor
          </p>
        </div>

      </div>

      {/* Main Alert List */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden" id="alerts-table-container">
        <div className="p-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-stone-900">
              Plan de Reabastecimiento de Inventario
            </h2>
            <p className="text-xs text-stone-500">
              Productos que requieren orden de compra o ingreso inmediato para no perder ventas.
            </p>
          </div>

          <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-3 py-1 rounded-full border border-stone-200">
            {criticalProducts.length} productos en lista
          </span>
        </div>

        {criticalProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">¡Inventario Saludable!</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              Todos los productos cuentan con existencias por encima de su umbral mínimo de seguridad.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {criticalProducts.map(p => {
              const isOut = p.currentStock === 0;
              const badge = getStockStatusLabel(p.status);

              return (
                <div 
                  key={p.id} 
                  className={`p-4 hover:bg-stone-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isOut ? 'bg-rose-50/20' : 'bg-amber-50/15'
                  }`}
                >
                  {/* Product Details */}
                  <div className="space-y-1 min-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${badge.bg}`}>
                        {badge.text}
                      </span>
                      <span className="font-mono text-xs font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                        {p.sku}
                      </span>
                      <span className="text-xs text-stone-400">&middot; {p.category}</span>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900">
                      {p.name}
                    </h3>

                    {p.supplier && (
                      <div className="flex items-center gap-1.5 text-xs text-stone-500">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>Proveedor habitual: <strong className="text-stone-700">{p.supplier}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Stock Metrics & Deficit */}
                  <div className="flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <div className="text-stone-400 text-[11px]">Stock Actual</div>
                      <div className={`text-base font-bold font-mono ${isOut ? 'text-rose-700' : 'text-amber-700'}`}>
                        {p.currentStock} {p.unit}
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="text-stone-400 text-[11px]">Stock Mínimo</div>
                      <div className="text-base font-bold font-mono text-stone-700">
                        {p.minStock} {p.unit}
                      </div>
                    </div>

                    <div className="text-center bg-stone-50 p-2 rounded-lg border border-stone-200 min-w-[110px]">
                      <div className="text-stone-500 text-[11px]">Sugerido Pedir</div>
                      <div className="text-base font-bold font-mono text-sky-800">
                        +{p.deficit} {p.unit}
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <div className="text-stone-400 text-[11px]">Inversión Sugerida</div>
                      <div className="text-sm font-bold font-mono text-stone-900">
                        {formatCurrency(p.estimatedRestockCost, settings.currencySymbol)}
                      </div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        ({formatCurrency(p.costPrice, settings.currencySymbol)}/u)
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  <div className="flex items-center justify-end">
                    <button
                      id={`btn-alerts-restock-${p.id}`}
                      onClick={() => onQuickRestock(p, p.deficit)}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <ArrowDownToLine className="w-4 h-4" />
                      <span>Reabastecer Stock (+{p.deficit})</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};
