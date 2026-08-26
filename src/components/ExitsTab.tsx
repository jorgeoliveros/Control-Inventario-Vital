import React, { useState, useMemo } from 'react';
import { 
  ArrowUpFromLine, 
  Search, 
  Plus, 
  Download, 
  ShoppingCart, 
  User, 
  Globe, 
  MessageCircle, 
  Instagram, 
  Store, 
  Trash2, 
  TrendingUp, 
  DollarSign
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockExit, SalesChannel } from '../types';
import { formatCurrency, formatNumber, formatDate, downloadCSV } from '../utils/formatters';

interface ExitsTabProps {
  onOpenNewExit: () => void;
}

export const ExitsTab: React.FC<ExitsTabProps> = ({ onOpenNewExit }) => {
  const { exits, deleteStockExit, settings, hasPermission } = useInventory();

  const canRegisterExits = hasPermission('canRegisterExits');
  const canDeleteExits = hasPermission('canDeleteExits');
  const canViewFinancials = hasPermission('canViewFinancialReports');
  const canViewCosts = hasPermission('canEditCostPrices') || canViewFinancials;
  const canExportData = hasPermission('canExportData');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const channels: SalesChannel[] = ['Tienda Web', 'WhatsApp', 'Instagram', 'Punto Físico', 'MercadoLibre', 'Otro'];

  // Filter exits
  const filteredExits = useMemo(() => {
    return exits.filter(exit => {
      const matchSearch =
        exit.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exit.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exit.customerName && exit.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exit.orderRef && exit.orderRef.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchChannel = selectedChannel === 'all' || exit.channel === selectedChannel;
      const matchType = selectedType === 'all' || exit.type === selectedType;

      return matchSearch && matchChannel && matchType;
    });
  }, [exits, searchTerm, selectedChannel, selectedType]);

  // Summary metrics for filtered list
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalUnits = 0;

    filteredExits.forEach(e => {
      totalRevenue += e.totalRevenue;
      totalCost += e.totalCost;
      totalProfit += e.profit;
      totalUnits += e.quantity;
    });

    const marginPercent = totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalUnits,
      marginPercent,
      count: filteredExits.length,
    };
  }, [filteredExits]);

  // Export CSV
  const handleExportCSV = () => {
    const rows = filteredExits.map(e => ({
      Fecha: e.date,
      'Nro Pedido': e.orderRef || 'N/A',
      Canal: e.channel,
      Tipo: e.type === 'sale' ? 'Venta' : e.type,
      Cliente: e.customerName || 'Consumidor Final',
      SKU: e.productSku,
      Producto: e.productName,
      Cantidad: e.quantity,
      'Precio Venta Unitario': e.unitSellingPrice,
      'Costo Real Unitario': e.unitCostPrice,
      'Ingreso Bruto': e.totalRevenue,
      'Costo Total': e.totalCost,
      'Ganancia Neta': e.profit,
      'Margen %': `${e.profitMarginPercent}%`,
      Notas: e.notes || '',
    }));
    downloadCSV(`salidas_ventas_vital_${new Date().toISOString().slice(0, 10)}`, rows);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Deseas eliminar este registro de salida de "${name}"?`)) {
      deleteStockExit(id);
    }
  };

  const getChannelBadge = (channel: SalesChannel) => {
    switch (channel) {
      case 'Tienda Web':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200"><Globe className="w-3 h-3" /> Web</span>;
      case 'WhatsApp':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200"><MessageCircle className="w-3 h-3" /> WhatsApp</span>;
      case 'Instagram':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-pink-50 text-pink-700 border border-pink-200"><Instagram className="w-3 h-3" /> Instagram</span>;
      case 'Punto Físico':
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200"><Store className="w-3 h-3" /> Físico</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-stone-100 text-stone-700 border border-stone-200">{channel}</span>;
    }
  };

  return (
    <div className="space-y-4" id="exits-tab-container">
      {/* KPI Cards for Exits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        
        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Ingresos Brutos</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatCurrency(metrics.totalRevenue, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-stone-500">Monto total facturado</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Costo de Mercancía</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-stone-700 mt-1">
            {formatCurrency(metrics.totalCost, settings.currencySymbol)}
          </div>
          <span className="text-[11px] text-stone-500">Costo real de productos</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Ganancia Neta Real</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-emerald-700 mt-1 flex items-center justify-between">
            <span>+{formatCurrency(metrics.totalProfit, settings.currencySymbol)}</span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              {metrics.marginPercent}%
            </span>
          </div>
          <span className="text-[11px] text-stone-500">Utilidad calculada (Precio - Costo)</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase">Unidades Despachadas</span>
          <div className="text-xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatNumber(metrics.totalUnits)} u.
          </div>
          <span className="text-[11px] text-stone-500">En {metrics.count} transacciones</span>
        </div>

      </div>

      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              id="exits-search-input"
              placeholder="Buscar por producto, cliente o pedido..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-800"
            />
          </div>

          {/* Channel select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-stone-500 hidden sm:inline">Canal:</span>
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="bg-stone-50 text-stone-700 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todos los canales</option>
              {channels.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Type select */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs text-stone-500 hidden sm:inline">Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-stone-50 text-stone-700 border border-stone-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">Todos los tipos</option>
              <option value="sale">Ventas</option>
              <option value="sample">Muestras / Promoción</option>
              <option value="damaged">Dañado / Merma</option>
              <option value="adjustment">Ajuste de Stock</option>
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
            onClick={onOpenNewExit}
            id="btn-register-exit-tab"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" />
            <span>Registrar Salida / Venta</span>
          </button>
        </div>
      </div>

      {/* Exits Table */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden" id="exits-table-card">
        {filteredExits.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">No hay registros de salidas o ventas</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
              Registra una venta o salida de inventario para ver el desglose automático de ingresos y ganancias.
            </p>
            <button
              onClick={onOpenNewExit}
              className="text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-3.5 py-2 rounded-lg transition-colors"
            >
              Registrar Primera Venta
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Fecha & Hora</th>
                  <th className="py-3 px-4">Pedido / Ref</th>
                  <th className="py-3 px-4">Canal</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Producto & SKU</th>
                  <th className="py-3 px-4 text-center">Cant.</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-right">Costo Real</th>
                  <th className="py-3 px-4 text-right">Ingreso Bruto</th>
                  <th className="py-3 px-4 text-right">Ganancia Neta</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                {filteredExits.map(exit => {
                  const isPositiveProfit = exit.profit > 0;
                  return (
                    <tr key={exit.id} className="hover:bg-stone-50/70 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-stone-500 font-mono">
                        {formatDate(exit.date)}
                      </td>

                      {/* Order ref */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                          {exit.orderRef || '—'}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="py-3 px-4">
                        {getChannelBadge(exit.channel)}
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4 text-stone-800 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{exit.customerName || 'Consumidor Final'}</span>
                        </div>
                      </td>

                      {/* Product */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-900">{exit.productName}</span>
                          <span className="font-mono text-[11px] text-stone-400">{exit.productSku}</span>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-900 font-bold border border-stone-200">
                          {exit.quantity}
                        </span>
                      </td>

                      {/* Unit selling price */}
                      <td className="py-3 px-4 text-right font-mono text-stone-800">
                        {formatCurrency(exit.unitSellingPrice, settings.currencySymbol)}
                      </td>

                      {/* Unit cost */}
                      <td className="py-3 px-4 text-right font-mono text-stone-400">
                        {canViewCosts ? formatCurrency(exit.unitCostPrice, settings.currencySymbol) : '••••'}
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                        {formatCurrency(exit.totalRevenue, settings.currencySymbol)}
                      </td>

                      {/* Net Profit & Margin % */}
                      <td className="py-3 px-4 text-right">
                        {canViewFinancials ? (
                          <div className="flex flex-col items-end">
                            <span className={`font-bold font-mono text-xs ${isPositiveProfit ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {isPositiveProfit ? '+' : ''}{formatCurrency(exit.profit, settings.currencySymbol)}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {exit.profitMarginPercent}% marg.
                            </span>
                          </div>
                        ) : (
                          <span className="text-stone-400 text-xs font-mono">••••</span>
                        )}
                      </td>

                      {/* Delete */}
                      <td className="py-3 px-4 text-center">
                        {canDeleteExits && (
                          <button
                            onClick={() => handleDelete(exit.id, exit.productName)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar Registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
