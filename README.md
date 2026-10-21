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

## Module « Trier mes idées » (ex-Tâches)

- **En tête de page** : on note une idée par son titre. Une fenêtre s'ouvre, en 3 étapes : 1) **la note** (texte libre, un retour à la ligne après un tiret continue la liste) ; 2) **le domaine** (Travail, Sport… : une simple étiquette pour les calculs, pas affichée dans cet onglet) ; 3) **la priorité en points** : important = 1, urgent = 1, aucun = 0, donc entre 0 et 2. Ce calcul ne sert pas au calendrier, c'est une première lecture. Fermer la fenêtre sans valider ne perd pas l'idée : elle attend dans « À classer ».
- **4 listes** sous le champ (plus d'onglets) : *Urgent et important* (2 points), *Urgent* (1), *Important* (1), *Abandonner ?* (0). Une section « À classer » n'apparaît que s'il reste des idées sans priorité.
- **Glisser-déposer** : appui long sur une idée, puis on la fait glisser vers une autre liste, ou plus haut / plus bas dans sa liste (trait vert = où elle tombera, la liste visée s'entoure). L'ordre choisi est gardé (`rank`). Pas de défilement automatique pendant le glissement : les listes tiennent sur un écran ou deux.
- **Appui simple** sur une idée : fenêtre pour modifier le titre, la note, le domaine, l'importance et **le calendrier** : « Mettre au calendrier » déroule la date et l'heure juste en dessous (créneau libre vérifié) ; à la validation l'idée entre au calendrier et reste dans les listes avec son créneau.
- **Une seule liste, deux sources, jamais de copie** : un événement du calendrier coché **Tâche** (ponctuel) apparaît aussi dans les listes ; sa priorité se règle dans sa fiche. Les séries, rendez-vous et objets restent dans le calendrier.
- **Retour au sas** : une idée datée pas cochée un jour passé repasse dans « À classer » (sans jour ni priorité). Pour un événement « Tâche », le créneau reste dans le calendrier et une idée neuve repart dans « À classer ». Après 3 retours, l'appli propose de la découper ou de l'abandonner.
- **Abandonner** : une idée abandonnée disparaît partout mais reste en mémoire (pour un futur bilan).
- Les idées prévues un jour apparaissent dans les vues **Jour** et **Semaine** du calendrier et **comptent dans la charge du jour**.
- Barre d'onglets en bas : Calendrier / Trier mes idées / Routines (badge avec le nombre d'idées à classer).

## Module Routines

- Onglet **Routines** : le jour choisi (bande de la semaine pour revenir sur un jour passé), les routines à cocher, groupées Matin / Journée / Soir.
- Les routines **n'existent que dans l'onglet Routines** : le calendrier n'en affiche aucune (décision de Valentin, 21 oct.).
- **Pastille rouge** à droite du mot « Routines » dans la barre d'onglets. Trois heures d'alerte : **midi** (routines du matin), **18 h** (journée), **22 h** (soir). Elle s'allume si une heure d'alerte est passée et qu'il reste une routine en retard (les retards s'additionnent) ; **cocher une seule case l'éteint aussitôt**, jusqu'à l'heure d'alerte suivante (sinon un matin oublié la laisserait allumée jusqu'à minuit). Elle peut donc revenir jusqu'à 3 fois par jour. Règle pure et testée : `alertOn` dans `src/routines/model.ts` ; l'heure de la dernière coche est gardée dans `ce.routines.v1` (champ facultatif `lastCheckAt`). Mise à jour automatique (toutes les 30 s et au retour dans l'appli). Ce n'est pas une notification du téléphone : il faut ouvrir l'appli pour la voir.
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
src/tasks/model.ts              idées, liste unique (tâches + événements « Tâche »), points, 4 listes, ordre, déplacement (testés)
src/tasks/useTaskItems.ts       la liste unique pour les écrans
src/tasks/TasksContext.tsx      données des tâches (ce.tasks.v1)
src/tasks/TasksScreen.tsx       « Trier mes idées » : saisie, 4 listes, glisser-déposer
src/tasks/apply.ts              applique priorité / place à une idée, où qu'elle vive
src/tasks/TaskEditor.tsx        fenêtre d'une idée (note, domaine, points, calendrier)
src/tasks/DayTasks.tsx          tâches du jour dans le calendrier
src/routines/model.ts           routines, jours prévus, cases cochées, bilan du mois (testés)
src/routines/RoutinesContext    données des routines (ce.routines.v1)
src/routines/RoutinesScreen.tsx écran Routines
src/routines/components.tsx     liste cochable du jour
src/routines/useRoutineAlert.ts nombre de routines à remplir (pastille de l'onglet)
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
