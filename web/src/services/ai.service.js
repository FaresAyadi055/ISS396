// src/services/ai.service.js
import sharp from 'sharp';
import { randomBytes } from 'crypto';

const HF_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification";
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

if (!HF_API_TOKEN) {
  throw new Error("HF_API_TOKEN environment variable is not set");
}

// Cache for alphabetical class names
let alphabeticalClassNames = null;

/**
 * Generate a unique mask ID
 * @returns {string} Unique mask identifier
 */
function generateMaskId() {
  // Generate 12 random bytes (24 hex characters)
  return randomBytes(12).toString('hex');
}

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
 * Sends one mask buffer to HF API and returns classifications in alphabetical order
 * with a unique mask ID.
 * @param {Buffer} imageBuffer - The mask image buffer
 * @param {Object} options - Optional parameters
 * @param {string} options.customMaskId - Optional custom mask ID (if not provided, auto-generated)
 * @returns {Promise<Object>} Object containing maskId and classification results
 */
export const analyzeLeafImage = async (imageBuffer, options = {}) => {
  // Generate unique ID for this mask
  const maskId = options.customMaskId || generateMaskId();
  
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
  
  // Return both the mask ID and the classification results
  return {
    maskId: maskId,
    classifications: alphabeticalClassifications,
    timestamp: new Date().toISOString()
  };
};

/**
 * Runs inference on multiple images in parallel, returning alphabetical results
 * with unique IDs for each mask.
 * @param {Array<Buffer>} imageBuffers - Array of mask image buffers
 * @param {Array<string>} customMaskIds - Optional array of custom mask IDs
 * @returns {Promise<Array<Object>>} Array of objects containing maskId and classification results
 */
export const analyzeLeafImages = async (imageBuffers, customMaskIds = []) => {
  const results = await Promise.all(
    imageBuffers.map((buf, index) => {
      const options = {};
      if (customMaskIds && customMaskIds[index]) {
        options.customMaskId = customMaskIds[index];
      }
      return analyzeLeafImage(buf, options);
    })
  );
  
  return results;
};

/**
 * Utility function to get the current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
export const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Utility function to validate a mask ID format
 * @param {string} maskId - The mask ID to validate
 * @returns {boolean} True if valid format
 */
export const isValidMaskId = (maskId) => {
  // Validates that maskId is a 24-character hex string
  return /^[a-f0-9]{24}$/.test(maskId);
};