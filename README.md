# Cerveau Externe

Application mobile pour les TDAH, faite par un TDAH. Android d'abord, iOS ensuite.
Construite avec Expo (React Native + TypeScript) : un seul code pour Android, iOS et le web.

## Module Calendrier (v1.1)

- Vues **Jour**, **Semaine**, **Mois**, navigation ‹ › et retour à aujourd'hui.
- Ajout / modification / suppression d'événements : intitulé, jour, heure (ou journée entière), durée, domaine (Travail, Famille, Santé, Sport, Perso), répétition (une fois, chaque semaine, lun–ven, chaque jour), note.
- Suppression d'un seul jour d'une série, ou de toute la série.
- **Charge du jour** comparée à la limite choisie par l'utilisateur ; alerte douce dans la fiche si on dépasse.
- **Créneaux libres** affichés entre les rendez-vous (8 h – 21 h).
- Vue Semaine en cartes qui s'agrandissent (fini les cases A6 trop petites) + **page libre de la semaine**.
- **Réglages** : limite par jour, vue à l'ouverture, créneaux libres.
- Heure de début et de fin : un tap sur l'heure ouvre une roue heures / minutes.
- Chevauchements interdits, avec proposition du prochain créneau libre.
- Types combinables : Rendez-vous, Tâche (cochable, jour par jour pour une série), Objet à prendre (+ rappel la veille à 20 h).
- Jusqu'à 3 rappels par événement (minutes, heures, jours), notifications locales sur Android.
- Type d'alerte : Sonnerie, Carillon, Cloche (sons de l'appli, `assets/sounds`), Vibreur, Silencieux ; par défaut dans les Réglages, modifiable par événement. Un canal Android par type.
- Réglages › Rappels : bouton « Tester un rappel » (10 s) et état (autorisation, nombre programmé, prochain, dernier problème).
- Domaines personnalisables (nom, couleur, création, suppression) dans les Réglages.
- Données stockées sur le téléphone uniquement.

## Module Tâches

- **Saisie rapide** : un champ toujours visible, tout ce qu'on écrit tombe dans **le sas**, sans aucune décision à prendre. On peut enchaîner les idées.
- **Le sas** : la salle d'attente de la tête, c'est-à-dire tout ce qui n'a pas encore de priorité (important / urgent).
- **Tri guidé** : un élément à la fois, deux questions (important ? urgent ?), plus « pour quand ? » seulement s'il n'a pas déjà un créneau.
- **Matrice d'Eisenhower** : À faire en premier / À planifier / À déléguer ou alléger / À lâcher ? (icônes et texte, pas seulement des couleurs, pour ne pas se confondre avec les domaines).
- **Aujourd'hui** : les tâches prévues, cochables, avec la charge du jour ; celles qui ont une heure passent d'abord.
- **Retour au sas** : une tâche pas cochée un jour passé ne glisse pas au lendemain ; elle repasse par le sas (sans jour ni priorité) pour décider si elle vaut encore la peine. Pour un événement « Tâche », le créneau reste dans le calendrier et une tâche neuve part dans le sas. Après 3 retours, l'appli propose de la découper, de lui donner une heure ou de la lâcher.
- **Lâcher** : une tâche lâchée disparaît partout mais reste en mémoire (pour un futur bilan).
- Les tâches prévues apparaissent dans les vues **Jour** et **Semaine** du calendrier et **comptent dans la charge du jour** (nombre d'éléments : événements + tâches).
- **Une seule liste, deux sources, jamais de copie** :
  - un événement du calendrier coché **Tâche** (ponctuel) apparaît dans le sas, la matrice et Aujourd'hui, avec son créneau ; sa priorité (important / urgent) se règle dans sa fiche ou au tri guidé ; on le coche des deux côtés ;
  - **Mettre au calendrier** (fiche d'une tâche) ouvre la fiche d'événement déjà remplie (intitulé, jour, domaine, note, priorité) : il ne reste qu'à choisir l'heure. À l'enregistrement la tâche devient cet événement (un seul exemplaire) et reste dans la matrice ;
  - les séries (chaque jour, chaque semaine…), rendez-vous et objets restent dans le calendrier : pas de priorité à trier.
- Barre d'onglets en bas : Calendrier / Tâches / Routines (badge avec le nombre de tâches dans le sas).

## Module Routines

- Onglet **Routines** : le jour choisi (bande de la semaine pour revenir sur un jour passé), les routines à cocher, groupées Matin / Journée / Soir.
- Les mêmes cases à cocher sont aussi en bas de la vue **Jour** du calendrier (« cochables partout »).
- Chaque routine a ses jours de la semaine (tous les jours, lun–ven, lun/mer/ven…). Elle revient **toute seule chaque mois** : rien à recopier.
- On ne coche pas à l'avance ; on peut compléter un jour passé.
- **Retirer** une routine la fait disparaître des listes à partir d'aujourd'hui, mais son passé reste dans le bilan.
- **Ajouter une routine** : ligne en pointillés collée sous la liste du jour (elle défile avec la page).
- **Bilan** : gros bouton flottant « Bilan » en bas à droite de l'écran Routines (jamais affiché tout seul). Il ouvre **un seul tableau plein écran** pour le mois entier : routines en colonnes (même ordre que la liste du jour), jours en lignes, tout visible d'un coup d'œil. Cases : fait / pas coché / pas prévu (point) ; le futur reste vide ; aujourd'hui est surligné et sa case à remplir est entourée. En-tête de colonne : « fait/prévu » (aujourd'hui non coché n'est pas compté comme un oubli). Mois précédents navigables. Avec beaucoup de routines, le tableau défile à l'horizontale (une demi-colonne dépasse pour le signaler) ; la colonne des jours reste fixe.
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
src/tasks/model.ts              tâches, liste unique (tâches + événements « Tâche »), sas, Eisenhower, glissement (testés)
src/tasks/useTaskItems.ts       la liste unique pour les écrans
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
src/routines/BilanScreen.tsx    bilan : tableau unique du mois, plein écran
src/routines/tableLayout.ts     tailles du tableau de bilan (testées)
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
