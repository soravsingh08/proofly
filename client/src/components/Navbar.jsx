import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Icon } from "./icons";

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

        {user && (
          <>
            <NavLink to="/dashboard" className={linkCls}>Dashboard</NavLink>
            <NavLink to="/log" className={linkCls}>Log Activity</NavLink>
            <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>
            {role?.importable && (
              <NavLink to="/import" className={linkCls}>Import</NavLink>
            )}
          </>
        )}
        {!user && <NavLink to="/leaderboard" className={linkCls}>Leaderboard</NavLink>}

        <div className="ml-auto flex items-center gap-3">
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
