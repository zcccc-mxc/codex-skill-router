const EXCLUSION_MARKERS = [
  "do not use",
  "not use",
  "avoid",
  "not for",
  "不要",
  "不适用",
  "避免",
  "不要用于",
];

function markerIndexes(description) {
  const normalized = description.toLowerCase();
  return EXCLUSION_MARKERS.map((marker) => normalized.indexOf(marker)).filter((index) => index >= 0);
}

function extractApplicabilityText(description = "") {
  const indexes = markerIndexes(description);

  if (indexes.length === 0) {
    return description;
  }

  return description.slice(0, Math.min(...indexes));
}

function extractExclusionText(description = "") {
  const normalized = description.toLowerCase();
  const parts = [];

  for (const marker of EXCLUSION_MARKERS) {
    const index = normalized.indexOf(marker);
    if (index >= 0) {
      parts.push(description.slice(index));
    }
  }

  return parts.join(" ");
}

function hasExclusionMarker(description = "") {
  const normalized = description.toLowerCase();
  return EXCLUSION_MARKERS.some((marker) => normalized.includes(marker));
}

module.exports = {
  EXCLUSION_MARKERS,
  extractApplicabilityText,
  extractExclusionText,
  hasExclusionMarker,
};
