import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/index.js";
import { useAuth } from "../state/AuthContext.jsx";
import { decodeJwt } from "../lib/jwt.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleVerify, setGoogleVerify] = useState({
    required: false,
    email: "",
    code: ""
  });
  const [googleVerifying, setGoogleVerifying] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const [googleReady, setGoogleReady] = useState(false);
  const facebookAppId = import.meta.env.VITE_FACEBOOK_APP_ID;
  const [fbReady, setFbReady] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await api.login({ email: email.trim(), password, remember });
      login(data.token, { mustChangePassword: data.mustChangePassword, remember });
      if (data.mustChangePassword) {
        setSuccess("Login successful. Please change your password to continue.");
        setTimeout(() => {
          navigate("/user/change-password", { replace: true });
        }, 900);
        return;
      }
      const role = decodeJwt(data.token)?.role;
      setSuccess("Login successful. Redirecting...");
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin/dashboard" : "/", { replace: true });
      }, 800);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const handleGoogleCredential = async (credential) => {
    if (!credential) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await api.googleLogin({ credential, remember });
      if (data?.requiresVerification) {
        setGoogleVerify({
          required: true,
          email: data.email || "",
          code: ""
        });
        setSuccess(data.message || "A verification code has been sent to your email.");
        return;
      }
      setGoogleVerify({ required: false, email: "", code: "" });
      login(data.token, { mustChangePassword: data.mustChangePassword, remember });
      if (data.mustChangePassword) {
        setSuccess("Login successful. Please change your password to continue.");
        setTimeout(() => {
          navigate("/user/change-password", { replace: true });
        }, 900);
        return;
      }
      const role = decodeJwt(data.token)?.role;
      setSuccess("Login successful. Redirecting...");
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin/dashboard" : "/", { replace: true });
      }, 800);
    } catch (err) {
      setError(err.message || "Google login failed");
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const handleGoogleVerify = async (e) => {
    e.preventDefault();
    if (!googleVerify.code.trim()) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setError("");
    setSuccess("");
    setGoogleVerifying(true);
    try {
      const data = await api.verifyGoogleLoginCode({
        email: googleVerify.email,
        code: googleVerify.code.trim(),
        remember
      });
      setGoogleVerify({ required: false, email: "", code: "" });
      login(data.token, { mustChangePassword: data.mustChangePassword, remember });
      if (data.mustChangePassword) {
        setSuccess("Login successful. Please change your password to continue.");
        setTimeout(() => {
          navigate("/user/change-password", { replace: true });
        }, 900);
        return;
      }
      const role = decodeJwt(data.token)?.role;
      setSuccess("Login successful. Redirecting...");
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin/dashboard" : "/", { replace: true });
      }, 800);
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setGoogleVerifying(false);
    }
  };

  const handleFacebookCredential = async (accessToken) => {
    if (!accessToken) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const data = await api.facebookLogin({ accessToken, remember });
      login(data.token, { mustChangePassword: data.mustChangePassword, remember });
      if (data.mustChangePassword) {
        setSuccess("Login successful. Please change your password to continue.");
        setTimeout(() => {
          navigate("/user/change-password", { replace: true });
        }, 900);
        return;
      }
      const role = decodeJwt(data.token)?.role;
      setSuccess("Login successful. Redirecting...");
      setTimeout(() => {
        navigate(role === "ADMIN" ? "/admin/dashboard" : "/", { replace: true });
      }, 800);
    } catch (err) {
      setError(err.message || "Facebook login failed");
    } finally {
      setTimeout(() => setLoading(false), 200);
    }
  };

  const onFacebookClick = () => {
    if (!window.FB) {
      setError("Facebook login is not ready yet. Please try again.");
      return;
    }
    setError("");
    window.FB.login(
      (response) => {
        const accessToken = response?.authResponse?.accessToken;
        if (!accessToken) {
          setError("Facebook login was cancelled.");
          return;
        }
        handleFacebookCredential(accessToken);
      },
      { scope: "public_profile,email" }
    );
  };

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const initGoogle = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => handleGoogleCredential(response.credential)
      });
      const width = googleBtnRef.current.offsetWidth || 260;
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        width,
        shape: "pill"
      });
      setGoogleReady(true);
    };

    if (window.google?.accounts?.id) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleClientId, remember]);

  useEffect(() => {
    if (!facebookAppId) return;

    const initFacebook = () => {
      if (!window.FB) return;
      window.FB.init({
        appId: facebookAppId,
        cookie: true,
        xfbml: false,
        version: "v19.0"
      });
      setFbReady(true);
    };

    if (window.FB) {
      initFacebook();
      return;
    }

    window.fbAsyncInit = initFacebook;
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [facebookAppId]);

  return (
    <div className="loginPage">
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
          <button type="button" className="loginHelpBtn" aria-label="Help">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </div>

        <div className="loginFormWrap">
          <div className="loginIntro">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your exam dashboard.</p>
          </div>

          <form className="loginForm" onSubmit={onSubmit} noValidate>
            <div className="loginField">
              <label htmlFor="email">Email or Username</label>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">mail</span>
                <input
                  id="email"
                  value={email}
                  type="text"
                  autoComplete="email"
                  placeholder="e.g. alex@university.edu"
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="loginField">
              <div className="loginFieldRow">
                <label htmlFor="password">Password</label>
                <Link className="loginLink" to="/forgot-password">
                  Forgot password?
                </Link>
              </div>
              <div className="loginInputWrap">
                <span className="material-symbols-outlined">lock</span>
                <input
                  id="password"
                  value={password}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
                <button
                  className="loginEyeBtn"
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="Toggle password"
                >
                  <span className="material-symbols-outlined">visibility</span>
                </button>
              </div>
            </div>

            <div className="loginRemember">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <label htmlFor="remember">Remember me for 30 days</label>
            </div>

            {error && <div className="loginAlert error">{error}</div>}
            {success && <div className="loginAlert success">{success}</div>}

            <button className="loginSubmit" type="submit" disabled={loading}>
              <span>Sign In to Portal</span>
              <span className="material-symbols-outlined">login</span>
            </button>
          </form>

          <div className="loginDivider">
            <span>Or continue with</span>
          </div>

          <div className="loginSocial">
            <div className={`loginGoogleWrap${googleReady ? "" : " is-disabled"}`}>
              <div className="loginGoogleVisual" aria-hidden="true">
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
              </div>
              <div className="loginGoogleNative" ref={googleBtnRef} aria-hidden="true" />
            </div>
            <button type="button" onClick={onFacebookClick} disabled={!fbReady}>
              <svg className="loginSocialIcon" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>

          {googleVerify.required && (
            <form className="loginVerify" onSubmit={handleGoogleVerify}>
              <p>
                Enter the 6-digit code sent to{" "}
                <strong>{googleVerify.email || "your email"}</strong>.
              </p>
              <div className="loginVerifyRow">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter code"
                  value={googleVerify.code}
                  onChange={(e) =>
                    setGoogleVerify((prev) => ({
                      ...prev,
                      code: e.target.value.replace(/\D/g, "")
                    }))
                  }
                  disabled={googleVerifying}
                />
                <button type="submit" disabled={googleVerifying}>
                  {googleVerifying ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>
          )}

          <p className="loginSignup">
            Don&apos;t have an account?{" "}
            <Link to="/register">Sign up for free</Link>
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
