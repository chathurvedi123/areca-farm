import axios from "axios";

const API = axios.create({
  baseURL: "https://areca-farm.onrender.com",
  timeout: 10000,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("areca_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const register          = (data) => API.post("/auth/register", data);
export const login             = (data) => API.post("/auth/login", data);
export const verifyManagerCode = (data) => API.post("/auth/verify-manager-code", data);

export const getOwnerStats    = ()   => API.get("/owner/stats");
export const generateCode     = ()   => API.post("/owner/generate-code");

export const getWorkers   = (company, managerName) => API.get("/workers", { params: { company, managerName } });
export const getMyWorker  = (company, managerName, name) => API.get("/workers/my", { params: { company, managerName, name } });
export const addWorkerRow = (data) => API.post("/workers", data);

export const getFarmers   = (company, managerName) => API.get("/farmers", { params: { company, managerName } });
export const getMyFarmer  = (company, managerName, name) => API.get("/farmers/my", { params: { company, managerName, name } });
export const addFarmerRow = (data) => API.post("/farmers", data);

export default API;