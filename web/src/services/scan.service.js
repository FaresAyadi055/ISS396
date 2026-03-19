/**
 * services/scan.service.js
 *
 * All MongoDB operations for scan sessions.
 * Every write/read is scoped to a userId so users can only access their own data.
 */

import Scan from "@/models/Scan";
import connectDB from "@/lib/pool";

// ---------------------------------------------------------------------------
// createSession
// ---------------------------------------------------------------------------
/**
 * Create a new empty scan session document owned by `userId`.
 *
 * @param {string}  userId     MongoDB ObjectId string of the authenticated user.
 * @param {string} [sessionId] Optional caller-supplied tag.
 * @returns {Promise<import("mongoose").Document>}
 */
export async function createSession(userId, sessionId = null) {
  await connectDB();

  const doc = await Scan.create({
    userId,
    sessionId: sessionId || undefined,
    scans:            [],
    totalDetections:  0,
    lastScannedAt:    null,
  });

  return doc;
}

// ---------------------------------------------------------------------------
// appendScanResult
// ---------------------------------------------------------------------------
/**
 * Append one FastAPI scan_entry to an existing session and persist.
 * Enforces ownership: throws if the document does not belong to `userId`.
 *
 * @param {string} mongoId   MongoDB _id of the Scan document.
 * @param {string} userId    Authenticated user's ObjectId string.
 * @param {object} scanEntry FastAPI POST /scan response body:
 *   { scan_id, detections_count, image: [{mask, classification_results}] }
 * @returns {Promise<import("mongoose").Document>}
 */
export async function appendScanResult(mongoId, userId, scanEntry) {
  await connectDB();

  const doc = await Scan.findOne({ _id: mongoId, userId });
  if (!doc) throw new Error(`Scan session not found or access denied: ${mongoId}`);

  doc.appendScan(scanEntry);
  await doc.save();

  return doc;
}

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------
/**
 * Retrieve a single session by its MongoDB _id, scoped to `userId`.
 *
 * @param {string} mongoId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
export async function getSession(mongoId, userId) {
  await connectDB();

  const doc = await Scan.findOne({ _id: mongoId, userId }).lean({ virtuals: true });
  if (!doc) return null;

  return _serializeDoc(doc);
}

// ---------------------------------------------------------------------------
// getAllSessions
// ---------------------------------------------------------------------------
/**
 * Return all scan sessions for `userId`, most recent first.
 *
 * @param {string} userId
 * @param {{ sessionId?: string, limit?: number, skip?: number }} opts
 * @returns {Promise<object[]>}
 */
export async function getAllSessions(userId, { sessionId, limit = 50, skip = 0 } = {}) {
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
 * Wipe all scan entries from a session, keeping the document itself.
 * Scoped to `userId` — a user cannot clear another user's session.
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

  if (!doc) throw new Error(`Scan session not found or access denied: ${mongoId}`);
  return doc;
}

// ---------------------------------------------------------------------------
// deleteSession
// ---------------------------------------------------------------------------
/**
 * Permanently delete a session document owned by `userId`.
 *
 * @param {string} mongoId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function deleteSession(mongoId, userId) {
  await connectDB();

  const result = await Scan.findOneAndDelete({ _id: mongoId, userId });
  if (!result) throw new Error(`Scan session not found or access denied: ${mongoId}`);
}

// ---------------------------------------------------------------------------
// Internal: convert Buffer masks to base64 strings on lean docs
// ---------------------------------------------------------------------------
function _serializeDoc(doc) {
  if (!doc?.scans) return doc;

  return {
    ...doc,
    scans: doc.scans.map((scanEntry) => ({
      ...scanEntry,
      image: (scanEntry.image || []).map((det) => ({
        ...det,
        mask:
          det.mask instanceof Buffer
            ? det.mask.toString("base64")
            : det.maskBase64 ?? det.mask,
      })),
    })),
  };
}