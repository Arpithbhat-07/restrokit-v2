import React, { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Instagram, Facebook, MessageCircle, Send } from "lucide-react";
import { useRestaurant } from "@/hooks/useSiteData";
import { site } from "@/data/site";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Footer() {
  const { data: apiData } = useRestaurant();
  const data = apiData || { name: site.name, logo: site.logo, social: site.contact.social, hours: site.contact.hours };
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await axios.post(`${API}/newsletter`, { email });
      toast.success("Subscribed! Welcome to the table.");
      setEmail("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Subscription failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const scroll = (h) => document.querySelector(h)?.scrollIntoView({ behavior: "smooth" });
  return (
    <footer data-testid="site-footer" className="bg-brand-ink text-white pt-20 pb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-brand-primary/20 blur-3xl -translate-y-1/2 translate-x-1/2" aria-hidden />
      <div className="max-w-7xl mx-auto px-6 md:px-10 relative">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10 pb-14 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <img src={data.logo} alt={`${data.name} Logo`} className="h-14 w-auto" />
              <div className="font-display text-2xl">{data.name}</div>
            </div>
            <p className="text-white/60 mt-5 leading-relaxed">
              {data.description || "A contemporary Indian kitchen serving authentic coastal delicacies and warm hospitality."}
            </p>
            <div className="mt-6 flex gap-3">
              {data.social?.instagram && <a href={data.social.instagram} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full grid place-items-center bg-white/10 hover:bg-brand-primary transition-colors" aria-label="Instagram"><Instagram size={16} /></a>}
              {data.social?.facebook && <a href={data.social.facebook} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full grid place-items-center bg-white/10 hover:bg-brand-primary transition-colors" aria-label="Facebook"><Facebook size={16} /></a>}
              {data.social?.whatsapp && <a href={data.social.whatsapp} target="_blank" rel="noreferrer" className="h-10 w-10 rounded-full grid place-items-center bg-white/10 hover:bg-brand-primary transition-colors" aria-label="WhatsApp"><MessageCircle size={16} /></a>}
            </div>
          </div>

          <div>
            <div className="overline text-brand-secondary">Quick Links</div>
            <ul className="mt-4 space-y-3 text-white/70">
              {["Home", "Menu", "About", "Gallery", "Reviews", "Contact"].map((l) => (
                <li key={l}>
                  <button onClick={() => scroll(`#${l.toLowerCase()}`)} className="hover:text-white transition-colors" data-testid={`footer-link-${l.toLowerCase()}`}>{l}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="overline text-brand-secondary">Opening Hours</div>
            <ul className="mt-4 space-y-3 text-white/70 text-sm">
              {(data.hours || []).map((h) => (
                <li key={h.day} className="flex flex-col">
                  <span className="text-white/90">{h.day}</span>
                  <span>{h.time}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="overline text-brand-secondary">Stay Connected</div>
            <p className="mt-4 text-white/70 text-sm leading-relaxed">Follow us for daily specials and updates.</p>
            <form onSubmit={subscribe} className="mt-5 flex items-center gap-2 border-b border-white/20 focus-within:border-brand-secondary transition-colors">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
                data-testid="footer-newsletter-email"
                className="flex-1 bg-transparent py-3 outline-none placeholder:text-white/40 text-sm" />
              <button type="submit" disabled={loading} data-testid="footer-newsletter-submit" aria-label="Subscribe"
                className="h-10 w-10 grid place-items-center rounded-full bg-brand-primary hover:bg-brand-primary-dark transition-colors disabled:opacity-60">
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>

        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/50">
          <div>© {new Date().getFullYear()} {data.name}. All rights reserved.</div>
          <a href="https://www.linkedin.com/in/arpith-bhat" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-brand-primary transition-colors">
            Designed & Developed by Arpith Bhat
          </a>
        </div>
      </div>
    </footer>
  );
}
