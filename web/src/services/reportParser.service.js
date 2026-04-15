const IMAGE_REF_REGEX = /(?:original_image_masked|original_image_clean|leaf=([a-zA-Z0-9-]+))/gi;

// Only true top-level section boundaries belong here.
// Metadata fields (Scan ID, Crop, Result, Date & Time) live *inside* the header
// block — including them here caused the entire line to be consumed as a
// delimiter, silently dropping the values that follow the colon.
const SECTION_HEADERS = [
  { pattern: /=== DIAGNOSTIC REPORT ===/i, key: 'header' },
  { pattern: /###\s*SUMMARY:|^\*\*SUMMARY:\*\*\s*$|^SUMMARY:\s*$/im, key: 'summary' },
  { pattern: /###\s*PER-LEAF DETAILS:|^\*\*PER-LEAF DETAILS:\*\*\s*$|^PER-LEAF DETAILS:\s*$/im, key: 'per_leaf_details' },
  { pattern: /###\s*MANAGEMENT RECOMMENDATIONS:|^\*\*MANAGEMENT RECOMMENDATIONS:\*\*\s*$|^MANAGEMENT RECOMMENDATIONS:\s*$/im, key: 'management' },
  { pattern: /###\s*NEXT STEPS FOR USER:|^\*\*NEXT STEPS FOR USER:\*\*\s*$|^NEXT STEPS FOR USER:\s*$/im, key: 'next_steps' },
];

function extractSections(text) {
  const sections = {};
  const lines = text.split('\n');
  let currentSection = 'preamble'; // anything before the first recognised header
  let currentContent = [];

  for (const line of lines) {
    let matched = false;
    for (const header of SECTION_HEADERS) {
      if (header.pattern.test(line)) {
        if (currentContent.length > 0) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        currentSection = header.key;
        currentContent = [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

function parseHeader(scanDoc) {
  const firstScan = scanDoc.scans?.[0];
  const firstDetection = firstScan?.detections?.[0];
  const classifications = firstDetection?.classification_results?.classifications || [];
  
  const topClass = classifications
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)[0];

  // Labels are expected in the form  "Apple___Apple_scab"
  const cropMatch = topClass?.label?.match(/^([^_]+)___/);
  const crop = cropMatch ? cropMatch[1].replace(/_/g, ' ') : null;

  const resultMatch = topClass?.label?.match(/___(.+)$/);
  const result = resultMatch ? resultMatch[1].replace(/_/g, ' ') : null;

  const positiveScores = classifications.filter(c => c.score > 0);
  const avgConfidence = positiveScores.length > 0
    ? (positiveScores.reduce((sum, c) => sum + c.score, 0) / positiveScores.length * 100).toFixed(1)
    : '0.0';

  return {
    scanId: firstScan?.scan_id || 'N/A',
    crop,   // null when the label format doesn't match — AI text wins
    result, // null when the label format doesn't match — AI text wins
    date: new Date().toISOString(),
    location: firstDetection?.location || [],
    leavesAnalyzed: scanDoc.totalDetections || 0,
    primaryFinding: topClass ? `${topClass.label.replace(/_/g, ' ')} (${(topClass.score * 100).toFixed(1)}%)` : 'No disease detected',
    avgConfidence,
  };
}

function parsePerLeafDetails(text, scanDoc) {
  const leafDetails = [];
  const lines = text.split('\n');
  const allDetections = scanDoc.scans?.flatMap(s => s.detections || []) || [];

  const patterns = [
    /\*\*Leaf\s*(\d+):\*\*\s*(.+?)\s*[\((](\d+\.?\d*)%/i,
    /Leaf\s*(\d+)[\s–-]*(.+?)[\((](\d+\.?\d*)%/i,
    /leaf\s*(\d+)[\s–-]*(.+?)[\((](\d+\.?\d*)%/i,
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const leafIndex = parseInt(match[1], 10);
        const diseaseWithScore = match[2].trim();
        const confidence = parseFloat(match[3]) / 100;
        
        const diseaseMatch = diseaseWithScore.match(/(.+?)[\/\(]/);
        const disease = diseaseMatch ? diseaseMatch[1].trim() : diseaseWithScore;

        const detectionIndex = leafIndex - 1;
        const detection = allDetections[detectionIndex] || allDetections[0];
        const maskId = detection?.maskId || `leaf-${detectionIndex}`;

        leafDetails.push({
          leafIndex,
          disease,
          confidence,
          severity: confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low',
          affectedArea: null,
          maskId,
        });
        break;
      }
    }
  }

  if (leafDetails.length === 0 && allDetections.length > 0) {
    // Fix: wrap in parens so .filter() chains on the array, not on []
    const topClassifications = (allDetections[0].classification_results?.classifications || [])
      .filter(c => c.score > 0.05)
      .sort((a, b) => b.score - a.score);

    if (topClassifications.length > 0) {
      const top = topClassifications[0];
      return [{
        leafIndex: 1,
        disease: top.label.replace(/_/g, ' '),
        confidence: top.score,
        severity: top.score > 0.7 ? 'high' : top.score > 0.4 ? 'medium' : 'low',
        affectedArea: null,
        maskId: allDetections[0]?.maskId || 'leaf-0',
      }];
    }
  }

  return leafDetails;
}

function extractImageReferences(text) {
  const refs = new Set();
  let match;
  const regex = new RegExp(IMAGE_REF_REGEX.source, 'gi');
  
  while ((match = regex.exec(text)) !== null) {
    refs.add(match[0].toLowerCase());
  }

  return Array.from(refs);
}

function countEmbeddedImages(text) {
  if (!text) return 0;
  const matches = text.match(/data:image\/png;base64,/g);
  return matches ? matches.length : 0;
}

function extractHeaderFromText(headerBlock) {
  const result = {};

  if (!headerBlock) return result;

  // Match value up to the next newline (real \n) or end of string.
  // The AI output uses real newlines, so a simple [^\n]+ capture is reliable.
  const field = (label) =>
    new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, 'i');
  const fieldPlain = (label) =>
    new RegExp(`${label}:\\s*([^\\n]+)`, 'i');

  const cropMatch = headerBlock.match(field('Crop')) || headerBlock.match(fieldPlain('Crop'));
  if (cropMatch) result.crop = cropMatch[1].trim().replace(/\*\*/g, '');

  const resultMatch = headerBlock.match(field('Result')) || headerBlock.match(fieldPlain('Result'));
  if (resultMatch) result.result = resultMatch[1].trim().replace(/\*\*/g, '');

  const scanIdMatch = headerBlock.match(field('Scan ID')) || headerBlock.match(fieldPlain('Scan ID'));
  if (scanIdMatch) result.scanId = scanIdMatch[1].trim().replace(/\*\*/g, '');

  const dateMatch =
    headerBlock.match(/\*\*Date.*?:\*\*\s*([^\n]+)/i) ||
    headerBlock.match(/Date.*?:\s*([^\n]+)/i);
  if (dateMatch) result.dateFromAI = dateMatch[1].trim();

  return result;
}

export function parseAIReport(aiText, scanDoc) {
  const sections = extractSections(aiText);
  const headerFromText = extractHeaderFromText(sections.header);
  const headerFromScan = parseHeader(scanDoc);

  const header = {
    ...headerFromScan,
    ...headerFromText,
    // AI text always wins; fall back to scan-doc parse; last resort 'Unknown'
    crop:   headerFromText.crop   || headerFromScan.crop   || 'Unknown',
    result: headerFromText.result || headerFromScan.result || 'Unknown',
    scanId: headerFromText.scanId || headerFromScan.scanId,
  };

  const perLeafDetails = parsePerLeafDetails(sections.per_leaf_details || '', scanDoc);
  const embeddedImageCount = countEmbeddedImages(aiText);

  return {
    header,
    perLeafDetails,
    summary: sections.summary || '',
    managementRecommendations: sections.management || '',
    nextSteps: sections.next_steps || '',
    rawText: aiText,
    embeddedImageCount,
    imageReferences: extractImageReferences(aiText),
  };
}

export function formatSectionsForDisplay(parsedReport) {
  return {
    header: {
      title: 'Diagnostic Report',
      scanId: parsedReport.header.scanId,
      crop: parsedReport.header.crop,
      result: parsedReport.header.result || null,
      date: parsedReport.header.date,
      location: parsedReport.header.location,
      stats: {
        leavesAnalyzed: parsedReport.header.leavesAnalyzed,
        primaryFinding: parsedReport.header.primaryFinding,
        avgConfidence: `${parsedReport.header.avgConfidence}%`,
      },
    },
    summary: parsedReport.summary,
    perLeafDetails: parsedReport.perLeafDetails.map(leaf => ({
      ...leaf,
      confidenceDisplay: `${(leaf.confidence * 100).toFixed(1)}%`,
      severityBadge: leaf.severity?.toUpperCase() || 'N/A',
    })),
    management: parsedReport.managementRecommendations,
    nextSteps: parsedReport.nextSteps,
    embeddedImageCount: parsedReport.embeddedImageCount,
  };
}