# ORIVFIDE — Conception détaillée phase 3 : catalogue et stock

**Version :** 0.2 — conception et première implémentation  
**Date :** 23 octobre 2026  
**Statut :** migration et première implémentation ajoutées; validation d’intégration encore requise  
**Dépendance :** [Architecture et décisions des phases](./phase-2-architecture-et-modele-de-donnees.md)

> La migration `004_product_inventory.sql` a été appliquée à Neon production après confirmation explicite le 23 octobre 2026. Le runner a confirmé ensuite que la base était à jour. Les tests d’intégration ajoutés doivent encore être lancés sur une base de test dédiée; ne pas les diriger vers la production.

## 1. Objectif et périmètre de phase 3

Livrer aux vendeurs un stock exact et traçable par produit/variante, avec seuil d’alerte et prévention des quantités négatives. Cette phase n’implémente ni panier, ni commande client, ni paiement. Les quantités réservées et les mouvements `reservation`, `release` et `sale` sont prévus dans le modèle pour les phases suivantes, mais aucune route publique ne pourra encore créer une réservation ou une vente.

### Décisions retenues

- Toute fiche vendable possède une variante par défaut `Standard`; les variantes additionnelles sont facultatives (taille, couleur, modèle, etc.).
- Le stock appartient à une variante, jamais directement au produit.
- Les produits déjà enregistrés reçoivent un variant `Standard` et un stock initial de zéro. Leur historique ne permet pas de déduire une quantité initiale; aucune valeur ne sera inventée.
- Le produit peut rester publié avec un état « épuisé »; il n’est pas supprimé ni retiré du catalogue uniquement parce que son stock est zéro.
- `available = on_hand - reserved`; au lancement de la phase 3 `reserved` demeure zéro, car aucune commande n’existe.
- Tout changement de quantité exige un motif et produit un mouvement non modifiable.
- Le vendeur peut consulter uniquement les variantes, stocks et mouvements de sa propre boutique.
- Les changements de stock admin sont différés jusqu’à l’existence de comptes admin individuels et d’un journal d’audit fiable.

## 2. Modèle relationnel

```text
stores 1 ──< products 1 ──< product_variants 1 ── 1 inventory_items
                                                     └──< stock_movements
```

### `product_variants`

Une variante est une unité de vente. La variante par défaut est créée automatiquement au moment de l’ajout d’un produit. Les colonnes proposées :

| Colonne | Type/règle | Objet |
|---|---|---|
| `id` | UUID PK | Identité stable |
| `store_id` | UUID non nul | Marchand, également utilisé pour garantir l’unicité du SKU |
| `product_id` | UUID FK composite `(product_id, store_id)` vers `products(id, store_id)` `ON DELETE RESTRICT` | Produit parent et contrôle de cohérence marchand |
| `label` | texte, non vide, max 120 | Ex. `Standard`, `Rouge / M` |
| `sku` | texte nullable, max 80 | SKU saisi par le vendeur |
| `attributes` | JSONB objet, défaut `{}` | Attributs non secrets (taille, couleur, modèle) |
| `is_default` | bool, défaut false | Une seule variante par défaut par produit |
| `is_active` | bool, défaut true | Archivage logique, pas de suppression destructive |
| `created_at`, `updated_at` | timestamptz | Dates |

Contraintes/index :

- unique partiel sur `product_id` lorsque `is_default = true`;
- unique partiel sur `(store_id, sku)` lorsque `sku IS NOT NULL`;
- index `(product_id, is_active)`;
- index unique préalable `products(id, store_id)` nécessaire au FK composite;
- validation API de `attributes` comme objet JSON simple de taille limitée; aucune valeur exécutable ou donnée personnelle.

Si un vendeur ajoute des variantes à un produit `Standard`, cette variante devient une option normale; elle n’est jamais supprimée automatiquement. Le vendeur doit explicitement désactiver les options qu’il ne vend plus; une variante avec commande future ne sera jamais supprimée physiquement.

### `inventory_items`

Une ligne d’inventaire par variante :

| Colonne | Type/règle | Objet |
|---|---|---|
| `id` | UUID PK | Identité de l’inventaire |
| `variant_id` | UUID FK `product_variants(id)` `ON DELETE RESTRICT`, unique | Inventaire de la variante |
| `on_hand` | integer, défaut 0, `>= 0` | Quantité physique |
| `reserved` | integer, défaut 0, `>= 0` et `<= on_hand` | Quantité retenue par les commandes futures |
| `low_stock_threshold` | integer, défaut 0, `>= 0` | Seuil configuré par le vendeur |
| `version` | bigint, défaut 0, `>= 0` | Révision incrémentée à chaque mutation |
| `updated_at` | timestamptz | Dernier changement |

La quantité disponible est calculée et non stockée : `on_hand - reserved`. L’API ne doit jamais accepter `available` du navigateur comme source de vérité.

### `stock_movements`

Journal append-only de toute variation de stock :

| Colonne | Type/règle | Objet |
|---|---|---|
| `id` | UUID PK | Mouvement |
| `inventory_item_id` | UUID FK `inventory_items(id)` `ON DELETE RESTRICT` | Inventaire concerné |
| `movement_type` | enum/check | `initial`, `receipt`, `correction`, `reservation`, `release`, `sale`, `return` |
| `delta_on_hand` | integer | Variation physique signée |
| `delta_reserved` | integer | Variation réservée signée |
| `on_hand_before`, `on_hand_after` | integer non négatif | Trace explicite avant/après |
| `reserved_before`, `reserved_after` | integer non négatif | Trace explicite avant/après |
| `reason` | texte trim, 3–500 caractères | Motif humain obligatoire |
| `actor_type` | `seller` ou `system` en phase 3 | Auteur de l’action |
| `actor_seller_id` | UUID FK `sellers(id)`, nullable seulement pour `system` | Vendeur responsable |
| `reference_type`, `reference_id` | nullable | Référence commande/réservation dans les phases ultérieures |
| `idempotency_key` | UUID unique | Rejeu sûr d’une requête |
| `request_hash` | texte | Empêche de réutiliser une clé avec un autre contenu |
| `created_at` | timestamptz | Horodatage |

Contraintes :

- `on_hand_after = on_hand_before + delta_on_hand`;
- `reserved_after = reserved_before + delta_reserved`;
- quantités avant/après non négatives et réservées jamais supérieures au physique;
- en phase 3, un mouvement vendeur exige `actor_seller_id`; les mouvements `system` sont réservés aux opérations serveur futures;
- types `initial`, `receipt`, `correction` et `return` ne changent que `on_hand`; `reservation` et `release` ne changent que `reserved`; `sale` diminue `on_hand` et `reserved` du même nombre;
- le type `initial` ne peut être créé que par la migration pour les variantes existantes; toutes les mutations postérieures passent par l’API.

Index : `(inventory_item_id, created_at DESC)` pour l’historique; unique sur `idempotency_key`. Des triggers bloquent `UPDATE`, `DELETE` et `TRUNCATE` sur les deux journaux. Les droits SQL de l’utilisateur applicatif doivent également rester limités lors de la configuration de la base. Les corrections se compensent par un nouveau mouvement.

### `inventory_threshold_events`

Les changements de seuil sont conservés séparément des quantités physiques : inventaire concerné, valeur avant/après, motif, vendeur, clé d’idempotence et empreinte de la requête. Cela évite de comptabiliser un changement de configuration comme une réception ou une vente.

## 3. Mouvements de phase 3 et règles de quantité

Pour la première version, les opérations accessibles au vendeur sont :

| Opération API | Variation | Type journalisé |
|---|---|---|
| Ajouter du stock reçu | `quantityDelta > 0` | `receipt` |
| Retirer du stock (perte, casse, retour fournisseur, etc.) | `quantityDelta < 0` | `correction` |
| Corriger vers le haut ou le bas | `quantityDelta != 0` | `correction` |
| Modifier le seuil d’alerte | stock inchangé; seuil avant/après tracé dans `inventory_threshold_events` | pas un mouvement physique |

`reason` est obligatoire même pour une réception. Une correction à la baisse est rejetée si elle rend `on_hand < reserved`. Toute quantité est un entier strictement différent de zéro, plafonné côté API à 1 000 000 unités par demande; `on_hand`, `reserved` et les valeurs après opération ne dépassent pas la capacité d’un entier PostgreSQL (`2 147 483 647`). Les limites sont également imposées par les contraintes de base.

Le seuil est une configuration, pas une quantité en stock. Son historique pourra utiliser le journal d’audit admin/seller ultérieur; il ne doit pas être faussement comptabilisé comme réception ou vente.

## 4. Mutations atomiques et idempotence

Toutes les mises à jour se font dans une transaction PostgreSQL :

1. authentifier un vendeur actif;
2. charger l’inventaire par identifiant avec jointure `inventory → variant → product → store`;
3. vérifier que `store.seller_id` correspond au vendeur authentifié;
4. verrouiller l’inventaire avec `SELECT ... FOR UPDATE`;
5. calculer les quantités et rejeter si une contrainte serait violée;
6. mettre à jour `inventory_items` et incrémenter `version`;
7. insérer un seul mouvement avec l’état avant/après et le hash canonique de la demande;
8. commit; si une étape échoue, rollback de toutes les écritures.

Le client génère un UUID `idempotencyKey` par action. Si la clé existe et que le hash de la nouvelle requête correspond, renvoyer le mouvement déjà enregistré sans réappliquer le delta. Si la clé est réutilisée avec un corps différent, répondre `409 Conflict`. Un échec réseau suivi d’une répétition ne peut donc pas doubler le stock.

La lecture seule peut utiliser une requête standard; aucune mise à jour de quantité ne doit être effectuée par une simple lecture/écriture sans verrou ou mise à jour conditionnelle.

## 5. Contrats API proposés

Les routes sont des propositions pour phase 3; elles nécessitent authentification et validation Zod côté backend.

### Lire l’inventaire vendeur

`GET /api/seller/inventory?limit=50&cursor=...`

Retour paginé (50 max) contenant produit, variante, SKU, état actif, `onHand`, `reserved`, `available`, `lowStockThreshold`, état d’alerte (`out_of_stock`, `low_stock`, `healthy`), `version` et `updatedAt`. Ces quantités détaillées sont privées au vendeur propriétaire.

Calcul des états : `out_of_stock` si available = 0; sinon `low_stock` si le seuil est supérieur à 0 et available <= seuil; sinon `healthy`.

### Modifier une quantité

`POST /api/seller/inventory/:inventoryItemId/movements`

```json
{
  "quantityDelta": 12,
  "reason": "Réception fournisseur",
  "idempotencyKey": "UUID"
}
```

Retourne le mouvement et l’état courant. `quantityDelta` peut être positif ou négatif, jamais zéro. Si la réduction excède le stock non réservé, retourner `409` sans créer de mouvement.

### Configurer un seuil

`PATCH /api/seller/inventory/:inventoryItemId/threshold`

```json
{
  "lowStockThreshold": 5,
  "reason": "Seuil de réapprovisionnement",
  "idempotencyKey": "UUID"
}
```

Le seuil est un entier de 0 à 1 000 000. La propriété appartient au vendeur; accès non propriétaire retourne `404` pour ne pas révéler l’existence d’un inventaire tiers.

### Historique de mouvements

`GET /api/seller/inventory/:inventoryItemId/movements?limit=50&cursor=...`

Ordre chronologique inverse; maximum 50 par page; renvoie type, variation, avant/après, motif, acteur et date. Les mouvements restent en lecture seule.

### Variantes

- Créer une variante via `POST /api/seller/products/:productId/variants` avec label, SKU optionnel et attributs.
- Archiver via `PATCH /api/seller/variants/:variantId` avec `isActive: false`.
- Il n’existe pas de suppression destructive ni de remplacement d’inventaire par écriture directe.
- La création du produit crée dans la même transaction variante Standard + inventaire à zéro.

## 6. Réponse publique catalogue

Pour ne pas casser les pages existantes, ajouter les informations sans supprimer les propriétés actuelles :

- sur les fiches produit publiques, exposer uniquement `available` (booléen), calculé sur le stock disponible agrégé des variantes actives;
- une fiche produit épuisée reste consultable mais n’est pas achetable; l’interface affiche « Épuisé »;
- une variante inactive n’entre pas dans le calcul;
- avant l’implémentation des commandes, ces champs sont informatifs seulement. Aucun faux bouton d’achat n’est ajouté.

Ne pas exposer la quantité exacte au public afin de ne pas divulguer le niveau de stock commercial. Les endpoints vendeur restent la source du détail.

## 7. Migration des produits existants

La migration additive est disponible dans `backend/migrations/004_product_inventory.sql`. Le runner l’applique dans sa transaction habituelle si elle n’apparaît pas déjà dans `schema_migrations` :

1. créer `product_variants`, `inventory_items`, `stock_movements` et les contraintes/index;
2. pour chaque produit existant, créer une variante `Standard` avec SKU null et attributs `{}`;
3. créer son inventaire `on_hand = 0`, `reserved = 0`, seuil 0 et version 0;
4. créer un mouvement `initial` à zéro, motif système indiquant que le stock antérieur n’était pas suivi;
5. vérifier qu’il existe exactement une variante par défaut et un inventaire par produit;
6. valider le nombre de lignes migrées par rapport au nombre de produits, dans la même transaction;
7. conserver `products.is_active` et les images; la visibilité du catalogue reste indépendante de l’état de stock.

La migration a été appliquée à Neon production avec le runner; les tests de backfill et de contraintes doivent encore être exécutés sur un environnement de test séparé. Une nouvelle base doit appliquer `004_product_inventory.sql` avant de démarrer une version backend qui requiert ces tables.

## 8. Tests d’acceptation

1. Un produit nouveau crée exactement sa variante Standard et son inventaire zéro.
2. Tous les produits existants sont migrés vers inventaire zéro sans changer leur prix, image, boutique ou statut.
3. Une correction positive et une correction négative créent des mouvements avec auteur, motif et quantités exactes avant/après.
4. Le rejet d’une correction supérieure au stock disponible ne modifie ni inventaire ni journal.
5. Deux requêtes concurrentes qui retirent la dernière unité : au plus une réussit; aucune quantité négative.
6. Répéter une demande avec la même clé et le même corps n’applique qu’une seule fois le delta; même clé avec autre corps retourne `409`.
7. Un vendeur A ne peut lire, configurer ou corriger le stock du vendeur B, même avec un UUID valide.
8. Seuil zéro désactive l’alerte faible; seuil positif déclenche l’alerte lorsque available <= seuil; zéro disponible déclenche rupture.
9. Le produit épuisé reste affiché publiquement sans être présenté comme disponible; une variante inactive n’ajoute pas au total.
10. Les mouvements ne peuvent pas être modifiés ou supprimés par les routes vendeur/admin.
11. Échec à l’insertion du mouvement ou à la mise à jour quantité entraîne rollback complet.
12. Migration/restore testés sur une base temporaire; aucune commande de migration Neon réelle pour cette spécification.

## 9. État d’implémentation et prochaines vérifications

1. **Ajouté au code :** migration `004_product_inventory.sql`, variantes Standard, inventaire initial zéro et mouvement initial.
2. **Ajouté au code :** routes privées vendeur pour l’inventaire, les ajustements transactionnels/idempotents, les seuils, l’historique et les variantes.
3. **Ajouté au code :** actions serveur et tableau vendeur pour ajuster les quantités, configurer les alertes, consulter l’historique et gérer les variantes.
4. **Ajouté au code :** indicateur public `available` sans quantité exacte et présentation « Épuisé ».
5. **À faire :** exécuter `npm run test:inventory` sur une base de test dédiée pour vérifier le backfill, les contraintes, le verrouillage concurrent et les journaux append-only.
6. **À faire :** ajouter des tests HTTP d’intégration pour les réponses API, l’idempotence et l’isolation vendeur; le test DB actuel ne remplace pas ces contrôles.
7. **À faire :** valider les parcours UI sur un environnement de test et appliquer la migration à toute nouvelle base avant le déploiement du backend/web.

**Critère de sortie phase 3 :** le vendeur peut gérer son stock et son seuil, chaque mouvement est traçable, l’isolation vendeur et les écritures concurrentes sont testées, les anciennes fiches sont à zéro et le catalogue indique l’indisponibilité. Les commandes et paiements demeurent hors périmètre de ce lot.
