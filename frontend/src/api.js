import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  timeout: 60000,
});

function extractError(err) {
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || "Unknown error";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join("; ");
  }
  return JSON.stringify(detail);
}

export async function submitApplication(formData) {
  try {
    const response = await api.post("/api/apply", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: extractError(err) };
  }
}

export async function getApplication(id) {
  try {
    const response = await api.get(`/api/application/${id}`);
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: extractError(err) };
  }
}

export async function listApplications() {
  try {
    const response = await api.get("/api/applications");
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: extractError(err) };
  }
}

export async function runDemo(scenario) {
  try {
    const response = await api.post(`/api/demo/${scenario}`);
    return { data: response.data, error: null };
  } catch (err) {
    return { data: null, error: extractError(err) };
  }
}

export default api;
