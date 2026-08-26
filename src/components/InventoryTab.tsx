import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History, 
  Edit3, 
  Trash2, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { Product, StockStatus } from '../types';
import { 
  formatCurrency, 
  formatNumber, 
  calculateProfitMargin, 
  getStockStatus, 
  getStockStatusLabel, 
  downloadCSV 
} from '../utils/formatters';

interface InventoryTabProps {
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
  onQuickEntry: (product: Product) => void;
  onQuickExit: (product: Product) => void;
  onViewHistory: (product: Product) => void;
  onDeleteProduct?: (id: string, name: string) => Promise<void> | void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  onOpenNewProduct,
  onEditProduct,
  onQuickEntry,
  onQuickExit,
  onViewHistory,
  onDeleteProduct,
}) => {
  const { products, deleteProduct, settings, hasPermission } = useInventory();

  const canManageProducts = hasPermission('canManageProducts');
  const canDeleteProducts = hasPermission('canDeleteProducts');
  const canViewCosts = hasPermission('canEditCostPrices') || hasPermission('canViewFinancialReports');
  const canRegisterEntries = hasPermission('canRegisterEntries');
  const canRegisterExits = hasPermission('canRegisterExits');
  const canExportData = hasPermission('canExportData');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | StockStatus>('all');
  const [sortBy, setSortBy] = useState<'name' | 'stock_asc' | 'stock_desc' | 'margin_desc' | 'profit_desc' | 'value_desc'>('stock_asc');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        // Search filter
        const matchSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase()));

        // Category filter
        const matchCategory = selectedCategory === 'all' || p.category === selectedCategory;

        // Stock status filter
        const status = getStockStatus(p.currentStock, p.minStock);
        const matchStock = stockFilter === 'all' || status === stockFilter;

        return matchSearch && matchCategory && matchStock;
      })
      .sort((a, b) => {
        const marginA = calculateProfitMargin(a.costPrice, a.sellingPrice);
        const marginB = calculateProfitMargin(b.costPrice, b.sellingPrice);

        switch (sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'stock_asc':
            return a.currentStock - b.currentStock;
          case 'stock_desc':
            return b.currentStock - a.currentStock;
          case 'margin_desc':
            return marginB.marginPercent - marginA.marginPercent;
          case 'profit_desc':
            return marginB.profitPerUnit - marginA.profitPerUnit;
          case 'value_desc':
            return (b.currentStock * b.sellingPrice) - (a.currentStock * a.sellingPrice);
          default:
            return 0;
        }
      });
  }, [products, searchTerm, selectedCategory, stockFilter, sortBy]);

  // Handle CSV Export
  const handleExportCSV = () => {
    const rows = filteredProducts.map(p => {
      const margin = calculateProfitMargin(p.costPrice, p.sellingPrice);
      const status = getStockStatus(p.currentStock, p.minStock);
      return {
        SKU: p.sku,
        Producto: p.name,
        Categoria: p.category,
        'Stock Actual': p.currentStock,
        'Stock Minimo': p.minStock,
        Unidad: p.unit,
        'Costo Real': p.costPrice,
        'Precio Venta': p.sellingPrice,
        'Ganancia Unitaria': margin.profitPerUnit,
        'Margen Ganancia %': `${margin.marginPercent}%`,
        'Markup %': `${margin.markupPercent}%`,
        'Valor al Costo': (p.currentStock * p.costPrice).toFixed(2),
        'Valor a la Venta': (p.currentStock * p.sellingPrice).toFixed(2),
        Proveedor: p.supplier || 'N/A',
        Estado: status === 'out_of_stock' ? 'Agotado' : status === 'low_stock' ? 'Stock Bajo' : 'En Stock',
      };
    });
    downloadCSV(`inventario_vital_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar el producto "${name}"? Esta acción no se puede deshacer.`)) {
      if (onDeleteProduct) {
        await onDeleteProduct(id, name);
      } else {
        deleteProduct(id);
      }
    }
  };

  // Aggregated sums for the filtered list
  const filteredMetrics = useMemo(() => {
    let totalStock = 0;
    let totalCostVal = 0;
    let totalRetailVal = 0;
    filteredProducts.forEach(p => {
      totalStock += p.currentStock;
      totalCostVal += p.currentStock * p.costPrice;
      totalRetailVal += p.currentStock * p.sellingPrice;
    });
    return {
      totalStock,
      totalCostVal,
      totalRetailVal,
      totalPotentialProfit: totalRetailVal - totalCostVal,
    };
  }, [filteredProducts]);

  return (
    <div className="space-y-4" id="inventory-tab-container">
      {/* Control Bar: Search & Filters */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              id="inventory-search-input"
              type="text"
              placeholder="Buscar por nombre, SKU, categoría o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-stone-800 placeholder-stone-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-export-inventory-csv"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
              title="Exportar inventario filtrado a archivo CSV"
            >
              <Download className="w-3.5 h-3.5 text-stone-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              id="btn-tab-add-product"
              onClick={onOpenNewProduct}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Producto</span>
            </button>
          </div>
        </div>

        {/* Filter Chips & Sorting Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100 text-xs">
          
          {/* Categories and Stock Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-stone-400">Categoría:</span>
              <select
                id="filter-category-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-stone-50 text-stone-700 border border-stone-200 rounded-md px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">Todas ({products.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat} ({products.filter(p => p.category === cat).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Stock status filter buttons */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200">
              <button
                onClick={() => setStockFilter('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  stockFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setStockFilter('in_stock')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  stockFilter === 'in_stock' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-stone-600 hover:text-emerald-700'
                }`}
              >
                En Stock
              </button>
              <button
                onClick={() => setStockFilter('low_stock')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  stockFilter === 'low_stock' ? 'bg-white text-amber-700 shadow-2xs' : 'text-stone-600 hover:text-amber-700'
                }`}
              >
                Stock Bajo
              </button>
              <button
                onClick={() => setStockFilter('out_of_stock')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  stockFilter === 'out_of_stock' ? 'bg-white text-rose-700 shadow-2xs' : 'text-stone-600 hover:text-rose-700'
                }`}
              >
                Agotados
              </button>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400">Ordenar por:</span>
            <select
              id="sort-inventory-select"
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-stone-50 text-stone-700 border border-stone-200 rounded-md px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="stock_asc">Menor Stock (Urgentes)</option>
              <option value="stock_desc">Mayor Stock</option>
              <option value="margin_desc">Mayor Margen (%)</option>
              <option value="profit_desc">Mayor Ganancia por Unidad ($)</option>
              <option value="value_desc">Mayor Valorización Total</option>
              <option value="name">Nombre (A-Z)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Inventory Table Container */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden" id="inventory-table-card">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No se encontraron productos</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Prueba cambiando los filtros de búsqueda o categoría, o registra un nuevo producto en tu catálogo.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setStockFilter('all');
              }}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
            >
              Limpiar todos los filtros
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Producto & SKU</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Stock Actual / Mínimo</th>
                  <th className="py-3 px-4 text-right">Costo Real</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Margen de Ganancia</th>
                  <th className="py-3 px-4 text-right">Valor Total</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                {filteredProducts.map(product => {
                  const margin = calculateProfitMargin(product.costPrice, product.sellingPrice);
                  const status = getStockStatus(product.currentStock, product.minStock);
                  const statusBadge = getStockStatusLabel(status);
                  const isLow = status === 'low_stock' || status === 'out_of_stock';

                  // Calculate stock percentage bar for visual capacity
                  const targetHealthyStock = Math.max(product.minStock * 2, 10);
                  const stockPercent = Math.min(100, Math.round((product.currentStock / targetHealthyStock) * 100));

                  return (
                    <tr 
                      key={product.id} 
                      className={`hover:bg-stone-50/70 transition-colors ${
                        status === 'out_of_stock' 
                          ? 'bg-rose-50/30' 
                          : status === 'low_stock' 
                          ? 'bg-amber-50/20' 
                          : ''
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-900 text-xs sm:text-sm">
                            {product.name}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.2 rounded border border-stone-200">
                              {product.sku}
                            </span>
                            {product.supplier && (
                              <span className="text-[11px] text-stone-400 truncate max-w-[140px]">
                                &middot; {product.supplier}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] bg-stone-100 text-stone-700 font-medium border border-stone-200 whitespace-nowrap">
                          {product.category}
                        </span>
                      </td>

                      {/* Stock Level & Status Bar */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col items-center min-w-[120px]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${statusBadge.dotCol}`} />
                            <span className="text-xs font-bold text-stone-900">
                              {product.currentStock}
                            </span>
                            <span className="text-[11px] text-stone-400">
                              / mín. {product.minStock} {product.unit}
                            </span>
                          </div>
                          {/* Visual progress bar */}
                          <div className="w-full bg-stone-100 rounded-full h-1.5 overflow-hidden border border-stone-200/60">
                            <div
                              className={`h-full rounded-full transition-all ${
                                status === 'out_of_stock'
                                  ? 'bg-rose-500 w-0'
                                  : status === 'low_stock'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${status === 'out_of_stock' ? 0 : Math.max(8, stockPercent)}%` }}
                            />
                          </div>
                          <span className={`mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded border ${statusBadge.bg}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                      </td>

                      {/* Real Cost */}
                      <td className="py-3 px-4 text-right font-mono text-stone-600">
                        {canViewCosts ? formatCurrency(product.costPrice, settings.currencySymbol) : '••••'}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-stone-900">
                        {formatCurrency(product.sellingPrice, settings.currencySymbol)}
                      </td>

                      {/* Profit Margin & Net Unit Profit */}
                      <td className="py-3 px-4 text-right">
                        {canViewCosts ? (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-emerald-700 font-mono text-xs">
                                +{formatCurrency(margin.profitPerUnit, settings.currencySymbol)}
                              </span>
                              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
                                margin.marginPercent >= 50 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : margin.marginPercent >= 30 
                                  ? 'bg-teal-100 text-teal-800' 
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {margin.marginPercent}%
                              </span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono mt-0.5">
                              Markup: {margin.markupPercent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-xs font-mono">••••</span>
                        )}
                      </td>

                      {/* Total Inventory Value */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-stone-900 font-mono text-xs">
                            {formatCurrency(product.currentStock * product.sellingPrice, settings.currencySymbol)}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {canViewCosts ? `Costo: ${formatCurrency(product.currentStock * product.costPrice, settings.currencySymbol)}` : ''}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Quick Entry button */}
                          {canRegisterEntries && (
                            <button
                              id={`btn-entry-prod-${product.id}`}
                              onClick={() => onQuickEntry(product)}
                              className="p-1.5 text-sky-700 hover:bg-sky-50 rounded-md transition-colors cursor-pointer border border-transparent hover:border-sky-200"
                              title="Registrar Ingreso de Stock"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Quick Exit button */}
                          {canRegisterExits && (
                            <button
                              id={`btn-exit-prod-${product.id}`}
                              onClick={() => onQuickExit(product)}
                              disabled={product.currentStock <= 0}
                              className={`p-1.5 rounded-md transition-colors border border-transparent ${
                                product.currentStock > 0
                                  ? 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer'
                                  : 'text-stone-300 cursor-not-allowed'
                              }`}
                              title={product.currentStock > 0 ? "Registrar Salida / Venta" : "Sin stock disponible"}
                            >
                              <ArrowUpFromLine className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Kardex history */}
                          <button
                            id={`btn-history-prod-${product.id}`}
                            onClick={() => onViewHistory(product)}
                            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title="Ver Historial de Movimientos"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          {canManageProducts && (
                            <button
                              id={`btn-edit-prod-${product.id}`}
                              onClick={() => onEditProduct(product)}
                              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                              title="Editar Datos del Producto"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete */}
                          {canDeleteProducts && (
                            <button
                              id={`btn-delete-prod-${product.id}`}
                              onClick={() => handleDelete(product.id, product.name)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              title="Eliminar Producto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Filtered Table Footer Summary */}
        <div className="bg-stone-50 px-4 py-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-600 gap-3">
          <div className="flex items-center gap-2">
            <span>Mostrando <strong>{filteredProducts.length}</strong> de {products.length} productos</span>
            <span className="text-stone-300">|</span>
            <span>Total en existencias: <strong className="text-stone-800">{formatNumber(filteredMetrics.totalStock)}</strong> unidades</span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              Costo Invertido: <strong className="text-stone-900 font-mono">{formatCurrency(filteredMetrics.totalCostVal, settings.currencySymbol)}</strong>
            </div>
            <div>
              Valor Venta: <strong className="text-stone-900 font-mono">{formatCurrency(filteredMetrics.totalRetailVal, settings.currencySymbol)}</strong>
            </div>
            <div>
              Ganancia Proyectada: <strong className="text-emerald-700 font-mono">+{formatCurrency(filteredMetrics.totalPotentialProfit, settings.currencySymbol)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
