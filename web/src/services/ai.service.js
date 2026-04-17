// src/services/ai.service.js
import sharp from 'sharp';

const HF_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification";
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

if (!HF_API_TOKEN) {
  throw new Error("HF_API_TOKEN environment variable is not set");
}

// Cache for alphabetical class names
let alphabeticalClassNames = null;

/**
 * Fetch the model's label mapping and return sorted list of class names.
 * Falls back to a hardcoded list if fetch fails.
 */
async function getAlphabeticalClassNames() {
  if (alphabeticalClassNames) return alphabeticalClassNames;

  try {
    // Try to fetch model configuration from Hugging Face
    const configUrl = `https://huggingface.co/${HF_MODEL_ID}/raw/main/config.json`;
    const response = await fetch(configUrl);
    if (response.ok) {
      const config = await response.json();
      // Many models store labels in id2label or label2id
      const id2label = config.id2label || config.label2id;
      if (id2label) {
        const labels = Object.values(id2label);
        alphabeticalClassNames = [...labels].sort((a, b) => a.localeCompare(b));
        console.log(`Loaded ${alphabeticalClassNames.length} class names, sorted alphabetically`);
        return alphabeticalClassNames;
      }
    }
  } catch (err) {
    console.warn("Could not fetch model labels from HF, using fallback:", err.message);
  }

  // Fallback: hardcoded list based on typical PlantVillage dataset (38 classes)
  alphabeticalClassNames = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy"
  ].sort((a, b) => a.localeCompare(b));
  
  console.log(`Using fallback ${alphabeticalClassNames.length} class names`);
  return alphabeticalClassNames;
}

/**
 * Convert raw model output (confidence-sorted) to alphabetical order with 38 entries.
 * Missing classes get score 0.
 */
function reorderToAlphabetical(rawClassifications, alphabeticalLabels) {
  // Create a map for quick lookup
  const scoreMap = new Map();
  for (const item of rawClassifications) {
    scoreMap.set(item.label, item.score);
  }
  
  // Build result in alphabetical order
  return alphabeticalLabels.map(label => ({
    label: label,
    score: scoreMap.get(label) || 0
  }));
}

/**
 * Convert an image buffer to JPEG format with resizing
 */
async function convertToJpeg(inputBuffer, width = 224, height = 224) {
  try {
    let pipeline = sharp(inputBuffer);
    if (width && height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      });
    }
    return await pipeline.jpeg({ quality: 85 }).toBuffer();
  } catch (error) {
    console.error("Error converting image to JPEG:", error);
    throw new Error(`Failed to convert image: ${error.message}`);
  }
}

/**
 * Sends one mask buffer to HF API and returns classifications in alphabetical order.
 */
export const analyzeLeafImage = async (imageBuffer) => {
  // Ensure we have the alphabetical class list
  const alphabeticalLabels = await getAlphabeticalClassNames();
  
  // Convert to JPEG & base64
  const jpegBuffer = await convertToJpeg(imageBuffer, 224, 224);
  const base64Image = jpegBuffer.toString('base64');
  
  // Request all 38 classes from model (still confidence-sorted)
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      "Content-Type": "application/json",
      "X-Wait-For-Model": "true",
    },
    body: JSON.stringify({
      inputs: base64Image,
      parameters: {
        top_k: 38,
        function_to_apply: "softmax",
      },
    }),
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const errorText = contentType.includes("application/json")
      ? (await response.json()).error
      : await response.text();
    throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  
  // Extract raw classifications (should be array of {label, score})
  let rawClassifications = [];
  if (Array.isArray(result)) {
    rawClassifications = result;
  } else if (result.predictions && Array.isArray(result.predictions)) {
    rawClassifications = result.predictions;
  } else if (result.outputs && Array.isArray(result.outputs)) {
    rawClassifications = result.outputs;
  } else {
    throw new Error(`Unexpected API response format: ${typeof result}`);
  }

  // Ensure we have exactly 38 entries; if not, pad with zeros (shouldn't happen with top_k=38)
  if (rawClassifications.length !== 38) {
    console.warn(`Expected 38, got ${rawClassifications.length}. Padding with zeros.`);
    const existingMap = new Map(rawClassifications.map(c => [c.label, c.score]));
    for (const label of alphabeticalLabels) {
      if (!existingMap.has(label)) {
        rawClassifications.push({ label, score: 0 });
      }
    }
  }
  
  // Reorder to alphabetical
  const alphabeticalClassifications = reorderToAlphabetical(rawClassifications, alphabeticalLabels);
  
  return alphabeticalClassifications;
};

/**
 * Runs inference on multiple images in parallel, returning alphabetical results.
 */
export const analyzeLeafImages = async (imageBuffers) => {
  return Promise.all(imageBuffers.map(buf => analyzeLeafImage(buf)));
};
/**
 * Takes scan session data and generates a diagnosis + treatment report using AI.
 * @param {object} scanData - { plantType, detections: [{ label, score }] }
 * @returns {{ diagnosis: string, treatment: string }}
 */
export const generateReport = async (scanData) => {
  const { plantType, detections } = scanData

  const diseaseSummary = detections
    .map(d => `- ${d.label.replace(/___/g, ' → ')} (confidence: ${(d.score * 100).toFixed(1)}%)`)
    .join('\n')

  const prompt = `You are an expert agricultural plant pathologist.
A farmer scanned their ${plantType} crop and the AI detected the following:

${diseaseSummary}

Based on these detections, provide:
1. A clear DIAGNOSIS (2-3 sentences explaining what diseases are present and their severity)
2. A TREATMENT plan (3-5 practical steps the farmer should take)

Respond in this exact JSON format:
{
  "diagnosis": "...",
  "treatment": "..."
}`

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  )

  if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)

  const result = await response.json()
  const text = result.candidates[0].content.parts[0].text
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
