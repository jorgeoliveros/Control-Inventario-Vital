import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User as UserIcon, 
  Layers, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle, 
  Trash2, 
  FileText, 
  ChevronRight, 
  Calendar,
  Lock,
  Eye,
  RefreshCw,
  Zap,
  Activity
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { AuditLogEntry, AuditModule, AuditSeverity } from '../types';
import { formatDate } from '../utils/formatters';

export const AuditTab: React.FC = () => {
  const { auditLogs, users, clearAuditLogs, hasPermission, currentUser } = useInventory();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days'>('all');
  const [inspectingLog, setInspectingLog] = useState<AuditLogEntry | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canViewAudit = hasPermission('canViewAuditLogs');
  const canClearAudit = currentUser.role === 'admin';

  // Metrics
  const metrics = useMemo(() => {
    const total = auditLogs.length;
    const critical = auditLogs.filter(l => l.severity === 'danger' || l.severity === 'warning').length;
    
    // Logs today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayCount = auditLogs.filter(l => l.timestamp.startsWith(todayStr)).length;

    // Most active user
    const userCounts: Record<string, { name: string; count: number }> = {};
    auditLogs.forEach(l => {
      if (!userCounts[l.userId]) userCounts[l.userId] = { name: l.userName, count: 0 };
      userCounts[l.userId].count++;
    });

    let topUser = { name: 'N/A', count: 0 };
    Object.values(userCounts).forEach(u => {
      if (u.count > topUser.count) topUser = u;
    });

    return { total, critical, todayCount, topUser };
  }, [auditLogs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      // Search
      const searchMatch =
        searchTerm === '' ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.actionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.targetId && log.targetId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.targetName && log.targetName.toLowerCase().includes(searchTerm.toLowerCase()));

      // Module
      const moduleMatch = selectedModule === 'all' || log.module === selectedModule;

      // Severity
      const severityMatch = selectedSeverity === 'all' || log.severity === selectedSeverity;

      // User
      const userMatch = selectedUser === 'all' || log.userId === selectedUser;

      // Date
      let dateMatch = true;
      if (dateFilter !== 'all') {
        const logDate = new Date(log.timestamp).getTime();
        const now = new Date().getTime();
        const diffHours = (now - logDate) / (1000 * 60 * 60);

        if (dateFilter === 'today') dateMatch = diffHours <= 24;
        else if (dateFilter === '7days') dateMatch = diffHours <= 24 * 7;
        else if (dateFilter === '30days') dateMatch = diffHours <= 24 * 30;
      }

      return searchMatch && moduleMatch && severityMatch && userMatch && dateMatch;
    });
  }, [auditLogs, searchTerm, selectedModule, selectedSeverity, selectedUser, dateFilter]);

  // Export to CSV
  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['ID', 'Fecha y Hora', 'Usuario', 'Email', 'Rol', 'Modulo', 'Nivel', 'Accion', 'Recurso', 'Detalle'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('es-CR')}"`,
      `"${l.userName}"`,
      `"${l.userEmail}"`,
      `"${l.userRole}"`,
      `"${l.module}"`,
      `"${l.severity}"`,
      `"${l.actionTitle}"`,
      `"${(l.targetName || l.targetId || '').replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bitacora_auditoria_vital_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const exportToJSON = () => {
    if (filteredLogs.length === 0) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(filteredLogs, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `bitacora_auditoria_vital_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const getModuleIcon = (module: AuditModule) => {
    switch (module) {
      case 'inventory': return <Layers className="w-4 h-4 text-emerald-600" />;
      case 'entries': return <ArrowDownToLine className="w-4 h-4 text-sky-600" />;
      case 'exits': return <ArrowUpFromLine className="w-4 h-4 text-emerald-600" />;
      case 'users': return <Users className="w-4 h-4 text-purple-600" />;
      case 'settings': return <Settings className="w-4 h-4 text-amber-600" />;
      case 'security': return <ShieldCheck className="w-4 h-4 text-indigo-600" />;
      default: return <Activity className="w-4 h-4 text-stone-600" />;
    }
  };

  const getSeverityBadge = (severity: AuditSeverity) => {
    switch (severity) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Éxito
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Advertencia
          </span>
        );
      case 'danger':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            Crítico
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
            <Info className="w-3 h-3 text-sky-600" />
            Informativo
          </span>
        );
    }
  };

  const getAvatarBg = (color: string) => {
    switch (color) {
      case 'emerald': return 'bg-emerald-700 text-white';
      case 'sky': return 'bg-sky-600 text-white';
      case 'amber': return 'bg-amber-600 text-white';
      case 'purple': return 'bg-purple-600 text-white';
      case 'rose': return 'bg-rose-600 text-white';
      case 'indigo': return 'bg-indigo-600 text-white';
      default: return 'bg-stone-800 text-white';
    }
  };

  if (!canViewAudit) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 mb-2 font-['Outfit',sans-serif]">
          Acceso Restringido a la Bitácora
        </h2>
        <p className="text-sm text-stone-500 max-w-md mx-auto mb-6">
          Tu usuario actual ({currentUser.name} &middot; {currentUser.roleTitle}) no cuenta con permisos para inspeccionar la bitácora de auditoría y trazabilidad del sistema.
        </p>
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 max-w-md mx-auto text-xs text-stone-600">
          Para solicitar acceso a los registros de auditoría, contacta al Administrador General del sistema VITAL.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="audit-tab-container">
      
      {/* Top Banner & Security Guarantee */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 font-['Outfit',sans-serif]">
              Bitácora de Auditoría y Trazabilidad
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              Registro Inmutable
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Historial cronológico continuo de todas las acciones, entradas, salidas, modificaciones de precios y cambios de roles ejecutados en el sistema VITAL para máximo control y seguridad.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Descargar registro en archivo CSV"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={exportToJSON}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            title="Descargar registro en formato JSON"
          >
            <FileText className="w-3.5 h-3.5 text-stone-500" />
            <span>JSON</span>
          </button>

          {canClearAudit && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="p-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              title="Vaciar Bitácora (Solo Administrador)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Total de Movimientos
            </span>
            <Activity className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-2xl font-bold text-stone-900 font-['Outfit',sans-serif]">
            {metrics.total}
          </p>
          <span className="text-[11px] text-stone-500 mt-1 block">
            Eventos registrados en historial
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Movimientos Hoy
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 font-['Outfit',sans-serif]">
            {metrics.todayCount}
          </p>
          <span className="text-[11px] text-emerald-700 mt-1 block">
            Acciones registradas en las últimas 24h
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Eventos Críticos
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-800 font-['Outfit',sans-serif]">
            {metrics.critical}
          </p>
          <span className="text-[11px] text-amber-700 mt-1 block">
            Precios modificados o eliminaciones
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Usuario Más Activo
            </span>
            <UserIcon className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-base font-bold text-stone-900 truncate font-['Outfit',sans-serif]">
            {metrics.topUser.name}
          </p>
          <span className="text-[11px] text-stone-500 mt-1 block">
            {metrics.topUser.count} operaciones registradas
          </span>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search bar */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por usuario, SKU, orden, descripción..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-stone-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Module filter */}
          <div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los Módulos</option>
              <option value="inventory">Inventario & Catálogo</option>
              <option value="entries">Ingresos de Stock</option>
              <option value="exits">Salidas & Ventas</option>
              <option value="users">Usuarios & Permisos</option>
              <option value="settings">Ajustes & Sistema</option>
              <option value="security">Seguridad & Sesiones</option>
            </select>
          </div>

          {/* Severity filter */}
          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los Niveles</option>
              <option value="success">Éxito</option>
              <option value="info">Informativo</option>
              <option value="warning">Advertencia</option>
              <option value="danger">Crítico / Borrado</option>
            </select>
          </div>

          {/* User filter */}
          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">Todos los Usuarios</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.roleTitle.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Date Quick Filter Pills */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Período:
            </span>
            <div className="flex items-center gap-1">
              {[
                { id: 'all', label: 'Todo el Historial' },
                { id: 'today', label: 'Hoy (24h)' },
                { id: '7days', label: 'Últimos 7 días' },
                { id: '30days', label: 'Últimos 30 días' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    dateFilter === f.id
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <span className="text-stone-500">
            Mostrando <b>{filteredLogs.length}</b> de <b>{auditLogs.length}</b> registros
          </span>
        </div>
      </div>

      {/* Logs Timeline / Table View */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-800 mb-1">
              No se encontraron registros de auditoría
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No hay movimientos que coincidan con los filtros seleccionados. Prueba limpiando la búsqueda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-600 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-40">Fecha & Hora</th>
                  <th className="py-3.5 px-4 w-52">Usuario Responsable</th>
                  <th className="py-3.5 px-4 w-36">Módulo / Acción</th>
                  <th className="py-3.5 px-4">Descripción del Movimiento</th>
                  <th className="py-3.5 px-4 text-center w-28">Nivel</th>
                  <th className="py-3.5 px-4 text-right w-16">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {filteredLogs.map((log) => {
                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-stone-50/80 transition-colors group cursor-pointer"
                      onClick={() => setInspectingLog(log)}
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-stone-600">
                        <div className="font-semibold text-stone-900">
                          {formatDate(log.timestamp)}
                        </div>
                        <div className="text-[10px] text-stone-500">
                          {new Date(log.timestamp).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>

                      {/* User Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 font-['Outfit',sans-serif] ${getAvatarBg(log.userAvatarColor)}`}>
                            {log.userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-stone-900 truncate">{log.userName}</div>
                            <div className="text-[10px] text-stone-500 truncate">{log.userEmail}</div>
                          </div>
                        </div>
                      </td>

                      {/* Module & Action */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                          {getModuleIcon(log.module)}
                          <span className="truncate">{log.actionTitle}</span>
                        </div>
                        <span className="text-[10px] text-stone-500 uppercase tracking-wider font-mono">
                          {log.module}
                        </span>
                      </td>

                      {/* Description & Target */}
                      <td className="py-3.5 px-4">
                        <p className="text-stone-800 line-clamp-2 leading-relaxed">
                          {log.description}
                        </p>
                        {log.targetId && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="font-mono text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.2 rounded border border-stone-200">
                              SKU / ID: {log.targetId}
                            </span>
                            {log.targetName && (
                              <span className="text-[11px] text-stone-500 truncate">
                                {log.targetName}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getSeverityBadge(log.severity)}
                      </td>

                      {/* Inspect button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingLog(log);
                          }}
                          className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Inspeccionar Evento Completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inspect Log Modal / Drawer */}
      {inspectingLog && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 font-['Outfit',sans-serif]">
                    Detalle de Evento de Auditoría
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    ID: {inspectingLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                    Acción Ejecutada
                  </span>
                  <span className="text-sm font-bold text-stone-900">
                    {inspectingLog.actionTitle}
                  </span>
                </div>
                <div>
                  {getSeverityBadge(inspectingLog.severity)}
                </div>
              </div>

              {/* User and timestamp metadata */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Usuario Responsable
                  </span>
                  <div className="font-bold text-stone-900">{inspectingLog.userName}</div>
                  <div className="text-stone-500">{inspectingLog.userEmail}</div>
                  <div className="text-[10px] font-semibold text-emerald-800 mt-1 uppercase">
                    Rol: {inspectingLog.userRole}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-stone-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Fecha & Hora del Registro
                  </span>
                  <div className="font-bold text-stone-900 font-mono">
                    {new Date(inspectingLog.timestamp).toLocaleDateString('es-CR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="text-stone-500 font-mono mt-0.5">
                    {new Date(inspectingLog.timestamp).toLocaleTimeString('es-CR')}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                  Descripción Detallada
                </span>
                <p className="text-xs text-stone-800 leading-relaxed">
                  {inspectingLog.description}
                </p>
              </div>

              {/* Technical JSON Details */}
              {inspectingLog.details && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block mb-1">
                    Metadata Técnica & Parámetros (JSON)
                  </span>
                  <pre className="p-3 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto border border-stone-800">
                    {JSON.stringify(inspectingLog.details, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-6 py-3 border-t border-stone-200 bg-stone-50">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 text-center mb-2 font-['Outfit',sans-serif]">
              ¿Vaciar historial de la bitácora?
            </h3>
            <p className="text-xs text-stone-500 text-center mb-6 leading-relaxed">
              Esta acción eliminará todos los registros históricos de movimientos actuales. Se dejará constancia automática de este vaciado en un nuevo registro.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  clearAuditLogs();
                  setShowClearConfirm(false);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Sí, Vaciar Bitácora
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
