
import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Package, BarChart3, Menu, X, Tag, TrendingUp, ReceiptText, Settings as SettingsIcon, LogOut, UserCircle } from 'lucide-react';
import { Product, Category, Sale, InventoryMovement, FinancialSettings, AutoSaveConfig, Role, User, Permission, DayClosure, ProductClosureSnapshot } from './types';
import { storageService } from './services/storageService';
import { firebaseService } from './services/firebaseService';
import { auth } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => storageService.loadSessionUser());
  const [fbUser, setFbUser] = useState<any>(null);

  const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>({
    enabled: false,
    lastSaved: null
  });
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load Data from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      if (user) {
        // Check if user exists in Firestore, otherwise create it
        const existingUser = await firebaseService.getUser(user.uid);
        if (existingUser) {
          setCurrentUser(existingUser);
        } else {
          const newUser: User = {
            id: user.uid,
            username: user.displayName || user.email?.split('@')[0] || 'Usuario',
            roleId: 'admin', // Default to admin for the first user or based on email
            email: user.email || undefined
          };
          await firebaseService.saveUser(newUser);
          setCurrentUser(newUser);
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!fbUser) return;

    const unsubProducts = firebaseService.subscribeProducts(setProducts);
    const unsubCategories = firebaseService.subscribeCategories(setCategories);
    const unsubSales = firebaseService.subscribeSales(setSales);
    const unsubMovements = firebaseService.subscribeMovements(setMovements);
    const unsubClosures = firebaseService.subscribeClosures(setClosures);
    const unsubActiveClosure = firebaseService.subscribeActiveClosure(setActiveClosure);
    const unsubRoles = firebaseService.subscribeRoles(setRoles);
    const unsubUsers = firebaseService.subscribeUsers(setUsers);
    const unsubSettings = firebaseService.subscribeSettings(setFinancialSettings);

    return () => {
      unsubProducts();
      unsubCategories();
      unsubSales();
      unsubMovements();
      unsubClosures();
      unsubActiveClosure();
      unsubRoles();
      unsubUsers();
      unsubSettings();
    };
  }, [fbUser]);

  // Sync LocalStorage (as backup)
  useEffect(() => {
    storageService.saveProducts(products);
    storageService.saveCategories(categories);
    storageService.saveSales(sales);
    storageService.saveMovements(movements);
    storageService.saveClosures(closures);
    storageService.saveActiveClosure(activeClosure);
    storageService.saveSettings(financialSettings);
    storageService.saveAutoSaveConfig(autoSaveConfig);
    storageService.saveRoles(roles);
    storageService.saveUsers(users);
  }, [products, categories, sales, movements, closures, activeClosure, financialSettings, autoSaveConfig, roles, users]);

  const addMovement = useCallback(async (productId: string, quantity: number, type: 'in' | 'out', reason: string) => {
    const newMovement: InventoryMovement = {
      id: Math.random().toString(36).substr(2, 9),
      productId, quantity, type, reason, date: Date.now()
    };
    
    if (fbUser) {
      await firebaseService.addMovement(newMovement);
      // Update product stock in Firestore
      const product = products.find(p => p.id === productId);
      if (product) {
        await firebaseService.saveProduct({
          ...product,
          stock: Math.round(type === 'in' ? product.stock + quantity : product.stock - quantity)
        });
      }
    } else {
      setMovements(prev => [newMovement, ...prev]);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.round(type === 'in' ? p.stock + quantity : p.stock - quantity) } : p));
    }
  }, [fbUser, products]);

  const openDay = async (initialCash: number) => {
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
    
    if (fbUser) {
      await firebaseService.saveActiveClosure(newClosure);
    } else {
      setActiveClosure(newClosure);
    }
  };

  const closeDay = async (finalCashReal: number, notes?: string) => {
    if (!activeClosure) return;
    const closedClosure: DayClosure = {
      ...activeClosure,
      endTime: Date.now(),
      finalCashReal,
      notes,
      status: 'closed'
    };
    
    if (fbUser) {
      await firebaseService.saveClosure(closedClosure);
      await firebaseService.saveActiveClosure(null);
    } else {
      setClosures(prev => [closedClosure, ...prev]);
      setActiveClosure(null);
    }
  };

  const sendTelegramNotification = useCallback(async (sale: Sale) => {
    if (!financialSettings.telegramConfig?.enabled || !financialSettings.telegramConfig?.chatId) return;

    const itemsList = sale.items.map(item => `- ${item.name} x${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`).join('\n');
    const message = `💰 *Nueva Venta Registrada*\n\n` +
                    `🆔 ID: #${sale.id.slice(-6)}\n` +
                    `💵 Total: *$${sale.total.toFixed(2)}*\n` +
                    `💳 Pago: ${sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}\n\n` +
                    `📦 *Productos:*\n${itemsList}\n\n` +
                    `📅 Fecha: ${new Date(sale.date).toLocaleString()}`;

    try {
      await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: financialSettings.telegramConfig.chatId,
          botToken: financialSettings.telegramConfig.botToken,
          message
        })
      });
    } catch (error) {
      console.error("Error sending Telegram notification:", error);
    }
  }, [financialSettings.telegramConfig]);

  const completeSale = useCallback(async (sale: Sale) => {
    const saleWithSession = { ...sale, closureId: activeClosure?.id };
    
    if (fbUser) {
      await firebaseService.addSale(saleWithSession);
    } else {
      setSales(prev => [saleWithSession, ...prev]);
    }
    
    if (activeClosure) {
      const newSnapshots = { ...activeClosure.productSnapshots };
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

      const updatedClosure: DayClosure = {
        ...activeClosure,
        totalCashSales: sale.paymentMethod === 'cash' ? activeClosure.totalCashSales + sale.total : activeClosure.totalCashSales,
        totalTransferSales: sale.paymentMethod === 'transfer' ? activeClosure.totalTransferSales + sale.total : activeClosure.totalTransferSales,
        productSnapshots: newSnapshots
      };

      if (fbUser) {
        await firebaseService.saveActiveClosure(updatedClosure);
      } else {
        setActiveClosure(updatedClosure);
      }
    }

    sale.items.forEach(item => addMovement(item.productId, item.quantity, 'out', `Venta #${sale.id.slice(-4)}`));
    
    // Trigger Telegram Notification
    sendTelegramNotification(sale);
  }, [addMovement, activeClosure, products, sendTelegramNotification, fbUser]);

  const deleteSale = useCallback(async (saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;
    if (window.confirm("¿Está seguro de eliminar esta venta? El stock será devuelto al inventario.")) {
      saleToDelete.items.forEach(item => addMovement(item.productId, item.quantity, 'in', `Anulación venta #${saleId.slice(-4)}`));
      
      if (activeClosure && saleToDelete.closureId === activeClosure.id) {
        const newSnapshots = { ...activeClosure.productSnapshots };
        saleToDelete.items.forEach(item => {
          if (newSnapshots[item.productId]) {
            newSnapshots[item.productId].soldQuantity -= item.quantity;
          }
        });
        
        const updatedClosure: DayClosure = {
          ...activeClosure,
          totalCashSales: saleToDelete.paymentMethod === 'cash' ? activeClosure.totalCashSales - saleToDelete.total : activeClosure.totalCashSales,
          totalTransferSales: saleToDelete.paymentMethod === 'transfer' ? activeClosure.totalTransferSales - saleToDelete.total : activeClosure.totalTransferSales,
          productSnapshots: newSnapshots
        };

        if (fbUser) {
          await firebaseService.saveActiveClosure(updatedClosure);
        } else {
          setActiveClosure(updatedClosure);
        }
      }

      if (fbUser) {
        await firebaseService.deleteSale(saleId);
      } else {
        setSales(prev => prev.filter(s => s.id !== saleId));
      }
    }
  }, [sales, addMovement, activeClosure, fbUser]);

  const handleImport = async (data: any) => {
    if (data.products) setProducts(data.products.map((p: Product) => ({ ...p, stock: Math.round(p.stock) })));
    if (data.categories) setCategories(data.categories);
    if (data.sales) setSales(data.sales);
    if (data.movements) setMovements(data.movements);
    if (data.closures) setClosures(data.closures);
    if (data.roles) setRoles(data.roles);
    if (data.users) setUsers(data.users);
    if (data.financialSettings) setFinancialSettings(data.financialSettings);

    if (fbUser) {
      // Upload to Firebase
      try {
        if (data.products) await Promise.all(data.products.map((p: any) => firebaseService.saveProduct(p)));
        if (data.categories) await Promise.all(data.categories.map((c: any) => firebaseService.saveCategory(c)));
        if (data.sales) await Promise.all(data.sales.map((s: any) => firebaseService.addSale(s)));
        if (data.movements) await Promise.all(data.movements.map((m: any) => firebaseService.addMovement(m)));
        if (data.closures) await Promise.all(data.closures.map((cl: any) => firebaseService.saveClosure(cl)));
        if (data.roles) await Promise.all(data.roles.map((r: any) => firebaseService.saveRole(r)));
        if (data.users) await Promise.all(data.users.map((u: any) => firebaseService.saveUser(u)));
        if (data.financialSettings) await firebaseService.saveSettings(data.financialSettings);
      } catch (error) {
        console.error("Error uploading imported data to Firebase:", error);
      }
    }

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

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during Google Login:", error);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-500">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black text-emerald-600 tracking-tighter mb-2">{financialSettings.businessName}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Acceso al Sistema</p>
          </div>
          <div className="space-y-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 p-5 bg-white border-2 border-slate-100 rounded-2xl hover:bg-slate-50 hover:border-emerald-200 transition-all group shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              <span className="font-black text-slate-700 uppercase tracking-tight">Continuar con Google</span>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">O usar cuenta local</span></div>
            </div>

            <div className="space-y-3">
              {users.map(u => (
                <button
                  key={u.id}
                  onClick={() => {
                    setCurrentUser(u);
                    const firstPerm = roles.find(r => r.id === u.roleId)?.permissions[0];
                    if (firstPerm) setActiveTab(firstPerm);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-transparent hover:border-emerald-100 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-emerald-500 shadow-sm transition-colors">
                      <UserCircle size={20} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-800 uppercase tracking-tight text-sm">{u.username}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{roles.find(r => r.id === u.roleId)?.name}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
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
                <button onClick={async () => {
                  if (fbUser) await signOut(auth);
                  setCurrentUser(null);
                  storageService.clearSession();
                }} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
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
              products={products} categories={categories} sales={sales} movements={movements} financialSettings={financialSettings} setFinancialSettings={setFinancialSettings}
              onImport={handleImport} 
              onFactoryReset={async () => { 
                if (window.confirm("¿Estás seguro de que deseas restaurar de fábrica? Se perderán todos los datos locales.")) {
                  storageService.clearAll(); 
                  if (fbUser) {
                    alert("Los datos locales han sido borrados. Los datos en la nube permanecen intactos.");
                  }
                  window.location.reload(); 
                }
              }} 
              autoSaveConfig={autoSaveConfig} setAutoSaveConfig={setAutoSaveConfig}
              directoryHandle={directoryHandle} setDirectoryHandle={setDirectoryHandle} isSaving={isSaving}
              roles={roles} setRoles={setRoles} users={users} setUsers={setUsers}
              fbUser={fbUser}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
