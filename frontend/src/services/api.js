import axios from "axios";

const BASE = process.env.REACT_APP_BACKEND_URL + "/api";

const api = axios.create({ baseURL: BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("rk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("rk_token");
      if (window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/login")) {
        window.location.href = "/admin/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Public endpoints (no auth)
export const publicApi = {
  getRestaurant: () => api.get("/restaurant"),
  getHero: () => api.get("/hero"),
  getAbout: () => api.get("/about"),
  getMenu: () => api.get("/menu"),
  getGallery: () => api.get("/gallery"),
  getChef: () => api.get("/chef"),
  getOffers: () => api.get("/offers"),
  getReviews: () => api.get("/reviews"),
  getSettings: () => api.get("/settings"),
  getCategoryImages: () => api.get("/menu/categories/images"),
  postReservation: (data) => api.post("/reservations", data),
  postContact: (data) => api.post("/contact", data),
  postNewsletter: (data) => api.post("/newsletter", data),
};

// Admin endpoints (require auth)
export const adminApi = {
  login: (data) => api.post("/auth/login", data),
  me: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  getUsers: () => api.get("/users"),
  createUser: (data) => api.post("/users", data),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deleteUser: (id) => api.delete(`/users/${id}`),

  getStats: () => api.get("/dashboard/stats"),
  getRecent: () => api.get("/dashboard/recent"),

  getRestaurant: () => api.get("/restaurant"),
  updateRestaurant: (data) => api.put("/restaurant", data),

  getHero: () => api.get("/hero"),
  updateHero: (data) => api.put("/hero", data),

  getAbout: () => api.get("/about"),
  updateAbout: (data) => api.put("/about", data),

  getSettings: () => api.get("/settings"),
  updateSettings: (data) => api.put("/settings", data),

  uploadMedia: (file, folder = "restrokit") => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    return api.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  deleteMedia: (publicId) => api.delete(`/media/${encodeURIComponent(publicId)}`),

  getMenu: (params) => api.get("/menu", { params }),
  createMenuItem: (data) => api.post("/menu", data),
  updateMenuItem: (id, data) => api.put(`/menu/${id}`, data),
  deleteMenuItem: (id) => api.delete(`/menu/${id}`),
  restoreMenuItem: (id) => api.post(`/menu/${id}/restore`),
  permanentDeleteMenuItem: (id) => api.delete(`/menu/${id}/permanent`),
  getMenuTrash: () => api.get("/menu/trash"),
  duplicateMenuItem: (id) => api.post(`/menu/${id}/duplicate`),
  getCategoryImages: () => api.get("/menu/categories/images"),
  updateCategoryImages: (category, data) => api.put(`/menu/categories/images/${encodeURIComponent(category)}`, data),

  getGallery: (params) => api.get("/gallery", { params }),
  addGalleryItem: (data) => api.post("/gallery", data),
  updateGalleryItem: (id, data) => api.put(`/gallery/${id}`, data),
  deleteGalleryItem: (id) => api.delete(`/gallery/${id}`),
  restoreGalleryItem: (id) => api.post(`/gallery/${id}/restore`),
  permanentDeleteGalleryItem: (id) => api.delete(`/gallery/${id}/permanent`),
  getGalleryTrash: () => api.get("/gallery/trash"),

  getChef: () => api.get("/chef"),
  updateChef: (data) => api.put("/chef", data),

  getOffers: (params) => api.get("/offers", { params }),
  createOffer: (data) => api.post("/offers", data),
  updateOffer: (id, data) => api.put(`/offers/${id}`, data),
  deleteOffer: (id) => api.delete(`/offers/${id}`),
  restoreOffer: (id) => api.post(`/offers/${id}/restore`),
  permanentDeleteOffer: (id) => api.delete(`/offers/${id}/permanent`),
  getOffersTrash: () => api.get("/offers/trash"),

  getReviews: (params) => api.get("/reviews", { params }),
  createReview: (data) => api.post("/reviews", data),
  updateReview: (id, data) => api.put(`/reviews/${id}`, data),
  deleteReview: (id) => api.delete(`/reviews/${id}`),
  restoreReview: (id) => api.post(`/reviews/${id}/restore`),
  permanentDeleteReview: (id) => api.delete(`/reviews/${id}/permanent`),
  getReviewsTrash: () => api.get("/reviews/trash"),

  getReservations: (params) => api.get("/reservations", { params }),
  updateReservationStatus: (id, status) => api.put(`/reservations/${id}/status`, { status }),
  resendReservationEmail: (id) => api.post(`/reservations/${id}/resend`),
  deleteReservation: (id) => api.delete(`/reservations/${id}`),
  restoreReservation: (id) => api.post(`/reservations/${id}/restore`),
  permanentDeleteReservation: (id) => api.delete(`/reservations/${id}/permanent`),
  getReservationsTrash: () => api.get("/reservations/trash"),
  exportReservations: () => `${BASE}/reservations/export?token=${localStorage.getItem("rk_token")}`,

  getContacts: (params) => api.get("/contacts", { params }),
  markContactRead: (id) => api.put(`/contacts/${id}/read`),
  deleteContact: (id) => api.delete(`/contacts/${id}`),
  restoreContact: (id) => api.post(`/contacts/${id}/restore`),
  permanentDeleteContact: (id) => api.delete(`/contacts/${id}/permanent`),
  getContactsTrash: () => api.get("/contacts/trash"),

  getNewsletter: (params) => api.get("/newsletter", { params }),
  deleteSubscriber: (id) => api.delete(`/newsletter/${id}`),
  restoreSubscriber: (id) => api.post(`/newsletter/${id}/restore`),
  permanentDeleteSubscriber: (id) => api.delete(`/newsletter/${id}/permanent`),
  getNewsletterTrash: () => api.get("/newsletter/trash"),
  exportNewsletter: () => `${BASE}/newsletter/export?token=${localStorage.getItem("rk_token")}`,

  seed: () => api.post("/seed"),
};
