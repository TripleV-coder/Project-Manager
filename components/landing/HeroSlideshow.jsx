'use client';

import { useCallback, useEffect, useState } from 'react';

const SLIDES = [
  {
    src: '/landing/collaboration.jpg',
    alt: 'Deux collègues se félicitent après une livraison',
    object: 'object-[center_40%]',
    label: 'Livraison',
    caption: "Chaque étape terminée est visible par toute l'équipe.",
  },
  {
    src: '/landing/scrum.jpg',
    alt: 'Revue de sprint devant un mur de tâches',
    object: 'object-center',
    label: 'Sprint',
    caption: 'Planifiez le sprint et livrez à la date prévue.',
  },
  {
    src: '/landing/huddle.jpg',
    alt: "Équipe concentrée autour d'une table de travail",
    object: 'object-center',
    label: 'Travail',
    caption: 'Chacun avance sur sa part, au même endroit.',
  },
  {
    src: '/landing/atelier.jpg',
    alt: "Discussion autour d'un ordinateur portable",
    object: 'object-[center_30%]',
    label: 'Atelier',
    caption: 'Décidez ensemble, puis suivez le plan sur le tableau.',
  },
  {
    src: '/landing/formation.jpg',
    alt: 'Deux développeurs regardent le même écran',
    object: 'object-center',
    label: 'Pair',
    caption: "Expliquez, montrez, livrez. Sans changer d'outil.",
  },
];

const INTERVAL_MS = 7000;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return reduced;
}

export default function HeroSlideshow({ children }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const goTo = useCallback(
    (next) => {
      setIndex((next + SLIDES.length) % SLIDES.length);
    },
    [setIndex]
  );

  useEffect(() => {
    if (paused) return undefined;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="absolute inset-0"
      role="region"
      aria-roledescription="carrousel"
      aria-label="Photos d'équipe"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, slideIndex) => {
        const active = slideIndex === index;
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={slide.src}
            src={slide.src}
            alt={active ? slide.alt : ''}
            aria-hidden={!active}
            className={`landing-kenburns absolute inset-0 h-full w-full rounded-[2rem] object-cover ${slide.object} ${
              active ? 'is-active' : 'hidden'
            }`}
          />
        );
      })}

      <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/30 to-sky-50/40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 rounded-t-[2rem] bg-gradient-to-b from-white/40 to-transparent" />

      {typeof children === 'function'
        ? children({
            index,
            label: SLIDES[index].label,
            caption: SLIDES[index].caption,
            goTo,
            slides: SLIDES,
          })
        : children}
    </div>
  );
}
