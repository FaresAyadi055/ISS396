// src/services/ai.service.js

// linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification
// ✅ Has HF Inference API enabled
// ✅ 95.4% accuracy on PlantVillage (38 disease classes)
// ✅ Works with router.huggingface.co
const HF_MODEL_ID = "linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification";
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL_ID}`;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

if (!HF_API_TOKEN) {
  throw new Error("HF_API_TOKEN environment variable is not set");
}

/**
 * Analyzes a plant leaf image and returns disease classification scores
 * @param {Buffer} imageBuffer - The image data as a Buffer
 * @returns {Promise<Array>} - Array of { label, score } sorted by confidence
 */
export const analyzeLeafImage = async (imageBuffer) => {
  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      "Content-Type": "application/octet-stream",
      "X-Wait-For-Model": "true", // wait on cold start instead of 503
    },
    body: imageBuffer,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    const errorText = contentType.includes("application/json")
      ? (await response.json()).error
      : await response.text();
    throw new Error(`Hugging Face API error (${response.status}): ${errorText}`);
  }

  // Returns exemple: [{ label: "Tomato___Late_blight", score: 0.98 }, ...]
  const results = await response.json();
  return results;
};