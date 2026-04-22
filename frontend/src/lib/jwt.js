const base64UrlToBase64 = (input) => {
  const padded = input.padEnd(input.length + ((4 - (input.length % 4)) % 4), "=");
  return padded.replace(/-/g, "+").replace(/_/g, "/");
};

export const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(base64UrlToBase64(parts[1])));
    return payload;
  } catch {
    return null;
  }
};

