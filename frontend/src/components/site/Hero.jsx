import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, UtensilsCrossed } from "lucide-react";
import { useHero } from "@/hooks/useSiteData";
import { site } from "@/data/site";

// Immediate fallback so Hero is never blank on first paint
const FALLBACK = {
  kicker: site.hero.kicker,
  title: site.hero.title,
  title_alt: site.hero.titleAlt,
  subtitle: site.hero.subtitle,
  image: site.hero.image,
  cta_primary: "Reserve Table",
  cta_secondary: "View Menu",
};

export default function Hero() {
  const { data } = useHero();
  const d = data || FALLBACK;
  const go = (h) => document.querySelector(h)?.scrollIntoView({ behavior: "smooth" });

  return (
    <section
      id="home"
      data-testid="hero-section"
      className="relative min-h-[100svh] w-full overflow-hidden flex items-center justify-center text-white"
    >
      <motion.div
        aria-hidden
        className="absolute inset-0"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: "easeOut" }}
      >
        <img
          src={d.image}
          alt="Signature dish"
          loading="eager"
          fetchpriority="high"
          className="w-full h-full object-cover animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80" />
      </motion.div>

      <motion.span
        aria-hidden
        className="absolute top-32 left-8 md:left-24 text-brand-secondary/60"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: [0, -14, 0] }}
        transition={{ delay: 1, duration: 6, repeat: Infinity }}
      >
        <UtensilsCrossed size={42} />
      </motion.span>

      <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="overline text-brand-secondary mb-6"
        >
          {d.kicker}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15 }}
          className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tighter text-balance"
          data-testid="hero-title"
        >
          {d.title}
          <br />
          <span className="italic font-normal text-brand-secondary">{d.title_alt}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-8 text-lg md:text-xl text-white/85 max-w-2xl mx-auto leading-relaxed text-balance"
        >
          {d.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <button
            onClick={() => go("#reservation")}
            data-testid="hero-reserve-btn"
            className="ripple bg-brand-primary hover:bg-brand-primary-dark text-white px-8 py-4 rounded-full text-sm font-medium tracking-wide uppercase shadow-2xl shadow-brand-primary/40 transition-all hover:-translate-y-0.5"
          >
            {d.cta_primary}
          </button>
          <button
            onClick={() => go("#menu")}
            data-testid="hero-menu-btn"
            className="ripple border border-white/40 hover:bg-white hover:text-black text-white px-8 py-4 rounded-full text-sm font-medium tracking-wide uppercase transition-all hover:-translate-y-0.5"
          >
            {d.cta_secondary}
          </button>
        </motion.div>
      </div>

      <motion.button
        onClick={() => go("#features")}
        data-testid="hero-scroll-indicator"
        aria-label="Scroll down"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{ delay: 1.2, duration: 2, repeat: Infinity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 h-12 w-12 grid place-items-center rounded-full border border-white/40 backdrop-blur-md"
      >
        <ChevronDown size={20} />
      </motion.button>
    </section>
  );
}
