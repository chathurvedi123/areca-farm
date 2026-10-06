import { useState }                     from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { register }                     from "../api/client";
import "../components/styles.css";

export default function Register() {
  const { role }  = useParams();
  const navigate  = useNavigate();

  const [otp]           = useState(String(Math.floor(100000 + Math.random() * 900000)));
  const [form, setForm]   = useState({
    name:"", phone:"", otpInput:"", company:"",
    managerName:"", username:"", password:"", confirm:"", code:"",
  });
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (form.otpInput !== otp)          return setError("OTP is incorrect.");
    if (form.password !== form.confirm) return setError("Passwords do not match.");
    if (form.password.length < 4)       return setError("Password must be at least 4 characters.");

    setLoading(true);
    try {
      const payload = {
        name:     form.name,
        phone:    form.phone,
        role,
        company:  form.company,
        username: form.username,
        password: form.password,
      };
      if (role === "manager")                     payload.code        = form.code;
      if (role === "worker" || role === "farmer") payload.managerName = form.managerName;

      await register(payload);
      setSuccess("✅ Registration successful! Redirecting to login...");
      setTimeout(() => navigate(`/login/${role}`), 1200);
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = role ? role[0].toUpperCase() + role.slice(1) : "";

  return (
    <div className="page-bg">
      <div className="auth-wrap" style={{ maxWidth:540 }}>
        <div className="auth-title">
          <h1>{roleLabel} Registration</h1>
          <p>Create your account to get started.</p>
        </div>

        <div className="panel">
          <div className="notice">
            📱 OTP for testing: <strong style={{ fontSize:18 }}>{otp}</strong>
          </div>

          <form className="form-grid" onSubmit={handleSubmit}>

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="9876543210"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>OTP Verification</label>
              <input
                name="otpInput"
                value={form.otpInput}
                onChange={handleChange}
                placeholder="Enter OTP shown above"
                required
              />
            </div>

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

            {role === "manager" && (
              <div className="form-group">
                <label>Manager Code (from owner)</label>
                <input
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="Code given by owner"
                  required
                />
              </div>
            )}

            {(role === "worker" || role === "farmer") && (
              <div className="form-group">
                <label>Manager Name</label>
                <input
                  name="managerName"
                  value={form.managerName}
                  onChange={handleChange}
                  placeholder="Your manager's full name"
                  required
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Username</label>
                <input
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose username"
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
                  placeholder="Min 4 characters"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
              />
            </div>

            {error   && <p className="msg-error">❌ {error}</p>}
            {success && <p className="msg-ok">{success}</p>}

            <div className="actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Register"}
              </button>
              <Link to={`/login/${role}`} className="btn btn-secondary">
                Back to Login
              </Link>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}