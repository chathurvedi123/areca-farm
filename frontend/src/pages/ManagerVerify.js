import { useState }        from "react";
import { useNavigate, Link } from "react-router-dom";
import { verifyManagerCode } from "../api/client";
import "../components/styles.css";

export default function ManagerVerify() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ company:"", code:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await verifyManagerCode(form);
      navigate(`/login/manager?company=${encodeURIComponent(form.company.toLowerCase().trim())}`);
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="auth-wrap">
        <div className="auth-title">
          <h1>Manager Verification</h1>
          <p>Enter your company name and the code given by the owner.</p>
        </div>

        <div className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Company Name</label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Farm company name"
                required
              />
            </div>

            <div className="form-group">
              <label>Manager Code</label>
              <input
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="Code from owner e.g. AB1X9K"
                required
              />
            </div>

            <p className="msg-error">{error}</p>

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify Code"}
              </button>
              <Link to="/" className="btn btn-secondary">Back</Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}