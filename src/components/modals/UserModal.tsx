import React, { useState, useEffect } from 'react';
import { X, Shield, User as UserIcon, Mail, Key, Check, AlertCircle, Info, Lock } from 'lucide-react';
import { User, UserRole, UserPermissions } from '../../types';
import { rolePresets } from '../../data/initialData';
import { useInventory } from '../../context/InventoryContext';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  userToEdit,
}) => {
  const { addUser, updateUser, users } = useInventory();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('sales');
  const [roleTitle, setRoleTitle] = useState('Asesor Comercial / Vendedor');
  const [avatarColor, setAvatarColor] = useState<User['avatarColor']>('emerald');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [pin, setPin] = useState('1234');
  const [permissions, setPermissions] = useState<UserPermissions>(rolePresets.sales.permissions);
  const [errors, setErrors] = useState<{ name?: string; email?: string; pin?: string }>({});

  useEffect(() => {
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setRole(userToEdit.role);
      setRoleTitle(userToEdit.roleTitle);
      setAvatarColor(userToEdit.avatarColor);
      setStatus(userToEdit.status);
      setPin(userToEdit.pin || '1234');
      setPermissions({ ...userToEdit.permissions });
    } else {
      setName('');
      setEmail('');
      setRole('sales');
      setRoleTitle(rolePresets.sales.title);
      setAvatarColor('emerald');
      setStatus('active');
      setPin('1234');
      setPermissions({ ...rolePresets.sales.permissions });
    }
    setErrors({});
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setRoleTitle(rolePresets[newRole].title);
    setPermissions({ ...rolePresets[newRole].permissions });
  };

  const handlePermissionToggle = (key: keyof UserPermissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const validate = () => {
    const newErrors: { name?: string; email?: string; pin?: string } = {};
    if (!name.trim()) newErrors.name = 'El nombre completo es requerido';
    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingrese un correo electrónico válido';
    } else {
      // Check duplicate email
      const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.id !== userToEdit?.id);
      if (existing) newErrors.email = 'Este correo ya está registrado en otro usuario';
    }

    if (pin && pin.length !== 4) {
      newErrors.pin = 'El PIN debe contener exactamente 4 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (userToEdit) {
      updateUser(userToEdit.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        roleTitle: roleTitle.trim() || rolePresets[role].title,
        avatarColor,
        status,
        pin: pin.trim() || '1234',
        permissions,
      });
    } else {
      addUser({
        name: name.trim(),
        email: email.trim(),
        role,
        roleTitle: roleTitle.trim() || rolePresets[role].title,
        avatarColor,
        status,
        pin: pin.trim() || '1234',
        permissions,
      });
    }

    onClose();
  };

  const permissionList: { key: keyof UserPermissions; label: string; description: string; category: string }[] = [
    // Catálogo y Productos
    { key: 'canManageProducts', label: 'Crear y editar productos', description: 'Permite registrar nuevos ítems y modificar datos generales', category: 'Catálogo' },
    { key: 'canDeleteProducts', label: 'Eliminar productos', description: 'Autoriza remover productos definitivamente del catálogo', category: 'Catálogo' },
    { key: 'canEditCostPrices', label: 'Ver y editar costos base', description: 'Acceso a costos confidenciales de compra de proveedores', category: 'Finanzas & Costos' },
    
    // Entradas
    { key: 'canRegisterEntries', label: 'Registrar compras e ingresos', description: 'Permite añadir lotes recibidos de proveedores', category: 'Inventario' },
    { key: 'canDeleteEntries', label: 'Anular registros de compras', description: 'Eliminar o rectificar ingresos de mercancía', category: 'Inventario' },
    
    // Salidas
    { key: 'canRegisterExits', label: 'Registrar salidas y ventas', description: 'Despachar pedidos, ventas web y salidas por merma', category: 'Ventas' },
    { key: 'canDeleteExits', label: 'Anular registros de ventas', description: 'Eliminar o corregir salidas despachadas', category: 'Ventas' },
    
    // Reportes & Auditoría
    { key: 'canViewFinancialReports', label: 'Consultar utilidades y márgenes', description: 'Ver gráficos de ganancias netas, COGS y rentabilidad', category: 'Finanzas & Costos' },
    { key: 'canViewAuditLogs', label: 'Consultar bitácora de auditoría', description: 'Monitorear el historial de acciones y cambios de todos los usuarios', category: 'Seguridad' },
    { key: 'canExportData', label: 'Exportar reportes (CSV/JSON)', description: 'Descargar bases de datos de inventario y transacciones', category: 'Reportes' },
    
    // Administración
    { key: 'canManageUsers', label: 'Gestionar usuarios y accesos', description: 'Crear cuentas, asignar roles y conceder permisos', category: 'Administración' },
    { key: 'canManageSettings', label: 'Configuración del sistema', description: 'Cambiar moneda, resetear base de datos y políticas', category: 'Administración' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-['Outfit',sans-serif]">
                {userToEdit ? 'Editar Usuario y Permisos' : 'Crear Nuevo Usuario'}
              </h2>
              <p className="text-xs text-stone-500">
                Define el rol, credenciales y permisos de acceso para este miembro del equipo
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Nombre Completo <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Sofia Navarro"
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.name ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
                  }`}
                />
              </div>
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Correo Electrónico <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sofia@vitalstore.com"
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.email ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
                  }`}
                />
              </div>
              {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Role Presets & Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-2">
              Plantilla de Rol Principal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(rolePresets) as UserRole[]).map((r) => {
                const preset = rolePresets[r];
                const isSelected = role === r;
                return (
                  <button
                    type="button"
                    key={r}
                    onClick={() => handleRoleChange(r)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{preset.title.split(' ')[0]}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-tight">
                      {preset.title}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex items-start gap-2 bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-xs text-stone-600">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{rolePresets[role].description}</span>
            </div>
          </div>

          {/* Role Custom Title & Security PIN */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                Título de Cargo Personalizado
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Ej: Encargada de Logística & Envíos"
                className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1">
                PIN de Acceso (4 dígitos)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    errors.pin ? 'border-rose-400 bg-rose-50' : 'border-stone-300'
                  }`}
                />
              </div>
              {errors.pin && <p className="text-xs text-rose-600 mt-1">{errors.pin}</p>}
            </div>
          </div>

          {/* Avatar Color & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Color de Identificación
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'emerald', bg: 'bg-emerald-600' },
                  { id: 'sky', bg: 'bg-sky-600' },
                  { id: 'amber', bg: 'bg-amber-600' },
                  { id: 'purple', bg: 'bg-purple-600' },
                  { id: 'rose', bg: 'bg-rose-600' },
                  { id: 'indigo', bg: 'bg-indigo-600' },
                ].map((color) => (
                  <button
                    type="button"
                    key={color.id}
                    onClick={() => setAvatarColor(color.id as any)}
                    className={`w-8 h-8 rounded-full ${color.bg} transition-all flex items-center justify-center cursor-pointer ${
                      avatarColor === color.id ? 'ring-3 ring-offset-2 ring-stone-900 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {avatarColor === color.id && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                Estado de la Cuenta
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    status === 'active'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ● Activo
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('inactive')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    status === 'inactive'
                      ? 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/10'
                      : 'bg-stone-50 text-stone-500 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ● Inactivo / Bloqueado
                </button>
              </div>
            </div>
          </div>

          {/* Granular Permission Toggles */}
          <div className="pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                  Permisos de Acceso Detallados
                </h3>
                <p className="text-xs text-stone-500">
                  Puedes personalizar individualmente cada acción según las responsabilidades del usuario
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermissions({ ...rolePresets[role].permissions })}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Reestablecer según rol
              </button>
            </div>

            <div className="space-y-2 border border-stone-200 rounded-xl p-3 bg-stone-50/50">
              {permissionList.map((perm) => {
                const isChecked = !!permissions[perm.key];
                return (
                  <label
                    key={perm.key}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-white border-emerald-200 shadow-2xs'
                        : 'bg-stone-100/60 border-stone-200 opacity-60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePermissionToggle(perm.key)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-700 focus:ring-emerald-500 border-stone-300 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900">{perm.label}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 border border-stone-200">
                          {perm.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5">{perm.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{userToEdit ? 'Guardar Cambios' : 'Crear Usuario'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
