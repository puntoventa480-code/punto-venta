
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Package, BarChart3, Menu, X, Tag, TrendingUp, ReceiptText, Settings as SettingsIcon, LogOut, UserCircle } from 'lucide-react';
import { Product, Category, Sale, InventoryMovement, FinancialSettings, AutoSaveConfig, Role, User, Permission, DayClosure, ProductClosureSnapshot } from './types';
import POS from './components/POS';
import Products from './components/Products';
import Inventory from './components/Inventory';
import Statistics from './components/Statistics';
import Insights from './components/Insights';
import SalesHistory from './components/SalesHistory';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Permission>('pos');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Persistence State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [closures, setClosures] = useState<DayClosure[]>([]);
  const [activeClosure, setActiveClosure] = useState<DayClosure | null>(null);
  const [financialSettings, setFinancialSettings] = useState<FinancialSettings>({
    businessName: 'GourmetPOS',
    initialInvestment: 1000,
    workerSalaryRate: 1.5
  });

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return { start: today, end: today };
  });

  const [roles, setRoles] = useState<Role[]>([
    { id: 'admin', name: 'Administrador', permissions: ['pos', 'inventory', 'products', 'stats', 'insights', 'sales-history', 'settings'] },
    { id: 'seller', name: 'Vendedor', permissions: ['pos', 'sales-history'] }
  ]);
  const [users, setUsers] = useState<User[]>([
    { id: '1', username: 'admin', roleId: 'admin' }
  ]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>({
    enabled: false,
    lastSaved: null
  });
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  useEffect(() => {
    const savedProducts = localStorage.getItem('gourmet_products');
    const savedCategories = localStorage.getItem('gourmet_categories');
    const savedSales = localStorage.getItem('gourmet_sales');
    const savedMovements = localStorage.getItem('gourmet_movements');
    const savedClosures = localStorage.getItem('gourmet_closures');
    const savedActiveClosure = localStorage.getItem('gourmet_active_closure');
    const savedSettings = localStorage.getItem('gourmet_settings');
    const savedAutoSave = localStorage.getItem('gourmet_autosave_config');
    const savedRoles = localStorage.getItem('gourmet_roles');
    const savedUsers = localStorage.getItem('gourmet_users');

    if (savedProducts) setProducts(JSON.parse(savedProducts));
    if (savedCategories) setCategories(JSON.parse(savedCategories));
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedMovements) setMovements(JSON.parse(savedMovements));
    if (savedClosures) setClosures(JSON.parse(savedClosures));
    if (savedActiveClosure) setActiveClosure(JSON.parse(savedActiveClosure));
    if (savedSettings) setFinancialSettings(JSON.parse(savedSettings));
    if (savedAutoSave) setAutoSaveConfig(JSON.parse(savedAutoSave));
    if (savedRoles) setRoles(JSON.parse(savedRoles));
    if (savedUsers) setUsers(JSON.parse(savedUsers));
  }, []);

  // Sync LocalStorage
  useEffect(() => {
    localStorage.setItem('gourmet_products', JSON.stringify(products));
    localStorage.setItem('gourmet_categories', JSON.stringify(categories));
    localStorage.setItem('gourmet_sales', JSON.stringify(sales));
    localStorage.setItem('gourmet_movements', JSON.stringify(movements));
    localStorage.setItem('gourmet_closures', JSON.stringify(closures));
    localStorage.setItem('gourmet_active_closure', JSON.stringify(activeClosure));
    localStorage.setItem('gourmet_settings', JSON.stringify(financialSettings));
    localStorage.setItem('gourmet_autosave_config', JSON.stringify(autoSaveConfig));
    localStorage.setItem('gourmet_roles', JSON.stringify(roles));
    localStorage.setItem('gourmet_users', JSON.stringify(users));
  }, [products, categories, sales, movements, closures, activeClosure, financialSettings, autoSaveConfig, roles, users]);

  const addMovement = useCallback((productId: string, quantity: number, type: 'in' | 'out', reason: string) => {
    const newMovement: InventoryMovement = {
      id: Math.random().toString(36).substr(2, 9),
      productId, quantity, type, reason, date: Date.now()
    };
    setMovements(prev => [newMovement, ...prev]);
    // Asegurar que el stock del producto principal también se mantenga entero al aplicar movimientos
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.round(type === 'in' ? p.stock + quantity : p.stock - quantity) } : p));
  }, []);

  const openDay = (initialCash: number) => {
    const productSnapshots: Record<string, ProductClosureSnapshot> = {};
    products.forEach(p => {
      // Stock inicial como entero
      productSnapshots[p.id] = {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        initialStock: Math.round(p.stock),
        soldQuantity: 0
      };
    });

    const newClosure: DayClosure = {
      id: `closure-${Date.now()}`,
      startTime: Date.now(),
      endTime: null,
      initialCash,
      totalCashSales: 0,
      totalTransferSales: 0,
      finalCashReal: null,
      status: 'open',
      productSnapshots
    };
    setActiveClosure(newClosure);
  };

  const closeDay = (finalCashReal: number, notes?: string) => {
    if (!activeClosure) return;
    const closedClosure: DayClosure = {
      ...activeClosure,
      endTime: Date.now(),
      finalCashReal,
      notes,
      status: 'closed'
    };
    setClosures(prev => [closedClosure, ...prev]);
    setActiveClosure(null);
  };

  const completeSale = useCallback((sale: Sale) => {
    const saleWithSession = { ...sale, closureId: activeClosure?.id };
    setSales(prev => [saleWithSession, ...prev]);
    
    if (activeClosure) {
      setActiveClosure(prev => {
        if (!prev) return prev;
        const newSnapshots = { ...prev.productSnapshots };
        sale.items.forEach(item => {
          if (newSnapshots[item.productId]) {
            newSnapshots[item.productId].soldQuantity += item.quantity;
          } else {
            const product = products.find(p => p.id === item.productId);
            newSnapshots[item.productId] = {
              productId: item.productId,
              name: item.name,
              unit: item.unit,
              initialStock: product ? Math.round(product.stock) : 0,
              soldQuantity: item.quantity
            };
          }
        });

        return {
          ...prev,
          totalCashSales: sale.paymentMethod === 'cash' ? prev.totalCashSales + sale.total : prev.totalCashSales,
          totalTransferSales: sale.paymentMethod === 'transfer' ? prev.totalTransferSales + sale.total : prev.totalTransferSales,
          productSnapshots: newSnapshots
        };
      });
    }

    sale.items.forEach(item => addMovement(item.productId, item.quantity, 'out', `Venta #${sale.id.slice(-4)}`));
  }, [addMovement, activeClosure, products]);

  const deleteSale = useCallback((saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;
    if (window.confirm("¿Está seguro de eliminar esta venta? El stock será devuelto al inventario.")) {
      saleToDelete.items.forEach(item => addMovement(item.productId, item.quantity, 'in', `Anulación venta #${saleId.slice(-4)}`));
      
      if (activeClosure && saleToDelete.closureId === activeClosure.id) {
        setActiveClosure(prev => {
          if (!prev) return prev;
          const newSnapshots = { ...prev.productSnapshots };
          saleToDelete.items.forEach(item => {
            if (newSnapshots[item.productId]) {
              newSnapshots[item.productId].soldQuantity -= item.quantity;
            }
          });
          return {
            ...prev,
            totalCashSales: saleToDelete.paymentMethod === 'cash' ? prev.totalCashSales - saleToDelete.total : prev.totalCashSales,
            totalTransferSales: saleToDelete.paymentMethod === 'transfer' ? prev.totalTransferSales - saleToDelete.total : prev.totalTransferSales,
            productSnapshots: newSnapshots
          };
        });
      }

      setSales(prev => prev.filter(s => s.id !== saleId));
    }
  }, [sales, addMovement, activeClosure]);

  const handleImport = (data: any) => {
    if (data.products) setProducts(data.products.map((p: Product) => ({ ...p, stock: Math.round(p.stock) })));
    if (data.categories) setCategories(data.categories);
    if (data.sales) setSales(data.sales);
    if (data.movements) setMovements(data.movements);
    if (data.closures) setClosures(data.closures);
    if (data.financialSettings) setFinancialSettings(data.financialSettings);
    alert("Datos restaurados correctamente.");
  };

  const navItems = [
    { id: 'pos', icon: ShoppingCart, label: 'Punto de Venta' },
    { id: 'sales-history', icon: ReceiptText, label: 'Historial' },
    { id: 'products', icon: Tag, label: 'Productos' },
    { id: 'inventory', icon: Package, label: 'Inventario' },
    { id: 'stats', icon: BarChart3, label: 'Estadísticas' },
    { id: 'insights', icon: TrendingUp, label: 'Inteligencia' },
    { id: 'settings', icon: SettingsIcon, label: 'Configuración' },
  ];

  const currentRole = roles.find(r => r.id === currentUser?.roleId);
  const filteredNavItems = navItems.filter(item => currentRole?.permissions.includes(item.id as Permission));

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-emerald-600 tracking-tighter mb-2">{financialSettings.businessName}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Acceso al Sistema</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-500 mb-2">Seleccione Usuario</p>
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => {
                  setCurrentUser(u);
                  const firstPerm = roles.find(r => r.id === u.roleId)?.permissions[0];
                  if (firstPerm) setActiveTab(firstPerm);
                }}
                className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-emerald-50 rounded-2xl border-2 border-transparent hover:border-emerald-200 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors">
                    <UserCircle size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-slate-800 uppercase tracking-tight">{u.username}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{roles.find(r => r.id === u.roleId)?.name}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <div className="md:hidden bg-white border-b p-4 flex justify-between items-center sticky top-0 z-50">
        <h1 className="text-xl font-bold text-emerald-600 truncate mr-4">{financialSettings.businessName}</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 h-full flex flex-col">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-emerald-600 hidden md:block mb-1 tracking-tighter truncate">{financialSettings.businessName}</h1>
            <div className="flex items-center gap-2 px-1">
              <div className={`w-2 h-2 rounded-full ${activeClosure ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeClosure ? 'Caja Abierta' : 'Caja Cerrada'}</span>
            </div>
          </div>
          
          <nav className="space-y-2 flex-1">
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as Permission);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-emerald-50 text-emerald-700 font-semibold shadow-sm' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="mt-auto pt-4 space-y-4">
            <div className="pt-4 border-t bg-slate-50/50 -mx-6 px-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-100">
                    <UserCircle size={18} />
                  </div>
                  <span className="text-xs font-black text-slate-700 uppercase">{currentUser.username}</span>
                </div>
                <button onClick={() => setCurrentUser(null)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen relative no-scrollbar">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'pos' && (
            <POS 
              products={products} 
              categories={categories} 
              onCompleteSale={completeSale} 
              activeClosure={activeClosure}
              onOpenDay={openDay}
              onCloseDay={closeDay}
            />
          )}
          {activeTab === 'sales-history' && (
            <SalesHistory 
              sales={sales} 
              products={products} 
              closures={closures}
              onDeleteSale={deleteSale} 
              dateRange={dateRange} 
              setDateRange={setDateRange} 
            />
          )}
          {activeTab === 'products' && <Products products={products} categories={categories} setProducts={setProducts} setCategories={setCategories} addMovement={addMovement} />}
          {activeTab === 'inventory' && <Inventory movements={movements} products={products} addMovement={addMovement} />}
          {activeTab === 'stats' && <Statistics sales={sales} products={products} categories={categories} closures={closures} settings={financialSettings} setSettings={setFinancialSettings} dateRange={dateRange} setDateRange={setDateRange} />}
          {activeTab === 'insights' && <Insights sales={sales} products={products} categories={categories} />}
          {activeTab === 'settings' && (
            <Settings 
              products={products} categories={categories} sales={sales} movements={movements} financialSettings={financialSettings} setSettings={setFinancialSettings}
              onImport={handleImport} onFactoryReset={() => { localStorage.clear(); window.location.reload(); }} autoSaveConfig={autoSaveConfig} setAutoSaveConfig={setAutoSaveConfig}
              directoryHandle={directoryHandle} setDirectoryHandle={setDirectoryHandle} isSaving={isSaving}
              roles={roles} setRoles={setRoles} users={users} setUsers={setUsers}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
