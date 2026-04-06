function normalizeOriginValue(origin) {
  if (typeof origin !== "string") {
    return "";
  }

  return origin.trim().replace(/\/+$/, "");
}

function parseAllowedOrigins(rawOrigins) {
  const fallbackOrigins = ["http://localhost:5173"];

  if (!rawOrigins || typeof rawOrigins !== "string") {
    return fallbackOrigins;
  }

  const parsedOrigins = rawOrigins
    .split(",")
    .map((origin) => normalizeOriginValue(origin))
    .filter(Boolean);

  return parsedOrigins.length ? parsedOrigins : fallbackOrigins;
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) {
    return true;
  }

  if (allowedOrigins.includes("*")) {
    return true;
  }

  return allowedOrigins.includes(normalizeOriginValue(origin));
}

function createOriginValidator(allowedOrigins) {
  return function validateOrigin(origin, callback) {
    if (isOriginAllowed(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin || "unknown"}`));
  };
}

module.exports = {
  createOriginValidator,
  isOriginAllowed,
  parseAllowedOrigins,
};
