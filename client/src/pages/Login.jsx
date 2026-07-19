import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ROLES } from "../config/roles";
import { Button, Input, PasswordInput } from "../components/ui";
import AuthLayout from "../components/AuthLayout";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const intent = ROLES[params.get("role")];
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/auth/login", form);
      login(r.data);
      navigate(r.data.user.role ? "/dashboard" : "/choose-role");
    } catch (err) {
      setError(errMsg(err, "Login failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={intent ? `Login as ${intent.label}` : "Welcome back"}
      subtitle="Your proof-of-work is waiting."
      footer={
        <>
          New here?{" "}
          <Link to="/register" className="text-brand hover:underline">
            Create your profile
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <PasswordInput
          label="Password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button className="w-full py-2.5" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
