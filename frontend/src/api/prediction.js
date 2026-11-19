// ============================================================
// api/prediction.js
// The browser no longer holds any price data or does any maths.
// The backend loads D:\dataset for areca\dataset.xlsx once, trains once,
// and these functions just ask it for answers.
// ============================================================
import API from "./client";

export const PERIODS = [
  { id: "d1",  label: "1 Day",    days: 1,    icon: "🔮" },
  { id: "w1",  label: "1 Week",   days: 7,    icon: "📅" },
  { id: "m1",  label: "1 Month",  days: 30,   icon: "🗓️" },
  { id: "m3",  label: "3 Months", days: 90,   icon: "📆" },
  { id: "m6",  label: "6 Months", days: 180,  icon: "📆" },
  { id: "y1",  label: "1 Year",   days: 365,  icon: "🗃️" },
  { id: "y5",  label: "5 Years",  days: 1825, icon: "🔭" },
];

export const getPriceStatus = () => API.get("/prices/status").then((r) => r.data);
export const getDistricts   = () => API.get("/prices/districts").then((r) => r.data);
export const getForecast    = (district, variety, days) =>
  API.get("/prices/predict", { params: { district, variety, days } }).then((r) => r.data);
export const refreshPrices  = () =>
  API.post("/prices/refresh", {}, { timeout: 180000 }).then((r) => r.data);