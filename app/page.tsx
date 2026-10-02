"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Gift,
  Heart,
  MessageCircle,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Truck,
  WalletCards,
  Zap,
} from "lucide-react";

const categories = [
  {
    title: "Scopri lo Shop",
    subtitle: "Tutto il catalogo MGShop",
    icon: "🛒",
    href: "/shop",
  },
  {
    title: "Promo del momento",
    subtitle: "Offerte e Promo Box",
    icon: "🔥",
    href: "/promo",
  },
  {
    title: "Consegna a casa",
    subtitle: "Scopri dove consegniamo",
    icon: "🚚",
    href: "/consegne",
  },
  {
    title: "Ordina su WhatsApp",
    subtitle: "Parla direttamente con noi",
    icon: "💬",
    href: "https://wa.me/393522209558",
  },
];

const benefits = [
  {
    icon: Truck,
    title: "Consegna a casa",
    text: "Ordini online e ricevi comodamente dove vuoi.",
  },
  {
    icon: WalletCards,
    title: "Paghi alla consegna",
    text: "Nessun pagamento anticipato: paghi quando ricevi.",
  },
  {
    icon: Gift,
    title: "Promo e vantaggi",
    text: "Scopri offerte, Promo Box e occasioni dedicate.",
  },
  {
    icon: Sparkles,
    title: "Punti fedeltà",
    text: "Accumula punti con i tuoi ordini e ottieni premi.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f0fbfd] text-slate-900">

      {/* =========================================================
          HERO
      ========================================================= */}
      <section className="relative min-h-[760px] overflow-hidden bg-[#06151c] sm:min-h-[820px]">

        {/* glow ambientali */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-180px] top-[80px] h-[420px] w-[420px] rounded-full bg-cyan-400/15 blur-[110px]" />
          <div className="absolute right-[-160px] top-[160px] h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-[130px]" />
          <div className="absolute bottom-[-250px] left-1/2 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-[120px]" />
        </div>

        {/* griglia 3D */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(103,232,249,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,.35) 1px, transparent 1px)",
            backgroundSize: "70px 70px",
            transform: "perspective(500px) rotateX(62deg) scale(1.8)",
            transformOrigin: "center bottom",
          }}
        />

        {/* bolle già approvate */}
        <div className="pointer-events-none absolute inset-0">
          <div className="soap-bubble-rise soap-bubble-dark absolute left-[8%] top-[24%] h-16 w-16" />
          <div className="soap-bubble-rise soap-bubble-dark absolute right-[12%] top-[20%] h-24 w-24 [animation-delay:-2s]" />
          <div className="soap-bubble-rise soap-bubble-dark absolute left-[25%] top-[62%] h-10 w-10 [animation-delay:-5s]" />
          <div className="soap-bubble-rise soap-bubble-dark absolute right-[27%] top-[67%] h-14 w-14 [animation-delay:-7s]" />
          <div className="soap-bubble-rise soap-bubble-dark absolute left-[48%] top-[17%] h-8 w-8 [animation-delay:-3s]" />
        </div>

        {/* header */}
        <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="relative block">
            <Image
              src="/logo/mgshop-logo-neon.png"
              alt="MGShop"
              width={170}
              height={70}
              priority
              className="h-auto w-[125px] sm:w-[155px]"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/shop"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
            >
              <ShoppingBag size={17} />
              <span className="hidden sm:inline">Shop</span>
            </Link>

            <Link
              href="https://wa.me/393522209558"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-[#062029] shadow-[0_0_30px_rgba(34,211,238,.35)] transition hover:scale-105"
              aria-label="Contattaci su WhatsApp"
            >
              <MessageCircle size={20} />
            </Link>
          </div>
        </header>

        {/* contenuto hero */}
        <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl items-center px-5 pb-20 pt-10 sm:px-8">
          <div className="grid w-full items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">

            {/* testo */}
            <div className="max-w-2xl">

              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200 backdrop-blur-md">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                Il tuo shop locale
              </div>

              <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.045em] text-white sm:text-7xl lg:text-[82px]">
                TUTTO PER
                <br />
                LA TUA{" "}
                <span className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-sky-300 bg-clip-text text-transparent">
                  CASA.
                </span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
                Fai la tua spesa online. Scegli quello che ti serve,
                ordina in pochi secondi e ricevilo comodamente a casa.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/shop"
                  className="group inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-cyan-400 px-7 font-black text-[#05212a] shadow-[0_15px_50px_rgba(34,211,238,.22)] transition duration-300 hover:-translate-y-1 hover:bg-cyan-300"
                >
                  Vai allo shop
                  <ArrowRight
                    size={20}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>

                <Link
                  href="/promo"
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/8 px-7 font-bold text-white backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/12"
                >
                  <Sparkles size={18} />
                  Scopri le promo
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-cyan-300" />
                  Pagamento alla consegna
                </span>
                <span className="flex items-center gap-2">
                  <Check size={16} className="text-cyan-300" />
                  Consegna locale
                </span>
              </div>
            </div>

            {/* oggetto 3D */}
            <div className="relative mx-auto h-[390px] w-full max-w-[470px] sm:h-[470px]">

              {/* anello */}
              <div className="absolute left-1/2 top-1/2 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20 shadow-[0_0_100px_rgba(34,211,238,.12)] sm:h-[370px] sm:w-[370px]" />

              <div className="absolute left-1/2 top-1/2 h-[225px] w-[225px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10 sm:h-[300px] sm:w-[300px]" />

              {/* card principale */}
              <div className="absolute left-1/2 top-1/2 w-[270px] -translate-x-1/2 -translate-y-1/2 rotate-[-5deg] rounded-[34px] border border-white/20 bg-white/[0.09] p-5 shadow-[0_40px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:w-[320px] sm:p-6">

                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-300/15 text-2xl">
                    🛒
                  </div>

                  <span className="rounded-full border border-cyan-200/15 bg-cyan-200/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
                    MGShop
                  </span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-[.2em] text-slate-400">
                  Spesa semplice
                </div>

                <div className="mt-2 text-3xl font-black text-white">
                  ORDINA.
                </div>

                <div className="text-3xl font-black text-cyan-300">
                  RICEVI.
                </div>

                <div className="mt-6 space-y-2">
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 w-[75%] rounded-full bg-white/10" />
                  <div className="h-3 w-[55%] rounded-full bg-cyan-300/30" />
                </div>

                <div className="mt-7 flex items-center justify-between rounded-2xl border border-white/10 bg-black/15 p-3">
                  <span className="text-xs text-slate-400">
                    Pagamento
                  </span>
                  <span className="text-xs font-bold text-white">
                    Alla consegna
                  </span>
                </div>
              </div>

              {/* mini card fluttuante */}
              <div className="absolute bottom-[13%] left-[-2%] rotate-[6deg] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl sm:left-[1%]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15">
                    <Truck size={19} className="text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">
                      CONSEGNA
                    </div>
                    <div className="text-sm font-black text-white">
                      A CASA TUA
                    </div>
                  </div>
                </div>
              </div>

              {/* mini card punti */}
              <div className="absolute right-[-2%] top-[14%] rotate-[5deg] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 shadow-2xl backdrop-blur-xl sm:right-[1%]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-300/15">
                    <Gift size={19} className="text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">
                      VANTAGGI
                    </div>
                    <div className="text-sm font-black text-white">
                      PUNTI + PROMO
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* indicatore scroll */}
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-[9px] font-bold uppercase tracking-[.3em] text-slate-500">
          <span>Scopri</span>
          <div className="h-9 w-px bg-gradient-to-b from-cyan-300/60 to-transparent" />
        </div>
      </section>

      {/* =========================================================
          STRIP VANTAGGI
      ========================================================= */}
      <section className="relative z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
          {benefits.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="group px-5 py-7 transition hover:bg-cyan-50/60 sm:px-7"
              >
                <Icon
                  size={23}
                  className="mb-4 text-cyan-600 transition-transform duration-300 group-hover:-translate-y-1"
                />
                <h2 className="text-sm font-black text-slate-900">
                  {item.title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          CATEGORIE
      ========================================================= */}
      <section className="relative overflow-hidden px-5 py-20 sm:px-8 sm:py-28">

        <div className="pointer-events-none absolute right-[-150px] top-[20%] h-[350px] w-[350px] rounded-full bg-cyan-200/30 blur-[100px]" />

        <div className="relative mx-auto max-w-7xl">

          <div className="max-w-2xl">
            <span className="text-xs font-black uppercase tracking-[.25em] text-cyan-600">
              Esplora MGShop
            </span>

            <h2 className="mt-3 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl">
              Quello che cerchi,
              <br />
              <span className="text-cyan-600">a portata di click.</span>
            </h2>

            <p className="mt-5 text-base leading-7 text-slate-500">
              Dalla detergenza alla cura della persona, dalla casa alla
              cartoleria: trovi tutto in un unico posto.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category, index) => (
              <Link
                href={category.href}
                key={category.title}
                className="group relative min-h-[230px] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_15px_50px_rgba(15,23,42,.06)] transition duration-500 hover:-translate-y-2 hover:border-cyan-200 hover:shadow-[0_25px_70px_rgba(8,145,178,.13)] sm:min-h-[270px] sm:p-7"
              >
                <div className="absolute right-[-35px] top-[-35px] h-32 w-32 rounded-full bg-cyan-50 transition duration-500 group-hover:scale-150" />

                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl shadow-inner transition duration-500 group-hover:rotate-3 group-hover:scale-110">
                    {category.icon}
                  </div>

                  <div className="mt-12">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[.2em] text-cyan-600">
                      0{index + 1}
                    </div>

                    <h3 className="text-xl font-black text-slate-950 sm:text-2xl">
                      {category.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      {category.subtitle}
                    </p>
                  </div>

                  <div className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-white transition duration-300 group-hover:bg-cyan-500">
                    <ChevronRight size={17} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          PROMO 3D
      ========================================================= */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-[#071a22] px-6 py-14 shadow-[0_30px_100px_rgba(6,21,28,.18)] sm:px-12 sm:py-20">

          <div className="absolute right-[-100px] top-[-120px] h-[350px] w-[350px] rounded-full bg-cyan-400/15 blur-[80px]" />

          <div className="relative grid items-center gap-12 lg:grid-cols-[1fr_.7fr]">

            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-cyan-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[.2em] text-cyan-200">
                <Zap size={14} />
                Occasioni da non perdere
              </div>

              <h2 className="text-4xl font-black leading-tight tracking-[-.04em] text-white sm:text-6xl">
                Le promo non
                <br />
                aspettano.
              </h2>

              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                Scopri le offerte disponibili, le Promo Box e le occasioni
                pensate per farti risparmiare sui prodotti che usi davvero.
              </p>

              <Link
                href="/promo"
                className="mt-8 inline-flex h-13 items-center gap-3 rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-1"
              >
                Guarda le promo
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="relative mx-auto h-[250px] w-full max-w-[350px]">

              <div className="absolute left-1/2 top-1/2 h-[190px] w-[190px] -translate-x-1/2 -translate-y-1/2 rounded-[38px] border border-cyan-200/20 bg-gradient-to-br from-cyan-300/20 to-white/5 shadow-[0_30px_80px_rgba(0,0,0,.35)] backdrop-blur-xl [transform:translate(-50%,-50%)_rotate(8deg)]" />

              <div className="absolute left-1/2 top-1/2 flex h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[32px] border border-white/15 bg-white/10 text-center shadow-2xl backdrop-blur-xl [transform:translate(-50%,-50%)_rotate(-5deg)]">
                <Gift size={35} className="mb-3 text-cyan-300" />
                <span className="text-xs font-black uppercase tracking-widest text-cyan-200">
                  Promo
                </span>
                <span className="mt-1 text-2xl font-black text-white">
                  BOX
                </span>
              </div>

              <div className="absolute left-[5%] top-[10%] text-2xl">✦</div>
              <div className="absolute bottom-[10%] right-[5%] text-xl text-cyan-300">✦</div>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          COME FUNZIONA
      ========================================================= */}
      <section className="bg-white px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">

          <div className="text-center">
            <span className="text-xs font-black uppercase tracking-[.25em] text-cyan-600">
              Semplice davvero
            </span>

            <h2 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">
              Ordini in pochi passaggi.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">
              Niente complicazioni. Entri, scegli, ordini.
              Al resto pensiamo noi.
            </p>
          </div>

          <div className="relative mt-14 grid gap-5 md:grid-cols-3">

            <div className="hidden absolute left-[27%] right-[27%] top-[45px] h-px bg-gradient-to-r from-transparent via-cyan-200 to-transparent md:block" />

            {[
              {
                n: "01",
                icon: Search,
                title: "Scegli",
                text: "Trova i prodotti che ti servono direttamente dallo shop.",
              },
              {
                n: "02",
                icon: ShoppingBag,
                title: "Ordina",
                text: "Completa il tuo ordine scegliendo consegna o ritiro.",
              },
              {
                n: "03",
                icon: Truck,
                title: "Ricevi",
                text: "Ricevi il tuo ordine e paga comodamente alla consegna.",
              },
            ].map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.n}
                  className="relative rounded-[28px] border border-slate-200 bg-[#f8fdfe] p-7 text-center"
                >
                  <div className="mx-auto flex h-[90px] w-[90px] items-center justify-center rounded-full border border-cyan-200 bg-white shadow-[0_15px_40px_rgba(8,145,178,.10)]">
                    <Icon size={30} className="text-cyan-600" />
                  </div>

                  <div className="mt-6 text-[10px] font-black tracking-[.25em] text-cyan-600">
                    {step.n}
                  </div>

                  <h3 className="mt-2 text-xl font-black">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          FEDELTÀ + WHATSAPP
      ========================================================= */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">

          <div className="relative overflow-hidden rounded-[32px] bg-cyan-500 p-8 sm:p-10">
            <div className="absolute right-[-60px] top-[-60px] h-52 w-52 rounded-full bg-white/10" />
            <div className="absolute bottom-[-100px] left-[-50px] h-64 w-64 rounded-full bg-cyan-700/15 blur-3xl" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Gift size={27} className="text-white" />
              </div>

              <h2 className="mt-8 text-3xl font-black tracking-[-.03em] text-white sm:text-4xl">
                Ogni acquisto
                <br />
                può diventare un vantaggio.
              </h2>

              <p className="mt-4 max-w-md text-sm leading-6 text-cyan-50/80">
                Accumula punti con i tuoi acquisti e scopri i vantaggi
                della fedeltà MGShop.
              </p>

              <div className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-cyan-700">
                <Sparkles size={18} />
                1 punto ogni €10 di spesa
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] bg-[#071a22] p-8 sm:p-10">
            <div className="absolute right-[-80px] top-[-80px] h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300/10">
                <MessageCircle size={27} className="text-cyan-300" />
              </div>

              <h2 className="mt-8 text-3xl font-black tracking-[-.03em] text-white sm:text-4xl">
                Hai bisogno di aiuto?
                <br />
                Scrivici su WhatsApp.
              </h2>

              <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                Domande, informazioni o semplicemente vuoi sapere se
                possiamo aiutarti a trovare un prodotto?
              </p>

              <Link
                href="https://wa.me/393522209558"
                className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-5 py-4 text-sm font-black text-[#05212a] transition hover:-translate-y-1 hover:bg-cyan-300"
              >
                <MessageCircle size={18} />
                352 220 9558
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================
          DELIVERY
      ========================================================= */}
      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[34px] border border-cyan-100 bg-gradient-to-br from-white to-cyan-50 p-7 sm:p-12">

          <div className="absolute right-[-100px] top-[-100px] h-[300px] w-[300px] rounded-full bg-cyan-200/30 blur-[80px]" />

          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">

            <div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.22em] text-cyan-700">
                <Truck size={17} />
                Consegna locale
              </div>

              <h2 className="mt-4 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-4xl">
                Tu ordini.
                <br />
                Noi te lo portiamo a casa.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                Consegna gratuita ad Aci Sant&apos;Antonio.
                Per i paesi etnei e le zone vicine è previsto un piccolo
                contributo di consegna.
              </p>
            </div>

            <Link
              href="/consegne"
              className="group inline-flex shrink-0 items-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-cyan-600"
            >
              Scopri la consegna
              <ArrowRight
                size={18}
                className="transition-transform group-hover:translate-x-1"
              />
            </Link>

          </div>
        </div>
      </section>

      {/* =========================================================
          CTA FINALE
      ========================================================= */}
      <section className="relative overflow-hidden bg-[#06151c] px-5 py-24 sm:px-8 sm:py-32">

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-[120px]" />

          <div className="soap-bubble-rise soap-bubble-dark absolute left-[10%] top-[20%] h-12 w-12" />
          <div className="soap-bubble-rise soap-bubble-dark absolute right-[12%] bottom-[20%] h-20 w-20 [animation-delay:-4s]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10">
            <Heart size={28} className="text-cyan-300" />
          </div>

          <h2 className="mt-7 text-4xl font-black leading-tight tracking-[-.04em] text-white sm:text-6xl">
            La tua spesa.
            <br />
            <span className="text-cyan-300">Più semplice.</span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-400">
            Scopri MGShop e porta la comodità dello shopping online
            direttamente a casa tua.
          </p>

          <Link
            href="/shop"
            className="group mt-9 inline-flex h-14 items-center gap-3 rounded-2xl bg-cyan-400 px-8 font-black text-[#05212a] shadow-[0_15px_60px_rgba(34,211,238,.2)] transition hover:-translate-y-1 hover:bg-cyan-300"
          >
            Inizia a fare acquisti
            <ArrowRight
              size={20}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          <div className="mt-7 text-xs text-slate-500">
            Pagamento alla consegna · Consegna locale · Promo · Punti fedeltà
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}
      <footer className="bg-[#041017] px-5 py-8 text-center sm:px-8">
        <Image
          src="/logo/mgshop-logo-neon.png"
          alt="MGShop"
          width={130}
          height={55}
          className="mx-auto mb-4 h-auto w-[110px] opacity-80"
        />

        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} MGShop · Tutto per la tua casa,
          consegnato a casa tua.
        </p>
      </footer>

    </main>
  );
}
