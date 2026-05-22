import connectDB from '../src/lib/pool.js'
import Scan from '../src/models/Scan.js'

const SCAN_ID = '69e613ab57d05e6d6c83a9fd'

async function analyzeScan() {
  await connectDB()

  const scan = await Scan.findById(SCAN_ID).lean()

  if (!scan) {
    console.error('Scan not found')
    process.exit(1)
  }

  console.log('Scan ID:', scan._id)
  console.log('Session ID:', scan.sessionId)
  console.log('User ID:', scan.userId)
  console.log('Total Detections:', scan.totalDetections)
  console.log('---')

  const labelScores = {}

  // Aggregate all classification scores across all detections
  scan.scans.forEach((scanBatch) => {
    scanBatch.detections.forEach((detection) => {
      detection.classification_results.classifications.forEach((classification) => {
        const { label, score } = classification
        if (!labelScores[label]) {
          labelScores[label] = { sum: 0, count: 0 }
        }
        labelScores[label].sum += score
        labelScores[label].count += 1
      })
    })
  })

  // Compute average scores
  const averagedLabels = Object.entries(labelScores).map(([label, data]) => ({
    label,
    averageScore: data.sum / data.count,
    totalCount: data.count
  }))

  // Sort by average score descending
  averagedLabels.sort((a, b) => b.averageScore - a.averageScore)

  console.log('Top 5 classifications by average score:')
  averagedLabels.slice(0, 5).forEach((item, idx) => {
    console.log(`  ${idx + 1}. ${item.label}: ${(item.averageScore * 100).toFixed(4)}%`)
  })

  const topResult = averagedLabels[0]

  // Extract crop type from label
  // Format: "Healthy [Crop] Plant" or "[Crop] with [Disease]"
  const extractCropType = (label) => {
    if (label.startsWith('Healthy ')) {
      const crop = label.replace('Healthy ', '').replace(' Plant', '')
      return { crop, isHealthy: true, disease: null }
    }
    
    // Split by " with " to get crop and disease
    const parts = label.split(' with ')
    if (parts.length >= 2) {
      return { crop: parts[0], isHealthy: false, disease: parts.slice(1).join(' with ') }
    }
    
    return { crop: label, isHealthy: false, disease: null }
  }

  const cropInfo = extractCropType(topResult.label)

  console.log('---')
  console.log('RESULT:')
  console.log('  Crop Type:', cropInfo.crop)
  console.log('  Label:', topResult.label)
  console.log('  Average Score:', (topResult.averageScore * 100).toFixed(4) + '%')
  console.log('  Status:', cropInfo.isHealthy ? 'Healthy' : `Diseased: ${cropInfo.disease}`)

  await connectDB().then(m => m.connection.close())

  return {
    cropType: cropInfo.crop,
    label: topResult.label,
    averageScore: topResult.averageScore,
    isHealthy: cropInfo.isHealthy,
    disease: cropInfo.disease,
    allClassifications: averagedLabels.slice(0, 10)
  }
}

analyzeScan().then(console.log).catch(console.error)