function normalizeTarget(input) {
  return String(input || "").trim().toLowerCase();
}

function parseEvidence(raw) {
  if (!raw) return [];
  const parts = String(raw)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return parts.filter((p) => /^https?:\/\/\S+$/i.test(p)).slice(0, 5);
}

function clampEmbedField(value, max = 1024) {
  if (!value) return "_None_";
  const s = String(value);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

module.exports = { normalizeTarget, parseEvidence, clampEmbedField };
