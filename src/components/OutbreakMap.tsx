import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { OutbreakAlert } from '../types';
import { AlertCircle, MapPin, TrendingUp, ShieldAlert, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OutbreakMap() {
  const [alerts, setAlerts] = useState<OutbreakAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('timestamp', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OutbreakAlert));
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'MODERATE': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  const mockChartData = [
    { name: 'Mon', cases: 4 },
    { name: 'Tue', cases: 7 },
    { name: 'Wed', cases: 12 },
    { name: 'Thu', cases: 25 },
    { name: 'Fri', cases: 42 },
    { name: 'Sat', cases: 38 },
    { name: 'Sun', cases: 54 },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Outbreak Intelligence</h1>
          <p className="text-gray-500 font-medium">Real-time geo-coded surveillance feed.</p>
        </div>
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase tracking-widest border border-red-100 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            Live Monitoring
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Alerts Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Active Alerts</h3>
          <AnimatePresence mode="popLayout">
            {alerts.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-100"
              >
                <ShieldAlert size={48} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400 font-medium">No active outbreaks detected in your region.</p>
              </motion.div>
            ) : (
              alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn("bg-white rounded-[2rem] p-6 shadow-sm border-2 transition-all hover:shadow-md", getSeverityColor(alert.severity))}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-lg leading-tight uppercase tracking-tight">{alert.type} ALERT</h4>
                        <p className="text-xs font-bold opacity-60 uppercase tracking-widest">{alert.severity} SEVERITY</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold opacity-60">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  <p className="text-gray-900 font-medium mb-4 leading-relaxed">
                    {alert.message}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-black/5">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Prediction</span>
                      <p className="text-xs font-bold text-gray-700">{alert.prediction}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Recommendation</span>
                      <p className="text-xs font-bold text-gray-700">{alert.recommendation}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <TrendingUp size={14} />
              Case Velocity
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockChartData}>
                  <Line 
                    type="monotone" 
                    dataKey="cases" 
                    stroke="#f97316" 
                    strokeWidth={4} 
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }} 
                    activeDot={{ r: 6 }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-black">+340%</p>
              <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Above seasonal baseline</p>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <MapPin size={14} />
              Hotspot Tracking
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Soroti East</span>
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Critical</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Kumi Road</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest">High</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Central Market</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Moderate</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
