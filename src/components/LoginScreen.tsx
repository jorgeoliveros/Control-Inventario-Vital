import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lock, 
  Shield, 
  ShieldCheck, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Delete, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { User } from '../types';

export const LoginScreen: React.FC = () => {
  const { users, login, settings } = useInventory();

  // Active users only
  const activeUsers = users.filter(u => u.status !== 'inactive');

  // Default to first active user
  const [selectedUserId, setSelectedUserId] = useState<string>(() => {
    return activeUsers[0]?.id || '';
  });

  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showPinsReference, setShowPinsReference] = useState<boolean>(false);

  // Sync selectedUserId if activeUsers changes and none is selected
  useEffect(() => {
    if (!selectedUserId && activeUsers.length > 0) {
      setSelectedUserId(activeUsers[0].id);
    }
  }, [activeUsers, selectedUserId]);

  const selectedUser = users.find(u => u.id === selectedUserId) || activeUsers[0];

  const handleSelectUser = (user: User) => {
    if (user.status === 'inactive') return;
    setSelectedUserId(user.id);
    setPin('');
    setErrorMsg('');
    setIsSuccess(false);
  };

  const verifyPin = useCallback((pinToTest: string) => {
    if (!selectedUser) {
      setErrorMsg('Selecciona un usuario válido.');
      return;
    }

    if (pinToTest.length !== 4) {
      setErrorMsg('Debes ingresar los 4 dígitos de tu clave asignada.');
      return;
    }

    const result = login(selectedUser.id, pinToTest);
    if (result.success) {
      setIsSuccess(true);
      setErrorMsg('');
    } else {
      setIsShaking(true);
      setErrorMsg(result.error || 'Clave de 4 dígitos incorrecta. Acceso no autenticado.');
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 700);
    }
  }, [selectedUser, login]);

  // Handle keypress from physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;

      // Digits 0-9
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        setErrorMsg('');
        setPin(prev => {
          if (prev.length >= 4) return prev;
          const next = prev + e.key;
          if (next.length === 4) {
            setTimeout(() => verifyPin(next), 50);
          }
          return next;
        });
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setErrorMsg('');
        setPin(prev => prev.slice(0, -1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setPin('');
        setErrorMsg('');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length === 4) {
          verifyPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccess, verifyPin]);

  const handleDigitClick = (digit: string) => {
    if (isSuccess) return;
    setErrorMsg('');
    setPin(prev => {
      if (prev.length >= 4) return prev;
      const next = prev + digit;
      if (next.length === 4) {
        setTimeout(() => verifyPin(next), 50);
      }
      return next;
    });
  };

  const handleDeleteDigit = () => {
    if (isSuccess) return;
    setErrorMsg('');
    setPin(prev => prev.slice(0, -1));
  };

  const handleClearPin = () => {
    if (isSuccess) return;
    setPin('');
    setErrorMsg('');
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
      case 'admin': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'manager': return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'warehouse': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'sales': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'auditor': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-stone-100 text-stone-800 border-stone-300';
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 select-none">
      
      {/* Top Header / Branding */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-2 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md font-['Outfit',sans-serif]">
            V
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Outfit',sans-serif] font-bold text-xl tracking-wide text-white">
                VITAL
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Sistema de Inventarios
              </span>
            </div>
            <p className="text-xs text-stone-400">
              {settings.businessName || 'Tienda Virtual & Control de Stock'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-800/80 border border-stone-700 text-stone-300">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Acceso Protegido</span>
        </div>
      </header>

      {/* Main Authentication Center */}
      <main className="max-w-4xl mx-auto w-full my-auto py-6">
        <div className="bg-stone-800/90 border border-stone-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          
          {/* Card Title */}
          <div className="text-center max-w-lg mx-auto mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
              <Shield className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white font-['Outfit',sans-serif]">
              Inicio de Sesión con PIN
            </h1>
            <p className="text-xs sm:text-sm text-stone-400 mt-1">
              Selecciona tu perfil de usuario e introduce tu clave de 4 dígitos asignada para desbloquear la plataforma.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: User Directory Selector */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  1. Seleccionar Usuario
                </span>
                <span className="text-[11px] text-stone-500">
                  {activeUsers.length} disponibles
                </span>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-700">
                {activeUsers.map(user => {
                  const isSelected = selectedUserId === user.id;
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/40 text-white ring-2 ring-emerald-500/20'
                          : 'border-stone-700/70 hover:border-stone-600 bg-stone-900/50 text-stone-300 hover:bg-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm font-['Outfit',sans-serif] ${getAvatarBg(user.avatarColor)} shadow-xs`}>
                          {user.initials}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">
                            {user.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${getRoleBadge(user.role)}`}>
                              {user.roleTitle}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-stone-400">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-stone-600" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: PIN Verification & Keypad */}
            <div className="lg:col-span-7 bg-stone-900/80 border border-stone-700/70 rounded-2xl p-6 flex flex-col items-center justify-center">
              
              <div className="w-full text-center mb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-stone-400 block mb-1">
                  2. Ingresar Clave Asignada (4 Dígitos)
                </span>
                {selectedUser && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-stone-800 border border-stone-700 mt-1">
                    <span className="text-xs text-stone-400">Usuario activo:</span>
                    <span className="text-xs font-bold text-emerald-400">{selectedUser.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-700 text-stone-300">
                      {selectedUser.roleTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* 4-Digit Display Indicator */}
              <div className={`flex items-center justify-center gap-4 my-3 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
                {[0, 1, 2, 3].map(index => {
                  const hasValue = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${
                        isSuccess
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20'
                          : isShaking
                          ? 'border-rose-500 bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/20'
                          : hasValue
                          ? 'border-emerald-500 bg-stone-800 text-white scale-105 shadow-md shadow-emerald-500/10'
                          : 'border-stone-700 bg-stone-800/40 text-stone-600'
                      }`}
                    >
                      {hasValue ? (
                        <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-xs"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-stone-700"></div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Status Message / Error / Success */}
              <div className="h-9 my-1 flex items-center justify-center text-center px-4 w-full">
                {isSuccess ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>¡Acceso autenticado! Desbloqueando la plataforma...</span>
                  </div>
                ) : errorMsg ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 px-3 py-1.5 rounded-xl animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400">
                    Introduce el PIN de 4 dígitos asignado (teclado físico o numérico)
                  </p>
                )}
              </div>

              {/* Virtual Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-xs mt-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDigitClick(num)}
                    disabled={isSuccess}
                    className="h-12 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 border border-stone-700 font-bold text-lg text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={handleClearPin}
                  disabled={isSuccess || pin.length === 0}
                  className="h-12 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700/60 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                  title="Limpiar PIN"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDigitClick('0')}
                  disabled={isSuccess}
                  className="h-12 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 border border-stone-700 font-bold text-lg text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleDeleteDigit}
                  disabled={isSuccess || pin.length === 0}
                  className="h-12 rounded-xl bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-700/60 flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                  title="Borrar dígito"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              {/* Manual Trigger Button (if user has typed 4 digits) */}
              <div className="w-full max-w-xs mt-4">
                <button
                  type="button"
                  onClick={() => verifyPin(pin)}
                  disabled={isSuccess || pin.length !== 4}
                  className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Desbloquear y Acceder</span>
                </button>
              </div>

            </div>

          </div>

          {/* Collapsible Demo / Assigned PINs Guide Panel */}
          <div className="mt-8 pt-5 border-t border-stone-700/80">
            <button
              type="button"
              onClick={() => setShowPinsReference(prev => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-stone-400 hover:text-stone-200 py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>Credenciales & Claves de 4 Dígitos Asignadas en el Sistema</span>
              </span>
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                {showPinsReference ? 'Ocultar claves' : 'Ver claves asignadas'}
                {showPinsReference ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {showPinsReference && (
              <div className="mt-4 p-4 rounded-2xl bg-stone-900/90 border border-stone-700 text-xs space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Usuario & Cargo
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    PIN Asignado
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {users.map(u => (
                    <div
                      key={u.id}
                      onClick={() => handleSelectUser(u)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                        selectedUserId === u.id
                          ? 'border-emerald-500 bg-emerald-950/30'
                          : 'border-stone-800 bg-stone-800/50 hover:bg-stone-800 hover:border-stone-700'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold text-white truncate">{u.name}</div>
                        <div className="text-[10px] text-stone-400 truncate">{u.roleTitle}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-mono font-bold text-xs bg-stone-950 px-2 py-1 rounded border border-stone-700 text-emerald-400 tracking-widest">
                          {u.pin || '1234'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[11px] text-stone-400 pt-1">
                  Nota: Puedes hacer clic en cualquiera de los usuarios para seleccionarlo de inmediato e ingresar su clave de 4 dígitos.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-4xl mx-auto w-full text-center py-2 text-[11px] text-stone-500 border-t border-stone-800 flex items-center justify-between">
        <span>VITAL &middot; Sistema Seguro de Inventarios & Ventas</span>
        <span>Autenticación de 4 Dígitos Obligatoria</span>
      </footer>

    </div>
  );
};
