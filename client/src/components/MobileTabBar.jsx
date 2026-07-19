// App-style bottom tab bar — mobile only, logged-in users only.
// Gives the authed experience a native-app feel on phones.
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Icon } from "./icons";

export default function MobileTabBar() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user || !user.role) return null;
  if (location.pathname.endsWith("/resume")) return null; // print view stays clean

  const tabs = [
    { to: "/dashboard", icon: "flame", label: "Home" },
    { to: "/log", icon: "plus", label: "Log" },
    { to: "/leaderboard", icon: "trophy", label: "Ranks" },
    { to: `/u/${user.username}`, icon: "user", label: "Profile" },
  ];

  return (
    <>
      {/* spacer so page content never hides behind the fixed bar */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <nav className="md:hidden no-print fixed bottom-0 inset-x-0 z-40 bg-bg/90 backdrop-blur-xl border-t border-line">
        <div className="grid grid-cols-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] transition ${
                  isActive ? "text-brand" : "text-mute"
                }`
              }
            >
              <Icon name={t.icon} size={18} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
