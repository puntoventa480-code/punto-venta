
import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, AreaChart, Area, Legend, LineChart, Line 
} from 'recharts';
import { 
  TrendingUp, Star, Zap, Target, ArrowUpRight, 
  AlertTriangle, Lightbulb, ShoppingBag, Activity, Calendar
} from 'lucide-react';
import { Sale, Product, Category } from '../types';

interface InsightsProps {
  sales: Sale[];
  products: Product[];
  categories: Category[];
}

const Insights: React.FC<InsightsProps> = ({ sales, products, categories }) => {
  
  // 1. Top Products (Revenue Drivers)
  const topProducts = useMemo(() => {
    const productStats: Record<string, { name: string, revenue: number, units: number }> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = { name: item.name, revenue: 0, units: 0 };
        }
        productStats[item.productId].revenue += item.price * item.quantity;
        productStats[item.productId].units += item.quantity;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  // 2. Sales by Category
  const categoryMarketShare = useMemo(() => {
    const catStats: Record<string, number> = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const catId = prod?.categoryId || 'unknown';
        const catName = categories.find(c => c.id === catId)?.name || 'Otros';
        catStats[catName] = (catStats[catName] || 0) + (item.price * item.quantity);
      });
    });

    return Object.entries(catStats).map(([name, value]) => ({ name, value }));
  }, [sales, products, categories]);

  // 3. Peak Sales Hours
  const hourlyTraffic = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ 
      hour: `${i}:00`, 
      sales: 0,
      revenue: 0 
    }));
    
    sales.forEach(sale => {
      const hour = new Date(sale.date).getHours();
      hours[hour].sales += 1;
      hours[hour].revenue += sale.total;
    });

    return hours.filter(h => h.sales > 0 || (parseInt(h.hour) > 8 && parseInt(h.hour) < 22));
  }, [sales]);

  // 4. Expiry Risk
  const expiryRiskData = useMemo(() => {
    const today = new Date().getTime();
    const weekFromNow = today + (7 * 24 * 60 * 60 * 1000);
    const monthFromNow = today + (30 * 24 * 60 * 60 * 1000);

    const expired = products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() < today);
    const critical = products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() >= today && new Date(p.expiryDate).getTime() <= weekFromNow);
    const warning = products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() > weekFromNow && new Date(p.expiryDate).getTime() <= monthFromNow);

    return [
      { name: 'Vencidos', value: expired.length, color: '#ef4444' },
      { name: 'Críticos (7d)', value: critical.length, color: '#f59e0b' },
      { name: 'Próximos (30d)', value: warning.length, color: '#3b82f6' }
    ].filter(d => d.value > 0);
  }, [products]);

  // 5. Strategic Metrics
  const kpis = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = sales.reduce((acc, s) => {
      return acc + s.items.reduce((itemAcc, item) => {
        const p = products.find(prod => prod.id === item.productId);
        return itemAcc + ((p?.costPrice || 0) * item.quantity);
      }, 0);
    }, 0);

    const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;
    const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;
    const totalSoldUnits = sales.reduce((acc, s) => acc + s.items.reduce((ia, i) => ia + i.quantity, 0), 0);
    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    const rotationIndex = totalStock > 0 ? (totalSoldUnits / totalStock) * 100 : 0;

    return { avgTicket, grossMargin, rotationIndex, totalRevenue };
  }, [sales, products]);

  // 6. Intelligent Recommendations
  const recommendations = useMemo(() => {
    const tips = [];
    
    // Check for high demand low stock
    const hotItemsLowStock = products.filter(p => {
      const sold = sales.reduce((acc, s) => acc + s.items.filter(i => i.productId === p.id).reduce((ia, i) => ia + i.quantity, 0), 0);
      return sold > 5 && p.stock < 10;
    });
    if (hotItemsLowStock.length > 0) {
      tips.push({
        type: 'warning',
        icon: AlertTriangle,
        text: `¡Stock Crítico! "${hotItemsLowStock[0].name}" tiene alta rotación pero pocas existencias.`
      });
    }

    // Expiry warning
    const today = new Date().getTime();
    const nearExpiry = products.filter(p => p.expiryDate && new Date(p.expiryDate).getTime() < today + (1000 * 60 * 60 * 24 * 7));
    if (nearExpiry.length > 0) {
      tips.push({
        type: 'danger',
        icon: Calendar,
        text: `Pérdida Potencial: Tienes ${nearExpiry.length} productos que vencerán esta semana. Considera una oferta relámpago.`
      });
    }

    // Peak Hour suggestion
    const peakHour = [...hourlyTraffic].sort((a, b) => b.revenue - a.revenue)[0];
    if (peakHour) {
      tips.push({
        type: 'success',
        icon: Zap,
        text: `Oportunidad Horaria: Las ${peakHour.hour} concentran la mayor demanda de alimentos.`
      });
    }

    return tips;
  }, [products, sales, hourlyTraffic]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#6366f1', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-16">
      <header>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Análisis Gourmet</h2>
        <p className="text-slate-500 font-medium">Salud financiera y control de mermas de tu inventario alimenticio</p>
      </header>

      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag size={24} />
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Ticket Promedio</p>
          <h4 className="text-2xl font-black text-slate-800">${kpis.avgTicket.toLocaleString()}</h4>
          <p className="text-[10px] text-emerald-500 font-bold mt-1 flex items-center gap-1">
            <ArrowUpRight size={12} /> {sales.length} pedidos
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Target size={24} />
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Margen Bruto</p>
          <h4 className="text-2xl font-black text-slate-800">{kpis.grossMargin.toFixed(1)}%</h4>
          <p className="text-[10px] text-blue-500 font-bold mt-1">Utilidad sobre costo</p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
            <Activity size={24} />
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Rotación Stock</p>
          <h4 className="text-2xl font-black text-slate-800">{kpis.rotationIndex.toFixed(1)}%</h4>
          <p className="text-[10px] text-amber-500 font-bold mt-1">Eficiencia de inventario</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl">
          <div className="w-12 h-12 bg-white/10 text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
            <TrendingUp size={24} />
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Estado Negocio</p>
          <h4 className="text-2xl font-black text-white">Saludable</h4>
          <p className="text-[10px] text-emerald-400 font-bold mt-1">Crecimiento constante</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expiry Risk Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Calendar className="text-red-500" />
              Gestión de Vencimientos
            </h3>
            <span className="text-[10px] font-black uppercase bg-red-50 px-3 py-1 rounded-full text-red-500">Riesgo de Merma</span>
          </div>
          <div className="h-72">
            {expiryRiskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expiryRiskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={90}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {expiryRiskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Calendar size={48} className="mb-2 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">No hay riesgos detectados</p>
              </div>
            )}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
            <Target className="text-emerald-500" />
            Ventas por Categoría
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryMarketShare}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {categoryMarketShare.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Ventas']}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Intelligent Recommendations */}
      <section className="bg-emerald-600 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Lightbulb size={120} className="text-white" />
        </div>
        <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
          <Lightbulb className="text-amber-300" />
          Recomendaciones Inteligentes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                <rec.icon size={20} />
              </div>
              <p className="text-white text-sm font-semibold leading-relaxed">
                {rec.text}
              </p>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-emerald-100 font-medium italic">Esperando más datos de transacciones para generar tips personalizados...</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default Insights;
