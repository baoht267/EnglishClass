import React, { createContext, useContext, useMemo, useState } from "react";
import { decodeJwt } from "../lib/jwt.js";

const AuthContext = createContext(null);
const storageKey = "english_quiz_token";
const mustChangeKey = "english_quiz_must_change";

const getStoredToken = () => localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey) || "";
const getStoredMustChange = (persist) => {
  const raw = persist ? localStorage.getItem(mustChangeKey) : sessionStorage.getItem(mustChangeKey);
  return raw === "1";
};

export const AuthProvider = ({ children }) => {
  const [persist, setPersist] = useState(() => !!localStorage.getItem(storageKey));
  const [token, setToken] = useState(() => getStoredToken());
  const [mustChangePassword, setMustChangePasswordState] = useState(() =>
    getStoredMustChange(!!localStorage.getItem(storageKey))
  );
  const user = useMemo(() => decodeJwt(token), [token]);

  const setMustChangePassword = (value) => {
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(mustChangeKey, value ? "1" : "0");
    setMustChangePasswordState(!!value);
  };

  const login = (nextToken, options = {}) => {
    const remember = !!options.remember;
    const storage = remember ? localStorage : sessionStorage;
    const other = remember ? sessionStorage : localStorage;
    other.removeItem(storageKey);
    other.removeItem(mustChangeKey);
    storage.setItem(storageKey, nextToken);
    setPersist(remember);
    setToken(nextToken);
    if (typeof options.mustChangePassword === "boolean") {
      storage.setItem(mustChangeKey, options.mustChangePassword ? "1" : "0");
      setMustChangePasswordState(!!options.mustChangePassword);
    }
  };

  const logout = () => {
    sessionStorage.removeItem(storageKey);
    sessionStorage.removeItem(mustChangeKey);
    localStorage.removeItem(storageKey);
    localStorage.removeItem(mustChangeKey);
    setToken("");
    setMustChangePasswordState(false);
    setPersist(false);
  };

  const value = useMemo(
    () => ({ token, user, login, logout, mustChangePassword, setMustChangePassword }),
    [token, user, mustChangePassword]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
