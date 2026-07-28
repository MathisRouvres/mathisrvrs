/* global __APP_BUILD__ */

/**
 * Identifiant du build servi (empreinte de commit en CI, horodatage en local).
 * Affiché dans les réglages : c'est le seul moyen de savoir, depuis un téléphone,
 * si l'on regarde la dernière version ou une page ressortie du cache.
 */
export const APP_BUILD = typeof __APP_BUILD__ === 'string' ? __APP_BUILD__ : 'dev'
