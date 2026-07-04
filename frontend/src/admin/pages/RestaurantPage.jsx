import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function RestaurantPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getRestaurant().then((r) => setData(r.data || {})).catch(() => setData({})).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));
  const setSocial = (k, v) => setData((d) => ({ ...d, social: { ...(d.social || {}), [k]: v } }));
  const setHour = (i, k, v) => {
    const hours = [...(data.hours || [])];
    hours[i] = { ...hours[i], [k]: v };
    setData((d) => ({ ...d, hours }));
  };
  const addHour = () => setData((d) => ({ ...d, hours: [...(d.hours || []), { day: "", time: "" }] }));
  const removeHour = (i) => setData((d) => ({ ...d, hours: d.hours.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (saving) return;
    if (!data.name?.trim()) { toast.error("Restaurant name is required"); return; }
    setSaving(true);
    try {
      const { _id, ...payload } = data;
      const { data: saved } = await adminApi.updateRestaurant(payload);
      setData(saved || payload);
      toast.success("Restaurant info saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Save failed");
    } finally { setSaving(false); }
  };

  if (loading || !data) return <div className="text-white/40 text-sm">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-white mb-5">Basic Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Restaurant Name"><Input value={data.name || ""} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Tagline"><Input value={data.tagline || ""} onChange={(e) => set("tagline", e.target.value)} /></Field>
          </div>
          <Field label="Description"><Textarea rows={3} value={data.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone"><Input value={data.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={data.email || ""} onChange={(e) => set("email", e.target.value)} /></Field>
          </div>
          <Field label="Address"><Input value={data.address || ""} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Google Maps Embed URL"><Input value={data.map_embed || ""} onChange={(e) => set("map_embed", e.target.value)} /></Field>
          <ImageUpload label="Logo" value={data.logo || ""} onChange={(v, uploadData) => set("logo", uploadData || v)} />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white">Opening Hours</h2>
          <Btn variant="secondary" onClick={addHour}><Plus size={14} /> Add</Btn>
        </div>
        <div className="space-y-3">
          {(data.hours || []).map((h, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Input value={h.day} onChange={(e) => setHour(i, "day", e.target.value)} placeholder="Monday – Friday" className="flex-1" />
              <Input value={h.time} onChange={(e) => setHour(i, "time", e.target.value)} placeholder="12:00 PM – 10:00 PM" className="flex-1" />
              <button onClick={() => removeHour(i)} className="text-white/30 hover:text-red-400"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-white mb-4">Social Media</h2>
        <div className="space-y-3">
          <Field label="Instagram"><Input value={data.social?.instagram || ""} onChange={(e) => setSocial("instagram", e.target.value)} placeholder="https://instagram.com/..." /></Field>
          <Field label="Facebook"><Input value={data.social?.facebook || ""} onChange={(e) => setSocial("facebook", e.target.value)} placeholder="https://facebook.com/..." /></Field>
          <Field label="WhatsApp"><Input value={data.social?.whatsapp || ""} onChange={(e) => setSocial("whatsapp", e.target.value)} placeholder="https://wa.me/..." /></Field>
        </div>
      </Card>

      <Btn loading={saving} onClick={save} className="w-full justify-center py-3">Save Changes</Btn>
    </div>
  );
}
