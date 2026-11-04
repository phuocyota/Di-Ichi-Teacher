import axios from "axios";
import { clearAuthSession, getAccessToken } from "./authSession.js";
import { API_BASE_URL } from "./apiConfig.js";
import { localizedLoginPath } from '../i18n/localeRouting.js';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data?.data ?? response.data,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== "/auth/staff/login"
    ) {
      clearAuthSession();
      if (window.location.pathname !== localizedLoginPath())
        window.location.assign(localizedLoginPath());
    }
    return Promise.reject(error);
  },
);
