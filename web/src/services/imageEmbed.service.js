function _isBufferLike(value) {
  if (!value) return false;
  if (value instanceof Buffer) return true;
  if (value._bsontype === 'Binary' || value._bsontype === 'BinaryLike') return true;
  if (value.constructor?.name === 'Binary') return true;
  return false;
}

function _bufferToBase64(value) {
  if (!value) return null;
  if (value instanceof Buffer) return value.toString('base64');
  if (typeof value.toString === 'function') {
    const str = value.toString('base64');
    if (str && str.length > 100) return str;
  }
  return null;
}

function _getImageBase64(value) {
  if (!value) return null;
  if (typeof value === 'string' && value.length > 100) return value;
  if (_isBufferLike(value)) return _bufferToBase64(value);
  return null;
}

function _getMaskBase64(det) {
  if (!det) return null;
  if (det.maskBase64) return det.maskBase64;
  if (_isBufferLike(det.mask)) return _bufferToBase64(det.mask);
  return null;
}

function embedImagesInText(text, scanDoc) {
  if (!text || !scanDoc?.scans?.length) return text;

  const firstScan = scanDoc.scans[0];

  const maskedBase64 = firstScan?.original_image_masked_base64
    || _getImageBase64(firstScan?.original_image_masked);
  if (maskedBase64 && !text.includes('data:image/png;base64,')) {
    const maskedRef = /!\[.*?\]\(original_image_masked\)/g;
    if (maskedRef.test(text) || text.includes('original_image_masked')) {
      text = text.replace(
        /!\[(.*?)\]\(original_image_masked\)/g,
        `![$1](data:image/png;base64,${maskedBase64})`
      );
      text = text.replace(
        /original_image_masked(?!\))/g,
        `(data:image/png;base64,${maskedBase64})`
      );
    }
  }

  const cleanBase64 = firstScan?.original_image_clean_base64
    || _getImageBase64(firstScan?.original_image_clean);
  if (cleanBase64) {
    text = text.replace(
      /!\[(.*?)\]\(original_image_clean\)/g,
      `![$1](data:image/png;base64,${cleanBase64})`
    );
    text = text.replace(/(?<!data:image\/png;base64,)original_image_clean(?!\))/g, 
      `(data:image/png;base64,${cleanBase64})`
    );
  }

  const allDetections = scanDoc.scans.flatMap(s => s.detections || []);
  allDetections.forEach((det, i) => {
    const maskId = det.maskId || `leaf-${i}`;
    const maskBase64 = _getMaskBase64(det);
    
    if (maskBase64) {
      const leafPattern = new RegExp(
        `!\\[([^\\]]*)\\]\\(leaf=${maskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
        'g'
      );
      text = text.replace(leafPattern, `![$1](data:image/png;base64,${maskBase64})`);
      
      const leafRefPattern = new RegExp(`leaf=${maskId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?!\\))`, 'g');
      text = text.replace(leafRefPattern, `(data:image/png;base64,${maskBase64})`);
    }
  });

  return text;
}

function getEmbeddedImageCount(text) {
  if (!text) return 0;
  const matches = text.match(/data:image\/png;base64,/g);
  return matches ? matches.length : 0;
}

export { embedImagesInText, getEmbeddedImageCount, _isBufferLike, _bufferToBase64 };
