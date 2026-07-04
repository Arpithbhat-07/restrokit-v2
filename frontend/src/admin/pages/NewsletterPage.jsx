import React, { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/services/api";
import { Card, ConfirmDialog, SearchInput, EmptyState } from "@/admin/components/UI";
import { toast } from "sonner";
import { Trash2, Download } from "lucide-react";

export default function NewsletterPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getNewsletter();
      setItems(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load subscribers");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  ), [items, search]);

  const del = async () => {
    setSaving(true);
    try { await adminApi.deleteSubscriber(deleting); toast.success("Removed"); setDeleting(null); load(); }
    catch { toast.error("Delete failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search subscribers..." />
          <span className="text-white/40 text-sm">{items.length} total</span>
        </div>
        <a href={adminApi.exportNewsletter()} download
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <Download size={14} /> Export CSV
        </a>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 text-white/40 text-sm">Loading...</div> :
         filtered.length === 0 ? <EmptyState message="No subscribers found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Email</th>
                  <th className="text-left px-4 py-3">Subscribed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-5 py-3 text-white">{s.email}</td>
                    <td className="px-4 py-3 text-white/40">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setDeleting(s.id)} className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/5">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} message="This subscriber will be removed." />
    </div>
  );
}
