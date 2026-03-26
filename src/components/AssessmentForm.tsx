import React, { useState, useRef } from 'react';
import { Camera, Mic, Square, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { analyzeAssessment } from '../services/geminiService';
import { Diagnosis, PhotoAnalysis, VoiceExtraction } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onComplete: (data: { photo: PhotoAnalysis; voice: VoiceExtraction; diagnosis: Diagnosis; photoUrl: string }) => void;
}

export default function AssessmentForm({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setPhoto(dataUrl);
      
      // Stop camera
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      
      setStep(2);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        setStep(3);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleAnalyze = async () => {
    if (!photo || !audioBlob) return;
    setIsAnalyzing(true);
    try {
      const photoBase64 = photo.split(',')[1];
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const voiceBase64 = (reader.result as string).split(',')[1];
        const result = await analyzeAssessment(photoBase64, voiceBase64);
        onComplete({ ...result, photoUrl: photo });
      };
    } catch (err) {
      console.error("Analysis error:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border border-gray-100">
      <div className="flex justify-between mb-8 px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
              step === s ? "bg-orange-500 text-white" : step > s ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
            )}>
              {step > s ? <CheckCircle2 size={16} /> : s}
            </div>
            {s < 3 && <div className={cn("w-12 h-0.5 mx-2", step > s ? "bg-green-500" : "bg-gray-200")} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Capture Photo</h2>
              <p className="text-gray-500 mt-2">Face and upper body should be visible.</p>
            </div>
            
            <div className="relative aspect-[3/4] bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-100 shadow-inner">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
                onCanPlay={() => {}}
              />
              {!videoRef.current?.srcObject && (
                <button 
                  onClick={startCamera}
                  className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40 hover:bg-black/50 transition-colors"
                >
                  <Camera size={48} className="mb-4" />
                  <span className="font-medium">Start Camera</span>
                </button>
              )}
            </div>

            {videoRef.current?.srcObject && (
              <button
                onClick={capturePhoto}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 transition-all flex items-center justify-center gap-2"
              >
                <Camera size={20} />
                Capture Now
              </button>
            )}
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Mother's Story</h2>
              <p className="text-gray-500 mt-2">"Tell me what is wrong with your child."</p>
            </div>

            <div className="flex flex-col items-center justify-center py-12 space-y-8">
              <div className={cn(
                "w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500",
                isRecording ? "bg-red-100 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.3)]" : "bg-orange-100"
              )}>
                <div className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center text-white transition-colors duration-500",
                  isRecording ? "bg-red-500 animate-pulse" : "bg-orange-500"
                )}>
                  {isRecording ? <Square size={32} /> : <Mic size={32} />}
                </div>
              </div>

              <div className="text-center">
                <p className={cn("text-lg font-medium", isRecording ? "text-red-500" : "text-gray-700")}>
                  {isRecording ? "Recording Mother's Voice..." : "Ready to Record"}
                </p>
                <p className="text-sm text-gray-400 mt-1">30-60 seconds recommended</p>
              </div>

              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  isRecording ? "bg-gray-900 text-white" : "bg-orange-500 text-white shadow-orange-200"
                )}
              >
                {isRecording ? "Stop Recording" : "Start Listening"}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Review & Analyze</h2>
              <p className="text-gray-500 mt-2">Ready to run AI diagnostic engine.</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square rounded-2xl overflow-hidden border-2 border-gray-100">
                <img src={photo!} alt="Child" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square rounded-2xl bg-gray-50 flex flex-col items-center justify-center border-2 border-gray-100">
                <Mic size={32} className="text-orange-500 mb-2" />
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Voice Note</span>
                <span className="text-sm font-bold text-gray-900 mt-1">Captured</span>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-3"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Analyzing Clinical Signs...
                </>
              ) : (
                <>
                  <AlertCircle size={20} />
                  Generate Diagnosis
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
