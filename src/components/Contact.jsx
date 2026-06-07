import { useEffect, useRef, useState } from 'react'
import { site } from '../data/site'
import { useInView } from '../hooks/useInView'
import AnimatedSection from './AnimatedSection'
import Button from './Button'
import { CONTACT_ENDPOINT, CONTACT_LIMITS } from '../config/contact'
import { hasValidationErrors, validateContactForm } from '../lib/contactValidation'

const INITIAL_FORM = {
  name: '',
  email: '',
  company: '',
  message: '',
  website: '',
}

const inputClass =
  'w-full rounded-xl border bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] transition-colors focus:outline-none'
const inputValidClass = 'border-[var(--border-color)] focus:border-[var(--accent)]'
const inputInvalidClass = 'border-red-400 focus:border-red-500 dark:border-red-500/70'

export default function Contact() {
  const [ref, inView] = useInView()
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [status, setStatus] = useState('idle')
  const [feedback, setFeedback] = useState('')
  const formStartedAt = useRef(0)

  useEffect(() => {
    formStartedAt.current = Date.now()
  }, [])

  const updateField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
    if (status !== 'idle') {
      setStatus('idle')
      setFeedback('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = validateContactForm(form)
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors)
      setStatus('error')
      setFeedback('Vérifiez les champs du formulaire.')
      return
    }

    setFieldErrors({})
    setStatus('loading')
    setFeedback('')

    try {
      const response = await fetch(CONTACT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          message: form.message.trim(),
          website: form.website,
          formStartedAt: formStartedAt.current,
        }),
      })

      let data = null
      const contentType = response.headers.get('content-type') ?? ''
      let isNonJsonResponse = false
      try {
        if (!contentType.includes('application/json')) {
          isNonJsonResponse = true
        } else {
          data = await response.json()
        }
      } catch {
        data = null
      }

      if (isNonJsonResponse) {
        throw new Error(
          'Le service contact n\'est pas disponible sur ce serveur. Vérifiez que contact.php est déployé sur OVH.',
        )
      }

      if (!response.ok || !data?.success) {
        const message =
          data?.message ||
          (response.status === 404
            ? 'Service contact indisponible en local. Déployez sur OVH ou lancez un serveur PHP.'
            : 'Une erreur est survenue. Réessayez plus tard.')
        throw new Error(message)
      }

      setStatus('success')
      setFeedback('Merci pour votre message. Je reviendrai vers vous rapidement concernant cette opportunité.')
      setForm(INITIAL_FORM)
      formStartedAt.current = Date.now()
    } catch (err) {
      setStatus('error')
      setFeedback(
        err instanceof Error
          ? err.message
          : 'Impossible d\'envoyer le message. Vérifiez votre connexion.',
      )
    }
  }

  const isLoading = status === 'loading'

  return (
    <AnimatedSection id="contact" inView={inView} className="section-padding">
      <div ref={ref} className="container-site">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-[var(--accent)]">
              Recrutement
            </span>
            <h2 id="contact-heading" className="mt-3 font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
              Une opportunité à me proposer ?
            </h2>
            <p className="mt-4 text-[var(--text-secondary)]">
              Recruteur, RH ou manager : vous cherchez un développeur web full-stack orienté produit ?
              Présentez-moi le poste, l&apos;équipe et le contexte — je vous réponds rapidement.
            </p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              CDI, alternance, stage ou mission longue · React, Laravel, UX/UI, SaaS
            </p>
          </div>

          <div
            className="mt-12 glass-card rounded-2xl p-8 transition-all duration-300 sm:p-10"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            {(status === 'success' || status === 'error') && feedback && (
              <div
                role="alert"
                aria-live="polite"
                className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
                  status === 'success'
                    ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300'
                    : 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                }`}
              >
                {feedback}
              </div>
            )}

            <form className="relative space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={updateField('website')}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Nom complet
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={CONTACT_LIMITS.nameMax}
                    value={form.name}
                    onChange={updateField('name')}
                    disabled={isLoading}
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    className={`${inputClass} ${fieldErrors.name ? inputInvalidClass : inputValidClass}`}
                    placeholder="Prénom Nom"
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                    Email professionnel
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={CONTACT_LIMITS.emailMax}
                    value={form.email}
                    onChange={updateField('email')}
                    disabled={isLoading}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    className={`${inputClass} ${fieldErrors.email ? inputInvalidClass : inputValidClass}`}
                    placeholder="vous@entreprise.com"
                  />
                  {fieldErrors.email && (
                    <p id="email-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="company" className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">
                  Entreprise{' '}
                  <span className="font-normal text-[var(--text-muted)]">(recommandé)</span>
                </label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  autoComplete="organization"
                  maxLength={CONTACT_LIMITS.companyMax}
                  value={form.company}
                  onChange={updateField('company')}
                  disabled={isLoading}
                  aria-invalid={Boolean(fieldErrors.company)}
                  aria-describedby={fieldErrors.company ? 'company-error' : undefined}
                  className={`${inputClass} ${fieldErrors.company ? inputInvalidClass : inputValidClass}`}
                  placeholder="Nom de votre entreprise"
                />
                {fieldErrors.company && (
                  <p id="company-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.company}
                  </p>
                )}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="message" className="text-sm font-medium text-[var(--text-primary)]">
                    Présentation du poste
                  </label>
                  <span className="text-xs text-[var(--text-muted)]" aria-live="polite">
                    {form.message.length}/{CONTACT_LIMITS.messageMax}
                  </span>
                </div>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  maxLength={CONTACT_LIMITS.messageMax}
                  value={form.message}
                  onChange={updateField('message')}
                  disabled={isLoading}
                  aria-invalid={Boolean(fieldErrors.message)}
                  aria-describedby={fieldErrors.message ? 'message-error' : undefined}
                  className={`${inputClass} resize-y ${fieldErrors.message ? inputInvalidClass : inputValidClass}`}
                  placeholder="Intitulé du poste, type de contrat, stack, équipe, localisation, télétravail, fourchette salariale si possible…"
                />
                {fieldErrors.message && (
                  <p id="message-error" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {fieldErrors.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                        aria-hidden="true"
                      />
                      Envoi en cours…
                    </>
                  ) : (
                    'Envoyer ma candidature'
                  )}
                </Button>
                <a
                  href="#parcours"
                  className="text-center text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] sm:text-left"
                >
                  Voir mon parcours →
                </a>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-[var(--border-color)] pt-8">
              <Button href={site.linkedin} variant="secondary" target="_blank" rel="noopener noreferrer">
                LinkedIn
              </Button>
              <Button href={site.github} variant="ghost" target="_blank" rel="noopener noreferrer">
                GitHub
              </Button>
              <Button href={`mailto:${site.email}`} variant="ghost">
                ✉️ {site.email}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AnimatedSection>
  )
}
