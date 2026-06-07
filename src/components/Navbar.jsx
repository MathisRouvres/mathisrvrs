import { useEffect, useState } from 'react'
import { navLinks, site } from '../data/site'
import ThemeToggle from './ThemeToggle'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-[var(--border-color)] bg-[var(--bg-primary)]/85 backdrop-blur-xl shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <nav
        className="container-site flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8"
        aria-label="Navigation principale"
      >
        <a
          href="#hero"
          className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
        >
          MR<span className="text-[var(--accent)]">.</span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--border-color)] md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="text-lg">{menuOpen ? '✕' : '☰'}</span>
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[var(--border-color)] bg-[var(--bg-primary)]/95 backdrop-blur-xl md:hidden"
        >
          <ul className="container-site flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="block rounded-lg px-3 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <span className="sr-only">{site.name}</span>
    </header>
  )
}
