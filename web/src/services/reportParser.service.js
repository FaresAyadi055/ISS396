const IMAGE_REF_REGEX = /(?:original_image_masked|original_image_clean|leaf=([a-zA-Z0-9-]+))/gi;

const SECTION_HEADERS = [
  { pattern: /=== DIAGNOSTIC REPORT ===/i, key: 'header' },
  { pattern: /\*\*SCAN ID:\*\*|SCAN ID:/i, key: 'scan_id' },
  { pattern: /\*\*CROP:\*\*|CROP:/i, key: 'crop' },
  { pattern: /\*\*DATE & TIME:\*\*|DATE & TIME:/i, key: 'date_time' },
  { pattern: /\*\*SUMMARY:\*\*|SUMMARY:/i, key: 'summary' },
  { pattern: /\*\*PER-LEAF DETAILS:\*\*|PER-LEAF DETAILS:/i, key: 'per_leaf_details' },
  { pattern: /\*\*MANAGEMENT RECOMMENDATIONS:\*\*|MANAGEMENT RECOMMENDATIONS:/i, key: 'management' },
  { pattern: /\*\*NEXT STEPS FOR USER:\*\*|NEXT STEPS FOR USER:/i, key: 'next_steps' },
];

function extractSections(text) {
  const sections = {};
  const lines = text.split('\n');
  let currentSection = 'header';
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

  const cropMatch = topClass?.label?.match(/^([^_]+)___/);
  const crop = cropMatch ? cropMatch[1].replace(/_/g, ' ') : 'Unknown';

  const positiveScores = classifications.filter(c => c.score > 0);
  const avgConfidence = positiveScores.length > 0
    ? (positiveScores.reduce((sum, c) => sum + c.score, 0) / positiveScores.length * 100).toFixed(1)
    : '0.0';

  return {
    scanId: firstScan?.scan_id || 'N/A',
    crop,
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
    const topClassifications = allDetections[0].classification_results?.classifications || []
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

function embedImages(text, scanDoc) {
  const refs = extractImageReferences(text);
  const embedded = {
    original_image_masked: null,
    original_image_clean: null,
    leaves: {},
  };

  for (const ref of refs) {
    if (ref === 'original_image_masked') {
      const base64 = scanDoc.scans?.[0]?.original_image_masked_base64;
      if (base64) {
        embedded.original_image_masked = base64;
      }
    } else if (ref === 'original_image_clean') {
      const base64 = scanDoc.scans?.[0]?.original_image_clean_base64;
      if (base64) {
        embedded.original_image_clean = base64;
      }
    } else if (ref.startsWith('leaf=')) {
      const maskId = ref.replace('leaf=', '');
      const detection = scanDoc.scans
        ?.flatMap(s => s.detections || [])
        .find(d => d.maskId === maskId);
      
      if (detection?.maskBase64) {
        embedded.leaves[maskId] = detection.maskBase64;
      }
    }
  }

  return embedded;
}

export function parseAIReport(aiText, scanDoc) {
  const sections = extractSections(aiText);
  const header = parseHeader(scanDoc);
  const perLeafDetails = parsePerLeafDetails(sections.per_leaf_details || '', scanDoc);
  const embeddedImages = embedImages(aiText, scanDoc);

  return {
    header,
    perLeafDetails,
    summary: sections.summary || '',
    managementRecommendations: sections.management || '',
    nextSteps: sections.next_steps || '',
    rawText: aiText,
    embeddedImages,
  };
}

export function formatSectionsForDisplay(parsedReport) {
  return {
    header: {
      title: 'Diagnostic Report',
      scanId: parsedReport.header.scanId,
      crop: parsedReport.header.crop,
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
    images: parsedReport.embeddedImages,
  };
}
