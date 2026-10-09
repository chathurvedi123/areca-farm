import { useState, useEffect, useCallback } from "react";
import { useNavigate }         from "react-router-dom";
import { getOwnerStats, generateCode } from "../api/client";
import { useAuth }             from "../components/AuthContext";
import PredictionPanel         from "../components/PredictionPanel";
import "../components/styles.css";

const todayKey  = new Date().toISOString().slice(0, 10);
const monthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

export default function OwnerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate             = useNavigate();
  const [tab, setTab]        = useState("prediction");
  const [stats, setStats]    = useState(null);
  const [loading, setLoading]  = useState(true);
  const [codeMsg, setCodeMsg]  = useState({ text:"", ok:false });

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getOwnerStats();
      setStats(res.data.data);
    } catch {
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user || user.role !== "owner") { navigate("/"); return; }
    fetchStats();
  }, [user, navigate, fetchStats]);

  const handleGenerateCode = async () => {
    setCodeMsg({ text:"", ok:false });
    try {
      const res = await generateCode();
      setCodeMsg({ text:`✅ Code generated: ${res.data.data.code}`, ok:true });
      fetchStats();
    } catch (e) {
      setCodeMsg({ text:"❌ " + (e.response?.data?.error || "Error"), ok:false });
    }
  };

  if (loading) return (
    <div className="page-bg">
      <div className="loading-wrap"><div className="spinner"/><span>Loading dashboard...</span></div>
    </div>
  );

  return (
    <div className="page-bg" style={{ minHeight:"100vh" }}>
      <div className="container">

        <div className="topbar">
          <div>
            <h1>Owner Dashboard</h1>
            <p className="sub">{user?.company} · {user?.name}</p>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={fetchStats}>🔄 Refresh</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>🏠 Home</button>
            <button className="btn btn-danger btn-sm" onClick={() => { logoutUser(); navigate("/"); }}>Logout</button>
          </div>
        </div>

        {stats && (
          <div className="stat-grid">
            <div className="stat-card"><div className="label">Managers</div><div className="value">{stats.managers.length}</div></div>
            <div className="stat-card"><div className="label">Workers</div><div className="value">{stats.workers.length}</div></div>
            <div className="stat-card"><div className="label">Farmers</div><div className="value">{stats.farmers.length}</div></div>
            <div className="stat-card"><div className="label">Total kg</div><div className="value">{stats.totalKg}</div></div>
          </div>
        )}

        <div className="tabs">
          {["prediction","managers","workers","farmers","codes"].map(t => (
            <button key={t} className={`tab ${tab===t?"active":""}`} onClick={() => setTab(t)}>
              {t === "prediction" ? "Price Prediction" : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "prediction" && <PredictionPanel />}

        {tab === "managers" && stats && (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Phone</th><th>Username</th><th>Attendance Days</th></tr></thead>
              <tbody>
                {stats.managers.length === 0
                  ? <tr><td colSpan={4} className="empty">No managers yet</td></tr>
                  : stats.managers.map((m,i) => (
                    <tr key={i}>
                      <td>{m.name}</td><td>{m.phone}</td>
                      <td>{m.username}</td><td>{m.attendanceDays}</td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}

        {tab === "workers" && stats && <WorkerTable rows={stats.workers} />}
        {tab === "farmers" && stats && <FarmerTable rows={stats.farmers} />}

        {tab === "codes" && stats && (
          <div className="dash-grid">
            <div className="panel">
              <h2 style={{ marginBottom:14 }}>Generate Manager Code</h2>
              <p style={{ color:"var(--muted)", fontSize:13, marginBottom:14 }}>
                Generate a code and share it with your manager so they can register.
              </p>
              <button className="btn btn-primary" onClick={handleGenerateCode}>
                Generate New Code
              </button>
              {codeMsg.text && (
                <p className={codeMsg.ok ? "msg-ok" : "msg-error"} style={{ marginTop:12 }}>
                  {codeMsg.text}
                </p>
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Company</th><th>Code</th><th>Created By</th><th>Date</th></tr></thead>
                <tbody>
                  {stats.codes.length === 0
                    ? <tr><td colSpan={4} className="empty">No codes yet</td></tr>
                    : stats.codes.map((c,i) => (
                      <tr key={i}>
                        <td>{c.company}</td>
                        <td><strong style={{ fontFamily:"monospace", fontSize:16 }}>{c.code}</strong></td>
                        <td>{c.createdBy}</td>
                        <td>{new Date(c.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function WorkerTable({ rows }) {
  if (!rows.length) return <div className="panel empty">No worker records yet</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sl.No</th><th>Name</th><th>Manager</th>
            {Array.from({ length: monthDays }, (_,i) => <th key={i}>{i+1}</th>)}
            <th>Total kg</th><th>₹/kg</th><th>Total ₹</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => {
            const daysObj = r.days instanceof Map ? Object.fromEntries(r.days) : (r.days || {});
            return (
              <tr key={i}>
                <td>{r.slNo}</td><td>{r.name}</td><td>{r.managerName}</td>
                {Array.from({ length: monthDays }, (_,di) => {
                  const d = `${todayKey.slice(0,8)}${String(di+1).padStart(2,"0")}`;
                  return <td key={di}>{daysObj[d] || ""}</td>;
                })}
                <td><strong>{r.totalKg}</strong></td>
                <td>₹{r.pricePerKg}</td>
                <td><strong>₹{r.totalPrice}</strong></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FarmerTable({ rows }) {
  if (!rows.length) return <div className="panel empty">No farmer records yet</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Sl.No</th><th>Name</th><th>Manager</th>
            <th>ಕೊಯ್ಲು 1</th><th>ಕೊಯ್ಲು 2</th><th>ಕೊಯ್ಲು 3</th>
            <th>ಕೊಯ್ಲು 4</th><th>ಕೊಯ್ಲು 5</th><th>Total Quintal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i}>
              <td>{r.slNo}</td><td>{r.name}</td><td>{r.managerName}</td>
              {r.harvests.map((h,hi) => <td key={hi}>{h || ""}</td>)}
              <td><strong>{r.totalQuintal}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
