
import * as React from 'react';
import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Package, Plus, Filter } from 'lucide-react';
import { InventoryMovement, Product } from '../types';

interface InventoryProps {
  movements: InventoryMovement[];
  products: Product[];
  addMovement: (productId: string, quantity: number, type: 'in' | 'out', reason: string) => void;
}

const Inventory: React.FC<InventoryProps> = ({ movements, products, addMovement }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 1,
    type: 'in' as 'in' | 'out',
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productId || !formData.reason) return alert("Completa todos los campos");
    
    if (formData.type === 'out') {
      const p = products.find(prod => prod.id === formData.productId);
      if (p && p.stock < formData.quantity) {
        alert("Stock insuficiente para realizar esta salida");
        return;
      }
    }

    addMovement(formData.productId, formData.quantity, formData.type, formData.reason);
    setShowModal(false);
    setFormData({ productId: '', quantity: 1, type: 'in', reason: '' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Movimientos de Inventario</h2>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-slate-700 transition-all font-bold"
        >
          <Plus size={20} />
          Ajustar Inventario
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr className="text-slate-500 text-sm font-semibold">
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Producto</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-center">Cantidad</th>
              <th className="px-6 py-4">Motivo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {movements.map(m => {
              const p = products.find(prod => prod.id === m.productId);
              return (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(m.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-slate-700">{p?.name || 'Producto Eliminado'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${m.type === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {m.type === 'in' ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                      {m.type === 'in' ? 'Entrada' : 'Salida'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold">
                    {m.quantity}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">
                    {m.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl animate-in zoom-in duration-200">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="text-xl font-bold">Ajuste de Inventario</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Producto</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={formData.productId}
                  onChange={e => setFormData(prev => ({ ...prev, productId: e.target.value }))}
                >
                  <option value="">Seleccionar...</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Tipo</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as 'in' | 'out' }))}
                  >
                    <option value="in">Entrada</option>
                    <option value="out">Salida</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-600 mb-2">Cantidad</label>
                  <input 
                    type="number" 
                    min="1"
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                    value={formData.quantity}
                    onChange={e => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-2">Motivo</label>
                <input 
                  type="text" 
                  placeholder="Ej: Compra a proveedor, Mermas..."
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500"
                  value={formData.reason}
                  onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                />
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 text-white font-bold rounded-2xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
                Registrar Movimiento
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
