export const API_BASE = "http://localhost:8000";

async function readResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("SafeScan received an unreadable response. Try again in a moment.");
  }

  if (!response.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : null;
    throw new Error(detail || "SafeScan couldn't complete this request. Try again.");
  }
  return data;
}

export async function postScan(formData) {
  const response = await fetch(`${API_BASE}/scan`, {
    method: "POST",
    body: formData,
  });
  return readResponse(response);
}

export async function getScan(id) {
  const response = await fetch(`${API_BASE}/scan/${encodeURIComponent(id)}`);
  return readResponse(response);
}
