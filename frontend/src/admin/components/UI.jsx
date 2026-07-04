import React, { useState, useRef } from "react";
import { Loader2, X, Upload, AlertTriangle, Trash2 } from "lucide-react";
import { adminApi } from "@/services/api";
import { toast } from "sonner";

// ─── Stat Card ───────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = "red" }) {
  const colors = {
    red: "bg-red-600/10 text-red-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    green: "bg-green-500/10 text-green-400",
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
  };
  return (
    <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 flex items-center gap-4">
      <div className={`h-12 w-12 rounded-xl grid place-items-center ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value ?? "—"}</div>
        <div className="text-xs text-white/40 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
export function Card({ children, className = "" }) {
  return (
    <div className={`bg-[#141414] border border-white/5 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
export function Field({ label, error, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wide">{label}</label>}
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

export function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 transition-colors ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 transition-colors resize-none ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? "bg-red-600" : "bg-white/10"}`}
      >
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      {label && <span className="text-sm text-white/70">{label}</span>}
    </label>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Btn({ children, loading, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-red-600 hover:bg-red-700 text-white",
    secondary: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    danger: "bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/30",
    ghost: "hover:bg-white/5 text-white/60 hover:text-white",
  };
  return (
    <button
      disabled={loading || props.disabled}
      aria-busy={loading ? "true" : "false"}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className={`bg-[#141414] border border-white/10 rounded-2xl w-full ${wide ? "max-w-2xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <h3 className="font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title = "Are you sure?", message, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle size={20} className="text-red-400" />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-white/50 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" loading={loading} onClick={onConfirm}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, color = "gray" }) {
  const colors = {
    gray: "bg-white/5 text-white/50",
    green: "bg-green-500/10 text-green-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    red: "bg-red-500/10 text-red-400",
    blue: "bg-blue-500/10 text-blue-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    pending: { color: "yellow", label: "Pending" },
    confirmed: { color: "green", label: "Confirmed" },
    completed: { color: "blue", label: "Completed" },
    cancelled: { color: "red", label: "Cancelled" },
  };
  const { color, label } = map[status] || { color: "gray", label: status };
  return <Badge color={color}>{label}</Badge>;
}

// ─── Search Input ─────────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-red-500/50 w-64"
    />
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ message = "No data found" }) {
  return (
    <div className="py-16 text-center text-white/30 text-sm">{message}</div>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
export function Skeleton({ className = "" }) {
  return <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />;
}

// ─── Image Upload (Cloudinary) ────────────────────────────────────────────────
export function ImageUpload({ value, onChange, label = "Image", folder = "restrokit" }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const displayUrl = value && typeof value === "object" ? (value.imageUrl || value.url || "") : (value || "");

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be 10MB or less");
      return;
    }
    setUploading(true);
    try {
      const res = await adminApi.uploadMedia(file, folder);
      const data = res.data || {};
      const nextValue = data.imageUrl || data.url || "";
      onChange(nextValue, data);
      toast.success("Image uploaded to Cloudinary");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeImage = () => {
    onChange("");
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <label className="text-xs font-medium text-white/60 uppercase tracking-wide">{label}</label>}
      {displayUrl && (
        <div className="relative">
          <img src={displayUrl} alt="preview" className="h-32 w-full object-cover rounded-xl border border-white/10" />
          <button type="button" onClick={removeImage} className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white/70 hover:text-white">
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <label className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-white/10 border-dashed rounded-xl cursor-pointer hover:border-red-500/50 transition-colors text-sm text-white/40">
        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
        {uploading ? "Uploading..." : "Upload / Replace Image"}
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={upload} disabled={uploading} />
      </label>
      <Input value={displayUrl} onChange={(e) => onChange(e.target.value)} placeholder="Or paste image URL" />
    </div>
  );
}
