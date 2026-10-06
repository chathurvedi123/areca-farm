import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { getWorkers, addWorkerRow, getFarmers, addFarmerRow } from "../api/client";
import { useAuth }             from "../components/AuthContext";
import "../components/styles.css";

const todayKey  = new Date().toISOString().slice(0, 10);
const monthDays = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

export default function ManagerDashboard() {
  const { user, logoutUser } = useAuth();
  const navigate             = useNavigate();
  const [module, setModule]  = useState("home");
  const [workerRows, setWorkerRows] = useState([]);
  const [farmerRows, setFarmerRows] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    if (!user || user.role !== "manager") { navigate("/"); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wRes, fRes] = await Promise.all([
        getWorkers(user.company, user.name),
        getFarmers(user.company, user.name),
      ]);
      setWorkerRows(wRes.data.data);
      setFarmerRows(fRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="page-bg">
      <div className="loading-wrap"><div className="spinner"/><span>Loading...</span></div>
    </div>
  );

  return (
    <div className="page-bg" style={{ minHeight:"100vh" }}>
      <div className="container">

        <div className="topbar">
          <div>
            <h1>Manager Dashboard</h1>
            <p className="sub">{user?.company} · {user?.name}</p>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary btn-sm" onClick={fetchData}>🔄 Refresh</button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate("/")}>🏠 Home</button>
            <button className="btn btn-danger btn-sm" onClick={() => { logoutUser(); navigate("/"); }}>Logout</button>
          </div>
        </div>

        <div className="tabs">
          <button className={`tab ${module==="home"?"active":""}`} onClick={() => setModule("home")}>
            ಅಡಿಕೆ ಮನೆ
          </button>
          <button className={`tab ${module==="harvest"?"active":""}`} onClick={() => setModule("harvest")}>
            ಅಡಿಕೆ ಕೊಯ್ಲು
          </button>
        </div>

        {module === "home"
          ? <WorkerModule user={user} rows={workerRows} onSaved={fetchData} />
          : <FarmerModule user={user} rows={farmerRows} onSaved={fetchData} />
        }

      </div>
    </div>
  );
}

function WorkerModule({ user, rows, onSaved }) {
  const [form, setForm] = useState({ slNo:"", workerName:"", date:todayKey, kg:"", pricePerKg:"2" });
  const [msg, setMsg]       = useState({ text:"", ok:false });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slNo || !form.workerName || !form.kg)
      return setMsg({ text:"Enter sl.no, worker name, and kg.", ok:false });
    setSaving(true); setMsg({ text:"", ok:false });
    try {
      await addWorkerRow({
        company: user.company, managerName: user.name,
        slNo: form.slNo, workerName: form.workerName,
        date: form.date, kg: Number(form.kg), pricePerKg: Number(form.pricePerKg),
      });
      setMsg({ text:"✅ Saved successfully!", ok:true });
      setForm(f => ({ ...f, slNo:"", workerName:"", kg:"" }));
      onSaved();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Save failed", ok:false });
    } finally { setSaving(false); }
  };

  return (
    <div className="dash-grid">
      <div className="panel">
        <h2 style={{ marginBottom:14 }}>Add Worker Work</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Sl.No</label>
              <input name="slNo" value={form.slNo} onChange={handleChange} inputMode="numeric" placeholder="1"/>
            </div>
            <div className="form-group">
              <label>Worker Name</label>
              <input name="workerName" value={form.workerName} onChange={handleChange} placeholder="Name"/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date</label>
              <input type="date" name="date" value={form.date} onChange={handleChange}/>
            </div>
            <div className="form-group">
              <label>Today kg</label>
              <input type="number" name="kg" value={form.kg} onChange={handleChange} min="0" step="0.01" placeholder="0.00"/>
            </div>
          </div>
          <div className="form-group">
            <label>Price / kg (₹)</label>
            <input type="number" name="pricePerKg" value={form.pricePerKg} onChange={handleChange} min="0" step="0.01"/>
          </div>
          <p className={msg.ok ? "msg-ok" : "msg-error"}>{msg.text}</p>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Worker Details"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sl.No</th><th>Name</th>
              {Array.from({ length:monthDays }, (_,i) => <th key={i}>{i+1}</th>)}
              <th>Total kg</th><th>₹/kg</th><th>Total ₹</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={monthDays+5} className="empty">No records yet</td></tr>
              : rows.map((r,i) => {
                const daysObj = r.days instanceof Map ? Object.fromEntries(r.days) : (r.days || {});
                return (
                  <tr key={i}>
                    <td>{r.slNo}</td><td>{r.name}</td>
                    {Array.from({ length:monthDays }, (_,di) => {
                      const d = `${todayKey.slice(0,8)}${String(di+1).padStart(2,"0")}`;
                      return <td key={di}>{daysObj[d] || ""}</td>;
                    })}
                    <td><strong>{r.totalKg}</strong></td>
                    <td>₹{r.pricePerKg}</td>
                    <td><strong>₹{r.totalPrice}</strong></td>
                  </tr>
                );
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FarmerModule({ user, rows, onSaved }) {
  const [form, setForm] = useState({ slNo:"", farmerName:"", harvestCount:1, h1:"", h2:"", h3:"", h4:"", h5:"" });
  const [msg, setMsg]       = useState({ text:"", ok:false });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.slNo || !form.farmerName)
      return setMsg({ text:"Enter sl.no and farmer name.", ok:false });
    setSaving(true); setMsg({ text:"", ok:false });
    try {
      const harvests = [
        Number(form.h1||0), Number(form.h2||0), Number(form.h3||0),
        Number(form.h4||0), Number(form.h5||0),
      ];
      await addFarmerRow({
        company: user.company, managerName: user.name,
        slNo: form.slNo, farmerName: form.farmerName, harvests,
      });
      setMsg({ text:"✅ Saved successfully!", ok:true });
      setForm(f => ({ ...f, slNo:"", farmerName:"", h1:"", h2:"", h3:"", h4:"", h5:"" }));
      onSaved();
    } catch (err) {
      setMsg({ text: err.response?.data?.error || "Save failed", ok:false });
    } finally { setSaving(false); }
  };

  const count = Number(form.harvestCount);

  return (
    <div className="dash-grid">
      <div className="panel">
        <h2 style={{ marginBottom:14 }}>Add Farmer Harvest</h2>
        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Sl.No</label>
              <input name="slNo" value={form.slNo} onChange={handleChange} inputMode="numeric" placeholder="1"/>
            </div>
            <div className="form-group">
              <label>Farmer Name</label>
              <input name="farmerName" value={form.farmerName} onChange={handleChange} placeholder="Name"/>
            </div>
          </div>
          <div className="form-group">
            <label>Number of ಕೊಯ್ಲು</label>
            <select name="harvestCount" value={form.harvestCount} onChange={handleChange}>
              {[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          {Array.from({ length:count }, (_,i) => (
            <div className="form-group" key={i}>
              <label>ಕೊಯ್ಲು {i+1} Quintal</label>
              <input type="number" min="0" step="0.01" name={`h${i+1}`} value={form[`h${i+1}`]} onChange={handleChange} placeholder="0.00"/>
            </div>
          ))}
          <p className={msg.ok ? "msg-ok" : "msg-error"}>{msg.text}</p>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Farmer Details"}
          </button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sl.No</th><th>Farmer Name</th>
              <th>ಕೊಯ್ಲು 1</th><th>ಕೊಯ್ಲು 2</th><th>ಕೊಯ್ಲು 3</th>
              <th>ಕೊಯ್ಲು 4</th><th>ಕೊಯ್ಲು 5</th><th>Total Quintal</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0
              ? <tr><td colSpan={8} className="empty">No records yet</td></tr>
              : rows.map((r,i) => (
                <tr key={i}>
                  <td>{r.slNo}</td><td>{r.name}</td>
                  {r.harvests.map((h,hi) => <td key={hi}>{h || ""}</td>)}
                  <td><strong>{r.totalQuintal}</strong></td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}