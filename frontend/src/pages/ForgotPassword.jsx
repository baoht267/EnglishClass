import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/index.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (step === "code" && !code.trim()) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      if (step === "email") {
        const data = await api.forgotPassword({ email: email.trim() });
        setSuccess(
          data?.message || "If the email exists, a verification code has been sent."
        );
        setStep("code");
      } else {
        const data = await api.verifyResetCode({ email: email.trim(), code: code.trim() });
        setSuccess(data?.message || "A new password has been sent to your email.");
      }
    } catch (err) {
      setError(err.message || "Failed to send email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginPage forgotPage">
      <div className="loginLeft">
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
          <h1>Master your English goals with professional tools.</h1>
          <p>
            Access high-stakes exams, practice tests, and detailed performance analytics
            designed for both students and administrators.
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

      <div className="loginRight">
        <div className="loginMobileHeader">
          <div className="loginMobileBrand">
            <span className="material-symbols-outlined">school</span>
            <span>English Exam Pro</span>
          </div>
          <button className="loginHelpBtn" type="button" aria-label="Help">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>

        <div className="loginFormWrap">
          <Link className="loginBackLink" to="/login">
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Login
          </Link>

          <div className="loginIntro">
            <h2>Forgot Password?</h2>
            <p>
              Enter the email address associated with your account and we will send
              you a link to reset your password.
            </p>
          </div>

          <form className="loginForm" onSubmit={onSubmit} noValidate>
            <div className="loginField">
              <label htmlFor="email">Email Address</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">mail</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@university.edu"
                  autoComplete="email"
                  disabled={loading || step === "code"}
                  required
                />
              </div>
            </div>

            {step === "code" && (
              <div className="loginField">
                <label htmlFor="code">Verification Code</label>
                <div className="loginInputWrap">
                  <span className="material-symbols-outlined">key</span>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    inputMode="numeric"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            {error && <div className="loginAlert error">{error}</div>}
            {success && <div className="loginAlert success">{success}</div>}

            <button className="loginSubmit" type="submit" disabled={loading}>
              <span>{step === "code" ? "Verify Code" : "Send Reset Link"}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>

          <div className="loginInfo">
            <span className="material-symbols-outlined">info</span>
            <p>
              If you don&apos;t receive an email within a few minutes, please check your
              spam folder.
            </p>
          </div>
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
