import axios from "axios";
import { auth } from "../firebase/firebase";

const api = axios.create();

api.interceptors.request.use(async (config) => {
  if (!auth.currentUser) {
    const error = new Error("Please sign in to continue.");
    error.response = { status: 401 };
    throw error;
  }
  const token = await auth.currentUser.getIdToken();
  localStorage.setItem("self_care_token", token);
  config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return config;
});

api.interceptors.response.use(response => response, async error => {
  if (error.response?.status === 401 && error.config &&
      !error.config.retriedAuth && auth.currentUser) {
    error.config.retriedAuth = true;
    await auth.currentUser.getIdToken(true);
    return api.request(error.config);
  }
  throw error;
});

export default api;
