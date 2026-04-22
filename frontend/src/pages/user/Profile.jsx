import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/AuthContext.jsx";
import { api } from "../../api/index.js";
import "../../profileMessages.css";

export default function UserProfile() {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saveState, setSaveState] = useState({ type: "", message: "" });
  const [saving, setSaving] = useState(false);
  const [avatarSrc, setAvatarSrc] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    next: false,
    confirm: false
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [historyResults, setHistoryResults] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 5;
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [replyError, setReplyError] = useState("");
  const [replySending, setReplySending] = useState(false);
  const toastTimer = useRef(null);
  const avatarInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const toDateInput = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  };

  const buildForm = (source) => ({
    name: source?.name || "",
    email: source?.email || "",
    dob: toDateInput(source?.dob),
    gender: source?.gender || "",
    phone: source?.phone || "",
  });

  const baseForm = useMemo(
    () => buildForm(profile || user),
    [profile, user]
  );

  const [form, setForm] = useState(baseForm);

  useEffect(() => {
    setForm(baseForm);
  }, [baseForm]);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setProfile(null);
      setLoadError("");
      return () => {
        alive = false;
      };
    }

    api
      .me(token)
      .then((data) => {
        if (!alive) return;
        setProfile(data);
        setLoadError("");
      })
      .catch((err) => {
        if (!alive) return;
        setLoadError(err?.message || "Unable to load profile.");
      });

    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setHistoryResults([]);
      setHistoryLoading(false);
      setHistoryError("");
      return () => {
        alive = false;
      };
    }
    setHistoryLoading(true);
    api
      .getMyResults(token)
      .then((data) => {
        if (!alive) return;
        setHistoryResults(Array.isArray(data) ? data : []);
        setHistoryError("");
      })
      .catch((err) => {
        if (!alive) return;
        setHistoryError(err?.message || "Unable to load test history.");
      })
      .finally(() => {
        if (!alive) return;
        setHistoryLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setMessages([]);
      setMessagesLoading(false);
      setMessagesError("");
      return () => {
        alive = false;
      };
    }
    if (activeTab !== "messages") {
      return () => {
        alive = false;
      };
    }
    setMessagesLoading(true);
    setMessagesError("");
    api
      .listMyMessages(token)
      .then((data) => {
        if (!alive) return;
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!alive) return;
        setMessagesError(err?.message || "Unable to load messages.");
      })
      .finally(() => {
        if (!alive) return;
        setMessagesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, activeTab]);

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleDiscard = () => setForm(baseForm);

  const updatePasswordField = (field) => (event) => {
    setPasswordForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (!token) {
      setSaveState({ type: "error", message: "You are not logged in." });
      return;
    }
    setSaving(true);
    setSaveState({ type: "", message: "" });
    api
      .updateMe(token, {
        name: form.name,
        email: form.email,
        dob: form.dob || "",
        gender: form.gender || "",
        phone: form.phone || ""
      })
      .then((data) => {
        setProfile(data?.user || profile);
        setSaveState({ type: "success", message: data?.message || "Profile updated successfully." });
        if (toastTimer.current) {
          clearTimeout(toastTimer.current);
        }
        toastTimer.current = setTimeout(() => {
          setSaveState({ type: "", message: "" });
        }, 3000);
      })
      .catch((err) => {
        setSaveState({ type: "error", message: err?.message || "Update failed." });
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const handlePasswordSave = (event) => {
    event.preventDefault();
    if (!token) {
      setSaveState({ type: "error", message: "You are not logged in." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSaveState({ type: "error", message: "Confirm password does not match." });
      return;
    }
    setPasswordSaving(true);
    setSaveState({ type: "", message: "" });
    api
      .changeMyPassword(token, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      })
      .then((data) => {
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setSaveState({
          type: "success",
          message: data?.message || "Password updated successfully."
        });
        if (toastTimer.current) {
          clearTimeout(toastTimer.current);
        }
        toastTimer.current = setTimeout(() => {
          setSaveState({ type: "", message: "" });
        }, 3000);
      })
      .catch((err) => {
        setSaveState({ type: "error", message: err?.message || "Update failed." });
      })
      .finally(() => {
        setPasswordSaving(false);
      });
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!avatarMenuOpen) return;
    const handleClickOutside = (event) => {
      if (!avatarMenuRef.current) return;
      if (!avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [avatarMenuOpen]);

  const avatarKey = useMemo(() => {
    const keySource =
      profile?._id ||
      profile?.id ||
      user?._id ||
      user?.id ||
      profile?.email ||
      user?.email ||
      "";
    return keySource ? `avatar:${keySource}` : "";
  }, [profile, user]);

  useEffect(() => {
    if (!avatarKey) {
      setAvatarSrc("");
      return;
    }
    try {
      const stored = localStorage.getItem(avatarKey);
      setAvatarSrc(stored || "");
    } catch {
      setAvatarSrc("");
    }
  }, [avatarKey]);

  const handleAvatarPick = () => {
    setAvatarMenuOpen(false);
    if (avatarInputRef.current) {
      avatarInputRef.current.click();
    }
  };

  const handleAvatarRemove = () => {
    setAvatarMenuOpen(false);
    setAvatarSrc("");
    if (avatarKey) {
      try {
        localStorage.removeItem(avatarKey);
      } catch {
        setAvatarError("Unable to remove avatar.");
      }
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please select an image file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image size must be under 2MB.");
      return;
    }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") return;
      setAvatarSrc(result);
      if (avatarKey) {
        try {
          localStorage.setItem(avatarKey, result);
        } catch {
          setAvatarError("Unable to save avatar locally.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displayName = profile?.name || user?.name || "User";
  const displayEmail = profile?.email || user?.email || "";
  const initials = (displayName || displayEmail || "U").trim().charAt(0).toUpperCase();
  const currentUserId = profile?._id || profile?.id || user?._id || user?.id || "";

  const formatDate = (value) => {
    if (!value) return "--";
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const formatTimeSpent = (seconds) => {
    if (seconds === null || seconds === undefined || seconds === "") return "--";
    const total = Math.max(0, Number(seconds));
    if (!Number.isFinite(total)) return "--";
    const hrs = Math.floor(total / 3600);
    const mins = Math.floor((total % 3600) / 60);
    const secs = Math.floor(total % 60);
    if (hrs > 0) return `${hrs}h ${String(mins).padStart(2, "0")}m`;
    if (mins > 0) return `${mins}m ${String(secs).padStart(2, "0")}s`;
    return `${secs}s`;
  };

  const formatScore = (score, total) => {
    if (score === null || score === undefined) return { scoreText: "--", totalText: "" };
    const scoreValue = Number(score);
    const totalValue = total === null || total === undefined ? null : Number(total);
    const scoreText = Number.isInteger(scoreValue)
      ? String(scoreValue)
      : scoreValue.toFixed(1);
    const totalText =
      totalValue === null || !Number.isFinite(totalValue)
        ? ""
        : Number.isInteger(totalValue)
        ? String(totalValue)
        : totalValue.toFixed(1);
    return { scoreText, totalText };
  };

  const getCategoryMeta = (name) => {
    const label = (name || "").trim();
    if (!label) {
      return { chip: "--", chipClass: "is-default", iconClass: "is-default" };
    }
    const lower = label.toLowerCase();
    if (lower.includes("ielts")) {
      return { chip: "IELTS", chipClass: "is-ielts", iconClass: "is-ielts" };
    }
    if (lower.includes("toeic")) {
      return { chip: "TOEIC", chipClass: "is-toeic", iconClass: "is-toeic" };
    }
    return { chip: label, chipClass: "is-default", iconClass: "is-default" };
  };

  const historyPageCount = Math.max(
    1,
    Math.ceil(historyResults.length / historyPageSize)
  );
  const historyCurrentPage = Math.min(historyPage, historyPageCount);
  const historyPaged = useMemo(() => {
    const start = (historyCurrentPage - 1) * historyPageSize;
    return historyResults.slice(start, start + historyPageSize);
  }, [historyResults, historyCurrentPage, historyPageSize]);
  const historyShowingStart = historyResults.length
    ? (historyCurrentPage - 1) * historyPageSize + 1
    : 0;
  const historyShowingEnd = Math.min(
    historyCurrentPage * historyPageSize,
    historyResults.length
  );
  const historyPageButtons = useMemo(
    () => Array.from({ length: Math.min(3, historyPageCount) }, (_, i) => i + 1),
    [historyPageCount]
  );

  const adminRecipients = useMemo(() => {
    const map = new Map();
    messages.forEach((msg) => {
      const sender = msg?.senderId;
      if (sender?.role === "ADMIN" && sender._id) {
        map.set(sender._id, sender);
      }
    });
    return Array.from(map.values());
  }, [messages]);

  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const ta = new Date(a?.createdAt || 0).getTime();
      const tb = new Date(b?.createdAt || 0).getTime();
      return ta - tb;
    });
  }, [messages]);

  const chatDayLabel = useMemo(() => {
    if (!sortedMessages.length) return "";
    const last = sortedMessages[sortedMessages.length - 1];
    if (!last?.createdAt) return "";
    const date = new Date(last.createdAt);
    if (Number.isNaN(date.getTime())) return "";
    const day = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    });
    const time = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit"
    });
    return `${day}, ${time}`;
  }, [sortedMessages]);

  useEffect(() => {
    if (!adminRecipients.length) {
      setReplyTo("");
      return;
    }
    if (replyTo) return;
    setReplyTo(adminRecipients[0]._id);
  }, [adminRecipients, replyTo]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyResults.length]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (!tab) return;
    if (tab === "personal" || tab === "security" || tab === "history" || tab === "messages") {
      setActiveTab(tab);
    }
  }, [location.search]);

  const setTab = (tab) => {
    setActiveTab(tab);
    if (tab === "personal") {
      navigate("/user/profile", { replace: true });
    } else {
      navigate(`/user/profile?tab=${tab}`, { replace: true });
    }
  };

  const refreshMessages = () => {
    if (!token) return;
    setMessagesLoading(true);
    setMessagesError("");
    api
      .listMyMessages(token)
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setMessagesError(err?.message || "Unable to load messages.");
      })
      .finally(() => {
        setMessagesLoading(false);
      });
  };

  const sendReply = async () => {
    const content = replyText.trim();
    if (!content) {
      setReplyError("Please enter a message.");
      return;
    }
    if (!replyTo) {
      setReplyError("No admin recipient available.");
      return;
    }
    setReplySending(true);
    setReplyError("");
    try {
      await api.sendMessage(token, replyTo, content);
      setReplyText("");
      refreshMessages();
    } catch (err) {
      setReplyError(err?.message || "Unable to send message.");
    } finally {
      setReplySending(false);
    }
  };

  return (
    <div className="portalPage profilePage">
      <header className="portalTopbar">
        <div className="portalShell portalTopbarInner">
          <div className="portalBrand">
            <span className="portalLogo">
              <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
            </span>
            <span>English Portal</span>
          </div>
          <nav className="portalNav">
            <button type="button" onClick={() => navigate("/user")}>
              Home
            </button>
            <button type="button" onClick={() => navigate("/user/practice")}>
              Practice
            </button>
            <button type="button" onClick={() => navigate("/user/exams")}>
              Exams
            </button>
            <button type="button" onClick={() => navigate("/user/profile?tab=history")}>
              History
            </button>
          </nav>
          <div className="portalActions">
            <label className="portalSearch">
              <span className="material-symbols-outlined portalIcon">search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search courses or exams..."
                aria-label="Search courses or exams"
              />
            </label>
            <span className="material-symbols-outlined portalIcon">notifications</span>
            <button className="portalBtn" onClick={() => navigate("/user/profile")}>
              {displayName || "Profile"}
            </button>
          </div>
        </div>
      </header>

      <main className="portalMain">
        <div className="portalShell profileShell">
          <div className="profileGrid">
            <aside className="profileSidebar">
              <div className="profileMenuCard">
                <p className="profileMenuTitle">Settings</p>
                <button
                  type="button"
                  className={`profileMenuItem ${activeTab === "personal" ? "is-active" : ""}`}
                  onClick={() => setTab("personal")}
                >
                  <span className="material-symbols-outlined">person</span>
                  Personal Info
                </button>
                <button
                  type="button"
                  className={`profileMenuItem ${activeTab === "security" ? "is-active" : ""}`}
                  onClick={() => setTab("security")}
                >
                  <span className="material-symbols-outlined">security</span>
                  Security
                </button>
                <button
                  type="button"
                  className={`profileMenuItem ${activeTab === "history" ? "is-active" : ""}`}
                  onClick={() => setTab("history")}
                >
                  <span className="material-symbols-outlined">history</span>
                  Test History
                </button>
                <button
                  type="button"
                  className={`profileMenuItem ${activeTab === "messages" ? "is-active" : ""}`}
                  onClick={() => setTab("messages")}
                >
                  <span className="material-symbols-outlined">mail</span>
                  Messages
                </button>
                <button type="button" className="profileMenuItem">
                  <span className="material-symbols-outlined">subscriptions</span>
                  Subscriptions
                </button>
                <div className="profileMenuDivider" />
                <button type="button" className="profileMenuItem profileLogout" onClick={handleLogout}>
                  <span className="material-symbols-outlined">logout</span>
                  Sign Out
                </button>
              </div>

              <div className="profileLevelCard">
                <div className="profileLevelBadge">LEVEL</div>
                {activeTab === "security" ? (
                  <>
                    <h3>Stay Protected</h3>
                    <p>Last password change was 3 months ago.</p>
                  </>
                ) : (
                  <>
                    <h3>Advanced</h3>
                    <p>Profile completion is at 85%. Finish it to get a boost!</p>
                  </>
                )}
              </div>
            </aside>

            <section className="profileContent">
              {activeTab === "personal" && (
                <>
                  <div className="profileHeader">
                    <h2>Personal Information</h2>
                    <p>Update your profile details and how others see you on the platform.</p>
                  </div>

                  {loadError && <div className="profileLoadError">{loadError}</div>}

                  <form className="profileFormCard" onSubmit={handleSave}>
                    <div className="profileAvatarRow">
                      <div className="profileAvatarWrap" ref={avatarMenuRef}>
                        <div
                          className="profileAvatar"
                          role="button"
                          tabIndex={0}
                          onClick={() => setAvatarMenuOpen((prev) => !prev)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setAvatarMenuOpen((prev) => !prev);
                            }
                          }}
                        >
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={displayName || "Avatar"} />
                          ) : (
                            <span>{initials}</span>
                          )}
                          <button
                            className="profileAvatarBtn"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAvatarMenuOpen((prev) => !prev);
                            }}
                            aria-label="Profile photo options"
                          >
                            <span className="material-symbols-outlined">photo_camera</span>
                          </button>
                        </div>
                        {avatarMenuOpen && (
                          <div
                            className="profileAvatarMenu"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button type="button" onClick={handleAvatarPick}>
                              Change photo
                            </button>
                            <button type="button" className="danger" onClick={handleAvatarRemove}>
                              Remove photo
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3>Change Profile Photo</h3>
                        <p>JPG, GIF or PNG. Max size of 2MB.</p>
                      </div>
                    </div>
                    <input
                      ref={avatarInputRef}
                      className="profileAvatarInput"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                    {avatarError && <p className="profileAvatarError">{avatarError}</p>}

                    <div className="profileFormGrid">
                      <label className="profileField">
                        <span>Full Name</span>
                        <input type="text" value={form.name} onChange={updateField("name")} />
                      </label>
                      <label className="profileField">
                        <span>Email Address</span>
                        <input type="email" value={form.email} onChange={updateField("email")} />
                      </label>
                      <label className="profileField">
                        <span>Date of Birth</span>
                        <input type="date" value={form.dob} onChange={updateField("dob")} />
                      </label>
                      <label className="profileField">
                        <span>Gender</span>
                        <select value={form.gender} onChange={updateField("gender")}>
                          <option value="">Select Gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </label>
                      <label className="profileField">
                        <span>Phone Number</span>
                        <input type="tel" value={form.phone} onChange={updateField("phone")} />
                      </label>
                    </div>

                    <div className="profileFormActions">
                      <button type="button" className="profileBtn ghost" onClick={handleDiscard}>
                        Discard
                      </button>
                      <button type="submit" className="profileBtn primary">
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>

                  <div className="profileCallout">
                    <span className="material-symbols-outlined">info</span>
                    <div>
                      <strong>Why we need this?</strong>
                      <p>
                        Your information is used to personalize your learning journey and generate
                        official certificates for completed exams.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <div className="profileHeader">
                    <h2>Security Settings</h2>
                    <p>Manage your password and enhance your account security with two-factor authentication.</p>
                  </div>

                  <div className="securityStack">
                    <div className="securityCard">
                      <div className="securityCardHead">
                        <h3>Change Password</h3>
                        <p>Update your account password regularly for better security.</p>
                      </div>
                      <form className="securityForm" onSubmit={handlePasswordSave}>
                        <label className="securityField">
                          <span>Current Password</span>
                          <div className="securityInput">
                            <span className="material-symbols-outlined">lock</span>
                            <input
                              type={passwordVisible.current ? "text" : "password"}
                              value={passwordForm.currentPassword}
                              onChange={updatePasswordField("currentPassword")}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({
                                  ...prev,
                                  current: !prev.current
                                }))
                              }
                            >
                              <span className="material-symbols-outlined">
                                {passwordVisible.current ? "visibility_off" : "visibility"}
                              </span>
                            </button>
                          </div>
                        </label>
                        <label className="securityField">
                          <span>New Password</span>
                          <div className="securityInput">
                            <span className="material-symbols-outlined">lock_reset</span>
                            <input
                              type={passwordVisible.next ? "text" : "password"}
                              value={passwordForm.newPassword}
                              onChange={updatePasswordField("newPassword")}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({ ...prev, next: !prev.next }))
                              }
                            >
                              <span className="material-symbols-outlined">
                                {passwordVisible.next ? "visibility_off" : "visibility"}
                              </span>
                            </button>
                          </div>
                        </label>
                        <label className="securityField">
                          <span>Confirm New Password</span>
                          <div className="securityInput">
                            <span className="material-symbols-outlined">verified_user</span>
                            <input
                              type={passwordVisible.confirm ? "text" : "password"}
                              value={passwordForm.confirmPassword}
                              onChange={updatePasswordField("confirmPassword")}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setPasswordVisible((prev) => ({
                                  ...prev,
                                  confirm: !prev.confirm
                                }))
                              }
                            >
                              <span className="material-symbols-outlined">
                                {passwordVisible.confirm ? "visibility_off" : "visibility"}
                              </span>
                            </button>
                          </div>
                        </label>
                        <div className="securityActions">
                          <button type="submit" className="profileBtn primary">
                            {passwordSaving ? "Saving..." : "Update Password"}
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="securityTwoFactor">
                      <div className="securityTwoFactorInfo">
                        <div className="securityIcon">
                          <span className="material-symbols-outlined">phonelink_lock</span>
                        </div>
                        <div>
                          <h3>Two-Factor Authentication (2FA)</h3>
                          <p>
                            Two-factor authentication adds an extra layer of security to your account by
                            requiring more than just a password to log in.
                          </p>
                        </div>
                      </div>
                      <label className="securityToggle">
                        <input type="checkbox" checked readOnly />
                        <span className="securityToggleTrack" />
                        <span className="securityToggleLabel">Enabled</span>
                      </label>
                    </div>

                    <div className="securityTip">
                      <div className="securityTipIcon">
                        <span className="material-symbols-outlined">shield</span>
                      </div>
                      <div>
                        <strong>Security Tip</strong>
                        <p>
                          Avoid using common words or personal information in your password. A strong
                          password should be at least 12 characters long and include special characters.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === "history" && (
                <div className="userHistoryContent">
                  <header className="userHistoryIntro userHistoryIntro--history">
                    <div>
                      <h1>Test History</h1>
                      <p>Review your past performance and track your progress over time.</p>
                    </div>
                    <div className="userHistoryActions">
                      <button className="userHistoryActionBtn" type="button">
                        <span className="material-symbols-outlined">filter_list</span>
                        Filter
                      </button>
                      <button className="userHistoryActionBtn" type="button">
                        <span className="material-symbols-outlined">file_download</span>
                        Export
                      </button>
                    </div>
                  </header>

                  <div className="userHistoryTable">
                    <div className="userHistoryTableScroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Test Name</th>
                            <th>Category</th>
                            <th>Date Taken</th>
                            <th>Score</th>
                            <th>Time Spent</th>
                            <th className="is-right">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyLoading && (
                            <tr>
                              <td className="userHistoryEmptyCell" colSpan={6}>
                                Loading your history...
                              </td>
                            </tr>
                          )}
                          {!historyLoading && historyError && (
                            <tr>
                              <td className="userHistoryEmptyCell is-error" colSpan={6}>
                                {historyError}
                              </td>
                            </tr>
                          )}
                          {!historyLoading && !historyError && historyPaged.length === 0 && (
                            <tr>
                              <td className="userHistoryEmptyCell" colSpan={6}>
                                No tests found yet. Start your first exam to see results here.
                              </td>
                            </tr>
                          )}
                          {!historyLoading && !historyError && historyPaged.map((r, idx) => {
                            const title = r.examTitle || r.examId?.title || "--";
                            const rawCategory = r.examCategoryName || r.examId?.category?.name || "";
                            const meta = getCategoryMeta(rawCategory);
                            const score = formatScore(r.score, r.total);
                            const resultId = r._id || r.id;
                            return (
                              <tr key={r._id || r.id || `${title}-${idx}`}>
                                <td>
                                  <div className="userHistoryExamCell">
                                    <div className={`userHistoryExamIcon ${meta.iconClass}`}>
                                      <span className="material-symbols-outlined">assignment</span>
                                    </div>
                                    <span className="userHistoryExamTitle">{title}</span>
                                  </div>
                                </td>
                                <td>
                                  <span className={`userHistoryTag ${meta.chipClass}`}>{meta.chip}</span>
                                </td>
                                <td className="userHistoryMuted">{formatDate(r.submittedAt)}</td>
                                <td>
                                  <span className="userHistoryScoreValue">{score.scoreText}</span>
                                  {score.totalText && (
                                    <span className="userHistoryScoreTotal">/{score.totalText}</span>
                                  )}
                                </td>
                                <td className="userHistoryMuted">{formatTimeSpent(r.timeSpent)}</td>
                                <td className="is-right">
                                  <button
                                    className="userHistoryReviewBtn"
                                    type="button"
                                    disabled={!resultId}
                                    onClick={() => {
                                      if (resultId) navigate(`/user/results/${resultId}`);
                                    }}
                                  >
                                    Review
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="userHistoryTableFooter userHistoryTableFooter--pager">
                      <p>
                        Showing {historyShowingStart}-{historyShowingEnd} of {historyResults.length} results
                      </p>
                      <div className="userHistoryPagination">
                        <button
                          className="userHistoryPageBtn"
                          type="button"
                          disabled={historyCurrentPage === 1}
                          onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        >
                          <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        {historyPageButtons.map((num) => (
                          <button
                            key={num}
                            type="button"
                            className={`userHistoryPageBtn ${num === historyCurrentPage ? "is-active" : ""}`}
                            onClick={() => setHistoryPage(num)}
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          className="userHistoryPageBtn"
                          type="button"
                          disabled={historyCurrentPage === historyPageCount}
                          onClick={() => setHistoryPage((p) => Math.min(historyPageCount, p + 1))}
                        >
                          <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "messages" && (
                <div className="profileMessages">
                  <div className="profileChatCard">
                    <div className="profileChatHeader">
                      <div className="profileChatUser">
                        <span className="profileChatAvatar">
                          {(adminRecipients[0]?.name || "A").trim().charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="profileChatName">
                            {adminRecipients[0]?.name || "Admin Team"}
                          </div>
                          <div className="profileChatStatus">
                            <span className="profileChatStatusDot" />
                            Active now
                          </div>
                        </div>
                        <span className="profileChatBadge">ADMIN</span>
                      </div>
                      <div className="profileChatActions">
                        <button type="button" className="profileChatIcon" title="Call">
                          <span className="material-symbols-outlined">call</span>
                        </button>
                        <button type="button" className="profileChatIcon" title="Video">
                          <span className="material-symbols-outlined">videocam</span>
                        </button>
                        <button
                          type="button"
                          className="profileChatIcon"
                          title="Refresh"
                          onClick={refreshMessages}
                          disabled={messagesLoading}
                        >
                          <span className="material-symbols-outlined">refresh</span>
                        </button>
                      </div>
                    </div>

                    <div className="profileChatBody">
                      {messagesError && <div className="profileLoadError">{messagesError}</div>}

                      {messagesLoading && (
                        <div className="profileChatEmpty">Loading messages...</div>
                      )}

                      {!messagesLoading && !messagesError && sortedMessages.length === 0 && (
                        <div className="profileChatEmpty">
                          <strong>No messages yet.</strong>
                          <p>Admins will send announcements or feedback here.</p>
                        </div>
                      )}

                      {!messagesLoading && !messagesError && sortedMessages.length > 0 && (
                        <>
                          {chatDayLabel && (
                            <div className="profileChatDay">{chatDayLabel}</div>
                          )}
                          {sortedMessages.map((msg) => {
                            const isSender =
                              currentUserId && msg?.senderId?._id === currentUserId;
                            return (
                              <div
                                key={msg._id}
                                className={`profileChatBubble ${
                                  isSender ? "is-outgoing" : "is-incoming"
                                }`}
                              >
                                <div className="profileChatBubbleText">{msg.content}</div>
                                <span className="profileChatBubbleTime">
                                  {msg.createdAt
                                    ? new Date(msg.createdAt).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit"
                                      })
                                    : ""}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>

                    <div className="profileChatComposer">
                      <button type="button" className="profileChatIcon" title="Add">
                        <span className="material-symbols-outlined">add_circle</span>
                      </button>
                      <button type="button" className="profileChatIcon" title="Attach">
                        <span className="material-symbols-outlined">attach_file</span>
                      </button>
                      <input
                        type="text"
                        placeholder="Type a message..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            sendReply();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="profileChatSend"
                        onClick={sendReply}
                        disabled={replySending || !adminRecipients.length}
                        title="Send"
                      >
                        <span className="material-symbols-outlined">send</span>
                      </button>
                    </div>
                    {replyError && <div className="profileLoadError">{replyError}</div>}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {saveState.message && (
        <div className={`profileToast ${saveState.type}`}>
          <span className="material-symbols-outlined">
            {saveState.type === "success" ? "check_circle" : "error"}
          </span>
          <span>{saveState.message}</span>
          <button
            type="button"
            className="profileToastClose"
            onClick={() => setSaveState({ type: "", message: "" })}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      <footer className="portalFooter">
        <div className="portalShell portalFooterGrid">
          <div>
            <h4>English Portal</h4>
            <p>
              Empowering students worldwide to achieve their English language goals through
              interactive learning.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <a href="#home">About Us</a>
            <a href="#pricing">Pricing</a>
            <a href="#schools">For Schools</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#help">Help Center</a>
            <a href="#contact">Contact Us</a>
            <a href="#terms">Terms of Service</a>
          </div>
          <div>
            <h4>Connect</h4>
            <div className="portalSocial">
              <span>🌐</span>
              <span>✉️</span>
              <span>📷</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
