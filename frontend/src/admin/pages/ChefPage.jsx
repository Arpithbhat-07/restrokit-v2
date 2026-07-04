import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";

export default function ChefPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getChef();
      setData(r.data && Object.keys(r.data).length ? r.data : {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (saving) return;
    if (!data.name?.trim()) { toast.error("Chef name is required"); return; }
    setSaving(true);
    try {
      // Strip MongoDB internal fields before sending
      const { _id, ...payload } = data;
      const { data: saved } = await adminApi.updateChef(payload);
      setData(saved && Object.keys(saved).length ? saved : payload);
      toast.success("Chef info saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) return <div className="text-white/40 text-sm">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-white mb-5">Chef Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Chef Name *">
              <Input value={data.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="Chef Name" />
            </Field>
            <Field label="Experience">
              <Input value={data.experience || ""} onChange={(e) => set("experience", e.target.value)} placeholder="22 years of culinary craft" />
            </Field>
          </div>
          <Field label="Story / Biography">
            <Textarea rows={4} value={data.story || ""} onChange={(e) => set("story", e.target.value)} placeholder="Chef's story shown on homepage..." />
          </Field>
          <Field label="Signature Quote">
            <Input value={data.quote || ""} onChange={(e) => set("quote", e.target.value)} placeholder="Displayed as italic signature" />
          </Field>
          <ImageUpload label="Chef Photo" value={data.image || data.photo || ""} onChange={(v, uploadData) => set("image", uploadData || v)} />
        </div>
      </Card>
      <Btn loading={saving} onClick={save} className="w-full justify-center py-3">Save Changes</Btn>
    </div>
  );
}
