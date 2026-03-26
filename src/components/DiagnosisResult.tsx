import React, { useState } from 'react';
import { Diagnosis, PhotoAnalysis, VoiceExtraction } from '../types';
import { AlertTriangle, CheckCircle2, Info, ArrowRight, MapPin, Activity, Volume2, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { generateDiagnosisAudio } from '../services/geminiService';

interface Props {
  photo: string;
  photoAnalysis: PhotoAnalysis;
  voiceExtraction: VoiceExtraction;
  diagnosis: Diagnosis;
  onReset: () => void;
}

export default function DiagnosisResult({ photo, photoAnalysis, voiceExtraction, diagnosis, onReset }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  const handlePlaySummary = async () => {
    if (isLoadingAudio || isPlaying) return;
    setIsLoadingAudio(true);
    try {
      const base64Audio = await generateDiagnosisAudio(diagnosis);
      if (base64Audio) {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(url);
        };
        audio.play();
      }
    } catch (err) {
      console.error("Audio error:", err);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const getStatusColor = (classification: string) => {
    switch (classification) {
      case 'RED': return 'bg-red-500';
      case 'YELLOW': return 'bg-yellow-500';
      case 'GREEN': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBg = (classification: string) => {
    switch (classification) {
      case 'RED': return 'bg-red-50';
      case 'YELLOW': return 'bg-yellow-50';
      case 'GREEN': return 'bg-green-50';
      default: return 'bg-gray-50';
    }
  };

  const getStatusIcon = (classification: string) => {
    switch (classification) {
      case 'RED': return <AlertTriangle className="text-red-600" size={24} />;
      case 'YELLOW': return <Info className="text-yellow-600" size={24} />;
      case 'GREEN': return <CheckCircle2 className="text-green-600" size={24} />;
      default: return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6 pb-20"
    >
      {/* Hero Result Card */}
      <div className={cn("rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden", getStatusColor(diagnosis.classification))}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold tracking-widest uppercase">
              {diagnosis.classification} Classification
            </span>
            <button
              onClick={handlePlaySummary}
              disabled={isLoadingAudio}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all",
                isPlaying ? "bg-white text-orange-600 animate-pulse" : "bg-white/20 text-white hover:bg-white/30"
              )}
            >
              {isLoadingAudio ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
              {isPlaying ? "Playing..." : "Play Summary"}
            </button>
          </div>
          
          <h1 className="text-4xl font-black mb-4 leading-tight">
            {diagnosis.condition}
          </h1>
          
          <p className="text-white/90 text-lg font-medium leading-relaxed mb-8">
            {diagnosis.reasoning}
          </p>

          <div className="bg-black/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={16} />
              Immediate Actions
            </h3>
            <p className="text-white font-medium">{diagnosis.treatment}</p>
          </div>
        </div>
      </div>

      {/* Referral Card */}
      <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Referral Guidance</h3>
            <p className="text-gray-600 leading-relaxed">{diagnosis.referral}</p>
          </div>
        </div>
      </div>

      {/* Clinical Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Analysis */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            Vision Screening
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Wasting</span>
              <span className="font-bold text-gray-900">{photoAnalysis.wasting}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Pallor</span>
              <span className="font-bold text-gray-900">{photoAnalysis.pallor}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Estimated Age</span>
              <span className="font-bold text-gray-900">{photoAnalysis.estimatedAge}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-500">Alertness</span>
              <span className="font-bold text-gray-900">{photoAnalysis.alertness}</span>
            </div>
          </div>
        </div>

        {/* Voice Extraction */}
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full" />
            Maternal Report
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Duration</span>
              <span className="font-bold text-gray-900">{voiceExtraction.duration}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Severity</span>
              <span className="font-bold text-gray-900">{voiceExtraction.severity}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-gray-500">Urgency</span>
              <span className="font-bold text-gray-900">{voiceExtraction.urgency}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {voiceExtraction.symptoms.map((s, i) => (
                <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold uppercase tracking-wider">
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full py-6 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-[2rem] font-bold transition-all flex items-center justify-center gap-2"
      >
        New Assessment
        <ArrowRight size={20} />
      </button>
    </motion.div>
  );
}
