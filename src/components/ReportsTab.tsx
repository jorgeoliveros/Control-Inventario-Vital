import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Download, 
  Award, 
  PieChart, 
  ArrowUpRight, 
  ShoppingCart, 
  Sparkles,
  Layers,
  Printer,
  Lock
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { StockExit } from '../types';
import { formatCurrency, formatNumber, formatDateShort, downloadCSV } from '../utils/formatters';

type TimeRange = 'today' | '7days' | 'month' | 'all';

export const ReportsTab: React.FC = () => {
  const { exits, products, settings, hasPermission, currentUser } = useInventory();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const canViewFinancials = hasPermission('canViewFinancialReports');
  const canExportData = hasPermission('canExportData');

  if (!canViewFinancials) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2 font-['Outfit',sans-serif]">
          Acceso Restringido a Reportes Financieros
        </h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
          Tu usuario actual ({currentUser.name} &middot; {currentUser.roleTitle}) no cuenta con permisos para ver los márgenes de ganancia, costos confidenciales y analítica financiera.
        </p>
        <div className="p-4 bg-white rounded-xl border border-stone-200 max-w-md mx-auto text-xs text-stone-600">
          Para habilitar el acceso a este módulo, solicita el permiso <strong>"Consultar utilidades y márgenes"</strong> al administrador del sistema.
        </div>
      </div>
    );
  }

  // Filter exits according to timeRange
  const filteredExits = useMemo(() => {
    const now = new Date();
    return exits.filter(e => {
      const exitDate = new Date(e.date);
      if (isNaN(exitDate.getTime())) return true;

      switch (timeRange) {
        case 'today': {
          return exitDate.toDateString() === now.toDateString();
        }
        case '7days': {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          return exitDate >= sevenDaysAgo;
        }
        case 'month': {
          return exitDate.getMonth() === now.getMonth() && exitDate.getFullYear() === now.getFullYear();
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [exits, timeRange]);

  // Overall Financial Metrics for the period
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
    const avgTicket = filteredExits.length > 0 ? Number((totalRevenue / filteredExits.length).toFixed(2)) : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      totalUnits,
      marginPercent,
      avgTicket,
      count: filteredExits.length,
    };
  }, [filteredExits]);

  // Channel Breakdown
  const channelBreakdown = useMemo(() => {
    const map: Record<string, { count: number; units: number; revenue: number; profit: number }> = {};
    filteredExits.forEach(e => {
      if (!map[e.channel]) {
        map[e.channel] = { count: 0, units: 0, revenue: 0, profit: 0 };
      }
      map[e.channel].count += 1;
      map[e.channel].units += e.quantity;
      map[e.channel].revenue += e.totalRevenue;
      map[e.channel].profit += e.profit;
    });

    return Object.entries(map).map(([channel, data]) => ({
      channel,
      ...data,
      marginPercent: data.revenue > 0 ? Number(((data.profit / data.revenue) * 100).toFixed(1)) : 0,
      sharePercent: metrics.totalRevenue > 0 ? Number(((data.revenue / metrics.totalRevenue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredExits, metrics.totalRevenue]);

  // Top Most Profitable Products (by Net Profit $)
  const topProfitableProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; units: number; revenue: number; profit: number }> = {};
    filteredExits.forEach(e => {
      if (!map[e.productId]) {
        map[e.productId] = { name: e.productName, sku: e.productSku, units: 0, revenue: 0, profit: 0 };
      }
      map[e.productId].units += e.quantity;
      map[e.productId].revenue += e.totalRevenue;
      map[e.productId].profit += e.profit;
    });

    return Object.values(map)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);
  }, [filteredExits]);

  // Top Selling Products (by Volume / Units)
  const topVolumeProducts = useMemo(() => {
    const map: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};
    filteredExits.forEach(e => {
      if (!map[e.productId]) {
        map[e.productId] = { name: e.productName, sku: e.productSku, units: 0, revenue: 0 };
      }
      map[e.productId].units += e.quantity;
      map[e.productId].revenue += e.totalRevenue;
    });

    return Object.values(map)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
  }, [filteredExits]);

  // Daily timeline grouped
  const dailyTimeline = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; profit: number; units: number }> = {};
    filteredExits.forEach(e => {
      const dateKey = formatDateShort(e.date);
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, revenue: 0, profit: 0, units: 0 };
      }
      map[dateKey].revenue += e.totalRevenue;
      map[dateKey].profit += e.profit;
      map[dateKey].units += e.quantity;
    });
    return Object.values(map);
  }, [filteredExits]);

  const handleExportReport = () => {
    const rows = filteredExits.map(e => ({
      Fecha: e.date,
      Pedido: e.orderRef || '',
      Cliente: e.customerName || '',
      Canal: e.channel,
      Producto: e.productName,
      SKU: e.productSku,
      Cantidad: e.quantity,
      'Precio Venta': e.unitSellingPrice,
      'Costo Base': e.unitCostPrice,
      'Ingreso Bruto': e.totalRevenue,
      'Costo Total': e.totalCost,
      'Ganancia Neta': e.profit,
      'Margen %': `${e.profitMarginPercent}%`,
    }));
    downloadCSV(`reporte_ventas_ganancias_${timeRange}_vital`, rows);
  };

  return (
    <div className="space-y-6" id="reports-tab-container">
      
      {/* Top Filter Bar */}
      <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-700" />
          <h2 className="text-sm font-bold text-stone-900">
            Reporte Financiero y Márgenes de Ganancia
          </h2>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Time range tabs */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200 text-xs">
            <button
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === 'today' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setTimeRange('7days')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === '7days' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setTimeRange('month')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === 'month' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Este Mes
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Todo
            </button>
          </div>

          <button
            onClick={handleExportReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            title="Descargar Reporte CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Exportar Reporte</span>
          </button>
        </div>
      </div>

      {/* Main KPI Quad Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. Ingresos Brutos */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Total Ingresos Brutos
          </span>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatCurrency(metrics.totalRevenue, settings.currencySymbol)}
          </div>
          <div className="mt-2 text-xs text-stone-500">
            En {formatNumber(metrics.count)} órdenes procesadas
          </div>
        </div>

        {/* 2. Costo Mercancía Vendida */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Costo de lo Vendido (COGS)
          </span>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-800 mt-1">
            {formatCurrency(metrics.totalCost, settings.currencySymbol)}
          </div>
          <div className="mt-2 text-xs text-stone-500">
            Inversión real en inventario vendido
          </div>
        </div>

        {/* 3. Ganancia Neta Real */}
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-5 shadow-2xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Ganancia Neta Realizada
          </span>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-emerald-800 mt-1">
            +{formatCurrency(metrics.totalProfit, settings.currencySymbol)}
          </div>
          <div className="mt-2 text-xs text-emerald-900 font-medium">
            Margen de ganancia: <strong>{metrics.marginPercent}%</strong>
          </div>
        </div>

        {/* 4. Ticket Promedio */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Ticket Promedio & Despacho
          </span>
          <div className="text-2xl font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
            {formatCurrency(metrics.avgTicket, settings.currencySymbol)}
          </div>
          <div className="mt-2 text-xs text-stone-500">
            {formatNumber(metrics.totalUnits)} unidades en el periodo
          </div>
        </div>

      </div>

      {/* Analytics Breakdown Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Profitable Products */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                $
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Top Productos Más Rentables (Mayor Ganancia $)
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">Por utilidad generada</span>
          </div>

          {topProfitableProducts.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">No hay datos en el periodo seleccionado.</p>
          ) : (
            <div className="space-y-3">
              {topProfitableProducts.map((p, idx) => {
                const maxProfit = topProfitableProducts[0].profit || 1;
                const percentBar = Math.min(100, Math.round((p.profit / maxProfit) * 100));

                return (
                  <div key={p.sku} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-stone-800 truncate">{p.name}</span>
                        <span className="text-[10px] font-mono text-stone-400 shrink-0">({p.units} u.)</span>
                      </div>
                      <span className="font-bold font-mono text-emerald-700 shrink-0 ml-2">
                        +{formatCurrency(p.profit, settings.currencySymbol)}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all"
                        style={{ width: `${percentBar}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs">
                <PieChart className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-stone-900">
                Rendimiento por Canal de Venta
              </h3>
            </div>
            <span className="text-[11px] text-stone-400">Participación %</span>
          </div>

          {channelBreakdown.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">No hay ventas registradas en el periodo.</p>
          ) : (
            <div className="space-y-3.5">
              {channelBreakdown.map((item) => (
                <div key={item.channel} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800">{item.channel}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-stone-500 font-mono">
                        {formatCurrency(item.revenue, settings.currencySymbol)} ({item.sharePercent}%)
                      </span>
                      <span className="font-bold text-emerald-700 font-mono">
                        +{formatCurrency(item.profit, settings.currencySymbol)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-indigo-600 h-full rounded-full"
                      style={{ width: `${item.sharePercent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Daily / Timeline visual breakdown */}
      {dailyTimeline.length > 0 && (
        <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900">
              Evolución Diaria de Ventas & Ganancia
            </h3>
            <span className="text-xs text-stone-500">Comparativa de ingresos y utilidad</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {dailyTimeline.map(day => (
              <div key={day.date} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
                <div className="text-[11px] font-bold text-stone-500 uppercase">{day.date}</div>
                <div className="text-sm font-bold font-['Outfit',sans-serif] text-stone-900 mt-1">
                  {formatCurrency(day.revenue, settings.currencySymbol)}
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                  +{formatCurrency(day.profit, settings.currencySymbol)}
                </div>
                <div className="text-[10px] text-stone-400 mt-1">
                  {day.units} {day.units === 1 ? 'unidad' : 'unidades'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
