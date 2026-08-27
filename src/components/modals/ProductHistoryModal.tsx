import React, { useMemo, useState } from 'react';
import { 
  X, 
  History, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp,
  ArrowUpDown,
  Calculator,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
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
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filter entries and exits for this product (guaranteed top-level hook execution)
  const productEntries = useMemo(() => {
    if (!product) return [];
    return entries.filter(e => String(e.productId) === String(product.id) || (product.sku && e.productSku === product.sku));
  }, [entries, product?.id, product?.sku]);

  const productExits = useMemo(() => {
    if (!product) return [];
    return exits.filter(e => String(e.productId) === String(product.id) || (product.sku && e.productSku === product.sku));
  }, [exits, product?.id, product?.sku]);

  // Check if there is already an explicit initial load entry in entries
  const hasExplicitInitialEntry = useMemo(() => {
    return productEntries.some(
      e => (e.invoiceRef && e.invoiceRef.toUpperCase() === 'INICIAL') || 
           (e.notes && e.notes.toLowerCase().includes('inicial'))
    );
  }, [productEntries]);

  // Baseline initial stock movement in case no separate row exists in entries table
  const initialStockMovement = useMemo(() => {
    if (!product || hasExplicitInitialEntry) return null;

    const explicitEntriesQty = productEntries.reduce((acc, e) => acc + e.quantity, 0);
    const exitsQty = productExits.reduce((acc, e) => acc + e.quantity, 0);
    // Calculated initial baseline units before subsequent restocks and sales
    const initialQty = Math.max(0, (product.currentStock || 0) + exitsQty - explicitEntriesQty);

    if (initialQty <= 0) return null;

    // Date for initial stock: place it right before the earliest movement or use product creation date
    const allTimestamps = [...productEntries, ...productExits]
      .map(m => new Date(m.date).getTime())
      .filter(t => !isNaN(t));

    let initialDate = product.createdAt;
    if (allTimestamps.length > 0) {
      const earliestMovementTime = Math.min(...allTimestamps);
      // If product.createdAt is missing, invalid, or AFTER the earliest movement, position initial stock 1 minute before the earliest movement
      if (!initialDate || isNaN(new Date(initialDate).getTime()) || new Date(initialDate).getTime() >= earliestMovementTime) {
        initialDate = new Date(earliestMovementTime - 60000).toISOString();
      }
    } else if (!initialDate || isNaN(new Date(initialDate).getTime())) {
      initialDate = new Date().toISOString();
    }

    return {
      id: `initial-entry-${product.id}`,
      date: initialDate,
      type: 'entry' as const,
      quantity: initialQty,
      priceOrCost: product.costPrice || 0,
      total: Number((initialQty * (product.costPrice || 0)).toFixed(2)),
      ref: 'INICIAL',
      party: product.supplier || 'Inventario Inicial',
      notes: 'Carga de inventario inicial',
    };
  }, [hasExplicitInitialEntry, productEntries, productExits, product]);

  // Build full chronological ledger with accurate running balance (Saldo acumulado paso a paso)
  const processedMovements = useMemo(() => {
    const rawList: Array<{
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

    // Include initial stock entry if not already in entries table
    if (initialStockMovement) {
      rawList.push(initialStockMovement);
    }

    productEntries.forEach(e => {
      rawList.push({
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
      rawList.push({
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

    // 1. Sort strictly in ascending chronological order to calculate running balance
    rawList.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Compute progressive stock balance after each transaction
    let runningBalance = 0;
    const withBalance = rawList.map(m => {
      if (m.type === 'entry') {
        runningBalance += m.quantity;
      } else {
        runningBalance = Math.max(0, runningBalance - m.quantity);
      }
      return {
        ...m,
        balanceAfter: runningBalance,
      };
    });

    // 3. Return sorted according to user preference
    if (sortOrder === 'desc') {
      return [...withBalance].reverse();
    }
    return withBalance;
  }, [initialStockMovement, productEntries, productExits, sortOrder]);

  // Aggregates for this product
  const totalPurchasedUnits = useMemo(() => {
    const fromEntries = productEntries.reduce((acc, curr) => acc + curr.quantity, 0);
    const fromInitial = initialStockMovement ? initialStockMovement.quantity : 0;
    return fromEntries + fromInitial;
  }, [productEntries, initialStockMovement]);

  if (!isOpen || !product) return null;

  const totalSoldUnits = productExits.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalRevenueGenerated = productExits.reduce((acc, curr) => acc + curr.totalRevenue, 0);
  const totalProfitGenerated = productExits.reduce((acc, curr) => acc + curr.profit, 0);

  const margin = calculateProfitMargin(product.costPrice, product.sellingPrice);

  // Mathematical validation check: Entradas - Salidas = Stock Actual
  const isMathAccurate = (totalPurchasedUnits - totalSoldUnits) === product.currentStock;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-stone-900 text-white px-6 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 text-emerald-400 flex items-center justify-center font-bold text-sm border border-white/10">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white font-['Outfit',sans-serif]">
                  Ficha Kardex / Historial de Movimientos
                </h2>
                <span className="font-mono text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  {product.sku}
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium truncate max-w-xl">
                {product.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-stone-50/50">
          
          {/* Mathematical Inventory Balance Breakdown */}
          <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-stone-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800 font-['Outfit',sans-serif]">
                  Balance de Unidades & Operación Matemática
                </h3>
              </div>
              {isMathAccurate ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ecuación de Kardex Verificada (Entradas - Salidas = Stock)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Ajuste de inventario en curso</span>
                </div>
              )}
            </div>

            {/* Arithmetic Formula Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
              {/* Total Entries */}
              <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl">
                <span className="text-[11px] font-semibold text-sky-700 flex items-center justify-center gap-1">
                  <ArrowDownToLine className="w-3.5 h-3.5" /> Total Ingresos (+)
                </span>
                <span className="text-xl font-black font-mono text-sky-900 block mt-1">
                  +{formatNumber(totalPurchasedUnits)} <span className="text-xs font-normal text-sky-700">{product.unit}</span>
                </span>
                <span className="text-[10px] text-sky-600">Compras + Carga Inicial</span>
              </div>

              {/* Total Exits */}
              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl">
                <span className="text-[11px] font-semibold text-rose-700 flex items-center justify-center gap-1">
                  <ArrowUpFromLine className="w-3.5 h-3.5" /> Total Salidas (-)
                </span>
                <span className="text-xl font-black font-mono text-rose-900 block mt-1">
                  -{formatNumber(totalSoldUnits)} <span className="text-xs font-normal text-rose-700">{product.unit}</span>
                </span>
                <span className="text-[10px] text-rose-600">Ventas & Despachos</span>
              </div>

              {/* Resulting Stock */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-300 rounded-xl shadow-xs">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center justify-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Saldo Stock Disponible (=)
                </span>
                <span className="text-xl font-black font-mono text-emerald-950 block mt-1">
                  {formatNumber(product.currentStock)} <span className="text-xs font-semibold text-emerald-800">{product.unit}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">Stock en Almacén</span>
              </div>
            </div>

            {/* Financial Performance Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-stone-100 text-xs">
              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                <span className="text-stone-500 text-[10px] block">Costo Adquisición:</span>
                <span className="font-mono font-bold text-stone-800">
                  {formatCurrency(product.costPrice, settings.currencySymbol)}
                </span>
              </div>
              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                <span className="text-stone-500 text-[10px] block">Precio de Venta:</span>
                <span className="font-mono font-bold text-stone-800">
                  {formatCurrency(product.sellingPrice, settings.currencySymbol)}
                </span>
              </div>
              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                <span className="text-stone-500 text-[10px] block">Margen Unitario:</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(margin.profitPerUnit, settings.currencySymbol)} ({margin.marginPercent}%)
                </span>
              </div>
              <div className="bg-stone-50 p-2 rounded-lg border border-stone-200">
                <span className="text-stone-500 text-[10px] block">Utilidad Realizada:</span>
                <span className="font-mono font-bold text-emerald-700">
                  +{formatCurrency(totalProfitGenerated, settings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline of movements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider font-['Outfit',sans-serif]">
                  Movimientos Cronológicos del Producto ({processedMovements.length})
                </h3>
                <span className="text-[11px] text-stone-500">
                  (Cada fila muestra el Saldo Resultante tras la transacción)
                </span>
              </div>

              <button
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                className="flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 bg-white border border-stone-200 px-2.5 py-1 rounded-lg hover:bg-stone-50 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortOrder === 'desc' ? 'Más recientes primero' : 'Más antiguos primero'}</span>
              </button>
            </div>

            {processedMovements.length === 0 ? (
              <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
                <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                <p className="text-xs text-stone-500 font-medium">No hay movimientos registrados para este producto.</p>
              </div>
            ) : (
              <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-xs divide-y divide-stone-100">
                {/* Table Header for Large Screens */}
                <div className="hidden sm:grid sm:grid-cols-12 gap-3 bg-stone-100/80 px-4 py-2.5 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <div className="col-span-3">Operación & Fecha</div>
                  <div className="col-span-3">Comprobante / Tercero</div>
                  <div className="col-span-2 text-right">Movimiento</div>
                  <div className="col-span-2 text-right">Detalle Financiero</div>
                  <div className="col-span-2 text-right text-stone-900">Saldo en Stock</div>
                </div>

                {processedMovements.map(m => {
                  const isEntry = m.type === 'entry';
                  return (
                    <div 
                      key={m.id} 
                      className={`p-3.5 sm:px-4 sm:py-3 transition-colors ${
                        isEntry ? 'hover:bg-sky-50/40' : 'hover:bg-rose-50/30'
                      }`}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 items-center">
                        
                        {/* Col 1: Operation Badge & Date */}
                        <div className="sm:col-span-3 flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isEntry ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isEntry ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className={`text-xs font-bold block ${
                              isEntry ? 'text-sky-900' : 'text-rose-900'
                            }`}>
                              {isEntry ? (m.ref === 'INICIAL' ? 'Carga Inicial' : 'Ingreso de Stock') : 'Salida / Venta'}
                            </span>
                            <span className="font-mono text-[11px] text-stone-500">
                              {formatDate(m.date)}
                            </span>
                          </div>
                        </div>

                        {/* Col 2: Voucher / Party */}
                        <div className="sm:col-span-3 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {m.ref && (
                              <span className="font-mono text-[11px] font-semibold bg-stone-100 border border-stone-200 text-stone-700 px-1.5 py-0.5 rounded">
                                {m.ref}
                              </span>
                            )}
                            <span className="font-medium text-stone-800 truncate">
                              {m.party || 'General'}
                            </span>
                          </div>
                          {m.notes && (
                            <p className="text-[11px] text-stone-400 italic truncate mt-0.5" title={m.notes}>
                              {m.notes}
                            </p>
                          )}
                        </div>

                        {/* Col 3: Movement Quantity */}
                        <div className="sm:col-span-2 text-left sm:text-right">
                          <span className={`font-mono font-bold text-sm ${
                            isEntry ? 'text-sky-700' : 'text-rose-700'
                          }`}>
                            {isEntry ? `+${m.quantity}` : `-${m.quantity}`} {product.unit}
                          </span>
                        </div>

                        {/* Col 4: Financial Total */}
                        <div className="sm:col-span-2 text-left sm:text-right font-mono text-[11px]">
                          {isEntry ? (
                            <div>
                              <span className="text-stone-700 font-medium">
                                {formatCurrency(m.total, settings.currencySymbol)}
                              </span>
                              <span className="text-stone-400 block text-[10px]">
                                @{formatCurrency(m.priceOrCost, settings.currencySymbol)}/u
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-stone-800 font-medium">
                                {formatCurrency(m.total, settings.currencySymbol)}
                              </span>
                              <span className="text-emerald-700 font-semibold block text-[10px]">
                                Utilidad: +{formatCurrency(m.profit || 0, settings.currencySymbol)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Col 5: Resulting Running Balance */}
                        <div className="sm:col-span-2 text-left sm:text-right">
                          <div className="inline-block sm:block">
                            <span className="sm:hidden text-[10px] text-stone-400 mr-1.5">Saldo:</span>
                            <span className="font-mono font-black text-xs sm:text-sm bg-stone-100 border border-stone-300 text-stone-900 px-2 py-0.5 rounded-md">
                              {m.balanceAfter} {product.unit}
                            </span>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-100 px-6 py-3.5 border-t border-stone-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-stone-600 font-medium">
            Producto: <span className="font-bold text-stone-900">{product.name}</span> &middot; Stock Final: <span className="font-mono font-bold text-emerald-800">{product.currentStock} {product.unit}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
