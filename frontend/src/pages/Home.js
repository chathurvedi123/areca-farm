import { useNavigate } from "react-router-dom";
import { useAuth }     from "../components/AuthContext";
import "../components/styles.css";

export default function Home() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const handleRole = (role) => {
    if (role === "manager") navigate("/manager-verify");
    else navigate(`/login/${role}`);
  };

  return (
    <div className="page-bg">
      <div className="container">
        <section style={{ minHeight:"90vh", display:"grid", alignContent:"center", gap:24 }}>

          <div style={{ maxWidth:780, color:"#fff", textShadow:"0 2px 18px rgba(0,0,0,0.35)" }}>
            <div className="eyebrow">Areca farm records and labour management</div>
            <h1 style={{ fontSize:"clamp(34px,6vw,72px)", lineHeight:0.97, margin:"14px 0" }}>
              Areca Farm<br />Management
            </h1>
            <p style={{ color:"rgba(255,255,255,0.88)", fontSize:18, maxWidth:680 }}>
              Owner, manager, worker, and farmer login with saved areca home
              and harvest records. Daily kg tracking, harvest quintal records,
              and real-time price prediction.
            </p>
            {user && (
              <button
                className="btn btn-primary"
                style={{ marginTop:16 }}
                onClick={() => navigate(`/${user.role}`)}
              >
                Go to Dashboard ({user.name})
              </button>
            )}
          </div>

          <div className="farm-strip">
            <span>📊 Daily kg Tracking</span>
            <span>🌾 Harvest Quintal Records</span>
            <span>📈 Price Prediction</span>
          </div>

          <div className="role-grid">
            <article className="role-card" onClick={() => handleRole("owner")}>
              <div className="role-icon">O</div>
              <strong>Owner Login</strong>
              <span>Prediction, manager codes, workers, farmers.</span>
            </article>
            <article className="role-card" onClick={() => handleRole("manager")}>
              <div className="role-icon">M</div>
              <strong>Manager Login</strong>
              <span>ಅಡಿಕೆ ಮನೆ and ಅಡಿಕೆ ಕೊಯ್ಲು data entry.</span>
            </article>
            <article className="role-card" onClick={() => handleRole("worker")}>
              <div className="role-icon">W</div>
              <strong>Worker Login</strong>
              <span>See only your ಅಡಿಕೆ ಮನೆ work details.</span>
            </article>
            <article className="role-card" onClick={() => handleRole("farmer")}>
              <div className="role-icon">F</div>
              <strong>Farmer Login</strong>
              <span>See only your ಅಡಿಕೆ ಕೊಯ್ಲು harvest details.</span>
            </article>
          </div>

        </section>
      </div>
    </div>
  );
}