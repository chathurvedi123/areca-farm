import { useState, useEffect, useCallback } from "react";
import { useNavigate }         from "react-router-dom";
import { getMyWorker }         from "../api/client";
import { useAuth }             from "../components/AuthContext";
import "../components/styles.css";

const todayKey  = new Date().toISOString().slice(0, 10);
const monthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

export default function WorkerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate             = useNavigate();
  const [row, setRow]        = useState(null);
  const [loading, setLoading]  = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyWorker(user.company, user.managerName, user.name);
      setRow(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "worker") { navigate("/"); return; }
    fetchData();
  }, [user, navigate, fetchData]);

  if (loading) return (
    <div className="page-bg">
      <div className="loading-wrap"><div className="spinner"/><span>Loading your records...</span></div>
    </div>
  );

  const daysObj = row?.days instanceof Map
    ? Object.fromEntries(row.days)
    : (row?.days || {});

  return (
    <div className="page-bg" style={{ minHeight:"100vh" }}>
      <div className="container">

        <div className="topbar">
          <div>
            <h1>Worker Dashboard</h1>
            <p className="sub">{user?.company} · {user?.name}</p>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>🔄 Refresh</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>🏠 Home</button>
            <button className="btn btn-danger btn-sm" onClick={() => { logoutUser(); navigate("/"); }}>Logout</button>
          </div>
        </div>

        {!row ? (
          <div className="panel empty">
            No records found yet.<br/>
            Your manager will add your work details.
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="label">Total kg This Month</div><div className="value">{row.totalKg}</div></div>
              <div className="stat-card"><div className="label">Price / kg</div><div className="value">₹{row.pricePerKg}</div></div>
              <div className="stat-card"><div className="label">Total Earnings</div><div className="value">₹{row.totalPrice}</div></div>
              <div className="stat-card"><div className="label">Days Worked</div><div className="value">{Object.keys(daysObj).length}</div></div>
            </div>

            <div className="panel" style={{ marginBottom:16, background:"rgba(31,122,77,0.06)" }}>
              <strong>Today ({todayKey}):</strong>{" "}
              {daysObj[todayKey] ? `${daysObj[todayKey]} kg recorded` : "No entry yet for today"}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    {Array.from({ length:monthDays }, (_,i) => (
                      <th key={i} style={{ background: String(i+1) === todayKey.slice(-2).replace(/^0/,"") ? "rgba(31,122,77,0.15)" : "" }}>
                        {i+1}
                      </th>
                    ))}
                    <th>Total kg</th><th>₹/kg</th><th>Total ₹</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{row.name}</strong></td>
                    {Array.from({ length:monthDays }, (_,di) => {
                      const d   = `${todayKey.slice(0,8)}${String(di+1).padStart(2,"0")}`;
                      const val = daysObj[d];
                      return <td key={di} style={{ background: val ? "rgba(31,122,77,0.08)" : "" }}>{val || ""}</td>;
                    })}
                    <td><strong>{row.totalKg}</strong></td>
                    <td>₹{row.pricePerKg}</td>
                    <td><strong style={{ color:"var(--brand-dark)" }}>₹{row.totalPrice}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
