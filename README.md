# Cerveau Externe

Application mobile pour les TDAH, faite par un TDAH. Android d'abord, iOS ensuite.
Construite avec Expo (React Native + TypeScript) : un seul code pour Android, iOS et le web.

## Module Calendrier

- Vues **Jour**, **Semaine**, **Mois**, navigation ‹ › et retour à aujourd'hui.
- Ajout / modification / suppression d'événements : intitulé, jour, heure (ou journée entière), durée, domaine (Travail, Famille, Santé, Sport, Perso), répétition (une fois, chaque semaine, lun–ven, chaque jour), note.
- Suppression d'un seul jour d'une série, ou de toute la série.
- **Charge du jour** comparée à la limite choisie par l'utilisateur ; alerte douce dans la fiche si on dépasse.
- **Créneaux libres** affichés entre les rendez-vous (8 h – 21 h).
- Vue Semaine en cartes qui s'agrandissent (fini les cases A6 trop petites) + **page libre de la semaine**.
- **Réglages** : limite par jour, vue à l'ouverture, créneaux libres.
- Données stockées sur le téléphone uniquement.

## Module Tâches

- **Saisie rapide** : un champ toujours visible, tout ce qu'on écrit tombe dans **le sas**, sans aucune décision à prendre. On peut enchaîner les idées.
- **Le sas** : la salle d'attente. Ces tâches ne comptent dans aucune journée tant qu'elles ne sont pas triées.
- **Tri guidé** : une tâche à la fois, trois questions (important ? urgent ? pour quand ?), et la tâche est rangée.
- **Matrice d'Eisenhower** : À faire en premier / À planifier / À déléguer ou alléger / À lâcher ? (icônes et texte, pas seulement des couleurs, pour ne pas se confondre avec les domaines).
- **Aujourd'hui** : les tâches prévues, cochables, avec la charge du jour.
- **Glissement** : une tâche non faite d'un jour passé glisse à aujourd'hui, sans reproche. Après 3 glissements, l'appli propose de la découper, de lui donner une heure ou de la lâcher.
- **Lâcher** : une tâche lâchée disparaît partout mais reste en mémoire (pour un futur bilan).
- Les tâches prévues apparaissent dans les vues **Jour** et **Semaine** du calendrier et **comptent dans la charge du jour** (nombre d'éléments : événements + tâches).
- Barre d'onglets en bas : Calendrier / Tâches / Routines (badge avec le nombre de tâches dans le sas).

## Module Routines

- Onglet **Routines** : le jour choisi (bande de la semaine pour revenir sur un jour passé), les routines à cocher, groupées Matin / Journée / Soir.
- Les mêmes cases à cocher sont aussi en bas de la vue **Jour** du calendrier (« cochables partout »).
- Chaque routine a ses jours de la semaine (tous les jours, lun–ven, lun/mer/ven…). Elle revient **toute seule chaque mois** : rien à recopier.
- On ne coche pas à l'avance ; on peut compléter un jour passé.
- **Retirer** une routine la fait disparaître des listes à partir d'aujourd'hui, mais son passé reste dans le bilan.
- **Bilan caché** derrière « Voir mon bilan » : jamais affiché tout seul, ton indulgent (cases cochées, meilleure série, pas de série « perdue »). Aujourd'hui pas encore coché n'est pas compté comme un oubli.
- Les routines **ne comptent pas** dans la charge du jour (ce serait toujours « trop chargé »).
- Données dans la clé locale `ce.routines.v1`.

## Prochains modules

1. Check-in du soir + rappels variés (notifications natives)

## Organisation du code

```
App.tsx                         polices, fournisseurs de données
src/AppTabs.tsx                 barre d'onglets (un module = une ligne dans TABS)
src/load.ts                     charge d'un jour = événements + tâches prévues
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
src/tasks/model.ts              tâches, sas, Eisenhower, glissement, charge (testés)
src/tasks/TasksContext.tsx      données des tâches (ce.tasks.v1)
src/tasks/TasksScreen.tsx       saisie rapide, Aujourd'hui, Sas, Matrice
src/tasks/SortSheet.tsx         tri guidé du sas
src/tasks/TaskEditor.tsx        fiche d'une tâche
src/tasks/DayTasks.tsx          tâches du jour dans le calendrier
src/routines/model.ts           routines, jours prévus, cases cochées, bilan du mois (testés)
src/routines/RoutinesContext    données des routines (ce.routines.v1)
src/routines/RoutinesScreen.tsx écran Routines
src/routines/components.tsx     liste cochable (partagée avec la vue Jour)
src/routines/RoutineEditor.tsx  fiche d'une routine
src/routines/BilanSheet.tsx     bilan du mois, à la demande
```

## Commandes

```bash
npm install
npm run typecheck   # vérification des types
npm test            # tests des dates et de la logique
npx expo start      # lancer sur le téléphone avec l'appli Expo Go
npx expo export --platform web   # version web
```

Note : la navigation est gérée à la main (barre d'onglets simple dans `src/AppTabs.tsx`, sans nouvelle dépendance).
Le passage à Expo Router reste à faire, à un moment où l'on peut tester une vraie fabrication de l'appli.
