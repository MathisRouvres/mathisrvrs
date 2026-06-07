/** Endpoint du formulaire de contact — surcharge via VITE_CONTACT_ENDPOINT */
export const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT ?? '/contact.php'

export const CONTACT_LIMITS = {
  nameMax: 100,
  emailMax: 150,
  companyMax: 100,
  messageMin: 10,
  messageMax: 3000,
}
