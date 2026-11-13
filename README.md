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
| **Expéditions** | Commandes confirmées prêtes à partir (avec les problèmes à corriger avant l'envoi), **création des colis chez Ecotrack** en un clic avec n° de suivi écrit dans le classeur, et liste des colis créés qui attendent votre validation chez Ecotrack |
| **Suivi** | Statut de chaque colis relu toutes les 30 minutes, **alertes « à traiter »** (colis suspendu, retour en cours, sans mouvement depuis 26 h, créé mais jamais validé…), **où est l'argent** (chez le livreur, livré pas encaissé, encaissé pas payé, prêt à verser, payé) avec les versements, et **chronologie** détaillée de chaque colis |

Ce qui se passe tout seul :

- **Chaque minute**, les nouvelles commandes écrites par Releasit COD dans l'onglet RELEASIT sont recopiées dans Commandes (voir plus bas).
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
2. Relancez **DZ Smart Shop › Installer / réparer le classeur**. Google demande une **nouvelle autorisation** (« se connecter à un service externe ») : acceptez. Quatre colonnes sont ajoutées à l'onglet Commandes (**Statut société**, **Dernier mouvement colis**, **N° de versement**, **Suivi traité le**), le réglage `SUIVI_ALERTE_HEURES` (26) apparaît dans l'onglet Paramètres, et la lecture automatique des statuts toutes les 30 minutes est installée.
3. **DZ Smart Shop › Ecotrack › Enregistrer l'adresse et le jeton** : saisissez l'adresse de votre plateforme (ex. `https://monsociete.ecotrack.dz`) puis votre jeton API. Le jeton est gardé dans les **propriétés du script** : il n'est jamais écrit dans le classeur ni dans le code. Un test de connexion est fait tout de suite.
4. **DZ Smart Shop › Ecotrack › Récupérer les tarifs** : remplit les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l'onglet Tarifs. Une case reste vide quand le service n'existe pas (stop desk à 0 chez Ecotrack, wilaya non desservie). Les colonnes Yalidine ne sont pas touchées, et vous pouvez toujours corriger un prix à la main.
5. **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version** pour que l'application web utilise le nouveau code. Chaque confirmatrice devra accepter la nouvelle autorisation à sa prochaine ouverture.

### Au quotidien

1. Page **Expéditions › À expédier** : sélectionnez les commandes **prêtes**, puis **Envoyer à Ecotrack**. Une commande avec un problème (téléphone invalide, adresse ou commune manquante, wilaya non desservie, stop desk indisponible…) est signalée et se corrige avec **Modifier**.
2. L'outil **crée** le colis chez Ecotrack et écrit son **n° de suivi** dans le classeur. **Il ne l'expédie pas** : la commande reste « Confirmée » et apparaît dans l'onglet **Créés, à valider chez Ecotrack**.
3. **Vous validez l'expédition dans l'interface d'Ecotrack.** L'outil le voit à la lecture suivante des statuts et la commande passe « Expédiée », puis « En livraison », « Livrée » ou « Retour » toute seule.
4. Si Ecotrack refuse un colis (par exemple « Commune mal écrite »), le motif est affiché et la commande reste sans n° de suivi : corrigez-la, puis renvoyez-la.

### Statuts

Les statuts sont relus **toutes les 30 minutes** (ou à la demande avec « Actualiser les statuts »), 100 colis par requête. Le statut exact d'Ecotrack est gardé dans la colonne **Statut société** et traduit ainsi :

| Statut Ecotrack | Dans l'outil |
|---|---|
| `prete_a_expedier` | reste Confirmée (créé, pas encore validé) |
| `en_ramassage`, `en_preparation_stock`, `vers_hub`, `en_hub`, `vers_wilaya`, `en_preparation` | Expédiée |
| `en_livraison`, `suspendu` | En livraison |
| `livre_non_encaisse`, `encaisse_non_paye`, `paiements_prets`, `paye_et_archive` | Livrée |
| `retour_chez_livreur`, `retour_transit_entrepot`, `retour_en_traitement`, `retour_recu`, `retour_archive` | Retour |
| `annule` | Annulée (motif « Annulée chez Ecotrack ») |

- Un statut ne revient jamais en arrière (une commande « En livraison » ne redevient pas « Expédiée »).
- Un statut inconnu **ne change rien** : il est affiché dans « Statut société », signalé dans la page Suivi et noté une fois dans l'onglet **Journal**. La table se trouve dans `ECO_STATUSES_` (fichier `Ecotrack.gs`).
- Un colis qu'Ecotrack ne retrouve pas est marqué « Introuvable chez Ecotrack » et signalé dans le Journal. Son statut reste inchangé.
- La lecture groupée utilise `get/orders/status`, dont la documentation ne décrit pas la réponse : l'outil lit alors la liste d'Ecotrack par pages, puis colis par colis, en secours.

## Suivi des colis

La page **Suivi** réunit :

- **À traiter** : colis **suspendu** ou **retour en cours** (urgent : appelez le client), colis **sans mouvement** depuis plus de 26 h, colis **créé mais jamais validé** depuis plus de 26 h, colis **introuvable**, **statut inconnu**. Chaque alerte propose Appeler, WhatsApp, Chronologie et **Marquer comme traité**. Une alerte traitée disparaît jusqu'au prochain changement du colis (ou pendant 26 h pour une alerte « sans mouvement »). Le nombre d'alertes apparaît sur le menu et sur le tableau de bord.
- **Où est l'argent** : chez le livreur, livré pas encaissé, encaissé pas payé, prêt à être versé, payé (sur 7, 30 ou 90 jours), et la liste des **versements** (n° fourni par Ecotrack). Les montants sont les totaux à encaisser, avant déduction des frais d'Ecotrack.
- **Colis en cours**, filtrables : à valider, en route, en livraison, suspendus, retours.
- **Chronologie** d'un colis (`get/tracking/info`), aussi dans la fiche de chaque commande : validé, récupéré, au centre de tri, confié au livreur, tentative de livraison, livré, encaissé, payé… Si la réponse d'Ecotrack n'est pas reconnue, elle est affichée telle quelle.
- Le délai d'alerte se règle dans l'onglet **Paramètres** (`SUIVI_ALERTE_HEURES`, 26 par défaut).

## Sécurité et fiabilité (Ecotrack)

- Le jeton est envoyé uniquement à l'adresse enregistrée, en `https`, et les redirections ne sont jamais suivies.
- Une commande ne peut pas être créée deux fois : seules les commandes **Confirmée** sans n° de suivi sont envoyées, et une commande en cours d'envoi est verrouillée.
- Si la connexion est coupée en plein envoi, l'outil cherche chez Ecotrack (par notre numéro de commande) si le colis a été créé avant de conclure : pas de doublon.
- Les limites d'Ecotrack (50 requêtes par minute) sont respectées : jusqu'à 100 commandes par requête, et attente automatique en cas d'erreur 429.

## Pas encore pris en charge (Ecotrack)

- Valider l'expédition, modifier ou supprimer un colis : à faire dans l'interface d'Ecotrack (une commande annulée dans l'outil après la création de son colis n'est **pas** annulée chez Ecotrack).
- Choisir un bureau précis pour le stop desk : l'API ne demande que « domicile » ou « stop desk ».
- Remarques au livreur (`add/maj`), demande de retour, bordereaux PDF, et Yalidine.

## Commandes Releasit COD : arrivée automatique (onglet RELEASIT)

C'est la voie la plus simple, **sans accès Shopify** : Releasit COD écrit lui-même chaque nouvelle commande dans l'onglet **RELEASIT** du classeur (intégration Google Sheets de Releasit). **Chaque minute**, l'outil recopie les nouvelles lignes dans l'onglet Commandes, puis les prépare comme les autres (téléphone, wilaya, alertes, statut « À confirmer »). Elles arrivent donc directement dans le centre de confirmation. L'outil vérifie aussi l'onglet dès qu'on ouvre les pages **Commandes** ou **Confirmation**.

### Configuration (une seule fois)

1. Dans le classeur, créez un onglet vide nommé **RELEASIT**.
2. Dans Shopify : **Releasit COD Form › Intégrations › Google Sheets**. Connectez le compte Google du classeur, choisissez le classeur et l'onglet **RELEASIT**, et cochez au moins : n° de commande, date, nom, téléphone, wilaya, commune, adresse, produit et variante, quantité, prix, sous-total, frais de livraison, total, **type de livraison**.
3. Collez la nouvelle version du code, puis **DZ Smart Shop › Installer / réparer le classeur** : le transfert automatique (chaque minute) s'active seulement si l'onglet RELEASIT existe.
4. **DZ Smart Shop › Releasit › Vérifier les colonnes de l'onglet RELEASIT** : montre les colonnes reconnues, celles qui manquent, et si le transfert automatique est actif.

### Ce qui est repris

| Onglet RELEASIT | Dans Commandes |
|---|---|
| Order ID (`#1038`) | N° : le même que dans Shopify, donc **jamais de doublon**, même si l'import Shopify tourne aussi |
| Date (`2026-11-13 18:01:14`, heure d'Algérie) | Date |
| Client, Adresse | Client, Adresse |
| Téléphone (`+2130550…`) | Téléphone, remis au format `0550123456` |
| Wilaya (`bejaia`, `الجزائر`, `16`…) | Wilaya, par exemple `06 - Béjaïa` |
| Commune (`البلدية …`) | Commune, sans le mot « البلدية » (elle reste en arabe : la confirmatrice l'écrit comme chez Ecotrack) |
| Produit et variant, Quantité | Produit, Quantité |
| prix total, prix de livraison | Total (le montant qu'Ecotrack encaissera), Frais livraison (ceux payés par le client) |
| prix total − prix de livraison | Prix (le sous-total, remise comprise) |
| type de livraison (`توصيل للمكتب` / `التوصيل للمنزل`) | Livraison : Stop desk / Domicile |
| UTM campaign (si ajoutée) | Campagne |

- **Type de livraison absent ou flou** (« التوصيل », « Free shipping ») : l'outil compare les frais payés avec l'onglet Tarifs ; s'il ne peut pas trancher, il met Domicile et écrit « Type de livraison à vérifier » dans les notes.
- **Plusieurs lignes avec le même n°** (une par produit) : une seule commande, par exemple « Coque A ×2 + Coque B ».
- **L'onglet RELEASIT n'est jamais modifié** : l'outil le lit seulement. Il retient la dernière ligne lue et ne transfère que les suivantes. Vous pouvez supprimer d'anciennes lignes ; si la dernière ligne lue disparaît, l'outil relit les lignes des 7 derniers jours (sans doublon).
- **Ne renommez pas les titres** de la première ligne de RELEASIT (sinon une erreur claire s'affiche dans la page Commandes). Une nouvelle colonne s'ajoute **à la fin**.
- **Pour retirer une commande, annulez-la** dans l'application plutôt que de supprimer sa ligne de Commandes : une ligne supprimée revient tant qu'elle est encore dans les dernières lignes de RELEASIT.
- Lignes sans n° de commande, ou sans nom ni téléphone : ignorées et signalées dans le Journal.

## Importer les commandes Shopify (Releasit COD)

Autre voie, si vous préférez que l'outil lise Shopify directement (il faut alors créer une application Shopify). L'importation automatique ne tourne que lorsque Shopify est configuré.

Toutes les **5 minutes**, les nouvelles commandes de la boutique sont ajoutées à l'onglet Commandes, puis préparées comme les autres (téléphone, wilaya, alertes, statut « À confirmer »). Elles arrivent donc directement dans le centre de confirmation. Une commande déjà présente n'est jamais ajoutée deux fois (le n° de commande Shopify sert de clé). **L'accès est en lecture seule** : rien n'est modifié dans Shopify.

### Configuration (une seule fois)

L'outil lit Shopify avec une « application » que vous créez pour votre boutique. Il lui faut la seule permission **`read_orders`**.

1. Créez l'application et installez-la sur la boutique (voir les étapes dans la conversation, ou la documentation de Shopify : *Dev Dashboard*, ou *Paramètres › Applications › Développer des applications* si votre boutique le permet encore).
2. Relancez **DZ Smart Shop › Installer / réparer le classeur** : colonnes **Campagne** et **ID Shopify**, et réglages `SHOPIFY_*`.
3. **DZ Smart Shop › Shopify › Enregistrer la boutique et l'accès** : adresse de la boutique (`xxxx.myshopify.com`), puis le **jeton d'accès** (`shpat_…`) **ou** l'**identifiant client** suivi de son **secret** (l'outil demande alors lui-même un jeton à Shopify et le renouvelle). Ils sont gardés dans les propriétés du script, jamais dans le classeur. Un test vérifie la connexion, la permission, et **signale une boutique qui n'est pas en dinars algériens**.
4. **Shopify › Importer les commandes maintenant** pour la première importation. L'enregistrement de l'accès active l'importation automatique (toutes les 5 minutes).

### Ce qui est importé

| Shopify (Releasit COD) | Dans le classeur |
|---|---|
| N° de commande `#1035` | N° |
| Champ « الاسم و اللقب » (sinon le nom d'expédition) | Client |
| Champ « رقم الهاتف » (sinon le téléphone de la commande) | Téléphone, remis au format `0660123456` (`+213`, chiffres arabes, 0 manquant) |
| Champ « الولاية » (sinon la ville d'expédition) | Wilaya, reconnue en arabe, en latin ou avec son numéro (« الجزائر », « ولاية سطيف », « Ouargla »…) |
| Champ « العنوان » | Adresse (le titre du champ collé devant la valeur est retiré) |
| « توصيل للمكتب » / « التوصيل للمنزل » | Livraison : Stop desk / Domicile (autre titre : domicile, noté dans les notes) |
| Produit + modèle (variante) | Produit, par exemple « cover iPhone — iphone 13 PRO MAX » |
| Prix des produits, frais de livraison et total de Shopify | Prix, Frais livraison, Total : **le total annoncé au client est gardé tel quel** |
| UTM campaign | Campagne |
| Identifiant Shopify | ID Shopify (pour les mises à jour futures) |

- **La commune n'est pas envoyée par Releasit** : elle reste vide, et la confirmatrice la renseigne pendant l'appel. Une commande sans commune ne peut pas être envoyée à Ecotrack (elle est signalée dans Expéditions). Pour la pré-remplir, ajoutez au formulaire Releasit un champ « commune ».
- **Ignorées** : commandes annulées, commandes d'une autre étiquette que `SHOPIFY_TAG` (`releasit_cod_form` par défaut ; videz la case dans Paramètres pour tout importer).
- **Première importation** : seulement les `SHOPIFY_JOURS_INITIAL` derniers jours (3 par défaut), pour ne pas remplir la file avec d'anciennes commandes. Ensuite, chaque passage reprend là où le précédent s'est arrêté (avec 15 minutes de marge).
- Les commandes annulées dans Shopify **après** leur importation ne sont pas encore retirées du classeur.

Toute autre application ou automatisation qui **ajoute une ligne** dans l'onglet Commandes (statut vide) fonctionne toujours : les colonnes sont retrouvées par leur titre, avec plusieurs variantes (`Order ID`, `Phone`, `Province`…, voir `ORDER_COLUMNS` dans `Config.gs`).

## Tester sans Google (pour les développeurs)

Il faut Node.js 18 ou plus récent, sans aucune dépendance à installer.

```bash
npm test          # 69 tests du code serveur (dont Releasit, Shopify, Ecotrack et le suivi, contre de faux serveurs) sur une imitation du classeur
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
  Ecotrack.gs   création des colis, tarifs, statuts Ecotrack
  Tracking.gs   page Suivi : alertes, argent, versements, chronologie
  Shopify.gs    importation des commandes Shopify (Releasit COD), wilayas en arabe
  Releasit.gs   transfert des commandes de l'onglet RELEASIT (écrites par Releasit COD)
  Api.gs        application web, menu du classeur, fonctions appelées par l'interface
  Setup.gs      création/réparation du classeur et du traitement automatique
  Index.html    page de l'application
  Styles.html   apparence (ordinateur et téléphone)
  App.html      fonctionnement de l'interface
dist/Code.gs    tout le code ci-dessus en un seul fichier (généré par npm run bundle)
tests/          imitation de Google Apps Script, tests, données d'exemple, aperçu
```

## Prochaines étapes prévues

1. **Shopify, sens retour** : étiquette « confirmée » ou annulation dans Shopify quand une commande est confirmée ou annulée dans l'outil, et retrait des commandes annulées dans Shopify (demande la permission `write_orders`).
2. **Liste des communes** d'Ecotrack en liste déroulante dans la confirmation, si Ecotrack fournit un point de terminaison pour cela.
3. **SMS avec httpSMS** : SMS automatique à la commande, confirmation par réponse « 1 » / « 2 ».
4. **Yalidine** (Ecotrack est fait) : création des colis, suivi des statuts, et impression des bordereaux pour les deux sociétés.
5. **Stock et bénéfice réel** par commande, et taux de confirmation par campagne publicitaire.

## Limites connues

- Chaque action prend 1 à 2 secondes : Apps Script est plus lent qu'une application classique.
- Au-delà de quelques dizaines de milliers de lignes, le classeur ralentit. Il faudra alors archiver les anciennes commandes, par exemple dans un classeur par année.
- La liste des wilayas est celle des 58 wilayas. Si le découpage change, ajoutez les nouvelles lignes dans l'onglet Tarifs : l'application utilise cette liste.
