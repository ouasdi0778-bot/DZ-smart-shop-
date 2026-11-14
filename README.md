# DZ Smart Shop — gestion des commandes COD

Outil de gestion des commandes en paiement à la livraison (COD) pour l'Algérie.

- **Les données** sont dans un classeur **Google Sheets** : vous pouvez toujours l'ouvrir et le modifier à la main.
- **L'application** (tableau de bord, commandes, centre de confirmation) est servie par **Google Apps Script**, gratuitement, et s'ouvre avec un simple lien sur PC et sur Android.
- Tout tourne chez Google : **votre PC peut être éteint**.

## Ce que fait la version 1.0

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Commandes reçues, taux de confirmation et de livraison, montant livré, argent en route, liste « à faire », taux de livraison par wilaya, résultats par confirmatrice et par produit |
| **Commandes** | Liste filtrable (statut, wilaya, période, recherche par nom, téléphone, n° de commande ou de suivi), modification d'une commande, ajout à la main, liste noire |
| **Centre de confirmation** | File d'appels (rappels dus en premier, puis les commandes les plus récentes : réglage `ORDRE_FILE`), fiche client avec historique et alerte, boutons Appeler et WhatsApp (message pré-rempli), correction de la commande avec recalcul des frais et du total, résultat en un clic : Confirmer, Pas de réponse, Rappeler plus tard, Annuler (avec motif) |
| **Expéditions** | Commandes confirmées prêtes à partir (avec les problèmes à corriger avant l'envoi), **création des colis chez Ecotrack** en un clic avec n° de suivi écrit dans le classeur, **impression des bordereaux** Ecotrack (A4 ou étiquette 10×15) et **validation de l'expédition** (avec ou sans ramassage) |
| **Suivi** | Statut de chaque colis relu toutes les 30 minutes, **alertes « à traiter »** (colis suspendu, retour en cours ou bloqué, sans mouvement selon l'étape, argent en retard…), **résultat de l'appel** (remarque au livreur, demande de retour), motif du livreur, **où est l'argent** et **chronologie** de chaque colis |
| **Stock** | Catalogue par modèle, entrées, inventaire, historique (administrateur et magasinier) |
| **Bénéfices** | Bénéfice des commandes, dépenses (publicité comprise), rentabilité par produit et par campagne (administrateur) |
| **Statistiques** | Commandes et argent par période, comparés à la période d'avant : parcours des commandes, motifs, heures, wilayas, produits, équipe (avec la prime), publicité ; export pour Excel (administrateur) |
| **Administration** | État de l'outil, connexions (Ecotrack, SMS, Shopify, Releasit), réglages en formulaires, équipe, clients, entretien du classeur (administrateur) |

Ce qui se passe tout seul :

- **Une seule tâche automatique chaque minute** fait le travail régulier, puis s'arrête tout de suite s'il n'y a rien à faire : commandes Releasit (chaque minute), SMS en attente, nouvelles lignes et Shopify (toutes les 5 minutes), statuts Ecotrack (toutes les 30 minutes). Une deuxième tâche fait l'entretien **chaque nuit à 3 h**. En cas de panne, **un e-mail part au propriétaire** (voir « État de l'outil »).
- **Chaque minute**, les nouvelles commandes écrites par Releasit COD dans l'onglet RELEASIT sont recopiées dans Commandes (voir plus bas).
- **Toutes les 5 minutes**, chaque nouvelle ligne de l'onglet Commandes (statut vide) est préparée :
  - le téléphone est remis au format `0550123456` ;
  - la wilaya est écrite comme dans la liste (`16 - Alger`) ;
  - les frais de livraison sont pris dans l'onglet Tarifs et le total est calculé ;
  - l'alerte client est calculée ;
  - la commande passe « À confirmer ».
- **Alertes client** : `Liste noire`, `Numéro invalide`, `Doublon` (même numéro en moins de 48 h), `Risque · 2 refus`, `Fiable · 3/3 livrées`, `Nouveau client`.
- **Pas de réponse** : jusqu'à **3 appels par jour** (espacés de 2 h), puis rappel **le lendemain à 9 h**, pendant **3 jours**. Sans réponse après le 3ᵉ jour, la commande est **annulée automatiquement**, avec le motif « Injoignable (annulation automatique) ». Elle peut être remise à confirmer si le client rappelle. Détails plus bas.
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

Après l'installation, presque tout se règle dans l'application, page **Administration** (administrateur) : connexions, réglages, équipe, clients. Le menu **DZ Smart Shop** du classeur ne garde que le secours : ouvrir l'application, installer / réparer, archiver, restaurer une commande.

- **Tarifs** : le prix de livraison de chaque wilaya, à domicile et en stop desk, pour Yalidine et Ecotrack.
- **Équipe** (**Administration › Équipe**, ou l'onglet Équipe) : l'adresse Gmail, le prénom et le rôle : « Administrateur » (tout), « Confirmatrice », « Magasinier » (en plus, le stock). Depuis l'application, le classeur est **partagé automatiquement** avec la personne ajoutée, et son accès est retiré quand on la retire. Le premier administrateur s'ajoute dans l'onglet Équipe du classeur.
- **Réglages** (**Administration › Réglages**, ou l'onglet Paramètres) : nom de la boutique, appels, suivi, SMS, stock, bénéfices… en formulaires classés, avec vérification des valeurs.
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

## Le parcours d'une commande

Chaque page correspond à une étape. Une commande passe toute seule à la suivante.

| Page | Commandes | Elles en sortent quand… |
|---|---|---|
| **Commandes** (onglet « À traiter ») | À confirmer, Pas de réponse, Rappeler, Injoignable | elles sont confirmées (→ Expédier) ou annulées (→ onglet **✕ Annulées** de la même page, avec le **motif** sous le statut) |
| **Expédier** | Confirmées : à expédier, puis colis créés à valider | vous imprimez le bordereau et validez l'expédition (dans l'outil ou sur le site d'Ecotrack), ou vous cliquez « Expédiée (autre société) » (→ Suivi) |
| **Suivi › En cours** | Expédiées, en livraison, retours en cours | elles sont livrées, ou le retour est reçu (→ Terminées) |
| **Suivi › Terminées** | Livrées (avec l'état de l'argent : à recevoir, payé), retours reçus | elles sont archivées après 100 jours |

- **🗑 Corbeille** (administrateur) : les commandes supprimées, avec la date, l'auteur et le motif, et un bouton **Restaurer**.
- ⚠️ **N'effacez pas de lignes à la main dans l'onglet Commandes** : elles disparaissent sans trace. Utilisez « Annuler » ou « Supprimer » (Corbeille).
- **Le menu** affiche, à côté de Confirmation, **« à appeler maintenant / total en attente »** (par exemple 5/12 : ni confirmées ni annulées), le nombre de commandes à expédier (Expédier) et les alertes (Suivi).
- **La recherche** de la page Commandes (nom, téléphone, n°) trouve **toutes** les commandes, où qu'elles soient, et indique leur page (« → Expédier », « → Suivi › Terminées »…).
- Avant la création du colis, une commande confirmée peut être **remise à confirmer** (bouton Modifier dans Expédier).
- Le tableau de bord et les bénéfices comptent toujours toutes les commandes.

## Appels sans réponse

| Réglage (Paramètres) | Par défaut | Rôle |
|---|---|---|
| `APPELS_PAR_JOUR` | 3 | Appels sans réponse au maximum par jour |
| `DELAI_RAPPEL_MINUTES` | 120 | Délai entre deux appels du même jour |
| `HEURE_DEBUT_APPELS` | 9 | Heure du rappel du lendemain |
| `JOURS_D_APPELS` | 3 | Jours d'appels, comptés depuis l'arrivée de la commande (jour 1 = jour de la commande) |
| `ANNULATION_AUTO` | OUI | OUI : annulée après les jours d'appels ; NON : passe « Injoignable » |
| `ORDRE_FILE` | récentes | Nouvelles commandes de la file : « récentes » d'abord, ou « anciennes » |

- La fiche affiche **jour 2/3 · 1/3 appels aujourd'hui** ; la colonne « Appels du jour » garde ce compte.
- **Chaque nuit**, les commandes sans réponse dont les jours d'appels sont passés sont annulées, même si tous les appels n'ont pas été faits.
- **Jamais annulées automatiquement** : une commande « Rappeler » (le client a répondu), ou une commande jamais appelée.
- Une commande **jamais appelée depuis plus de 24 h** est signalée en rouge dans la file et au tableau de bord : avec l'ordre « récentes d'abord », elle pourrait sinon être oubliée.
- L'ancien réglage `MAX_TENTATIVES` n'est plus utilisé.

## Envoyer les colis à Ecotrack

L'intégration suit la [documentation de l'API Ecotrack](https://documenter.getpostman.com/view/14517169/Tz5je15g).

### Configuration (une seule fois)

1. Collez le nouveau `dist/Code.gs` dans Apps Script, puis 💾 **Enregistrer**.
2. Relancez **DZ Smart Shop › Installer / réparer le classeur**. Google demande une **nouvelle autorisation** (« se connecter à un service externe ») : acceptez.
3. Dans l'application : **Administration › Connexions › Ecotrack** : saisissez l'adresse de votre plateforme (ex. `https://monsociete.ecotrack.dz`) puis votre jeton API, et cliquez **Enregistrer et tester**. Le jeton est gardé dans les **propriétés du script** : il n'est jamais écrit dans le classeur ni dans le code, et la page n'en montre que la fin (« ••••1234 »). Pour changer seulement l'adresse, laissez le jeton vide.
4. **Administration › Connexions › Récupérer les tarifs** : remplit les colonnes « Ecotrack domicile » et « Ecotrack stop desk » de l'onglet Tarifs. Une case reste vide quand le service n'existe pas (stop desk à 0 chez Ecotrack, wilaya non desservie). Les colonnes Yalidine ne sont pas touchées, et vous pouvez toujours corriger un prix à la main.
5. **Déployer › Gérer les déploiements › ✏️ › Version : Nouvelle version** pour que l'application web utilise le nouveau code. Chaque confirmatrice devra accepter la nouvelle autorisation à sa prochaine ouverture.

### Au quotidien

1. Page **Expéditions › À expédier** : sélectionnez les commandes **prêtes**, puis **Envoyer à Ecotrack**. Une commande avec un problème (téléphone invalide, adresse ou commune manquante, wilaya non desservie, stop desk indisponible…) est signalée et se corrige avec **Modifier**.
2. L'outil **crée** le colis chez Ecotrack et écrit son **n° de suivi** dans le classeur. **Il ne l'expédie pas** : la commande reste « Confirmée » et apparaît dans l'onglet **Créés, à valider** (les colis tout juste créés y sont déjà cochés).
3. **Imprimez les bordereaux** (voir ci-dessous), collez-les sur les colis, puis **validez l'expédition** : bouton **✓ Valider l'expédition**, ou sur le site d'Ecotrack. La commande passe « Expédiée », puis « En livraison », « Livrée » ou « Retour » toute seule.
4. Si Ecotrack refuse un colis (par exemple « Commune mal écrite »), le motif est affiché et la commande reste sans n° de suivi : corrigez-la, puis renvoyez-la.
5. Une erreur dans un colis **pas encore validé** ? **Annuler le colis** (dans la commande, ou dans l'onglet *Créés, à valider*) le supprime chez Ecotrack : la commande redevient « Confirmée » et modifiable, puis vous recréez le colis. Un colis déjà validé ne peut plus être annulé depuis l'outil (demande de retour chez Ecotrack).

### Bordereaux

- Onglet **Créés, à valider** : cochez les colis (ou **Tout sélectionner**), choisissez le **format**, puis **🖨 Imprimer les bordereaux**.
  - **A4 · 4 par feuille** (imprimante normale), avec des traits de coupe ;
  - **Étiquette 10×15** (imprimante thermique), un bordereau par étiquette.
- **Chaque appareil retient son format.** Le format proposé au départ est le réglage `FORMAT_BORDEREAU` (`A4` ou `10x15`).
- Ce sont les **bordereaux officiels d'Ecotrack** (avec leur code-barres), réunis dans **un seul PDF**. Le PDF s'ouvre dans un nouvel onglet : cliquez sur l'imprimante. Réglez l'échelle sur **taille réelle (100 %)** ; pour la thermique, papier **100 × 150 mm** sans marge. Sur téléphone, ouvrez le fichier puis « Imprimer » ou « Partager ».
- Chaque colis affiche **🖨 Imprimé le … par …** (colonne « Bordereau imprimé » des commandes), ou **Pas imprimé**. Le filtre **Pas encore imprimés** les retrouve.
- **Réimprimer** : bouton **🖨 Bordereau** dans la fiche de la commande (colis créé ou en route). La réimpression est notée dans le Journal.
- Un colis **annulé puis recréé** a un nouveau n° de suivi : il affiche **À réimprimer**, l'ancien bordereau ne vaut plus rien.
- Le premier usage télécharge l'outil de mise en page des PDF (pdf-lib, depuis jsDelivr ou unpkg) : il faut une connexion internet, et le fichier est vérifié par son empreinte.

### Valider l'expédition

- Bouton **✓ Valider l'expédition** (onglet *Créés, à valider*), réservé à l'**administrateur** et au **magasinier** (onglet Équipe), car c'est **définitif** : ensuite, Ecotrack ne permet plus de modifier ni d'annuler le colis (il faudra une demande de retour).
- La fenêtre de confirmation prévient si des colis **n'ont pas de bordereau imprimé** dans l'outil (vous pouvez valider quand même, par exemple si vous l'avez imprimé sur le site d'Ecotrack).
- Case **Demander le ramassage** : cochée par défaut selon le réglage `RAMASSAGE` (`OUI`). Décochez-la si vous déposez les colis à l'agence.
- Après la validation : la commande passe **« Expédiée »** et va dans **Suivi**, le **stock baisse** (« Colis parti ») et le **SMS « expédiée »** part. Un refus d'Ecotrack est affiché avec son motif, et la commande reste « Confirmée ».
- **Vous pouvez aussi valider sur le site d'Ecotrack** : à l'ouverture de l'onglet *Créés, à valider*, l'outil relit ces colis chez Ecotrack (au plus une fois par minute) ; ceux déjà validés passent tout de suite dans Suivi. Sinon, la lecture automatique des statuts le fait dans les 30 minutes.

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

## Commandes verrouillées et corbeille

Une commande ne se modifie plus dès que son colis existe chez la société de livraison, pour que le classeur et Ecotrack disent toujours la même chose.

| Étape | Statuts | Modifiable | Actions |
|---|---|---|---|
| En confirmation | À confirmer, Pas de réponse, Rappeler, Injoignable | Tout | Annuler, Supprimer (administrateur) |
| Confirmée, pas encore envoyée | Confirmée sans n° de suivi | Tout | Annuler, revenir « À confirmer », Supprimer (administrateur) |
| Colis créé chez Ecotrack, pas encore validé | Confirmée avec n° de suivi | 🔒 Notes seulement | **Annuler le colis** : supprimé chez Ecotrack, la commande se déverrouille |
| Colis validé, en route | Expédiée, En livraison | 🔒 Notes seulement | Le statut vient d'Ecotrack |
| Terminée | Livrée, Retour, Annulée | 🔒 Notes seulement | Une commande annulée **avant l'envoi** peut être **remise à confirmer** |

- **Statuts de livraison** : avec Ecotrack, « Expédiée », « En livraison », « Livrée » et « Retour » arrivent tout seuls et ne se choisissent pas à la main. Avec une société sans connexion (Yalidine pour l'instant), vous les saisissez, toujours vers l'avant : une commande expédiée ne revient pas « À confirmer ».
- **Déverrouillage exceptionnel** : un **administrateur** (rôle « Administrateur » dans l'onglet Équipe) peut cliquer **Modifier quand même**. Le motif est obligatoire et noté dans le Journal. Le colis chez Ecotrack, lui, ne change pas.
- **Supprimer** (administrateur, seulement avant tout envoi) : la commande part dans l'onglet **Corbeille** avec la date, l'auteur et le motif. Releasit et Shopify ne la font pas revenir. Pour la récupérer : page **Commandes › 🗑 Corbeille** (bouton **Restaurer**), ou menu **DZ Smart Shop › Restaurer une commande de la corbeille**.
- Les verrous s'appliquent dans l'application. Dans le classeur, les cases restent modifiables à la main (les confirmatrices ont besoin du droit d'écriture pour que l'application fonctionne) : un garde-fou est prévu plus tard.

## Suivi des colis

La page **Suivi** réunit :

- **À traiter** (le nombre apparaît sur le menu et sur le tableau de bord) :

  | Alerte | Quand |
  |---|---|
  | 🔴 **Colis suspendu** | le livreur n'a pas pu livrer : appelez le client |
  | 🔴 **Retour en cours** | le colis revient : dernière chance de sauver la commande |
  | 🔴 **Retour bloqué** | retour en route depuis plus de 7 jours (`RETOUR_BLOQUE_JOURS`) : réclamez-le à Ecotrack |
  | 🟠 **Sans mouvement** | ramassage ou centre de tri : 48 h (`SUIVI_HEURES_TRI`) ; en route vers la wilaya : 72 h (`SUIVI_HEURES_ROUTE`), **120 h pour le Sud** (`SUIVI_HEURES_SUD`, wilayas de `WILAYAS_SUD`) ; en livraison : 24 h (`SUIVI_HEURES_LIVRAISON`) |
  | 🟠 **Argent en retard** | livré depuis plus de 5 jours (`ARGENT_RETARD_JOURS`) et toujours pas payé (colonne « Livrée le ») |
  | 🟠 **À valider chez Ecotrack** | colis créé et pas validé depuis 26 h (`SUIVI_ALERTE_HEURES`) |
  | 🟠 / 🔵 | colis introuvable, statut inconnu |

- **Le motif du livreur** : quand un colis passe « suspendu » ou « retour », l'outil lit ses remarques chez Ecotrack (`get/maj`) et garde la dernière dans la colonne « Remarque livreur ». Une étiquette s'affiche selon des mots-clés en français et en arabe, modifiables dans Paramètres : 🟠 **Injoignable** (`MOTS_INJOIGNABLE`), 🔴 **Refus** (`MOTS_REFUS`), 🔵 **Reporté** (`MOTS_REPORTE`), 🟣 **Adresse** (`MOTS_ADRESSE`). La **Chronologie** montre tout l'échange : le livreur à gauche, vous à droite.
- **Résultat de l'appel** (colis suspendu, retour en cours, en livraison depuis trop longtemps) :

  | Résultat | Ce que fait l'outil |
  |---|---|
  | ✅ Prévenu, il attend | l'alerte se ferme |
  | 📅 Reporter (jour et heure) | remarque au livreur : « Vendeur : client disponible le 16/11 à partir de 14h00. Merci de relivrer. » ; l'alerte revient ce jour-là si le colis n'est pas livré |
  | 📍 Nouvelle adresse ou nouveau téléphone | remarque au livreur (255 caractères au plus), et ligne dans les notes de la commande |
  | ❌ Il refuse | **demande de retour** chez Ecotrack (seulement pour un colis en livraison ; la société peut l'ignorer) et client **signalé** « a refusé un colis » dans l'onglet Clients (colonne « Signalé ») : ses prochaines commandes l'affichent. **Pas de liste noire.** |
  | 📵 Pas de réponse | rappel dans 2 h (`DELAI_RAPPEL_MINUTES`), 3 essais ; au 3ᵉ, l'outil **propose** « Demander le retour » ou « Laisser le livreur réessayer » |

  Les autres alertes gardent **Marquer comme traité** : elles disparaissent jusqu'au prochain changement du colis (ou pendant leur délai, pour une alerte liée au temps). Chaque action est notée dans le Journal.
- **Où est l'argent** : chez le livreur, livré pas encaissé, encaissé pas payé, prêt à être versé, payé (sur 7, 30 ou 90 jours), et la liste des **versements** (n° fourni par Ecotrack). Les montants sont les totaux à encaisser, avant déduction des frais d'Ecotrack.
- **Colis en cours**, filtrables : à valider, en route, en livraison, suspendus, retours.
- **Chronologie** d'un colis (`get/tracking/info`), aussi dans la fiche de chaque commande : validé, récupéré, au centre de tri, confié au livreur, tentative de livraison, livré, encaissé, payé… Si la réponse d'Ecotrack n'est pas reconnue, elle est affichée telle quelle.
- Après la livraison, un colis Ecotrack reste suivi **jusqu'au versement de l'argent** (encaissé, prêt, payé), et un retour **jusqu'à sa réception**.

## Stock (page à part)

Page **Stock** (menu de gauche ; sur téléphone : **☰ Plus**), pour l'**administrateur** et le rôle **« Magasinier »** de l'onglet Équipe. Le magasinier voit le stock et fait les entrées et inventaires, mais ne voit pas les bénéfices.

**Le catalogue** (onglet Produits : Produit | Modèle | Prix de vente | Coût d'achat | Stock | Seuil d'alerte | Autres noms | Actif) :
- **+ Produit** : nom, prix, coût, seuil, et les modèles avec leur stock de départ (« iphone 13 = 10 », un par ligne).
- **Modifier** : nom, prix, coût, seuil, **autres noms** (autres écritures du modèle dans les commandes, séparées par « ; »), **actif** (décoché : plus proposé pour les nouvelles commandes, gardé pour l'historique). Si vous renommez un modèle, l'ancien nom est gardé dans « autres noms » : les commandes passées restent reliées.
- **Modèles vus dans les commandes mais absents du catalogue** : bouton **Ajouter**, avec leur prix de vente moyen.
- Dans **« + Nouvelle commande »**, choisir un produit de la liste remplit le prix (prix de vente × quantité).

**Les mouvements** (onglet « Mouvements stock » : date, modèle, mouvement, quantité, stock après, coût, commande, auteur, note) :

| Mouvement | Comment | Effet |
|---|---|---|
| Stock initial | À la création du produit | + |
| **Entrée** de marchandise | Formulaire : un produit, la quantité reçue par modèle, coût unitaire et fournisseur facultatifs | + ; avec `COUT_MOYEN` = OUI, le coût d'achat devient la moyenne (10 à 600 DA + 20 à 690 DA = 660 DA) |
| Colis parti | Automatique (Expédiée, En livraison, Livrée) | − |
| Retour reçu | Automatique (Ecotrack : « retour reçu » ; société sans connexion : statut Retour) | + |
| Retour abîmé | Bouton **« Abîmé ? »** dans Suivi › Terminées, sur un retour reçu | − (il ne peut pas être revendu) |
| **Inventaire** | Formulaire : la quantité comptée par modèle, et un motif (comptage, perte, casse, erreur, cadeau, autre) | L'écart est noté |

- **Réservé** : une commande **confirmée** réserve ses produits ; disponible = stock − réservé. « **Stock insuffisant** » s'affiche à la confirmation si le modèle manque (la confirmation reste possible). Une annulation libère la réservation.
- Chaque commande ne compte **qu'une fois** (colonne « Mouvement stock » des commandes : « Sorti », « Rentré », « Rentré (abîmé) »). Les commandes déjà parties avant l'installation du suivi sont marquées « Avant le suivi du stock ».
- **La page** montre la valeur du stock, les pièces, les modèles en **stock bas** (disponible ≤ seuil de la ligne, sinon `STOCK_SEUIL`) et en **rupture** (aussi au tableau de bord), le stock / réservé / disponible par modèle, et l'**historique** de chaque modèle.
- **Stock vide** = modèle non suivi. Évitez de modifier la colonne Stock à la main : l'entrée ou l'inventaire gardent une trace.

## Bénéfices et dépenses

Page **Bénéfices** (menu de gauche ; sur téléphone : **☰ Plus**), visible seulement par l'**administrateur** (rôle « Administrateur » dans l'onglet Équipe). Les commandes y comptent à leur **date de commande**.

| Commande | Bénéfice |
|---|---|
| Livrée | Ventes des produits − **livraison** − coût d'achat × quantité − emballage (`COUT_EMBALLAGE`) |
| Retour | − frais de retour (`FRAIS_RETOUR`, 50 DA) − emballage |
| En route, en confirmation, annulée | Non comptée |

- **Onglet Dépenses** (la publicité en fait partie) : **Date | Catégorie | Campagne | Montant | Devise (DA ou USD) | Taux | Note**.
  - Les catégories se règlent dans `CATEGORIES_DEPENSES`.
  - Une dépense en dollars prend le **taux du jour** (`TAUX_DOLLAR`) quand elle est saisie dans l'application, ou la première fois qu'elle est lue si elle est tapée dans le classeur. Changer le taux plus tard ne modifie pas les anciennes dépenses.
- **Livraison** = prix de la société de livraison (onglet Tarifs ; ceux d'Ecotrack sont récupérés par l'API) **− livraison payée par le client**. Positive, elle vous coûte (par exemple 700 − 450 = 250, ou 700 en livraison gratuite). Négative, vous gagnez dessus (par exemple 400 − 600 = −200). Le bénéfice est le même que « total encaissé − prix de la société − achat » ; la livraison est simplement montrée à part.
- **Résumé** : ventes des produits, livraison, bénéfice des commandes, dépenses, **bénéfice net**, publicité par commande livrée, avec le détail ligne par ligne. Un avertissement apparaît s'il manque un coût d'achat ou un tarif de livraison ; dans ce cas, les frais payés par le client sont utilisés.
- **Produits** : commandes, livrées, retours, taux de livraison, chiffre livré et bénéfice par modèle.
- **Publicité** :
  - **par plateforme** (Facebook, TikTok, selon « UTM source ») et **par campagne** (« UTM campaign ») : commandes, livrées, bénéfice, dépense, **net**, publicité par commande livrée ;
  - pour relier commandes et publicités, ajoutez « UTM source » et « UTM campaign » à la fin de l'onglet RELEASIT, et dans le lien des annonces : `utm_source=facebook&utm_campaign={{campaign.name}}` (Facebook) ou `utm_source=tiktok&utm_campaign=__CAMPAIGN_NAME__` (TikTok) ;
  - écrivez le même nom de campagne dans vos dépenses.
- **Dépenses** : ajout rapide depuis le téléphone, et liste de la période.

## Statistiques

Page **Statistiques** (administrateur ; sur téléphone : **☰ Plus**).

- **Période** : aujourd'hui, 7 jours, 30 jours, ce mois, le mois dernier, ou des dates précises. Chaque chiffre est **comparé à la période d'avant** (▲ / ▼ en % pour un nombre, en points pour un taux).
- Les commandes comptent à leur **date de commande**, archives comprises.

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | Commandes, taux de confirmation, de livraison, retours, annulées, encaissé, bénéfice net ; parcours reçues → confirmées → expédiées → livrées ; graphique par jour |
| **Commandes** | Motifs d'annulation, motifs du livreur (injoignable, refus…), commandes **par heure** et **par jour de la semaine** |
| **Argent** | À recevoir, chez le livreur, **argent prévu** (en route × taux de livraison) ; encaissé, bénéfice, dépenses, bénéfice net, panier moyen, bénéfice par livrée, **perdu à cause des retours**, délai moyen de livraison ; graphique par jour |
| **Wilayas** | Commandes, taux de confirmation et de livraison, retours, délai moyen, encaissé, bénéfice, perdu ; les wilayas avec beaucoup de retours sont **en rouge** |
| **Produits** | Par produit et modèle : commandes, livrées, retours, taux de retour, encaissé, bénéfice |
| **Équipe** | Par confirmatrice : commandes, confirmées, livrées, **taux de livraison**, **délai avant confirmation** (colonne « Confirmée le »), **prime** |
| **Publicité** | Par source et par campagne : commandes, livrées, dépense, **coût par livrée**, bénéfice, net |

- **Exporter** : chaque tableau se télécharge en fichier pour Excel.
- **Prime des confirmatrices** (onglet Équipe) : un montant en dinars **par commande livrée**, avec sa date de début. Un nouveau montant ne change pas les jours d'avant (réglage `PRIMES`, ex. `2026-11-01=50; 2027-01-01=60`). La prime d'un mois se complète au fil des livraisons.
- **Rapide** : chaque nuit, un résumé par jour est calculé dans l'onglet caché **Stats** ; la page lit seulement les jours de la période et calcule aujourd'hui en direct. Bouton **Recalculer** pour tout refaire tout de suite.

## Administration et état de l'outil

Page **Administration** (administrateur). Elle remplace le menu du classeur.

| Onglet | Contenu |
|---|---|
| **État de l'outil** | Chaque tâche automatique (Releasit, SMS, nouvelles lignes, Shopify, statuts Ecotrack, entretien de nuit) : dernier passage, durée, erreur ; **consommation du jour** sur la limite de Google ; dernières erreurs du Journal ; **Réinstaller les tâches automatiques** |
| **Connexions** | Ecotrack, SMS (httpSMS), Shopify, Releasit : enregistrer, tester, récupérer les tarifs, importer, transférer. Les clés ne sont **jamais affichées** (« ••••1234 ») ; laissez le champ vide pour garder l'actuelle |
| **Réglages** | Tous les réglages en formulaires classés ; les **SMS en arabe avec aperçu** et le nombre de SMS (70 caractères par SMS en arabe) |
| **Équipe** | Ajouter (avec partage du classeur), changer le rôle, retirer (avec retrait de l'accès) |
| **Clients** | Liste noire (ajouter, retirer) et clients **signalés** (retirer le signalement) |
| **Classeur** | Réparer, archiver et alléger maintenant, recalculer les statistiques, corbeille |

**Les tâches automatiques** :

- Il n'y en a plus que deux : **chaque minute** (tout le travail régulier) et **chaque nuit à 3 h** (entretien). Elles tournent **au nom du propriétaire** du classeur : lui seul peut les réinstaller.
- Google limite leur temps de travail : environ **90 minutes par jour** pour un compte Gmail, 360 pour Google Workspace (réglage `LIMITE_MINUTES_JOUR`). La page affiche la consommation du jour.
- **E-mail au propriétaire** (à lui seul) quand une tâche échoue **2 fois de suite**, quand elle ne passe plus (par exemple statuts Ecotrack pas relus depuis 3 h), ou à **80 %** de la limite. Une seule fois par problème, puis un e-mail « c'est réparé ».
- L'administrateur voit un **bandeau rouge** en haut de l'application si une tâche est en panne ou si la tâche de chaque minute ne tourne plus.

## SMS automatiques (httpSMS)

Les SMS partent de **votre téléphone Android**, avec l'application httpSMS et votre carte SIM.

1. Installez l'application httpSMS sur le téléphone et connectez-la à votre compte.
2. Sur httpsms.com, réglez éventuellement le nombre de SMS par minute et les heures d'envoi.
3. Dans l'application : **Administration › Connexions › SMS**. Collez la **clé API de la page Settings** de httpsms.com (pas la « Phone API key »), puis le numéro de la carte SIM. Tout est gardé dans les propriétés du script, jamais dans le classeur. Boutons **SMS de test** et **Envoyer maintenant**.
4. **Envoyer un SMS de test** : il part de la carte SIM et arrive sur le même numéro.

Fonctionnement :

- **Un texte par statut**, en arabe, dans **Administration › Réglages › SMS** (avec l'aperçu et le nombre de SMS) : `SMS_A_CONFIRMER`, `SMS_PAS_DE_REPONSE`, `SMS_CONFIRMEE`, `SMS_EXPEDIEE`, `SMS_EN_LIVRAISON`… **Texte vide = pas de SMS** : c'est le cas par défaut de Rappeler, Injoignable, Livrée, Retour et Annulée.
- **Champs remplacés** : `{prenom}` `{client}` `{numero}` `{produit}` `{total}` `{suivi}` `{commune}` `{wilaya}` `{boutique}`.
- Quand le statut change (centre de confirmation, Ecotrack, modification, nouvelle commande), le SMS part **dans la minute**, en arrière-plan.
- Le SMS **« commande reçue »** part dans le **même passage** que l'arrivée de la commande depuis RELEASIT : en moyenne **30 secondes** après la commande, 1 minute au plus. Google ne permet pas de regarder l'onglet plus souvent.
- **Une seule fois par statut** et par commande : colonne « SMS envoyés ».
- **Deux SMS de suivi**, une seule fois par commande, tant que le colis est en route :
  - `SMS_LIVREUR_INJOIGNABLE` : le livreur signale le client **injoignable**, ou suspend le colis **sans remarque** (pas de SMS pour un refus, un report ou une adresse) ;
  - `SMS_SANS_REPONSE_LIVRAISON` : vous appelez le client pendant la livraison et il **ne répond pas** (au premier appel seulement).
  - Le SMS « Pas de réponse » habituel (`SMS_PAS_DE_REPONSE`) reste celui de l'étape de confirmation.
- **Heures d'envoi** : `SMS_HEURES` vaut **0-24** par défaut, donc les SMS partent **à toute heure**. Mettez par exemple 8-21 pour que ceux de la nuit attendent le matin.
- **Jamais de SMS** :
  - aux numéros invalides ni à la liste noire ;
  - pour un statut déjà dépassé quand le SMS devrait partir ;
  - pour une commande reçue il y a plus de 24 h (par exemple au premier transfert de l'onglet RELEASIT).
- **En cas de problème** :
  - si httpSMS est injoignable, le SMS est réessayé ;
  - si la clé est refusée, une erreur claire s'affiche dans la page Commandes, et les SMS attendent.
- La page **Commandes** montre l'état : numéro, heures, SMS en attente, statuts avec SMS, et un bouton **Envoyer maintenant**.
- **Limites** :
  - un SMS en arabe tient en 70 caractères ; un texte plus long compte pour plusieurs SMS ;
  - l'outil sait que le SMS est parti vers votre téléphone, pas s'il est arrivé chez le client.

## Sécurité et fiabilité (Ecotrack)

- Le jeton est envoyé uniquement à l'adresse enregistrée, en `https`, et les redirections ne sont jamais suivies.
- Un bordereau rangé ailleurs par Ecotrack (lien ou redirection vers leur stockage) est téléchargé **sans** le jeton.
- Une validation ne peut pas partir deux fois : seuls les colis « créés, pas encore validés » sont envoyés, un colis en cours de validation est verrouillé, et si la réponse se perd, l'outil relit le statut chez Ecotrack avant de conclure.
- Une commande ne peut pas être créée deux fois : seules les commandes **Confirmée** sans n° de suivi sont envoyées, et une commande en cours d'envoi est verrouillée.
- Si la connexion est coupée en plein envoi, l'outil cherche chez Ecotrack (par notre numéro de commande) si le colis a été créé avant de conclure : pas de doublon.
- Les limites d'Ecotrack (50 requêtes par minute) sont respectées : jusqu'à 100 commandes par requête, et attente automatique en cas d'erreur 429.

## Pas encore pris en charge (Ecotrack)

- Modifier un colis : à faire dans l'interface d'Ecotrack (une commande annulée dans l'outil après la création de son colis n'est **pas** annulée chez Ecotrack ; avant la validation, utilisez « Annuler le colis »).
- Choisir un bureau précis pour le stop desk : l'API ne demande que « domicile » ou « stop desk ».
- Yalidine.

## Commandes Releasit COD : arrivée automatique (onglet RELEASIT)

C'est la voie la plus simple, **sans accès Shopify** : Releasit COD écrit lui-même chaque nouvelle commande dans l'onglet **RELEASIT** du classeur (intégration Google Sheets de Releasit). **Chaque minute**, l'outil recopie les nouvelles lignes dans l'onglet Commandes, puis les prépare comme les autres (téléphone, wilaya, alertes, statut « À confirmer »). Elles arrivent donc directement dans le centre de confirmation. L'outil vérifie aussi l'onglet dès qu'on ouvre les pages **Commandes** ou **Confirmation**.

### Configuration (une seule fois)

1. Dans le classeur, créez un onglet vide nommé **RELEASIT**.
2. Dans Shopify : **Releasit COD Form › Intégrations › Google Sheets**. Connectez le compte Google du classeur, choisissez le classeur et l'onglet **RELEASIT**, et cochez au moins : n° de commande, date, nom, téléphone, wilaya, commune, adresse, produit et variante, quantité, prix, sous-total, frais de livraison, total, **type de livraison**.
3. Collez la nouvelle version du code, puis **DZ Smart Shop › Installer / réparer le classeur** : la tâche de chaque minute transfère les commandes dès que l'onglet RELEASIT existe.
4. **Administration › Connexions › Releasit** : montre si l'onglet est trouvé, le dernier passage et les informations absentes, avec **Transférer maintenant**.

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
- **Pour retirer une commande, annulez-la, ou mettez-la à la Corbeille** (bouton Supprimer, administrateur) : elle ne reviendra pas. Une ligne effacée à la main dans Commandes, elle, revient tant qu'elle est encore dans les dernières lignes de RELEASIT.
- Lignes sans n° de commande, ou sans nom ni téléphone : ignorées et signalées dans le Journal.

## Importer les commandes Shopify (Releasit COD)

Autre voie, si vous préférez que l'outil lise Shopify directement (il faut alors créer une application Shopify). L'importation automatique ne tourne que lorsque Shopify est configuré.

Toutes les **5 minutes**, les nouvelles commandes de la boutique sont ajoutées à l'onglet Commandes, puis préparées comme les autres (téléphone, wilaya, alertes, statut « À confirmer »). Elles arrivent donc directement dans le centre de confirmation. Une commande déjà présente n'est jamais ajoutée deux fois (le n° de commande Shopify sert de clé). **L'accès est en lecture seule** : rien n'est modifié dans Shopify.

### Configuration (une seule fois)

L'outil lit Shopify avec une « application » que vous créez pour votre boutique. Il lui faut la seule permission **`read_orders`**.

1. Créez l'application et installez-la sur la boutique (voir les étapes dans la conversation, ou la documentation de Shopify : *Dev Dashboard*, ou *Paramètres › Applications › Développer des applications* si votre boutique le permet encore).
2. Relancez **DZ Smart Shop › Installer / réparer le classeur** : colonnes **Campagne** et **ID Shopify**, et réglages `SHOPIFY_*`.
3. **Administration › Connexions › Shopify** : adresse de la boutique (`xxxx.myshopify.com`), puis le **jeton d'accès** (`shpat_…`) **ou** l'**identifiant client** suivi de son **secret** (l'outil demande alors lui-même un jeton à Shopify et le renouvelle). Ils sont gardés dans les propriétés du script, jamais dans le classeur. Un test vérifie la connexion, la permission, et **signale une boutique qui n'est pas en dinars algériens**.
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

## Vitesse et entretien du classeur

Ce que fait l'outil pour rester rapide :

- **Une seule écriture par action** : une commande confirmée ou modifiée est écrite en un ou deux blocs, et le Journal en une ligne. Plus d'écriture case par case.
- **Réglages gardés en mémoire** : Paramètres, Tarifs, Équipe, Clients (liste noire) et Produits ne sont plus relus à chaque clic. Dès que vous modifiez un de ces onglets, la mémoire est vidée et l'application voit le changement tout de suite. Si un autre programme les modifie, le changement est vu au plus tard après 10 minutes.
- **Un seul aller-retour** :
  - l'ouverture de l'application apporte déjà la première page ;
  - l'onglet RELEASIT est vérifié en même temps que la liste ou la file ;
  - « Confirmer » renvoie la file et les compteurs ;
  - une commande enregistrée met à jour sa ligne sans recharger toute la liste.
- **Centre de confirmation** : la commande suivante est préparée à l'avance. Après « Confirmer », elle s'affiche tout de suite pendant que l'enregistrement se termine. Si l'enregistrement échoue, un message le dit et la commande revient dans la file. Un double clic ne traite jamais deux commandes.
- **Tâches automatiques légères** : **une seule tâche chaque minute** (au lieu de cinq déclencheurs) ; quand il n'y a rien à faire, elle s'arrête tout de suite. Sans nouvelle ligne, le traitement lit trois colonnes et ne bloque rien. La lecture des statuts Ecotrack ne bloque pas les clics pendant qu'elle attend Ecotrack.
- **Application plus légère** : les pages Stock, Bénéfices, Statistiques et Administration ne sont envoyées au navigateur **que quand on les ouvre** (une confirmatrice ne les reçoit jamais), et les pages sont allégées (commentaires et espaces retirés) dans `dist/Code.gs`. Page de départ : 177 Ko → 136 Ko.
- **Statistiques rapides** : un résumé par jour, calculé chaque nuit ; la page lit seulement les jours de la période, et calcule aujourd'hui en direct.
- **Onglet plein** : quand Commandes (ou le Journal) n'a plus de lignes libres, l'outil en ajoute, avec les listes déroulantes et les couleurs.

**Chaque nuit vers 3 h** (et à la demande : **Administration › Classeur › Archiver et alléger maintenant**, ou le menu du classeur) :

| Quoi | Règle | Réglage |
|---|---|---|
| **Archivage** | Les commandes terminées (livrées, retournées, annulées) sans mouvement depuis 100 jours partent dans l'onglet **Archive**. Restent dans Commandes : une commande livrée dont l'argent n'est **pas encore versé** par Ecotrack, et un retour **pas encore reçu**. | `ARCHIVE_JOURS` (0 = jamais, minimum 30) |
| **Bilan des clients** | Pour chaque numéro, les commandes archivées sont comptées dans l'onglet Clients (colonnes *Livrées archivées*, *Retours archivés*, *Annulées archivées*) : les alertes « Fiable » et « Risque » restent justes. | |
| **Journal** | Les lignes de plus de 90 jours sont effacées. | `JOURNAL_JOURS` (0 = tout garder, minimum 30) |
| **Onglets allégés** | Lignes et colonnes vides en trop supprimées. L'onglet RELEASIT n'est jamais touché. | |
| **Statistiques** | Résumé de chaque jour recalculé dans l'onglet caché **Stats**. | |

- Le seuil de 100 jours dépasse la plus longue période affichée (90 jours dans Suivi) : rien ne disparaît des écrans.
- Le **tableau de bord sur « Tout »** compte aussi les commandes archivées.
- La liste Commandes, elle, ne montre pas les archives. Pour retrouver une vieille commande, cherchez-la dans l'onglet Archive du classeur (Ctrl + F).

## Tester sans Google (pour les développeurs)

Il faut Node.js 18 ou plus récent, sans aucune dépendance à installer.

```bash
npm test          # 122 tests du code serveur (dont stock, bénéfices, SMS, Releasit, Shopify, Ecotrack et le suivi, contre de faux serveurs) sur une imitation du classeur
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
  Labels.gs     bordereaux Ecotrack (PDF), « imprimé », validation de l'expédition
  FollowUp.gs   remarques du livreur, résultat de l'appel, demande de retour, client signalé
  Health.gs     la tâche de chaque minute, l'état de l'outil, les e-mails de panne
  Stats.gs      statistiques : résumés par jour (onglet caché Stats), primes
  Admin.gs      page Administration, pages chargées à la demande
  Shopify.gs    importation des commandes Shopify (Releasit COD), wilayas en arabe
  Releasit.gs   transfert des commandes de l'onglet RELEASIT (écrites par Releasit COD)
  Rules.gs      verrouillage selon l'étape, annulation d'un colis Ecotrack, corbeille
  Maintenance.gs  archivage de nuit, Journal raccourci, onglets allégés
  Stock.gs      catalogue par modèle, stock réservé, sorti et rentré
  Profit.gs     bénéfice des commandes, dépenses, rentabilité par produit et par campagne
  Sms.gs        SMS automatiques selon le statut (httpSMS)
  Calls.gs      appels sans réponse : 3 par jour pendant 3 jours, annulation automatique
  Api.gs        application web, menu du classeur, fonctions appelées par l'interface
  Setup.gs      création/réparation du classeur et du traitement automatique
  Index.html    page de l'application
  Styles.html   apparence (ordinateur et téléphone)
  App.html      fonctionnement de l'interface (pages de tous les jours)
  PageStock.html, PageProfit.html, PageStats.html, PageAdmin.html
                pages chargées seulement quand on les ouvre
dist/Code.gs    tout le code ci-dessus en un seul fichier (généré par npm run bundle)
tests/          imitation de Google Apps Script, tests, données d'exemple, aperçu
```

## Prochaines étapes prévues

1. **Shopify, sens retour** : étiquette « confirmée » ou annulation dans Shopify quand une commande est confirmée ou annulée dans l'outil, et retrait des commandes annulées dans Shopify (demande la permission `write_orders`).
2. **Liste des communes** d'Ecotrack en liste déroulante dans la confirmation, si Ecotrack fournit un point de terminaison pour cela.
3. **SMS** : confirmation par réponse « 1 » / « 2 » du client, et accusé de réception des SMS (demande une adresse publique pour httpSMS).
4. **Yalidine** (Ecotrack est fait, bordereaux compris) : création des colis, suivi des statuts et bordereaux.
5. **Sauvegarde automatique** du classeur chaque nuit dans Google Drive, rapprochement des versements d'Ecotrack, résumé du matin par e-mail.

## Limites connues

- Chaque action enregistrée prend environ 1 seconde : c'est la limite d'Apps Script, plus lent qu'une application classique.
- L'onglet Archive grossit avec le temps. Au-delà de quelques dizaines de milliers de lignes, déplacez les plus anciennes dans un autre classeur, par exemple un classeur par année.
- La liste des wilayas est celle des 58 wilayas. Si le découpage change, ajoutez les nouvelles lignes dans l'onglet Tarifs : l'application utilise cette liste.
