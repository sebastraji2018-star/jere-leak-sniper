'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Panel' },
  { href: '/leaks', label: 'Filtraciones' },
  { href: '/keywords', label: 'Keywords' },
  { href: '/settings', label: 'Ajustes' },
]

export default function NavLinks() {
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-1.5 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? 'text-[#F5C518] bg-[#F5C518]/8 font-medium'
                : 'text-gray-400 hover:text-[#F5C518] hover:bg-[#F5C518]/5'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </div>
  )
}
