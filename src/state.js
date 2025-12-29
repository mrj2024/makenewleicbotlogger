// src/state.js
const STORE = new Map();

/**
 * Save a payload under a token for TTL ms.
 */
function put(token, payload, ttlMs = 10 * 60 * 1000) {
  STORE.set(token, { payload, expiresAt: Date.now() + ttlMs });
}

/**
 * Get payload for token if not expired.
 */
function get(token) {
  const hit = STORE.get(token);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    STORE.delete(token);
    return null;
  }
  return hit.payload;
}

/**
 * Delete token.
 */
function del(token) {
  STORE.delete(token);
}

/**
 * Cleanup expired items occasionally.
 */
function sweep() {
  const now = Date.now();
  for (const [k, v] of STORE.entries()) {
    if (v.expiresAt <= now) STORE.delete(k);
  }
}

module.exports = { put, get, del, sweep };
