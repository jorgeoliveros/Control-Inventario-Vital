import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, DollarSign, Building2, Package, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface StockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct?: Product | null;
  suggestedQuantity?: number;
  onSaveEntry?: (entryData: any) => Promise<void> | void;
}

export const StockEntryModal: React.FC<StockEntryModalProps> = ({
  isOpen,
  onClose,
  selectedProduct,
  suggestedQuantity,
  onSaveEntry,
}) => {
  const { products, registerStockEntry, settings } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [supplier, setSupplier] = useState<string>('');
  const [invoiceRef, setInvoiceRef] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState<string>('');
  const [updateProductCost, setUpdateProductCost] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const currentProduct = products.find(p => String(p.id) === String(productId) || p.sku === String(productId));

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
      setUnitCost(selectedProduct.costPrice);
      setSupplier(selectedProduct.supplier || '');
      setQuantity(suggestedQuantity && suggestedQuantity > 0 ? suggestedQuantity : 10);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0].id);
      setUnitCost(products[0].costPrice);
      setSupplier(products[0].supplier || '');
      setQuantity(10);
    }
    setInvoiceRef(`FAC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
    setDate(new Date().toISOString().slice(0, 16));
    setError('');
  }, [selectedProduct, isOpen, products]);

  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const prod = products.find(p => p.id === newProdId);
    if (prod) {
      setUnitCost(prod.costPrice);
      setSupplier(prod.supplier || '');
    }
  };

  if (!isOpen) return null;

  const totalCost = Number((quantity * unitCost).toFixed(2));
  const newStockPreview = currentProduct ? currentProduct.currentStock + quantity : quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Debes seleccionar un producto.');
      return;
    }
    if (quantity <= 0) {
      setError('La cantidad a ingresar debe ser mayor a 0.');
      return;
    }
    if (unitCost < 0) {
      setError('El costo unitario no puede ser negativo.');
      return;
    }

    const payload = {
      productId,
      quantity,
      unitCost,
      supplier: supplier.trim() || 'Proveedor General',
      invoiceRef: invoiceRef.trim(),
      date: new Date(date).toISOString(),
      notes: notes.trim(),
      updateProductCost,
    };

    setIsSubmitting(true);
    try {
      if (onSaveEntry) {
        await onSaveEntry(payload);
      } else {
        registerStockEntry(payload);
      }
      onClose();
    } catch (err: any) {
      console.error('Error in stock entry:', err);
      setError(err?.message || 'Error al registrar ingreso.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-sky-50 px-6 py-4 border-b border-sky-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-700 text-white flex items-center justify-center font-bold text-sm">
              <ArrowDownToLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-sky-950 font-['Outfit',sans-serif]">
                Registrar Ingreso de Mercancía
              </h2>
              <p className="text-xs text-sky-800">
                Aumenta el stock físico y registra el costo de compra
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Producto a Ingresar *
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900 font-medium"
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name} (Stock actual: {p.currentStock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Cantidad Entrante *
              </label>
              <input
                type="number"
                min="1"
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                placeholder="10"
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900 font-bold"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Unidades recibidas del proveedor
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Costo Unitario de Compra *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-mono text-xs">
                  {settings.currencySymbol}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitCost || ''}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900 font-bold"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Costo unitario en esta compra
              </span>
            </div>
          </div>

          {/* Supplier & Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Proveedor / Distribuidor
              </label>
              <input
                type="text"
                placeholder="ej. NutraLabs Global"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                N° Factura / Lote / Comprobante
              </label>
              <input
                type="text"
                placeholder="ej. FAC-2026-890"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Fecha y Hora de Ingreso
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900 font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Número de lote, fecha de vencimiento, detalles del transporte..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-900"
            />
          </div>

          {/* Checkbox update base cost */}
          <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
            <input
              type="checkbox"
              id="update-cost-check"
              checked={updateProductCost}
              onChange={(e) => setUpdateProductCost(e.target.checked)}
              className="rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
            />
            <label htmlFor="update-cost-check" className="text-xs text-stone-700 cursor-pointer">
              Actualizar el <strong>Costo Real base</strong> de este producto en el catálogo ({formatCurrency(unitCost, settings.currencySymbol)})
            </label>
          </div>

          {/* Live Impact Preview */}
          <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl text-xs flex items-center justify-between">
            <div>
              <span className="text-sky-900 font-bold block">Resumen del Ingreso:</span>
              <span className="text-sky-800 text-[11px]">
                Stock resultante: <strong className="text-stone-900">{newStockPreview} {currentProduct?.unit || 'unidades'}</strong> (+{quantity})
              </span>
            </div>
            <div className="text-right">
              <span className="text-stone-500 text-[10px] block">Inversión Total:</span>
              <span className="text-base font-bold font-mono text-sky-900">
                {formatCurrency(totalCost, settings.currencySymbol)}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="btn-confirm-stock-entry"
              className={`px-5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs ${
                isSubmitting ? 'opacity-75 cursor-wait' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Guardando en Supabase...' : `Confirmar Ingreso (+${quantity})`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
