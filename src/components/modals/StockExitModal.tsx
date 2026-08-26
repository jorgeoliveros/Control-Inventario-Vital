import React, { useState, useEffect } from 'react';
import { X, ArrowUpFromLine, ShoppingCart, DollarSign, TrendingUp, User, AlertCircle, Sparkles } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { Product, SalesChannel, ExitType } from '../../types';
import { formatCurrency, calculateProfitMargin } from '../../utils/formatters';

interface StockExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct?: Product | null;
  onSaveExit?: (exitData: any) => Promise<any> | any;
}

export const StockExitModal: React.FC<StockExitModalProps> = ({
  isOpen,
  onClose,
  selectedProduct,
  onSaveExit,
}) => {
  const { products, registerStockExit, settings } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [productId, setProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitSellingPrice, setUnitSellingPrice] = useState<number>(0);
  const [channel, setChannel] = useState<SalesChannel>('Tienda Web');
  const [type, setType] = useState<ExitType>('sale');
  const [customerName, setCustomerName] = useState<string>('');
  const [orderRef, setOrderRef] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const currentProduct = products.find(p => p.id === productId);

  useEffect(() => {
    if (selectedProduct) {
      setProductId(selectedProduct.id);
      setUnitSellingPrice(selectedProduct.sellingPrice);
      setQuantity(1);
    } else if (products.length > 0 && !productId) {
      setProductId(products[0].id);
      setUnitSellingPrice(products[0].sellingPrice);
      setQuantity(1);
    }
    setOrderRef(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
    setDate(new Date().toISOString().slice(0, 16));
    setError('');
  }, [selectedProduct, isOpen, products]);

  const handleProductChange = (newProdId: string) => {
    setProductId(newProdId);
    const prod = products.find(p => p.id === newProdId);
    if (prod) {
      setUnitSellingPrice(prod.sellingPrice);
    }
  };

  if (!isOpen) return null;

  const currentCost = currentProduct ? currentProduct.costPrice : 0;
  const isSale = type === 'sale';
  const totalRevenue = isSale ? Number((quantity * unitSellingPrice).toFixed(2)) : 0;
  const totalCost = Number((quantity * currentCost).toFixed(2));
  const totalProfit = Number((totalRevenue - totalCost).toFixed(2));
  const marginPercent = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const availableStock = currentProduct ? currentProduct.currentStock : 0;
  const remainingStock = availableStock - quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError('Debes seleccionar un producto.');
      return;
    }
    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0.');
      return;
    }
    if (availableStock < quantity) {
      setError(`Stock insuficiente. Disponibles: ${availableStock} ${currentProduct?.unit || 'unidades'}`);
      return;
    }

    const payload = {
      productId,
      quantity,
      unitSellingPrice,
      type,
      channel,
      customerName: customerName.trim(),
      orderRef: orderRef.trim(),
      date: new Date(date).toISOString(),
      notes: notes.trim(),
    };

    setIsSubmitting(true);
    try {
      if (onSaveExit) {
        const res = await onSaveExit(payload);
        if (res?.error) {
          setError(res.error);
          return;
        }
      } else {
        const res = registerStockExit(payload);
        if (res?.error) {
          setError(res.error);
          return;
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Error in stock exit:', err);
      setError(err?.message || 'Error al registrar salida.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
              <ArrowUpFromLine className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-emerald-950 font-['Outfit',sans-serif]">
                Registrar Salida / Venta
              </h2>
              <p className="text-xs text-emerald-800">
                Descuenta unidades del inventario y calcula automáticamente la ganancia
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
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Producto a Despachar *
            </label>
            <select
              value={productId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-medium"
              required
            >
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.currentStock <= 0}>
                  {p.sku} - {p.name} {p.currentStock <= 0 ? '(AGOTADO)' : `(Disp: ${p.currentStock} ${p.unit})`}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Selling Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                <span>Cantidad a Despachar *</span>
                <span className="text-[11px] text-stone-500">
                  Disp: <strong className={availableStock < 5 ? 'text-amber-700' : 'text-emerald-700'}>{availableStock}</strong> {currentProduct?.unit}
                </span>
              </label>
              <input
                type="number"
                min="1"
                max={availableStock}
                required
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Precio de Venta Aplicado *
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
                  value={unitSellingPrice || ''}
                  onChange={(e) => setUnitSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-bold"
                />
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">
                Costo base: {formatCurrency(currentCost, settings.currencySymbol)}/u
              </span>
            </div>
          </div>

          {/* Sales Channel & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Canal de Venta *
              </label>
              <select
                value={channel}
                onChange={(e: any) => setChannel(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-medium"
              >
                <option value="Tienda Web">Tienda Web</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram Direct</option>
                <option value="Punto Físico">Punto Físico / Showroom</option>
                <option value="MercadoLibre">MercadoLibre / Marketplace</option>
                <option value="Otro">Otro Canal</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tipo de Salida
              </label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              >
                <option value="sale">Venta Directa</option>
                <option value="sample">Muestra / Promoción</option>
                <option value="damaged">Merma / Producto Dañado</option>
                <option value="adjustment">Ajuste de Inventario</option>
                <option value="return_to_supplier">Devolución a Proveedor</option>
              </select>
            </div>
          </div>

          {/* Customer & Order Ref */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre del Cliente (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. Valeria Montero"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                N° de Pedido / Recibo
              </label>
              <input
                type="text"
                placeholder="ej. ORD-1099"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Fecha y Hora de Salida
            </label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-mono"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Notas adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles de envío, dirección, método de pago, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
            />
          </div>

          {/* LIVE PROFIT PREVIEW CARD */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-300/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-emerald-200">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                Cálculo de Ganancia en Vivo
              </span>
              <span className="text-[11px] text-emerald-900">
                Stock restante: <strong>{remainingStock} {currentProduct?.unit}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-stone-500 block text-[10px]">Ingreso Bruto:</span>
                <span className="font-bold font-mono text-stone-900">
                  {formatCurrency(totalRevenue, settings.currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-stone-500 block text-[10px]">Costo Base:</span>
                <span className="font-bold font-mono text-stone-700">
                  {formatCurrency(totalCost, settings.currencySymbol)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-emerald-800 block text-[10px]">Ganancia Neta:</span>
                <span className="font-bold font-mono text-emerald-700 text-sm">
                  +{formatCurrency(totalProfit, settings.currencySymbol)} ({marginPercent}%)
                </span>
              </div>
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
              id="btn-confirm-stock-exit"
              disabled={isSubmitting || availableStock <= 0 || quantity > availableStock}
              className={`px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-300 disabled:cursor-not-allowed rounded-lg transition-colors shadow-2xs ${
                isSubmitting ? 'opacity-75 cursor-wait' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Guardando en Supabase...' : `Confirmar Despacho (-${quantity})`}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
