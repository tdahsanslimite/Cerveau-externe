# Cerveau Externe

Application mobile pour les TDAH, faite par un TDAH. Android d'abord, iOS ensuite.
Construite avec Expo (React Native + TypeScript) : un seul code pour Android, iOS et le web.

## État actuel : module Calendrier (v0.1)

- Vues **Jour**, **Semaine**, **Mois**, navigation ‹ › et retour à aujourd'hui.
- Ajout / modification / suppression d'événements : intitulé, jour, heure (ou journée entière), durée, domaine (Travail, Famille, Santé, Sport, Perso), répétition (une fois, chaque semaine, lun–ven, chaque jour), note.
- Suppression d'un seul jour d'une série, ou de toute la série.
- **Charge du jour** comparée à la limite choisie par l'utilisateur ; alerte douce dans la fiche si on dépasse.
- **Créneaux libres** affichés entre les rendez-vous (8 h – 21 h).
- Vue Semaine en cartes qui s'agrandissent (fini les cases A6 trop petites) + **page libre de la semaine**.
- **Réglages** : limite par jour, vue à l'ouverture, créneaux libres.
- Données stockées sur le téléphone uniquement.

## Prochains modules

1. Tâches (priorité Eisenhower, glissement au lendemain, comptées dans la charge du jour)
2. Routines (cochables partout, recopiées chaque mois, bilan caché)
3. Check-in du soir + rappels variés (notifications natives)

## Organisation du code

```
App.tsx                         polices, fournisseurs de données
src/theme.ts                    couleurs, polices, tailles
src/ui.tsx                      boutons, puces, feuilles, champs partagés
src/storage.ts                  sauvegarde locale
src/settings/                   réglages + écran Réglages
src/calendar/dates.ts           calculs de dates (testés)
src/calendar/model.ts           événements, répétitions, charge, créneaux libres (testés)
src/calendar/CalendarContext    données du calendrier
src/calendar/views.tsx          vues Jour / Semaine / Mois
src/calendar/EventEditor.tsx    fiche d'événement
src/calendar/CalendarScreen.tsx écran principal
```

## Commandes

```bash
npm install
npm run typecheck   # vérification des types
npm test            # tests des dates et de la logique
npx expo start      # lancer sur le téléphone avec l'appli Expo Go
npx expo export --platform web   # version web
```

Note : la navigation est volontairement gérée à la main pour l'instant (un seul écran).
Quand les modules Tâches et Routines arriveront, on passera à Expo Router avec une barre d'onglets.
