
import React, { useState, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Camera, X, Check, FolderPlus, RefreshCcw, Calendar, Scale } from 'lucide-react';
import { Product, Category, ProductUnit } from '../types';
import { firebaseService } from '../services/firebaseService';

interface ProductsProps {
  products: Product[];
  categories: Category[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  addMovement: (productId: string, quantity: number, type: 'in' | 'out', reason: string) => void;
}

const Products: React.FC<ProductsProps> = ({ products, categories, setProducts, setCategories, addMovement }) => {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState<{
    name: string;
    categoryId: string;
    code: string;
    image: string;
    costPrice: number;
    salePrice: number;
    stock: number;
    unit: ProductUnit;
    expiryDate: string;
  }>({
    name: '',
    categoryId: '',
    code: '',
    image: '',
    costPrice: 0,
    salePrice: 0,
    stock: 0,
    unit: 'unit',
    expiryDate: ''
  });

  const generateSKU = () => {
    return 'GP-' + Math.random().toString(36).substr(2, 7).toUpperCase();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Acceso a cámara denegado o no disponible");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setFormData(prev => ({ ...prev, image: canvas.toDataURL('image/jpeg') }));
        stopCamera();
      }
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCategoryName
    };
    await firebaseService.saveCategory(newCat);
    setFormData(prev => ({ ...prev, categoryId: newCat.id }));
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) return alert("Selecciona una categoría");

    const dataToSave = {
      ...formData,
      stock: Math.round(formData.stock) // Asegurar stock entero al guardar
    };

    if (editingId) {
      await firebaseService.saveProduct({ ...dataToSave, id: editingId } as Product);
    } else {
      const newProduct: Product = {
        ...dataToSave,
        id: Math.random().toString(36).substr(2, 9),
      } as Product;
      await firebaseService.saveProduct(newProduct);
      if (newProduct.stock > 0) {
        addMovement(newProduct.id, newProduct.stock, 'in', 'Carga inicial');
      }
    }
    closeModal();
  };

  const openNewProductModal = () => {
    setEditingId(null);
    setFormData({ 
      name: '', 
      categoryId: '', 
      code: generateSKU(), 
      image: '', 
      costPrice: 0, 
      salePrice: 0, 
      stock: 0,
      unit: 'unit',
      expiryDate: ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    stopCamera();
    setShowModal(false);
    setEditingId(null);
    setIsAddingCategory(false);
    setNewCategoryName('');
    setFormData({ name: '', categoryId: '', code: '', image: '', costPrice: 0, salePrice: 0, stock: 0, unit: 'unit', expiryDate: '' });
  };

  const openEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      ...product,
      expiryDate: product.expiryDate || ''
    });
    setShowModal(true);
  };

  const getExpiryStatus = (date?: string) => {
    if (!date) return null;
    const expiry = new Date(date).getTime();
    const today = new Date().getTime();
    const diff = expiry - today;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return { label: 'Vencido', color: 'bg-red-50 text-red-600' };
    if (days <= 7) return { label: `Vence en ${days}d`, color: 'bg-amber-50 text-amber-600' };
    return { label: `Vence ${date}`, color: 'bg-slate-50 text-slate-500' };
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code.includes(searchTerm));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Catálogo de Alimentos</h2>
          <p className="text-slate-500 font-medium">Gestión de productos, unidades y fechas de vencimiento</p>
        </div>
        <button 
          onClick={openNewProductModal}
          className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 transition-all font-bold shadow-xl shadow-emerald-100"
        >
          <Plus size={24} />
          Nuevo Producto
        </button>
      </div>

      <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100">
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, código o SKU..." 
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 transition-all font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="pb-4 pl-6">Producto</th>
                <th className="pb-4">SKU / Venc.</th>
                <th className="pb-4">Categoría</th>
                <th className="pb-4 text-right">Venta</th>
                <th className="pb-4 text-center">Stock</th>
                <th className="pb-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => {
                const expiry = getExpiryStatus(p.expiryDate);
                const roundedStock = Math.round(p.stock);
                return (
                  <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                          {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-300"><Camera size={20}/></div>}
                        </div>
                        <div>
                          <p className="font-black text-slate-700">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Unidad: {p.unit}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="text-slate-400 font-mono text-xs mb-1">{p.code}</p>
                      {expiry && (
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${expiry.color}`}>
                          {expiry.label}
                        </span>
                      )}
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase">
                        {categories.find(c => c.id === p.categoryId)?.name || 'Sin Cat.'}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-slate-800">${p.salePrice.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <span className={`inline-flex items-center justify-center min-w-[32px] px-2 py-1 rounded-lg font-black text-xs ${roundedStock <= 5 ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'}`}>
                        {roundedStock} {p.unit !== 'unit' ? p.unit : ''}
                      </span>
                    </td>
                    <td className="py-4 pr-6 text-right space-x-1">
                      <button onClick={() => openEdit(p)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                      <button onClick={async () => {
                        if (window.confirm("¿Eliminar producto?")) {
                          await firebaseService.deleteProduct(p.id);
                        }
                      }} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-2xl font-black text-slate-800">{editingId ? 'Editar Alimento' : 'Nuevo Alimento'}</h3>
              <button onClick={closeModal} className="p-3 hover:bg-white rounded-2xl transition-all"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 font-bold"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad de Medida</label>
                  <select 
                    required
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold"
                    value={formData.unit}
                    onChange={e => setFormData(prev => ({ ...prev, unit: e.target.value as ProductUnit }))}
                  >
                    <option value="unit">Unidad / Pack</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="g">Gramo (g)</option>
                    <option value="lb">Libra (lb)</option>
                    <option value="l">Litro (L)</option>
                    <option value="ml">Mililitro (ml)</option>
                  </select>
                </div>

                <div className="md:col-span-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vencimiento</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    <input 
                      type="date" 
                      className="w-full pl-12 pr-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 font-bold"
                      value={formData.expiryDate}
                      onChange={e => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                  {!isAddingCategory ? (
                    <div className="flex gap-2">
                      <select 
                        required
                        className="flex-1 px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 outline-none font-bold"
                        value={formData.categoryId}
                        onChange={e => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                      >
                        <option value="">Seleccionar...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(true)}
                        className="p-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all"
                        title="Nueva Categoría"
                      >
                        <FolderPlus size={24} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 animate-in slide-in-from-right-2 duration-200">
                      <input 
                        type="text"
                        placeholder="Nombre de la nueva categoría..."
                        className="flex-1 px-5 py-4 bg-emerald-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-200 font-bold"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        autoFocus
                      />
                      <button 
                        type="button"
                        onClick={handleCreateCategory}
                        className="p-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all"
                      >
                        <Check size={24} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => setIsAddingCategory(false)}
                        className="p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                      >
                        <X size={24} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código / SKU</label>
                  <div className="relative">
                    <input 
                      readOnly
                      type="text" 
                      className="w-full px-5 py-4 bg-slate-100 border-none rounded-2xl focus:ring-0 font-mono font-bold text-slate-500 cursor-not-allowed"
                      value={formData.code}
                    />
                    {!editingId && (
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, code: generateSKU() }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-xl transition-all text-slate-400"
                        title="Regenerar SKU"
                      >
                        <RefreshCcw size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Foto del Producto</label>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-32 h-32 rounded-3xl bg-slate-50 border-4 border-white shadow-inner overflow-hidden flex items-center justify-center relative group">
                      {formData.image ? (
                        <>
                          <img src={formData.image} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setFormData(prev => ({...prev, image: ''}))} className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><Trash2 size={24}/></button>
                        </>
                      ) : (
                        <Camera className="text-slate-200" size={32} />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      {!isCameraActive ? (
                        <div className="flex gap-4">
                          <button 
                            type="button" 
                            onClick={startCamera}
                            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-4 py-3 rounded-2xl transition-all text-[10px] tracking-widest uppercase"
                          >
                            Usar Cámara
                          </button>
                          <label className="flex-1 cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-4 py-3 rounded-2xl transition-all text-[10px] tracking-widest uppercase text-center flex items-center justify-center">
                            Cargar Archivo
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          </label>
                        </div>
                      ) : (
                        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button type="button" onClick={capturePhoto} className="bg-emerald-500 text-white p-3 rounded-full shadow-xl"><Check size={24}/></button>
                            <button type="button" onClick={stopCamera} className="bg-red-50 text-white p-3 rounded-full shadow-xl"><X size={24}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Costo</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 font-bold"
                    value={formData.costPrice}
                    onChange={e => setFormData(prev => ({ ...prev, costPrice: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Venta</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full px-5 py-4 bg-emerald-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-200 font-black text-emerald-600"
                    value={formData.salePrice}
                    onChange={e => setFormData(prev => ({ ...prev, salePrice: Number(e.target.value) }))}
                  />
                </div>
              </div>
              
              {!editingId && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock Inicial ({formData.unit}) - Entero</label>
                  <input 
                    required 
                    type="number" 
                    step="1" // Forzar números enteros en el input
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-100 font-bold"
                    value={formData.stock}
                    onChange={e => setFormData(prev => ({ ...prev, stock: Math.round(Number(e.target.value)) }))}
                  />
                </div>
              )}
              
              <div className="flex gap-4 pt-6 border-t border-slate-50">
                <button type="button" onClick={closeModal} className="flex-1 px-8 py-5 bg-slate-100 text-slate-500 font-black rounded-3xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs">Cancelar</button>
                <button type="submit" className="flex-[2] px-8 py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 transition-all uppercase tracking-widest text-xs">
                  {editingId ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
