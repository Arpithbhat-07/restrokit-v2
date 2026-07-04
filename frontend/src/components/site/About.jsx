import React from "react";
import { Check } from "lucide-react";
import Reveal from "./Reveal";
import Counter from "./Counter";
import { useAbout } from "@/hooks/useSiteData";
import { site } from "@/data/site";

const FALLBACK = {
  heading: site.about.heading,
  paragraph: site.about.paragraph,
  bullets: site.about.bullets,
  stats: site.about.stats,
  images: site.about.images,
};

export default function About() {
  const { data } = useAbout();
  const d = data || FALLBACK;

  return (
    <section id="about" data-testid="about-section" className="relative py-24 md:py-32 bg-muted/40">
      <div className="max-w-7xl mx-auto px-6 md:px-10 grid lg:grid-cols-2 gap-14 md:gap-20 items-center">
        <Reveal className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-2xl">
            <img
              src={(d.images || [])[0]}
              alt="Restaurant interior"
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[1200ms] hover:scale-105"
            />
          </div>
          <div className="hidden md:block absolute -bottom-10 -right-6 w-52 aspect-square overflow-hidden rounded-3xl border-4 border-background shadow-xl">
            <img
              src={(d.images || [])[1]}
              alt="Ambiance"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden md:flex absolute -left-8 top-8 h-24 w-24 rounded-full bg-brand-secondary/90 text-brand-ink font-display text-lg items-center justify-center rotate-[-8deg] shadow-xl">
            Est. 2019
          </div>
        </Reveal>

        <div>
          <Reveal>
            <span className="overline text-brand-primary flex items-center gap-3">
              <span className="h-px w-8 bg-brand-primary" /> Our Story
            </span>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-4 leading-[1.05] tracking-tight text-balance">
              {d.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed">{d.paragraph}</p>
          </Reveal>

          <Reveal delay={0.3}>
            <ul className="grid grid-cols-2 gap-3 mt-8">
              {(d.bullets || []).map((b) => (
                <li key={b} className="flex items-center gap-3 text-sm md:text-base">
                  <span className="h-6 w-6 rounded-full bg-brand-primary/10 text-brand-primary grid place-items-center">
                    <Check size={14} />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={0.4}>
            <div className="grid grid-cols-3 gap-6 mt-10 pt-10 border-t border-border">
              {(d.stats || []).map((s) => (
                <div key={s.label} data-testid={`stat-${s.label.toLowerCase()}`}>
                  <div className="font-display text-4xl md:text-5xl text-brand-primary">
                    <Counter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="overline text-muted-foreground mt-2">{s.label}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
