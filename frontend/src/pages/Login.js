import { useState }                     from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { login }                        from "../api/client";
import { useAuth }                      from "../components/AuthContext";
import "../components/styles.css";

export default function Login() {
  const { role }      = useParams();
  const navigate      = useNavigate();
  const { loginUser } = useAuth();

  const [form, setForm]       = useState({ username:"", password:"", company:"", managerName:"" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const params          = new URLSearchParams(window.location.search);
  const verifiedCompany = params.get("company") || "";

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        username: form.username,
        password: form.password,
        role,
        company: verifiedCompany || form.company,
      };
      if (role === "worker" || role === "farmer") {
        payload.managerName = form.managerName;
      }
      const res = await login(payload);
      loginUser(res.data.user, res.data.token);
      navigate(`/${role}`);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Check backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role ? role[0].toUpperCase() + role.slice(1) : "";

  return (
    <div className="page-bg">
      <div className="auth-wrap">
        <div className="auth-title">
          <h1>{roleLabel} Login</h1>
          <p>Enter your credentials to continue.</p>
        </div>

        <div className="panel">
          <form className="form-grid" onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Company Name</label>
              <input
                name="company"
                value={verifiedCompany || form.company}
                onChange={handleChange}
                placeholder="Farm company name"
                readOnly={!!verifiedCompany}
                required
              />
            </div>

            {(role === "worker" || role === "farmer") && (
              <div className="form-group">
                <label>Manager Name</label>
                <input
                  name="managerName"
                  value={form.managerName}
                  onChange={handleChange}
                  placeholder="Your manager's name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Username</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            <p className="msg-error">{error}</p>

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </button>
              <Link to={`/register/${role}`} className="btn btn-secondary">
                Register
              </Link>
              <Link to="/" className="btn btn-secondary">Back</Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}