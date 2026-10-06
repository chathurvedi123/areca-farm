export const ARECA_PRICE_DATA = [
  { date: "2022-06-28", avg: 14000, high: 16800, low: 11200 },
  { date: "2022-12-28", avg: 16400, high: 19200, low: 13600 },
  { date: "2023-06-28", avg: 18800, high: 21600, low: 16000 },
  { date: "2023-12-28", avg: 21200, high: 24000, low: 18400 },
  { date: "2024-03-28", avg: 22800, high: 25600, low: 20000 },
  { date: "2024-06-28", avg: 25200, high: 28000, low: 22400 },
  { date: "2024-09-28", avg: 28800, high: 31600, low: 26000 },
  { date: "2024-12-28", avg: 32400, high: 35200, low: 29600 },
  { date: "2025-03-28", avg: 36000, high: 38800, low: 33200 },
  { date: "2025-06-25", avg: 43600, high: 46400, low: 40800 },
  { date: "2025-09-28", avg: 56800, high: 59600, low: 54000 },
  { date: "2025-10-15", avg: 66857, high: 67569, low: 60019 },
  { date: "2025-10-31", avg: 58696, high: 62231, low: 50236 },
  { date: "2025-11-21", avg: 58699, high: 60555, low: 57212 },
  { date: "2025-12-29", avg: 57256, high: 58359, low: 56012 },
  { date: "2026-01-09", avg: 56074, high: 57599, low: 48700 },
  { date: "2026-01-30", avg: 53975, high: 56299, low: 33700 },
  { date: "2026-02-27", avg: 55162, high: 56699, low: 51012 },
  { date: "2026-03-30", avg: 53425, high: 55699, low: 45399 },
  { date: "2026-04-29", avg: 54253, high: 55900, low: 48099 },
  { date: "2026-05-29", avg: 51680, high: 54009, low: 40000 },
  { date: "2026-06-10", avg: 52196, high: 54199, low: 40000 },
  { date: "2026-06-15", avg: 52512, high: 54100, low: 45099 },
].sort((a, b) => new Date(a.date) - new Date(b.date));

export const predictDay = (daysAhead = 0) => {
  const latest      = ARECA_PRICE_DATA[ARECA_PRICE_DATA.length - 1];
  const latestPrice = latest.avg;
  const recent      = ARECA_PRICE_DATA.slice(-6).map((d) => d.avg);
  const diffs       = recent.slice(1).map((p, i) => p - recent[i]);
  const avgDrift    = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const cappedDrift = Math.max(-1500, Math.min(1500, avgDrift));
  const decay       = Math.exp(-daysAhead / 10);
  const predicted   = Math.round(latestPrice + cappedDrift * daysAhead * decay);
  const futureDate  = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const spread = Math.round(predicted * (0.01 + daysAhead * 0.003));
  return {
    predicted,
    low:   predicted - spread,
    high:  predicted + spread,
    date:  futureDate,
    trend: cappedDrift > 200 ? "up" : cappedDrift < -200 ? "down" : "stable",
  };
};

export const get7DayForecast = () =>
  Array.from({ length: 7 }, (_, i) => predictDay(i + 1));