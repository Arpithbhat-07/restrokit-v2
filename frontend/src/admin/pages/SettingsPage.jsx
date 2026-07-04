import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi.getSettings().then((r) => setData(r.data || {})).catch(() => setData({})).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const { data: saved } = await adminApi.updateSettings(data);
      setData(saved || data);
      toast.success("Settings saved");
    }
    catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  if (loading || !data) return <div className="text-white/40 text-sm">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="font-semibold text-white mb-5">Brand Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Primary Color">
            <div className="flex gap-2 items-center">
              <input type="color" value={data.primary_color || "#C62828"} onChange={(e) => set("primary_color", e.target.value)}
                className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <Input value={data.primary_color || ""} onChange={(e) => set("primary_color", e.target.value)} className="flex-1" />
            </div>
          </Field>
          <Field label="Secondary Color">
            <div className="flex gap-2 items-center">
              <input type="color" value={data.secondary_color || "#FFB703"} onChange={(e) => set("secondary_color", e.target.value)}
                className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <Input value={data.secondary_color || ""} onChange={(e) => set("secondary_color", e.target.value)} className="flex-1" />
            </div>
          </Field>
          <Field label="Accent Color">
            <div className="flex gap-2 items-center">
              <input type="color" value={data.accent_color || "#8B4513"} onChange={(e) => set("accent_color", e.target.value)}
                className="h-10 w-10 rounded-lg border border-white/10 bg-transparent cursor-pointer" />
              <Input value={data.accent_color || ""} onChange={(e) => set("accent_color", e.target.value)} className="flex-1" />
            </div>
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-white mb-5">SEO & Meta</h2>
        <div className="space-y-4">
          <Field label="Website Title"><Input value={data.website_title || ""} onChange={(e) => set("website_title", e.target.value)} /></Field>
          <Field label="SEO Description"><Textarea rows={2} value={data.seo_description || ""} onChange={(e) => set("seo_description", e.target.value)} /></Field>
          <Field label="SEO Keywords"><Input value={data.seo_keywords || ""} onChange={(e) => set("seo_keywords", e.target.value)} placeholder="restaurant, food, coastal" /></Field>
          <ImageUpload label="Favicon" value={data.favicon || ""} onChange={(v, uploadData) => set("favicon", uploadData || v)} />
        </div>
      </Card>

      <Card>
        <h2 className="font-semibold text-white mb-5">Footer</h2>
        <div className="space-y-4">
          <Field label="Footer Description"><Textarea rows={2} value={data.footer_text || ""} onChange={(e) => set("footer_text", e.target.value)} /></Field>
          <Field label="Copyright Name"><Input value={data.copyright || ""} onChange={(e) => set("copyright", e.target.value)} /></Field>
        </div>
      </Card>

      <Btn loading={saving} onClick={save} className="w-full justify-center py-3">Save Settings</Btn>
    </div>
  );
}
