// src/models/Scan.js
import mongoose from "mongoose";

// Sub-schema: one entry in the sorted classification result list
const ClassificationEntrySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

// Full 38-class classification result (alphabetical order)
const ClassificationResultSchema = new mongoose.Schema(
  {
    classifications: {
      type: [ClassificationEntrySchema],
      required: true,
      validate: {
        validator: (arr) => arr.length === 38,
        message: "classifications must contain exactly 38 entries",
      },
    },
  },
  { _id: false }
);

// Single detection (mask + metadata + AI result)
const DetectionSchema = new mongoose.Schema(
  {
    mask: { type: Buffer, required: true },
    maskId: { type: String, required: true },
    location: { type: [Number], required: true },
    date: { type: Date, required: true },
    classification_results: { type: ClassificationResultSchema, required: true },
  },
  { _id: false }
);

DetectionSchema.virtual("maskBase64").get(function () {
  return this.mask ? this.mask.toString("base64") : null;
});

DetectionSchema.virtual("maskBase64").get(function () {
  return this.mask ? this.mask.toString("base64") : null;
});

// One upload batch: two originals + multiple detections
const ImageScanSchema = new mongoose.Schema(
  {
    scan_id: { type: String, required: true, trim: true },
    cropType: { type: String, trim: true },
    original_image_masked: { type: Buffer, required: true },   // with masks drawn
    original_image_clean: { type: Buffer, required: true },    // clean version
    detections: { type: [DetectionSchema], default: [] },
    detections_count: { type: Number, default: 0 },
  },
  { _id: false, timestamps: false }
);

ImageScanSchema.virtual("original_image_masked_base64").get(function () {
  return this.original_image_masked ? this.original_image_masked.toString("base64") : null;
});
ImageScanSchema.virtual("original_image_clean_base64").get(function () {
  return this.original_image_clean ? this.original_image_clean.toString("base64") : null;
});

// Root schema – one document per session
const ScanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: { type: String, index: true, trim: true },
    scans: { type: [ImageScanSchema], default: [] },
    totalDetections: { type: Number, default: 0 },
    lastScannedAt: { type: Date, default: null },
    hasReport: { type: Boolean, default: false },
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: "Report", default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ScanSchema.index({ createdAt: -1 });
ScanSchema.index({ userId: 1, createdAt: -1 });
ScanSchema.index({ userId: 1, sessionId: 1 });

// Instance method: append one scan batch
ScanSchema.methods.appendScan = function (scanEntry) {
  const detections = (scanEntry.detections || []).map((det) => ({
    mask: Buffer.from(det.mask, "base64"),
    maskId: det.maskId,
    location: det.location,
    date: det.date ? new Date(det.date) : new Date(),
    classification_results: det.classification_results,
  }));

  this.scans.push({
    scan_id: scanEntry.scan_id,
    cropType: scanEntry.cropType || null,
    original_image_masked: Buffer.from(scanEntry.original_image_masked, "base64"),
    original_image_clean: Buffer.from(scanEntry.original_image_clean, "base64"),
    detections: detections,
    detections_count: detections.length,
  });

  this.totalDetections += detections.length;
  this.lastScannedAt = new Date();
  return this;
};

delete mongoose.models.Scan;
const Scan = mongoose.model("Scan", ScanSchema);
export default Scan;