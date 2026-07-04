import React from "react";
import { MapPin, Phone, Instagram, Facebook, MessageCircle, Clock } from "lucide-react";
import Reveal from "./Reveal";
import SectionHeading from "./SectionHeading";
import { useRestaurant } from "@/hooks/useSiteData";
import { site } from "@/data/site";

export default function Contact() {
  const { data: apiData } = useRestaurant();
  const data = apiData || {
    address: site.contact.address, phone: site.contact.phone,
    map_embed: site.contact.mapEmbed, hours: site.contact.hours, social: site.contact.social,
  };

  return (
    <section id="contact" data-testid="contact-section" className="py-24 md:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <SectionHeading
          overline="Find Us"
          title="Dine in, order takeaway, or get in touch."
          subtitle="Visit us for an authentic coastal dining experience, or place your takeaway order with a quick call or WhatsApp message. We're always happy to serve you."
        />
        <div className="grid lg:grid-cols-2 gap-10">
          <Reveal>
            <div className="rounded-3xl overflow-hidden border border-border shadow-xl h-[440px]">
              <iframe title="Location map" src={data.map_embed} width="100%" height="100%"
                style={{ border: 0 }} allowFullScreen="" loading="lazy"
                referrerPolicy="no-referrer-when-downgrade" data-testid="contact-map" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-3xl border border-border bg-card p-8 md:p-10 h-full flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <span className="h-11 w-11 rounded-xl grid place-items-center bg-brand-primary/10 text-brand-primary shrink-0"><MapPin size={20} /></span>
                <div>
                  <div className="overline text-muted-foreground">Address</div>
                  <p className="mt-1 leading-relaxed">{data.address}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <span className="h-11 w-11 rounded-xl grid place-items-center bg-brand-primary/10 text-brand-primary shrink-0"><Phone size={20} /></span>
                <div>
                  <div className="overline text-muted-foreground">Phone</div>
                  <a href={`tel:${data.phone}`} className="mt-1 block hover:text-brand-primary" data-testid="contact-phone">{data.phone}</a>
                </div>
              </div>
              <div className="pt-6 border-t border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Clock size={16} className="text-brand-primary" />
                  <span className="overline">Opening Hours</span>
                </div>
                <ul className="space-y-2">
                  {(data.hours || []).map((h) => (
                    <li key={h.day} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium">{h.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-6 border-t border-border flex items-center gap-3">
                {data.social?.instagram && <a href={data.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram" className="h-11 w-11 rounded-full border border-border grid place-items-center hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all" data-testid="social-instagram"><Instagram size={18} /></a>}
                {data.social?.facebook && <a href={data.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook" className="h-11 w-11 rounded-full border border-border grid place-items-center hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all" data-testid="social-facebook"><Facebook size={18} /></a>}
                {data.social?.whatsapp && <a href={data.social.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="h-11 w-11 rounded-full border border-border grid place-items-center hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all" data-testid="social-whatsapp"><MessageCircle size={18} /></a>}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
