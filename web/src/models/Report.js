import mongoose from 'mongoose'

const leafDetailSchema = new mongoose.Schema({
  leafIndex: Number,
  disease: String,
  confidence: Number,
  severity: String,
  affectedArea: Number,
  maskId: String,
}, { _id: false });

const reportSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a farmer ID'],
    },
    sessionId: {
      type: String,
      required: [true, 'Please provide a session ID'],
      trim: true,
      index: true,
    },
    scanId: {
      type: String,
      trim: true,
    },
    enrichedContext: {
      weather: {
        temperature_2m_max: Number,
        temperature_2m_min: Number,
        precipitation_sum: Number,
        relative_humidity_2m: Number,
        wind_speed_10m_max: Number,
        et0_fao_evapotranspiration: Number,
        soil_moisture_0_to_1cm: Number,
        soil_moisture_1_to_3cm: Number,
      },
      soil: {
        sand: Number,
        silt: Number,
        clay: Number,
        bulk_density: Number,
        organic_carbon: Number,
        phh2o: Number,
        cec: Number,
      },
      location: {
        latitude: Number,
        longitude: Number,
      },
      date: Date,
    },
    reportData: {
      header: {
        scanId: String,
        crop: String,
        result: String,
        date: String,
        location: [Number],
        leavesAnalyzed: Number,
        primaryFinding: String,
        avgConfidence: String,
      },
      summary: String,
      perLeafDetails: [leafDetailSchema],
      managementRecommendations: String,
      nextSteps: String,
    },
    embeddedImages: {
      original_image_masked: String,
      original_image_clean: String,
      leaves: {
        type: Map,
        of: String,
      },
    },
    diagnosis: {
      type: String,
      trim: true,
    },
    treatment: {
      type: String,
      trim: true,
    },
    fullReport: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
)

reportSchema.index({ farmerId: 1, createdAt: -1 });
reportSchema.index({ sessionId: 1, scanId: 1 });

delete mongoose.models.Report;
const Report = mongoose.model('Report', reportSchema);
export default Report;
