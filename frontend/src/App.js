import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";

// Public site
import Navbar from "@/components/site/Navbar";
import Hero from "@/components/site/Hero";
import About from "@/components/site/About";
import MenuSection from "@/components/site/Menu";
import Chef from "@/components/site/Chef";
import Offer from "@/components/site/Offer";
import Gallery from "@/components/site/Gallery";
import Reviews from "@/components/site/Reviews";
import WhyChoose from "@/components/site/WhyChoose";
import Reservation from "@/components/site/Reservation";
import Contact from "@/components/site/Contact";
import Footer from "@/components/site/Footer";
import FloatingActions from "@/components/site/FloatingActions";
import Loader from "@/components/site/Loader";

// Admin
import { AdminAuthProvider, useAuth } from "@/admin/context/AuthContext";
import AdminLayout from "@/admin/components/AdminLayout";
import LoginPage from "@/admin/pages/LoginPage";
import DashboardPage from "@/admin/pages/DashboardPage";
import RestaurantPage from "@/admin/pages/RestaurantPage";
import HeroPage from "@/admin/pages/HeroPage";
import AboutPage from "@/admin/pages/AboutPage";
import MenuPage from "@/admin/pages/MenuPage";
import GalleryPage from "@/admin/pages/GalleryPage";
import ChefPage from "@/admin/pages/ChefPage";
import OffersPage from "@/admin/pages/OffersPage";
import ReviewsPage from "@/admin/pages/ReviewsPage";
import ReservationsPage from "@/admin/pages/ReservationsPage";
import ContactsPage from "@/admin/pages/ContactsPage";
import NewsletterPage from "@/admin/pages/NewsletterPage";
import SettingsPage from "@/admin/pages/SettingsPage";
import ProfilePage from "@/admin/pages/ProfilePage";
import UsersPage from "@/admin/pages/UsersPage";
import TrashPage from "@/admin/pages/TrashPage";
import { hasAnyRole } from "@/admin/utils/roleUtils";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/admin/login" replace />;
}

function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/admin/login" replace />;
  if (allowedRoles.length && !hasAnyRole(user, allowedRoles)) return <Navigate to="/admin" replace />;
  return children;
}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-brand-primary selection:text-white">
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <About />
        <MenuSection />
        <Chef />
        <Offer /> 
        <Gallery />
        <Reviews />
        <WhyChoose />
        <Reservation />
        <Contact />
      </main>
      <Footer />
      <FloatingActions />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AdminAuthProvider>
        <div className="App">
          <BrowserRouter>
            <Routes>
              {/* Public site */}
              <Route path="/" element={<HomePage />} />

              {/* Admin auth */}
              <Route path="/admin/login" element={<LoginPage />} />

              {/* Admin protected */}
              <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                <Route index element={<DashboardPage />} />
                <Route path="restaurant" element={<RoleProtectedRoute allowedRoles={["super_admin", "admin"]}><RestaurantPage /></RoleProtectedRoute>} />
                <Route path="hero" element={<RoleProtectedRoute allowedRoles={["super_admin", "admin"]}><HeroPage /></RoleProtectedRoute>} />
                <Route path="about" element={<RoleProtectedRoute allowedRoles={["super_admin", "admin"]}><AboutPage /></RoleProtectedRoute>} />
                <Route path="menu" element={<MenuPage />} />
                <Route path="gallery" element={<GalleryPage />} />
                <Route path="chef" element={<ChefPage />} />
                <Route path="offers" element={<OffersPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="newsletter" element={<NewsletterPage />} />
                <Route path="settings" element={<RoleProtectedRoute allowedRoles={["super_admin", "admin"]}><SettingsPage /></RoleProtectedRoute>} />
                <Route path="users" element={<RoleProtectedRoute allowedRoles={["super_admin", "admin"]}><UsersPage /></RoleProtectedRoute>} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="trash" element={<TrashPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "hsl(var(--card))",
                color: "hsl(var(--card-foreground))",
                border: "1px solid hsl(var(--border))",
              },
            }}
          />
        </div>
      </AdminAuthProvider>
    </ThemeProvider>
  );
}
