'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Share2, ArrowUpRight } from 'lucide-react'
import { SOCIAL_LINKS, WHATSAPP_NUMBER, InstagramIcon, TikTokIcon, WhatsAppIcon, FacebookIcon } from './social-icons'

const ITEMS = [
  { name: 'Instagram', sub: '@mgshopcasa', href: SOCIAL_LINKS.instagram, Icon: InstagramIcon, bg: 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)' },
  { name: 'TikTok', sub: '@mgshopcasa', href: SOCIAL_LINKS.tiktok, Icon: TikTokIcon, bg: '#0a0a0a' },
  { name: 'WhatsApp chat', sub: 'Scrivici · ' + WHATSAPP_NUMBER, href: SOCIAL_LINKS.whatsappChat, Icon: WhatsAppIcon, bg: '#25d366' },
  { name: 'Canale WhatsApp', sub: 'Promo in anteprima', href: SOCIAL_LINKS.whatsapp, Icon: WhatsAppIcon, bg: '#25d366' },
  { name: 'Facebook', sub: 'MGShop Casa', href: SOCIAL_LINKS.facebook, Icon: FacebookIcon, bg: '#1877F2' },
  { name: 'Facebook pagina', sub: 'Pagina ufficiale', href: SOCIAL_LINKS.facebookPage, Icon: FacebookIcon, bg: '#1877F2' },
]

type Pos = { top: number; left?: number; right: number; width?: number }

export function SocialMenu({ variant = 'light', className = 'flex' }: { variant?: 'light' | 'dark'; className?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', close) }
  }, [open])

  function toggle() {
    if (open) { setOpen(false); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    const w = window.innerWidth
    setPos(w < 640
      ? { top: r.bottom + 8, left: 12, right: 12 }
      : { top: r.bottom + 8, right: Math.max(12, w - r.right), width: 300 })
    setOpen(true)
  }

  const btnCls = variant === 'dark'
    ? `${className} h-11 w-11 items-center justify-center rounded-full bg-cyan-400 text-[#062029] shadow-[0_0_30px_rgba(34,211,238,.35)] transition hover:scale-105`
    : `${className} items-center gap-1.5 px-2 sm:px-3 py-2 rounded-xl text-sm font-medium transition-all btn-press`
  const btnStyle = variant === 'dark'
    ? undefined
    : { color: '#0e7490', background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(8,145,178,0.3)' }

  return (
    <>
      <button ref={btnRef} onClick={toggle} aria-label="Social" aria-expanded={open} className={btnCls} style={btnStyle}>
        <Share2 size={variant === 'dark' ? 20 : 16} />
        {variant === 'light' && <span className="hidden sm:inline">Social</span>}
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div className="fixed z-[61] rounded-2xl bg-white p-2 shadow-2xl border border-slate-100"
            style={{ top: pos.top, left: pos.left, right: pos.right, width: pos.width }}>
            {ITEMS.map(({ name, sub, href, Icon, bg }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50 active:bg-slate-100">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white" style={{ background: bg }}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-800">{name}</span>
                  <span className="block truncate text-xs text-slate-500">{sub}</span>
                </span>
              </a>
            ))}
            <Link href="/social" onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-black text-cyan-700 hover:bg-cyan-50">
              Vedi tutti i social <ArrowUpRight size={15} />
            </Link>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
