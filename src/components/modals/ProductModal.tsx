import React, { useState, useEffect } from 'react';
import { X, DollarSign, Percent, TrendingUp, Sparkles, Tag, Boxes, AlertTriangle } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { Product } from '../../types';
import { productCategories } from '../../data/initialData';
import { formatCurrency, calculateProfitMargin } from '../../utils/formatters';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onSave?: (productData: any, isEdit: boolean, id?: string) => Promise<void> | void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onSave,
}) => {
  const { addProduct, updateProduct, settings } = useInventory();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    category: productCategories[0] || 'Suplementos & Vitaminas',
    description: '',
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStock: 5,
    unit: 'unidades',
    supplier: '',
    location: '',
  });

  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        sku: productToEdit.sku || '',
        name: productToEdit.name || '',
        category: productToEdit.category || productCategories[0],
        description: productToEdit.description || '',
        costPrice: productToEdit.costPrice || 0,
        sellingPrice: productToEdit.sellingPrice || 0,
        currentStock: productToEdit.currentStock || 0,
        minStock: productToEdit.minStock || 5,
        unit: productToEdit.unit || 'unidades',
        supplier: productToEdit.supplier || '',
        location: productToEdit.location || '',
      });
      setIsCustomCategory(!productCategories.includes(productToEdit.category));
    } else {
      // Auto-suggest next SKU
      const randomSku = `VIT-${Math.floor(100 + Math.random() * 900)}`;
      setFormData({
        sku: randomSku,
        name: '',
        category: productCategories[0] || 'Suplementos & Vitaminas',
        description: '',
        costPrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        minStock: 5,
        unit: 'frascos',
        supplier: '',
        location: 'Estante A-1',
      });
      setIsCustomCategory(false);
    }
    setError('');
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  // Real-time live margin calculation
  const liveMargin = calculateProfitMargin(formData.costPrice, formData.sellingPrice);
  const isLoss = formData.sellingPrice > 0 && formData.costPrice > formData.sellingPrice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('El nombre del producto es obligatorio.');
      return;
    }
    if (!formData.sku.trim()) {
      setError('El código SKU es obligatorio.');
      return;
    }
    if (formData.costPrice < 0 || formData.sellingPrice < 0) {
      setError('Los precios no pueden ser negativos.');
      return;
    }
    if (formData.currentStock < 0 || formData.minStock < 0) {
      setError('El stock no puede ser negativo.');
      return;
    }

    const finalCategory = isCustomCategory && customCategory.trim() 
      ? customCategory.trim() 
      : formData.category;

    const payload = {
      ...formData,
      category: finalCategory,
    };

    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave(payload, Boolean(productToEdit), productToEdit?.id);
      } else {
        if (productToEdit) {
          updateProduct(productToEdit.id, payload);
        } else {
          addProduct(payload);
        }
      }
      onClose();
    } catch (err: any) {
      console.error('Error saving product:', err);
      setError(err?.message || 'Ocurrió un error al guardar los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                {productToEdit ? 'Editar Producto' : 'Registrar Nuevo Producto'}
              </h2>
              <p className="text-xs text-stone-500">
                Catálogo VITAL · Costos, Precios y Parámetros de Stock
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                placeholder="ej. Citrato de Magnesio 500mg (120 caps)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Código / SKU *
              </label>
              <input
                type="text"
                required
                placeholder="ej. VIT-MAG-500"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Category & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Categoría *
              </label>
              <select
                value={isCustomCategory ? 'custom' : formData.category}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    setIsCustomCategory(true);
                  } else {
                    setIsCustomCategory(false);
                    setFormData({ ...formData, category: e.target.value });
                  }
                }}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              >
                {productCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="custom">+ Otra Categoría Personalizada</option>
              </select>
              {isCustomCategory && (
                <input
                  type="text"
                  placeholder="Escribe la nueva categoría..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full mt-1.5 px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Unidad de Medida / Presentación
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              >
                <option value="unidades">Unidades</option>
                <option value="frascos">Frascos</option>
                <option value="potes">Potes / Tarros</option>
                <option value="cajas">Cajas</option>
                <option value="paquetes">Paquetes / Doypacks</option>
                <option value="bolsas">Bolsas</option>
                <option value="goteros">Goteros (ml)</option>
              </select>
            </div>
          </div>

          {/* Pricing & Automatic Margin Calculator Section */}
          <div className="bg-stone-50/80 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                Costo Real, Precio y Margen Automático
              </span>
              <span className="text-[11px] text-stone-500">
                Moneda: {settings.currencySymbol} {settings.currency}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Cost Price */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Costo Real Unitario (Compra) *
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
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-0.5 block">Lo que pagas al proveedor</span>
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Precio de Venta al Público *
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
                    value={formData.sellingPrice || ''}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    className="w-full pl-8 pr-3 py-2 text-xs sm:text-sm font-mono font-bold bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-stone-900"
                  />
                </div>
                <span className="text-[10px] text-stone-400 mt-0.5 block">Precio en tu tienda virtual</span>
              </div>
            </div>

            {/* LIVE MARGIN PREVIEW CARD */}
            <div className={`p-3 rounded-lg border text-xs flex flex-wrap items-center justify-between gap-3 ${
              isLoss 
                ? 'bg-rose-50 border-rose-300 text-rose-900' 
                : liveMargin.marginPercent >= 50 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : liveMargin.marginPercent >= 30 
                ? 'bg-teal-50 border-teal-300 text-teal-950' 
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-semibold block">
                    {isLoss ? '⚠️ Alerta de Pérdida (Costo > Precio)' : 'Margen Calculado en Tiempo Real:'}
                  </span>
                  <span className="text-[11px] opacity-80">
                    Ganancia Unitaria: <strong>{formatCurrency(liveMargin.profitPerUnit, settings.currencySymbol)}</strong> por cada {formData.unit}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-bold text-sm font-mono">
                    {liveMargin.marginPercent}%
                  </div>
                  <div className="text-[10px] opacity-75 font-mono">
                    Markup: {liveMargin.markupPercent}%
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Stock & Minimum Stock Threshold */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                {productToEdit ? 'Stock Actual Disponible' : 'Stock Inicial en Bodega'}
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Cantidad física disponible</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1 flex items-center justify-between">
                <span>Stock Mínimo (Alerta) *</span>
                <span className="text-[10px] text-amber-700 font-normal">Dispara advertencia</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Si baja a este número, se genera alerta</span>
            </div>
          </div>

          {/* Supplier & Warehouse Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Proveedor Habitual (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. NutraLabs Global"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Ubicación / Estante (Opcional)
              </label>
              <input
                type="text"
                placeholder="ej. Estante A-1"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Descripción / Notas del Producto (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Detalles sobre presentación, ingredientes activos o especificaciones..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
            />
          </div>

          {/* Modal Footer */}
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
              id="btn-save-product-modal"
              className={`px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs ${
                isSubmitting ? 'opacity-75 cursor-wait' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? 'Guardando...' : productToEdit ? 'Guardar Cambios' : 'Registrar Producto'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
