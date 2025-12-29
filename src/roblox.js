const config = require("./config");

// Simple in-memory cache: key -> { value, expiresAtMs }
const CACHE = new Map();

function nowMs() {
  return Date.now();
}

function ttlMs() {
  const s = Math.max(60, Number(config.roblox.cacheTtlSeconds || 1800));
  return s * 1000;
}

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (hit.expiresAtMs <= nowMs()) {
    CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  CACHE.set(key, { value, expiresAtMs: nowMs() + ttlMs() });
}

async function robloxFetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Roblox API ${res.status} ${url} :: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function looksLikeUserId(input) {
  return /^\d{1,12}$/.test(String(input).trim());
}

/**
 * Resolve Roblox user from username OR userId
 * Returns: { userId, name, displayName }
 */
async function resolveUser(input) {
  const trimmed = String(input).trim();
  if (!trimmed) throw new Error("Empty Roblox target input.");

  const cacheKey = `user:${trimmed.toLowerCase()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  let user;

  if (looksLikeUserId(trimmed)) {
    const userId = Number(trimmed);
    const data = await robloxFetchJson(`https://users.roblox.com/v1/users/${userId}`);
    user = { userId: data.id, name: data.name, displayName: data.displayName };
  } else {
    const payload = { usernames: [trimmed], excludeBannedUsers: false };
    const data = await robloxFetchJson("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const found = data?.data?.[0];
    if (!found) throw new Error(`Roblox user not found for "${trimmed}"`);
    user = { userId: found.id, name: found.name, displayName: found.displayName };
  }

  // Seed cache with multiple keys
  cacheSet(cacheKey, user);
  cacheSet(`user:${String(user.userId)}`, user);
  cacheSet(`user:${user.name.toLowerCase()}`, user);

  return user;
}

/**
 * Get avatar headshot URL (420x420 PNG)
 */
async function getHeadshotUrl(userId) {
  const id = Number(userId);
  if (!id) return null;

  const cacheKey = `headshot:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const url =
    `https://thumbnails.roblox.com/v1/users/avatar-headshot` +
    `?userIds=${encodeURIComponent(id)}` +
    `&size=420x420&format=Png&isCircular=false`;

  const data = await robloxFetchJson(url);
  const imageUrl = data?.data?.[0]?.imageUrl ?? null;

  cacheSet(cacheKey, imageUrl);
  return imageUrl;
}

/**
 * Get user's role/rank in a specific group
 * Returns: { groupId, roleName, rank } or null if not in group
 */
async function getGroupRole(userId, groupId) {
  const id = Number(userId);
  const gid = Number(groupId);
  if (!id || !gid) return null;

  const cacheKey = `grouprole:${gid}:${id}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  const data = await robloxFetchJson(`https://groups.roblox.com/v2/users/${id}/groups/roles`);
  const entry = (data?.data || []).find((x) => Number(x.group?.id) === gid);

  const role = entry
    ? { groupId: gid, roleName: entry.role?.name ?? "Unknown", rank: entry.role?.rank ?? null }
    : null;

  cacheSet(cacheKey, role);
  return role;
}

module.exports = {
  resolveUser,
  getHeadshotUrl,
  getGroupRole,
};
