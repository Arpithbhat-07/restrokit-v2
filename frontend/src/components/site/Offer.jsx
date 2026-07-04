import React, { useState, useEffect } from "react";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import { useOffer } from "@/hooks/useSiteData";
import { site as fallback } from "@/data/site";

export default function Offer() {
  const { data: offers, loading } = useOffer();
  const [i, setI] = useState(0);

  const activeOffers = offers && offers.length > 0 ? offers : [fallback.offer];
  const total = activeOffers.length;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => {
      setI((prev) => (prev + 1) % total);
    }, 6000);
    return () => clearInterval(t);
  }, [total]);

  const scroll = () => document.querySelector("#reservation")?.scrollIntoView({ behavior: "smooth" });

  if (loading) return null;

  const currentOffer = activeOffers[i];

  return (
    <section id="offer" data-testid="offer-section" className="py-16 md:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] text-white shadow-2xl grain bg-[#121212]">
            {/* Background Image Layer with Cross-fade transition */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentOffer.id || i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 z-0"
              >
                {currentOffer.banner ? (
                  <>
                    <img src={currentOffer.banner} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/65 backdrop-blur-[0.5px]" />
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-primary via-[#8B1E1E] to-brand-accent">
                    <div className="absolute inset-0 opacity-30" aria-hidden>
                      <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-brand-secondary/40 blur-3xl" />
                      <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Content Layer */}
            <div className="relative z-10 p-10 md:p-16 lg:p-20">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentOffer.id || i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5 }}
                  className="grid md:grid-cols-2 gap-10 items-center"
                >
                  <div>
                    <span className="inline-flex items-center gap-2 overline text-brand-secondary">
                      <Sparkles size={14} /> Limited Time
                    </span>
                    <div className="font-display text-6xl md:text-7xl lg:text-8xl leading-none mt-4">
                      {currentOffer.discount > 0 ? `${currentOffer.discount}% OFF` : currentOffer.title}
                    </div>
                    {currentOffer.discount > 0 && (
                      <div className="font-display italic text-2xl md:text-3xl mt-3 text-brand-secondary">
                        {currentOffer.title}
                      </div>
                    )}
                  </div>
                  <div className="md:pl-8 md:border-l border-white/20">
                    <p className="text-white/85 text-lg leading-relaxed">{currentOffer.description}</p>
                    <button
                      onClick={currentOffer.btn_link ? () => window.open(currentOffer.btn_link, "_blank") : scroll}
                      data-testid="offer-reserve-btn"
                      className="mt-8 inline-flex items-center gap-2 bg-white text-brand-primary hover:bg-brand-secondary hover:text-brand-ink px-8 py-4 rounded-full font-medium tracking-wide uppercase text-sm transition-all hover:-translate-y-0.5 shadow-xl"
                    >
                      {currentOffer.btn_text || "Reserve Now"}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Indicators */}
              {total > 1 && (
                <div className="flex justify-center items-center gap-4 mt-10">
                  <button
                    onClick={() => setI((v) => (v - 1 + total) % total)}
                    data-testid="offer-prev"
                    aria-label="Previous offer"
                    className="h-10 w-10 rounded-full border border-white/20 grid place-items-center hover:bg-white hover:text-brand-primary transition-all bg-black/20 text-white"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex gap-2">
                    {activeOffers.map((_, k) => (
                      <button
                        key={k}
                        onClick={() => setI(k)}
                        aria-label={`Go to offer ${k + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          k === i ? "bg-brand-secondary w-6" : "bg-white/40 w-1.5"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setI((v) => (v + 1) % total)}
                    data-testid="offer-next"
                    aria-label="Next offer"
                    className="h-10 w-10 rounded-full border border-white/20 grid place-items-center hover:bg-white hover:text-brand-primary transition-all bg-black/20 text-white"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
