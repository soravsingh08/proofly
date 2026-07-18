import axios from "axios";

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5001";

const api = axios.create({ baseURL: `${API_URL}/api` });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("proofly_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// global 401 handler (edge case A4)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem("proofly_token")) {
      localStorage.removeItem("proofly_token");
      localStorage.removeItem("proofly_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// uniform error message extraction
export function errMsg(err, fallback = "Something went wrong") {
  return err?.response?.data?.error || fallback;
}

export default api;
