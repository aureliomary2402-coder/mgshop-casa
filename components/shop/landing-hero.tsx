import type { ComponentType, CSSProperties, ReactNode } from 'react'
import { Truck, Star, Ticket } from 'lucide-react'
import { HeroBackdrop, AccentTitle } from './hero-backdrop'

// Hero in stile landing (app/page.tsx): stesso fondo #06151c con glow, griglia
// 3D e bolle (HeroBackdrop), badge con puntino pulsante, titolo font-black in
// maiuscolo con ultima parola sfumata cyan, testo slate-300 e, a destra,
// l'oggetto 3D con anelli, card di vetro e due mini card flottanti.
// Lo usano PageHero (tutte le pagine) e HeroBanner (/shop).
export interface LandingHeroProps {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  badge?: { icon?: ComponentType<{ className?: string }>; text: string }
  title: ReactNode
  subtitle?: ReactNode
  topBar?: ReactNode
  children?: ReactNode
  actions?: ReactNode
  below?: ReactNode
}

export function LandingHero({ icon: Icon, badge, title, subtitle, topBar, children, actions, below }: LandingHeroProps) {
  const BadgeIcon = badge?.icon

  return (
    <section className="relative overflow-hidden bg-[#06151c]">
      <HeroBackdrop />

      <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pb-24">
        {topBar && <div className="mb-6 flex items-center justify-between sm:mb-10">{topBar}</div>}

        <div className="grid items-center gap-6 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
          {/* testo */}
          <div className="max-w-2xl">
            {badge && (
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
                {BadgeIcon ? (
                  <BadgeIcon className="h-4 w-4" />
                ) : (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                )}
                {badge.text}
              </div>
            )}

            <h1 className="break-words text-5xl font-black uppercase leading-[0.92] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              <AccentTitle text={title} />
            </h1>

            {subtitle && (
              <div className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl [&_.mx-auto]:!mx-0">
                {subtitle}
              </div>
            )}

            {children && (
              <div className="mt-6 [&_.justify-center]:!justify-start [&_.mx-auto]:!mx-0">{children}</div>
            )}

            {actions && <div className="mt-9 flex flex-col gap-3 sm:flex-row">{actions}</div>}
          </div>

          {/* oggetto 3D */}
          <div className="relative mx-auto h-[270px] w-full max-w-[470px] sm:h-[430px]" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-[430px] w-[470px] -translate-x-1/2 -translate-y-1/2 scale-[.62] sm:scale-100">
              {/* anelli */}
              <div className="absolute left-1/2 top-1/2 h-[370px] w-[370px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 shadow-[0_0_100px_rgba(34,211,238,.12)]" />
              <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />

              {/* card principale */}
              <div className="absolute left-1/2 top-1/2 w-[320px] -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] rounded-[34px] border border-white/20 bg-white/[0.09] p-6 shadow-[0_40px_100px_rgba(0,0,0,.45)] backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15">
                    <Icon className="h-6 w-6 text-cyan-300" />
                  </div>
                  <span className="rounded-full border border-cyan-200/15 bg-cyan-200/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
                    MGShop
                  </span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-[.2em] text-slate-400">Spesa semplice</div>
                <div className="mt-2 text-3xl font-black text-white">ORDINA.</div>
                <div className="text-3xl font-black text-cyan-300">RICEVI.</div>

                <div className="mt-6 space-y-2">
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 w-[75%] rounded-full bg-white/10" />
                  <div className="h-3 w-[55%] rounded-full bg-cyan-300/30" />
                </div>

                <div className="mt-7 flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 p-3">
                  <span className="text-xs text-slate-400">Pagamento</span>
                  <span className="text-xs font-bold text-white">Alla consegna</span>
                </div>
              </div>

              {/* In basso, sotto la card principale: non coprono più "Pagamento: Alla consegna" */}
              <div className="absolute bottom-[-4%] left-[3%] rotate-[-4deg] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15">
                    <Truck size={19} className="text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">CONSEGNA</div>
                    <div className="text-sm font-black text-white">A CASA TUA</div>
                  </div>
                </div>
              </div>

              <div className="absolute bottom-[-4%] right-[3%] rotate-[4deg] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15">
                    <Ticket size={19} className="text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">LOTTERIA</div>
                    <div className="text-sm font-black text-white">OGNI SETTIMANA</div>
                  </div>
                </div>
              </div>

              <div className="absolute right-[1%] top-[14%] rotate-[5deg] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15">
                    <Star size={19} className="text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">RACCOLTA PUNTI</div>
                    <div className="text-sm font-black text-white">AD OGNI ACQUISTO</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {below}
      </div>

      {/* indicatore scroll, come nella landing */}
      <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9px] font-bold uppercase tracking-[.3em] text-slate-500 sm:flex">
        <span>Scopri</span>
        <div className="h-7 w-px bg-gradient-to-b from-cyan-300/60 to-transparent" />
      </div>
    </section>
  )
}
