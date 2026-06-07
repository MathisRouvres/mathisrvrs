/**
 * Timeline — parcours pro & perso
 *
 * Pour ajouter ou modifier une étape :
 * - duplique un objet ci-dessous ;
 * - renseigne title, period, description, tags, type, mood ;
 * - mets highlight: true pour une mise en avant visuelle ;
 * - ajoute responsibilities[] pour une liste de points (optionnel).
 */
export const timeline = [
  {
    id: 'web-beginnings',
    period: 'Débuts',
    title: 'Débuts dans le développement web',
    description:
      'Découverte du développement web, création de premières interfaces, apprentissage des bases frontend et backend, avec une volonté constante de comprendre comment construire des outils utiles de A à Z.',
    tags: ['HTML', 'CSS', 'JavaScript', 'PHP', 'MySQL'],
    type: 'learning',
    mood: 'Curiosité · Apprentissage · Premiers projets',
    highlight: false,
    icon: '🌱',
  },
  {
    id: 'fullstack-growth',
    period: 'Progression',
    title: 'Montée en compétences full-stack',
    description:
      'Progression sur des projets plus complets, avec gestion de logique métier, formulaires, bases de données, interfaces dynamiques, backoffice et automatisations. Développement d’une approche plus structurée, orientée produit et maintenabilité.',
    tags: ['PHP', 'MySQL', 'JavaScript', 'React', 'UX/UI'],
    type: 'skill',
    mood: 'Structuration · Autonomie · Logique métier',
    highlight: false,
    icon: '⚙️',
  },
  {
    id: 'poker-tracker',
    period: 'Projet personnel',
    title: 'Projet personnel — Tracker de poker',
    description:
      'Création d’un projet de tracker de poker pensé pour analyser les sessions, suivre les performances, organiser les données de jeu et identifier des tendances. L’objectif est de transformer des données brutes en informations utiles, lisibles et exploitables.',
    tags: ['Poker', 'Data', 'Dashboard', 'Analytics', 'Product Thinking'],
    type: 'project',
    mood: 'Passion · Data · Analyse · Produit',
    highlight: true,
    highlightLabel: 'Projet phare',
    icon: '♠️',
  },
  {
    id: 'ai-automation',
    period: 'Optimisation',
    title: 'Automatisation IA & productivité',
    description:
      'Utilisation intensive de l’IA pour accélérer le développement, structurer les projets, améliorer l’UX/UI, générer des workflows Cursor, automatiser des tâches répétitives et construire des systèmes plus rapides à maintenir.',
    tags: ['Cursor', 'IA', 'Automation', 'Workflow', 'Prompt Engineering'],
    type: 'ai',
    mood: 'Productivité · Optimisation · IA',
    highlight: false,
    icon: '🤖',
  },
  {
    id: 'saas-modules',
    period: 'Product builder',
    title: 'SaaS, modules & expériences produit',
    description:
      'Conception d’idées de SaaS modulaires, avec logique d’abonnement, activation de fonctionnalités à la demande, interfaces simples pour utilisateurs non techniques, et approche centrée sur la valeur produit.',
    tags: ['SaaS', 'Modules', 'Laravel', 'React', 'UX/UI', 'Stripe'],
    type: 'saas',
    mood: 'Product builder · Business · Expérience utilisateur',
    highlight: false,
    icon: '🚀',
  },
  {
    id: 'myagency',
    period: 'Aujourd’hui',
    title: 'MYAgency — Développement & responsabilités',
    description:
      'Chez MYAgency, je travaille sur des outils internes et des interfaces backoffice. Je participe à l’amélioration de l’extranet, de l’expérience utilisateur, de la sécurité, de l’organisation des outils, des workflows internes et de la qualité globale des interfaces utilisées au quotidien.',
    tags: ['Backoffice', 'Extranet', 'Sécurité', 'UX/UI', 'ERP', 'Organisation'],
    type: 'work',
    mood: 'Responsabilité · Autonomie · Impact concret',
    highlight: true,
    highlightLabel: 'Rôle actuel',
    icon: '🏢',
    responsibilities: [
      'Amélioration et maintenance du backoffice',
      'Extranet et interfaces internes',
      'Sécurité du backoffice',
      'Amélioration UX/UI',
      'Organisation via outils de suivi (Trello)',
      'Analytics et suivi d’utilisation',
      'Automatisations et optimisations internes',
      'Correction de bugs et évolution de fonctionnalités',
      'Meilleure structuration des workflows',
    ],
  },
  {
    id: 'vision',
    period: 'Vision',
    title: 'Aujourd’hui — Builder de produits utiles',
    description:
      'Aujourd’hui, je cherche à créer des produits web modernes, propres et efficaces, mêlant développement, UX/UI, automatisation, IA et vision produit. Mon objectif est de construire des outils qui font gagner du temps, simplifient les usages et apportent une vraie valeur.',
    tags: ['Product Builder', 'React', 'Laravel', 'UX/UI', 'IA', 'SaaS'],
    type: 'vision',
    mood: 'Vision · Ambition · Construction',
    highlight: false,
    icon: '✨',
  },
]

export const timelineTypeLabels = {
  learning: 'Apprentissage',
  skill: 'Progression',
  project: 'Projet perso',
  ai: 'IA & auto',
  saas: 'SaaS',
  work: 'MYAgency',
  vision: 'Vision',
}
