
import * as React from 'react';
import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area } from 'recharts';
import { Download, Wallet, Users, AlertCircle, TrendingUp, Package, X, Search, ChevronRight, Calendar, Banknote, CreditCard, Box, History, DollarSign, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// Added ProductClosureSnapshot to imports
import { Sale, Product, Category, FinancialSettings, DayClosure, ProductClosureSnapshot } from '../types';

interface StatsProps {
  sales: Sale[];
  products: Product[];
  categories: Category[];
  closures: DayClosure[];
  settings: FinancialSettings;
  setSettings: React.Dispatch<React.SetStateAction<FinancialSettings>>;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

const Statistics: React.FC<StatsProps> = ({ sales, products, categories, closures, settings, setSettings, dateRange, setDateRange }) => {
  const [productVolumeSearch, setProductVolumeSearch] = useState('');
  
  // Filtered Sales based on period
  const filteredSales = useMemo(() => {
    const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
    return sales.filter(s => s.date >= start && s.date <= end);
  }, [sales, dateRange]);

  const filteredClosures = useMemo(() => {
    const start = new Date(dateRange.start).setHours(0, 0, 0, 0);
    const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
    return closures.filter(c => c.startTime >= start && c.startTime <= end);
  }, [closures, dateRange]);

  // Daily Trend Data for Charts
  const trendData = useMemo(() => {
    const daily: Record<string, number> = {};
    filteredSales.forEach(s => {
      const d = new Date(s.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      daily[d] = (daily[d] || 0) + s.total;
    });
    return Object.entries(daily).map(([name, total]) => ({ name, total }));
  }, [filteredSales]);

  // Current Day Stats (Today specifically)
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayStart = new Date(todayStr).setHours(0,0,0,0);
    const todayEnd = new Date(todayStr).setHours(23,59,59,999);
    const todaySales = sales.filter(s => s.date >= todayStart && s.date <= todayEnd);
    const total = todaySales.reduce((acc, s) => acc + s.total, 0);
    const count = todaySales.length;
    return { total, count };
  }, [sales]);

  // Total Revenue for the selected range
  const totalRevenue = useMemo(() => filteredSales.reduce((acc, s) => acc + s.total, 0), [filteredSales]);
  
  // Percentages Calculation
  const recoveryRate = 0.40;
  const reinvestmentRate = 0.20;
  const profitRate = 0.38;
  const salaryRate = settings.workerSalaryRate / 100;

  const recoveryAmount = totalRevenue * recoveryRate;
  const reinvestmentAmount = totalRevenue * reinvestmentRate;
  const profitAmount = totalRevenue * profitRate;
  const salaryAmount = totalRevenue * salaryRate;

  // Product volume for list
  const productVolumeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        stats[item.productId] = (stats[item.productId] || 0) + item.quantity;
      });
    });

    return Object.entries(stats)
      .map(([id, units]) => {
        const product = products.find(p => p.id === id);
        return {
          id,
          name: product?.name || 'Desconocido',
          code: product?.code || '---',
          units,
          salePrice: product?.salePrice || 0
        };
      })
      .filter(p => p.name.toLowerCase().includes(productVolumeSearch.toLowerCase()))
      .sort((a, b) => b.units - a.units);
  }, [filteredSales, products, productVolumeSearch]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); 
    doc.text(`Reporte Financiero: ${settings.businessName}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Periodo: ${dateRange.start} al ${dateRange.end}`, 14, 28);

    const dataRows = [
      ["Concepto", "Monto"],
      ["Ventas Totales", `$${totalRevenue.toLocaleString()}`],
      ["Recuperación Inv. (40%)", `$${recoveryAmount.toLocaleString()}`],
      ["Reinversión (20%)", `$${reinvestmentAmount.toLocaleString()}`],
      ["Ganancia Proyectada (38%)", `$${profitAmount.toLocaleString()}`],
      ["Salarios Trabajador", `$${salaryAmount.toLocaleString()}`],
    ];

    autoTable(doc, {
      startY: 40,
      head: [dataRows[0]],
      body: dataRows.slice(1),
      theme: 'striped',
      headStyles: { fillColor: [16, 185, 129] }
    });

    // Add Inventory Reconciliation if closures are present
    if (filteredClosures.length > 0) {
      doc.addPage();
      doc.setFontSize(18);
      doc.setTextColor(16, 185, 129);
      doc.text("Reconciliación de Inventario por Turnos", 14, 20);
      
      let lastY = 30;
      filteredClosures.forEach((closure, idx) => {
        if (lastY > 240) {
          doc.addPage();
          lastY = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(50);
        const dateStr = new Date(closure.startTime).toLocaleDateString();
        doc.text(`Turno: ${dateStr} - Caja: $${closure.initialCash.toLocaleString()}`, 14, lastY);
        
        // Cast Object.values to ProductClosureSnapshot[] to fix 'unknown' type errors
        const inventoryBody = (Object.values(closure.productSnapshots) as ProductClosureSnapshot[])
          .filter(s => s.soldQuantity > 0 || s.initialStock > 0)
          .map(s => [
            s.name,
            `${s.initialStock.toFixed(2)} ${s.unit}`,
            `${s.soldQuantity.toFixed(2)} ${s.unit}`,
            `${(s.initialStock - s.soldQuantity).toFixed(2)} ${s.unit}`
          ]);

        autoTable(doc, {
          startY: lastY + 5,
          head: [["Producto", "Stock Inicial", "Vendido", "Stock Final"]],
          body: inventoryBody,
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85] },
          margin: { left: 14, right: 14 }
        });
        
        lastY = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    doc.save(`Finanzas_${dateRange.start}.pdf`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Date Range */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Centro Analítico</h2>
          <p className="text-slate-500 font-medium">Visualización de rendimiento diario y por periodos</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
            <Calendar size={18} className="text-slate-400 ml-2" />
            <input 
              type="date" 
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-300">|</span>
            <input 
              type="date" 
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <button 
            onClick={exportPDF}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-4 rounded-2xl hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 whitespace-nowrap w-full sm:w-auto justify-center"
          >
            <Download size={18} />
            Exportar Informe
          </button>
        </div>
      </div>

      {/* Main Grid: Today vs Period */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Today Summary (Small Left Col) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                   <Activity size={20} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Rendimiento Hoy</span>
              </div>
              <h4 className="text-5xl font-black mb-1">${todayStats.total.toLocaleString()}</h4>
              <p className="text-emerald-100 text-xs font-bold">{todayStats.count} ventas realizadas desde la apertura</p>
              
              <div className="mt-8 pt-8 border-t border-white/10 flex gap-4">
                 <div className="flex-1">
                   <p className="text-[9px] font-black uppercase opacity-60">Meta Diaria</p>
                   <p className="font-bold text-lg">$5,000</p>
                 </div>
                 <div className="flex-1">
                   <p className="text-[9px] font-black uppercase opacity-60">Progreso</p>
                   <p className="font-bold text-lg">{Math.min(100, (todayStats.total / 5000) * 100).toFixed(0)}%</p>
                 </div>
              </div>
            </div>
            <div className="absolute -right-8 -top-8 bg-white/5 w-40 h-40 rounded-full group-hover:scale-110 transition-transform"></div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-500" />
              Proyecciones del Periodo
            </h5>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Recuperación (40%)</span>
                <span className="font-black text-slate-800">${recoveryAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Reinversión (20%)</span>
                <span className="font-black text-slate-800">${reinvestmentAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <span className="text-xs font-black text-blue-600 uppercase">Ganancia (38%)</span>
                <span className="font-black text-blue-700 text-lg">${profitAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Period Trend (Large Right Col) */}
        <div className="lg:col-span-8 bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-10">
            <div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">Tendencia Diaria</h3>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Ingresos acumulados por cada día seleccionado</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total del Periodo</p>
              <h4 className="text-2xl font-black text-slate-800">${totalRevenue.toLocaleString()}</h4>
            </div>
          </div>

          <div className="h-[350px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '1rem' }}
                    labelStyle={{ fontWeight: 'black', marginBottom: '0.5rem', color: '#1e293b' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-sm">No hay datos suficientes para graficar este periodo</div>
            )}
          </div>
        </div>
      </div>

      {/* Ranking and Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Package className="text-emerald-500" />
              Rendimiento por Producto
            </h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Unidades vendidas y valor recaudado en el periodo</p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filtrar por nombre..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm"
              value={productVolumeSearch}
              onChange={e => setProductVolumeSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                <th className="py-6 pl-10">Producto</th>
                <th className="py-6">SKU</th>
                <th className="py-6 text-center">Unid. Vendidas</th>
                <th className="py-6 text-right pr-10">Recaudado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {productVolumeStats.map(p => (
                <tr key={p.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-5_pl-10"><span className="font-black text-slate-700">{p.name}</span></td>
                  <td className="py-5 font-mono text-xs text-slate-400">{p.code}</td>
                  <td className="py-5 text-center">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-black">
                      {p.units}
                    </span>
                  </td>
                  <td className="py-5 text-right pr-10 font-black text-slate-900">
                    ${(p.units * p.salePrice).toLocaleString()}
                  </td>
                </tr>
              ))}
              {productVolumeStats.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-300 italic text-sm">No se encontraron registros en este periodo</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
