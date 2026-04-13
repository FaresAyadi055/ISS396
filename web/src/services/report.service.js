import Report from '../models/Report.js'
import connectDB from '@/lib/pool'

async function ensureConnection() {
  await connectDB()
}

// Create report
export const createReport = async (reportData) => {
  await ensureConnection()

  const {
    farmerId,
    sessionId,
    scanId,
    diagnosis,
    treatment,
    fullReport,
    enrichedContext,
    reportData: structuredReportData,
    embeddedImages,
  } = reportData

  if (!farmerId || !sessionId) {
    throw new Error('farmerId and sessionId are required')
  }

  const report = await Report.create({
    farmerId,
    sessionId,
    scanId,
    diagnosis,
    treatment,
    fullReport,
    enrichedContext,
    reportData: structuredReportData,
    embeddedImages,
    status: 'completed',
  })

  return report
}

// Get reports by session
export const getReportsBySession = async (sessionId, farmerId = null) => {
  await ensureConnection()

  const filter = { sessionId }
  if (farmerId) {
    filter.farmerId = farmerId
  }

  const reports = await Report.find(filter)
    .sort({ createdAt: -1 })
    .lean()

  return {
    success: true,
    reports,
    count: reports.length,
  }
}

// Get all reports
export const getAllReports = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit

  const reports = await Report.find()
    .populate('farmerId', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await Report.countDocuments()

  return {
    success: true,
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

// Get reports by farmer
export const getReportsByFarmer = async (farmerId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit

  const reports = await Report.find({ farmerId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  const total = await Report.countDocuments({ farmerId })

  return {
    success: true,
    reports,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  }
}

// Get report by ID
export const getReportById = async (id) => {
  const report = await Report.findById(id).populate('farmerId', 'name email')

  if (!report) {
    throw new Error('Report not found')
  }

  return report
}

// Update report
export const updateReport = async (id, updateData) => {
  const report = await Report.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })

  if (!report) {
    throw new Error('Report not found')
  }

  return report
}

// Delete report
export const deleteReport = async (id) => {
  const report = await Report.findByIdAndDelete(id)

  if (!report) {
    throw new Error('Report not found')
  }

  return {
    success: true,
    message: 'Report deleted successfully',
  }
}
