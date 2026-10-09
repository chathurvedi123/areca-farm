import { useState, useEffect, useCallback } from "react";
import { useNavigate }         from "react-router-dom";
import { getMyFarmer }         from "../api/client";
import { useAuth }             from "../components/AuthContext";
import "../components/styles.css";

export default function FarmerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate             = useNavigate();
  const [row, setRow]        = useState(null);
  const [loading, setLoading]  = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyFarmer(user.company, user.managerName, user.name);
      setRow(res.data.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "farmer") { navigate("/"); return; }
    fetchData();
  }, [user, navigate, fetchData]);

  if (loading) return (
    <div className="page-bg">
      <div className="loading-wrap"><div className="spinner"/><span>Loading harvest records...</span></div>
    </div>
  );

  return (
    <div className="page-bg" style={{ minHeight:"100vh" }}>
      <div className="container">

        <div className="topbar">
          <div>
            <h1>Farmer Dashboard</h1>
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
            No harvest records found yet.<br/>
            Your manager will add your harvest details.
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat-card"><div className="label">Total Quintal</div><div className="value">{row.totalQuintal}</div></div>
              <div className="stat-card"><div className="label">ಕೊಯ್ಲು 1</div><div className="value">{row.harvests[0]||0}</div></div>
              <div className="stat-card"><div className="label">ಕೊಯ್ಲು 2</div><div className="value">{row.harvests[1]||0}</div></div>
              <div className="stat-card"><div className="label">ಕೊಯ್ಲು 3</div><div className="value">{row.harvests[2]||0}</div></div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>ಕೊಯ್ಲು 1</th><th>ಕೊಯ್ಲು 2</th><th>ಕೊಯ್ಲು 3</th>
                    <th>ಕೊಯ್ಲು 4</th><th>ಕೊಯ್ಲು 5</th><th>Total Quintal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>{row.name}</strong></td>
                    {row.harvests.map((h,i) => (
                      <td key={i} style={{ background: h ? "rgba(31,122,77,0.06)" : "" }}>{h||""}</td>
                    ))}
                    <td><strong style={{ color:"var(--brand-dark)", fontSize:16 }}>{row.totalQuintal}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="panel" style={{ marginTop:16 }}>
              <h3 style={{ marginBottom:12, color:"var(--brand-dark)" }}>Harvest Summary</h3>
              <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                {row.harvests.map((h,i) => h > 0 && (
                  <div key={i} style={{ background:"var(--soft)", borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
                    <div style={{ fontSize:12, color:"var(--muted)", fontWeight:700 }}>ಕೊಯ್ಲು {i+1}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:"var(--brand-dark)" }}>{h}</div>
                    <div style={{ fontSize:11, color:"var(--muted)" }}>quintal</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}