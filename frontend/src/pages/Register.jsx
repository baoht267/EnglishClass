import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/index.js";

const strengthFromPassword = (value) => {
  if (!value) return { label: "Weak", percent: 0, tone: "weak" };
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score >= 4) return { label: "Strong", percent: 100, tone: "strong" };
  if (score >= 2) return { label: "Good", percent: 66, tone: "good" };
  return { label: "Weak", percent: 33, tone: "weak" };
};

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("MALE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = useMemo(() => strengthFromPassword(password), [password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword: password,
        gender,
        dob: dob || null,
      });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage registerPage">
      <div className="loginLeft registerLeft">
        <div className="loginLeftOverlay" />
        <img
          className="loginLeftImg"
          alt="Student studying in a modern library"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDLlpsDweXjl5qqZms-Shiu8KwTIATvo2Be0_WjSMKRBfF5qUJkCZu3UZsVQMz7vTYp9aWM7xAKGc0cR2NgvisXDQJLs_F3bzUA8wW76r4XLi3RZLdZmLTy99CuSIW2XM7XU-Oh8h5kZUz_Hz_Ffg97U63KgYlBHNkVBlqqTmLobRcke5lPJmyaTsfGwDasuvNYPZxUT1ZCO3HzFHDotG6P-XF6I4-PIEdKW6Lq5FM8bpsbhoCRCz4WIdE5Q3iNLV5N-zDiA8hvqNw"
        />
        <div className="loginLeftContent">
          <div className="loginBrand">
            <div className="loginBrandIcon">
              <span className="material-symbols-outlined">school</span>
            </div>
            <span>English Exam Pro</span>
          </div>
          <h1>Unlock your potential with expert guidance.</h1>
          <p>
            Join thousands of students achieving their language goals through our
            comprehensive testing environment.
          </p>
          <div className="loginStats">
            <div>
              <strong>50k+</strong>
              <span>Active Students</span>
            </div>
            <div>
              <strong>1.2m+</strong>
              <span>Exams Passed</span>
            </div>
          </div>
        </div>
      </div>

      <div className="loginRight registerRight">
        <div className="loginFormWrap registerFormWrap">
          <div className="loginIntro registerIntro">
            <h2>Create Account</h2>
            <p>Complete the form below to register for the English examination platform.</p>
          </div>

          <form className="loginForm" onSubmit={onSubmit} noValidate>
            <div className="loginField">
              <label>Full Name (name)</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">person</span>
                <input
                  value={name}
                  autoComplete="name"
                  placeholder="e.g. John Doe"
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="loginField">
              <label>Email Address (email)</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">mail</span>
                <input
                  value={email}
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. alex@university.edu"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="loginField">
              <label>Password (password)</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">lock</span>
                <input
                  value={password}
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button className="loginEyeBtn" type="button" aria-label="Toggle password">
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </div>
              <div className="registerStrength">
                <span>Security: {strength.label}</span>
                <div className="registerStrengthBar">
                  <div
                    className={`registerStrengthFill ${strength.tone}`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="loginField">
              <label>Date of Birth (dob)</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">event</span>
                <input
                  value={dob}
                  type="date"
                  onChange={(e) => setDob(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="loginField">
              <label>Gender (gender)</label>
              <div className="loginInputWrap registerSelect">
                <span className="material-symbols-outlined">wc</span>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="MALE">MALE</option>
                  <option value="FEMALE">FEMALE</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            {error && <div className="loginAlert error">{error}</div>}

            <button className="loginSubmit" type="submit" disabled={loading}>
              <span>{loading ? "Creating..." : "Register Account"}</span>
              <span className="material-symbols-outlined">person_add</span>
            </button>
          </form>

          <div className="loginDivider">
            <span>Or register with</span>
          </div>

          <div className="loginSocial">
            <button type="button">
              <svg className="loginSocialIcon" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google</span>
            </button>
            <button type="button">
              <svg className="loginSocialIcon" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          <p className="loginSignup">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>

        <div className="loginFooter">
          <span>© 2024 English Exam Pro</span>
          <div className="loginFooterLinks">
            <a href="#">Help Center</a>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
