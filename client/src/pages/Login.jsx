import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
    <div className="max-w-sm mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold text-center mb-1">Welcome back</h1>
      <p className="text-sm text-mute text-center mb-6">
        Your proof-of-work is waiting.
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-mute text-center mt-4">
        New here?{" "}
        <Link to="/register" className="text-brand hover:underline">
          Create your profile
        </Link>
      </p>
    </div>
  );
}
