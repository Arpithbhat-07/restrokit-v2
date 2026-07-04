import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, Modal, ConfirmDialog, Toggle, Badge, EmptyState, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star } from "lucide-react";

const empty = { name: "", rating: 5, review: "", img: "", date: "", featured: false };

export default function ReviewsPage() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const r = await adminApi.getReviews();
      setItems(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load reviews");
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (item) => { setEditing(item.id); setForm({ ...item }); setModal(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name || !form.review) { toast.error("Name and review required"); return; }
    setSaving(true);
    try {
      if (editing) { await adminApi.updateReview(editing, form); toast.success("Review updated"); }
      else { await adminApi.createReview(form); toast.success("Review added"); }
      setModal(false); load();
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const del = async () => {
    setSaving(true);
    try { await adminApi.deleteReview(deleting); toast.success("Deleted"); setDeleting(null); load(); }
    catch { toast.error("Delete failed"); }
    finally { setSaving(false); }
  };

  const toggleFeatured = async (item) => {
    try { await adminApi.updateReview(item.id, { featured: !item.featured }); load(); }
    catch { toast.error("Update failed"); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Btn onClick={openAdd}><Plus size={14} /> Add Review</Btn>
      </div>
      {items.length === 0 ? <EmptyState message="No reviews yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start gap-3 mb-3">
                {item.img && <img src={item.img} alt={item.name} className="h-10 w-10 rounded-full object-cover" />}
                <div className="flex-1">
                  <div className="text-white font-medium text-sm">{item.name}</div>
                  <div className="flex gap-0.5 mt-0.5">
                    {Array(item.rating).fill(0).map((_, i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}
                  </div>
                </div>
                <Badge color={item.featured ? "yellow" : "gray"}>{item.featured ? "Featured" : "Hidden"}</Badge>
              </div>
              <p className="text-white/50 text-xs line-clamp-3">"{item.review}"</p>
              <div className="flex gap-2 mt-4 items-center">
                <button onClick={() => toggleFeatured(item)} className="text-xs text-white/40 hover:text-yellow-400 transition-colors">
                  {item.featured ? "Unfeature" : "Feature"}
                </button>
                <div className="flex-1" />
                <Btn variant="secondary" onClick={() => openEdit(item)} className="py-1 px-2 text-xs"><Pencil size={12} /></Btn>
                <Btn variant="danger" onClick={() => setDeleting(item.id)} className="py-1 px-2 text-xs"><Trash2 size={12} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Review" : "Add Review"}>
        <div className="space-y-4">
          <Field label="Customer Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Rating (1-5)"><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => set("rating", Number(e.target.value))} /></Field>
          <Field label="Review"><Textarea rows={3} value={form.review} onChange={(e) => set("review", e.target.value)} /></Field>
          <Field label="Date"><Input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <ImageUpload label="Customer Photo" value={form.img} onChange={(v, uploadData) => set("img", uploadData || v)} />
          <Toggle checked={form.featured} onChange={(v) => set("featured", v)} label="Feature on website" />
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn loading={saving} onClick={save}>Save</Btn>
          </div>
        </div>
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} message="This review will be permanently deleted." />
    </div>
  );
}
