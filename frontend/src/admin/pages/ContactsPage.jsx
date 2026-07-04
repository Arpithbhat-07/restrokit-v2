import React, { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/services/api";
import { Card, Btn, Badge, SearchInput, ConfirmDialog, EmptyState } from "@/admin/components/UI";
import { toast } from "sonner";
import { Trash2, MailOpen } from "lucide-react";

export default function ContactsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRead, setFilterRead] = useState("All");
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getContacts();
      setItems(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.message.toLowerCase().includes(q);
    const matchRead = filterRead === "All" || (filterRead === "Unread" ? !c.read : c.read);
    return matchSearch && matchRead;
  }), [items, search, filterRead]);

  const markRead = async (id) => {
    try { await adminApi.markContactRead(id); load(); }
    catch { toast.error("Failed"); }
  };

  const del = async () => {
    setSaving(true);
    try { await adminApi.deleteContact(deleting); toast.success("Deleted"); setDeleting(null); load(); }
    catch { toast.error("Delete failed"); }
    finally { setSaving(false); }
  };

  const unreadCount = items.filter((c) => !c.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search messages..." />
          <select value={filterRead} onChange={(e) => setFilterRead(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="All">All</option>
            <option value="Unread">Unread</option>
            <option value="Read">Read</option>
          </select>
        </div>
        {unreadCount > 0 && <Badge color="red">{unreadCount} unread</Badge>}
      </div>

      {loading ? <div className="text-white/40 text-sm">Loading...</div> :
       filtered.length === 0 ? <EmptyState message="No messages found" /> : (
        <div className="space-y-3">
          {filtered.map((c) => (
            <Card key={c.id} className={`transition-all ${!c.read ? "border-red-500/20" : ""}`}>
              <div className="flex items-start gap-4">
                <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${c.read ? "bg-white/20" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-white font-medium text-sm">{c.name}</span>
                    <span className="text-white/40 text-xs">{c.email}</span>
                    <span className="text-white/20 text-xs">{new Date(c.created_at).toLocaleDateString()}</span>
                    {!c.read && <Badge color="red">New</Badge>}
                  </div>
                  <p className="text-white/60 text-sm mt-1">{c.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!c.read && (
                    <button onClick={() => markRead(c.id)} className="p-1.5 text-white/30 hover:text-green-400 rounded-lg hover:bg-green-500/5" title="Mark as read">
                      <MailOpen size={14} />
                    </button>
                  )}
                  <button onClick={() => setDeleting(c.id)} className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} message="This message will be permanently deleted." />
    </div>
  );
}
