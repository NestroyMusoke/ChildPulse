export type Classification = 'RED' | 'YELLOW' | 'GREEN';

export interface PhotoAnalysis {
  wasting: string;
  pallor: string;
  sunkenEyes: boolean;
  jaundice: boolean;
  cyanosis: boolean;
  kwashiorkor: boolean;
  edema: boolean;
  rashes: string;
  estimatedAge: string;
  alertness: string;
}

export interface VoiceExtraction {
  symptoms: string[];
  duration: string;
  severity: string;
  additionalSymptoms: string[];
  urgency: string;
  transcript: string;
}

export interface Diagnosis {
  classification: Classification;
  condition: string;
  reasoning: string;
  treatment: string;
  referral: string;
}

export interface Assessment {
  id?: string;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  photoAnalysis: PhotoAnalysis;
  voiceExtraction: VoiceExtraction;
  diagnosis: Diagnosis;
  chwId: string;
}

export interface OutbreakAlert {
  id?: string;
  timestamp: string;
  type: 'MALARIA' | 'PNEUMONIA' | 'CHOLERA' | 'NUTRITION' | 'MEASLES';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  location: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  message: string;
  prediction: string;
  recommendation: string;
}
