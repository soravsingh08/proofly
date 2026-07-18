import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errMsg } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Card, Input } from "../components/ui";

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  function set(k, v) {
    // usernames: live-normalize to the allowed charset (A2)
    if (k === "username") v = v.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20);
    setForm({ ...form, [k]: v });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErrors({});
    try {
      const r = await api.post("/auth/register", form);
      login(r.data);
      navigate("/choose-role");
    } catch (err) {
      const field = err.response?.data?.field;
      setErrors(field ? { [field]: errMsg(err) } : { _: errMsg(err, "Registration failed") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 px-4">
      <h1 className="text-2xl font-bold text-center mb-1">Create your profile</h1>
      <p className="text-sm text-mute text-center mb-6">
        Start building proof of your work today.
      </p>
      <Card>
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full name" required value={form.name}
            onChange={(e) => set("name", e.target.value)} error={errors.name} />
          <div>
            <Input label="Username" required value={form.username} placeholder="yourname"
              onChange={(e) => set("username", e.target.value)} error={errors.username} />
            {form.username && (
              <p className="text-[11px] text-mute mt-1">
                Your public profile: proofly.app/u/<span className="text-ink">{form.username}</span>
              </p>
            )}
          </div>
          <Input label="Email" type="email" required value={form.email}
            onChange={(e) => set("email", e.target.value)} error={errors.email} />
          <Input label="Password (6+ characters)" type="password" required value={form.password}
            onChange={(e) => set("password", e.target.value)} error={errors.password} />
          {errors._ && <p className="text-sm text-red-400">{errors._}</p>}
          <Button className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="text-sm text-mute text-center mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-brand hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
