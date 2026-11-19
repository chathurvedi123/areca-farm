import { useState, useEffect, useCallback } from "react";
import { PERIODS, getPriceStatus, getDistricts, getForecast, refreshPrices } from "../api/prediction";

const rs = (v) => "₹" + Math.round(v).toLocaleString("en-IN");
const k  = (v) => "₹" + Math.round(v / 1000) + "k";
const fmtDate = (iso, long) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("en-IN", long
    ? { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }
    : { day: "numeric", month: "short", timeZone: "UTC" });

// ── Chart: recent real prices + forecast (avg line, low–high band) ──
function Chart({ history, forecast, color }) {
  const W = 700, H = 230, PX = 54, PY = 18;
  const T = (s) => Date.parse(s + "T00:00:00Z");
  const hist = history.slice(-60).map((h) => ({ t: T(h.date), ...h }));
  const fc = forecast.map((f) => ({ t: T(f.date), ...f }));
  if (!hist.length || !fc.length) return null;
  const anchor = hist[hist.length - 1];
  const all = [...hist, ...fc];
  const t0 = Math.min(...all.map((p) => p.t)), t1 = Math.max(...all.map((p) => p.t));
  const vMax = Math.max(...all.map((p) => p.high)) * 1.03;
  const vMin = Math.min(...all.map((p) => p.low)) * 0.97;
  const x = (t) => PX + ((t - t0) / (t1 - t0 || 1)) * (W - PX * 2);
  const y = (v) => PY + (H - PY * 2 - 18) * (1 - (v - vMin) / (vMax - vMin || 1));
  const line = (arr, key) => arr.map((p) => `${x(p.t)},${y(p[key])}`).join(" ");
  const fcLine = [{ ...anchor }, ...fc];
  const band = [
    ...[{ t: anchor.t, high: anchor.avg }, ...fc].map((p) => `${x(p.t)},${y(p.high)}`),
    ...[...[{ t: anchor.t, low: anchor.avg }, ...fc]].reverse().map((p) => `${x(p.t)},${y(p.low)}`),
  ].join(" ");
  const long = t1 - t0 > 300 * 86400000;
  const ticks = [0, 1, 2, 3].map((i) => t0 + ((t1 - t0) * i) / 3);
  const tickLbl = (t) => new Date(t).toLocaleDateString("en-IN", long
    ? { month: "short", year: "2-digit", timeZone: "UTC" } : { day: "numeric", month: "short", timeZone: "UTC" });
  const lastF = fc[fc.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[vMin, (vMin + vMax) / 2, vMax].map((v, i) => (
        <g key={i}>
          <line x1={PX} y1={y(v)} x2={W - PX} y2={y(v)} stroke="#e2e8f0" strokeDasharray="3,3" />
          <text x={PX - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#94a3b8">{k(v)}</text>
        </g>
      ))}
      <polygon points={band} fill={color} opacity="0.15" />
      <polyline points={line(hist, "avg")} fill="none" stroke="#64748b" strokeWidth="2" strokeLinejoin="round" />
      <polyline points={line(fcLine, "avg")} fill="none" stroke={color} strokeWidth="2.6" strokeDasharray="6,3" strokeLinejoin="round" />
      <line x1={x(anchor.t)} y1={PY} x2={x(anchor.t)} y2={H - 22} stroke="#94a3b8" strokeDasharray="2,3" />
      <circle cx={x(anchor.t)} cy={y(anchor.avg)} r="4" fill="#64748b" />
      <circle cx={x(lastF.t)} cy={y(lastF.avg)} r="5" fill={color} />
      <text x={Math.min(x(lastF.t), W - PX)} y={y(lastF.avg) - 9} textAnchor="end" fontSize="10" fontWeight="700" fill={color}>{k(lastF.avg)}</text>
      {ticks.map((t, i) => (
        <text key={i} x={x(t)} y={H - 4} textAnchor={i === 0 ? "start" : i === 3 ? "end" : "middle"} fontSize="10" fill="#94a3b8">{tickLbl(t)}</text>
      ))}
    </svg>
  );
}

const Box = ({ label, value, color, note, big }) => (
  <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 10, padding: 14, textAlign: "center" }}>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: big ? 32 : 26, fontWeight: 900, color, lineHeight: 1 }}>{k(value)}</div>
    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>{rs(value)}</div>
    {note && <div style={{ fontSize: 9, color, marginTop: 5, fontWeight: 700 }}>{note}</div>}
  </div>
);

export default function PredictionPanel() {
  const [step, setStep] = useState("district");
  const [districts, setDistricts] = useState(null);
  const [loadMsg, setLoadMsg] = useState("Loading price dataset...");
  const [loadErr, setLoadErr] = useState("");
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState(null);
  const [variety, setVariety] = useState(null);
  const [info, setInfo] = useState(null);      // today's prices (1-day call)
  const [period, setPeriod] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updMsg, setUpdMsg] = useState("");

  // wait until the backend has loaded + trained (it does this once at start)
  const loadDistricts = useCallback(async () => {
    try {
      setDistricts(await getDistricts());
      setLoadErr("");
    } catch (e) {
      if (e.response?.status === 503) {
        setLoadMsg("Backend is loading the dataset and training the model...");
        setTimeout(loadDistricts, 2500);
      } else {
        let hint = e.response?.data?.error || e.message;
        try { const s = await getPriceStatus(); if (s.error) hint = s.error; } catch (_) {}
        setLoadErr(hint);
      }
    }
  }, []);
  useEffect(() => { loadDistricts(); }, [loadDistricts]);

  const loadInfo = async (d, v) => {
    setBusy(true); setError("");
    try { setInfo(await getForecast(d, v, 1)); }
    catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  const pickDistrict = async (d) => {
    setDistrict(d.name); setVariety(null); setInfo(null); setStep("period");
    await loadInfo(d.name, undefined);
  };
  const pickVariety = (v) => { setVariety(v); loadInfo(district, v); };
  const pickPeriod = async (p) => {
    setBusy(true); setError(""); setPeriod(p);
    try { setResult(await getForecast(district, info.variety, p.days)); setStep("result"); }
    catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };
  const updateData = async () => {
    setBusy(true); setUpdMsg("Fetching latest prices from commodityonline...");
    try {
      const r = await refreshPrices();
      setUpdMsg(r.busy ? "An update is already running." :
        `Fetched ${r.fetched} rows · ${r.added} new added to dataset.htm` + (r.errors?.length ? ` · ${r.errors.length} page(s) failed (${r.errors[0]})` : ""));
      await loadDistricts();
      if (district) await loadInfo(district, info?.variety);
    } catch (e) { setUpdMsg("Update failed: " + (e.response?.data?.error || e.message)); }
    finally { setBusy(false); }
  };
  const reset = () => { setStep("district"); setDistrict(null); setInfo(null); setResult(null); setError(""); };

  // ── loading / error screens ──
  if (loadErr) return (
    <div className="panel" style={{ padding: 28 }}>
      <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>⚠️ Price data is not available</div>
      <div style={{ fontSize: 13, color: "var(--danger)", marginBottom: 12 }}>{loadErr}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14 }}>
        Check that the backend is running and that <b>D:\dataset for areca\dataset.xlsx</b> exists (or set DATASET_PATH in backend/.env).
      </div>
      <button className="btn btn-primary btn-sm" onClick={() => { setLoadErr(""); loadDistricts(); }}>Try again</button>
    </div>
  );
  if (!districts) return (
    <div className="panel" style={{ textAlign: "center", padding: 40 }}>
      <div className="spinner" style={{ margin: "0 auto 14px" }} />
      <div style={{ fontWeight: 800 }}>{loadMsg}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>This happens once when the backend starts.</div>
    </div>
  );

  // ── STEP 1: DISTRICT ──
  if (step === "district") {
    const q = search.trim().toLowerCase();
    const list = districts
      .filter((d) => !q || d.name.toLowerCase().includes(q) || (d.kn || "").includes(q))
      .sort((a, b) => Number(b.hasData) - Number(a.hasData) || a.name.localeCompare(b.name));
    return (
      <div>
        <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>📍 Step 1 — Select your District</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          All Karnataka districts · districts with arecanut price data are shown first
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <input placeholder="Search district..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}>
          {list.map((d) => (
            <div key={d.name} onClick={() => d.hasData && pickDistrict(d)} style={{
              border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px",
              background: d.hasData ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.5)",
              cursor: d.hasData ? "pointer" : "not-allowed", opacity: d.hasData ? 1 : 0.55,
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{d.name}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{d.kn}</div>
              {d.hasData ? (
                <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800, color: "var(--brand-dark)" }}>
                  {rs(d.latest.avg)} <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>· {fmtDate(d.latest.date)}</span>
                </div>
              ) : <div style={{ marginTop: 6, fontSize: 11, color: "var(--muted)" }}>No arecanut data</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── STEP 2: TODAY'S PRICE + PERIOD ──
  if (step === "period") return (
    <div>
      <button className="btn btn-secondary btn-sm" style={{ marginBottom: 14 }} onClick={reset}>← Change district</button>
      {error && <div className="msg-error">{error}</div>}
      {!info ? (
        <div className="panel" style={{ textAlign: "center", padding: 30 }}><div className="spinner" style={{ margin: "0 auto" }} /></div>
      ) : (
        <>
          <div className="pred-hero">
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
              📡 {district} · {info.variety} · latest market price
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
              Data date: {fmtDate(info.today.date, true)} · {info.today.markets.slice(0, 3).join(", ")}
              {info.stale && <span style={{ color: "#ffd166" }}> · ⚠️ latest data is {info.dataAgeDays} days old</span>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Box label="📊 AVG (ಸರಾಸರಿ)" value={info.today.avg} color="#a8e068" note="★ Sell target" big />
              <Box label="↑ HIGH (ಗರಿಷ್ಠ)" value={info.today.high} color="#a8e068" />
              <Box label="↓ LOW (ಕನಿಷ್ಠ)" value={info.today.low} color="#ff9090" />
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
              Model trained on {info.observations} trading days since {fmtDate(info.since, true)}
            </div>
          </div>

          {info.varieties.length > 1 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>Variety</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {info.varieties.map((v) => (
                  <button key={v} className={`tab ${info.variety === v ? "active" : ""}`} onClick={() => pickVariety(v)} disabled={busy}>{v}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>📅 Step 2 — How far ahead?</div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>Choose the prediction period</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
            {PERIODS.map((p) => (
              <button key={p.id} className="btn btn-primary" disabled={busy} onClick={() => pickPeriod(p)}
                style={{ flexDirection: "column", padding: "14px 8px", gap: 4 }}>
                <span style={{ fontSize: 22 }}>{p.icon}</span>
                <span style={{ fontWeight: 800 }}>{p.label}</span>
              </button>
            ))}
          </div>

          <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--line)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn-secondary btn-sm" disabled={busy} onClick={updateData}>🔄 Update today's prices</button>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{updMsg}</span>
          </div>
        </>
      )}
    </div>
  );

  // ── STEP 3: RESULT ──
  if (step === "result" && result) {
    const r = result;
    const up = r.trend === "up", down = r.trend === "down";
    const kn = up ? "ಬೆಲೆ ಏರುವ ಸಾಧ್ಯತೆ — ಮಾರಾಟ ತಡೆಯಬಹುದು 🟢"
      : down ? "ಬೆಲೆ ಇಳಿಯುವ ಸಾಧ್ಯತೆ — ಬೇಗ ಮಾರುವುದು ಉತ್ತಮ 🔴" : "ಬೆಲೆ ಸ್ಥಿರ — ನಿರ್ಧಾರ ನಿಮ್ಮದು 🟡";
    const en = up ? "Price likely to rise — consider holding" : down ? "Price likely to fall — consider selling soon" : "Price likely stable — your call";
    const color = "#1f7a4d";
    const bt = r.backtest;
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setStep("period")}>← Change period</button>
          <button className="btn btn-secondary btn-sm" onClick={reset}>🔄 Start over</button>
        </div>

        <div className="pred-hero">
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
            🤖 Prediction · {r.district} · {r.variety} · {period?.label}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>For {fmtDate(r.target.date, true)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
            <Box label="📊 AVG (ಸರಾಸರಿ)" value={r.target.avg} color="#a8e068" note="★ Most farmers sell at avg" big />
            <Box label="↑ HIGH (ಗರಿಷ್ಠ)" value={r.target.high} color="#a8e068" note="Good day" />
            <Box label="↓ LOW (ಕನಿಷ್ಠ)" value={r.target.low} color="#ff9090" note="Weak day" />
          </div>
          <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffd166" }}>{kn}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
              {en} · {r.changePct >= 0 ? "+" : ""}{r.changePct}% vs current level
            </div>
          </div>
        </div>

        {r.stale && (
          <div className="notice">⚠️ The newest data for this district is from {fmtDate(r.today.date, true)} ({r.dataAgeDays} days ago). Press “Update today's prices” for fresher results.</div>
        )}
        {r.days > 365 && (
          <div className="notice">⚠️ Predictions beyond 1 year are only a rough direction. Arecanut prices depend on weather, imports and government policy, which no model can see.</div>
        )}

        <div className="panel" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>📈 Recent prices and forecast (₹/quintal)</div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
            Grey = real recent avg price · Dashed green = predicted avg (sell target) · Shaded = predicted low–high
          </div>
          <Chart history={r.history} forecast={r.forecast} color={color} />
        </div>

        <div className="panel" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 10 }}>✅ How reliable is this?</div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            In the past, prices in this district moved about <b>±{r.swingPct}%</b> over a {period?.label.toLowerCase()} period.
          </div>
          {bt ? (
            <div style={{ fontSize: 13 }}>
              Test on the last 6 months (data the model had not seen):
              {["h7", "h30"].map((h) => bt[h] && (
                <div key={h} style={{ marginTop: 4 }}>
                  • {h === "h7" ? "7-day" : "30-day"} prediction was off by <b>{bt[h].model}%</b> on average
                  {" "}(simple rule “price stays same”: {bt[h].naive}%)
                  {bt[h].model >= bt[h].naive && <span style={{ color: "var(--gold)" }}> — no better than the simple rule here</span>}
                </div>
              ))}
            </div>
          ) : <div style={{ fontSize: 12, color: "var(--muted)" }}>Not enough history yet for an accuracy test.</div>}
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          ⚠️ ಅಂದಾಜು ಮಾತ್ರ · Estimate only, based on APMC data since {fmtDate(r.since, true)}. Always confirm today's rate with your local market before selling.
        </div>
      </div>
    );
  }
  return null;
}