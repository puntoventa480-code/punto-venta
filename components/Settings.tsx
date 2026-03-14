
import React, { useRef, useState } from 'react';
import { Download, Upload, FolderOpen, ShieldCheck, Database, HardDrive, RefreshCw, AlertCircle, Users, Shield, Plus, Trash2, CheckSquare, Square, UserPlus, Home, RefreshCcw, Sparkles, CheckCircle2, Send } from 'lucide-react';
import { Product, Category, Sale, InventoryMovement, FinancialSettings, AutoSaveConfig, Role, User, Permission } from '../types';
import { firebaseService } from '../services/firebaseService';
import { User as FirebaseUser } from 'firebase/auth';

interface SettingsProps {
  products: Product[];
  categories: Category[];
  sales: Sale[];
  movements: InventoryMovement[];
  financialSettings: FinancialSettings;
  setFinancialSettings: React.Dispatch<React.SetStateAction<FinancialSettings>>;
  autoSaveConfig: AutoSaveConfig;
  setAutoSaveConfig: React.Dispatch<React.SetStateAction<AutoSaveConfig>>;
  directoryHandle: FileSystemDirectoryHandle | null;
  setDirectoryHandle: (handle: FileSystemDirectoryHandle | null) => void;
  onImport: (data: any) => void;
  onFactoryReset: () => void;
  isSaving: boolean;
  roles: Role[];
  setRoles: React.Dispatch<React.SetStateAction<Role[]>>;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  fbUser: FirebaseUser | null;
}

const Settings: React.FC<SettingsProps> = ({ 
  products, categories, sales, movements, financialSettings, setFinancialSettings,
  onImport, onFactoryReset, autoSaveConfig, setAutoSaveConfig, 
  directoryHandle, setDirectoryHandle, isSaving,
  roles, setRoles, users, setUsers,
  fbUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'users' | 'telegram'>('backup');

  // Role Creation State
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>(['pos']);

  // User Creation State
  const [newUsername, setNewUsername] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || '');

  const availablePermissions: { id: Permission, label: string }[] = [
    { id: 'pos', label: 'Punto de Venta' },
    { id: 'sales-history', label: 'Historial' },
    { id: 'products', label: 'Productos' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'stats', label: 'Estadísticas' },
    { id: 'insights', label: 'Inteligencia' },
    { id: 'settings', label: 'Configuración' },
  ];

  const loadSampleData = () => {
    const sampleData = {
      categories: [
        { id: 'cat_granels', name: 'Granos y Aceites' },
        { id: 'cat_snacks_v', name: 'Snacks Variados' },
        { id: 'cat_drinks', name: 'Bebidas' },
        { id: 'cat_bakery', name: 'Panadería' }
      ],
      products: [
        { id: 'p1', name: 'Aceite de Oliva Extra Virgen 5L', categoryId: 'cat_granels', code: 'OIL-001', image: '', costPrice: 180.00, salePrice: 245.00, stock: 10 },
        { id: 'p2', name: 'Aceite de Girasol 10L', categoryId: 'cat_granels', code: 'OIL-002', image: '', costPrice: 150.00, salePrice: 210.00, stock: 15 },
        { id: 'p3', name: 'Paquete Frijoles Negros 50lb', categoryId: 'cat_granels', code: 'BEA-001', image: '', costPrice: 210.00, salePrice: 320.00, stock: 5 },
        { id: 'p4', name: 'Saco de Arroz Premium 100lb', categoryId: 'cat_granels', code: 'RIC-001', image: '', costPrice: 450.00, salePrice: 680.00, stock: 3 },
        { id: 'p5', name: 'Pelly Familiar (Caja 20u)', categoryId: 'cat_snacks_v', code: 'PEL-001', image: '', costPrice: 160.00, salePrice: 225.00, stock: 8 },
        { id: 'p6', name: 'Pelly Queso Mega Pack', categoryId: 'cat_snacks_v', code: 'PEL-002', image: '', costPrice: 190.00, salePrice: 275.00, stock: 12 },
        { id: 'p7', name: 'Frijol Rojo Especial 25lb', categoryId: 'cat_granels', code: 'BEA-002', image: '', costPrice: 175.00, salePrice: 240.00, stock: 7 },
        { id: 'p8', name: 'Caja de Refrescos Surtidos', categoryId: 'cat_drinks', code: 'DRK-010', image: '', costPrice: 140.00, salePrice: 205.00, stock: 20 },
        { id: 'p9', name: 'Combo Panadería Familiar', categoryId: 'cat_bakery', code: 'BAK-050', image: '', costPrice: 120.00, salePrice: 201.00, stock: 15 },
        { id: 'p10', name: 'Arroz Grano Largo 50lb', categoryId: 'cat_granels', code: 'RIC-002', image: '', costPrice: 250.00, salePrice: 395.00, stock: 10 }
      ],
      sales: [],
      movements: [],
      financialSettings: {
        ...financialSettings,
        businessName: 'Gourmet Luxury Market',
        initialInvestment: 5000
      }
    };
    if (window.confirm("¿Deseas cargar los nuevos datos de muestra (precios > $200)? Esto reemplazará tu catálogo actual.")) {
      onImport(sampleData);
    }
  };

  const exportData = () => {
    const data = { products, categories, sales, movements, financialSettings, exportDate: new Date().toISOString(), version: "1.0" };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${financialSettings.businessName.replace(/\s+/g, '_')}_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (window.confirm("¿Está seguro de restaurar estos datos? Se sobreescribirá la información actual.")) {
          onImport(json);
        }
      } catch (err) {
        alert("Archivo no válido.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const selectDirectory = async () => {
    if (!('showDirectoryPicker' in window)) {
      alert("Su navegador no soporta el acceso directo a carpetas. Por favor use Chrome, Edge o una versión moderna de su navegador.");
      return;
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      setDirectoryHandle(handle);
      setAutoSaveConfig(prev => ({ ...prev, enabled: true }));
    } catch (err) {
      console.error("Selección de directorio cancelada o fallida:", err);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    const newRole: Role = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRoleName,
      permissions: selectedPerms
    };
    
    if (fbUser) {
      await firebaseService.saveRole(newRole);
    } else {
      setRoles([...roles, newRole]);
    }
    
    setNewRoleName('');
    setSelectedPerms(['pos']);
  };

  const createUser = async () => {
    if (!newUsername.trim() || !selectedRoleId) return;
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUsername,
      roleId: selectedRoleId
    };
    
    if (fbUser) {
      await firebaseService.saveUser(newUser);
    } else {
      setUsers([...users, newUser]);
    }
    
    setNewUsername('');
  };

  const togglePermission = (perm: Permission) => {
    if (selectedPerms.includes(perm)) {
      setSelectedPerms(selectedPerms.filter(p => p !== perm));
    } else {
      setSelectedPerms([...selectedPerms, perm]);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Database className="text-emerald-600" />
            Configuración y Datos
          </h2>
          <p className="text-slate-500 font-medium">Gestione la seguridad y el acceso de su equipo</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
          <button 
            onClick={() => setActiveSubTab('backup')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'backup' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Datos & Backup
          </button>
          <button 
            onClick={() => setActiveSubTab('users')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'users' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Usuarios & Roles
          </button>
          <button 
            onClick={() => setActiveSubTab('telegram')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeSubTab === 'telegram' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Telegram Bot
          </button>
        </div>
      </header>

      {activeSubTab === 'backup' ? (
        <div className="space-y-8">
          {/* General Business Info Card */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl">
                <Home size={28} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-800">General</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">Información del Negocio</p>
                <div className="max-w-xs">
                  <input 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-indigo-100 font-black text-slate-700 uppercase tracking-tight"
                    value={financialSettings.businessName}
                    onChange={e => setFinancialSettings(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej: MI RESTAURANTE"
                  />
                </div>
              </div>
            </div>
            
            <button 
              onClick={loadSampleData}
              className="flex items-center gap-3 bg-indigo-50 text-indigo-600 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
            >
              <Sparkles size={20} />
              Datos de Muestra (Premium)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Manual Backup Card */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Respaldo Manual</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Exportar e Importar Archivos</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-8">Descargue una copia completa de su base de datos en formato JSON para guardarla en una unidad externa o restaurarla.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
                <button onClick={exportData} className="flex items-center justify-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"><Download size={18} /> Exportar Todo</button>
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-3 bg-white text-slate-800 border-2 border-slate-100 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"><Upload size={18} /> Importar Datos</button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileImport} />
              </div>
            </div>

            {/* Auto-Save Card */}
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
              {isSaving && <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse"></div>}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><HardDrive size={28} /></div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">Sincronización Automática</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Guardado cada 1 minuto</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={autoSaveConfig.enabled && !!directoryHandle} onChange={() => !directoryHandle ? selectDirectory() : setAutoSaveConfig(prev => ({ ...prev, enabled: !prev.enabled }))} />
                  <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
              
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                Seleccione una carpeta para habilitar el auto-guardado. <strong>Nota:</strong> Debido a seguridad del navegador, deberá re-seleccionar la carpeta si refresca la página para continuar sincronizando.
              </p>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <FolderOpen size={18} className={directoryHandle ? 'text-emerald-500' : 'text-slate-400'} />
                  <p className="text-xs font-bold text-slate-700 truncate">{directoryHandle ? `Directorio: ${directoryHandle.name}` : 'No se ha seleccionado carpeta'}</p>
                </div>
                <button 
                  onClick={selectDirectory} 
                  className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${directoryHandle ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'}`}
                >
                  {directoryHandle ? 'Carpeta Sincronizada' : 'Vincular Carpeta de Backup'}
                  {directoryHandle && <CheckCircle2 size={16} />}
                </button>
              </div>
              {autoSaveConfig.lastSaved && (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mt-auto">
                  <RefreshCw size={12} className={isSaving ? 'animate-spin' : ''} />
                  Último autoguardado: {new Date(autoSaveConfig.lastSaved).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>

          {/* Dangerous Zone Card */}
          <div className="bg-red-50 p-8 rounded-[3rem] border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-start gap-6">
              <div className="p-4 bg-white text-red-500 rounded-3xl shadow-sm shrink-0">
                <RefreshCcw size={32} />
              </div>
              <div>
                <h4 className="text-xl font-black text-red-900 mb-2">Zona de Peligro</h4>
                <p className="text-sm text-red-800/80 leading-relaxed max-w-xl">
                  Al restaurar de fábrica, se eliminarán permanentemente todos los registros, productos y configuraciones locales. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <button 
              onClick={onFactoryReset}
              className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100 whitespace-nowrap"
            >
              Restaurar de Fábrica
            </button>
          </div>
        </div>
      ) : activeSubTab === 'telegram' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-sky-50 text-sky-600 rounded-3xl">
                <Send size={28} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Conexión con Telegram</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Notificaciones en tiempo real</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Configuración del Bot</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <span className="text-sm font-bold text-slate-600">Habilitar Notificaciones</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={financialSettings.telegramConfig?.enabled || false} 
                          onChange={e => setFinancialSettings(prev => ({
                            ...prev,
                            telegramConfig: {
                              chatId: prev.telegramConfig?.chatId || '',
                              enabled: e.target.checked
                            }
                          }))} 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">API Token del Bot (Opcional)</label>
                      <input 
                        type="password" 
                        placeholder="Ej: 123456789:ABCdef..." 
                        className="w-full px-5 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-sky-100 font-black text-slate-700 tracking-tight"
                        value={financialSettings.telegramConfig?.botToken || ''}
                        onChange={e => setFinancialSettings(prev => ({
                          ...prev,
                          telegramConfig: {
                            ...prev.telegramConfig!,
                            botToken: e.target.value
                          }
                        }))}
                      />
                      <p className="text-[9px] text-slate-400 mt-2 px-1">Si se deja vacío, se usará el token configurado en el servidor.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chat ID de Telegram</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 123456789" 
                        className="w-full px-5 py-4 bg-white border-none rounded-2xl focus:ring-4 focus:ring-sky-100 font-black text-slate-700 tracking-tight"
                        value={financialSettings.telegramConfig?.chatId || ''}
                        onChange={e => setFinancialSettings(prev => ({
                          ...prev,
                          telegramConfig: {
                            ...prev.telegramConfig!,
                            chatId: e.target.value
                          }
                        }))}
                      />
                    </div>

                    <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100">
                      <p className="text-[10px] font-bold text-sky-700 leading-relaxed">
                        <strong>¿Cómo obtener tu Chat ID?</strong><br />
                        1. Busca a tu bot en Telegram.<br />
                        2. Envía el comando <code>/start</code>.<br />
                        3. El bot te responderá con tu Chat ID único.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4">Estado del Bot</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100">
                      <div className={`w-3 h-3 rounded-full ${financialSettings.telegramConfig?.enabled ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-slate-300'}`}></div>
                      <span className="text-sm font-bold text-slate-700">
                        {financialSettings.telegramConfig?.enabled ? 'Bot Activo' : 'Bot Desactivado'}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Cuando el bot está activo, recibirás un mensaje automático en Telegram cada vez que se complete una venta, incluyendo el total y el método de pago.
                    </p>

                    <button 
                      onClick={async () => {
                        if (!financialSettings.telegramConfig?.chatId) {
                          alert("Por favor ingresa un Chat ID primero.");
                          return;
                        }
                        try {
                          const res = await fetch('/api/send-telegram', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              chatId: financialSettings.telegramConfig.chatId,
                              botToken: financialSettings.telegramConfig.botToken,
                              message: "🔔 ¡Prueba de conexión exitosa! GourmetPOS está conectado con Telegram."
                            })
                          });
                          const data = await res.json();
                          if (data.success) alert("Mensaje de prueba enviado.");
                          else alert("Error: " + data.error);
                        } catch (err) {
                          alert("Error de conexión con el servidor.");
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-sky-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-sky-700 transition-all shadow-xl shadow-sky-100"
                    >
                      <Send size={18} /> Enviar Mensaje de Prueba
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Roles Management */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-amber-50 text-amber-600 rounded-3xl"><Shield size={28} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Gestión de Roles</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Personalizar Permisos</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Crear Nuevo Rol</p>
                <div className="space-y-4">
                  <input 
                    type="text" placeholder="Nombre del rol (ej: Supervisor)" 
                    className="w-full px-5 py-3 bg-white border-none rounded-xl focus:ring-4 focus:ring-emerald-100 font-bold text-sm"
                    value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {availablePermissions.map(p => (
                      <button 
                        key={p.id} onClick={() => togglePermission(p.id)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${selectedPerms.includes(p.id) ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                        {selectedPerms.includes(p.id) ? <CheckSquare size={14}/> : <Square size={14}/>}
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={createRole} className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 mt-2">
                    <Plus size={18} /> Guardar Rol
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Roles Existentes</p>
                {roles.map(r => (
                  <div key={r.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group">
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase">{r.name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{r.permissions.length} permisos activos</p>
                    </div>
                    {r.id !== 'admin' && (
                      <button 
                        onClick={async () => {
                          if (fbUser) {
                            await firebaseService.deleteRole(r.id);
                          } else {
                            setRoles(roles.filter(role => role.id !== r.id));
                          }
                        }} 
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Users Management */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><Users size={28} /></div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Cuentas de Usuario</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gestión de Personal</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vincular Nuevo Usuario</p>
                <div className="space-y-4">
                  <input 
                    type="text" placeholder="Nombre de usuario" 
                    className="w-full px-5 py-3 bg-white border-none rounded-xl focus:ring-4 focus:ring-emerald-100 font-bold text-sm"
                    value={newUsername} onChange={e => setNewUsername(e.target.value)}
                  />
                  <select 
                    className="w-full px-5 py-3 bg-white border-none rounded-xl focus:ring-4 focus:ring-emerald-100 font-bold text-sm outline-none"
                    value={selectedRoleId} onChange={e => setSelectedRoleId(e.target.value)}
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <button onClick={createUser} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                    <UserPlus size={18} /> Crear Usuario
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuarios en Sistema</p>
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 border border-slate-100">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase">{u.username}</p>
                        <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-widest">{roles.find(r => r.id === u.roleId)?.name}</p>
                      </div>
                    </div>
                    {u.id !== '1' && (
                      <button 
                        onClick={async () => {
                          if (fbUser) {
                            // We need a deleteUser in firebaseService
                            await firebaseService.deleteUser(u.id);
                          } else {
                            setUsers(users.filter(user => user.id !== u.id));
                          }
                        }} 
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
