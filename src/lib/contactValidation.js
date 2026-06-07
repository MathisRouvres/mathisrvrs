import { CONTACT_LIMITS } from '../config/contact'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContactForm({ name, email, message }) {
  const errors = {}

  const trimmedName = name.trim()
  if (!trimmedName) {
    errors.name = 'Le nom est obligatoire.'
  } else if (trimmedName.length > CONTACT_LIMITS.nameMax) {
    errors.name = `Le nom ne doit pas dépasser ${CONTACT_LIMITS.nameMax} caractères.`
  }

  const trimmedEmail = email.trim()
  if (!trimmedEmail) {
    errors.email = "L'email est obligatoire."
  } else if (trimmedEmail.length > CONTACT_LIMITS.emailMax) {
    errors.email = `L'email ne doit pas dépasser ${CONTACT_LIMITS.emailMax} caractères.`
  } else if (!EMAIL_RE.test(trimmedEmail)) {
    errors.email = 'Format email invalide.'
  }

  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    errors.message = 'Le message est obligatoire.'
  } else if (trimmedMessage.length < CONTACT_LIMITS.messageMin) {
    errors.message = `Le message doit contenir au moins ${CONTACT_LIMITS.messageMin} caractères.`
  } else if (trimmedMessage.length > CONTACT_LIMITS.messageMax) {
    errors.message = `Le message ne doit pas dépasser ${CONTACT_LIMITS.messageMax} caractères.`
  }

  return errors
}

export function hasValidationErrors(errors) {
  return Object.keys(errors).length > 0
}
