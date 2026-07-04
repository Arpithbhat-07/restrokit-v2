import React, { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/services/api";
import { Card, Btn, StatusBadge, SearchInput, ConfirmDialog, EmptyState, Badge } from "@/admin/components/UI";
import { toast } from "sonner";
import { Trash2, Download, Check, X, Mail, MessageSquare, Phone, Loader2 } from "lucide-react";
import { generatePendingWhatsApp, generateConfirmedWhatsApp, generateCancelledWhatsApp } from "@/services/communicationService";

const STATUSES = ["pending", "confirmed", "cancelled"];

export default function ReservationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [restaurant, setRestaurant] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await adminApi.getReservations();
      setItems(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const loadRestaurant = async () => {
    try {
      const res = await adminApi.getRestaurant();
      setRestaurant(res.data || null);
    } catch (err) {
      console.error("Failed to load restaurant settings:", err);
    }
  };

  useEffect(() => {
    load();
    loadRestaurant();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    setActionLoading(prev => ({ ...prev, [id]: status }));
    try {
      await adminApi.updateReservationStatus(id, status);
      toast.success(`Reservation ${status.charAt(0).toUpperCase() + status.slice(1)}`);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Action failed");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleResendEmail = async (id, status) => {
    if (status === "pending") {
      toast.error("Reservation must be Confirmed or Cancelled before sending an email.");
      return;
    }
    setActionLoading(prev => ({ ...prev, [id]: "resend" }));
    try {
      await adminApi.resendReservationEmail(id);
      toast.success("Confirmation email resent successfully");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Resend failed");
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleWhatsAppClick = (r) => {
    const customerPhone = r.phone.replace(/[^0-9+]/g, "");
    let text = "";
    if (r.status === "confirmed") {
      text = generateConfirmedWhatsApp(r, restaurant);
    } else if (r.status === "cancelled") {
      text = generateCancelledWhatsApp(r, restaurant);
    } else {
      text = generatePendingWhatsApp(r, restaurant);
    }
    const url = `https://wa.me/${customerPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const filtered = useMemo(() => items.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch = r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.phone.includes(q);
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  }), [items, search, filterStatus]);

  const del = async () => {
    setSaving(true);
    try { await adminApi.deleteReservation(deleting); toast.success("Deleted"); setDeleting(null); load(); }
    catch { toast.error("Delete failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search reservations..." />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="All">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <a href={adminApi.exportReservations()} download className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">
          <Download size={14} /> Export CSV
        </a>
      </div>

      <Card className="p-0 overflow-hidden">
        {loading ? <div className="p-6 text-white/40 text-sm">Loading...</div> :
         filtered.length === 0 ? <EmptyState message="No reservations found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Customer</th>
                  <th className="text-left px-4 py-3">Date & Time</th>
                  <th className="text-left px-4 py-3">Guests</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-5 py-3">
                      <div className="text-white font-medium">{r.name}</div>
                      <div className="text-white/40 text-xs flex flex-wrap items-center gap-2 mt-0.5">
                        <span>{r.email} · {r.phone}</span>
                        {r.email_status && (
                          <Badge color={r.email_status === "sent" ? "green" : r.email_status === "failed" ? "red" : "yellow"}>
                            Email: {r.email_status === "sent" ? "Sent" : r.email_status === "failed" ? "Failed" : "Pending"}
                          </Badge>
                        )}
                      </div>
                      {r.message && <div className="text-white/30 text-xs mt-1 italic">"{r.message}"</div>}
                    </td>
                    <td className="px-4 py-3 text-white/70">{r.date}<br /><span className="text-white/40">{r.time}</span></td>
                    <td className="px-4 py-3 text-white/70">{r.guests}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Confirm Button */}
                        <button
                          disabled={!!actionLoading[r.id] || r.status === "confirmed"}
                          onClick={() => handleUpdateStatus(r.id, "confirmed")}
                          className={`px-2 py-1 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1 ${
                            r.status === "confirmed"
                              ? "bg-green-500/20 text-green-400 cursor-not-allowed opacity-50"
                              : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          }`}
                        >
                          {actionLoading[r.id] === "confirmed" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Confirm
                        </button>

                        {/* Cancel Button */}
                        <button
                          disabled={!!actionLoading[r.id] || r.status === "cancelled"}
                          onClick={() => handleUpdateStatus(r.id, "cancelled")}
                          className={`px-2 py-1 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1 ${
                            r.status === "cancelled"
                              ? "bg-red-500/20 text-red-400 cursor-not-allowed opacity-50"
                              : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          }`}
                        >
                          {actionLoading[r.id] === "cancelled" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <X size={12} />
                          )}
                          Cancel
                        </button>

                        {/* Resend Email Button */}
                        <button
                          disabled={!!actionLoading[r.id] || r.status === "pending"}
                          onClick={() => handleResendEmail(r.id, r.status)}
                          className={`px-2 py-1 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1 ${
                            r.status === "pending"
                              ? "bg-white/5 text-white/20 cursor-not-allowed"
                              : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                          }`}
                          title={r.status === "pending" ? "Reservation must be Confirmed or Cancelled before sending an email." : "Resend confirmation/cancellation email"}
                        >
                          {actionLoading[r.id] === "resend" ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Mail size={12} />
                          )}
                          Resend
                        </button>

                        {/* WhatsApp Button */}
                        <button
                          onClick={() => handleWhatsAppClick(r)}
                          className="px-2 py-1 text-xs rounded-lg font-medium transition-all inline-flex items-center gap-1 bg-green-600/10 text-green-500 hover:bg-green-600/20"
                          title="Open WhatsApp chat"
                        >
                          <MessageSquare size={12} />
                          WhatsApp
                        </button>

                        {/* Call Button */}
                        <a
                          href={`tel:${r.phone}`}
                          className="px-2 py-1 text-xs bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-all inline-flex items-center gap-1"
                          title="Call guest"
                        >
                          <Phone size={12} />
                          Call
                        </a>

                        {/* Delete Button */}
                        <button
                          disabled={!!actionLoading[r.id]}
                          onClick={() => setDeleting(r.id)}
                          className="p-1 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/5 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={del} loading={saving} message="This reservation will be permanently deleted." />
    </div>
  );
}
