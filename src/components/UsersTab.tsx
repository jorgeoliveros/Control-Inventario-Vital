import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  UserCheck, 
  Lock, 
  AlertCircle, 
  Info,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { User, UserRole } from '../types';
import { rolePresets } from '../data/initialData';
import { UserModal } from './modals/UserModal';
import { formatDate } from '../utils/formatters';

export const UsersTab: React.FC = () => {
  const { 
    users, 
    currentUser, 
    switchUser, 
    deleteUser, 
    updateUser, 
    hasPermission 
  } = useInventory();

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [errorBanner, setErrorBanner] = useState<string>('');

  const canManageUsers = hasPermission('canManageUsers');

  const handleOpenCreate = () => {
    if (!canManageUsers) {
      setErrorBanner('Tu rol actual no tiene permisos para crear o modificar usuarios.');
      return;
    }
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    if (!canManageUsers) {
      setErrorBanner('Tu rol actual no tiene permisos para crear o modificar usuarios.');
      return;
    }
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    if (!canManageUsers) {
      setErrorBanner('Tu rol actual no tiene permisos para cambiar el estado de usuarios.');
      return;
    }
    if (user.id === currentUser.id) {
      setErrorBanner('No puedes desactivar tu propia cuenta activa en sesión.');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    updateUser(user.id, { status: newStatus });
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmUser) return;
    const res = deleteUser(deleteConfirmUser.id);
    if (!res.success) {
      setErrorBanner(res.error || 'Error al eliminar usuario.');
    }
    setDeleteConfirmUser(null);
  };

  const handleQuickSwitch = (userId: string) => {
    const res = switchUser(userId);
    if (!res.success) {
      setErrorBanner(res.error || 'Error al cambiar de sesión.');
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

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">Administrador</span>;
      case 'manager':
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-900 border border-sky-300">Gerente</span>;
      case 'warehouse':
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">Bodega</span>;
      case 'sales':
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-900 border border-purple-300">Ventas</span>;
      case 'auditor':
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-300">Auditor</span>;
      default:
        return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-900 border border-stone-300">Usuario</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150" id="users-tab-container">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-stone-900 font-['Outfit',sans-serif]">
              Usuarios y Permisos de Acceso
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-800 border border-stone-200">
              {users.length} miembros
            </span>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Asigna roles y permisos granulares a tu equipo de trabajo para controlar quién puede crear productos, modificar precios de costo, despachar ventas o consultar reportes financieros confidenciales.
          </p>
        </div>

        <div>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {errorBanner && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner('')}
            className="text-rose-600 hover:text-rose-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Role Preset Matrix Summary */}
      <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-700" />
            Estructura de Roles y Niveles de Seguridad en VITAL
          </h2>
          <span className="text-[11px] text-stone-400">
            Control de accesos basado en roles (RBAC)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {(Object.keys(rolePresets) as UserRole[]).map((r) => {
            const preset = rolePresets[r];
            const count = users.filter(u => u.role === r).length;
            return (
              <div key={r} className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">{preset.title.split(' ')[0]}</span>
                  <span className="text-[10px] font-semibold bg-white px-1.5 py-0.2 rounded border border-stone-200 text-stone-600">
                    {count} {count === 1 ? 'usuario' : 'usuarios'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-3 leading-tight">
                  {preset.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* User Directory Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const isCurrent = currentUser.id === user.id;
          const isInactive = user.status === 'inactive';

          return (
            <div
              key={user.id}
              className={`bg-white rounded-2xl border transition-all shadow-xs p-5 flex flex-col justify-between ${
                isCurrent
                  ? 'border-emerald-500 ring-2 ring-emerald-500/10'
                  : isInactive
                  ? 'border-stone-200 bg-stone-50/70 opacity-75'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div>
                {/* User Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base font-['Outfit',sans-serif] ${getAvatarBg(user.avatarColor)} shadow-xs`}>
                      {user.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-sm font-bold text-stone-900 font-['Outfit',sans-serif]">
                          {user.name}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            En Sesión
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500">{user.email}</p>
                    </div>
                  </div>

                  <div>
                    {getRoleBadge(user.role)}
                  </div>
                </div>

                {/* Role Title & Status */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 mb-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Cargo:</span>
                    <span className="font-semibold text-stone-800 truncate">{user.roleTitle}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Estado:</span>
                    <span className={`font-bold flex items-center gap-1 ${user.status === 'active' ? 'text-emerald-700' : 'text-rose-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                      {user.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Último acceso:</span>
                    <span className="font-mono text-[11px] text-stone-600">{formatDate(user.lastLogin)}</span>
                  </div>
                </div>

                {/* Permissions Summary Chips */}
                <div className="space-y-1.5 mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                    Permisos Autorizados:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {user.permissions.canManageProducts && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        Catálogo
                      </span>
                    )}
                    {user.permissions.canEditCostPrices && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        Costos Base
                      </span>
                    )}
                    {user.permissions.canRegisterEntries && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-200">
                        Ingresos
                      </span>
                    )}
                    {user.permissions.canRegisterExits && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Ventas / Salidas
                      </span>
                    )}
                    {user.permissions.canViewFinancialReports && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200">
                        Finanzas & Márgenes
                      </span>
                    )}
                    {user.permissions.canViewAuditLogs && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200">
                        Bitácora
                      </span>
                    )}
                    {user.permissions.canManageUsers && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                        Gestión Usuarios
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                {!isCurrent ? (
                  <button
                    onClick={() => handleQuickSwitch(user.id)}
                    disabled={isInactive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                    title="Cambiar sesión activa a este usuario"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-stone-600" />
                    <span>Cambiar a este usuario</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    Sesión activa
                  </span>
                )}

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(user)}
                    className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                    title="Editar datos y permisos"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {!isCurrent && (
                    <button
                      onClick={() => setDeleteConfirmUser(user)}
                      className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        userToEdit={editingUser}
      />

      {/* Delete User Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900 text-center mb-1 font-['Outfit',sans-serif]">
              ¿Eliminar usuario "{deleteConfirmUser.name}"?
            </h3>
            <p className="text-xs text-stone-500 text-center mb-6 leading-relaxed">
              El usuario perderá el acceso a la plataforma VITAL. Sus movimientos históricos en la bitácora de auditoría se conservarán de forma inmutable para trazabilidad.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Sí, Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
