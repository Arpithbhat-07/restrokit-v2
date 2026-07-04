import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Btn, Modal, Field, Input, ConfirmDialog, ImageUpload, EmptyState } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ url: "", caption: "", display_order: 0 });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await adminApi.getGallery();
      setItems(r.data || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to load gallery";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ url: "", caption: "", display_order: items.length });
    setModal(true);
  };

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({ url: item.url || "", caption: item.caption || "", display_order: item.display_order || 0 });
    setModal(true);
  };

  const save = async () => {
    if (saving) return;
    if (!form.url) { toast.error("Image URL is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateGalleryItem(editing, form);
        toast.success("Image updated");
      } else {
        await adminApi.addGalleryItem(form);
        toast.success("Image added");
      }
      setModal(false);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    if (!deleting || saving) return;
    setSaving(true);
    try {
      await adminApi.deleteGalleryItem(deleting);
      toast.success("Image deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Btn onClick={openAdd}><Plus size={14} /> Add Image</Btn>
      </div>

      {loading ? (
        <div className="py-16 text-center text-white/40 text-sm">Loading gallery...</div>
      ) : loadError ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-red-400 text-sm">{loadError}</p>
          <Btn variant="secondary" onClick={load}>Retry</Btn>
        </div>
      ) : items.length === 0 ? (
        <EmptyState message="No gallery images yet. Add your first image." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-white/5 aspect-square bg-[#141414]">
              <img src={item.url} alt={item.caption || "Gallery"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(item)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 text-white"><Pencil size={14} /></button>
                <button onClick={() => setDeleting(item.id)} className="p-2 bg-red-600/20 rounded-lg hover:bg-red-600/40 text-red-400"><Trash2 size={14} /></button>
              </div>
              {item.caption && (
                <div className="absolute bottom-0 inset-x-0 p-2 bg-black/60 text-white text-xs truncate">{item.caption}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Image" : "Add Image"}>
        <div className="space-y-4">
          <ImageUpload label="Image" value={form.url} onChange={(v, uploadData) => setForm((f) => ({ ...f, url: uploadData || v }))} />
          <Field label="Caption">
            <Input value={form.caption} onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))} placeholder="Optional caption" />
          </Field>
          <Field label="Display Order">
            <Input type="number" value={form.display_order} onChange={(e) => setForm((f) => ({ ...f, display_order: Number(e.target.value) }))} />
          </Field>
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn loading={saving} onClick={save}>Save</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        loading={saving}
        message="This image will be soft-deleted and can be restored from Trash."
      />
    </div>
  );
}
