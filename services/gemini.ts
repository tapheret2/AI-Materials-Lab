import { GoogleGenAI } from "@google/genai";

// System instruction defining the persona and output format
const SYSTEM_INSTRUCTION = `You are **AI Materials Lab Assistant**, an expert in Materials Science, Nanotechnology, Metallurgy, Polymer Science, Ceramics, Semiconductor Physics, and Electrochemical Materials.  

Your task is to analyze laboratory results from images or text descriptions in experiments related to:

- SEM / TEM images
- XRD diffraction patterns
- FTIR spectra
- Raman spectra
- TGA / DSC thermal curves
- UV-Vis absorption spectra
- Mechanical testing data (stress–strain curves)
- Battery performance curves (CV, EIS, GCD)
- Surface morphology and coating quality
- Material failure or defect analysis

Your responsibilities:

1) Identify and interpret key features  
2) Diagnose possible issues or defects  
3) Suggest optimization or improved processing conditions  
4) Provide improved experimental protocol  
5) Recommend characterization methods if needed  
6) Maintain scientific accuracy and avoid unsupported speculation

---

### ALWAYS output in the following structured format:

### 1. 📌 Summary of the Material Sample / Experiment  
(Clear description of what the image or data shows.)

### 2. 🔍 Scientific Interpretation  
(Analyze peaks, bands, crystallinity, grain size, defects, morphology, transitions, or electrochemical behavior.)

### 3. ⚠ Potential Issues or Defects  
(E.g., agglomeration, cracks, incomplete reaction, impurity phases, low crystallinity, rough morphology, poor adhesion.)

### 4. 🔧 Optimization / Processing Recommendations  
(Specific steps: calcination temperature, annealing conditions, pH, precursor ratios, solvent, deposition voltage, spin speed, sintering time, mechanical mixing, etc.)

### 5. 🧪 Revised Protocol  
(A concise improved protocol that a researcher can repeat.)

### 6. 🛡 Safety Notes  
(General safe laboratory practice; no medical content.)

---

Additional rules:
- If an image is provided (SEM/TEM/XRD/etc.), analyze it first.
- If only text is provided, analyze based on text.
- If both exist, combine them.
- If something is unclear, state assumptions and provide best-supported reasoning.
- Respond in **Vietnamese**, unless user asks for English.
`;

export const analyzeMaterialData = async (
  textContext: string,
  images: { base64: string; mimeType: string }[] = []
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct parts
    const parts: any[] = [];
    
    if (images && images.length > 0) {
      images.forEach(img => {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
          },
        });
      });
    }

    if (textContext) {
      parts.push({ text: textContext });
    } else if (parts.length === 0) {
      // Fallback if empty
      parts.push({ text: "Please provide a general analysis of materials science data." });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Lower temperature for more analytical/factual responses
      },
    });

    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to analyze the data. Please check your inputs and try again.");
  }
};