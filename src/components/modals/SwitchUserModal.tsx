import React, { useState } from 'react';
import { X, UserCheck, Shield, Key, AlertCircle, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { User } from '../../types';
import { useInventory } from '../../context/InventoryContext';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewUserModal: () => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  onOpenNewUserModal,
}) => {
  const { users, currentUser, switchUser, settings } = useInventory();
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelect = (user: User) => {
    if (user.status === 'inactive') {
      setErrorMsg('Este usuario se encuentra inactivo.');
      return;
    }
    setSelectedUserId(user.id);
    setErrorMsg('');
    setPinInput('');
  };

  const handleConfirmSwitch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedUserId === currentUser.id) {
      onClose();
      return;
    }

    const res = switchUser(selectedUserId, pinInput);
    if (!res.success) {
      setErrorMsg(res.error || 'Error al cambiar de usuario.');
    } else {
      onClose();
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
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                Cambiar Sesión de Usuario
              </h2>
              <p className="text-xs text-stone-500">
                Selecciona tu perfil para registrar movimientos a tu nombre en la bitácora
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
        <div className="p-6 space-y-4">
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
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
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isInactive
                      ? 'opacity-40 bg-stone-100 border-stone-200 cursor-not-allowed'
                      : isSelected
                      ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20'
                      : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-['Outfit',sans-serif] ${getAvatarBg(user.avatarColor)}`}>
                      {user.initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">{user.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Actual
                          </span>
                        )}
                        {isInactive && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[11px] font-medium px-2 py-0.2 rounded-md border ${getRoleBadge(user.role)}`}>
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

          {/* Optional PIN if system lock is enabled or user wants verification */}
          {settings.enableAuditLock && (
            <div className="pt-3 border-t border-stone-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                PIN de Seguridad de 4 dígitos
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="Introduce tu PIN..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-300 rounded-xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
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
              type="button"
              onClick={() => handleConfirmSwitch()}
              className="px-5 py-2 text-xs font-bold text-white bg-stone-900 hover:bg-black rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Acceder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
