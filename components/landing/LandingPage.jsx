'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Loader2, Menu, X, Sparkles, Shield, BarChart3, Users } from 'lucide-react';
import LogoMark from '@/components/landing/LogoMark';
import HeroSlideshow from '@/components/landing/HeroSlideshow';
import DashboardMockup from '@/components/landing/DashboardMockup';
import MethodCarousel from '@/components/landing/MethodCarousel';

const NAV_LINKS = [
  { href: '#produit', label: 'Produit' },
  { href: '#methodes', label: 'Méthodes' },
  { href: '#collaboration', label: 'Équipes' },
];

const FEATURES = [
  {
    title: 'Collaboration',
    text: 'Commentez et partagez au bon endroit.',
    icon: Users,
    gradient: 'bg-sky-500',
  },
  {
    title: 'Scrum et Kanban',
    text: 'Deux méthodes, un seul outil.',
    icon: Sparkles,
    gradient: 'bg-sky-500',
  },
  {
    title: 'Suivi',
    text: "L'avancement se lit en un regard.",
    icon: BarChart3,
    gradient: 'bg-sky-500',
  },
  {
    title: 'Rôles et droits',
    text: 'Chacun accède à ce qui le concerne.',
    icon: Shield,
    gradient: 'bg-sky-500',
  },
];

function primaryButtonClass() {
  return 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-sky-700 hover:shadow-lg hover:shadow-sky-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
}

function ghostOnLightClass() {
  return 'inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500';
}

function lightCtaClass() {
  return 'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#E0F2FE] px-6 py-3 text-sm font-semibold text-[#0C4A6E] shadow-lg shadow-sky-100 transition-all hover:bg-sky-200 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50';
}

export default function LandingPage({
  primaryLabel,
  onPrimary,
  loading,
  error,
  showLogin,
  onLogin,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const overHero = !scrolled && !menuOpen;

  return (
    <div id="landing-root" className="min-h-screen text-slate-950">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#F8FAFC] focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-800"
      >
        Aller au contenu
      </a>

      {/* ─── Header ─── */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
          overHero
            ? 'border-b border-white/60 bg-white/80 backdrop-blur-sm'
            : 'border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#contenu" className="flex items-center gap-3" onClick={closeMenu}>
            <LogoMark size="sm" />
            <span className="leading-tight">
              <span
                className={`block text-[15px] font-bold tracking-tight ${
                  overHero ? 'text-slate-800' : 'text-slate-900'
                }`}
              >
                PM
              </span>
              <span
                className={`block text-[11px] font-medium ${
                  overHero ? 'text-slate-700' : 'text-slate-600'
                }`}
              >
                Gestion de Projets
              </span>
            </span>
          </a>

          <nav
            className={`hidden items-center gap-8 text-[13px] font-semibold tracking-wide lg:flex ${
              overHero ? 'text-slate-700' : 'text-slate-700'
            }`}
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-sky-600">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-1 sm:flex">
            {showLogin ? (
              <button type="button" onClick={onLogin} className={ghostOnLightClass()}>
                Se connecter
              </button>
            ) : null}
            <button
              type="button"
              onClick={onPrimary}
              disabled={loading}
              className={primaryButtonClass()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? 'Chargement...' : primaryLabel}
            </button>
          </div>

          <button
            type="button"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-md lg:hidden ${
              overHero ? 'text-slate-800' : 'text-slate-800'
            }`}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1 text-sm font-semibold">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className="rounded-md px-3 py-2.5 text-slate-800"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="mt-3 flex flex-col gap-2">
              {showLogin ? (
                <button type="button" onClick={onLogin} className={ghostOnLightClass()}>
                  Se connecter
                </button>
              ) : null}
              <button
                type="button"
                onClick={onPrimary}
                disabled={loading}
                className={primaryButtonClass()}
              >
                {loading ? 'Chargement...' : primaryLabel}
              </button>
            </div>
          </div>
        ) : null}
      </header>

      <main id="contenu">
        {/* ─── Hero ─── */}
        <section className="relative isolate min-h-[100svh] overflow-hidden">
          <HeroSlideshow>
            {({ index, label, caption, goTo, slides }) => (
              <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-center px-4 pb-16 pt-28 sm:px-6">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-800 drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]">
                    Plateforme Agile
                  </p>
                  <h1 className="mt-3 text-balance text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)] sm:text-5xl lg:text-6xl">
                    Le travail avance.
                    <br />
                    Les équipes aussi.
                  </h1>
                  <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-slate-700 drop-shadow-[0_1px_3px_rgba(255,255,255,0.7)] sm:text-lg">
                    Scrum, Kanban et sprints dans un seul espace. Pour les équipes qui livrent.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onPrimary}
                      disabled={loading}
                      className={lightCtaClass()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Chargement...
                        </>
                      ) : (
                        <>
                          {primaryLabel}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    <a
                      href="#produit"
                      className="inline-flex min-h-12 items-center justify-center rounded-xl border border-sky-300 bg-white/80 px-6 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-white"
                    >
                      Voir le produit
                    </a>
                  </div>
                  {error ? <p className="mt-4 text-sm font-medium text-red-200">{error}</p> : null}
                  <div className="mt-10 max-w-md">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800 drop-shadow-[0_1px_3px_rgba(255,255,255,0.8)]"
                      aria-live="polite"
                    >
                      {label}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700 drop-shadow-[0_1px_3px_rgba(255,255,255,0.7)]">
                      {caption}
                    </p>
                    <div
                      className="mt-3 flex items-center gap-2"
                      role="tablist"
                      aria-label="Diapositives"
                    >
                      {slides.map((slide, slideIndex) => {
                        const active = slideIndex === index;
                        return (
                          <button
                            key={slide.src}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            aria-label={`Afficher ${slide.label}`}
                            onClick={() => goTo(slideIndex)}
                            className="group relative h-11 flex-1"
                          >
                            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/30" />
                            <span
                              className={`landing-progress-fill absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-white ${
                                active ? 'is-active' : ''
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </HeroSlideshow>
        </section>

        {/* ─── Produit — Dashboard interactif ─── */}
        <section id="produit" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto max-w-6xl">
            {/* Section header */}
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
                Vue d&apos;ensemble
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Un tableau clair pour toute l&apos;équipe.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                Colonnes, tâches et avancement visibles d&apos;un coup d&apos;œil. Chacun sait quoi
                faire ensuite.
              </p>
            </div>

            {/* Interactive mockup */}
            <div className="mx-auto max-w-4xl">
              <DashboardMockup />
            </div>

            {/* Features grid */}
            <ul
              id="fonctionnalites"
              className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
            >
              {FEATURES.map((item) => {
                const Icon = item.icon;
                return (
                  <li
                    key={item.title}
                    className="group relative overflow-hidden rounded-2xl border border-sky-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/60"
                  >
                    <div
                      className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.gradient} shadow-sm`}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-slate-900">{item.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* ─── Méthodes ─── */}
        <section id="methodes" className="scroll-mt-24 bg-white px-4 py-20 sm:px-6 lg:py-28">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
              Méthodologies
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
              Travaillez comme vous livrez.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              Scrum, Kanban ou les deux. Choisissez la méthode, l&apos;équipe reste sur le même
              tableau.
            </p>
          </div>
          <MethodCarousel />
        </section>

        {/* ─── Collaboration / Équipes ─── */}
        <section id="collaboration" className="px-4 py-10 sm:px-6 lg:py-16">
          <div className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-sky-100 ring-1 ring-sky-200">
            <div className="absolute inset-0 bg-white/40" />
            <div className="relative px-6 py-20 sm:px-10 sm:py-24 lg:px-14">
              <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                    Travail d&apos;équipe
                  </p>
                  <h2 className="mt-2 max-w-lg text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                    Une équipe alignée.
                    <br />
                    Un tableau unique.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-sky-800 sm:text-base">
                    Chefs de projet, membres et recrues voient le même avancement.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onPrimary}
                  disabled={loading}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(2,132,199,0.25)] transition-all hover:bg-sky-600 hover:shadow-[0_18px_45px_rgba(2,132,199,0.35)]"
                >
                  {loading ? 'Chargement...' : primaryLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer id="a-propos" className="border-t border-violet-800 bg-violet-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <LogoMark size="sm" />
              <span className="leading-tight">
                <span className="block text-sm font-bold text-white">PM</span>
                <span className="block text-[11px] font-medium text-violet-200">
                  Gestion de Projets
                </span>
              </span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Produit</p>
            <ul className="mt-3 space-y-2 text-sm text-violet-200">
              <li>
                <a href="#produit" className="transition-colors hover:text-white">
                  Fonctionnalités
                </a>
              </li>
              <li>
                <a href="#methodes" className="transition-colors hover:text-white">
                  Méthodes
                </a>
              </li>
              <li>
                <a href="#collaboration" className="transition-colors hover:text-white">
                  Équipes
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Entreprise</p>
            <ul className="mt-3 space-y-2 text-sm text-violet-200">
              <li>
                <a href="#a-propos" className="transition-colors hover:text-white">
                  À propos
                </a>
              </li>
              <li>
                <a href="#a-propos" className="transition-colors hover:text-white">
                  Contact
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Ressources</p>
            <ul className="mt-3 space-y-2 text-sm text-violet-200">
              <li>
                <a href="#produit" className="transition-colors hover:text-white">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#a-propos" className="transition-colors hover:text-white">
                  Support
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-violet-800/60 py-4 text-center text-sm text-violet-300">
          <p>© 2026 PM - Gestion de Projets</p>
          <p className="mt-1">Tous droits réservés</p>
        </div>
      </footer>
    </div>
  );
}
