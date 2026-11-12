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

1. Créez un classeur Google Sheets vide, par exemple « DZ Smart Shop · Commandes ».
2. Menu **Extensions › Apps Script**.
3. Dans l'éditeur Apps Script, créez un fichier pour chaque fichier du dossier [`apps-script/`](apps-script/), avec **le même nom sans l'extension**, et collez son contenu :

   | Fichier ici | Dans Apps Script |
   |---|---|
   | `Config.gs`, `Utils.gs`, `Orders.gs`, `Api.gs`, `Setup.gs` | **+ › Script**, nommé `Config`, `Utils`… Le fichier `Code.gs` créé par défaut peut être supprimé. |
   | `Index.html`, `Styles.html`, `App.html` | **+ › HTML**, nommé `Index`, `Styles`, `App` |
   | `appsscript.json` | ⚙ **Paramètres du projet** › cochez « Afficher le fichier manifeste appsscript.json », puis remplacez son contenu |

4. Cliquez sur 💾 **Enregistrer**.

> Pour les développeurs, il est aussi possible d'envoyer les fichiers avec [clasp](https://github.com/google/clasp) : créez un `.clasp.json` contenant `{"scriptId": "<ID du script>", "rootDir": "apps-script"}`, puis lancez `clasp push`.

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

## Faire arriver les commandes Shopify

Pour l'instant, toute application ou automatisation qui **ajoute une ligne** dans l'onglet **Commandes** fonctionne : application de formulaire COD, Shopify Flow, import, copier-coller.

- **Laissez la colonne Statut vide.** La ligne sera préparée dans les 5 minutes, ou tout de suite avec **DZ Smart Shop › Traiter les nouvelles commandes**.
- **Titres de colonnes acceptés** : les colonnes sont retrouvées par leur titre, et plusieurs variantes sont reconnues. Par exemple `Order ID` ou `N°`, `Nom complet` ou `Client`, `Phone` ou `Téléphone`, `Province` ou `Wilaya`, `City` ou `Commune`, `Price` ou `Prix`. La liste complète est dans `ORDER_COLUMNS` (fichier `Config.gs`).
- **Prix** = le prix des produits, **sans** la livraison. Si votre application envoie déjà le total livraison comprise, mettez-le dans la colonne **Total** : il sera gardé tel quel.

La connexion directe à Shopify (sans application intermédiaire) est la prochaine étape.

## Tester sans Google (pour les développeurs)

Il faut Node.js 18 ou plus récent, sans aucune dépendance à installer.

```bash
npm test          # 19 tests du code serveur contre une imitation du classeur
npm run preview   # crée preview/index.html : l'application avec des données d'exemple
```

`preview/index.html` s'ouvre directement dans le navigateur. Tout y fonctionne (confirmer, annuler, créer…) sur un classeur imité, avec environ 40 commandes d'exemple.

## Organisation du code

```
apps-script/
  Config.gs     onglets, colonnes, statuts, couleurs, réglages par défaut, 58 wilayas
  Utils.gs      téléphones, nombres, dates, réglages, utilisateur, verrou, journal
  Orders.gs     lecture/écriture des commandes, tarifs, alertes, traitement des nouvelles lignes
  Api.gs        application web, menu du classeur, fonctions appelées par l'interface
  Setup.gs      création/réparation du classeur et du traitement automatique
  Index.html    page de l'application
  Styles.html   apparence (ordinateur et téléphone)
  App.html      fonctionnement de l'interface
tests/          imitation de Google Apps Script, tests, données d'exemple, aperçu
```

## Prochaines étapes prévues

1. **Shopify** : récupération directe des nouvelles commandes, et mise à jour de Shopify quand une commande est confirmée ou annulée.
2. **SMS avec httpSMS** : SMS automatique à la commande, confirmation par réponse « 1 » / « 2 ».
3. **Yalidine et Ecotrack**, à partir de leur documentation API :
   - création des colis en un clic et récupération du n° de suivi ;
   - impression des bordereaux ;
   - mise à jour automatique des statuts de livraison.
4. **Stock et bénéfice réel** par commande.

## Limites connues

- Chaque action prend 1 à 2 secondes : Apps Script est plus lent qu'une application classique.
- Au-delà de quelques dizaines de milliers de lignes, le classeur ralentit. Il faudra alors archiver les anciennes commandes, par exemple dans un classeur par année.
- La liste des wilayas est celle des 58 wilayas. Si le découpage change, ajoutez les nouvelles lignes dans l'onglet Tarifs : l'application utilise cette liste.
