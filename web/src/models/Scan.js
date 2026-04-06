import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Sub-schema: one entry in the sorted classification result list
// { label: "Tomato___Early_blight", score: 0.9412 }
// ---------------------------------------------------------------------------
const ClassificationEntrySchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0, max: 1 },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Sub-schema: full MobileNet-V2 result — all 38 classes sorted by score desc.
//
// classifications[0] is always the top prediction.
// Labels travel with their scores from inference time so no client-side
// index mapping is ever needed.
// ---------------------------------------------------------------------------
const ClassificationResultSchema = new mongoose.Schema(
  {
    classifications: {
      type: [ClassificationEntrySchema],
      required: true,
      validate: {
        validator: (arr) => arr.length === 38,
        message:   "classifications must contain exactly 38 entries",
      },
    },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Sub-schema: one detected object — mask (Buffer) + classification
// ---------------------------------------------------------------------------
const DetectionSchema = new mongoose.Schema(
  {
    // Stored as Buffer; exposed as base64 via virtual for the API layer
    mask:                   { type: Buffer,                     required: true },
    classification_results: { type: ClassificationResultSchema, required: true },
  },
  { _id: false }
);

DetectionSchema.virtual("maskBase64").get(function () {
  return this.mask ? this.mask.toString("base64") : null;
});

// ---------------------------------------------------------------------------
// Sub-schema: one FastAPI scan_entry (single POST /scan call)
// ---------------------------------------------------------------------------
const ImageScanSchema = new mongoose.Schema(
  {
    scan_id:          { type: String, required: true, trim: true },
    image:            { type: [DetectionSchema], default: [] },
    detections_count: { type: Number, default: 0 },
  },
  { _id: false, timestamps: false }
);

// ---------------------------------------------------------------------------
// Root schema — one document per scan session, owned by a user
// ---------------------------------------------------------------------------
const ScanSchema = new mongoose.Schema(
  {
    // ── Ownership ────────────────────────────────────────────────────────────
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },

    // Optional caller-supplied tag (device id, field trip name, etc.)
    sessionId: {
      type:  String,
      index: true,
      trim:  true,
    },

    // ── Scan data ────────────────────────────────────────────────────────────
    // Mirrors FastAPI's scan_store:  { scans: [ {scan_id, image:[...]}, ... ] }
    scans: {
      type:    [ImageScanSchema],
      default: [],
    },

    // Denormalised counters — avoid aggregation for simple queries
    totalDetections: { type: Number, default: 0 },
    lastScannedAt:   { type: Date,   default: null },
  },
  {
    timestamps: true,                            
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------
ScanSchema.index({ createdAt: -1 });
ScanSchema.index({ userId: 1, createdAt: -1 });   // list user's scans by date
ScanSchema.index({ userId: 1, sessionId: 1 });    // look up a session by owner

// ---------------------------------------------------------------------------
// Instance method: append one FastAPI scan_entry + update counters
// ---------------------------------------------------------------------------
ScanSchema.methods.appendScan = function (scanEntry) {
  const detections = (scanEntry.image || []).map((det) => ({
    mask:                   Buffer.from(det.mask, "base64"),
    classification_results: det.classification_results,
  }));

  this.scans.push({
    scan_id:          scanEntry.scan_id,
    image:            detections,
    detections_count: detections.length,
  });

  this.totalDetections += detections.length;
  this.lastScannedAt   = new Date();
  return this;
};


delete mongoose.models.Scan;
const Scan = mongoose.model("Scan", ScanSchema);
export default Scan;