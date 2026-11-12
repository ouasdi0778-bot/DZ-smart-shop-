# DZ Smart Shop — gestion des commandes COD

Outil de gestion des commandes en paiement à la livraison (COD) pour l'Algérie.

- **Les données** sont dans un classeur **Google Sheets** : vous pouvez toujours l'ouvrir et le modifier à la main.
- **L'application** (tableau de bord, commandes, centre de confirmation) est servie par **Google Apps Script**, gratuitement, et s'ouvre avec un simple lien sur PC et sur Android.
- Tout tourne chez Google : **votre PC peut être éteint**.

## Ce que fait la version 0.1

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Commandes reçues, taux de confirmation et de livraison, montant livré, argent en route, liste « à faire », taux de livraison par wilaya, résultats par confirmatrice et par produit |
| **Commandes** | Liste filtrable (statut, wilaya, période, recherche par nom, téléphone, n° de commande ou de suivi), modification d'une commande, ajout à la main, liste noire |
| **Centre de confirmation** | File d'appels (rappels dus en premier, puis les plus anciennes), fiche client avec historique et alerte, boutons Appeler et WhatsApp (message pré-rempli), correction de la commande avec recalcul des frais et du total, résultat en un clic : Confirmer, Pas de réponse, Rappeler plus tard, Annuler (avec motif) |
| **Expéditions** | Commandes confirmées prêtes à partir (avec les problèmes à corriger avant l'envoi), envoi à **Ecotrack** en un clic, n° de suivi écrit dans le classeur, suivi des colis en cours |

Ce qui se passe tout seul :

- **Toutes les 5 minutes**, chaque nouvelle ligne de l'onglet Commandes (statut vide) est préparée :
  - le téléphone est remis au format `0550123456` ;
  - la wilaya est écrite comme dans la liste (`16 - Alger`) ;
  - les frais de livraison sont pris dans l'onglet Tarifs et le total est calculé ;
  - l'alerte client est calculée ;
  - la commande passe « À confirmer ».
- **Alertes client** : `Liste noire`, `Numéro invalide`, `Doublon` (même numéro en moins de 48 h), `Risque · 2 refus`, `Fiable · 3/3 livrées`, `Nouveau client`.
- **Pas de réponse** : un rappel est programmé dans 2 h. Au 3ᵉ appel sans réponse, la commande passe « Injoignable ».
- **Deux confirmatrices sur la même commande** : la seconde reçoit un message « déjà traitée », rien n'est écrasé.
- **Journal** : chaque action (qui, quand, quoi) est notée dans l'onglet Journal.

## Installation (environ 15 minutes)

### 1. Créer le classeur et le script

1. Ouvrez votre classeur Google Sheets (ou créez-en un vide).
2. Menu **Extensions › Apps Script**.
3. Dans le fichier `Code.gs` qui s'ouvre, **effacez tout**, puis collez le contenu du fichier [`dist/Code.gs`](dist/Code.gs). Sur GitHub, le bouton « Copy raw file » le copie en entier.
4. Cliquez sur 💾 **Enregistrer**.
5. ⚙ **Paramètres du projet** › Fuseau horaire : **(GMT+01:00) Alger**.

> `dist/Code.gs` contient tout le code dans un seul fichier. Pour les développeurs, le code source est découpé dans [`apps-script/`](apps-script/) et peut être envoyé avec [clasp](https://github.com/google/clasp) : créez un `.clasp.json` contenant `{"scriptId": "<ID du script>", "rootDir": "apps-script"}`, puis lancez `clasp push`. Après une modification de `apps-script/`, lancez `npm run bundle` pour régénérer `dist/Code.gs`.

### 2. Installer le classeur

1. Rechargez l'onglet du classeur : un menu **DZ Smart Shop** apparaît.
2. Lancez **DZ Smart Shop › Installer / réparer le classeur**.
3. Google demande l'autorisation. Choisissez votre compte, puis **Paramètres avancés › Accéder à … (non sécurisé)**. C'est votre propre script, qui n'a pas été vérifié par Google.
4. Les onglets sont créés : Commandes, Clients, Produits, Tarifs, Équipe, Paramètres, Journal.

Cette commande peut être relancée à tout moment : elle ne supprime rien et complète seulement ce qui manque.

### 3. Remplir les réglages

- **Tarifs** : le prix de livraison de chaque wilaya, à domicile et en stop desk, pour Yalidine et Ecotrack.
- **Équipe** : l'adresse Gmail et le prénom de chaque confirmatrice. Le prénom s'affiche dans l'application et dans la colonne Confirmatrice.
- **Paramètres** : nom de la boutique, nombre d'appels avant « Injoignable », délai de rappel, motifs d'annulation, modèle du message WhatsApp.
- **Produits** (facultatif) : vos produits et leurs prix, proposés lors de la saisie d'une commande.

### 4. Publier l'application

1. Dans Apps Script : **Déployer › Nouveau déploiement**.
2. Type : **Application Web**.
3. Exécuter en tant que : **Utilisateur accédant à l'application Web**.
4. Qui a accès : **Tous les utilisateurs disposant d'un compte Google**.
5. **Déployer**, puis copiez l'URL qui se termine par `/exec`.

**Qui peut voir les commandes ?** Seules les personnes avec qui **le classeur est partagé**. L'application lit le classeur avec le compte Google de la personne qui l'ouvre. Pour chaque confirmatrice :

1. **Partager** le classeur avec son adresse Gmail, en **Éditeur**.
2. L'ajouter dans l'onglet **Équipe**.
3. Lui envoyer l'URL. À la première ouverture, elle autorise l'application une fois.

**Sur Android** : ouvrez l'URL dans Chrome, puis menu ⋮ › **Ajouter à l'écran d'accueil**.

**Après une modification du code** : **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version**. Sinon, le lien continue d'afficher l'ancienne version.

## Envoyer les colis à Ecotrack

L'intégration suit la [documentation de l'API Ecotrack](https://documenter.getpostman.com/view/14517169/Tz5je15g).

### Configuration (une seule fois)

1. Collez le nouveau `dist/Code.gs` dans Apps Script, puis 💾 **Enregistrer**.
2. Relancez **DZ Smart Shop › Installer / réparer le classeur**. Google demande une **nouvelle autorisation** (« se connecter à un service externe ») : acceptez. La colonne **Statut société** est ajoutée et le suivi automatique toutes les 30 minutes est installé.
3. **DZ Smart Shop › Ecotrack › Enregistrer l'adresse et le jeton** : saisissez l'adresse de votre plateforme (ex. `https://monsociete.ecotrack.dz`) puis votre jeton API. Le jeton est gardé dans les **propriétés du script** : il n'est jamais écrit dans le classeur ni dans le code. Un test de connexion est fait tout de suite.
4. **DZ Smart Shop › Ecotrack › Récupérer les tarifs** : remplit les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l'onglet Tarifs. Une case reste vide quand le service n'existe pas (stop desk à 0 chez Ecotrack, wilaya non desservie). Les colonnes Yalidine ne sont pas touchées, et vous pouvez toujours corriger un prix à la main.
5. **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version** pour que l'application web utilise le nouveau code. Chaque confirmatrice devra accepter la nouvelle autorisation à sa prochaine ouverture.

### Au quotidien

- Page **Expéditions › À expédier** : sélectionnez les commandes **prêtes**, puis **Envoyer à Ecotrack**. Une commande avec un problème (téléphone invalide, adresse ou commune manquante, wilaya non desservie, stop desk indisponible…) est signalée et se corrige avec **Modifier**.
- Chaque colis créé reçoit son **n° de suivi** dans le classeur, et la commande passe **Expédiée**.
- Si Ecotrack refuse un colis (par exemple « Commune mal écrite »), le motif est affiché et la commande reste confirmée : corrigez-la, puis renvoyez-la.
- Les statuts des colis sont relus **toutes les 30 minutes** (ou à la demande avec « Mettre à jour les statuts ») et traduits : `prete_a_expedier` → Expédiée, en transit ou en livraison → En livraison, livré ou payé → Livrée, retour → Retour. Le statut exact d'Ecotrack est gardé dans la colonne **Statut société**.
- Un statut qu'Ecotrack envoie et que l'outil ne connaît pas **ne change rien** : il est affiché dans « Statut société » et noté une fois dans l'onglet **Journal**. La correspondance se trouve dans la fonction `mapEcotrackStatus_` (fichier `Ecotrack.gs`).
- Un colis qui n'apparaît plus dans la liste d'Ecotrack (archivé) est marqué « Introuvable chez Ecotrack » et signalé dans le Journal. Son statut reste inchangé : mettez-le à jour à la main.

### Sécurité et fiabilité

- Le jeton est envoyé uniquement à l'adresse enregistrée, en `https`, et les redirections ne sont jamais suivies.
- Une commande ne peut pas partir deux fois : seules les commandes **Confirmée** sans n° de suivi sont envoyées, et une commande en cours d'envoi est verrouillée.
- Si la connexion est coupée en plein envoi, l'outil cherche chez Ecotrack (par notre numéro de commande) si le colis a été créé avant de conclure : pas de doublon.
- Les limites d'Ecotrack (50 requêtes par minute) sont respectées : jusqu'à 100 commandes par requête, et attente automatique en cas d'erreur 429.

### Pas encore pris en charge

- Annuler ou modifier un colis déjà envoyé : à faire dans Ecotrack (une commande annulée dans l'outil après son envoi n'est **pas** annulée chez Ecotrack).
- Choisir un bureau précis pour le stop desk : l'API ne demande que « domicile » ou « stop desk ».
- Bordereaux à imprimer, et Yalidine.

## Faire arriver les commandes Shopify

Pour l'instant, toute application ou automatisation qui **ajoute une ligne** dans l'onglet **Commandes** fonctionne : application de formulaire COD, Shopify Flow, import, copier-coller.

- **Laissez la colonne Statut vide.** La ligne sera préparée dans les 5 minutes, ou tout de suite avec **DZ Smart Shop › Traiter les nouvelles commandes**.
- **Titres de colonnes acceptés** : les colonnes sont retrouvées par leur titre, et plusieurs variantes sont reconnues. Par exemple `Order ID` ou `N°`, `Nom complet` ou `Client`, `Phone` ou `Téléphone`, `Province` ou `Wilaya`, `City` ou `Commune`, `Price` ou `Prix`. La liste complète est dans `ORDER_COLUMNS` (fichier `Config.gs`).
- **Prix** = le prix des produits, **sans** la livraison. Si votre application envoie déjà le total livraison comprise, mettez-le dans la colonne **Total** : il sera gardé tel quel.

La connexion directe à Shopify (sans application intermédiaire) est la prochaine étape.

## Tester sans Google (pour les développeurs)

Il faut Node.js 18 ou plus récent, sans aucune dépendance à installer.

```bash
npm test          # 38 tests du code serveur (dont l'intégration Ecotrack contre un faux serveur) contre une imitation du classeur
npm run bundle    # régénère dist/Code.gs (le fichier unique à coller dans Apps Script)
npm run preview   # crée preview/index.html : l'application avec des données d'exemple
```

`preview/index.html` s'ouvre directement dans le navigateur. Tout y fonctionne (confirmer, annuler, créer…) sur un classeur imité, avec environ 40 commandes d'exemple.

## Organisation du code

```
apps-script/
  Config.gs     onglets, colonnes, statuts, couleurs, réglages par défaut, 58 wilayas
  Utils.gs      téléphones, nombres, dates, réglages, utilisateur, verrou, journal
  Orders.gs     lecture/écriture des commandes, tarifs, alertes, traitement des nouvelles lignes
  Ecotrack.gs   envoi des colis, tarifs et suivi des statuts Ecotrack
  Api.gs        application web, menu du classeur, fonctions appelées par l'interface
  Setup.gs      création/réparation du classeur et du traitement automatique
  Index.html    page de l'application
  Styles.html   apparence (ordinateur et téléphone)
  App.html      fonctionnement de l'interface
dist/Code.gs    tout le code ci-dessus en un seul fichier (généré par npm run bundle)
tests/          imitation de Google Apps Script, tests, données d'exemple, aperçu
```

## Prochaines étapes prévues

1. **Shopify** : récupération directe des nouvelles commandes, et mise à jour de Shopify quand une commande est confirmée ou annulée.
2. **SMS avec httpSMS** : SMS automatique à la commande, confirmation par réponse « 1 » / « 2 ».
3. **Yalidine** (Ecotrack est fait) : création des colis, suivi des statuts, et impression des bordereaux pour les deux sociétés.
4. **Stock et bénéfice réel** par commande.

## Limites connues

- Chaque action prend 1 à 2 secondes : Apps Script est plus lent qu'une application classique.
- Au-delà de quelques dizaines de milliers de lignes, le classeur ralentit. Il faudra alors archiver les anciennes commandes, par exemple dans un classeur par année.
- La liste des wilayas est celle des 58 wilayas. Si le découpage change, ajoutez les nouvelles lignes dans l'onglet Tarifs : l'application utilise cette liste.
