import React, { useEffect, useState } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Textarea, Btn, Modal, ConfirmDialog, Toggle, Badge, EmptyState, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const empty = { title: "", description: "", discount: 0, banner: "", valid_from: "", valid_until: "", btn_text: "Reserve Now", btn_link: "", active: true };

export default function OffersPage() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    try {
      const r = await adminApi.getOffers();
      setItems(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load offers");
    }
  };
  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (item) => { setEditing(item.id); setForm({ ...item }); setModal(true); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title?.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateOffer(editing, form);
        toast.success("Offer updated");
      } else {
        await adminApi.createOffer(form);
        toast.success("Offer created");
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    setSaving(true);
    try {
      await adminApi.deleteOffer(deleting);
      toast.success("Offer deleted");
      setDeleting(null);
      load();
    } catch { toast.error("Delete failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Btn onClick={openAdd}><Plus size={14} /> Add Offer</Btn>
      </div>

      {items.length === 0 ? <EmptyState message="No offers yet" /> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="relative">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-white font-medium">{item.title}</div>
                  {item.discount > 0 && <Badge color="red">{item.discount}% OFF</Badge>}
                </div>
                <Badge color={item.active ? "green" : "gray"}>{item.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-white/40 text-xs mt-2 line-clamp-2">{item.description}</p>
              {item.valid_until && <p className="text-white/30 text-xs mt-1">Until {item.valid_until}</p>}
              <div className="flex gap-2 mt-4">
                <Btn variant="secondary" onClick={() => openEdit(item)} className="flex-1 justify-center"><Pencil size={13} /> Edit</Btn>
                <Btn variant="danger" onClick={() => setDeleting(item.id)}><Trash2 size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Offer" : "Add Offer"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title *"><Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="20% OFF Every Friday" /></Field>
            <Field label="Discount %"><Input type="number" min={0} max={100} value={form.discount} onChange={(e) => set("discount", Number(e.target.value))} /></Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Offer details shown on homepage..." /></Field>
          <ImageUpload label="Offer Banner Image" value={form.banner || ""} onChange={(v, uploadData) => set("banner", uploadData || v)} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Valid From"><Input type="date" value={form.valid_from} onChange={(e) => set("valid_from", e.target.value)} /></Field>
            <Field label="Valid Until"><Input type="date" value={form.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Button Text"><Input value={form.btn_text} onChange={(e) => set("btn_text", e.target.value)} placeholder="Reserve Now" /></Field>
            <Field label="Button Link (optional)"><Input value={form.btn_link} onChange={(e) => set("btn_link", e.target.value)} placeholder="Leave blank to scroll to reservation" /></Field>
          </div>
          <Toggle checked={form.active} onChange={(v) => set("active", v)} label="Active (visible on homepage)" />
          <div className="flex gap-3 justify-end">
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn loading={saving} onClick={save}>Save</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} message="This offer will be soft-deleted and can be restored from Trash." />
    </div>
  );
}
