import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("proofly_user")) || null;
    } catch {
      return null;
    }
  });
  const [booting, setBooting] = useState(!!localStorage.getItem("proofly_token"));

  // re-validate token on boot; interceptor handles expiry
  useEffect(() => {
    if (!localStorage.getItem("proofly_token")) return;
    api
      .get("/auth/me")
      .then((r) => saveUser(r.data.user))
      .catch(() => {})
      .finally(() => setBooting(false));
  }, []);

  function saveUser(u) {
    setUser(u);
    localStorage.setItem("proofly_user", JSON.stringify(u));
  }

  function login({ token, user: u }) {
    localStorage.setItem("proofly_token", token);
    saveUser(u);
  }

  function logout() {
    localStorage.removeItem("proofly_token");
    localStorage.removeItem("proofly_user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, booting, login, logout, saveUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
