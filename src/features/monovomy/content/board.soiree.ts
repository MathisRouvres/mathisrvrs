import { classicSquareMap } from './maps/classicSquare'

/**
 * @deprecated Le thème « Soirée » est devenu la map `classic_square`.
 * Conservé comme alias pour ne casser aucun import existant : les données
 * (identifiants, ordre, prix, loyers) sont strictement les mêmes.
 * Nouveau code : utiliser `getBoardMap(mapId)` depuis `content/maps`.
 */
export const soireeBoard = classicSquareMap

export { CLASSIC_SQUARE_TILES } from './maps/classicSquare'
