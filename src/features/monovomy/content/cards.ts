import type { ActionCard } from './schema'

/**
 * Catalogue des cartes action MonoVomy (Étape 3).
 * Réparties par famille et par niveau (`levelMin`). `soft` = mini-gage
 * équivalent pour le mode sans alcool (voir GDD §6, §7).
 * L’intensité monte avec le niveau : facile → convivial, hardcore → trash.
 */
export const actionCards: ActionCard[] = [
  // ============ DÉFI ============
  { id: 'defi_mime_metier', family: 'defi', levelMin: 'facile', text: 'Mime ton métier, les autres devinent en 30 s. Sinon, bois.', baseSips: 2, soft: 'Mime ton métier en 30 s, sinon fais 10 pompes.' },
  { id: 'defi_accent', family: 'defi', levelMin: 'facile', text: 'Parle avec un accent étranger jusqu’à ton prochain tour, ou bois.', baseSips: 1, soft: 'Parle avec un accent jusqu’à ton prochain tour, ou imite un joueur.' },
  { id: 'defi_grimace', family: 'defi', levelMin: 'facile', text: 'Fais la grimace la plus moche possible pendant 10 s, ou bois.', baseSips: 1, soft: 'Fais la pire grimace 10 s, ou chante une note très longue.' },
  { id: 'defi_chanson_gestes', family: 'defi', levelMin: 'facile', text: 'Fais deviner une chanson uniquement en gestes, ou bois.', baseSips: 2, soft: 'Fais deviner une chanson en gestes, ou danse 10 s.' },
  { id: 'defi_karaoke', family: 'defi', levelMin: 'inter', text: 'Chante le refrain d’une chanson choisie par la table, ou bois.', baseSips: 2, soft: 'Chante le refrain choisi par la table, ou danse 15 s sans musique.' },
  { id: 'defi_blague', family: 'defi', levelMin: 'inter', text: 'Raconte une blague : si personne ne rit, bois.', baseSips: 2, soft: 'Raconte une blague : si personne ne rit, fais 10 pompes.' },
  { id: 'defi_equilibre', family: 'defi', levelMin: 'inter', text: 'Tiens en équilibre sur un pied pendant 20 s, ou bois.', baseSips: 2, soft: 'Tiens sur un pied 20 s, ou fais la planche 20 s.' },
  { id: 'defi_declaration', family: 'defi', levelMin: 'inter', text: 'Déclare ta flamme à ton verre en 3 phrases, ou bois.', baseSips: 2, soft: 'Déclare ta flamme à ton verre, ou à un joueur au hasard.' },
  { id: 'defi_cul_sec_chrono', family: 'defi', levelMin: 'difficile', text: 'Finis ton verre avant la fin du tour de table, ou double la sanction.', baseSips: 3, soft: 'Tiens la planche 30 s, ou double le mini-gage.' },
  { id: 'defi_texto_ex', family: 'defi', levelMin: 'difficile', text: 'Lis à voix haute ton dernier SMS reçu, ou bois 3 gorgées.', baseSips: 3, soft: 'Lis ton dernier SMS reçu, ou raconte ta pire honte.' },
  { id: 'defi_imitation_star', family: 'defi', levelMin: 'difficile', text: 'Imite une célébrité, la table devine, sinon cul sec.', baseSips: 3, soft: 'Imite une célébrité, sinon fais 20 pompes.' },
  { id: 'defi_shot_surprise', family: 'defi', levelMin: 'hardcore', text: 'Enchaîne un shot choisi par la table.', baseSips: 4, soft: 'Fais un gage choisi par la table.' },
  { id: 'defi_verre_inconnu', family: 'defi', levelMin: 'hardcore', text: 'Bois un mélange préparé par ton voisin (raisonnable).', baseSips: 4, soft: 'Bois un soft mélangé par ton voisin.' },

  // ============ CHANCE À BOIRE ============
  { id: 'chance_gauche_choisit', family: 'chance', levelMin: 'facile', text: 'Le joueur à ta gauche choisit qui descend son verre.', baseSips: 2, soft: 'Le joueur à ta gauche choisit qui fait un mini-gage.' },
  { id: 'chance_tous_boivent', family: 'chance', levelMin: 'facile', text: 'Tournée générale : tout le monde boit une gorgée.', baseSips: 1, soft: 'Tout le monde fait un mini-gage.' },
  { id: 'chance_anniv', family: 'chance', levelMin: 'facile', text: 'Celui dont l’anniversaire est le plus proche boit.', baseSips: 1 },
  { id: 'chance_sortie_cuve', family: 'chance', levelMin: 'facile', text: 'Carte « sortie de cuve » : garde-la, elle te libère de la prison sans payer.', baseSips: 0, effect: 'jail_free' },
  { id: 'chance_distribue_trois', family: 'chance', levelMin: 'inter', text: 'Distribue 3 gorgées comme tu veux.', baseSips: 3, soft: 'Distribue 3 mini-gages comme tu veux.' },
  { id: 'chance_moins_riche', family: 'chance', levelMin: 'inter', text: 'Le joueur le moins riche choisit une victime qui boit 2 gorgées.', baseSips: 2 },
  { id: 'chance_couleur', family: 'chance', levelMin: 'inter', text: 'Tous ceux qui portent du noir boivent.', baseSips: 2 },
  { id: 'chance_telephone', family: 'chance', levelMin: 'inter', text: 'Le dernier à poser son téléphone sur la table boit.', baseSips: 2 },
  { id: 'chance_distribue_cinq', family: 'chance', levelMin: 'difficile', text: 'Distribue 5 gorgées comme tu veux.', baseSips: 5, soft: 'Distribue 5 mini-gages comme tu veux.' },
  { id: 'chance_double_peine', family: 'chance', levelMin: 'difficile', text: 'Toi et le joueur de ton choix : cul sec.', baseSips: 3, soft: 'Toi et un joueur : mini-gage chacun.' },
  { id: 'chance_roi_boit', family: 'chance', levelMin: 'hardcore', text: 'Le meneur au score fait boire qui il veut : cul sec.', baseSips: 4 },
  { id: 'chance_chaine', family: 'chance', levelMin: 'hardcore', text: 'Chaîne : chacun désigne le suivant qui boit, 4 fois de suite.', baseSips: 4 },

  // ============ GAGE ============
  { id: 'gage_compliment', family: 'gage', levelMin: 'facile', text: 'Fais un compliment sincère à chaque joueur, ou bois.', baseSips: 2, soft: 'Fais un compliment à chaque joueur, ou fais 10 pompes.' },
  { id: 'gage_statue', family: 'gage', levelMin: 'facile', text: 'Reste immobile comme une statue jusqu’à ton prochain tour, ou bois.', baseSips: 1, soft: 'Reste immobile jusqu’à ton prochain tour, ou parle en chuchotant.' },
  { id: 'gage_silence', family: 'gage', levelMin: 'facile', text: 'Ne dis plus un mot jusqu’à ton prochain tour, ou bois.', baseSips: 1, soft: 'Garde le silence jusqu’à ton prochain tour, ou fais 5 pompes.' },
  { id: 'gage_bebe', family: 'gage', levelMin: 'facile', text: 'Parle comme un bébé pendant un tour complet, ou bois.', baseSips: 1, soft: 'Parle comme un bébé un tour, ou imite un animal.' },
  { id: 'gage_selfie', family: 'gage', levelMin: 'inter', text: 'Prends le selfie le plus ridicule possible, ou bois.', baseSips: 2, soft: 'Prends le selfie le plus ridicule, ou imite un animal 20 s.' },
  { id: 'gage_toast', family: 'gage', levelMin: 'inter', text: 'Fais un toast improvisé de 15 s à la soirée, ou bois.', baseSips: 2, soft: 'Fais un toast de 15 s, ou danse 15 s.' },
  { id: 'gage_serveur', family: 'gage', levelMin: 'inter', text: 'Tu sers les boissons de tout le monde jusqu’à ton prochain tour, ou bois.', baseSips: 2, soft: 'Sers tout le monde jusqu’à ton prochain tour, ou fais 10 pompes.' },
  { id: 'gage_confession', family: 'gage', levelMin: 'difficile', text: 'Avoue une honte devant la table, ou cul sec.', baseSips: 3, soft: 'Avoue une honte, ou fais 20 pompes.' },
  { id: 'gage_texto', family: 'gage', levelMin: 'difficile', text: 'Envoie « Je pense à toi » au 5e contact de ton téléphone, ou cul sec.', baseSips: 3, soft: 'Raconte ton pire rencard, ou double le mini-gage.' },
  { id: 'gage_appel', family: 'gage', levelMin: 'difficile', text: 'Appelle un contact au hasard et dis simplement bonjour, ou bois 3.', baseSips: 3, soft: 'Envoie un vocal ridicule au groupe, ou bois 3.' },
  { id: 'gage_message_ex', family: 'gage', levelMin: 'hardcore', text: 'Écris (sans envoyer) un message à ton ex et lis-le, ou shot.', baseSips: 4, soft: 'Raconte ta pire rupture, ou mini-gage double.' },
  { id: 'gage_vetement', family: 'gage', levelMin: 'hardcore', text: 'Retire un vêtement (dans la décence), ou shot.', baseSips: 4, soft: 'Mets un vêtement à l’envers jusqu’à la fin, ou mini-gage double.' },

  // ============ RÈGLE (persistante) ============
  { id: 'regle_interdit_je', family: 'regle', levelMin: 'facile', text: 'Interdit de dire « je » : 1 gorgée à chaque oubli, jusqu’à la fin.', baseSips: 1, persistent: true, soft: 'Interdit de dire « je » : 1 mini-gage à chaque oubli.' },
  { id: 'regle_merci', family: 'regle', levelMin: 'facile', text: 'Dis « merci » après chaque gorgée, sinon +1 gorgée.', baseSips: 1, persistent: true, soft: 'Dis « merci » après chaque action, sinon mini-gage.' },
  { id: 'regle_surnom', family: 'regle', levelMin: 'facile', text: 'Un surnom unique pour toute la table : l’oublier coûte 1 gorgée.', baseSips: 1, persistent: true },
  { id: 'regle_telephone', family: 'regle', levelMin: 'inter', text: 'Toucher son téléphone coûte 1 gorgée, jusqu’à la fin.', baseSips: 1, persistent: true },
  { id: 'regle_main_gauche', family: 'regle', levelMin: 'inter', text: 'Bois uniquement de la main gauche : 1 gorgée par oubli.', baseSips: 1, persistent: true },
  { id: 'regle_chef', family: 'regle', levelMin: 'inter', text: 'Désigne un chef : tout ce qu’il fait doit être imité, sinon 1 gorgée.', baseSips: 1, persistent: true },
  { id: 'regle_pas_de_prenom', family: 'regle', levelMin: 'difficile', text: 'Interdit d’appeler les autres par leur prénom : 2 gorgées par oubli.', baseSips: 2, persistent: true },
  { id: 'regle_jurons', family: 'regle', levelMin: 'difficile', text: 'Chaque juron coûte 2 gorgées, jusqu’à la fin.', baseSips: 2, persistent: true },
  { id: 'regle_index', family: 'regle', levelMin: 'difficile', text: 'Montrer quelqu’un du doigt coûte 2 gorgées.', baseSips: 2, persistent: true },
  { id: 'regle_verre_plein', family: 'regle', levelMin: 'hardcore', text: 'Ton verre ne doit jamais être vide, sous peine de 3 gorgées.', baseSips: 3, persistent: true },

  // ============ DUEL ============
  { id: 'duel_pfc', family: 'duel', levelMin: 'facile', text: 'Pierre-feuille-ciseaux contre le joueur à ta droite : le perdant boit.', baseSips: 2, soft: 'Pierre-feuille-ciseaux : le perdant fait un mini-gage.' },
  { id: 'duel_ni_oui_ni_non', family: 'duel', levelMin: 'facile', text: 'Duel : le premier qui dit « oui » ou « non » boit.', baseSips: 1, soft: 'Duel « ni oui ni non » : le perdant fait un mini-gage.' },
  { id: 'duel_regard', family: 'duel', levelMin: 'inter', text: 'Concours de regard : le premier qui cligne ou rit boit.', baseSips: 2 },
  { id: 'duel_categorie', family: 'duel', levelMin: 'inter', text: 'À tour de rôle, citez une boisson : le premier bloqué boit.', baseSips: 2 },
  { id: 'duel_grimace', family: 'duel', levelMin: 'inter', text: 'Concours de grimace : la table vote, le perdant boit.', baseSips: 2 },
  { id: 'duel_bras_de_fer', family: 'duel', levelMin: 'difficile', text: 'Bras de fer contre le joueur de ton choix : le perdant cul sec.', baseSips: 3, soft: 'Bras de fer : le perdant fait un mini-gage.' },
  { id: 'duel_apnee', family: 'duel', levelMin: 'difficile', text: 'Retenez votre souffle : le premier à respirer boit.', baseSips: 3 },
  { id: 'duel_shot', family: 'duel', levelMin: 'hardcore', text: 'Duel de shot avec un joueur : le plus lent en enchaîne un second.', baseSips: 4, soft: 'Duel de gainage : le plus lent fait un mini-gage.' },
  { id: 'duel_cul_sec_race', family: 'duel', levelMin: 'hardcore', text: 'Course de cul sec : le dernier réattaque un verre.', baseSips: 4, soft: 'Course de mini-gages : le dernier en refait un.' },

  // ============ AMBIANCE — RÈGLES TEMPORAIRES (Phase 8) ============
  { id: 'regle_accent_pack', family: 'regle', levelMin: 'facile', text: 'Accent obligatoire pour tout le monde jusqu’au prochain tour de table.', baseSips: 1, persistent: true, intensity: 'party', ruleId: 'rule_accent', tags: ['ambience'], soft: 'À chaque oubli d’accent, un mini-gage.' },
  { id: 'regle_mot_interdit_pack', family: 'regle', levelMin: 'facile', text: 'Mot interdit : « boire ». Qui le dit prend une gorgée.', baseSips: 1, persistent: true, intensity: 'party', ruleId: 'rule_mot_interdit', tags: ['ambience'], soft: 'Qui dit le mot interdit fait une pompe.' },
  { id: 'regle_chuchote_pack', family: 'regle', levelMin: 'inter', text: 'Chuchotements imposés pendant 2 minutes.', baseSips: 1, persistent: true, intensity: 'party', ruleId: 'rule_chuchote', tags: ['ambience'], soft: 'Qui parle fort fait une imitation.' },
  { id: 'regle_loyers_pack', family: 'regle', levelMin: 'inter', text: 'Loyers doublés sur le groupe rouge pendant 4 tours.', baseSips: 2, persistent: true, intensity: 'chaos', ruleId: 'rule_loyers_doubles', tags: ['ambience'], soft: 'Loyers doublés : sanction convertie en mini-gage.' },
  { id: 'regle_encheres_pack', family: 'regle', levelMin: 'difficile', text: 'Enchères obligatoires sur les propriétés non achetées.', baseSips: 2, persistent: true, intensity: 'chaos', ruleId: 'rule_encheres', tags: ['ambience'], soft: 'Perdant des enchères : mini-gage.' },
  { id: 'regle_inversion_pack', family: 'regle', levelMin: 'difficile', text: 'Déplacements inversés ce tour de table.', baseSips: 1, persistent: true, intensity: 'chaos', ruleId: 'rule_deplacements_inverses', tags: ['ambience'], soft: 'Sens inversé : ambiance seule, pas de sanction.' },
  { id: 'regle_prix_casses_pack', family: 'regle', levelMin: 'inter', text: 'Prix cassés : achats −20 % pendant 3 minutes.', baseSips: 0, persistent: true, intensity: 'chaos', ruleId: 'rule_prix_reduits', tags: ['ambience'], soft: 'Prix cassés : pure opportunité, aucune sanction.' },
  { id: 'regle_bonus_dernier_pack', family: 'regle', levelMin: 'facile', text: 'Bonus au dernier : le plus pauvre touche +100 € au Départ.', baseSips: 0, persistent: true, intensity: 'finale', ruleId: 'rule_bonus_dernier', tags: ['catchup', 'ambience'], soft: 'Rattrapage économique, aucune sanction.' },

  // ============ RATTRAPAGE (Phase 8) ============
  { id: 'chance_rattrapage', family: 'chance', levelMin: 'facile', text: 'Rattrapage : le joueur le moins riche récupère 200 € de la banque.', baseSips: 0, intensity: 'chaos', tags: ['catchup'] },
  { id: 'chance_rattrapage_finale', family: 'chance', levelMin: 'inter', text: 'Finale : les deux joueurs les plus pauvres touchent 300 €.', baseSips: 0, intensity: 'finale', tags: ['catchup', 'finale'] },

  // ============ COLLECTIVES (Phase 8) ============
  { id: 'chance_collective_vague', family: 'chance', levelMin: 'facile', text: 'Vague : chacun boit une gorgée, en commençant par le meneur au score.', baseSips: 1, intensity: 'party', tags: ['collective'], soft: 'Vague de mini-gages en commençant par le meneur.' },
  { id: 'chance_collective_categorie', family: 'chance', levelMin: 'inter', text: 'Thème collectif : chacun cite un cocktail, le premier bloqué boit.', baseSips: 2, intensity: 'party', tags: ['collective'], soft: 'Le premier bloqué fait un mini-gage.' },

  // ============ FINALE (Phase 8) ============
  { id: 'defi_finale_showdown', family: 'defi', levelMin: 'inter', text: 'Finale : les deux meneurs s’affrontent en duel, le perdant descend son verre.', baseSips: 3, intensity: 'finale', tags: ['finale'], soft: 'Duel des meneurs : le perdant fait un gage marquant.' },
  { id: 'chance_finale_couronne', family: 'chance', levelMin: 'facile', text: 'Couronnement anticipé : le meneur distribue 4 gorgées.', baseSips: 2, intensity: 'finale', tags: ['finale'], soft: 'Le meneur distribue 4 mini-gages.' },
]

export function getCardById(id: string): ActionCard | undefined {
  return actionCards.find((card) => card.id === id)
}

export function cardsByFamily(family: ActionCard['family']): ActionCard[] {
  return actionCards.filter((card) => card.family === family)
}
