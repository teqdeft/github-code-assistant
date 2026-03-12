import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export const authAPI = {
  register: (d) => api.post("/auth/register", d),
  login: (d) => api.post("/auth/login", d),
  me: () => api.get("/auth/me"),
};

export const reposAPI = {
  index: (d) => api.post("/repos/index", d),
  list: () => api.get("/repos/"),
  get: (id) => api.get(`/repos/${id}`),
  delete: (id) => api.delete(`/repos/${id}`),
};

export const chatAPI = {
  ask: (d) => api.post("/chat/ask", d),
  history: (rid) => api.get(`/chat/history/${rid}`),
  clearHistory: (rid) => api.delete(`/chat/history/${rid}`),
};

export default api;
