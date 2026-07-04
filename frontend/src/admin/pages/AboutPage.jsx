import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function AboutPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getAbout();
      setData(r.data || {});
    } catch {
      setData({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const setBullet = (i, v) => {
    const bullets = [...(data.bullets || [])];
    bullets[i] = v;
    set("bullets", bullets);
  };
  const addBullet = () => set("bullets", [...(data.bullets || []), ""]);
  const removeBullet = (i) => set("bullets", (data.bullets || []).filter((_, idx) => idx !== i));

  const setStat = (i, k, v) => {
    const stats = [...(data.stats || [])];
    stats[i] = { ...stats[i], [k]: v };
    set("stats", stats);
  };
  const addStat = () => set("stats", [...(data.stats || []), { value: 0, suffix: "+", label: "" }]);
  const removeStat = (i) => set("stats", (data.stats || []).filter((_, idx) => idx !== i));

  const setImage = (i, v, uploadData) => {
    const images = [...(data.images || [])];
    images[i] = uploadData || v;
    set("images", images);
  };

  const save = async () => {
    if (saving) return;
    if (!data.heading?.trim()) { toast.error("Heading is required"); return; }
    setSaving(true);
    try {
      const { _id, ...payload } = data;
      const { data: saved } = await adminApi.updateAbout(payload);
      setData(saved || payload);
      toast.success("About section saved");
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
        <h2 className="font-semibold text-white mb-5">About Content</h2>
        <div className="space-y-4">
          <Field label="Heading *"><Input value={data.heading || ""} onChange={(e) => set("heading", e.target.value)} /></Field>
          <Field label="Paragraph"><Textarea rows={4} value={data.paragraph || ""} onChange={(e) => set("paragraph", e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Bullet Points</h2>
          <Btn variant="secondary" onClick={addBullet}><Plus size={14} /> Add</Btn>
        </div>
        <div className="space-y-2">
          {(data.bullets || []).map((b, i) => (
            <div key={i} className="flex gap-2">
              <Input value={b} onChange={(e) => setBullet(i, e.target.value)} placeholder="Feature" className="flex-1" />
              <button onClick={() => removeBullet(i)} className="text-white/30 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Statistics</h2>
          <Btn variant="secondary" onClick={addStat}><Plus size={14} /> Add</Btn>
        </div>
        <div className="space-y-3">
          {(data.stats || []).map((s, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Input type="number" value={s.value} onChange={(e) => setStat(i, "value", Number(e.target.value))} placeholder="Value" className="w-24" />
              <Input value={s.suffix} onChange={(e) => setStat(i, "suffix", e.target.value)} placeholder="+" className="w-16" />
              <Input value={s.label} onChange={(e) => setStat(i, "label", e.target.value)} placeholder="Label" className="flex-1" />
              <button onClick={() => removeStat(i)} className="text-white/30 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-white mb-4">Images</h2>
        <div className="grid grid-cols-2 gap-4">
          <ImageUpload label="Main Image" value={(data.images || [])[0] || ""} onChange={(v, uploadData) => setImage(0, v, uploadData)} />
          <ImageUpload label="Secondary Image" value={(data.images || [])[1] || ""} onChange={(v, uploadData) => setImage(1, v, uploadData)} />
        </div>
      </Card>

      <Btn loading={saving} onClick={save} className="w-full justify-center py-3">Save Changes</Btn>
    </div>
  );
}
