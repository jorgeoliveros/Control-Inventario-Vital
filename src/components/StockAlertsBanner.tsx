import React from 'react';
import { AlertTriangle, ArrowDownToLine, ChevronRight, AlertOctagon } from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product } from '../types';

interface StockAlertsBannerProps {
  onQuickRestock: (product: Product) => void;
  onViewAllAlerts: () => void;
}

export const StockAlertsBanner: React.FC<StockAlertsBannerProps> = ({
  onQuickRestock,
  onViewAllAlerts,
}) => {
  const { lowStockProducts, outOfStockProducts } = useInventory();
  const allCritical = [...outOfStockProducts, ...lowStockProducts];

  if (allCritical.length === 0) return null;

  return (
    <div 
      id="stock-alerts-banner"
      className="bg-amber-50/90 border border-amber-300/80 rounded-xl p-4 mb-6 shadow-2xs"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-950">
              Alerta de Reabastecimiento Requerido ({allCritical.length} {allCritical.length === 1 ? 'producto' : 'productos'})
            </h2>
            <p className="text-xs text-amber-800">
              Hay productos con inventario igual o inferior al stock mínimo configurado.
            </p>
          </div>
        </div>
        <button
          id="btn-view-all-alerts"
          onClick={onViewAllAlerts}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200/80 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Ver Módulo de Alertas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Critical products horizontal scroller */}
      <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {allCritical.slice(0, 4).map((product) => {
          const isOut = product.currentStock <= 0;
          return (
            <div
              key={product.id}
              className={`flex-1 min-w-[260px] max-w-[320px] p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2 ${
                isOut
                  ? 'bg-rose-50/80 border-rose-200 text-rose-950'
                  : 'bg-white border-amber-200 text-stone-900'
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isOut ? 'bg-rose-600' : 'bg-amber-500 animate-pulse'}`} />
                  <span className="font-mono text-[10px] text-stone-500">{product.sku}</span>
                </div>
                <div className="font-semibold truncate text-stone-900">{product.name}</div>
                <div className="text-[11px] text-stone-600">
                  Stock actual: <strong className={isOut ? 'text-rose-700' : 'text-amber-800'}>{product.currentStock}</strong> / Mín: {product.minStock} {product.unit}
                </div>
              </div>
              <button
                id={`btn-banner-restock-${product.id}`}
                onClick={() => onQuickRestock(product)}
                className="shrink-0 p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                title="Registrar Ingreso de Stock"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>Reabastecer</span>
              </button>
            </div>
          );
        })}
        {allCritical.length > 4 && (
          <button
            onClick={onViewAllAlerts}
            className="shrink-0 min-w-[120px] rounded-lg border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/50 flex flex-col items-center justify-center p-2 text-xs font-semibold text-amber-900 transition-colors cursor-pointer"
          >
            <span>+{allCritical.length - 4} más</span>
            <span className="text-[11px] text-amber-700">Ver todos</span>
          </button>
        )}
      </div>
    </div>
  );
};
