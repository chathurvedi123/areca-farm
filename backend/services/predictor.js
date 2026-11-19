// ============================================================
// services/predictor.js
// PURPOSE: Train a price model for every (district, variety)
//          ONCE at startup, then answer predictions instantly.
//
// MODEL: Damped-trend exponential smoothing (Holt) on log prices.
//   level  = where the price is now
//   trend  = which way it is moving (slows down over time = "damped")
//   The 3 settings (alpha, beta, phi) are chosen by trying many
//   combinations and keeping the one with the smallest error at
//   7-day and 30-day horizons.
//
// HONESTY FEATURES:
//   * backtest: the model is trained on older data only and tested on
//     the last ~6 months it never saw, and compared with the dumb
//     rule "tomorrow = today". The UI shows both numbers.
//   * uncertainty: how far real prices typically moved over the same
//     period in the past (not a promise, just history).
// ============================================================
const { KARNATAKA_DISTRICTS, canonDistrict } = require("./dataset");

const DAY = 86400000;
const ALL = "All varieties";
const toDay = (iso) => Math.floor(Date.parse(iso + "T00:00:00Z") / DAY);
const fromDay = (d) => new Date(d * DAY).toISOString().slice(0, 10);

function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// ---------- Holt damped-trend helpers ----------
const damp = (phi, h) => (phi === 1 ? h : (phi * (1 - Math.pow(phi, h))) / (1 - phi));

function runFilter(y, alpha, beta, phi) {
  const n = y.length;
  const L = new Float64Array(n);
  const B = new Float64Array(n);
  L[0] = y[0];
  for (let t = 1; t < n; t++) {
    const pred = L[t - 1] + phi * B[t - 1];
    L[t] = alpha * y[t] + (1 - alpha) * pred;
    B[t] = beta * (L[t] - L[t - 1]) + (1 - beta) * phi * B[t - 1];
  }
  return { L, B };
}

function objective(y, L, B, phi, burn) {
  const n = y.length;
  const d7 = damp(phi, 7), d30 = damp(phi, 30);
  let s7 = 0, c7 = 0, s30 = 0, c30 = 0;
  for (let t = burn; t < n - 30; t++) {
    const e7 = y[t + 7] - (L[t] + B[t] * d7);
    const e30 = y[t + 30] - (L[t] + B[t] * d30);
    s7 += e7 * e7; c7++;
    s30 += e30 * e30; c30++;
  }
  return c7 && c30 ? s7 / c7 + s30 / c30 : Infinity;
}

const ALPHAS = [0.02, 0.05, 0.1, 0.2, 0.4];
const BETAS = [0.005, 0.02, 0.05, 0.1];
const PHIS = [0.85, 0.92, 0.96, 0.98, 0.99];

function fit(y) {
  const burn = Math.min(60, Math.floor(y.length / 5));
  let best = { alpha: 0.1, beta: 0.02, phi: 0.96, obj: Infinity };
  for (const alpha of ALPHAS)
    for (const beta of BETAS)
      for (const phi of PHIS) {
        const { L, B } = runFilter(y, alpha, beta, phi);
        const obj = objective(y, L, B, phi, burn);
        if (obj < best.obj) best = { alpha, beta, phi, obj };
      }
  return best;
}

// typical swing (std of log change) over h days, from history
function swingStd(y, h) {
  const n = y.length;
  if (h >= n - 10) return null;
  const stride = Math.max(1, Math.floor(h / 6));
  const v = [];
  for (let t = 0; t + h < n; t += stride) v.push(y[t + h] - y[t]);
  if (v.length < 15) return null;
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((s, x) => s + (x - mean) ** 2, 0) / v.length);
}
function swing(y, h) {
  let s = swingStd(y, h);
  if (s == null) {
    const base = Math.max(30, Math.min(365, Math.floor(y.length / 3)));
    const sb = swingStd(y, base) ?? 0.15;
    s = sb * Math.sqrt(h / base);
  }
  return Math.min(s, 0.6);
}

// out-of-sample accuracy check (parameters learned WITHOUT the last 180 days)
function backtest(y) {
  const n = y.length;
  if (n < 400) return null;
  const hold = 180;
  const p = fit(Array.from(y.slice(0, n - hold)));
  const { L, B } = runFilter(y, p.alpha, p.beta, p.phi);
  const out = {};
  for (const h of [7, 30]) {
    const d = damp(p.phi, h);
    let em = 0, en = 0, c = 0;
    for (let t = n - hold; t + h < n; t++) {
      const act = Math.exp(y[t + h]);
      em += Math.abs(Math.exp(L[t] + B[t] * d) - act) / act;
      en += Math.abs(Math.exp(y[t]) - act) / act;
      c++;
    }
    out["h" + h] = c ? { model: +((em / c) * 100).toFixed(1), naive: +((en / c) * 100).toFixed(1) } : null;
  }
  return out;
}

// ---------- build all series & train ----------
function makeSeries(dayMap) {
  const days = [...dayMap.keys()].sort((a, b) => a - b);
  const first = days[0], last = days[days.length - 1];
  if (days.length < 25 || last - first < 90) return null; // not enough history
  const n = last - first + 1;
  const la = new Float64Array(n), ll = new Float64Array(n), lh = new Float64Array(n);
  let ca, cl, ch;
  for (let i = 0; i < n; i++) {
    const o = dayMap.get(first + i);
    if (o) { ca = median(o.a); cl = median(o.lo); ch = median(o.hi); }
    la[i] = Math.log(ca); ll[i] = Math.log(cl); lh[i] = Math.log(ch);
  }
  const m = fit(la);
  const A = runFilter(la, m.alpha, m.beta, m.phi);
  const Lo = runFilter(ll, m.alpha, m.beta, m.phi);
  const Hi = runFilter(lh, m.alpha, m.beta, m.phi);
  return {
    first, last, n, days, dayMap, la, phi: m.phi,
    params: { alpha: m.alpha, beta: m.beta, phi: m.phi },
    end: {
      a: [A.L[n - 1], A.B[n - 1]],
      lo: [Lo.L[n - 1], Lo.B[n - 1]],
      hi: [Hi.L[n - 1], Hi.B[n - 1]],
    },
    backtest: backtest(la),
  };
}

function buildStore(rows) {
  const groups = new Map(); // "district|variety" -> Map(day -> bucket)
  const add = (key, day, r) => {
    let g = groups.get(key);
    if (!g) groups.set(key, (g = new Map()));
    let b = g.get(day);
    if (!b) g.set(day, (b = { a: [], lo: [], hi: [], m: new Set() }));
    b.a.push(r[6]); b.lo.push(r[4]); b.hi.push(r[5]); b.m.add(r[2]);
  };
  const varietiesOf = new Map();
  for (const r of rows) {
    const day = toDay(r[0]);
    add(r[1] + "|" + r[3], day, r);
    add(r[1] + "|" + ALL, day, r);
    if (!varietiesOf.has(r[1])) varietiesOf.set(r[1], new Set());
    varietiesOf.get(r[1]).add(r[3]);
  }
  const series = new Map();
  for (const [key, dayMap] of groups) {
    const s = makeSeries(dayMap);
    if (s) series.set(key, s);
  }
  // district -> varieties sorted by number of trading days (most traded first)
  const districts = new Map();
  for (const [d, vs] of varietiesOf) {
    const list = [...vs]
      .filter((v) => series.has(d + "|" + v))
      .sort((a, b) => series.get(d + "|" + b).days.length - series.get(d + "|" + a).days.length);
    if (list.length > 1) list.push(ALL);
    if (list.length) districts.set(d, list);
  }
  return { series, districts };
}

function snapshot(s) {
  const o = s.dayMap.get(s.last);
  return {
    date: fromDay(s.last),
    avg: Math.round(median(o.a)),
    low: Math.round(median(o.lo)),
    high: Math.round(median(o.hi)),
    markets: [...o.m],
  };
}

function listDistricts(store) {
  const known = new Set(KARNATAKA_DISTRICTS.map((d) => d.name));
  const out = KARNATAKA_DISTRICTS.map((d) => ({ name: d.name, kn: d.kn }));
  for (const name of store.districts.keys()) if (!known.has(name)) out.push({ name, kn: "" });
  return out.map((d) => {
    const vs = store.districts.get(d.name);
    if (!vs) return { ...d, hasData: false };
    const s = store.series.get(d.name + "|" + vs[0]);
    return { ...d, hasData: true, varieties: vs, defaultVariety: vs[0], latest: snapshot(s), observations: s.days.length };
  });
}

function predictFor(store, district, variety, days, todayIso) {
  const vs = store.districts.get(district);
  if (!vs) throw new Error(`No arecanut price data for ${district}`);
  const variety_ = variety && vs.includes(variety) ? variety : vs[0];
  const s = store.series.get(district + "|" + variety_);
  const today = toDay(todayIso || new Date().toISOString().slice(0, 10));
  const gap = Math.max(0, today - s.last); // days since last real data

  const at = (st, step) => Math.exp(st[0] + st[1] * damp(s.phi, step));
  const point = (dd) => {
    const step = gap + dd;
    const avg = at(s.end.a, step);
    const low = Math.min(at(s.end.lo, step), avg);
    const high = Math.max(at(s.end.hi, step), avg);
    return { date: fromDay(today + dd), avg: Math.round(avg), low: Math.round(low), high: Math.round(high) };
  };
  const steps = [];
  if (days <= 40) for (let d = 1; d <= days; d++) steps.push(d);
  else for (let i = 1; i <= 40; i++) steps.push(Math.round((days * i) / 40));
  const forecast = steps.map(point);
  const target = point(days);

  const level = Math.exp(s.end.a[0]);
  const change = (target.avg / level - 1) * 100;
  const trend = change > 1.5 ? "up" : change < -1.5 ? "down" : "stable";

  const realDays = s.days.slice(-90);
  const history = realDays.map((d) => {
    const o = s.dayMap.get(d);
    return { date: fromDay(d), avg: Math.round(median(o.a)), low: Math.round(median(o.lo)), high: Math.round(median(o.hi)) };
  });

  return {
    district, variety: variety_, varieties: vs, days,
    today: snapshot(s),
    dataAgeDays: gap,
    stale: gap > 30,
    target, forecast, history, trend,
    changePct: +change.toFixed(1),
    swingPct: +(swing(s.la, days) * 100).toFixed(1),
    backtest: s.backtest,
    observations: s.days.length,
    since: fromDay(s.first),
    model: s.params,
  };
}

module.exports = { buildStore, listDistricts, predictFor, ALL };