import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Icon } from "./icons";
import DemoButton from "./DemoButton";

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

  const [menu, setMenu] = useState(false);

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 text-sm whitespace-nowrap transition ${
      isActive ? "text-ink" : "text-mute hover:text-ink"
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-bg/70 backdrop-blur-xl border-b border-line/60">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center gap-2">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-4 md:mr-6 shrink-0">
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
            <NavLink to="/focus" className={linkCls}>Focus lab</NavLink>
            <NavLink to="/how-to-use" className={linkCls}>How to use</NavLink>
          </div>
        )}
        {!user && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>
            <NavLink to="/about" className={linkCls}>About us</NavLink>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              {user.username && (
                <Link
                  to={`/u/${user.username}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink border border-line bg-card2 rounded-full px-3 sm:px-3.5 py-1.5 whitespace-nowrap max-w-[9.5rem] hover:border-brand/60 transition"
                  title="Your public profile"
                >
                  <Icon name={role?.icon} size={13} style={{ color: role?.color }} />
                  <span className="truncate">@{user.username}</span>
                </Link>
              )}
              <button
                onClick={() => { logout(); navigate("/"); }}
                className="text-sm font-medium text-ink border border-line rounded-full px-3 sm:px-3.5 py-1.5 whitespace-nowrap hover:text-red-400 hover:border-red-400/50 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <DemoButton
                label="Live demo"
                className="hidden md:inline-flex text-sm border border-brand/50 text-brand rounded-full px-4 py-2 whitespace-nowrap hover:bg-brand/10 transition"
              />
              <Link
                to="/login"
                className="hidden sm:block text-sm text-mute hover:text-ink transition px-2 whitespace-nowrap"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="hidden sm:block text-sm bg-brand text-ink font-medium rounded-full px-4 sm:px-5 py-2 whitespace-nowrap hover:bg-[#d0764c] transition"
              >
                Sign up
              </Link>
              {/* hamburger — guest links collapse here on mobile */}
              <button
                onClick={() => setMenu(!menu)}
                aria-label={menu ? "Close menu" : "Open menu"}
                className="md:hidden w-9 h-9 shrink-0 rounded-lg border border-line text-mute hover:text-ink flex items-center justify-center transition"
              >
                {menu ? (
                  <Icon name="x" size={16} />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* mobile guest menu */}
      {!user && menu && (
        <div className="md:hidden border-t border-line/60 bg-bg/95 backdrop-blur-xl px-4 py-3 space-y-0.5">
          <Link
            to="/register"
            onClick={() => setMenu(false)}
            className="sm:hidden block text-center text-sm bg-brand text-ink font-medium rounded-lg px-4 py-2.5 mb-2 hover:bg-[#d0764c] transition"
          >
            Sign up free
          </Link>
          <NavLink
            to="/leaderboard"
            onClick={() => setMenu(false)}
            className="block px-2 py-2.5 text-sm text-ink rounded-lg hover:bg-card2 transition"
          >
            Leaderboard
          </NavLink>
          <NavLink
            to="/about"
            onClick={() => setMenu(false)}
            className="block px-2 py-2.5 text-sm text-ink rounded-lg hover:bg-card2 transition"
          >
            About us
          </NavLink>
          <NavLink
            to="/login"
            onClick={() => setMenu(false)}
            className="sm:hidden block px-2 py-2.5 text-sm text-ink rounded-lg hover:bg-card2 transition"
          >
            Login
          </NavLink>
          <div className="pt-2 pb-1">
            <DemoButton
              label="Explore demo accounts"
              className="w-full border border-brand/50 text-brand text-sm rounded-lg px-4 py-2.5 hover:bg-brand/10 transition"
            />
          </div>
        </div>
      )}
    </nav>
  );
}
