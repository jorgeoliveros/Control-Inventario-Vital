import React, { useMemo } from 'react';
import { X, History, ArrowDownToLine, ArrowUpFromLine, Calendar, DollarSign, Package, TrendingUp } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types';
import { formatCurrency, formatNumber, formatDate, calculateProfitMargin } from '../../utils/formatters';

interface ProductHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductHistoryModal: React.FC<ProductHistoryModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const { entries, exits, settings } = useInventory();

  if (!isOpen || !product) return null;

  // Filter entries and exits for this product
  const productEntries = useMemo(() => {
    return entries.filter(e => e.productId === product.id);
  }, [entries, product.id]);

  const productExits = useMemo(() => {
    return exits.filter(e => e.productId === product.id);
  }, [exits, product.id]);

  // Merge movements in reverse chronological order
  const movements = useMemo(() => {
    const list: Array<{
      id: string;
      date: string;
      type: 'entry' | 'exit';
      quantity: number;
      priceOrCost: number;
      total: number;
      profit?: number;
      ref?: string;
      party?: string;
      notes?: string;
    }> = [];

    productEntries.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        type: 'entry',
        quantity: e.quantity,
        priceOrCost: e.unitCost,
        total: e.totalCost,
        ref: e.invoiceRef,
        party: e.supplier,
        notes: e.notes,
      });
    });

    productExits.forEach(e => {
      list.push({
        id: e.id,
        date: e.date,
        type: 'exit',
        quantity: e.quantity,
        priceOrCost: e.unitSellingPrice,
        total: e.totalRevenue,
        profit: e.profit,
        ref: e.orderRef,
        party: e.customerName || e.channel,
        notes: e.notes,
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [productEntries, productExits]);

  // Aggregates for this product
  const totalPurchasedUnits = productEntries.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalSoldUnits = productExits.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRevenueGenerated = productExits.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalProfitGenerated = productExits.reduce((acc, curr) => acc + curr.profit, 0);

  const margin = calculateProfitMargin(product.costPrice, product.sellingPrice);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold text-sm">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                  Historial de Movimientos (Kardex)
                </h2>
                <span className="font-mono text-xs font-semibold bg-stone-200 text-stone-700 px-2 py-0.5 rounded">
                  {product.sku}
                </span>
              </div>
              <p className="text-xs text-stone-600 font-semibold truncate max-w-lg">
                {product.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Snapshot Card */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
            <div>
              <span className="text-stone-400 block text-[11px]">Stock Actual:</span>
              <span className="text-base font-bold font-mono text-stone-900">
                {product.currentStock} {product.unit}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Margen Unitario:</span>
              <span className="text-base font-bold font-mono text-emerald-700">
                +{formatCurrency(margin.profitPerUnit, settings.currencySymbol)} ({margin.marginPercent}%)
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Total Vendido:</span>
              <span className="text-base font-bold font-mono text-stone-900">
                {formatNumber(totalSoldUnits)} u.
              </span>
            </div>
            <div>
              <span className="text-stone-400 block text-[11px]">Utilidad Histórica:</span>
              <span className="text-base font-bold font-mono text-emerald-700">
                +{formatCurrency(totalProfitGenerated, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Timeline of movements */}
          <div>
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-3">
              Línea de Tiempo de Entradas y Salidas ({movements.length} movimientos)
            </h3>

            {movements.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">No hay movimientos registrados para este producto.</p>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 text-xs">
                {movements.map(m => (
                  <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-stone-50/70 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.type === 'entry' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {m.type === 'entry' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${m.type === 'entry' ? 'text-sky-900' : 'text-emerald-900'}`}>
                            {m.type === 'entry' ? 'Ingreso de Stock' : 'Salida / Venta'}
                          </span>
                          <span className="font-mono text-[11px] text-stone-400">
                            {formatDate(m.date)}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-600 mt-0.5">
                          {m.ref && <span className="font-mono bg-stone-100 px-1 py-0.2 rounded mr-1.5">{m.ref}</span>}
                          {m.party && <span>{m.party}</span>}
                          {m.notes && <span className="text-stone-400 italic"> &middot; {m.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono font-bold text-sm">
                        <span className={m.type === 'entry' ? 'text-sky-700' : 'text-stone-900'}>
                          {m.type === 'entry' ? `+${m.quantity}` : `-${m.quantity}`} {product.unit}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-mono">
                        {m.type === 'entry' ? (
                          <span>Costo: {formatCurrency(m.total, settings.currencySymbol)}</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">
                            Ganancia: +{formatCurrency(m.profit || 0, settings.currencySymbol)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-6 py-3 border-t border-stone-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-200 hover:bg-stone-300 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
