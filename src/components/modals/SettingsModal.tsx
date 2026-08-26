import React, { useState } from 'react';
import { X, Settings as SettingsIcon, RefreshCw, Trash2, Download, Check, Store, DollarSign } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { CurrencyCode } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings, resetToDemoData, clearAllData, products, entries, exits } = useInventory();
  
  const [businessName, setBusinessName] = useState(settings.businessName);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      businessName,
      currency,
      currencySymbol,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleCurrencyChange = (newCurr: CurrencyCode) => {
    setCurrency(newCurr);
    switch (newCurr) {
      case 'USD': setCurrencySymbol('$'); break;
      case 'CRC': setCurrencySymbol('₡'); break;
      case 'EUR': setCurrencySymbol('€'); break;
      case 'MXN': setCurrencySymbol('$'); break;
      case 'COP': setCurrencySymbol('$'); break;
    }
  };

  const handleExportBackup = () => {
    const data = {
      app: 'VITAL Inventory',
      exportedAt: new Date().toISOString(),
      settings,
      products,
      entries,
      exits,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_inventario_vital_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas restaurar los datos de demostración de la tienda VITAL? Se sobreescribirán los registros actuales.')) {
      resetToDemoData();
      onClose();
    }
  };

  const handleClear = () => {
    if (window.confirm('¿Estás seguro de que deseas vaciar toda la base de datos de productos y movimientos para empezar en blanco?')) {
      clearAllData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-stone-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-stone-50 px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-stone-800 text-white flex items-center justify-center font-bold text-sm">
              <SettingsIcon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                Configuración del Sistema
              </h2>
              <p className="text-xs text-stone-500">
                Ajustes de tienda, moneda y copias de seguridad
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
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Business Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Nombre de la Tienda Virtual
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 font-medium"
            />
          </div>

          {/* Currency selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Moneda Principal
              </label>
              <select
                value={currency}
                onChange={(e: any) => handleCurrencyChange(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900"
              >
                <option value="USD">Dólar Estadounidense (USD)</option>
                <option value="CRC">Colón Costarricense (CRC)</option>
                <option value="EUR">Euro (EUR)</option>
                <option value="MXN">Peso Mexicano (MXN)</option>
                <option value="COP">Peso Colombiano (COP)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Símbolo de Moneda
              </label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-stone-900 text-center font-bold"
              />
            </div>
          </div>

          {/* Data Management & Backup */}
          <div className="pt-3 border-t border-stone-200 space-y-2.5">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Gestión de Datos y Copias de Seguridad
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer border border-stone-200"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Copia (JSON)</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors cursor-pointer border border-sky-200"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
                <span>Restaurar Catálogo Demo</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Vaciar Todo y Comenzar en Blanco</span>
              </button>
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
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : null}
              <span>{savedSuccess ? 'Guardado' : 'Guardar Ajustes'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
