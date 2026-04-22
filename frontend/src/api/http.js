const defaultBaseUrl = "http://127.0.0.1:8080";

export const getApiBaseUrl = () => {
  return import.meta.env.VITE_API_URL || defaultBaseUrl;
};

export const httpJson = async (path, { token, method, body } = {}) => {
  const baseUrl = getApiBaseUrl();
  let res;

  try {
    res = await fetch(`${baseUrl}${path}`, {
      method: method || (body ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (err) {
    throw new Error(
      `Không kết nối được backend (${baseUrl}). Hãy kiểm tra backend đang chạy và MongoDB đã bật. (${err?.message || "fetch failed"})`
    );
  }

  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!res.ok) {
    const message = data?.message || data?.raw || `HTTP ${res.status}`;
    throw new Error(message);
  }

  return data;
};
