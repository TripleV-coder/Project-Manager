'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const METHODS = [
  {
    src: '/landing/kanban.jpg',
    title: 'Kanban',
    alt: 'Équipe qui place des notes sur une vitre',
    text: 'Visualisez le flux et limitez le travail en cours.',
  },
  {
    src: '/landing/reunion.jpg',
    title: 'Réunion',
    alt: "Travail en équipe autour d'une table",
    text: "Passez de la discussion au tableau sans changer d'outil.",
  },
  {
    src: '/landing/workshop.jpg',
    title: 'Workshop',
    alt: 'Atelier de formation en salle',
    text: 'Cadrez le sprint, puis suivez ce qui a été décidé.',
  },
  {
    src: '/landing/equipe.jpg',
    title: 'Équipe',
    alt: 'Équipe projet en discussion',
    text: 'Assignez les tâches et suivez qui livre quoi.',
  },
];

const INTERVAL_MS = 5500;

export default function MethodCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: 'start',
    skipSnaps: false,
    duration: 28,
  });
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);

  const onSelect = useCallback((api) => {
    setSelected(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect(emblaApi);
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || paused) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return undefined;
    const id = window.setInterval(() => {
      emblaApi.scrollNext();
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [emblaApi, paused, selected]);

  return (
    <div
      className="relative mx-auto max-w-6xl rounded-[1.75rem] bg-white p-2 shadow-[0_12px_30px_rgba(15,23,42,0.04)] ring-1 ring-sky-200 sm:p-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setPaused(false);
        }
      }}
    >
      <div className="overflow-hidden rounded-[1.25rem]" ref={emblaRef}>
        <div className="flex gap-5">
          {METHODS.map((method) => (
            <article
              key={method.title}
              className="min-w-0 shrink-0 grow-0 basis-[88%] sm:basis-[58%] lg:basis-[40%]"
            >
              <div className="overflow-hidden rounded-[1.25rem] bg-sky-100 ring-1 ring-sky-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={method.src}
                  alt={method.alt}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
              <div className="pt-4">
                <h3 className="text-center text-base font-bold text-slate-950 sm:text-left">
                  {method.title}
                </h3>
                <p className="mt-1 text-center text-sm leading-relaxed text-slate-600 sm:text-left">
                  {method.text}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="m-auto flex gap-1" role="tablist" aria-label="Méthodes">
          {METHODS.map((method, index) => (
            <button
              key={method.title}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-label={method.title}
              onClick={() => emblaApi?.scrollTo(index)}
              className="inline-flex h-11 w-11 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  selected === index ? 'bg-sky-500' : 'bg-sky-300'
                }`}
              />
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => emblaApi?.scrollPrev()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300 bg-white text-sky-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Diapositive précédente"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => emblaApi?.scrollNext()}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-300 bg-white text-sky-700 shadow-sm transition-all hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Diapositive suivante"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
