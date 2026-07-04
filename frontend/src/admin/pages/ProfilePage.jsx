import React, { useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Btn, ImageUpload } from "@/admin/components/UI";
import { useAuth } from "@/admin/context/AuthContext";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", password: "", avatar: user?.avatar || "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email, avatar: form.avatar };
      if (form.password) payload.password = form.password;
      await adminApi.updateProfile(payload);
      await refreshUser();
      toast.success("Profile updated");
      setForm((f) => ({ ...f, password: "" }));
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-md space-y-6">
      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-red-600/20 grid place-items-center text-red-400 text-2xl font-bold overflow-hidden">
            {form.avatar ? <img src={form.avatar} alt="avatar" className="w-full h-full object-cover" /> : (user?.name?.[0]?.toUpperCase() || "A")}
          </div>
          <div>
            <div className="text-white font-semibold">{user?.name}</div>
            <div className="text-white/40 text-sm">{user?.email}</div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="New Password (leave blank to keep current)">
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
          </Field>
          <ImageUpload label="Profile Picture" value={form.avatar} onChange={(v, uploadData) => set("avatar", uploadData || v)} />
        </div>
      </Card>
      <Btn loading={saving} onClick={save} className="w-full justify-center py-3">Save Profile</Btn>
    </div>
  );
}
