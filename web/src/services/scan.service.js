/**
 * services/scan.service.js
 *
 * All MongoDB operations for scan sessions.
 * Every write/read is scoped to userId so users can only access their own data.
 */

import Scan from "@/models/Scan";
import connectDB from "@/lib/pool";
import { _isBufferLike, _bufferToBase64 } from "./imageEmbed.service.js";

// ---------------------------------------------------------------------------
// findOrCreateSession
// ---------------------------------------------------------------------------
/**
 * Return the existing session document for (userId, sessionId), or create a
 * new empty one if none exists yet.
 *
 * @param {string} userId     MongoDB ObjectId string of the authenticated user.
 * @param {string} sessionId  Caller-supplied session tag.
 * @returns {Promise<import("mongoose").Document>}
 */
export async function findOrCreateSession(userId, sessionId) {
  await connectDB();

  let doc = await Scan.findOne({ userId, sessionId });

  if (!doc) {
    doc = await Scan.create({
      userId,
      sessionId,
      scans: [],
      totalDetections: 0,
      lastScannedAt: null,
      hasReport: false,
      reportId: null,
    });
  }

  return doc;
}

// ---------------------------------------------------------------------------
// appendScanEntry
// ---------------------------------------------------------------------------
/**
 * Find (or create) the session for (userId, sessionId), append one scan batch,
 * persist, and return the updated document.
 *
 * scanEntry shape:
 * {
 *   scan_id : string,          // unique id for this upload batch
 *   image   : [{
 *     location               : [number, number],   // [lng, lat]
 *     date                   : string | Date,      // capture timestamp
 *     mask                   : string,             // base64-encoded image
 *     classification_results : { classifications: [{ label, score }] }
 *   }]
 * }
 *
 * @param {string} userId
 * @param {string} sessionId
 * @param {object} scanEntry
 * @returns {Promise<import("mongoose").Document>}
 */
export async function appendScanEntry(userId, sessionId, scanEntry) {
  await connectDB();

  const doc = await findOrCreateSession(userId, sessionId);
  doc.appendScan(scanEntry);
  await doc.save();

  return doc;
}

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------
/**
 * Retrieve a single session by its MongoDB _id, scoped to userId.
 *
 * @param {string} mongoId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getSession(mongoId, userId) {
  await connectDB();

  const doc = await Scan.findOne({ _id: mongoId, userId }).lean({
    virtuals: true,
  });
  if (!doc) return null;

  return _serializeDoc(doc);
}

export async function getSessionBySessionId(sessionId, userId) {
  await connectDB();

  const doc = await Scan.findOne({ sessionId, userId }).lean({
    virtuals: true,
  });
  if (!doc) return null;

  return _serializeDoc(doc);
}

export async function markSessionHasReport(sessionId, userId, reportId) {
  await connectDB();

  const doc = await Scan.findOneAndUpdate(
    { sessionId, userId },
    { $set: { hasReport: true, reportId } },
    { new: true }
  );

  if (!doc) {
    throw new Error(`Scan session not found: ${sessionId}`);
  }

  return doc;
}

// ---------------------------------------------------------------------------
// getAllSessions
// ---------------------------------------------------------------------------
/**
 * Return all scan sessions for userId, most recent first.
 *
 * @param {string} userId
 * @param {{ sessionId?: string, limit?: number, skip?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function getAllSessions(
  userId,
  { sessionId, limit = 50, skip = 0 } = {}
) {
  await connectDB();

  const filter = { userId, ...(sessionId ? { sessionId } : {}) };

  const docs = await Scan.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean({ virtuals: true });

  return docs.map(_serializeDoc);
}

// ---------------------------------------------------------------------------
// clearSession
// ---------------------------------------------------------------------------
/**
 * Wipe all scan entries from a session while keeping the document itself.
 *
 * @param {string} mongoId
 * @param {string} userId
 * @returns {Promise<import("mongoose").Document>}
 */
export async function clearSession(mongoId, userId) {
  await connectDB();

  const doc = await Scan.findOneAndUpdate(
    { _id: mongoId, userId },
    { $set: { scans: [], totalDetections: 0, lastScannedAt: null } },
    { new: true }
  );

  if (!doc)
    throw new Error(`Scan session not found or access denied: ${mongoId}`);
  return doc;
}

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------
/**
 * Permanently delete a session document owned by userId.
 *
 * @param {string} mongoId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteSession(mongoId, userId) {
  await connectDB();

  const result = await Scan.findOneAndDelete({ _id: mongoId, userId });
  if (!result)
    throw new Error(`Scan session not found or access denied: ${mongoId}`);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert Binary mask buffers to base64 strings on lean (plain-object) docs
 * so they are safe to serialise to JSON.
 */
function _serializeDoc(doc) {
  if (!doc?.scans) return doc;

  return {
    ...doc,
    hasReport: doc.hasReport || false,
    reportId: doc.reportId || null,
    scans: doc.scans.map((scanEntry) => {
      const serializedScan = { ...scanEntry };

      if (_isBufferLike(scanEntry.original_image_masked)) {
        const b64 = _bufferToBase64(scanEntry.original_image_masked);
        if (b64) serializedScan.original_image_masked_base64 = b64;
      } else if (typeof scanEntry.original_image_masked === 'string' && scanEntry.original_image_masked.length > 100) {
        serializedScan.original_image_masked_base64 = scanEntry.original_image_masked;
      }

      if (_isBufferLike(scanEntry.original_image_clean)) {
        const b64 = _bufferToBase64(scanEntry.original_image_clean);
        if (b64) serializedScan.original_image_clean_base64 = b64;
      } else if (typeof scanEntry.original_image_clean === 'string' && scanEntry.original_image_clean.length > 100) {
        serializedScan.original_image_clean_base64 = scanEntry.original_image_clean;
      }

      serializedScan.detections = (scanEntry.detections || []).map((det) => {
        const serializedDet = { ...det };
        if (_isBufferLike(det.mask)) {
          const b64 = _bufferToBase64(det.mask);
          if (b64) serializedDet.maskBase64 = b64;
        } else if (typeof det.mask === 'string' && det.mask.length > 100) {
          serializedDet.maskBase64 = det.mask;
        }
        return serializedDet;
      });

      return serializedScan;
    }),
  };
}