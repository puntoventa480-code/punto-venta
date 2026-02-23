
import React, { useState } from 'react';
import { Plus, Trash2, Edit2, LayoutGrid } from 'lucide-react';
import { Category } from '../types';

interface CategoriesProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}

const Categories: React.FC<CategoriesProps> = ({ categories, setCategories }) => {
  const [newName, setNewName] = useState('');

  const addCategory = () => {
    if (!newName.trim()) return;
    const newCategory: Category = {
      id: Math.random().toString(36).substr(2, 9),
      name: newName
    };
    setCategories([...categories, newCategory]);
    setNewName('');
  };

  const removeCategory = (id: string) => {
    if (window.confirm("¿Eliminar categoría? Los productos de esta categoría quedarán sin ella.")) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-800">Categorías</h2>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex gap-4 mb-8">
          <input 
            type="text" 
            placeholder="Nombre de la nueva categoría..." 
            className="flex-1 px-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          />
          <button 
            onClick={addCategory}
            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-100"
          >
            <Plus size={20} />
            Agregar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(category => (
            <div key={category.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-emerald-200 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <LayoutGrid size={20} />
                </div>
                <span className="font-semibold text-slate-700">{category.name}</span>
              </div>
              <button 
                onClick={() => removeCategory(category.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="col-span-2 py-12 text-center text-slate-400">
              No hay categorías registradas. Comience agregando una arriba.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Categories;
