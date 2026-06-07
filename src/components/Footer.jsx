import { navLinks, site } from '../data/site'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-12">
      <div className="container-site px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="font-display text-lg font-bold text-[var(--text-primary)]">
              {site.name}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {site.domain} · Développeur web &amp; product builder
            </p>
          </div>

          <ul className="flex flex-wrap justify-center gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center text-xs text-[var(--text-muted)]">
          © {year} {site.name}. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
