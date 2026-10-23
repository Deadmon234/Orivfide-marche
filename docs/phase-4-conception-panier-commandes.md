# ORIVFIDE — Conception détaillée phase 4 : comptes clients, panier et commandes

**Version :** 0.2 — conception et premier incrément  
**Date :** 23 octobre 2026  
**Statut :** compte client et panier implémentés dans le code; migration 005 appliquée à Neon configuré en local; commande non implémentée  
**Dépendances :** [Architecture et décisions des phases](./phase-2-architecture-et-modele-de-donnees.md), [Conception du stock phase 3](./phase-3-conception-stock.md)

> Le premier incrément ajoute la migration `backend/migrations/005_customer_accounts_and_cart.sql`, l’inscription/connexion client et les opérations de panier au code. La migration a été appliquée le 23 octobre 2026 à la base Neon configurée dans l’environnement backend local et la présence des tables a été vérifiée. Elle n’a pas été testée sur une base dédiée ni déployée avec le backend hébergé. Aucune commande, réservation, confirmation, livraison ou paiement n’est implémenté. Les conditions commerciales, juridiques, paiements, zones/tarifs et partenaires logistiques doivent être validés avant l’ouverture de la confirmation de commande. Les tests phase 3 sur une base isolée restent un préalable à toute implémentation transactionnelle de commande.

## 1. Objectif et limites

La phase 4 prépare un parcours où un client identifié peut constituer un panier contenant des produits de plusieurs boutiques et, lorsque les validations le permettront, confirmer une commande parente composée d’une sous-commande par vendeur.

Cette phase ne met pas en service :

- le paiement électronique ou la confirmation de paiement;
- le paiement à la livraison ni les reversements;
- une livraison facturée ou une promesse de couverture;
- des commissions, réductions, taxes ou frais non validés;
- les annulations, retours et remboursements réels;
- une commande invitée.

Le panier est une intention d’achat, pas une réservation de stock, une garantie de prix ou une commande confirmée. Le serveur recalcule prix et disponibilité à chaque lecture et avant une éventuelle confirmation.

## 2. Décisions techniques proposées

1. **Identité commune :** utiliser `accounts` et `account_roles` comme cible commune aux clients et vendeurs. La transition des vendeurs existants est progressive; leur authentification actuelle reste compatible jusqu’à une migration testée. Une adresse électronique normalisée n’appartient qu’à un compte.
2. **Commande authentifiée :** seul un compte ayant le rôle `customer` peut gérer son panier et ses commandes. Le contrôle d’accès est fait côté API sur chaque ressource.
3. **Panier multi-vendeurs :** un compte possède au plus un panier actif; un article correspond à une variante/inventaire et une quantité entière positive. Le panier n’enregistre aucun prix réputé contractuel.
4. **Disponibilité :** à l’ajout et à la consultation, exposer le stock disponible actuel sans le réserver. La confirmation future revérifie toutes les lignes sous verrou PostgreSQL et échoue entièrement si une ligne est invalide ou épuisée.
5. **Commande :** une commande parente client, une sous-commande par vendeur, des lignes figées et des événements append-only. Les lignes et montants confirmés ne sont jamais recalculés à partir du catalogue.
6. **Prix et devise :** montants entiers XAF. Tant que la commission, les frais et la grille de livraison restent à valider, ne pas les inventer. La confirmation doit être désactivée si une valeur requise n’a pas de configuration active et approuvée.
7. **Test d’abord :** toute route de confirmation reste neutralisée par défaut (`CHECKOUT_ENABLED=false`); les essais éventuels utilisent un environnement de test et ne simulent pas un paiement en production.
8. **Expiration :** une durée d’expiration ne s’applique qu’à une commande confirmée dans le flux de test. La valeur COD de 24 heures reste un paramètre de test provisoire hérité de la phase 2, jamais une règle de production implicite.

## 3. Modèle de données cible

Le nom et les contraintes définitives seront arrêtés lors de la migration, après vérification de la base et des tests de restauration.

### `accounts`

| Champ | Règle |
|---|---|
| `id` | UUID, clé primaire |
| `email` | adresse normalisée en minuscules; unique sans distinction de casse |
| `full_name` | nom d’affichage |
| `password_hash` | hash bcrypt; jamais de mot de passe brut |
| `status` | `active`, `pending_verification`, `disabled` |
| `created_at`, `updated_at` | dates UTC |

L’inscription client crée le compte et son rôle `customer` dans une transaction. La récupération de mot de passe est différée tant qu’un canal de vérification n’est pas choisi. Les réponses d’inscription et de connexion ne doivent pas révéler si une adresse existe.

### `account_roles`

Clé unique `(account_id, role)` avec les rôles minimums `customer` et `seller`. Les rôles support/admin ne sont pas créés par inscription publique. Un client ne peut pas se donner un rôle vendeur ou privilégié.

La migration des vendeurs doit préserver UUID, email et hash existants, créer un rattachement vendeur unique et garantir que les inscriptions vendeur ultérieures écrivent l’identité et les rôles de façon atomique. Le basculement des tokens et du middleware vendeur est un changement séparé, rétrocompatible et testé; ne pas invalider en masse les sessions existantes.

### `carts` et `cart_items`

`carts` contient `id`, `account_id`, `status` (`active`, `converted`, `abandoned`), `created_at`, `updated_at` et une contrainte garantissant au plus un panier actif par compte.

`cart_items` contient `id`, `cart_id`, `inventory_item_id`, `quantity > 0`, `created_at`, `updated_at`; unicité `(cart_id, inventory_item_id)`. La quantité demandée est bornée à 1 000 000 comme les mutations de stock. Une jointure impose une variante active, un produit actif et une boutique publique liée à un vendeur actif.

Ne pas figer de prix dans le panier. L’API renvoie le prix courant, le sous-total courant et un indicateur de disponibilité; elle explique qu’ils seront revérifiés à la commande. Ajouter au panier n’altère ni `on_hand` ni `reserved`.

### `orders`, `seller_orders` et `order_items`

La structure transactionnelle cible est :

```text
accounts ──< carts ──< cart_items
accounts ──< orders ──< seller_orders ──< order_items
                                      └──< order_status_events
```

- `orders`: UUID, numéro public opaque unique, compte client, état parent, devise `XAF`, dates et clé d’idempotence de confirmation.
- `seller_orders`: commande par vendeur, boutique, état indépendant, totaux entiers séparés (articles, livraison, frais, commission et net vendeur) et version/référence de politique tarifaire. Les champs monétaires dépendant des accords restent absents ou nuls tant qu’ils ne sont pas configurés; aucun zéro ne doit être interprété comme frais offert si le montant est en réalité inconnu.
- `order_items`: références facultatives vers produit/variante et snapshots non nuls du nom vendeur/boutique, nom produit/variante, SKU, prix unitaire XAF et quantité. Le sous-total est recalculable à partir des snapshots.
- `order_status_events`: commande ou sous-commande, état précédent/nouveau, acteur/role, motif et date; append-only. Pas de suppression en cascade des commandes, lignes, snapshots ou événements.
- `order_delivery_snapshots`: données minimales d’adresse et zone versionnée copiées à la confirmation. L’accès est limité au client propriétaire et aux vendeurs concernés pour leur seule sous-commande; les vues admin nécessiteront des permissions auditées.

Les états définitifs et transitions devront être définis dans un service unique côté serveur. Cible de départ : `awaiting_vendor_confirmation`, `confirmed`, `preparing`, `handed_to_carrier`, `in_transit`, `delivered`, avec branches contrôlées `cancelled`, `delivery_failed`, `returned`, `disputed`. Une transition non autorisée est refusée; chaque changement réussi est atomique avec son événement et les mutations de stock requises.

Une confirmation multi-vendeur crée la commande parente et toutes les sous-commandes/lignes dans une seule transaction. Elle ne permet pas de succès partiel caché : si un vendeur, une ligne, le stock ou une configuration requise est invalide, toute la confirmation échoue sans réservation ni commande partielle.

## 4. Parcours/API proposés

Toutes les routes `/api/customer/*` et `/api/checkout/*` exigent un token client signé avec audience/type distincts des tokens vendeur et vérifient `account.status` ainsi que le rôle `customer`.

### Comptes

- `POST /api/customer/auth/register` : nom, email et mot de passe; réponse générique, hash bcrypt et limitation de débit.
- `POST /api/customer/auth/login` : réponse token minimale; même message pour email absent et mot de passe invalide.
- `GET /api/customer/me` : profil minimal du compte authentifié.
- Pas de route publique de modification de rôle, d’adresse de livraison persistante ni de réinitialisation mot de passe avant conception dédiée.

### Panier

- `GET /api/customer/cart` : lignes, prix actuels, disponibilité courante, totaux par boutique et indicateurs de ligne indisponible.
- `POST /api/customer/cart/items` : `inventoryItemId`, `quantity`; valide l’ownership catalogue et les limites. Une ligne concurrente identique est fusionnée avec une mise à jour protégée.
- `PATCH /api/customer/cart/items/:id` : changer quantité après vérification que la ligne appartient au panier actif du client.
- `DELETE /api/customer/cart/items/:id` : supprimer uniquement la ligne du client.
- `DELETE /api/customer/cart/items` : vider uniquement le panier actif du client.

Le panier est accessible seulement au client propriétaire. Une réponse vide ou inexistante ne doit pas révéler si l’identifiant existe chez un autre client.

### Prévisualisation et confirmation

- `POST /api/checkout/preview` : recalcule les prix, regroupe par vendeur, détecte épuisement/modifications et estime les montants uniquement si une grille active est configurée. N’écrit pas d’ordre et ne réserve pas le stock.
- `POST /api/checkout/confirm` : renvoie `503` tant que `CHECKOUT_ENABLED` ou les configurations obligatoires sont inactives. Une fois autorisée, exige une clé d’idempotence; verrouille/revalide chaque inventaire; écrit parent, sous-commandes, snapshots, événements, réservations et conversion du panier atomiquement.
- Aucun écran ne doit présenter une prévisualisation comme une commande confirmée; aucune référence de paiement n’est simulée.

Si les conditions de commande ne sont pas validées, l’interface doit proposer de continuer à consulter le catalogue et garder le panier sans afficher un total final ou des frais inventés.

## 5. Sécurité, vie privée et cohérence

- Utiliser des tokens séparés client/vendeur : audience et `typ` distincts, durée limitée, rotation/invalidations à concevoir; ne pas accepter un token vendeur sur une route client.
- Hash bcrypt avec paramètres existants; limiter les tentatives de connexion; ne jamais journaliser email complet, mot de passe, token, adresse ou corps de paiement.
- Filtrer par compte dans chaque requête; ne pas faire confiance à `accountId`, `sellerId`, prix, statut ou disponibilité envoyés par le client web.
- Utiliser SQL paramétré, contraintes PostgreSQL et transactions. Valider nombre, borne et type de chaque entrée.
- Ne pas stocker de donnée carte, secret prestataire, code de remise en clair ou justificatif non nécessaire.
- Les adresses et snapshots ont accès minimal, politique de rétention et suppression à définir avec le juriste; conserver les pièces transactionnelles conformément aux obligations à confirmer.
- Le panier ne réserve rien; contrôle final anti-survente fait avec `SELECT ... FOR UPDATE` et écriture simultanée du stock et journal.
- Toutes les confirmations sont idempotentes; même clé et même demande renvoient la même ressource; même clé et corps différent renvoie `409`.
- Pas de paiements, remboursements, notifications ou envoi au transporteur dans ce lot.

## 6. Interface utilisateur

1. Compte client : inscription/connexion, validation côté serveur, états d’erreur accessibles et aucun texte révélant l’existence d’un email.
2. Bouton d’ajout au panier sur catalogue, seulement si produit indiqué disponible; message neutre si quantité modifiée depuis affichage.
3. Panier : quantités, variantes, sous-totaux courants regroupés par boutique, retrait d’article et état épuisé; total affiché comme estimation non engageante tant que livraison et paiements ne sont pas ouverts.
4. Écran de prévisualisation : informations nécessaires avant confirmation; confirmer désactivé jusqu’à validation opérationnelle et configuration effective.
5. Espace client commandé en phase 6 : historique, statuts, support et demandes de réclamation après mise en place du modèle d’audit.

Les favoris restent locaux pour l’instant. Leur association au compte sera une étape ultérieure avec fusion sans perte des favoris locaux.

## 7. Découpage d’implémentation et déploiement

1. Réussir les tests d’intégration de la phase 3 sur une base isolée; corriger les défauts avant de s’appuyer sur `inventory_items`.
2. Concevoir et tester la migration additive suivante (numéro à confirmer) pour `accounts`, `account_roles`, rattachements vendeurs, paniers, lignes et commandes/events; établir une vraie sauvegarde restaurable avant production.
3. Ajouter les tokens/rôles client sans casser l’authentification vendeur; migration progressive vérifiée par comptes test.
4. Implémenter endpoints et tests unitaires/intégration d’authentification client, panier, propriété et recalcul de prix.
5. Implémenter schéma/transition d’ordres draft/test, puis activer la confirmation uniquement dans environnement de test avec configuration explicite.
6. Construire écrans compte, panier et prévisualisation; garder en production la confirmation désactivée tant que les critères ci-dessous ne sont pas documentés.
7. Intégration continue : typecheck, lint, builds web/backend, tests unitaires et DB; tests e2e dans un environnement éphémère.

Ne pas exécuter une migration de cette phase sur Neon production avant revue de SQL, répétition sur une copie, vérification du plan de retour arrière, sauvegarde/restauration et accord explicite. Le déploiement Railway actuel applique automatiquement les nouveaux fichiers via `preDeployCommand`; toute future migration devra donc être validée avant d’être mise dans la branche de déploiement.

## 8. Tests d’acceptation

1. Inscription concurrente au même email ne crée qu’un compte; ne divulgue pas l’existence préalable de l’adresse.
2. Un compte client ne peut pas appeler une route vendeur; un token vendeur ne peut pas accéder au panier client.
3. Un client A ne peut ni lire, ni modifier, ni supprimer panier/commande du client B avec un UUID valide.
4. Un produit masqué, boutique privée, vendeur suspendu, variante inactive ou stock nul ne peut pas être ajouté comme achetable.
5. Le panier ne modifie jamais les quantités `on_hand`/`reserved`; prix et disponibilité y sont toujours recalculés côté serveur.
6. Ajout concurrent de la même variante au même panier ne crée pas de doublon et respecte la quantité maximum.
7. La prévisualisation n’écrit aucune commande et ne réserve aucun stock.
8. Confirmation désactivée renvoie un refus explicite et ne crée ni commande ni mouvement.
9. En test, la confirmation multi-vendeur est entièrement atomique; échec d’une ligne annule toutes les écritures.
10. Deux confirmations concurrentes de la dernière unité ne peuvent pas sur-réserver.
11. Une répétition avec clé identique ne crée ni seconde commande ni second mouvement; même clé et corps différent retourne `409`.
12. Snapshots commande restent identiques après modification ultérieure du catalogue ou de l’adresse du compte.
13. Aucun paiement n’est marqué comme réel sans intégration serveur et preuve du prestataire.

## 9. Préconditions à lever avant confirmation en production

- Réussite des tests stock, migration et restauration de phase 3 sur base isolée.
- Commission et base de calcul confirmées et convention vendeur mise à jour.
- Couverture, prix, délai et responsabilités de livraison validés par contrat.
- Parcours de paiement direct vendeur, frais et callbacks validés; paiement à la livraison et reversements définis.
- Conditions d’annulation, retours, remboursement, informations précontractuelles et données clients relues juridiquement au Cameroun.
- Authentification unifiée et permissions seller/customer testées; comptes admin individuels avant opérations sensibles.
- Support/litiges, logs d’audit, sauvegardes et plan de restauration prêts.

**Décision de sortie :** la conception permet de préparer comptes et paniers en environnement isolé. La commande confirmée reste hors service en production tant que les préconditions ne sont pas levées. Aucun paiement ou transporteur simulé ne doit être présenté au client comme opérationnel.

## 10. État du premier incrément

- **Ajouté au code :** migration 005 créant comptes/rôles, rattachant les vendeurs existants par leur UUID sans changer leurs hashes, et créant paniers actifs et lignes.
- **Ajouté au code :** tokens client distincts des tokens vendeur; inscription, connexion, profil et routes du panier propriétaire.
- **Ajouté au code :** choix de variante disponible depuis les fiches publiques; prix et disponibilité relus côté serveur lors de l’ajout et du changement de quantité. Le panier n’écrit pas dans le stock.
- **Ajouté au code :** pages d’inscription, connexion et panier estimatif; aucun bouton de confirmation actif.
- **Vérifié :** migration 005 appliquée à la base Neon configurée dans `backend/.env`; les tables `accounts`, `account_roles`, `carts` et `cart_items` existent, et le compte vendeur existant ainsi que son panier ont été repris.
- **Pas encore validé :** intégration PostgreSQL complète et parcours HTTP; aucun compte client ou produit de test n’a été créé dans Neon. Le backend hébergé n’a pas été déployé.
- **À faire ensuite :** déployer de façon coordonnée le backend avec `BACKEND_API_URL` configurée côté web, puis vérifier manuellement le parcours compte-panier. Le checkout reste une étape séparée.
