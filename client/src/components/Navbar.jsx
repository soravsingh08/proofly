import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Icon } from "./icons";

// dark <-> beige switch; the pre-paint script in index.html reads the
// same localStorage key so there is never a flash of wrong theme
function ThemeToggle() {
  const [theme, setTheme] = useState(
    document.documentElement.dataset.theme || "dark"
  );
  function flip() {
    const t = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = t;
    localStorage.setItem("proofly_theme", t);
    setTheme(t);
  }
  return (
    <button
      onClick={flip}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="w-8 h-8 shrink-0 rounded-full border border-line text-mute hover:text-ink hover:border-mute transition flex items-center justify-center"
    >
      {theme === "dark" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

// Broken-ring logo mark, terracotta
function Mark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="#c4633a"
        strokeWidth="5"
        strokeDasharray="40 14"
        strokeLinecap="round"
        transform="rotate(-45 12 12)"
      />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ? ROLES[user.role] : null;

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 text-sm transition ${
      isActive ? "text-ink" : "text-mute hover:text-ink"
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-bg/70 backdrop-blur-xl border-b border-line/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-2">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-6">
          <span className="font-semibold text-lg tracking-tight">
            Proofly<span className="align-super text-[8px] text-mute">®</span>
          </span>
          <Mark />
        </Link>

        {/* page links live in the bottom tab bar on mobile */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
            <NavLink to="/log" className={linkCls}>Log Activity</NavLink>
            <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>
            <NavLink to="/connections" className={linkCls}>
              {user.role === "developer"
                ? "Connections"
                : user.role === "designer"
                ? "Connect YouTube"
                : "Connect Sheets"}
            </NavLink>
            {role?.importable && (
              <NavLink to="/import" className={linkCls}>Import</NavLink>
            )}
            <NavLink to="/how-to-use" className={linkCls}>How to use</NavLink>
          </div>
        )}
        {!user && (
          <>
            <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>
            <NavLink to="/about" className={linkCls}>About us</NavLink>
          </>
        )}

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {user ? (
            <>
              {user.username && (
                <Link
                  to={`/u/${user.username}`}
                  className="text-sm text-mute hover:text-ink transition"
                  title="Your public profile"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={role?.icon} size={13} />
                    @{user.username}
                  </span>
                </Link>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-xs text-mute hover:text-red-400 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-mute hover:text-ink transition px-2"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="text-sm bg-brand text-ink font-medium rounded-full px-5 py-2 hover:bg-[#d0764c] transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
