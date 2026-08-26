import { Product, StockStatus } from '../types';

export const formatCurrency = (amount: number, symbol: string = '$'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  
  // Clean decimal format
  const isInteger = Math.round(amount * 100) % 100 === 0;
  const formattedNumber = new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: isInteger ? 2 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${symbol} ${formattedNumber}`;
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('es-ES').format(num);
};

export const calculateProfitMargin = (cost: number, price: number): {
  profitPerUnit: number;
  marginPercent: number;
  markupPercent: number;
} => {
  const profitPerUnit = Number((price - cost).toFixed(2));
  const marginPercent = price > 0 ? Number(((profitPerUnit / price) * 100).toFixed(1)) : 0;
  const markupPercent = cost > 0 ? Number(((profitPerUnit / cost) * 100).toFixed(1)) : 0;
  
  return {
    profitPerUnit,
    marginPercent,
    markupPercent,
  };
};

export const getStockStatus = (currentStock: number, minStock: number): StockStatus => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minStock) return 'low_stock';
  return 'in_stock';
};

export const getStockStatusLabel = (status: StockStatus): { text: string; bg: string; textCol: string; dotCol: string } => {
  switch (status) {
    case 'out_of_stock':
      return {
        text: 'Agotado',
        bg: 'bg-rose-50 border-rose-200 text-rose-700',
        textCol: 'text-rose-700',
        dotCol: 'bg-rose-500',
      };
    case 'low_stock':
      return {
        text: 'Stock Bajo',
        bg: 'bg-amber-50 border-amber-200 text-amber-700',
        textCol: 'text-amber-700',
        dotCol: 'bg-amber-500 animate-pulse',
      };
    case 'in_stock':
      return {
        text: 'En Stock',
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        textCol: 'text-emerald-700',
        dotCol: 'bg-emerald-500',
      };
  }
};

export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const formatDateShort = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  } catch {
    return dateStr;
  }
};

export const downloadCSV = (filename: string, rows: Record<string, any>[]) => {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(';'),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : '';
          return `"${val.replace(/"/g, '""')}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
