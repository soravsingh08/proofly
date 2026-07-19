import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import AssistantWidget from "./components/AssistantWidget";
import { ToastHost } from "./components/toast";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ChooseRole from "./pages/ChooseRole";
import Dashboard from "./pages/Dashboard";
import LogActivity from "./pages/LogActivity";
import PublicProfile from "./pages/PublicProfile";
import Leaderboard from "./pages/Leaderboard";
import ImportMetaAds from "./pages/ImportMetaAds";
import Connections from "./pages/Connections";
import HowToUse from "./pages/HowToUse";
import Resume from "./pages/Resume";

// Route guards (edge cases A4, A5): logged out -> /login;
// logged in without a role -> forced to /choose-role.
function Protected({ children, needsRole = true }) {
  const { user, booting } = useAuth();
  const location = useLocation();
  if (booting) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (needsRole && !user.role) return <Navigate to="/choose-role" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to={user.role ? "/dashboard" : "/choose-role"} replace />;
  return children;
}

// Re-mounts on every route change so each page fades/rises in.
function PageFade({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-fade">
      {children}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <PageFade>
        <Routes>
          <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
          <Route
            path="/choose-role"
            element={<Protected needsRole={false}><ChooseRole /></Protected>}
          />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/log" element={<Protected><LogActivity /></Protected>} />
          <Route path="/connections" element={<Protected><Connections /></Protected>} />
          <Route path="/how-to-use" element={<Protected><HowToUse /></Protected>} />
          <Route path="/import" element={<Protected><ImportMetaAds /></Protected>} />
          {/* public — no auth */}
          <Route path="/u/:username" element={<PublicProfile />} />
          <Route path="/u/:username/resume" element={<Resume />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageFade>
        <AssistantWidget />
        <ToastHost />
      </BrowserRouter>
    </AuthProvider>
  );
}
