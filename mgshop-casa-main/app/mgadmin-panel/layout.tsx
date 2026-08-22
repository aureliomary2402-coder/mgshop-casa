import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MGShop Admin',
  manifest: '/manifest-admin.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MGShop Admin',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
