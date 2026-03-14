
import * as React from 'react';
import { useState, useMemo } from 'react';
import { Search, ShoppingCart, Trash2, CreditCard, Banknote, Plus, Minus, Calendar, Power, AlertCircle, X, CheckCircle2, ArrowRight, FileText } from 'lucide-react';
import { Product, Category, Sale, SaleItem, DayClosure } from '../types';

interface POSProps {
  products: Product[];
  categories: Category[];
  activeClosure: DayClosure | null;
  onCompleteSale: (sale: Sale) => void;
  onOpenDay: (initialCash: number) => void;
  onCloseDay: (finalCashReal: number, notes?: string) => void;
}

const POS: React.FC<POSProps> = ({ products, categories, activeClosure, onCompleteSale, onOpenDay, onCloseDay }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm);
      const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const addToCart = (product: Product) => {
    if (!activeClosure) {
      alert("Debes abrir la caja antes de vender.");
      return;
    }
    if (product.stock <= 0) {
      alert("Producto sin stock");
      return;
    }
    const existing = cart.find(item => item.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert("No hay más stock disponible");
        return;
      }
      setCart(cart.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { 
        productId: product.id, 
        name: product.name, 
        price: product.salePrice, 
        quantity: 1,
        unit: product.unit
      }]);
    }
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta;
        const product = products.find(p => p.id === productId);
        if (newQty <= 0) return null;
        if (product && newQty > product.stock) {
          alert("Excede el stock disponible");
          return item;
        }
        return { ...item, quantity: parseFloat(newQty.toFixed(2)) };
      }
      return item;
    }).filter(Boolean) as SaleItem[]);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const newSale: Sale = {
      id: Math.random().toString(36).substr(2, 9),
      items: [...cart],
      total: cartTotal,
      paymentMethod,
      date: Date.now(),
      closureId: activeClosure?.id
    };
    onCompleteSale(newSale);
    setLastSale(newSale);
    setShowSuccessModal(true);
    setCart([]);
  };

  const isNearExpiry = (date?: string) => {
    if (!date) return false;
    const expiry = new Date(date).getTime();
    const diff = expiry - new Date().getTime();
    return diff < (1000 * 60 * 60 * 24 * 7);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Turn Control Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-2xl ${activeClosure ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            <Power size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado del Turno</p>
            <p className="font-black text-slate-800 uppercase tracking-tight">
              {activeClosure ? `Abierto - Iniciado: ${new Date(activeClosure.startTime).toLocaleTimeString()}` : 'Caja Cerrada'}
            </p>
          </div>
        </div>
        {activeClosure ? (
          <button 
            onClick={() => setShowCloseModal(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-slate-800 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200"
          >
            Cerrar Turno del Día
          </button>
        ) : (
          <button 
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200"
          >
            Abrir Día de Ventas
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        {/* Product Selection */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar producto..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold outline-none"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Categorías</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-10">
            {filteredProducts.map(product => {
              const nearExpiry = isNearExpiry(product.expiryDate);
              const isOutOfStock = product.stock <= 0;
              return (
                <button
                  key={product.id}
                  disabled={isOutOfStock}
                  onClick={() => addToCart(product)}
                  className={`bg-white p-3 rounded-3xl shadow-sm border-2 transition-all text-left group flex flex-col h-fit ${isOutOfStock ? 'opacity-40 grayscale border-transparent' : 'border-transparent hover:border-emerald-400 hover:scale-[1.02]'} ${nearExpiry && !isOutOfStock ? 'border-amber-200' : ''}`}
                >
                  <div className="aspect-square rounded-2xl bg-slate-50 mb-3 overflow-hidden relative">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <ShoppingCart size={40} />
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black text-emerald-600 shadow-sm">
                      {Math.round(product.stock)} {product.unit}
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 line-clamp-2 text-sm leading-tight mb-2">{product.name}</h3>
                  <div className="flex justify-between items-center mt-auto">
                    <p className="text-emerald-600 font-black">${product.salePrice.toLocaleString()}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{product.unit}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="lg:col-span-4 bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col h-[calc(100vh-14rem)] sticky top-8">
          <div className="p-8 border-b">
            <h2 className="text-xl font-black flex items-center gap-3">
              <ShoppingCart className="text-emerald-600" size={24} />
              Venta Gourmet
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-3">
                <ShoppingCart size={64} />
                <p className="font-black uppercase tracking-[0.2em] text-xs">Esperando Pedido...</p>
              </div>
            ) : (
              cart.map(item => {
                const product = products.find(p => p.id === item.productId);
                const stockAfter = product ? Math.round(product.stock - item.quantity) : 0;
                return (
                  <div key={item.productId} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-black text-slate-800 text-sm line-clamp-1">{item.name}</h4>
                        <p className="text-emerald-600 font-bold text-xs">${(item.price * item.quantity).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-1.5">
                        <button onClick={() => updateCartQuantity(item.productId, -1)} className="p-1 hover:text-red-500 transition-colors">
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-black text-sm">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.productId, 1)} className="p-1 hover:text-emerald-600 transition-colors">
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Impacto en Inventario</span>
                      <span className="text-[9px] font-bold text-slate-500">Quedarán: <span className={stockAfter < 5 ? 'text-red-500 font-black' : 'text-emerald-600 font-black'}>{stockAfter} {item.unit}</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-8 bg-slate-50 rounded-b-[3rem] space-y-6 border-t border-slate-100">
            <div className="flex items-center justify-between font-black text-3xl text-slate-800">
              <span className="text-sm text-slate-400 uppercase tracking-widest">Total</span>
              <span>${cartTotal.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'cash' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-transparent text-slate-400'}`}
              >
                < Banknote size={24} />
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Efectivo</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all ${paymentMethod === 'transfer' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-transparent text-slate-400'}`}
              >
                <CreditCard size={24} />
                <span className="text-[10px] font-black mt-2 uppercase tracking-widest">Transferencia</span>
              </button>
            </div>

            <button 
              disabled={cart.length === 0 || !activeClosure}
              onClick={handleCheckout}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-100 transition-all active:scale-95 disabled:opacity-30 disabled:grayscale"
            >
              CONFIRMAR VENTA
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Success & Inventory Feedback */}
      {showSuccessModal && lastSale && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Venta Exitosa</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Resumen de Inventario Actualizado</p>
              
              <div className="bg-slate-50 rounded-[2rem] p-6 mb-8 text-left space-y-4">
                {lastSale.items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between items-center border-b border-slate-200/50 pb-3 last:border-0 last:pb-0">
                       <div>
                         <p className="font-black text-slate-800 text-sm">{item.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold">Deducido: -{item.quantity} {item.unit}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs font-black text-emerald-600">Stock Actual</p>
                         <p className="font-mono text-sm font-bold">{product ? Math.round(product.stock) : 0} {item.unit}</p>
                       </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => { setShowSuccessModal(false); setLastSale(null); }}
                className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest"
              >
                Continuar Vendiendo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Abrir Caja */}
      {showOpenModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 text-center">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                <Power size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">Apertura de Día</h3>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-8">Ingresa el fondo inicial de caja</p>
              
              <div className="space-y-4 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Monto en Efectivo</label>
                <input 
                  type="number" 
                  className="w-full px-8 py-5 bg-slate-50 border-none rounded-[2rem] focus:ring-4 focus:ring-emerald-100 font-black text-2xl text-center"
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  autoFocus
                />
                <button 
                  onClick={() => { onOpenDay(amount); setShowOpenModal(false); setAmount(0); }}
                  className="w-full bg-emerald-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-emerald-100 mt-4 uppercase tracking-widest"
                >
                  Iniciar Turno
                </button>
                <button onClick={() => setShowOpenModal(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cerrar Caja */}
      {showCloseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-10">
                 <h3 className="text-3xl font-black text-slate-800">Cierre de Caja</h3>
                 <button onClick={() => setShowCloseModal(false)} className="p-2 hover:bg-slate-50 rounded-full"><X/></button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-slate-50 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas Efectivo</p>
                  <p className="text-2xl font-black text-slate-800">${activeClosure?.totalCashSales.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2rem]">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas Transf.</p>
                  <p className="text-2xl font-black text-slate-800">${activeClosure?.totalTransferSales.toLocaleString()}</p>
                </div>
                <div className="col-span-2 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Efectivo Esperado (Fondo + Ventas)</p>
                  <p className="text-3xl font-black text-emerald-700">${((activeClosure?.initialCash || 0) + (activeClosure?.totalCashSales || 0)).toLocaleString()}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Efectivo Real en Caja</label>
                  <input 
                    type="number" 
                    placeholder="Monto contado..."
                    className="w-full px-8 py-5 bg-white border-2 border-slate-100 rounded-[2rem] focus:ring-4 focus:ring-emerald-100 font-black text-2xl text-center"
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Notas adicionales</label>
                  <textarea 
                    className="w-full px-8 py-4 bg-slate-50 border-none rounded-3xl focus:ring-4 focus:ring-emerald-100 font-bold text-sm h-24"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ejem: Diferencia por vueltos, gastos menores..."
                  />
                </div>
                
                <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3 text-blue-700 mb-2">
                  <FileText size={20} />
                  <p className="text-[10px] font-bold">Tras cerrar, podrás descargar el reporte PDF detallado con inventario en la pestaña "Historial".</p>
                </div>

                <button 
                  onClick={() => { onCloseDay(amount, notes); setShowCloseModal(false); setAmount(0); setNotes(''); }}
                  className="w-full bg-slate-900 text-white font-black py-5 rounded-[2rem] shadow-xl uppercase tracking-widest"
                >
                  Finalizar Turno y Guardar Historial
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POS;
