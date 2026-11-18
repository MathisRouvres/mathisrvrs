---
name: planning-maison
description: Lire la photo ou capture d'un planning de travail (ex. celui d'Isis) et produire le texte d'import des horaires pour maison.mathis-rvrs.fr (écran « 💼 Horaires » → « Importer un planning »). Utiliser quand l'utilisateur envoie une image de planning, ou demande « lis le planning de … ».
---

# Lire un planning de travail pour l'app Maison

L'utilisateur envoie une image (photo, capture, PDF) d'un planning. Le but : un bloc de texte qu'il
colle dans l'app (`💼 Horaires` → `Importer un planning`, personne choisie). L'app le relit avec
`parsePlanning` (`src/features/maison/schedule.ts`) et montre un aperçu avant d'enregistrer.

## Étapes

1. Identifier la personne (prénom donné par l'utilisateur, sinon celui écrit sur le planning ; si
   le planning a plusieurs lignes de personnes, ne garder que la sienne). En cas de doute, demander.
2. Repérer les dates réelles de chaque colonne / ligne : en-têtes de jours, numéro de semaine,
   mois, année. Sans année visible, prendre l'année la plus proche d'aujourd'hui. Un planning par
   numéro de semaine (« S47 ») : calculer les dates du lundi au dimanche de cette semaine ISO.
3. Lire les horaires de chaque jour, y compris les journées coupées (deux créneaux) et les horaires
   de nuit (fin avant le début = fin le lendemain). Les codes (« M », « S », « N », « RH », « CA »)
   ne se devinent pas : utiliser la légende du planning, sinon demander leur correspondance.
4. Écrire **une ligne par jour, tous les jours de la période** (les jours non travaillés en
   « repos » : l'import ne touche qu'aux jours présents dans le texte).
5. Une case illisible : ne pas inventer. Mettre la ligne en commentaire (`# 21/11 ? illisible`)
   et le signaler sous le bloc.

## Format attendu (un bloc de code, rien d'autre dedans)

```
# Isis — semaine du 16 au 22 novembre 2026
2026-11-16 08:00-16:30
2026-11-17 08:00-12:00 14:00-18:00
2026-11-18 repos
2026-11-19 21:00-06:00
2026-11-20 repos
2026-11-21 07:00-13:00
2026-11-22 repos
```

- Dates en `AAAA-MM-JJ` (aucune ambiguïté d'année), heures en `HH:MM`, créneaux séparés par un espace.
- Lignes `#` : commentaires ignorés par l'app.
- Plusieurs semaines : continuer à la suite, une ligne par jour (63 jours consécutifs au plus par
  série ; au-delà, l'app découpe toute seule).

Après le bloc : un résumé d'une ou deux lignes (période, nombre de jours travaillés, points
douteux). Rappeler où coller le texte. Ne rien enregistrer soi-même dans la base.
