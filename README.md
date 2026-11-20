# DZ Smart Shop — gestion des commandes COD

Outil de gestion des commandes en paiement à la livraison (COD) pour l'Algérie.

- **Les données** sont dans un classeur **Google Sheets** : vous pouvez toujours l'ouvrir et le modifier à la main.
- **L'application** (tableau de bord, commandes, centre de confirmation) est servie par **Google Apps Script**, gratuitement, et s'ouvre avec un simple lien sur PC et sur Android.
- Tout tourne chez Google : **votre PC peut être éteint**.

## Ce que fait la version 1.14

| Écran | Contenu |
|---|---|
| **Tableau de bord** | Commandes reçues, taux de confirmation et de livraison, montant livré, argent en route, liste « à faire », taux de livraison par wilaya, résultats par confirmatrice et par produit ; **période au choix** (aujourd'hui, hier, 7 ou 30 jours, ce mois, mois dernier, tout, ou du … au …) |
| **Commandes** | Liste filtrable (statut, wilaya, période, recherche par nom, téléphone, n° de commande ou de suivi), modification d'une commande, ajout à la main, liste noire, **suppression en plusieurs** (administrateur), **corbeille** (restaurer, supprimer définitivement, vider) |
| **Centre de confirmation** | Trois blocs : **à appeler maintenant**, **rappels à venir**, **en attente** (injoignable, statut inconnu… avec le motif) ; une commande n'en sort que confirmée ou annulée ; **historique des appels** de chaque commande ; rappel arrivé à l'heure **en orange**, commande en retard en rouge ; fiche client avec historique et alerte, boutons Appeler et WhatsApp (message pré-rempli), **toutes les informations de la commande modifiables** (client, téléphone, wilaya, commune, adresse, produit, quantité, prix, livraison, société, frais, notes) avec recalcul des frais et du total, résultat en un clic : Confirmer, Pas de réponse, Rappeler plus tard, Annuler (avec motif) |
| **Expéditions** | Commandes confirmées prêtes à partir (avec les problèmes à corriger avant l'envoi), **création des colis chez Ecotrack** en un clic avec n° de suivi écrit dans le classeur, **impression des bordereaux** Ecotrack (A4 ou étiquette 10×15) et **validation de l'expédition** (avec ou sans ramassage) |
| **Suivi** | Statut de chaque colis relu **toutes les heures** (réglable : 30 min, 1 h ou 2 h), **alertes « à traiter »** (colis suspendu, retour en cours ou bloqué, sans mouvement selon l'étape, argent en retard…), **résultat de l'appel** (remarque au livreur, demande de retour), motif du livreur et **chronologie** de chaque colis (heures d'Algérie) |
| **Stock** | Une ligne par modèle avec le **disponible en couleur**, recherche, filtres et tri, photos, **packs**, variantes créées d'un coup, commandes qui réservent, fusionner, masquer ou supprimer un modèle, entrées, inventaire, **annuler un mouvement mal tapé**, export Excel / feuille d'inventaire / **valeur du stock à une date** (administrateur et magasinier) |
| **Bénéfices** | Bénéfice net sur la **période de votre choix** comparé à la période d'avant, **graphiques** (bénéfice par jour, où part l'argent, seuil de rentabilité, simulateur du taux de livraison), produits classés par bénéfice **après pub** (chaque pub reliée à son produit), publicité (coût par livrée, ROAS), **dépenses et gains** sur un jour ou un intervalle, à corriger ou supprimer (administrateur) |
| **Statistiques** | Commandes et argent par période, comparés à la période d'avant : **ce qui a changé** en phrases, parcours des commandes avec les pertes et leurs motifs, **carte des wilayas**, heures × jours, **meilleure heure pour appeler**, vitesse de confirmation, bureau ou domicile, produits, **équipe** (appels, réponses, objectif du jour, prime), publicité (**qualité des sources**), **filtre croisé** (une wilaya, un produit, une campagne, une source ou une confirmatrice), où est l'argent et versements d'Ecotrack ; tableaux triables, export pour Excel (administrateur) |
| **Administration** | État de l'outil, connexions (Ecotrack, SMS, Shopify, Releasit), réglages en formulaires, équipe (**connexion par téléphone et mot de passe**, version Cloudflare), clients, sauvegarde **Tout exporter (Excel)**, entretien (administrateur) |

Écrans plus légers (v1.14) : les explications sont rangées derrière un petit **?** (elles s'ouvrent au toucher), les états tiennent en un point de couleur et quelques mots.

Communes (version Cloudflare, envoi par Ecotrack) : la **liste officielle d'Ecotrack** (1 529 communes actives, avec leur nom arabe) dans la case Commune, la commune écrite en arabe par le client **reconnue toute seule**, et **pas d'envoi** d'un colis dont la commune est inconnue d'Ecotrack. Voir « v1.13 » plus bas.

Sur téléphone (version Cloudflare) : **une vraie application** à installer (icône sur l'écran d'accueil, plein écran) et des **notifications** (nouvelle commande, rappel à l'heure, colis à traiter, alerte), même application fermée. Voir « v1.12 » plus bas.

Ce qui se passe tout seul :

- **Une seule tâche automatique chaque minute** fait le travail régulier, puis s'arrête tout de suite s'il n'y a rien à faire : commandes Releasit (chaque minute), SMS en attente, nouvelles lignes et Shopify (toutes les 5 minutes), statuts Ecotrack (**toutes les heures**, réglage `SUIVI_ECOTRACK_MINUTES` : 30, 60 ou 120). Une deuxième tâche fait l'entretien **chaque nuit à 3 h**. En cas de panne, **un e-mail part au propriétaire** (voir « État de l'outil »).
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

- **🗑 Corbeille** (administrateur) : les commandes supprimées, avec la date, l'auteur et le motif. Cochez-en une ou plusieurs : **Restaurer** ou **Supprimer définitivement** ; ou **Vider la corbeille**. Une commande effacée pour de bon garde son n° bloqué (onglet caché « Numéros effacés ») : Releasit et Shopify ne la recréent pas. Réglage `CORBEILLE_JOURS` : vidage automatique chaque nuit des commandes à la corbeille depuis ce nombre de jours (0 = jamais).
- **Supprimer en plusieurs** (administrateur) : page Commandes › **Sélectionner plusieurs**, cochez (ou « Tout cocher »), puis **Mettre à la corbeille** avec un motif. Les commandes déjà envoyées à une société de livraison sont protégées : elles sont ignorées.
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
- Une commande **ni confirmée ni annulée depuis plus de 24 h** (`ATTENTE_MAX_HEURES`) est marquée **« en retard »** en rouge dans la file ; jamais appelée, elle l'est aussi au tableau de bord.

### La page Confirmation (v1.2)

| Bloc | Contenu |
|---|---|
| **À appeler maintenant** | nouvelles commandes et rappels dus. Un rappel dont l'heure est arrivée passe **en tête, en orange** (« À rappeler maintenant ») ; l'application vous prévient même si vous êtes sur une autre page, et le compteur du menu augmente |
| **Rappels à venir** | pas de réponse ou rappel demandé, avec l'heure prévue |
| **En attente** | ni confirmées ni annulées, mais hors de la file, avec le **motif** : injoignable (vous pouvez réessayer, confirmer ou annuler), sans statut, **statut inconnu** (ligne du classeur abîmée : ouvrez la fiche pour la corriger) |

- **Tout se corrige pendant l'appel** : client, téléphone, wilaya, commune, adresse, **produit**, quantité, **prix des produits**, livraison, **société**, **frais de livraison** et notes. Le prix suit la quantité (et le prix du catalogue quand vous choisissez un autre produit) ; les frais suivent la wilaya, la livraison et la société. Un prix ou des frais **tapés à la main** sont gardés tels quels (remise, livraison offerte…).
- **Historique des appels** : chaque résultat (pas de réponse, rappel demandé, confirmée, annulée) est noté avec l'heure et la confirmatrice dans la colonne **« Historique appels »** (les 12 derniers). Il s'affiche sur la carte (« 10:05 pas de réponse → 14:30 pas de réponse ») et dans la fiche, avec le prochain rappel.
- **Un client rappelle** : ouvrez sa commande dans « Rappels à venir » ou « En attente » (un appui sur la carte) et confirmez-la tout de suite, sans attendre l'heure du rappel. **Sur téléphone** (v1.8.1), les compteurs du haut (À appeler, Rappels à venir, En attente) ouvrent la liste au bon bloc ; quand personne n'est à appeler, la liste reste ouverte sous le message « Personne à appeler maintenant ».
- **Noms** : un tiret ou un point seul est enlevé du nom du client à l'arrivée (Releasit écrit « Malouche - » quand le nom de famille manque).
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
- **Vous pouvez aussi valider sur le site d'Ecotrack** : à l'ouverture de l'onglet *Créés, à valider*, l'outil relit ces colis chez Ecotrack (au plus une fois par minute) ; ceux déjà validés passent tout de suite dans Suivi. Sinon, la lecture automatique des statuts le fait dans l'heure.

### Statuts

Les statuts sont relus **toutes les heures** (réglage `SUIVI_ECOTRACK_MINUTES` : 30, 60 ou 120, dans Administration › Réglages › Suivi des colis ; ou à la demande avec « Actualiser les statuts »), 100 colis par requête. Le statut exact d'Ecotrack est gardé dans la colonne **Statut société** et traduit ainsi :

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
- **L'argent** (chez le livreur, livré pas encaissé, encaissé pas payé, prêt à être versé, payé, et les **versements**) est dans **Statistiques › Argent**, sur la période choisie : le Suivi est plus léger.
- **Colis en cours**, filtrables : à valider, en route, en livraison, suspendus, retours.
- **Chronologie** d'un colis (`get/tracking/info`), aussi dans la fiche de chaque commande : validé, récupéré, au centre de tri, confié au livreur, tentative de livraison, livré, encaissé, payé… Les dates sont lues **à l'heure d'Algérie** (quel que soit le fuseau du projet Apps Script), avec l'année si ce n'est pas l'année en cours ; une étape sans heure affiche seulement le jour. La réponse brute d'Ecotrack est jointe (repliée) pour vérifier une date en cas de doute.
- **« Dernier mouvement »** d'un colis : la date du changement de statut **donnée par Ecotrack** quand sa réponse la contient, sinon l'heure où l'outil a vu le changement. Tant qu'Ecotrack ne change pas le statut, cette date ne bouge pas : c'est normal. Le haut de la page indique quand les statuts ont été vérifiés pour la dernière fois (« vérifiés chez Ecotrack il y a 12 min »).
- Après la livraison, un colis Ecotrack reste suivi **jusqu'au versement de l'argent** (encaissé, prêt, payé), et un retour **jusqu'à sa réception**.

## Stock (page à part)

Page **Stock** (menu de gauche ; sur téléphone : **☰ Plus**), pour l'**administrateur** et le rôle **« Magasinier »** de l'onglet Équipe. Le magasinier voit le stock et fait les entrées et inventaires, mais ne voit pas les bénéfices.

**La page (version 1.8)** :
- **Une ligne par modèle** : le **disponible en grand**, dans une pastille verte (bon), orange (**stock bas**) ou rouge (**rupture**), avec un trait de la même couleur à gauche ; puis stock, réservé, coût et prix. Un produit à un seul modèle tient sur une ligne avec sa photo ; un produit à plusieurs modèles a un titre (photo, total disponible, valeur) qui se replie.
- **Recherche** (produit, modèle, autres noms), filtres **Tous / Stock bas / Rupture / Inactifs**, tri (**à surveiller d'abord**, nom, disponible, valeur). Les cartes « Stock bas » et « En rupture » du haut sont cliquables.
- **« réservé 4 › »** : un clic montre les commandes confirmées qui bloquent ce stock (n°, client, wilaya) ; un clic sur une commande l'ouvre.
- Menu **« ⋯ »** de chaque ligne : Modifier, Historique, Fusionner avec…, Masquer / Réafficher, Supprimer.
- Les modèles masqués sont repliés en bas (« Inactifs (n) ») ; les modèles vus dans les commandes mais absents du catalogue sont signalés par un petit bandeau (« Voir et ajouter »).
- **Sur téléphone** : cartes de 2 lignes, recherche et filtres qui restent en haut, et un bouton rond **+** (Produit, Entrée, Inventaire, Exporter).

**Le catalogue** (onglet Produits : Produit | Modèle | Prix de vente | Coût d'achat | Stock | Seuil d'alerte | Autres noms | Actif | Photo | Contenu du pack) :
- **+ Produit**, trois façons :
  - **Un seul modèle** : nom, modèle (facultatif), prix, coût, stock de départ, seuil, photo.
  - **Plusieurs variantes** : tapez l'option 1 (ex. « Noir, Bleu, Rose ») et l'option 2 (ex. « iPhone 13, iPhone 14 ») : toutes les variantes sont créées d'un coup (« Noir / iPhone 13 », comme sur Shopify), chacune avec son coût, son prix et son stock ; les cases vides prennent la première ligne.
  - **Pack** : choisissez ses articles (ex. 1 × Montre + 1 × Écouteurs). Un pack **n'a pas de stock à lui** : son disponible est celui de l'article qui en a le moins ; une commande confirmée réserve ses articles, le colis parti les fait baisser, le retour les fait remonter, un retour abîmé les retire. Son coût, s'il est vide, est la somme des coûts de ses articles (Bénéfices). Un nom avec « + » reste **un seul article** quand il est dans le catalogue.
- **Modifier** : nom, prix, coût, seuil, **autres noms** (autres écritures du modèle dans les commandes, séparées par « ; »), **photo** (lien de l'image, `https://…`), contenu d'un pack. Si vous renommez un modèle, l'ancien nom est gardé dans « autres noms » : les commandes passées restent reliées.
- **Photos** : un lien par modèle (ou un pour le produit), ou **« Reprendre les photos de Shopify »** (dans Modifier) pour tous les modèles qui n'en ont pas : catalogue Shopify (permission `read_products`), sinon photos des articles commandés ces 90 derniers jours. La photo s'affiche aussi dans la **fiche de confirmation**.
- **Masquer** : le modèle n'est plus vendu (plus proposé pour les nouvelles commandes, pas compté en rupture) ; son historique est gardé. **Réafficher** le remet.
- **Fusionner** un doublon : son stock s'ajoute au bon modèle, ses noms deviennent des « autres noms » du bon modèle (les commandes et l'historique le retrouvent), puis le doublon disparaît. Le coût, le prix et la photo du bon modèle sont gardés (ceux du doublon servent s'ils sont vides).
- **Supprimer** un modèle ajouté par erreur : seulement si **aucune commande ne l'a utilisé** (aucune commande en cours, aucun mouvement lié à une commande) et s'il n'est dans aucun pack. La ligne disparaît tout de suite, avec **5 secondes pour « Annuler »**. Les mouvements tapés à la main (stock de départ, entrées, inventaires) ne bloquent pas : le stock restant est noté « Modèle supprimé ». Sinon : masquez-le ou fusionnez-le.
- Dans **« + Nouvelle commande »**, choisir un produit de la liste remplit le prix (prix de vente × quantité).

**Les mouvements** (onglet « Mouvements stock » : date, modèle, mouvement, quantité, stock après, coût, commande, auteur, note), montrés en frise avec une icône et une couleur, et des filtres Entrées / Sorties / Retours / Pertes :

| Mouvement | Comment | Effet |
|---|---|---|
| Stock initial | À la création du produit | + |
| **Entrée** de marchandise | Formulaire : un produit, la quantité reçue par modèle, coût unitaire et fournisseur facultatifs | + ; avec `COUT_MOYEN` = OUI, le coût d'achat devient la moyenne (10 à 600 DA + 20 à 690 DA = 660 DA) |
| Colis parti | Automatique (Expédiée, En livraison, Livrée) ; pour un pack, chacun de ses articles | − |
| Retour reçu | Automatique (Ecotrack : « retour reçu » ; société sans connexion : statut Retour) | + |
| Retour abîmé | Bouton **« Abîmé ? »** dans Suivi › Terminées, sur un retour reçu | − (il ne peut pas être revendu) |
| **Inventaire** | Formulaire : la quantité comptée par modèle, et un motif (comptage, perte, casse, erreur, cadeau, autre) | L'écart est noté |
| Fusion | Fusionner un doublon | − sur le doublon, + sur le bon modèle |
| **Annulation** | Bouton **« Annuler »** sur une entrée, un inventaire ou un stock de départ mal tapé | Le mouvement inverse ; les deux restent dans l'historique (une seule fois ; refusé si le stock deviendrait négatif). Le coût moyen revient à celui d'avant l'entrée |
| Modèle supprimé | Supprimer un modèle ajouté par erreur | − son stock restant |

- **Réservé** : une commande **confirmée** réserve ses produits ; disponible = stock − réservé. « **Stock insuffisant** » s'affiche à la confirmation si le modèle manque (pour un pack : quel article manque) ; la confirmation reste possible. Une annulation libère la réservation.
- Chaque commande ne compte **qu'une fois** (colonne « Mouvement stock » des commandes : « Sorti », « Rentré », « Rentré (abîmé) »). Les commandes déjà parties avant l'installation du suivi sont marquées « Avant le suivi du stock ».
- **Stock vide** = modèle non suivi. Évitez de modifier la colonne Stock à la main : l'entrée ou l'inventaire gardent une trace.
- **Pertes du mois** (abîmés et écarts d'inventaire) : sous les mouvements, en pièces et en dinars.

**Exporter** :
- **Excel** : le stock d'aujourd'hui (fichier `.csv` qui s'ouvre dans Excel : produit, modèle, pack, stock, réservé, disponible, coût, prix, valeur, actif).
- **Feuille d'inventaire à imprimer (PDF)** : s'ouvre dans un nouvel onglet avec l'impression ; une colonne vide pour noter ce que vous comptez.
- **Valeur du stock à une date** (fin de journée, heure d'Algérie) : le stock d'aujourd'hui moins les mouvements faits depuis, au coût d'achat d'aujourd'hui ; avec le détail par modèle en Excel.

## Bénéfices et dépenses

Page **Bénéfices** (menu de gauche ; sur téléphone : **☰ Plus**), visible seulement par l'**administrateur** (rôle « Administrateur » dans l'onglet Équipe). Les commandes y comptent à leur **date de commande**.

| Commande | Bénéfice |
|---|---|
| Livrée | Ventes des produits − **livraison** − coût d'achat × quantité − emballage (`COUT_EMBALLAGE`) |
| Retour | − frais de retour (`FRAIS_RETOUR`, 50 DA) − emballage |
| En route, en confirmation, annulée | Non comptée |

- **Onglet Dépenses** (la publicité en fait partie) : **Date | Catégorie | Campagne | Montant | Devise (DA ou USD) | Taux | Note | Fin | Type | Produit**.
  - **Fin** : pour une dépense étalée (publicité du 1er au 10…). Le montant est **réparti à parts égales sur chaque jour** : une période ne compte que ses jours (7 jours sur 10 = 70 % du montant). Vide = un seul jour.
  - **Type** : « Dépense » (vide = dépense) ou **« Gain »** : argent reçu en dehors des commandes (remboursement, vente directe, bonus…), **ajouté au bénéfice net**.
  - **Produit** (publicité seulement, v1.10) : le produit dont parle la pub. `Montre connectée` = tout le produit (tous ses modèles) ; `cover iPhone — iphone 15` = un seul modèle ; plusieurs produits séparés par `;`, avec leur part si vous voulez (`Montre connectée 60 %; Écouteurs sans fil 40 %`). Sans part, la pub est partagée **selon les commandes** de chaque produit (et de chaque modèle). Les noms sont ceux de l'onglet Produits.
  - Les catégories se règlent dans `CATEGORIES_DEPENSES` et `CATEGORIES_GAINS`.
  - Une dépense en dollars prend le **taux du jour** (`TAUX_DOLLAR`) quand elle est saisie dans l'application, ou la première fois qu'elle est lue si elle est tapée dans le classeur. Changer le taux plus tard ne modifie pas les anciennes dépenses.
- **Livraison** = prix de la société de livraison (onglet Tarifs ; ceux d'Ecotrack sont récupérés par l'API) **− livraison payée par le client**. Positive, elle vous coûte (par exemple 700 − 450 = 250, ou 700 en livraison gratuite). Négative, vous gagnez dessus (par exemple 400 − 600 = −200). Le bénéfice est le même que « total encaissé − prix de la société − achat » ; la livraison est simplement montrée à part.
- **Période au choix** : aujourd'hui, hier, 7 ou 30 jours, ce mois, mois dernier, tout, ou **Personnalisé** (du … au …). Le choix est retenu sur l'appareil.
- **Résumé** : ventes des produits, livraison, bénéfice des commandes, dépenses, autres gains, **bénéfice net**, publicité par commande livrée, chacun **comparé à la période d'avant** (▲ +12 %), puis :

  | Graphique | Ce qu'il montre |
  |---|---|
  | **Bénéfice net par jour** | barres vertes (gagné) ou rouges (perdu) ; par semaine ou par mois sur une longue période ; touchez une barre pour le détail |
  | **Où part l'argent** | sur 100 DA encaissés : livraison, achat, retours, emballage, publicité, autres dépenses, et ce qui reste |
  | **Seuil de rentabilité** | livrées par jour (ou par semaine) nécessaires pour couvrir vos dépenses, et combien vous en faites |
  | **Simulateur** | un curseur : « avec 75 % de livraison, votre bénéfice net serait de … » |

  Un avertissement apparaît s'il manque un coût d'achat ou un tarif de livraison ; dans ce cas, les frais payés par le client sont utilisés.
- **Produits** : classés par **bénéfice après pub** (barres : vert = ce qui reste, bleu = la part payée en pub), avec commandes, livrées, retours, **bénéfice avant pub**, **Pub** (la publicité reliée au produit), **Après pub**, **Pub par livrée** et **Pub max. rentable** (ce qu'une commande livrée rapporte avant pub : ✓ vous payez moins, ▲ vous payez plus). Les colis encore en route ne comptent pas encore : « Après pub » remonte quand ils sont livrés.
  - **Alerte** quand la pub d'un produit coûte plus que ce qu'il rapporte (seulement s'il a déjà des commandes livrées ou retournées), avec la pub maximum rentable.
- **Publicité** :
  - **par plateforme** (Facebook, TikTok, selon « UTM source ») et **par campagne** (« UTM campaign ») : commandes, livrées, bénéfice, dépense, **coût par livrée**, **ROAS** (×3 = 3 DA encaissés pour 1 DA de publicité), **net** ;
  - pour relier commandes et publicités, ajoutez « UTM source » et « UTM campaign » à la fin de l'onglet RELEASIT, et dans le lien des annonces : `utm_source=facebook&utm_campaign={{campaign.name}}` (Facebook) ou `utm_source=tiktok&utm_campaign=__CAMPAIGN_NAME__` (TikTok) ;
  - écrivez le même nom de campagne dans vos dépenses.
- **Dépenses et gains** : ajout depuis le téléphone (type, du / au, catégorie, campagne, montant, devise), liste de la période avec la part de chaque ligne dans la période ; **Corriger** (le formulaire se remplit), **Supprimer**, ou cochez plusieurs lignes et **Supprimer (n)**. Chaque correction et suppression est notée dans le Journal.
- **Pub reliée à un produit** (v1.10, sans UTM) :
  - pour une catégorie de publicité, la case **« Produit de cette pub »** apparaît : un produit (toutes ses variantes), un modèle, ou **Plusieurs produits…** (une ligne par produit, part en % facultative) ;
  - **mémoire par campagne** : retapez le nom d'une campagne déjà reliée, son produit se remplit tout seul (« ✓ retenu pour la campagne ») ;
  - colonne **Produit** dans la liste : le produit, ou **« à relier »** ;
  - bloc **« Pubs sans produit »** : une ligne par campagne, un produit proposé d'après le nom de la campagne (« la campagne parle de « montre » »), bouton **Relier** : toutes les pubs sans produit de cette campagne (même d'autres périodes) prennent ce produit ;
  - **Stock › Modifier** (administrateur) : encadré **« Publicité ce mois »** du produit (total, par campagne, pub par livrée et jusqu'où elle reste rentable).

## Apparence

- **Logo** de la boutique (le colis en route) en haut du menu et de la barre du téléphone.
- **Icônes** partout : menu, barre du bas sur téléphone (icône au-dessus du mot), boutons (Appeler, WhatsApp, Imprimer, Exporter…), statuts (horloge, coche, camion, maison, flèche retour, croix), messages (coche verte, triangle rouge). Ce sont des dessins intégrés (jeu d'icônes libre Lucide, licence ISC) : rien à télécharger en plus.
- **Formes de chargement** à la place du texte « Chargement… ».
- **Tableau de bord** : chaque chiffre avec son icône et une **petite courbe des 7 derniers jours**.
- **Liste des commandes sur téléphone** : cartes compactes de 2 lignes (client, total ; statut, wilaya, n°) avec une **bande de la couleur du statut**.
- **Confirmation sur téléphone** : les 4 boutons (Confirmer, Pas de réponse, Rappeler, Annuler) sont **fixés en bas**, sous le pouce.
- Écrans vides avec une icône, chiffres alignés dans les tableaux, transition douce entre les pages (désactivée si le téléphone demande moins d'animations).

### Version 1.7 : page Confirmation et lisibilité

- **Couleurs de la file** : **bleu** pour une nouvelle commande, **orange** pour « Pas de réponse » et « Injoignable », **violet** pour un rappel demandé par le client (bord de la carte et étiquette, avec une petite légende). Quand l'heure d'un rappel arrive, la carte remonte avec « À rappeler maintenant » et un point qui clignote. Des points ●●○ montrent les appels sans réponse du jour. Les mêmes couleurs sont utilisées dans la page Commandes.
- **Fiche résumée** : livraison (commune, adresse, wilaya, mode, société), produit et **total à encaisser en grand**. Le formulaire complet s'ouvre avec **« Modifier la commande »** (ouvert d'office s'il manque la wilaya, le produit ou un bon numéro). « Nouveau client » est discret ; les vraies alertes (liste noire, doublon, risque) restent en couleur.
- **Boutons du résultat toujours visibles** (fixés en bas de l'écran, aussi sur ordinateur), avec un **raccourci clavier** : **C** confirmer, **P** pas de réponse, **R** rappeler, **A** annuler (hors saisie).
- **Annulation en 5 secondes** : après un résultat, un bandeau « Annuler » permet de rattraper un mauvais clic ; rien n'est envoyé avant 5 secondes (ou dès l'action suivante, ou si l'application est fermée).
- **Téléphone** : « Appeler » en grand sur toute la largeur, la file et WhatsApp en petites icônes, titre plus petit.
- **Textes en arabe** (noms, communes, adresses) affichés dans le bon sens, dans la file, la fiche et la liste des commandes.
- **Tableau de bord** : les montants tiennent sur une ligne ; sur téléphone, les chiffres clés sont deux par deux (aussi dans Bénéfices, Statistiques et Stock).
- **Commandes** : l'état de Releasit, Shopify et des SMS tient sur de petites lignes ; la couleur du statut est sur le bord de chaque ligne.
- **Suivi** : couleur d'urgence sur le bord (rouge urgent, orange à surveiller) ; un bouton principal, « Appeler » en icône, WhatsApp, Chronologie et « Marquer comme traité » dans le menu « ⋯ ».

## Statistiques

Page **Statistiques** (administrateur ; sur téléphone : **☰ Plus**).

- **Période** : aujourd'hui, 7 jours, 30 jours, ce mois, le mois dernier, ou des dates précises. Chaque chiffre est **comparé à la période d'avant** (▲ / ▼ en % pour un nombre, en points pour un taux).
- Les commandes comptent à leur **date de commande**, archives comprises.
- **Filtre croisé** (v1.9) : touchez une wilaya (sur la carte ou dans un tableau), un produit, une campagne, une source ou une confirmatrice : **toute la page** ne montre plus que ces commandes (le filtre s'affiche en haut, ✕ pour l'enlever). Dépenses : seulement la publicité de la campagne ou de la source choisie. Version Cloudflare gratuite : 800 commandes au plus (période et période d'avant) ; au-delà, choisissez une période plus courte.

| Onglet | Contenu |
|---|---|
| **Vue d'ensemble** | **Ce qui a changé** : 3 ou 4 phrases (taux de livraison et la wilaya en cause, commandes et la campagne en cause, confirmation et le premier motif d'annulation, vitesse de confirmation, bénéfice, produit qui revient souvent), avec un lien vers le détail ; commandes, taux de confirmation, de livraison, retours, annulées, encaissé, bénéfice net ; **parcours** reçues → confirmées → expédiées → livrées avec, à chaque étape, combien sont perdues et pourquoi ; graphique par jour |
| **Commandes** | **Grille heure × jour** des commandes ; **meilleure heure pour appeler** (clients qui répondent selon l'heure de l'appel, d'après l'historique des appels) ; **la vitesse compte** (colis livrés selon le délai avant confirmation : moins d'1 h, 1 à 6 h, 6 à 24 h, plus de 24 h) et délais moyens ; motifs d'annulation et du livreur |
| **Argent** | À recevoir, chez le livreur, **argent prévu** (en route × taux de livraison) ; encaissé, bénéfice, dépenses, bénéfice net, panier moyen, bénéfice par livrée, **perdu à cause des retours**, délai moyen de livraison ; graphique par jour |
| **Wilayas** | **Carte** (une case par wilaya, verte, orange ou rouge selon le taux de livraison) ; tableau : commandes, livraison, **tendance**, **bureau et domicile**, confirmation, retours, délai, bénéfice, perdu ; conseil quand le bureau livre bien mieux que le domicile (ou l'inverse) |
| **Produits** | Par produit et modèle : commandes, tendance, livrées, taux de livraison, retours, encaissé, bénéfice |
| **Équipe** | Par confirmatrice : commandes, **appels**, **taux de réponse**, **appels par confirmation**, confirmées, taux de livraison, délai avant confirmation, **premier motif d'annulation**, **prime** ; **objectif du jour** (commandes confirmées par jour et par confirmatrice, réglage `OBJECTIF_JOUR`) avec une barre de progression |
| **Publicité** | Par source et par campagne : commandes, tendance, livraison, dépense, **coût par livrée**, net après pub, et **qualité** : faux numéros, doublons, liste noire, refus au livreur, note Bonne / Moyenne / Faible (à partir de 10 commandes) |

- **Tableaux** : triez d'un clic sur un titre, cherchez une ligne (wilaya, produit, campagne), exportez pour Excel. **Sur téléphone**, les tableaux deviennent des cartes.
- **Prime des confirmatrices** (onglet Équipe) : un montant en dinars **par commande livrée**, avec sa date de début. Un nouveau montant ne change pas les jours d'avant (réglage `PRIMES`, ex. `2026-11-01=50; 2027-01-01=60`). La prime d'un mois se complète au fil des livraisons.
- **Rapide** : chaque nuit, un résumé par jour est calculé (onglet caché **Stats** ; version Cloudflare : sa base) ; la page lit seulement les jours de la période et calcule aujourd'hui en direct. Bouton **Recalculer** pour tout refaire tout de suite. Après la mise à jour 1.9, les résumés sont tous recalculés une fois (« jours encore en calcul » pendant quelques minutes).

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

### Version 1.3 : ce qui a changé

| Moment | Avant | Maintenant |
|---|---|---|
| **Ouvrir l'application** | page vide jusqu'à la réponse de Google (1,5 à 4 s) | la dernière version des pages s'affiche **tout de suite** (mémoire sur l'appareil), puis se met à jour |
| **Ouvrir une commande** | « Chargement… » (1 à 2 s) | aperçu **immédiat** (client, livraison, produit, total), fiche complète juste après ; une fiche déjà vue s'affiche tout de suite |
| **Enregistrer une commande** | attendre la réponse | la fenêtre se ferme **tout de suite** ; si Google refuse, elle revient avec ce que vous aviez tapé |
| **Chaque action côté Google** | 4 écritures pour une commande, 14 lectures de réglages | **1 écriture** par commande, **1 lecture** groupée des réglages : environ **deux fois moins** de temps côté Google (mesure sur l'imitation du classeur) |

- **Mémoire sur l'appareil** : les pages Tableau de bord, Commandes, Confirmation, Expédier et Suivi sont gardées sur le téléphone ou l'ordinateur, **pour votre compte seulement** (repéré par une clé tirée de l'adresse, jamais l'adresse elle-même), **24 heures au plus**. Elles ne servent qu'à afficher l'écran pendant que Google répond : les données à jour remplacent toujours l'ancienne version, et toute action est vérifiée par Google. Un autre compte sur le même appareil ne voit pas votre mémoire. Une nouvelle version de l'outil l'efface.
- ⚠️ **Pas de formules dans l'onglet Commandes** : pour écrire une commande en un seul appel, l'outil réécrit telles quelles les cases entre deux cases modifiées (seulement les colonnes de l'outil, jamais une colonne que vous avez ajoutée).
- La vitesse d'Apps Script lui-même (environ 0,5 à 1,5 s par appel, et l'ouverture de la page par Google) ne peut pas être réduite depuis l'outil. Pour aller au-delà, il faudrait sortir d'Apps Script (voir « Prochaines étapes »).

### Déjà en place

- **Une seule écriture par action** : une commande confirmée ou modifiée est écrite en un seul bloc, et une ligne de Journal en un seul appel. Plus d'écriture case par case.
- **Réglages gardés en mémoire** : Paramètres, Tarifs, Équipe, Clients (liste noire) et Produits ne sont plus relus à chaque clic. Dès que vous modifiez un de ces onglets, la mémoire est vidée et l'application voit le changement tout de suite. Si un autre programme les modifie, le changement est vu au plus tard après 10 minutes.
- **Un seul aller-retour** :
  - l'ouverture de l'application apporte déjà la première page ;
  - l'onglet RELEASIT est vérifié en même temps que la liste ou la file ;
  - « Confirmer » renvoie la file et les compteurs ;
  - une commande enregistrée met à jour sa ligne sans recharger toute la liste.
- **Centre de confirmation** : la commande suivante est préparée à l'avance. Après « Confirmer », elle s'affiche tout de suite pendant que l'enregistrement se termine. Si l'enregistrement échoue, un message le dit et la commande revient dans la file. Un double clic ne traite jamais deux commandes.
- **Tâches automatiques légères** : **une seule tâche chaque minute** (au lieu de cinq déclencheurs) ; quand il n'y a rien à faire, elle s'arrête tout de suite. Sans nouvelle ligne, le traitement lit trois colonnes et ne bloque rien. La lecture des statuts Ecotrack ne bloque pas les clics pendant qu'elle attend Ecotrack.
- **Application plus légère** : les pages Stock, Bénéfices, Statistiques et Administration ne sont envoyées au navigateur **que quand on les ouvre** (une confirmatrice ne les reçoit jamais), et les pages sont allégées (commentaires et espaces retirés) dans `dist/Code.gs`. Page de départ : 177 Ko → 136 Ko.
- **Changement de page immédiat** :
  - une page **déjà vue** s'affiche **tout de suite** avec ses dernières données, puis se met à jour en arrière-plan (fine barre dorée en haut de l'écran) ;
  - juste après l'ouverture de l'application, les pages principales (Tableau de bord, Commandes, Confirmation, Expédier, Suivi) sont **préparées en un seul appel** ; pour l'administrateur et le magasinier, le code de leurs pages lourdes aussi ;
  - une page lourde arrive avec ses données en **un seul aller-retour** ;
  - dans la Confirmation, une fiche déjà affichée n'est pas redessinée si elle n'a pas changé : une saisie en cours n'est jamais effacée.
- **Mémoire courte côté Google** : quand on change de page plusieurs fois de suite, l'onglet Commandes est gardé **30 secondes** en mémoire au lieu d'être relu. Jamais pendant une modification (sous le verrou, la lecture est toujours fraîche), et oubliée dès qu'une commande change (dans l'application ou à la main dans l'onglet).
- **Mesure** : **Administration › État de l'outil › Temps des pages** montre le temps de chaque page côté Google (moyenne et le plus long, toutes les personnes) et sur votre appareil.
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

## Version Cloudflare (plus rapide) — étapes 1, 2 et 3

Le moteur de l'application tourne chez **Cloudflare** (offre gratuite) au lieu d'Apps Script. Chaque clic répond en environ 0,1 à 0,3 s au lieu d'environ 1 s, plusieurs confirmatrices travaillent en même temps sans s'attendre, et la vitesse ne baisse pas avec le nombre de commandes.

**Les règles ne sont pas réécrites** : la version Cloudflare embarque le même code que `apps-script/` (statuts, appels, alertes, rappels, verrouillage, corbeille…). Seuls changent la lecture et l'écriture des données : une base **D1** au lieu de l'onglet Commandes. Les tests vérifient que les deux versions donnent les mêmes résultats sur les mêmes données.

| Étape | Contenu | État |
|---|---|---|
| **1. Essai** | Tableau de bord, Commandes (recherche, fiche, modification, nouvelle commande, liste noire, corbeille), Confirmation, sur une **copie** des données | prête |
| **2. Basculement** | Expédier et Suivi (Ecotrack : colis, bordereaux, validation, statuts, résultat de l'appel), SMS, tâches automatiques ; arrivée des nouvelles commandes (Releasit, Shopify) ; **recopie automatique dans le classeur** chaque minute ; stock | prête (v1.5) — basculer quand vous voulez |
| **3. Tout dans Cloudflare** | Stock, Bénéfices, Statistiques, Administration ; Shopify lu par Cloudflare ; SMS « commande reçue » ; archivage ; les onglets de réglages, de produits et de dépenses gardés dans Cloudflare et recopiés dans le classeur | prête (v1.6) |

**Pendant l'essai, cette application Google reste la vraie** : ce que vous faites dans la version Cloudflare ne revient pas dans le classeur. Recopiez les données quand vous voulez (Administration › Connexions › Cloudflare › Recopier les données).

### Étape 2 : basculer (Administration › Connexions › Cloudflare › Basculer vers Cloudflare)

Une case permet d'**effacer d'abord les commandes de test** (onglets Commandes et Corbeille) : leurs n° sont gardés dans « Numéros effacés », Releasit et Shopify ne les recréent pas. Les réglages, l'équipe, les produits et le stock sont gardés. Ensuite :

| Où | Quoi |
|---|---|
| **Version Cloudflare** (la vraie) | Tableau de bord, Commandes, Confirmation, **Expédier**, **Suivi** ; Ecotrack (création des colis, bordereaux, validation, statuts lus selon le réglage `SUIVI_ECOTRACK_MINUTES`) ; SMS des changements de statut ; chaque minute : SMS en attente, statuts Ecotrack, et la nuit (3 h) : appels sans réponse annulés, corbeille et Journal raccourcis |
| **Classeur Google** | La **porte d'entrée** : Releasit (chaque minute) et Shopify (toutes les 5 minutes) arrivent ici, sont préparées comme avant (téléphone, wilaya, frais, alerte, SMS « commande reçue »), puis envoyées à Cloudflare dans la minute. Une **copie à jour** : chaque minute, les changements faits dans Cloudflare sont recopiés dans les onglets Commandes, Corbeille et Clients. Le **stock** (onglet Produits) : colis partis, retours reçus, retours abîmés |
| **Application Google** (lien `?google=1`, ouverte depuis la version Cloudflare : flèche ↗) | Bénéfices, Stock, Statistiques, Administration. Le lien habituel de l'application Google ouvre la version Cloudflare. Les pages des commandes y renvoient vers Cloudflare, et leurs actions y sont refusées |

- **Réglages** : modifiés dans le classeur ou dans Administration (onglets Paramètres, Équipe, Produits, Tarifs, Clients, clés Ecotrack et SMS), ils sont **renvoyés à Cloudflare dans la minute**.
- **État de l'outil** : la tâche « Lien avec la version Cloudflare » (chaque minute) apparaît dans Administration › État de l'outil ; une panne y est signalée (et par e-mail) ; rien n'est perdu : les commandes à envoyer attendent la minute suivante.
- **Retour en arrière** : Administration › Connexions › Cloudflare › **Revenir à l'application Google** : les derniers changements sont recopiés dans le classeur, puis l'application Google redevient la vraie (Ecotrack et SMS compris).
- **Archivage** : à l'étape 2, l'onglet Commandes n'est plus archivé la nuit ; il l'est de nouveau à l'étape 3 (par Cloudflare, recopié dans l'onglet Archive).

### Étape 3 : tout dans Cloudflare

Un nouveau basculement fait directement l'étape 3. Après un basculement à l'étape 2 : **Administration › Connexions › Cloudflare › Passer à l'étape 3** (dans l'application Google). Les changements en attente sont d'abord recopiés, puis les onglets Paramètres, Tarifs, Produits, Équipe, Clients et Dépenses sont envoyés à Cloudflare, avec **l'historique de l'onglet « Mouvements stock »** (v1.8 : pour la valeur du stock à une date, l'annulation d'un mouvement et la suppression d'un modèle).

| Où | Quoi |
|---|---|
| **Version Cloudflare** (toute l'application) | Toutes les pages, Stock compris (entrées, inventaire, mouvements : le stock baisse dès que le colis part) ; Bénéfices et Statistiques (mêmes calculs que la version Google) ; Administration (réglages, équipe, clients, connexions, état de l'outil). Tâches de chaque minute : SMS, statuts Ecotrack, **Shopify** (toutes les 5 minutes), résumés par jour ; la nuit : appels sans réponse, stock oublié, **archivage**, corbeille, Journal |
| **Classeur Google** | La porte d'entrée de **Releasit** (onglet RELEASIT, chaque minute) ; la **page de connexion** (Google vérifie qui vous êtes) ; une **copie à jour de tout**, chaque minute : commandes, archive, corbeille, onglets de réglages, produits et stock, dépenses, mouvements de stock. L'équipe ajoutée dans Cloudflare reçoit l'accès au classeur |
| **Application Google** (lien `?google=1`) | Secours : lecture seule, et Administration › Connexions › Cloudflare (retour en arrière) |

- **Modifier le classeur à la main** reste possible pour les onglets Paramètres, Tarifs, Produits, Équipe, Clients et Dépenses : la modification est envoyée à Cloudflare dans la minute. Si Cloudflare a modifié le même onglet entre-temps, sa version l'emporte (noté dans le Journal).
- **Statistiques et Bénéfices** se calculent à partir d'un **résumé par jour**, mis à jour dès qu'une commande de ce jour change : les pages restent rapides même avec des milliers de commandes. Après un changement des coûts d'achat, des frais ou des tarifs (ou « Recalculer »), tous les jours sont recalculés en quelques minutes ; la page affiche « N jours encore en calcul » en attendant.
- **Limites gratuites de Cloudflare** : chaque action reste sous la limite de calcul (mesuré sur 7 200 commandes : Statistiques 6 ms, Bénéfices 3 à 4 ms, Stock et Confirmation 1 ms). Dans Statistiques › Argent, les versements d'Ecotrack sont listés sur 120 jours au plus.
- **Retour en arrière** : comme à l'étape 2 (« Revenir à l'application Google »), tout est recopié avant.

### v1.11 : connexion par téléphone et mot de passe, Apps Script réduit à un relais RELEASIT

Objectif : l'équipe n'ouvre plus jamais de lien Google (plus d'erreur « Impossible d'ouvrir le fichier », plus besoin de Gmail ni du partage du classeur). Apps Script ne garde qu'un rôle : **lire l'onglet RELEASIT** et l'envoyer à Cloudflare.

**Connexion par téléphone et mot de passe** (version Cloudflare, étape 3)

- Page de connexion : **téléphone** (identifiant, colonne **Téléphone** de l'onglet Équipe) + **mot de passe**. Connecté 30 jours sur l'appareil.
- **Administration › Équipe** : ajouter une personne avec son prénom, son téléphone et son rôle (Gmail facultatif). Un **mot de passe provisoire** (ex. `K7M4-QXPA`) est affiché une seule fois, avec **Envoyer par WhatsApp** (lien, identifiant, mot de passe). À la première connexion, elle choisit **son propre mot de passe** (6 caractères au moins).
- Pour chaque personne : état (mot de passe, provisoire, bloquée), appareils connectés, **Mot de passe provisoire** (oubli), **Déconnecter** (téléphone perdu), **Modifier**, **Retirer** (accès coupé tout de suite).
- **Sécurité** : mots de passe gardés chiffrés (PBKDF2, jamais lisibles, jamais recopiés dans le classeur), **5 essais faux = bloqué 15 minutes**, chaque connexion et chaque refus notés dans le Journal, changer son mot de passe déconnecte ses autres appareils.
- **Mot de passe oublié** : **code à 6 chiffres par SMS** sur son téléphone (10 minutes, 3 codes par heure), ou nouveau mot de passe provisoire donné par l'administrateur. Administrateur : **code de secours** (ex. `7KQ2-M9XA-4TPL`) donné à la création de son mot de passe, à noter sur papier ; il ne sert qu'une fois (un nouveau est alors donné).
- **Mon compte** (toucher son nom en bas du menu, ou en haut sur téléphone) : changer son mot de passe, déconnecter ses autres appareils, se déconnecter, nouveau code de secours (administrateur).
- **Connexion par mot de passe seulement** (Administration › Équipe) : coupe la connexion par Google. Possible seulement quand l'administrateur a son propre mot de passe.

**Relais RELEASIT** (`dist/Relais.gs`, environ 200 lignes, à la place de `dist/Code.gs`)

- Chaque minute : les nouvelles lignes de RELEASIT (par lots de 50) partent vers Cloudflare, qui les transforme en commandes avec **la même logique** que la version Google (téléphone, wilaya, commune, type de livraison, plusieurs produits, doublons), puis envoie **tout de suite** le SMS « commande reçue ». Sans nouvelle ligne : un simple « je suis là ».
- Il reprend exactement là où l'ancien code s'était arrêté (même repère `RELEASIT_MARK`). Lignes effacées dans RELEASIT : les 200 dernières sont renvoyées, sans doublon (7 derniers jours). L'onglet n'est jamais modifié.
- Le classeur ne reçoit plus de copie : ses autres onglets restent comme archive. Réglages, équipe, produits, dépenses : seulement dans **Administration** (Cloudflare).
- **Alertes par SMS** aux administrateurs qui ont un téléphone dans l'Équipe : relais muet depuis 10 minutes, Ecotrack ou Shopify en panne… un SMS, puis « rétabli ». (Une panne des SMS eux-mêmes reste visible dans l'application.)
- **Sauvegarde** : Administration › Classeur › **Tout exporter (Excel)** : un fichier .xlsx avec commandes (archive comprise), corbeille, produits, dépenses, clients, tarifs, réglages, équipe (sans mots de passe), mouvements de stock et Journal. Rappel dans l'application après 7 jours. La base Cloudflare peut aussi être remise à n'importe quelle minute des 7 derniers jours.

**Passage, dans l'ordre** (rien ne s'arrête : l'ancienne façon marche jusqu'au bout)

1. Ouvrez l'application Cloudflare (connexion Google comme avant) : bandeau **« Créez votre mot de passe »** → votre téléphone + mot de passe → **notez le code de secours**.
2. **Administration › Équipe** : ajoutez le téléphone de chaque personne (Modifier), puis **Mot de passe provisoire** → WhatsApp. Chacun se connecte et choisit son mot de passe (colonne Connexion : « ✓ Mot de passe »).
3. Dans le classeur : **Extensions › Apps Script**, remplacez tout le contenu de Code.gs par **dist/Relais.gs**, enregistrez. Rechargez le classeur : menu **DZ Smart Shop › Installer le relais** (autorisation Google demandée une fois). Les anciennes tâches automatiques sont supprimées.
4. Vérifiez : **Administration › Connexions › Releasit** (« Relais actif ») ; passez une commande test.
5. Apps Script › **Déployer › Gérer les déploiements › Archiver** : l'ancien lien Google ne s'ouvre plus.
6. **Administration › Équipe** : cochez **Connexion par mot de passe seulement**.
7. Classeur › **Partager** : retirez les confirmatrices (il ne reste que vous).
8. Une fois par semaine : **Administration › Classeur › Tout exporter**.

Retour en arrière possible : recoller **dist/Code.gs** (les clés Ecotrack et SMS sont restées dans les propriétés du script) puis « Installer / réparer le classeur ».

### v1.12 : application installable, notifications, écrans du téléphone

Rien à coller dans Apps Script pour cette version (`dist/Code.gs` et `dist/Relais.gs` ne changent pas pour vous).

**Vraie application (installable)**

- Android (Chrome) : bandeau **« Installer l'application »** en haut de l'écran, ou menu ⋮ › *Installer l'application*. L'icône DZ Smart Shop arrive sur l'écran d'accueil ; l'application s'ouvre en plein écran, sans barre d'adresse.
- iPhone (Safari) : bouton Partager › **Sur l'écran d'accueil** (iOS 16.4 ou plus récent pour les notifications).
- Sans internet : une page claire « Pas de connexion internet » avec **Réessayer** (rien n'est gardé sur le téléphone).
- Une mise à jour de l'application arrive toute seule (pas de nouvelle installation).

**Notifications** (chaque personne, sur chaque téléphone)

- Bandeau **« Nouvelles commandes sur ce téléphone » › Activer** (sur iPhone : après l'installation), ou **Mon compte › Notifications › Régler**.
- Au choix, appareil par appareil : **nouvelles commandes**, **rappels à l'heure** (la confirmatrice qui a fixé le rappel, sinon tout le monde), **colis à traiter** et **alertes** (relais muet, Ecotrack, Shopify : administrateurs), **silence de 22 h à 8 h**. Bouton **Envoyer un essai**.
- Toucher la notification ouvre **la bonne commande**. Plusieurs commandes à la fois : une seule notification « 3 nouvelles commandes ».
- Envoi chiffré de bout en bout (norme Web Push, clés VAPID créées par l'application) ; un téléphone désinstallé est retiré tout seul. Gratuit, sans service extérieur à payer.

**Écrans du téléphone**

- En-tête fin : le **nom de la page** et votre **initiale** (Mon compte).
- **Commandes** : la **recherche** en haut, les statuts sur **une ligne qui défile** avec **⚙ Filtres** (wilaya, période, corbeille, sélectionner plusieurs, dans une feuille en bas de l'écran ; le nombre de filtres actifs est affiché), chaque commande avec son produit et « il y a … », bouton rond **+** pour une nouvelle commande.
- **Fiche commande** : un **résumé lisible** (statut et alerte, client avec **Copier** le numéro et son historique, livraison, produit avec photo et stock, **total à encaisser**, historique des appels) et, toujours visibles en bas, **Appeler**, **WhatsApp**, **Modifier**. Modifier ouvre le formulaire **en blocs** (statut, client, livraison, produit et prix, notes) avec le total recalculé et **Annuler / Enregistrer** en bas. Liste noire et Supprimer sont sous **⋯**.
- Sur ordinateur, ces pages ne changent pas.

### v1.13 : communes d'Ecotrack

Rien à coller dans Apps Script pour cette version. Seulement dans la version Cloudflare, pour les commandes envoyées par **Ecotrack** (une autre société garde la commune libre).

- **La liste officielle** : l'application lit les communes d'Ecotrack (`/api/v1/get/communes`) une fois par semaine : nom, code postal, bureau stop desk (les communes désactivées par Ecotrack sont écartées). Si Ecotrack ne répond pas, la liste d'avant reste en service. Chaque appareil la garde en mémoire et ne la recharge que lorsqu'elle change.
- **Case Commune** (Nouvelle commande, Modifier, Confirmation) : un bouton qui ouvre la liste des communes de la wilaya, avec une **recherche en français ou en arabe** (« bab » ou « باب »), le nom arabe à côté et 🏢 pour un bureau stop desk. Changer la wilaya vide la commune. « Écrire … (hors liste) » reste possible, mais Ecotrack refusera le colis.
- **Commune écrite en arabe par le client** (Releasit, Shopify) : à l'arrivée, « باب الزوار » devient **Bab Ezzouar** quand il n'y a pas de doute (même nom, « ال », « وادي / واد », « ة / ا » en fin de mot indifférents). Ce que le client a écrit est gardé (colonne « Commune écrite ») ; la Confirmation affiche « ✓ Commune reconnue (le client a écrit « … ») ».
- **Commune à vérifier** : sinon (un quartier, une faute), la Confirmation affiche un cadre orange avec **Choisir la commune** et les communes proches (orthographe proche, ou nom de la commune trouvé dans l'adresse). Le choix est enregistré avec le résultat de l'appel.
- **Expédier** : une commande dont la commune est inconnue d'Ecotrack ne peut pas partir (« Commune inconnue d'Ecotrack : « Azazgua » ») ; **Mettre « Azazga »** la corrige en un geste, ou **Choisir la commune**. Le colis part toujours avec le nom d'Ecotrack, même si la commune a été écrite en arabe.
- Les noms arabes viennent de la liste libre **@dzcode-io/leblad** (licence MIT, `cloudflare/src/communes-ar.js`) : 1 510 communes actives d'Ecotrack sur 1 529 ont leur nom arabe.

### v1.14 : moins d'écriture dans les pages

Rien à coller dans Apps Script pour cette version (la version Google profite aussi des changements si vous recollez `dist/Code.gs`, mais ce n'est pas nécessaire).

- **« ? »** à côté d'un titre, d'un réglage ou d'une action : l'explication s'ouvre au toucher, se ferme au deuxième toucher ou en touchant ailleurs. Rien n'est perdu.
- **États courts** : « ● Ecotrack · lu il y a 1 min », « ● Releasit · il y a 1 min », « ● SMS · 0 en attente », « ● Connecté ».
- **Suivi** : chaque colis à traiter montre l'action à faire (« → Appeler le client », « → Valider dans Expédier »…), la phrase complète est dans le « ? ».
- **Bénéfices** : « Il manque 0,3 livrée / semaine », « Livrée +2 018 DA · retour −50 DA · taux 69 % ».
- **Réglages** : un titre court pour chacun des 56 réglages ; la description et le nom dans le classeur sont dans le « ? ».
- Phrases devenues inutiles supprimées (rappel des communes dans Expédier, renvois vers le classeur, descriptions du menu Plus).
- Mesuré sur les pages d'exemple (téléphone) : **37 % de mots en moins** à l'écran (Réglages : −63 %, Expédier : −32 %, Suivi : −25 %, Bénéfices : −23 %). Les chiffres, dates, n° de suivi et remarques du livreur ne changent pas.

### Comment ça marche

- **Connexion** : l'application Cloudflare renvoie vers le lien de cette application Google avec `?cf=1`. Google sait qui vous êtes ; un **jeton signé** (valable 30 jours sur l'appareil) vous renvoie vers Cloudflare. Seuls les membres de l'onglet **Équipe** (et le propriétaire du classeur) entrent.
- **Lien entre les deux** : une clé partagée est créée par Apps Script et enregistrée par Cloudflare au premier contact (« Relier et copier les données ») ; ensuite, seule cette clé permet de copier des données ou de relier un autre classeur. Elle n'est jamais affichée.
- **Deux personnes sur la même commande** : chaque commande a un n° de version ; la deuxième personne reçoit « Cette commande vient d'être modifiée par quelqu'un d'autre » et rien n'est écrasé.
- **Limites gratuites de Cloudflare** : les pages les plus utilisées lisent seulement les commandes utiles (index de la base), en moins de 50 instructions par action.

### Mise en ligne (une seule fois)

1. Créer un compte gratuit sur **cloudflare.com** (un e-mail suffit).
2. Créer un **jeton d'accès** (*Gérer le compte › Jetons d'API du compte*) avec les permissions **Compte › Scripts Workers › Modifier** et **Compte › D1 › Modifier**, et ouvrir une fois **Workers et Pages** (crée l'adresse `…workers.dev`). Le jeton se donne dans le formulaire sécurisé de Claude, **jamais dans le chat**.
3. Mise en ligne (faite par Claude avec le jeton ; la base est déjà créée, son identifiant est dans `wrangler.toml`) :
   ```
   node cloudflare/build.js
   cd cloudflare
   npx wrangler d1 execute dz-smart-shop --remote --file schema.sql   # une fois (déjà fait)
   npx wrangler d1 execute dz-smart-shop --remote --file migrations/0002-etape2.sql   # v1.5 (déjà fait)
   npx wrangler d1 execute dz-smart-shop --remote --file migrations/0003-etape3.sql   # v1.6 (déjà fait)
   npx wrangler d1 execute dz-smart-shop --remote --file migrations/0004-connexion.sql   # v1.11 (déjà fait)
   npx wrangler d1 execute dz-smart-shop --remote --file migrations/0005-notifications.sql   # v1.12 (déjà fait)
   # v1.13 : rien à faire dans la base (la liste des communes est lue par la tâche de chaque minute)
   npx wrangler deploy                                                # à chaque nouvelle version
   ```
   La page de l'interface est intégrée au moteur : une seule mise en ligne, rien d'autre à envoyer.
4. Dans cette application Google : **Administration › Connexions › Cloudflare**, coller l'adresse **https://dz-smart-shop.besmartshop-algerie.workers.dev**, puis **Relier et copier les données**.
5. Ouvrir l'adresse Cloudflare, **Se connecter avec Google**. Sur téléphone : menu du navigateur › *Ajouter à l'écran d'accueil*.

### Pour les développeurs

```
npm run cf:build    # cloudflare/dist/worker.js et cloudflare/public/index.html
npm run cf:test     # 25 tests : la version Cloudflare (base SQLite locale) comparée à la version Google (Stock, Bénéfices, Statistiques compris), Ecotrack, SMS et Shopify contre de faux serveurs
npm run cf:serve    # la version Cloudflare sur http://localhost:8787/connexion, avec les données d'exemple
node cloudflare/test/serve.js 8787 --etape2   # la même, après le basculement (Expédier, Suivi, faux Ecotrack et SMS)
node cloudflare/test/serve.js 8787 --etape3   # tout dans Cloudflare (Stock, Bénéfices, Statistiques, Administration)
```

```
cloudflare/
  schema.sql          la base D1 (commandes avec index, réglages, journal, corbeille…)
  src/gas-shim.js     remplaçants des services Google (dates à l'heure d'Algérie, propriétés, mémoire)
  src/overrides.js    lecture et écriture des commandes dans la base au lieu du classeur
  src/server.js       le moteur : connexion, pages, tableau de bord et liste en SQL, appels à Ecotrack, httpSMS et
                      Shopify (action rejouée avec les réponses), onglets lus à la demande, résumés par jour,
                      tâches de chaque minute, pont avec Apps Script
  src/gas-shim.js     (aussi) imitation des onglets du classeur gardés dans la base (étape 3)
  src/client-cloud.*  l'interface : google.script.run → /api, écran de connexion (téléphone et mot de passe), étape 1 ou 2
  src/communes-core.js  communes d'Ecotrack (v1.13) : recherche français / arabe, commune reconnue, communes proches
                      (dans le moteur et dans la page)
  src/communes-ar.js  noms arabes des communes (@dzcode-io/leblad, licence MIT)
  src/sw.js           service worker (v1.12) : application installable, notifications
relay/Relais.gs       le relais RELEASIT (v1.11) : copié dans dist/Relais.gs par npm run bundle
  migrations/         changements de la base pour les versions suivantes
  build.js            assemble le moteur (code de apps-script/ compris) et la page
  wrangler.toml       configuration Cloudflare
  test/               imitation de D1 (SQLite), tests, serveur local
apps-script/Cloud.gs  côté Google : relier, copier les données, page de connexion (?cf=1), basculer, étape 3,
                      envoi des nouvelles commandes, recopie des changements, des onglets et du stock, retour en arrière
```

## Tester sans Google (pour les développeurs)

Il faut Node.js 18 ou plus récent, sans aucune dépendance à installer.

```bash
npm test          # 150 tests du code serveur (dont stock, bénéfices, SMS, Releasit, Shopify, Ecotrack et le suivi, contre de faux serveurs) sur une imitation du classeur
npm run bundle    # régénère dist/Code.gs (le fichier unique à coller dans Apps Script) et dist/Relais.gs (le relais RELEASIT)
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
  Stats.gs      statistiques : résumés par jour (onglet caché Stats), primes, période libre (aussi Tableau de bord et Bénéfices)
  Admin.gs      page Administration, pages chargées à la demande
  Speed.gs      mémoire courte des commandes, préchargement, mesure du temps des pages
  Shopify.gs    importation des commandes Shopify (Releasit COD), wilayas en arabe
  Releasit.gs   transfert des commandes de l'onglet RELEASIT (écrites par Releasit COD)
  Rules.gs      verrouillage selon l'étape, annulation d'un colis Ecotrack, corbeille (en plusieurs, vider, numéros bloqués)
  Maintenance.gs  archivage de nuit, Journal raccourci, onglets allégés
  Stock.gs      catalogue par modèle, stock réservé, sorti et rentré
  Profit.gs     bénéfice des commandes, dépenses et gains (sur un intervalle), graphiques, rentabilité par produit et par campagne
  Sms.gs        SMS automatiques selon le statut (httpSMS)
  Calls.gs      appels sans réponse : 3 par jour pendant 3 jours, annulation automatique, historique des appels, motif « en attente »
  Cloud.gs      lien avec la version Cloudflare : relier, copier, connexion, basculer, recopie chaque minute
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
6. **Version Cloudflare** : sans Apps Script du tout (Releasit lu directement par Cloudflare, connexion Google faite par Cloudflare) — facultatif.

## Limites connues

- Chaque action enregistrée prend environ 1 seconde : c'est la limite d'Apps Script, plus lent qu'une application classique.
- L'onglet Archive grossit avec le temps. Au-delà de quelques dizaines de milliers de lignes, déplacez les plus anciennes dans un autre classeur, par exemple un classeur par année.
- La liste des wilayas est celle des 58 wilayas. Si le découpage change, ajoutez les nouvelles lignes dans l'onglet Tarifs : l'application utilise cette liste.
