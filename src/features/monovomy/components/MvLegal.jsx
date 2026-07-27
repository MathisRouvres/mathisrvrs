export default function MvLegal() {
  return (
    <div className="mv-doc">
      <p><strong>Éditeur :</strong> MonoVomy — projet personnel. (À compléter : nom, contact, hébergeur.)</p>
      <p><strong>Public :</strong> réservé aux personnes de 18 ans ou plus. Jeu à boire — l’abus d’alcool est dangereux pour la santé, à consommer avec modération. Un mode sans alcool est proposé.</p>
      <p><strong>Données personnelles (RGPD) :</strong> en mode local, aucune donnée n’est transmise — tout reste sur ton appareil. En mode en ligne, ton pseudo et l’état de la partie transitent en temps réel via Supabase Realtime (diffusion éphémère, non conservée durablement). Aucun compte, aucun traceur publicitaire.</p>
      <p><strong>Cookies / stockage local :</strong> seules des préférences (confirmation +18, son, onboarding) sont stockées localement dans ton navigateur.</p>
      <p className="mv-doc__warn">Ce texte est un modèle de départ, à faire valider juridiquement avant une mise en ligne publique.</p>
    </div>
  )
}
