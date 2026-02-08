import mongoose from 'mongoose'

const reportSchema = new mongoose.Schema(
  {
    farmerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide a farmer ID'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Please provide an image URL'],
    },
    diagnosis: {
      type: String,
      required: [true, 'Please provide a diagnosis'],
      trim: true,
    },
    treatment: {
      type: String,
      required: [true, 'Please provide a treatment'],
      trim: true,
    },
  },
  { timestamps: true }
)

export default mongoose.models.Report || mongoose.model('Report', reportSchema)
