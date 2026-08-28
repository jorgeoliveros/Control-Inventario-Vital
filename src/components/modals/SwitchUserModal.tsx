import React, { useState, useEffect } from 'react';
import { X, UserCheck, Shield, Key, AlertCircle, CheckCircle2, Lock, ArrowRight, RotateCcw } from 'lucide-react';
import { User } from '../../types';
import { useInventory } from '../../context/InventoryContext';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewUserModal: () => void;
  initialTargetUserId?: string;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  onOpenNewUserModal,
  initialTargetUserId,
}) => {
  const { users, currentUser, switchUser } = useInventory();
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTargetUserId && users.some(u => u.id === initialTargetUserId)) {
        setSelectedUserId(initialTargetUserId);
      } else {
        setSelectedUserId(currentUser.id);
      }
      setPinInput('');
      setErrorMsg('');
      setIsSuccess(false);
    }
  }, [isOpen, initialTargetUserId, currentUser.id, users]);

  if (!isOpen) return null;

  const targetUser = users.find(u => u.id === selectedUserId) || currentUser;
  const isSwitchingToDifferentUser = selectedUserId !== currentUser.id;

  const handleSelect = (user: User) => {
    if (user.status === 'inactive') {
      setErrorMsg('Este usuario se encuentra inactivo. Contacta a un administrador.');
      return;
    }
    setSelectedUserId(user.id);
    setErrorMsg('');
    setPinInput('');
  };

  const handleConfirmSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!isSwitchingToDifferentUser) {
      onClose();
      return;
    }

    if (!pinInput.trim()) {
      setErrorMsg('Debes ingresar la clave de 4 dígitos asignada para autenticar el acceso.');
      return;
    }

    if (pinInput.trim().length !== 4) {
      setErrorMsg('La clave debe tener exactamente 4 dígitos.');
      return;
    }

    const res = switchUser(selectedUserId, pinInput.trim());
    if (!res.success) {
      setErrorMsg(res.error || 'Clave de 4 dígitos incorrecta. Acceso no autenticado.');
    } else {
      setIsSuccess(true);
      setTimeout(() => {
        onClose();
      }, 400);
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'manager': return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'warehouse': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'sales': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'auditor': return 'bg-rose-100 text-rose-800 border-rose-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                Cambiar Sesión de Usuario
              </h2>
              <p className="text-xs text-stone-500">
                Autenticación obligatoria con clave de 4 dígitos para acceder a otra cuenta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Selection List */}
        <form onSubmit={handleConfirmSwitch} className="p-6 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-600">
            1. Seleccionar Usuario de Destino
          </label>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {users.map((user) => {
              const isSelected = selectedUserId === user.id;
              const isCurrent = currentUser.id === user.id;
              const isInactive = user.status === 'inactive';

              return (
                <button
                  type="button"
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  disabled={isInactive}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isInactive
                      ? 'opacity-40 bg-stone-100 border-stone-200 cursor-not-allowed'
                      : isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm font-['Outfit',sans-serif] ${getAvatarBg(user.avatarColor)}`}>
                      {user.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Sesión Activa
                          </span>
                        )}
                        {isInactive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-2 py-0.2 rounded-md border ${getRoleBadge(user.role)}`}>
                          {user.roleTitle}
                        </span>
                        <span className="text-xs text-stone-400 hidden sm:inline">&middot; {user.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-stone-400">
                    {isSelected && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mandatory 4-digit PIN section for switching */}
          {isSwitchingToDifferentUser ? (
            <div className="pt-4 border-t border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-700" />
                  2. Clave de 4 Dígitos de {targetUser.name}
                </label>
                <span className="text-[11px] text-stone-500 font-medium">
                  Obligatorio
                </span>
              </div>

              <p className="text-xs text-stone-600">
                Introduce la clave de 4 dígitos asignada a <strong>{targetUser.name}</strong> para autenticar el cambio de sesión:
              </p>

              <div className="relative">
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  autoFocus
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ''));
                    setErrorMsg('');
                  }}
                  placeholder="••••"
                  className="w-full px-4 py-2.5 text-center text-lg font-mono tracking-widest border-2 border-stone-300 rounded-xl focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-stone-50"
                />
              </div>
            </div>
          ) : (
            <div className="pt-3 border-t border-stone-200">
              <p className="text-xs text-stone-500 italic text-center">
                Has seleccionado tu propio perfil activo actual.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>¡Acceso autenticado! Cambiando sesión activa...</span>
            </div>
          )}

          {/* Footer inside form */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewUserModal();
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
            >
              + Crear Nuevo Usuario
            </button>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSwitchingToDifferentUser && pinInput.length !== 4}
                className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>{isSwitchingToDifferentUser ? 'Autenticar y Cambiar' : 'Continuar'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
