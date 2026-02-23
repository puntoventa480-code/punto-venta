
import React, { useState, useMemo } from 'react';
import { Calendar, Search, Banknote, CreditCard, ChevronDown, ReceiptText, Clock, ShoppingBag, Power, TrendingUp, AlertCircle, X, Package, Printer, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, Product, DayClosure, ProductClosureSnapshot } from '../types';

interface SalesHistoryProps {
  sales: Sale[];
  products: Product[];
  closures: DayClosure[];
  onDeleteSale: (id: string) => void;
  dateRange: { start: string; end: string };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: string; end: string }>>;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ sales, products, closures, onDeleteSale, dateRange, setDateRange }) => {
  const [activeView, setActiveView] = useState<'sales' | 'closures'>('sales');
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [expandedClosure, setExpandedClosure] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredSales = useMemo(() => {
    const start = new Date(dateRange.start).setHours(0,0,0,0);
    const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
    
    return sales.filter(s => {
      const matchesDate = s.date >= start && s.date <= end;
      const matchesSearch = s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           s.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesDate && matchesSearch;
    }).sort((a, b) => b.date - a.date);
  }, [sales, dateRange, searchTerm]);

  const filteredClosures = useMemo(() => {
    const start = new Date(dateRange.start).setHours(0,0,0,0);
    const end = new Date(dateRange.end).setHours(23, 59, 59, 999);
    return closures.filter(c => c.startTime >= start && c.startTime <= end)
                  .sort((a, b) => b.startTime - a.startTime);
  }, [closures, dateRange]);

  const todayStats = useMemo(() => {
    const start = new Date(todayStr).setHours(0,0,0,0);
    const end = new Date(todayStr).setHours(23,59,59,999);
    const todaySales = sales.filter(s => s.date >= start && s.date <= end);
    const total = todaySales.reduce((acc, s) => acc + s.total, 0);
    return { total, count: todaySales.length };
  }, [sales, todayStr]);

  const setToday = () => {
    setDateRange({ start: todayStr, end: todayStr });
  };

  const generateClosurePDF = (closure: DayClosure) => {
    const doc = new jsPDF();
    const businessName = localStorage.getItem('gourmet_settings') 
      ? JSON.parse(localStorage.getItem('gourmet_settings')!).businessName 
      : 'GourmetPOS';

    // Header
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(businessName, 14, 25);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('REPORTE DE CONTROL DE INVENTARIO Y CAJA', 14, 33);

    // Closure Info
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date(closure.startTime).toLocaleDateString()}`, 14, 50);
    doc.text(`Apertura: ${new Date(closure.startTime).toLocaleTimeString()}`, 14, 57);
    doc.text(`Cierre: ${closure.endTime ? new Date(closure.endTime).toLocaleTimeString() : 'En curso'}`, 14, 64);

    // Financial Summary Table
    const totalVentas = closure.totalCashSales + closure.totalTransferSales;
    const esperado = closure.initialCash + closure.totalCashSales;
    const diferencia = (closure.finalCashReal || 0) - esperado;

    autoTable(doc, {
      startY: 75,
      head: [['Concepto Financiero', 'Monto']],
      body: [
        ['Fondo Inicial (Caja)', `$${closure.initialCash.toLocaleString()}`],
        ['Ventas en Efectivo', `$${closure.totalCashSales.toLocaleString()}`],
        ['Ventas por Transferencia', `$${closure.totalTransferSales.toLocaleString()}`],
        ['Total Ventas del Turno', `$${totalVentas.toLocaleString()}`],
        ['Efectivo Esperado', `$${esperado.toLocaleString()}`],
        ['Efectivo Real Contado', `$${closure.finalCashReal?.toLocaleString() || '---'}`],
        ['Diferencia / Balance', { content: `$${diferencia.toLocaleString()}`, styles: { textColor: diferencia < 0 ? [220, 38, 38] : [16, 185, 129], fontStyle: 'bold' } }],
      ],
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85] },
      margin: { left: 14, right: 14 }
    });

    // Inventory Table
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Reconciliación de Inventario Alimentos', 14, (doc as any).lastAutoTable.finalY + 15);

    const inventoryBody = (Object.values(closure.productSnapshots) as ProductClosureSnapshot[])
      .filter(s => s.soldQuantity > 0 || s.initialStock > 0)
      .map(s => {
        const initial = Math.round(s.initialStock);
        const final = Math.round(s.initialStock - s.soldQuantity);
        return [
          s.name,
          `${initial} ${s.unit}`, // Stock inicial como entero
          `${s.soldQuantity.toFixed(2)} ${s.unit}`,
          `${final} ${s.unit}` // Stock final como entero
        ];
      });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Producto', 'Stock Inicial (Entero)', 'Cantidad Vendida', 'Stock Final (Entero)']],
      body: inventoryBody,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: {
        1: { fontStyle: 'bold', halign: 'center' },
        3: { fontStyle: 'bold', textColor: [16, 185, 129], halign: 'right' }
      }
    });

    if (closure.notes) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Observaciones: ${closure.notes}`, 14, (doc as any).lastAutoTable.finalY + 10);
    }

    doc.save(`Cierre_Alimentos_${new Date(closure.startTime).toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <ReceiptText className="text-emerald-600" size={32} />
            Historial de Operaciones
          </h2>
          <p className="text-slate-500 font-medium">Revisando ventas del {dateRange.start === dateRange.end ? (dateRange.start === todayStr ? 'Hoy (Día actual)' : dateRange.start) : 'periodo seleccionado'}</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <button 
            onClick={setToday}
            className={`px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${dateRange.start === todayStr && dateRange.end === todayStr ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
          >
            <Clock size={16} />
            Ir a Hoy
          </button>

          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-full sm:w-auto">
            <Calendar size={18} className="text-slate-400 ml-2" />
            <input 
              type="date" 
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 w-full sm:w-auto"
              value={dateRange.start}
              onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            />
            <span className="text-slate-300">|</span>
            <input 
              type="date" 
              className="bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-700 w-full sm:w-auto"
              value={dateRange.end}
              onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Hoy ({new Date().toLocaleDateString()})</p>
            <h4 className="text-2xl font-black text-slate-800">${todayStats.total.toLocaleString()}</h4>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <ShoppingBag size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedidos Hoy</p>
            <h4 className="text-2xl font-black text-slate-800">{todayStats.count}</h4>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-[2.5rem] shadow-xl flex items-center gap-5">
          <div className="w-14 h-14 bg-white/10 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0">
            <Power size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inventario</p>
            <h4 className="text-xl font-black text-white">Sincronizado</h4>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
        <button onClick={() => setActiveView('sales')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'sales' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Lista de Ventas</button>
        <button onClick={() => setActiveView('closures')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'closures' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>Cierres & Inventario</button>
      </div>

      {activeView === 'sales' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-4">
             <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Clock className="text-emerald-500" /> Línea de Tiempo</h3>
             <div className="relative max-w-xs w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar venta o producto..." 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
             </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b border-slate-50">
                  <th className="py-6 pl-10">Fecha / Hora</th>
                  <th className="py-6">Método de Pago</th>
                  <th className="py-6 text-right pr-10">Monto Final</th>
                  <th className="py-6 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map(sale => {
                  const isToday = new Date(sale.date).toISOString().split('T')[0] === todayStr;
                  return (
                    <React.Fragment key={sale.id}>
                      <tr onClick={() => setExpandedSale(expandedSale === sale.id ? null : sale.id)} className={`hover:bg-slate-50 cursor-pointer transition-colors ${isToday ? 'bg-emerald-50/20' : ''}`}>
                        <td className="py-6 pl-10">
                          <div className="flex flex-col">
                             <span className="font-black text-slate-800 flex items-center gap-2">
                               {new Date(sale.date).toLocaleDateString()}
                               {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                             </span>
                             <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(sale.date).toLocaleTimeString()}</span>
                          </div>
                        </td>
                        <td className="py-6">
                          <div className="flex items-center gap-2">
                            {sale.paymentMethod === 'cash' ? <Banknote size={16} className="text-emerald-500" /> : <CreditCard size={16} className="text-blue-500" />}
                            <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${sale.paymentMethod === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                              {sale.paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}
                            </span>
                          </div>
                        </td>
                        <td className="py-6 text-right pr-10 font-black text-slate-900 text-xl">${sale.total.toLocaleString()}</td>
                        <td className="py-6 pr-6">
                          <ChevronDown size={20} className={`text-slate-300 transition-transform ${expandedSale === sale.id ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {expandedSale === sale.id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={4} className="p-8">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div>
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detalle del Pedido</p>
                                  <ul className="space-y-3">
                                    {sale.items.map((item, idx) => (
                                      <li key={idx} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                        <span className="font-bold text-slate-700">{item.name} <span className="text-slate-400 ml-1">x {item.quantity} {item.unit}</span></span>
                                        <span className="font-black text-slate-800">${(item.price * item.quantity).toLocaleString()}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="flex flex-col justify-between items-end">
                                   <div className="text-right">
                                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identificador Único</p>
                                      <p className="font-mono text-xs text-slate-500">#{sale.id}</p>
                                   </div>
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); onDeleteSale(sale.id); }}
                                     className="text-red-500 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-xl transition-all"
                                   >
                                     <X size={14} /> Anular Transacción
                                   </button>
                                </div>
                             </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredSales.length === 0 && (
                  <tr><td colSpan={4} className="py-32 text-center text-slate-300 font-black uppercase tracking-widest text-xs">No se encontraron ventas en esta fecha</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
           <h3 className="text-xl font-black text-slate-800 px-4 flex items-center gap-2"><Power className="text-blue-500" /> Control de Inventario por Turno</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {filteredClosures.map(c => {
                const totalVentas = c.totalCashSales + c.totalTransferSales;
                const esperado = c.initialCash + c.totalCashSales;
                const diferencia = (c.finalCashReal || 0) - esperado;
                const isToday = new Date(c.startTime).toISOString().split('T')[0] === todayStr;
                const isExpanded = expandedClosure === c.id;

                return (
                  <div key={c.id} className={`bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-6 ${isToday ? 'ring-2 ring-emerald-500/20' : ''} ${isExpanded ? 'md:col-span-2' : ''}`}>
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer" onClick={() => setExpandedClosure(isExpanded ? null : c.id)}>
                        <p className="text-lg font-black text-slate-800 flex items-center gap-2">
                          {new Date(c.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                          {isToday && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg">HOY</span>}
                          <ChevronDown size={18} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(c.startTime).toLocaleTimeString()} - {c.endTime ? new Date(c.endTime).toLocaleTimeString() : 'Activo'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => generateClosurePDF(c)}
                          title="Imprimir Reporte PDF"
                          className="p-3 bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl transition-all border border-slate-100"
                        >
                          <Printer size={18} />
                        </button>
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center ${c.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {c.status === 'open' ? 'Turno Abierto' : 'Cerrado'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Ventas</p>
                         <p className="text-xl font-black text-slate-800">${totalVentas.toLocaleString()}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Caja</p>
                         <p className={`text-xl font-black ${diferencia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                           {diferencia >= 0 ? '+' : ''}{diferencia.toLocaleString()}
                         </p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contado Real</p>
                         <p className="text-xl font-black text-slate-800">${c.finalCashReal?.toLocaleString() || '---'}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fondo Inicial</p>
                         <p className="text-xl font-black text-slate-800">${c.initialCash.toLocaleString()}</p>
                      </div>
                    </div>

                    {isExpanded && c.productSnapshots && (
                      <div className="pt-6 border-t border-slate-50 animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Package size={18} className="text-emerald-500" />
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Reconciliación de Alimentos</h4>
                          </div>
                        </div>
                        <div className="bg-slate-50/50 rounded-3xl overflow-hidden border border-slate-100">
                           <table className="w-full text-left text-xs">
                             <thead className="bg-white">
                               <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                 <th className="px-6 py-4">Producto</th>
                                 <th className="px-6 py-4 text-center">Stock Inicial (Entero)</th>
                                 <th className="px-6 py-4 text-center">Vendido (Turno)</th>
                                 <th className="px-6 py-4 text-right">Stock Final (Entero)</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {(Object.values(c.productSnapshots) as ProductClosureSnapshot[]).filter(s => s.soldQuantity > 0 || s.initialStock > 0).map(s => {
                                 const initial = Math.round(s.initialStock);
                                 const final = Math.round(s.initialStock - s.soldQuantity);
                                 return (
                                   <tr key={s.productId} className="hover:bg-white transition-colors">
                                     <td className="px-6 py-4">
                                       <p className="font-bold text-slate-800">{s.name}</p>
                                     </td>
                                     <td className="px-6 py-4 text-center font-black text-slate-600">
                                       {initial}
                                     </td>
                                     <td className="px-6 py-4 text-center">
                                       <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-black">-{s.soldQuantity.toFixed(2)}</span>
                                     </td>
                                     <td className="px-6 py-4 text-right font-black text-emerald-600 font-mono">
                                       {final} {s.unit}
                                     </td>
                                   </tr>
                                 );
                               })}
                             </tbody>
                           </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
             })}
           </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
