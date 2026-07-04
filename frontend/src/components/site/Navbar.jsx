import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useRestaurant } from "@/hooks/useSiteData";
import { site } from "@/data/site";

const links = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "About", href: "#about" },
  { label: "Gallery", href: "#gallery" },
  { label: "Reviews", href: "#Reviews" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const { data } = useRestaurant();

  // Use fallback immediately so Navbar renders on first paint
  const name = data?.name || site.name;
  const tagline = data?.tagline || site.tagline;
  const logo = data?.logo || site.logo;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (href) => {
    setOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.header
      data-testid="site-navbar"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "glass shadow-[0_6px_30px_-12px_rgba(0,0,0,0.15)]" : "bg-transparent"}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
        <button onClick={() => scrollTo("#home")} data-testid="nav-logo" className="flex items-center gap-3 group">
          {logo && <img src={logo} alt={`${name} Logo`} className="h-12 w-auto object-contain" />}
          <span className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-lg tracking-tight">{name}</span>
            <span className="overline text-[10px] text-muted-foreground mt-1">{tagline}</span>
          </span>
        </button>

        <nav className="hidden lg:flex items-center gap-8">
          {links.map((l) => (
            <button key={l.href} onClick={() => scrollTo(l.href)} data-testid={`nav-link-${l.label.toLowerCase()}`}
              className="text-sm font-medium hover:text-brand-primary transition-colors relative group">
              {l.label}
              <span className="absolute -bottom-1 left-0 h-[2px] w-0 bg-brand-primary group-hover:w-full transition-all duration-300" />
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button data-testid="theme-toggle" onClick={toggle} aria-label="Toggle theme"
            className="h-10 w-10 grid place-items-center rounded-full border border-border hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all">
            <AnimatePresence mode="wait">
              {theme === "dark" ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><Sun size={18} /></motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><Moon size={18} /></motion.span>
              )}
            </AnimatePresence>
          </button>

          <button data-testid="nav-reserve-btn" onClick={() => scrollTo("#reservation")}
            className="hidden md:inline-flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-medium tracking-wide shadow-lg shadow-brand-primary/30 hover:shadow-brand-primary/50 transition-all">
            Reserve Table
          </button>

          <button data-testid="nav-menu-toggle" onClick={() => setOpen((o) => !o)}
            className="lg:hidden h-10 w-10 grid place-items-center rounded-full border border-border">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }} className="lg:hidden glass border-t border-border" data-testid="mobile-menu">
            <div className="px-6 py-6 flex flex-col gap-4">
              {links.map((l) => (
                <button key={l.href} onClick={() => scrollTo(l.href)}
                  className="text-left text-lg font-medium py-2 border-b border-border/60" data-testid={`mobile-link-${l.label.toLowerCase()}`}>
                  {l.label}
                </button>
              ))}
              <button onClick={() => scrollTo("#reservation")}
                className="mt-2 bg-brand-primary text-white px-5 py-3 rounded-full text-sm font-medium" data-testid="mobile-reserve-btn">
                Reserve Table
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
