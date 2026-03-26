import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Diagnosis, PhotoAnalysis, VoiceExtraction } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeAssessment(
  photoBase64: string,
  voiceBase64: string,
  mimeType: string = "audio/wav"
): Promise<{ photo: PhotoAnalysis; voice: VoiceExtraction; diagnosis: Diagnosis }> {
  const model = "gemini-3.1-pro-preview";

  const systemInstruction = `
    You are a pediatric diagnostic expert for East Africa, following WHO iCCM protocols.
    Analyze the provided photo of a child and the voice note from the mother.
    
    PHOTO ANALYSIS:
    Extract visible clinical signs: wasting, pallor, sunken eyes, jaundice, cyanosis, kwashiorkor, edema, rashes, estimated age, alertness.
    
    VOICE EXTRACTION:
    Extract symptoms, duration, severity markers, additional symptoms (e.g., dark urine), and urgency from the mother's natural speech.
    
    DIAGNOSIS ENGINE:
    Combine both inputs to classify the child:
    - RED: Immediate referral (WHO emergency danger signs: inability to drink, convulsions, lethargy, severe wasting, severe pallor).
    - YELLOW: Treatment at community level with follow-up.
    - GREEN: Home care.
    
    Provide reasoning based on WHO protocols, treatment recommendations (e.g., rectal artesunate for severe malaria), and referral destination.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: "Analyze this pediatric assessment." },
          { inlineData: { data: photoBase64, mimeType: "image/jpeg" } },
          { inlineData: { data: voiceBase64, mimeType } }
        ]
      }
    ],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          photo: {
            type: Type.OBJECT,
            properties: {
              wasting: { type: Type.STRING },
              pallor: { type: Type.STRING },
              sunkenEyes: { type: Type.BOOLEAN },
              jaundice: { type: Type.BOOLEAN },
              cyanosis: { type: Type.BOOLEAN },
              kwashiorkor: { type: Type.BOOLEAN },
              edema: { type: Type.BOOLEAN },
              rashes: { type: Type.STRING },
              estimatedAge: { type: Type.STRING },
              alertness: { type: Type.STRING }
            }
          },
          voice: {
            type: Type.OBJECT,
            properties: {
              symptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              duration: { type: Type.STRING },
              severity: { type: Type.STRING },
              additionalSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
              urgency: { type: Type.STRING },
              transcript: { type: Type.STRING }
            }
          },
          diagnosis: {
            type: Type.OBJECT,
            properties: {
              classification: { type: Type.STRING, enum: ["RED", "YELLOW", "GREEN"] },
              condition: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              treatment: { type: Type.STRING },
              referral: { type: Type.STRING }
            }
          }
        },
        required: ["photo", "voice", "diagnosis"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateDiagnosisAudio(diagnosis: Diagnosis): Promise<string | undefined> {
  const model = "gemini-2.5-flash-preview-tts";
  const prompt = `
    You are a compassionate health worker. Translate and summarize the following diagnosis into a warm, reassuring voice note for the mother.
    The summary should be in a local language common in East Africa (e.g., Swahili, Luganda, or Ateso) to ensure she understands perfectly.
    
    Condition: ${diagnosis.condition}
    Classification: ${diagnosis.classification}
    Treatment: ${diagnosis.treatment}
    Referral: ${diagnosis.referral}
    
    Structure:
    1. Reassure the mother.
    2. Explain what the child has.
    3. Tell her exactly what to do now (treatment).
    4. Tell her where to go (referral).
    
    Keep it under 45 seconds. Speak clearly and empathetically.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

export async function detectOutbreaks(assessments: any[]): Promise<any[]> {
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    You are an epidemiological surveillance AI. Analyze the recent assessments and detect clusters or outbreaks.
    Look for:
    - Spatial clustering (many cases in small radius).
    - Temporal acceleration (cases doubling).
    - Disease signature shifts (e.g., cholera vs gastroenteritis).
    - Nutritional crises.
    
    Return a list of OutbreakAlert objects.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ text: JSON.stringify(assessments) }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["MALARIA", "PNEUMONIA", "CHOLERA", "NUTRITION", "MEASLES"] },
            severity: { type: Type.STRING, enum: ["CRITICAL", "HIGH", "MODERATE"] },
            location: {
              type: Type.OBJECT,
              properties: {
                latitude: { type: Type.NUMBER },
                longitude: { type: Type.NUMBER },
                radius: { type: Type.NUMBER }
              }
            },
            message: { type: Type.STRING },
            prediction: { type: Type.STRING },
            recommendation: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text);
}
