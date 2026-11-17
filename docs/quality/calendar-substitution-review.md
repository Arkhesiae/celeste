# Revue : entrées de calendrier, calcul des vacations d'un utilisateur, remplacements (chaînés compris)

Date de la revue : 2026-11-14. Revue faite en lecture seule ; les points corrigés depuis (S1 à S3, S5 à S7, S12, et la partie lecture de S10) ont été retirés. Ce qui reste est une proposition en attente de décision.

Périmètre lu en entier : `services/calendarEntry/*`, `controllers/calendarEntry.controller.js`, `routes/calendarEntry.routes.js`,
`services/planning/planning.userShifts.js`, `services/substitution/request.{accept,cancel,cascade,creation,delete,expiry,list,withdraw}.js`,
`services/substitution/substitution.userPool.js`, `models/Substitution.js`, `models/CalendarEntry.js`, `controllers/substitution.controller.js`,
`routes/substitution.routes.js`, et les appels côté front (calendrier, modales) qui les utilisent.

**Niveau de certitude.** Les points marqués *(vérifié)* ont été reproduits avec un petit script (cast Mongoose, schéma). Les autres viennent de la lecture du code et
du suivi des appels ; rien n'a été exécuté sur une base de données pour cette revue, donc chacun doit être confirmé par un test avant correction.
Gravité : **P0** données fausses ou faille de sécurité, **P1** fonctionnalité cassée ou état incohérent atteignable par un utilisateur normal, **P2** fragile ou trompeur.

---

## 1. Synthèse des constats les plus importants

| # | Gr. | Où | En une ligne |
|---|-----|----|--------------|
| S4 | P0 | `routes/substitution.routes.js` | N'importe quel membre du centre peut annuler ou supprimer la demande de n'importe qui |
| S8 | P1 | `request.cascade.js` | Les enfants d'une cascade ne reçoivent jamais le `reason` (`system-cancelled` devient `cancelled`) |
| S9 | P1 | `request.accept.js` | Aucun contrôle de compatibilité côté serveur, aucun contrôle de date, `reservedForUserId` ignoré |
| S10 | P1 | `planningModificationService.registerModification`, `DemandModal` | Choisir une variation d'une demande poste sur une route inexistante (404) : décision de conception à prendre |

L'analyse des remplacements chaînés est en section 3, la proposition d'interface en section 4, les noms en section 5, les simplifications en section 6.

---

## 2. Bugs et incohérences

### 2.1 Flux des remplacements

**S4 (P0). Contrôles de l'acteur manquants.** `POST /:id/cancel` est seulement derrière `authorizeDemandAccess` (même centre). Rien ne vérifie que
l'appelant est le demandeur (ou un admin). `cancelRequest` n'utilise `actorId` que pour la notification. `POST /:id/send-email` permet à n'importe quel membre d'envoyer un mail aux administrateurs du centre pour n'importe quelle demande (et met des noms d'utilisateurs dans du HTML brut).

**S8 (P1). `reason` est perdu dans les cascades.** `cancelCascade` appelle `cancelRequestWithSession(child._id, { visited, session, cancelledRequests })` sans
`reason`. Quand la racine est annulée avec `system-cancelled` (changement de rotation, d'équipe), les enfants en cascade reçoivent `cancelled`. Le paramètre est aussi
mal nommé : c'est un **statut** final, pas une raison.

**S9 (P1). L'acceptation n'est pas re-validée côté serveur.** `acceptRequestWithSession` vérifie le statut, l'auto-acceptation et une demande ouverte de l'accepteur ce jour-là,
et rien d'autre : pas de compatibilité repos/charge (toute la pile `compatibility.*` ne tourne que pour l'affichage), pas de vérification que l'accepteur ne travaille pas déjà
ce jour-là (un utilisateur qui tient un autre remplacement ce jour peut en accepter un second), pas de contrôle de date (une demande d'un jour passé que le job de 30 minutes n'a pas encore
expirée peut encore être acceptée, annulée, retirée), `reservedForUserId` existe dans le modèle et n'est lu nulle part (donc une demande réservée est ouverte à tous), et
`isTrueSwitch` n'est jamais stocké (champ de schéma mort). Le serveur est le seul endroit digne de confiance face à une course ou à un client falsifié.

**S10 (P1, reste à décider). Choisir une variation depuis `DemandModal`.** Le front `planningModificationService.registerModification` poste sur
`/calendar-entry/register-modification` avec `type: 'selectedVariation'` : cette route n'existe pas (404), donc le choix d'une variation depuis `DemandModal` échoue. Ce n'est pas
qu'une route à renommer : l'ancien flux mettait à jour la variation **de la demande** (`posterShift.selectedVariation`) et renvoyait `updatedDemand`, que le serveur ne produit plus (toujours `null`).
Envoyer une modification `variation` via `register-entry` changerait le planning du demandeur sans toucher la demande, que la compatibilité lit. Décision à prendre : un endpoint dédié
« variation d'une demande » (poseur seulement, demande ouverte), ou retirer le sélecteur.


**Autres points**
- Écritures non atomiques dans `registerEntry` (pas de transaction) : `registerHourPatch` désactive le patch précédent **avant** les validations qui peuvent répondre 422 ; un 422 laisse le jour sans son patch.
  `registerModification` désactive l'ancienne modification, puis annule les patchs, puis enregistre.
- `acceptRequest`, `withdrawFromRequest` et `cancelRequest` recalculent les vacations après le commit ; un échec à ce moment (`computeUserShifts`, `categorizeRequests`) répond 500
  alors que l'action est validée et ne peut plus être rejouée (l'utilisateur voit une erreur, les données ont changé). Les étapes après commit devraient être au mieux (best-effort).
- Contrôleur `createDemand` : après `res.status(201).json(...)`, le code de notification (populate, calcul du pool) peut lever une erreur et appelle `next(err)` sur une réponse déjà envoyée.
- Expiration : `processPastDemands` et `processAndCompleteDemands` posent `deleted: true` pour les demandes `expired` et `completed`, donc `deleted` signifie à la fois « archivé » et « supprimé à la main ».
  `getAllCenterDemands` filtre `deleted: false`, donc un admin ne voit jamais l'historique.
- `updatedAt`, `createdAt` sont posés à la main (`request.updatedAt = new Date()`, `createdAt: new Date()`) alors que le schéma a `timestamps: true`.

### 2.2 Calcul des vacations d'un utilisateur (`planning.userShifts.js`)

- **Des entrées périmées peuvent casser tout un lot.** `applyHourPatch` ajoute des heures à `resolvedShift.startTime` ; si un patch est encore actif un jour devenu jour de repos ou d'affectation
  (changement de rotation ou d'équipe), `startTime` est `undefined` et `addHours` lève une TypeError. `computeUserShifts` traite les jours dans un `Promise.all`, donc un seul mauvais jour fait échouer tout le mois.
  Les modifications sont protégées par `isModificationConsistent` (même id de vacation), les patchs d'horaires non. Idem pour une modification `variation` dont la variation a été supprimée
  (`modShiftData.selectedVariation.startTime` sur `null`).
- `checkHourPatchCoherence` teste `latestModification.subType === 'absence'`, ce qui ne peut pas arriver (l'enum des modifications est `disp, vic, variation, pres`). Contrôle mort.
- `isSameShift` renvoie `undefined` (pas un booléen) quand un id manque, et le `isSameShift(userShift, data)` de `registerEntry` porte le même nom avec une autre signature (section 5).
- `getActiveEntriesByDates` contient des branches impossibles : `typeof a.date === 'string' ? a.date.slice(0, 10) : a.date` (le champ est toujours une chaîne), le
  repli `|| { assignments: [] ... }` dans `computeUserShifts` (la table est pré-remplie pour chaque date), et une chaîne de populate répétée trois fois pour un `shiftData` qui est un
  sous-document, pas une référence (`populate({ path: 'shiftData', populate: 'shift' })` ne fait rien à côté du populate de `shiftData.shift`).
- Seuls la **dernière** affectation, modification et dernier patch sont utilisés (`.at(-1)`). Cela suppose que les écrivains gardent une seule entrée active ; `cancelSubstitutionEntries` et `deleteAssignment`
  utilisent `createdAt >= ...` à la place. Les deux conventions ne fonctionnent ensemble que si les horodatages ne se télescopent jamais (voir 3.3).

### 2.3 Enregistrement des entrées de calendrier (`calendarEntry.register.js` et `.cancel.js`)

- Les deux routes `/restore-initial` et `/undo-mods` (et leurs deux contrôleurs) font la même chose ; elles appellent maintenant la même fonction de service, il reste à en garder une côté API et front.
- `data.team` (affectation) et `data.teamId` (modification, patch d'horaires) sont deux noms pour une même entrée ; `registerHourPatch` accepte les deux plus deux replis (`teamFromShift?._id ?? teamFromShift`).
- `registerEntry` charge `substitution`, les trois dernières entrées et les vacations pour chaque gestionnaire alors que chacun n'en utilise qu'une partie.
- `getUserEntries` a aussi un « Date » pour une chaîne de jour (`new Date(date)`), et `findLatestAssignment` dans `addSubstitutionEntries` ignore volontairement les entrées de remplacement (voir 3.2).
- `savedEntry` est écrit (entrées de `demand`) et **jamais lu** : rien ne restaure l'entrée que `addSubstitutionEntries` a désactivée. Si C avait une affectation ce jour-là, accepter un remplacement la désactive,
  et annuler ou retirer le remplacement ne la rétablit pas (`cancelSubstitutionEntries` ne désactive que ce qui est plus récent). Soit utiliser `savedEntry` pour réactiver, soit refuser l'acceptation.

---

## 3. Remplacements chaînés

Prenons : A poste S1, B accepte, B poste S2 (enfant de S1), C accepte, C poste S3, D accepte.

### 3.1 Ce qui fonctionne
- `dependsOn` + `cancelCascade` annule les descendants d'abord, puis le parent (en profondeur), dans une seule transaction ; `visited` arrête les boucles.
- Les entrées de calendrier sont défaites par horodatage (`createdAt >= subEntry.createdAt`) : annuler S2 retire l'entrée de demandeur de B pour S2 et l'entrée d'accepteur de C pour S2, donc l'entrée d'accepteur de B pour S1 redevient la plus récente et B travaille.
  C'est aussi pourquoi `addSubstitutionEntries` ne doit pas désactiver une affectation `substitution` précédente (le filtre `subType: { $ne: 'substitution' }`) : la chaîne repose sur les entrées plus anciennes qui restent actives dessous.
- Le retrait de B de S1 annule S2/S3 et rouvre S1.
- Mails après commit pour les demandes en cascade (`notifyDemandChanges`).

### 3.2 Ce qui peut mal tourner
1. **Rentrée d'un agent remplacé** : corrigée (demande, modification et ajustement d'horaires refusés sur un jour remplacé) ; le point ne reste que comme test de non-régression.
2. **`dependsOn` : un tableau est le bon modèle (une demande a jusqu'à deux parents), mais il est mal rempli.** Exemple : A↔B (S1), C↔D (S2), puis C↔A (S3). La vacation de C vient de S2 et celle de A vient de S1 :
   S3 dépend légitimement de **deux** demandes, une par côté. Un parent unique ne suffirait donc pas pour les permutations. Trois problèmes *(lecture du code, non rejoués)* :
   - **Côté demandeur trop large.** `createDemand` stocke **toutes** les demandes acceptées de ce jour où le demandeur est demandeur *ou* accepteur. Le seul vrai parent est la demande qui lui a donné sa vacation actuelle,
     celle de son entrée `substitution` active la plus récente.
   - **Côté accepteur jamais ajouté.** L'accepteur n'est connu qu'à l'acceptation, et rien ne complète alors `dependsOn`. Dans l'exemple, S3 ne dépend que de S2 : annuler S1 ne cascade pas sur S3, qui reste `accepted`.
     Les entrées de A sont bien défaites par horodatage, mais la demande S3 et l'entrée de C (qui tient la vacation que A ne tient plus) restent : état incohérent.
   - **Contrôle de cycle faux pour un tableau** (hook `pre('save')`) : `this.dependsOn` est toujours vrai, `findById(tableau)` est converti en `$in` et ne renvoie que **le premier** résultat,
     `seen.has(current.dependsOn.toString())` compare une chaîne d'ids jointe (jamais un id) dès 2 parents, et le hook exécute une requête par niveau à **chaque** sauvegarde (acceptation, annulation, `seenBy`...) hors session.

   Piste : poser à la création le parent du côté demandeur (la demande de son entrée `substitution` active la plus récente), ajouter à l'acceptation celui du côté accepteur (même règle), soit deux au plus.
   Un parent est toujours déjà `accepted` quand l'enfant le référence : le graphe est sans cycle par construction, le hook peut être supprimé.
3. **Une chaîne peut revenir sur une personne.** Le S2 de B peut être accepté par A (le premier demandeur) : les entrées sont cohérentes (la plus récente de A est l'entrée d'accepteur) mais A porte une transaction S1 (A paie B) et S2 (B paie A),
   et l'affichage de la chaîne est une boucle. Probablement permis volontairement ; cela doit être explicite dans l'interface (4.2) et dans les points.
4. **Deux parents pour une vacation après un retrait + nouvelle acceptation.** B retire S1, D l'accepte : `reminderSentAt` est remis à zéro, les entrées sont neuves, mais les enfants `dependsOn` de S1 sont annulés ; correct. Si en revanche le S2 de B était ouvert (non cascadé puisque `status` ouvert est annulé aussi),
   l'annulation d'un enfant *ouvert* n'envoie rien aux personnes qui avaient manifesté leur intérêt (`interested`) : mineur.
5. **Les horodatages comme ordre.** La justesse du défaire dépend de `createdAt` strictement croissant par utilisateur et par jour, et de `$gte` (qui retire aussi une entrée de la même milliseconde).
   Les entrées d'une demande sont créées dans une transaction pour deux utilisateurs différents, donc elles ne se télescopent pas, mais une entrée manuelle créée dans la même milliseconde qu'une acceptation serait désactivée.
   `cancelAfter` désactive aussi **toute** entrée plus récente de l'utilisateur (modifications, patchs, affectations), même sans lien avec la demande ; c'est voulu pour les enfants de S2 mais c'est une surprise pour, par exemple, un patch d'horaires ajouté par C après son acceptation.
6. **Points.** Les transactions sont planifiées par demande à l'acceptation (`createScheduledTransaction`) ; l'annulation les retire (`cancelRequestTransactions`). Avec l'écart de date (S9), une chaîne annulée après coup laisse
   des transferts que le planning ne justifie plus.
7. **Expiration d'une chaîne.** `processAndCompleteDemands` termine chaque demande acceptée indépendamment une fois le jour passé (`deleted: true`) ; une annulation tardive de la racine est maintenant refusée (400), et la cascade épargne les demandes déjà terminées.
8. **L'ordre de `cancelledRequests` est un contrat caché.** La racine est le **dernier** élément (`cancelledRequests[cancelledRequests.length - 1]` dans `cancelRequest`), les enfants viennent d'abord ; dans `withdrawFromRequest` le tableau ne contient que des enfants.
   Le prochain changement de l'ordre de parcours casse en silence la demande déclarée racine et les personnes notifiées.

### 3.3 Vérifications à transformer en tests
A→B→C puis A annule ; A→B→C puis B retire ; A→B→A ; A remplacé poste ou ajoute `pres` ; A→B où B avait une formation ou une affectation `absence` ce jour-là (entrée désactivée, jamais restaurée) ;
annulation d'une permutation acceptée (les deux jours reviennent à l'état d'avant) ; acceptation simultanée de la même demande par deux utilisateurs.

---

## 4. Interface : permettre à chacun de voir le résultat final

**Ce que voit un utilisateur aujourd'hui.** `getRequests` renvoie les demandes ouvertes/acceptées du centre pour une période ; chaque demande connaît son demandeur et son accepteur, rien de ses voisines dans la chaîne.
`computeUserShifts` garde un `history` pour le jour (`type`, `shiftData`, `wasOverride`) mais abandonne `substitution.id`, donc le front ne peut pas relier une entrée à une demande ni à l'autre personne.
`DemandChip` et `DemandModal` montrent l'accepteur **direct** (avatar, nom, téléphone, e-mail). A voit donc « remplacé par B » et les coordonnées de B, alors que C est celui qui travaillera réellement.
Personne n'est prévenu quand la chaîne en dessous change (S2 de B accepté, retiré ou annulé).

**Proposition (à valider avant tout travail).**
1. **Données.** Garder `dependsOn` comme tableau de deux parents au plus (côté demandeur, côté accepteur), rempli comme décrit en 3.2 point 2. Pour des remplacements simples la chaîne d'un jour reste `racine → ... → feuille`
   (un seul parent par demande) ; une permutation relie deux chaînes, l'affichage part alors de la demande ouverte et remonte les deux côtés. Le « titulaire final »
   est l'accepteur du dernier nœud accepté (ou le demandeur du nœud si la dernière demande est encore ouverte, affiché « en attente »). L'exposer dans `getRequests` sous la forme `chain: [{ demandId, posterId, accepterId, status }]` (identifiants seulement, noms résolus par le store d'utilisateurs existant), ou via un petit endpoint
   `GET /substitution/:id/chain`.
2. **Entrée de calendrier.** Ajouter `substitution: { id, role: 'poster' | 'accepter' }` aux entrées de `history`, pour qu'un jour puisse afficher « remplacé par B » et ouvrir la demande.
3. **Bloc du jour / modale pour le demandeur d'origine A.** Une ligne compacte « A → B → C » avec un marqueur par maillon : accepté, ouvert (en attente), annulé. Le dernier titulaire est mis en évidence et est la seule fiche de contact affichée ; les personnes intermédiaires gardent leur nom seulement.
   Pour A, le jour affiche toujours « remplacé » tant que la chaîne est ouverte à son extrémité (« en attente d'un remplaçant ») : A sait que B reste responsable jusqu'à ce que quelqu'un accepte S2.
4. **Pour B (au milieu).** B voit « Vous avez repris la vacation de A, remplacée par C » et les actions côté demandeur de S2 (annuler, changer les points) ; le bouton de retrait de S1 avertit qu'il annule S2.
5. **Notifications.** Après commit, prévenir les autres titulaires de la chaîne (pas seulement les personnes du maillon modifié) quand un maillon change : C accepte S2 (A est informé que le titulaire final est C), C se retire (A et B sont informés que B travaille de nouveau),
   B se retire de S1 (A apprend que S1 est de nouveau ouverte et que S2 a été annulée). Les mails actuels sont volontairement génériques ; un mail « chaîne » dirait seulement qui est désormais sur la vacation.
6. **Garde-fous que l'interface doit refléter.** Le jour « remplacé » ne doit pas proposer « poster une demande » ni l'action `pres` (le serveur les refuse) ; la chaîne doit refuser une boucle sauf confirmation.

---

## 5. Noms (important : plusieurs noms disent le contraire de ce qu'est la valeur)

| Nom | Où | Problème | Suggestion |
|-----|----|----------|-----------|
| `userShift` | `registerEntry`, `cancel*`, `acceptRequest` | c'est un **tableau** de jours ; le nom singulier le cache (`userShift[0]` partout) | `userDays` (tableau) / `userDay` (un seul) |
| `userShifts`, `userShiftData` | `request.accept.js` | tableau / une entrée de jour, encore | `userDays`, `userDay` |
| `posterShift`, `accepterShift` (sur `Substitution`) | modèle, tous les services | ce n'est pas une vacation : `{ shift, day, date, teamId, selectedVariation }` ; `posterShift.shift` bégaie | `posterSlot` / `posterDay` ou `poster: { shift, day, teamId, variation }` |
| `posterShift` / `accepterShift` (retour de `addSubstitutionEntries`, `cancelSubstitutionEntries`) | `calendarEntry.*` | **même nom, autre forme** : ici un jour calculé, `null` dans une transaction (et déstructuré puis ignoré dans `withdraw`) | `posterDay`, `accepterDay` |
| `NewShiftSchema` | `models/Substitution.js` | « new » hérité | `SlotSchema` |
| `isSameShift` | `register.js` et `planning.userShifts.js` | même nom, deux signatures, l'une renvoie `undefined` | `sameShiftId` / `isSameShiftAs` |
| `type` | quatre sens : discriminant d'entrée (`assignment`, ...), `type` de résultat (`creation`, `modification`, `restoration`), `type` de jour (`shift`, `empty`, ou le sous-type d'affectation), `type` de demande (`switch`, `hybrid`, `substitution`) | `type` ne se lit pas sans son fichier | `kind` pour le discriminant, `action`/`outcome` pour le résultat, `dayKind` pour le jour calculé |
| `substitution` | `type` de demande, `subType` d'affectation, nom du modèle et `Substitution.type` | un « remplacement » et toute la collection partagent un mot ; les fichiers disent `request`, les fonctions `demand`, les variables `sub`, `request`, `demand`, `substitution` | trancher : `demand` pour l'entité, `replacement` pour le genre |
| `subType` / `entryType` | modèle / charge utile du front | même concept, deux noms | `subType` de bout en bout |
| `team` / `teamId` | `data.team`, `data.teamId`, `shiftData.team`, `posterShift.teamId` | une référence `Team` appelée des deux façons | `teamId` pour les ids, `team` seulement pour les documents |
| `reason` | `cancelRequestWithSession` | c'est un **statut** final | `finalStatus` |
| `initialCancel` | `request.cancel.js` | c'est la demande racine qui a été annulée | `rootRequest` |
| `date` | partout dans `calendarEntry.*`, `registerEntry(userId, date, data)` | c'est une **chaîne** `YYYY-MM-DD` (le type du schéma est String), alors que `Substitution.posterShift.date` est un vrai `Date` ; `toDay`, `toDateKey`, `posterDayOf`, `new Date(...)` convertissent dans les deux sens | `day` pour la chaîne, `date` seulement pour un `Date` |
| `isTrueSwitch` | corps de requête | jamais stocké, `type` le dit déjà | supprimer |

**Conversions aller-retour à supprimer (chaîne de jour ↔ `Date` ↔ chaîne).**
`posterDayOf(demand)` (chaîne) → `new Date(...)` pour la date de transaction → retour ; `cancelSubstitutionEntries({ date })` est documentée comme un `Date`, reçoit une chaîne, applique `toDateKey(date)` pour obtenir une chaîne et
passe ensuite quand même le `date` brut à `computeUserShifts` ; `registerEntry` passe le `date` brut pour certaines requêtes et `toDay(date)` pour d'autres. Une seule règle supprimerait tout cela : **un jour est toujours une chaîne `YYYY-MM-DD`
dans les services ; un `Date` n'apparaît qu'à une frontière Mongo ou bibliothèque** (c'est déjà la règle Temporal du projet, elle n'est simplement pas appliquée dans ces fichiers).

---

## 6. Simplification (sans changer le comportement)

1. **`registerEntry`** : ne charger que ce dont chaque gestionnaire a besoin ; un seul point de validation pour « le jour ne doit pas être impliqué dans un remplacement actif » au lieu de contrôles écrits dans chaque gestionnaire (affectation, modification et ajustement d'horaires les ont désormais chacun).
2. **`getActiveEntriesByDates`** : trois requêtes, c'est correct ; le regroupement peut être un seul `groupBy` sur `a.date` sans branche `typeof`, et les chemins de populate réduits à ceux qui existent (`shiftData.shift` avec `variations`, `shiftData.selectedVariation`, `shiftData.team`).
3. **Machine à états des demandes.** Les transitions légales (`open → accepted | cancelled | expired`, `accepted → open (retrait) | cancelled | completed`) sont implicites dans des `if (status === ...)` dispersés dans accept, cancel, withdraw, expiry.
   Une petite table `canTransition(from, to)` contrôlée aux points d'entrée (l'annulation en a déjà un : `CANCELLABLE_STATUSES`) ferait de S9 (contrôles de date) une règle de plus au même endroit.
4. **Forme des résultats.** Supprimer `updatedDemands: null` (6 endroits), les `posterShift`/`accepterShift` toujours `null` en mode transaction, et renvoyer `{ root, cascaded }` au lieu d'un tableau dont le dernier élément est spécial (3.2, point 8).
5. **Étapes après commit** (`computeUserShifts`, catégorisation, mails) enveloppées au mieux (best-effort) dans un seul helper, pour qu'un échec après commit ne réponde jamais une erreur pour une action faite.

---

## 7. Ordre suggéré (si vous décidez d'agir)

1. Garde-fous, petits et sûrs : S4 (contrôle de l'acteur).
2. Justesse des données : S8 (`finalStatus` transmis), S9 (compatibilité serveur, date, réservation), restaurer `savedEntry` ou refuser l'acceptation.
3. Routes et appels morts : la variation d'une demande (S10).
4. Modèle de chaîne : remplir `dependsOn` correctement (deux parents au plus, dont celui du côté accepteur à l'acceptation), supprimer le hook de cycle, puis la chaîne dans l'API et l'interface de la section 4.
5. Renommages et nettoyage jour/`Date` (section 5), à faire en dernier car ils touchent la plupart des fichiers.

Les points déjà corrigés ont été retirés de ce document. Dites-moi quels points restants prendre et dans quel ordre.
