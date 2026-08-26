import React, { useState, useMemo } from 'react';
import { 
  ArrowDownToLine, 
  Search, 
  Plus, 
  Download, 
  Building2, 
  Receipt, 
  Trash2, 
  FileText,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockEntry } from '../types';
import { formatCurrency, formatNumber, formatDate, downloadCSV } from '../utils/formatters';

interface EntriesTabProps {
  onOpenNewEntry: () => void;
}

export const EntriesTab: React.FC<EntriesTabProps> = ({ onOpenNewEntry }) => {
  const { entries, deleteStockEntry, settings, hasPermission } = useInventory();

  const canRegisterEntries = hasPermission('canRegisterEntries');
  const canDeleteEntries = hasPermission('canDeleteEntries');
  const canViewCosts = hasPermission('canEditCostPrices') || hasPermission('canViewFinancialReports');
  const canExportData = hasPermission('canExportData');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

  // Extract suppliers list
  const suppliers = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => {
      if (e.supplier) set.add(e.supplier);
    });
    return Array.from(set);
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchSearch =
        entry.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.supplier && entry.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.invoiceRef && entry.invoiceRef.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchSupplier = selectedSupplier === 'all' || entry.supplier === selectedSupplier;

      return matchSearch && matchSupplier;
    });
  }, [entries, searchTerm, selectedSupplier]);

  // Metrics for entries
  const metrics = useMemo(() => {
    let totalInvested = 0;
    let totalUnits = 0;
    filteredEntries.forEach(e => {
      totalInvested += e.totalCost;
      totalUnits += e.quantity;
    });
    return {
      totalInvested,
      totalUnits,
      count: filteredEntries.length,
    };
  }, [filteredEntries]);

  // Handle Export CSV
  const handleExportCSV = () => {
    const rows = filteredEntries.map(e => ({
      Fecha: e.date,
      Comprobante: e.invoiceRef || 'N/A',
      SKU: e.productSku,
      Producto: e.productName,
      Proveedor: e.supplier,
      Cantidad: e.quantity,
      'Costo Unitario': e.unitCost,
      'Total Invertido': e.totalCost,
      Notas: e.notes || '',
    }));
    downloadCSV(`ingresos_stock_vital_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar este registro de ingreso de "${name}"?`)) {
      deleteStockEntry(id);
    }
  };

  return (
    <div className="space-y-4" id="entries-tab-container">
      {/* Top Banner & Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Inversión en Compras</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-sky-900 mt-1">
            {formatCurrency(metrics.totalInvested, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-stone-500">Monto total registrado</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Unidades Ingresadas</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatNumber(metrics.totalUnits)} u.
          </div>
          <span className="text-[11px] text-stone-500">Volumen de mercancía recibida</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Registros de Ingreso</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatNumber(metrics.count)} entradas
          </div>
          <span className="text-[11px] text-stone-500">Lotes y pedidos procesados</span>
        </div>
      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              id="entries-search-input"
              placeholder="Buscar por producto, proveedor o factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white text-stone-800"
            />
          </div>

          {/* Supplier select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-stone-500 hidden sm:inline">Proveedor:</span>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="bg-stone-50 text-stone-700 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Todos ({entries.length})</option>
              {suppliers.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={onOpenNewEntry}
            id="btn-register-entry-tab"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Registrar Ingreso de Stock</span>
          </button>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden" id="entries-table-card">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No hay registros de ingreso</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Registra compras o entradas de mercancía para abastecer el stock de tus productos.
            </p>
            <button
              onClick={onOpenNewEntry}
              className="text-xs font-semibold text-white bg-sky-700 hover:bg-sky-800 px-3.5 py-2 rounded-lg transition-colors"
            >
              Registrar Primer Ingreso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Comprobante / Factura</th>
                  <th className="py-3 px-4">Producto & SKU</th>
                  <th className="py-3 px-4">Proveedor</th>
                  <th className="py-3 px-4 text-center">Cantidad</th>
                  <th className="py-3 px-4 text-right">Costo Unitario</th>
                  <th className="py-3 px-4 text-right">Total Invertido</th>
                  <th className="py-3 px-4">Notas</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-stone-50/70 transition-colors">
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-stone-500 font-mono">
                      {formatDate(entry.date)}
                    </td>

                    {/* Invoice Ref */}
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {entry.invoiceRef || 'S/N'}
                      </span>
                    </td>

                    {/* Product */}
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-stone-900">{entry.productName}</span>
                        <span className="font-mono text-[11px] text-stone-400">{entry.productSku}</span>
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="py-3 px-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-stone-400" />
                        <span>{entry.supplier}</span>
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-sky-50 text-sky-800 font-bold border border-sky-200">
                        +{entry.quantity}
                      </span>
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3 px-4 text-right font-mono text-stone-600">
                      {canViewCosts ? formatCurrency(entry.unitCost, settings.currencySymbol) : '••••'}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                      {canViewCosts ? formatCurrency(entry.totalCost, settings.currencySymbol) : '••••'}
                    </td>

                    {/* Notes */}
                    <td className="py-3 px-4 text-stone-500 text-[11px] max-w-[180px] truncate">
                      {entry.notes || '—'}
                    </td>

                    {/* Delete action */}
                    <td className="py-3 px-4 text-center">
                      {canDeleteEntries && (
                        <button
                          onClick={() => handleDelete(entry.id, entry.productName)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Eliminar Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
