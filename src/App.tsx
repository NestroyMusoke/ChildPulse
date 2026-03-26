import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { LayoutDashboard, PlusCircle, Map as MapIcon, LogOut, User, Activity, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from './lib/utils';
import AssessmentForm from './components/AssessmentForm';
import DiagnosisResult from './components/DiagnosisResult';
import OutbreakMap from './components/OutbreakMap';
import { Assessment, OutbreakAlert } from './types';
import { detectOutbreaks } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'assess' | 'surveillance';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<View>('dashboard');
  const [loading, setLoading] = useState(true);
  const [recentAssessments, setRecentAssessments] = useState<Assessment[]>([]);
  const [currentResult, setCurrentResult] = useState<{
    photo: any;
    photoAnalysis: any;
    voiceExtraction: any;
    diagnosis: any;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'assessments'), orderBy('timestamp', 'desc'), limit(5));
    return onSnapshot(q, (snapshot) => {
      setRecentAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assessment)));
    });
  }, [user]);

  const handleLogin = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleAssessmentComplete = async (data: any) => {
    if (!user) return;
    
    const assessment: Omit<Assessment, 'id'> = {
      timestamp: new Date().toISOString(),
      location: { latitude: 1.68, longitude: 33.61 }, // Mock Soroti location
      photoAnalysis: data.photo,
      voiceExtraction: data.voice,
      diagnosis: data.diagnosis,
      chwId: user.uid
    };

    try {
      await addDoc(collection(db, 'assessments'), assessment);
      setCurrentResult({
        photo: data.photoUrl,
        photoAnalysis: data.photo,
        voiceExtraction: data.voice,
        diagnosis: data.diagnosis
      });
      
      // Trigger outbreak detection simulation
      const allDocs = await getDocs(query(collection(db, 'assessments'), limit(20)));
      const allAssessments = allDocs.docs.map(d => d.data());
      const alerts = await detectOutbreaks(allAssessments);
      
      for (const alert of alerts) {
        await addDoc(collection(db, 'alerts'), {
          ...alert,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error saving assessment:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-orange-500 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl shadow-orange-200">
          <Activity size={48} />
        </div>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-4">ChildPulse EA</h1>
        <p className="text-xl text-gray-500 max-w-md mb-12 font-medium leading-relaxed">
          The mother is the most accurate diagnostic instrument. We just built the system that listens.
        </p>
        <button
          onClick={handleLogin}
          className="px-12 py-5 bg-gray-900 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-gray-800 transition-all flex items-center gap-3"
        >
          <User size={24} />
          CHW Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 md:top-0 md:bottom-0 md:w-24 bg-white md:bg-gray-900 border-t md:border-t-0 md:border-r border-gray-100 md:border-white/5 z-50 flex md:flex-col items-center justify-around md:justify-center md:gap-8 p-4 md:p-0">
        <div className="hidden md:flex w-12 h-12 bg-orange-500 rounded-2xl items-center justify-center text-white mb-auto mt-8">
          <Activity size={24} />
        </div>
        
        <button 
          onClick={() => { setView('dashboard'); setCurrentResult(null); }}
          className={cn("p-4 rounded-2xl transition-all", view === 'dashboard' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-gray-400 md:text-white/40 hover:text-orange-500")}
        >
          <LayoutDashboard size={24} />
        </button>
        
        <button 
          onClick={() => { setView('assess'); setCurrentResult(null); }}
          className={cn("p-4 rounded-2xl transition-all", view === 'assess' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-gray-400 md:text-white/40 hover:text-orange-500")}
        >
          <PlusCircle size={24} />
        </button>
        
        <button 
          onClick={() => { setView('surveillance'); setCurrentResult(null); }}
          className={cn("p-4 rounded-2xl transition-all", view === 'surveillance' ? "bg-orange-500 text-white shadow-lg shadow-orange-200" : "text-gray-400 md:text-white/40 hover:text-orange-500")}
        >
          <MapIcon size={24} />
        </button>

        <button 
          onClick={() => signOut(auth)}
          className="p-4 rounded-2xl text-gray-400 md:text-white/40 hover:text-red-500 md:mt-auto md:mb-8"
        >
          <LogOut size={24} />
        </button>
      </nav>

      {/* Main Content */}
      <main className="md:ml-24 p-6 md:p-12">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-12"
            >
              <header className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-black tracking-tight">Mwaramutse, {user.displayName?.split(' ')[0]}</h1>
                  <p className="text-gray-500 font-medium">Soroti District Health Feed</p>
                </div>
                <img src={user.photoURL} className="w-14 h-14 rounded-2xl border-4 border-white shadow-lg" alt="Profile" />
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div 
                  onClick={() => setView('assess')}
                  className="bg-orange-500 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-orange-200 cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform" />
                  <PlusCircle size={48} className="mb-6" />
                  <h2 className="text-3xl font-black mb-2">New Assessment</h2>
                  <p className="text-white/80 font-medium">Capture photo and mother's voice note.</p>
                </div>

                <div 
                  onClick={() => setView('surveillance')}
                  className="bg-gray-900 rounded-[2.5rem] p-10 text-white shadow-2xl cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform" />
                  <ShieldAlert size={48} className="mb-6 text-orange-500" />
                  <h2 className="text-3xl font-black mb-2">Surveillance</h2>
                  <p className="text-white/60 font-medium">View real-time outbreak intelligence.</p>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Recent Assessments</h3>
                <div className="space-y-4">
                  {recentAssessments.map((a) => (
                    <div key={a.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center text-white",
                          a.diagnosis.classification === 'RED' ? "bg-red-500" : a.diagnosis.classification === 'YELLOW' ? "bg-yellow-500" : "bg-green-500"
                        )}>
                          <Activity size={24} />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{a.diagnosis.condition}</h4>
                          <p className="text-xs text-gray-400 uppercase font-black tracking-widest">{a.diagnosis.classification} PRIORITY</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{new Date(a.timestamp).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-400">{new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </motion.div>
          )}

          {view === 'assess' && (
            <motion.div 
              key="assess"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              {currentResult ? (
                <DiagnosisResult 
                  {...currentResult} 
                  onReset={() => { setView('dashboard'); setCurrentResult(null); }} 
                />
              ) : (
                <AssessmentForm onComplete={handleAssessmentComplete} />
              )}
            </motion.div>
          )}

          {view === 'surveillance' && (
            <motion.div 
              key="surveillance"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <OutbreakMap />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
