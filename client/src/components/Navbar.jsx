import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ? ROLES[user.role] : null;

  const linkCls = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm transition ${
      isActive ? "bg-card2 text-ink" : "text-mute hover:text-ink"
    }`;

  return (
    <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
        <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-2 mr-4">
          <span className="text-lg">✅</span>
          <span className="font-bold tracking-tight">Proofly</span>
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
                  {role?.icon} @{user.username}
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
              <Link to="/login" className="text-sm text-mute hover:text-ink">Login</Link>
              <Link
                to="/register"
                className="text-sm bg-brand text-black font-semibold rounded-lg px-3 py-1.5"
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
