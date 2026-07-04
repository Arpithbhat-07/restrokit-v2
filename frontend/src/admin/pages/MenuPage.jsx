import React, { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/services/api";
import { Card, Field, Input, Select, Btn, Modal, ConfirmDialog, Toggle, Badge, SearchInput, EmptyState, ImageUpload } from "@/admin/components/UI";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy } from "lucide-react";

const CATS = ["Starters", "Seafood", "Thali", "Biryani", "Currys", "Rice & Noodles", "Desserts", "Drinks", "Specials"];
const empty = { name: "", description: "", price: 0, category: "Starters", diet: "veg", core: "", img: "", imageUrl: "", publicId: "", popular: false, chef_special: false, available: true, spice_level: 0, display_order: 0 };

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterDiet, setFilterDiet] = useState("All");

  const [subTab, setSubTab] = useState("items");
  const [categoryImages, setCategoryImages] = useState([]);
  const [selectedCat, setSelectedCat] = useState("Starters");
  const [savingCat, setSavingCat] = useState(false);
  const [vegImages, setVegImages] = useState([]);
  const [nonvegImages, setNonvegImages] = useState([]);

  const loadCategoryImages = async () => {
    try {
      const r = await adminApi.getCategoryImages();
      setCategoryImages(r.data || []);
    } catch (err) {
      toast.error("Failed to load category images");
    }
  };

  useEffect(() => {
    if (subTab === "categories") {
      loadCategoryImages();
    }
  }, [subTab]);

  useEffect(() => {
    const found = categoryImages.find(c => c.category.toLowerCase() === selectedCat.toLowerCase());
    setVegImages(found?.veg_images || []);
    setNonvegImages(found?.nonveg_images || []);
  }, [selectedCat, categoryImages]);

  const handleVegImageChange = (index, val, uploadData) => {
    setVegImages(prev => {
      const list = [...prev];
      if (!val) {
        list.splice(index, 1);
      } else {
        list[index] = {
          imageUrl: val,
          publicId: uploadData?.publicId || list[index]?.publicId || "",
          uploadedAt: uploadData?.uploadedAt || list[index]?.uploadedAt || new Date().toISOString()
        };
      }
      return list;
    });
  };

  const handleVegImageAdd = (val, uploadData) => {
    if (!val) return;
    setVegImages(prev => {
      if (prev.length >= 4) return prev;
      return [
        ...prev,
        {
          imageUrl: val,
          publicId: uploadData?.publicId || "",
          uploadedAt: uploadData?.uploadedAt || new Date().toISOString()
        }
      ];
    });
  };

  const handleNonVegImageChange = (index, val, uploadData) => {
    setNonvegImages(prev => {
      const list = [...prev];
      if (!val) {
        list.splice(index, 1);
      } else {
        list[index] = {
          imageUrl: val,
          publicId: uploadData?.publicId || list[index]?.publicId || "",
          uploadedAt: uploadData?.uploadedAt || list[index]?.uploadedAt || new Date().toISOString()
        };
      }
      return list;
    });
  };

  const handleNonVegImageAdd = (val, uploadData) => {
    if (!val) return;
    setNonvegImages(prev => {
      if (prev.length >= 4) return prev;
      return [
        ...prev,
        {
          imageUrl: val,
          publicId: uploadData?.publicId || "",
          uploadedAt: uploadData?.uploadedAt || new Date().toISOString()
        }
      ];
    });
  };

  const saveCategoryImages = async () => {
    setSavingCat(true);
    try {
      const payload = {
        veg_images: vegImages,
        nonveg_images: nonvegImages
      };
      await adminApi.updateCategoryImages(selectedCat, payload);
      toast.success("Category images updated successfully");
      await loadCategoryImages();
    } catch (err) {
      toast.error(err?.response?.data?.detail || err?.message || "Failed to save category images");
    } finally {
      setSavingCat(false);
    }
  };

  const renderCategoryImagesTab = () => {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 bg-[#1a1a1a] p-4 rounded-2xl border border-white/5">
          <label className="text-sm font-medium text-white/70">Select Category to Manage:</label>
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="bg-[#121212] border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-red-500 min-w-[200px]"
          >
            {CATS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Vegetarian Images Section */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-semibold text-white">Vegetarian Images</h3>
              <Badge color="green">{vegImages.length} / 4</Badge>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {vegImages.map((img, idx) => (
                <ImageUpload
                  key={idx}
                  label={`Veg Image ${idx + 1}`}
                  value={img}
                  onChange={(val, uploadData) => handleVegImageChange(idx, val, uploadData)}
                />
              ))}
              {vegImages.length < 4 && (
                <ImageUpload
                  label="Add Veg Image"
                  value=""
                  onChange={(val, uploadData) => handleVegImageAdd(val, uploadData)}
                />
              )}
            </div>
          </Card>

          {/* Non-Vegetarian Images Section */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-semibold text-white">Non-Vegetarian Images</h3>
              <Badge color="red">{nonvegImages.length} / 4</Badge>
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              {nonvegImages.map((img, idx) => (
                <ImageUpload
                  key={idx}
                  label={`Non-Veg Image ${idx + 1}`}
                  value={img}
                  onChange={(val, uploadData) => handleNonVegImageChange(idx, val, uploadData)}
                />
              ))}
              {nonvegImages.length < 4 && (
                <ImageUpload
                  label="Add Non-Veg Image"
                  value=""
                  onChange={(val, uploadData) => handleNonVegImageAdd(val, uploadData)}
                />
              )}
            </div>
          </Card>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Btn loading={savingCat} onClick={saveCategoryImages}>
            Save Category Images
          </Btn>
        </div>
      </div>
    );
  };

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await adminApi.getMenu();
      setItems(r.data || []);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to load menu items";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => items.filter((item) => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "All" || item.category === filterCat;
    const matchDiet = filterDiet === "All" || item.diet === filterDiet;
    return matchSearch && matchCat && matchDiet;
  }), [items, search, filterCat, filterDiet]);

  const openAdd = () => { setEditing(null); setForm(empty); setModal(true); };
  const openEdit = (item) => { setEditing(item.id); setForm({ ...item }); setModal(true); };

  const save = async () => {
    if (saving) return;
    if (!form.name?.trim()) { toast.error("Name is required"); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error("Price must be greater than 0"); return; }
    if (!form.category) { toast.error("Category is required"); return; }
    setSaving(true);
    try {
      const payload = { ...empty, ...form };
      if (editing) {
        await adminApi.updateMenuItem(editing, payload);
        toast.success("Item updated");
      } else {
        await adminApi.createMenuItem(payload);
        toast.success("Item added");
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
      await adminApi.deleteMenuItem(deleting);
      toast.success("Item deleted");
      setDeleting(null);
      await load();
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Delete failed"); }
    finally { setSaving(false); }
  };

  const duplicate = async (id) => {
    if (saving) return;
    try {
      await adminApi.duplicateMenuItem(id);
      toast.success("Item duplicated");
      await load();
    } catch (err) { toast.error(err?.response?.data?.detail || err?.message || "Duplicate failed"); }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5">
      <div className="flex border-b border-white/5 mb-6">
        <button
          onClick={() => setSubTab("items")}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            subTab === "items"
              ? "border-red-500 text-red-400"
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Menu Items
        </button>
        <button
          onClick={() => setSubTab("categories")}
          className={`px-4 py-2.5 font-medium text-sm border-b-2 transition-colors ${
            subTab === "categories"
              ? "border-red-500 text-red-400"
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          Category Images
        </button>
      </div>

      {subTab === "categories" ? renderCategoryImagesTab() : (
        <>
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <SearchInput value={search} onChange={setSearch} placeholder="Search menu..." />
              <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="All">All Categories</option>
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </select>
              <select value={filterDiet} onChange={(e) => setFilterDiet(e.target.value)}
                className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
                <option value="All">All</option>
                <option value="veg">Veg</option>
                <option value="nonveg">Non-Veg</option>
              </select>
            </div>
            <Btn onClick={openAdd}><Plus size={14} /> Add Item</Btn>
          </div>

          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="p-6 text-white/40 text-sm">Loading...</div>
            ) : loadError ? (
              <div className="p-6 space-y-3 text-center">
                <div className="text-red-400 text-sm">{loadError}</div>
                <Btn variant="secondary" onClick={load}>Retry</Btn>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState message="No menu items found" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-white/40 text-xs uppercase tracking-wide">
                      <th className="text-left px-5 py-3">Item</th>
                      <th className="text-left px-4 py-3">Category</th>
                      <th className="text-left px-4 py-3">Diet</th>
                      <th className="text-left px-4 py-3">Price</th>
                      <th className="text-left px-4 py-3">Status</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                        <td className="px-5 py-3">
                          <div>
                            <div className="text-white font-medium">{item.name}</div>
                            {item.core && <div className="text-white/40 text-xs">{item.core}</div>}
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {item.popular && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/15 text-yellow-500">Popular</span>}
                              {item.chef_special && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">Chef's Special</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/60">{item.category}</td>
                        <td className="px-4 py-3">
                          <Badge color={item.diet === "veg" ? "green" : "red"}>{item.diet === "veg" ? "Veg" : "Non-Veg"}</Badge>
                        </td>
                        <td className="px-4 py-3 text-white">₹{item.price}</td>
                        <td className="px-4 py-3">
                          <Badge color={item.available ? "green" : "gray"}>{item.available ? "Available" : "Hidden"}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => duplicate(item.id)} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg hover:bg-white/5"><Copy size={14} /></button>
                            <button onClick={() => openEdit(item)} className="p-1.5 text-white/30 hover:text-white/70 rounded-lg hover:bg-white/5"><Pencil size={14} /></button>
                            <button onClick={() => setDeleting(item.id)} className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-red-500/5"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "Edit Menu Item" : "Add Menu Item"} wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Dish name" /></Field>
            <Field label="Price (₹) *"><Input type="number" min={1} value={form.price} onChange={(e) => set("price", Number(e.target.value))} /></Field>
          </div>
          <Field label="Core Ingredients"><Input value={form.core || ""} onChange={(e) => set("core", e.target.value)} placeholder="Chicken/Mutton" /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category *">
              <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATS.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </Field>
            <Field label="Diet">
              <Select value={form.diet} onChange={(e) => set("diet", e.target.value)}>
                <option value="veg">Veg</option>
                <option value="nonveg">Non-Veg</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Spice Level (0–5)"><Input type="number" min={0} max={5} value={form.spice_level || 0} onChange={(e) => set("spice_level", Number(e.target.value))} /></Field>
            <Field label="Display Order"><Input type="number" value={form.display_order || 0} onChange={(e) => set("display_order", Number(e.target.value))} /></Field>
          </div>
          <div className="flex flex-wrap gap-6 pt-2">
            <Toggle checked={!!form.available} onChange={(v) => set("available", v)} label="Available" />
            <Toggle checked={!!form.popular} onChange={(v) => set("popular", v)} label="Popular Badge" />
            <Toggle checked={!!form.chef_special} onChange={(v) => set("chef_special", v)} label="Chef's Special" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn loading={saving} onClick={save}>Save Item</Btn>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={del}
        loading={saving}
        message="This menu item will be soft-deleted and can be restored from Trash."
      />
    </div>
  );
}
