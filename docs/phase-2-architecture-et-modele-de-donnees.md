# ORIVFIDE — Phase 2 : architecture et modèle de données

**Version :** 0.3 — décisions de conception et feuille de route  
**Date :** 21 octobre 2026  
**Statut :** décisions de conception retenues; feuille de route fixée; migrations à préparer et tester  
**Référence commerciale :** [Cadrage de la phase 1](./phase-1-cadrage-commercial-et-operationnel.md)

> Ce document définit une cible technique proposée, pas une fonctionnalité déjà livrée. Les prestataires, frais, échéances de réservation, zones et délais non confirmés restent configurables ou en attente. Aucune migration ni commande réelle ne doit être lancée sur la seule base de cette proposition.

## 1. Objectif et périmètre

La phase 2 prépare un modèle cohérent pour :

- les comptes et permissions;
- les boutiques de vendeurs tiers et la responsabilité de la plateforme intermédiaire;
- les produits, variantes et unités de stock;
- les paniers, commandes multi-vendeurs et lignes figées au moment de l’achat;
- les réservations et mouvements de stock;
- les paiements directs à chaque vendeur, livraisons, remboursements et réclamations;
- l’historique des transitions et l’audit.

Le modèle doit préserver les données actuelles de `sellers`, `stores` et `products`. Les migrations seront additives, ordonnées et réversibles lorsque possible; les données de vente et de stock ne devront pas être détruites par une suppression en cascade.

## 2. État actuel à prendre en compte

- `sellers`, `stores` et `products` existent; un produit a un prix entier positif, une image, et un état actif/inactif.
- Les boutiques appartiennent aujourd’hui obligatoirement à un vendeur (`stores.seller_id NOT NULL`).
- Il n’existe pas encore de comptes client, rôles génériques, variantes, quantités de stock, commandes, paiements, livraisons ni journal des changements de statut.
- Le vendeur est le vendeur des produits partenaires; ORIVFIDE agit comme intermédiaire. Une activité de vente directe par ORIVFIDE n’est pas retenue dans le MVP courant sans cadrage contractuel séparé.
- Les paiements électroniques doivent suivre un flux vers le vendeur; le prestataire doit confirmer contractuellement la prise en charge de la commission ORIVFIDE. Le modèle ne suppose pas que la plateforme détienne les fonds.
- Les zones et tarifs de livraison sont proposés dans la phase 1 mais doivent être validés avec les coûts et partenaires. Le délai de réservation, les délais de retour et plusieurs conditions demeurent à définir.

## 3. Proposition d’architecture métier

### 3.1 Comptes et rôles

Décision retenue : utiliser une identité de compte commune avec des rôles explicites, notamment client, vendeur, support, modérateur et administrateur. Un compte peut avoir plusieurs rôles. Les permissions doivent être vérifiées côté serveur et appliquées aux lignes de données, pas uniquement à l’interface.

La transition depuis l’authentification vendeur actuelle doit être planifiée et testée : conserver les vendeurs et leurs mots de passe hachés, éviter les comptes dupliqués, et ne jamais journaliser les mots de passe, clés ou jetons. Les comptes administrateurs ne doivent pas dépendre d’une clé partagée lorsque les opérations de commande et de litige seront ouvertes.

### 3.2 Marchand vendeur tiers

Dans le MVP, chaque boutique, produit, unité de stock et sous-commande est rattaché au vendeur tiers concerné. Le vendeur demeure responsable des produits, de leur disponibilité, de leur conformité et de leur préparation; ORIVFIDE agit comme plateforme intermédiaire et coordonne les opérations prévues. Une éventuelle vente directe d’ORIVFIDE est hors périmètre tant que son rôle de vendeur, sa facturation et son stock ne sont pas contractuellement cadrés. Le schéma actuel `stores.seller_id` convient au MVP vendeur tiers et ne doit pas être rendu nullable pour anticiper une activité future non décidée.

Le bénéficiaire des paiements électroniques est le vendeur. Le paiement et le règlement de la commission proposée doivent être représentés séparément, avec les références opaques retournées par le prestataire. Ne jamais stocker de secret de paiement dans les lignes de commande. La capacité du prestataire à distribuer la commission doit être confirmée avant de choisir le modèle de règlement définitif.

### 3.3 Produit, variante et stock

- Un produit peut être vendu sans variante ou posséder des variantes (taille, couleur, modèle).
- Chaque unité commercialisable doit correspondre à une ligne d’inventaire identifiable par produit ou variante et marchand; un SKU peut être unique au sein du marchand.
- Enregistrer `on_hand` (stock physique) et `reserved` (quantité réservée), avec contraintes `on_hand >= 0`, `reserved >= 0` et `reserved <= on_hand`.
- Quantité disponible = `on_hand - reserved`. Le seuil d’alerte est configurable sur l’unité d’inventaire.
- Toute correction exige un motif et produit un mouvement append-only avec quantité avant/après, quantité modifiée, type, acteur, référence liée et horodatage.
- Les ventes et variantes déjà liées à des commandes sont archivées; elles ne sont pas supprimées destructivement.

Les types de mouvements incluent réception/réapprovisionnement, correction, réservation, libération, vente confirmée et retour remis en stock. Les ajustements de stock et le mouvement correspondant sont écrits dans une même transaction PostgreSQL.

### 3.4 Panier et commande multi-vendeurs

Décision retenue : un panier client peut regrouper plusieurs vendeurs, mais une confirmation crée :

1. une commande parente, qui porte la référence client et le résumé global;
2. une sous-commande par marchand, qui porte les lignes, la livraison, les montants et le cycle opérationnel de ce vendeur;
3. les paiements sont séparés par vendeur, conformément au principe de paiement direct au vendeur. La commission ORIVFIDE est calculée sur les produits après réduction, hors livraison, au taux proposé de 10 %; ce taux reste non confirmé et ne devient pas un engagement avant signature et validation.

Un échec d’un paiement vendeur ne doit pas marquer comme payées les sous-commandes des autres vendeurs. La confirmation globale doit exposer clairement les états partiels.

La commande copie au moment de sa création : nom et SKU du produit/variante, description utile, prix unitaire, devise, quantité, coordonnées de contact, adresse de livraison, vendeur, frais annoncés et total. Ces snapshots ne changent pas si le catalogue ou l’adresse du client évolue.

Décision retenue : devise comptable `XAF` (FCFA). Les montants sont des entiers; jamais de nombres flottants. Stocker séparément sous-total produits après réductions, livraison, commission, frais de paiement éventuellement confirmés, total client et net vendeur attendu. Les frais non définis ne sont pas calculés ni inventés. La commission est versionnée et son taux est figé dans chaque sous-commande; les annulations et remboursements total/partiel doivent régulariser ce montant selon les règles validées.

Règle arithmétique proposée pour la commission : arrondi commercial au XAF le plus proche, avec les demi-unités arrondies vers le haut. Le calcul ne s’applique qu’au taux effectivement confirmé et accepté; la valeur utilisée et le montant sont conservés dans la sous-commande.

Les frais de livraison sont à la charge du client selon le cadrage, avec des tarifs par zones proposés (1 500, 2 000 ou 2 500 FCFA). Stocker l’identifiant/version de la grille et le montant snapshot dans la commande. La grille reste soumise à validation des coûts. Le schéma de configuration devra permettre à l’admin d’activer/désactiver des zones de Douala/Yaoundé et de modifier les tarifs avec dates d’effet, sans recalculer les commandes déjà confirmées.

### 3.5 Réservation de stock et concurrence

La réservation est une opération atomique et idempotente dans une transaction :

1. vérifier que le produit, sa boutique et l’unité de stock sont vendables;
2. réserver uniquement si `on_hand - reserved >= quantité demandée`;
3. enregistrer la réservation et le mouvement correspondant;
4. en cas de conflit de stock, annuler toute la réservation du marchand concerné.

Une contrainte conditionnelle ou un verrouillage de ligne PostgreSQL protège des commandes concurrentes. Le navigateur ne fournit jamais une preuve de prix ou de disponibilité.

Pour un paiement électronique, à la confirmation fiable du paiement, la réservation devient une sortie physique : diminuer `on_hand` et `reserved` dans la même transaction. À l’échec, l’annulation ou l’expiration, diminuer `reserved` et journaliser la libération.

Décision retenue pour le paiement à la livraison : réserver le stock à la confirmation de commande et diminuer le stock physique lors de la remise effective au livreur. En cas d’échec ultérieur, le stock ne revient au disponible qu’après retour vérifié de l’article au vendeur et enregistrement d’un mouvement de retour. Le flux réel de collecte, de reversement et la preuve transporteur restent à valider opérationnellement.

Une tâche récurrente côté serveur devra libérer les réservations expirées après redémarrage du service. Elle doit pouvoir être relancée sans doubler les mouvements. Les réservations sont identifiées de façon unique et les callbacks prestataire sont traités avec une clé d’idempotence.

### 3.6 Paiement et remboursement

Séparer l’état de commande de l’état du paiement. Un paiement appartient à une sous-commande et conserve le prestataire, le marchand bénéficiaire, montant entier/devise, référence externe, statut, dates et tentatives. Les données de carte et secrets du prestataire restent chez le prestataire.

Les statuts précis seront adaptés aux intégrations contractualisées. Le serveur vérifie le callback/signature et le montant, le marchand, la référence et l’idempotence avant toute confirmation. Un remboursement est une opération séparée liée au paiement initial, avec montant, motif, responsable, statut, référence et preuve.

Pour un virement, si ce moyen est retenu, la confirmation nécessite une procédure documentée de constat de réception effective; une capture d’écran client ne suffit pas. Pour le paiement à la livraison, enregistrer le montant dû, la preuve de collecte, le rapprochement hebdomadaire et la référence de versement prévue. Le cycle proposé est clôture dimanche soir, rapprochement lundi, programmation mardi, sous réserve de validation du responsable, des contrats et du circuit réel des fonds. La modélisation ne présume pas qu’ORIVFIDE peut légalement détenir ou répartir des fonds.

### 3.7 Livraison, réclamations et audit

- Une livraison est rattachée à une sous-commande, un partenaire et un snapshot d’adresse, avec frais, suivi, statuts horodatés et référence de preuve. La preuve de remise envisagée est un code transmis au client, validé à la remise et journalisé avec date; ne stocker que le nécessaire pour éviter l’exposition du code.
- une réclamation/litige a une référence unique, une commande, un motif, un responsable opérationnel, des preuves, des échanges, des décisions justifiées et un résultat. L’objectif de premier accusé de réception sous deux jours ouvrables est un objectif de service proposé, pas une garantie de résolution; il doit être configurable et activé après validation opérationnelle.
- L’historique de statut commande/paiement/livraison et le journal d’audit sont append-only. Un audit contient acteur, action, type/id de ressource, horodatage et métadonnées minimales, sans secrets.
- Chaque endpoint client ou vendeur filtre et autorise les données par compte et par marchand côté serveur.

## 4. Entités relationnelles cibles

```text
accounts ──< account_roles
   └── 0..1 seller_profile
seller_profile ──< stores
stores ──< products ──< product_variants
                         └── 0..1 inventory_item
inventory_item ──< stock_movements
accounts ──< carts ──< cart_items
accounts ──< orders ──< seller_orders ──< order_items
                                      ├── payments ──< refunds
                                      ├── shipments ──< shipment_events
                                      └── disputes
orders, seller_orders, payments, shipments ──< status_events
resources ──< audit_log
```

Le client connecté possède ses paniers et commandes; une commande parente contient une ou plusieurs sous-commandes vendeur. Le rattachement boutique-vendeur est retenu pour le MVP. La ligne de commande peut pointer vers le produit source pour navigation, mais ses snapshots restent la référence immuable de la transaction.

## 5. Transitions d’état proposées

Les états exacts sont des propositions; les événements et autorisations qui les déclenchent doivent être codés explicitement. Tout changement enregistre l’état précédent, le nouvel état, l’acteur, le motif éventuel et l’heure.

| Domaine | Cycle proposé | Remarques |
|---|---|---|
| Sous-commande | `awaiting_confirmation` → `confirmed` → `preparing` → `handed_to_carrier` → `in_transit` → `delivered` | `cancelled`, `delivery_failed`, `returned`, `disputed` sont des branches, pas des suppressions |
| Paiement électronique | `pending` → `confirmed` ou `failed`/`expired` | La confirmation vient du serveur/prestataire; transitions idempotentes |
| Paiement à la livraison | `due_on_delivery` → `collected` → `remitted_to_seller` | Seulement si le partenaire offre et contracte ce circuit |
| Réservation | `active` → `committed` ou `released`/`expired` | Une seule transition terminale; jamais de double décrément |
| Livraison | `pending_pickup` → `picked_up` → `in_transit` → `delivered` | `attempt_failed`, `damaged`, `lost`, `returning`, `returned` selon le partenaire |
| Remboursement | `requested` → `approved`/`rejected` → `processing` → `completed`/`failed` | Montant et preuve rattachés au paiement original |
| Réclamation | `open` → `awaiting_seller`/`awaiting_customer` → `in_review` → `resolved`/`closed` | Délais et escalades restent à définir |

Annulation de commande, selon le cadrage à traduire en règles et à faire valider : avant acceptation vendeur, annulation client sans frais; après acceptation mais avant début réel de préparation, annulation possible sans frais; après début de préparation, décision examinée; après remise au livreur, pas d’annulation simple, mais signalement ou refus avec motif tracé. Aucun frais automatique sans validation préalable. Les droits légaux du client restent applicables.

Une commande parente peut avoir un état agrégé distinct calculé à partir de ses sous-commandes; elle ne remplace pas le suivi par vendeur.

## 6. Migrations envisagées (pas encore créées)

Découper la transition en migrations révisables :

1. comptes/rôles et rattachements compatibles avec les vendeurs existants;
2. variantes optionnelles, inventaire, mouvements et contraintes;
3. panier et commandes, sous-commandes, lignes snapshot et événements;
4. paiements, remboursements, livraisons, réclamations et audit;
5. index, contraintes d’idempotence et tâches de nettoyage/réservation.

Avant application : vérifier le schéma Neon réel, faire une sauvegarde restaurable, tester migrations depuis une copie représentative, vérifier les verrous et la durée, prévoir le retour arrière opérationnel et ne jamais déployer la migration de production sans revue.

## 7. Tests/garanties nécessaires avant la phase 3

- Modèle relationnel et transitions approuvés; responsabilités marchand et commande multi-vendeur confirmées.
- Vérifier par contraintes qu’aucune quantité ou somme ne devient négative et que les devises/montants sont explicites.
- Deux réservations concurrentes pour la dernière unité : exactement une réussit.
- Une libération, expiration, callback paiement ou livraison rejoué ne modifie le stock ou l’état qu’une fois.
- Toute transition interdit une sortie d’état non autorisée; l’historique conserve acteur et motif.
- Isolation stricte : client et vendeur ne lisent ni ne modifient pas les données d’un autre compte/marchand.
- Migration et restauration testées sans perte du catalogue existant.

## 8. Décisions de conception retenues

Les choix suivants ont été confirmés par le porteur du projet pour guider la conception du MVP :

1. **Commande multi-vendeurs :** commande parente avec sous-commandes distinctes par vendeur et paiements séparés.
2. **Rôle commercial :** les vendeurs partenaires vendent leurs produits; ORIVFIDE agit comme intermédiaire. La vente directe ORIVFIDE est hors périmètre du MVP actuel, sauf cadrage contractuel distinct.
3. **Compte client :** obligatoire pour passer commande, consulter l’historique et suivre les réclamations.
4. **Variantes :** prévues dans le modèle dès la conception, mais facultatives par produit et utilisées lorsque nécessaire.
5. **Paiement à la livraison et stock :** réservation à la confirmation, sortie du stock physique à la remise au livreur; réintégration uniquement après retour vérifié.
6. **Devise :** XAF (FCFA); montants stockés comme entiers.
7. **Identité :** comptes unifiés avec rôles explicites et migration progressive des vendeurs existants.
8. **Livraison :** zones et grille par quartier activables par l’administration; tarifs proposés en phase 1 à valider, chaque commande conservant un snapshot du montant.

Le cadrage consolidé de phase 1 fixe aussi le pilote au Cameroun (Douala/Yaoundé et quartiers listés), la commission proposée de 10 % hors livraison, les tarifs de livraison proposés, les reversements COD hebdomadaires proposés, le code de preuve de remise, un objectif de premier accusé de réception sous deux jours ouvrables et les règles d’annulation par statut. Ces éléments restent soumis aux validations phase 1; ils ne sont pas des tarifs ou engagements de production approuvés.

## 9. Validations opérationnelles restantes

Ces validations ne modifient pas les choix d’architecture ci-dessus, mais conditionnent le détail final du schéma et l’ouverture des transactions :

1. Confirmer la commission de 10 %, sa base et ses régularisations; sélectionner un prestataire compatible avec le paiement direct vendeur et le règlement de commission.
2. Confirmer le prestataire électronique, ses frais, callbacks, remboursements et traitement des doublons.
3. Valider partenaire/processus logistique, couverture réelle, tarifs, preuve de remise et preuve de retour au vendeur.
4. Définir les délais et événements d’expiration des commandes/réservations non payées, abandonnées ou refusées.
5. Désigner le responsable et confirmer le calendrier proposé dimanche/lundi/mardi, le rapprochement COD et le circuit légal de collecte et reversement.
6. Confirmer les attributs de variantes/SKU requis par catégorie.
7. Définir la migration des comptes vendeur et l’évolution de l’accès admin actuel vers les comptes unifiés sans perte d’accès ni duplication.
8. Valider le traitement de la livraison par sous-commande lorsqu’un panier contient plusieurs vendeurs.

## 10. Décisions prises pour la suite des phases

Ces choix débloquent la conception et les développements en environnement de test. Ils ne constituent pas une approbation juridique, une confirmation de partenaire ou une autorisation de lancement.

### Phase 3 — Catalogue et stock

- Chaque produit reçoit une variante « Standard » par défaut; le vendeur peut ajouter des variantes identifiables par SKU et attributs lorsque nécessaire. Le stock et son seuil sont attachés à l’unité vendable (variante).
- Pour les produits existants, le stock initial est migré à **0**, car aucune quantité fiable n’existe dans la base actuelle. Le produit reste visible mais est indiqué indisponible et non achetable tant que le vendeur n’a pas enregistré un stock initial avec un motif.
- Stock disponible = physique `on_hand` moins réservations `reserved`. Quantités entières, jamais négatives, `reserved <= on_hand`.
- Toute entrée, sortie ou correction exige un motif, l’acteur et une écriture append-only avec avant/après; les mouvements et la quantité sont modifiés dans une même transaction.
- Les ventes à zéro ne sont pas achetables. Ne pas retirer automatiquement une fiche du catalogue public : la conserver visible avec état « épuisé » évite de casser les liens et favoris.
- Les alertes de seuil faible et rupture apparaissent d’abord dans le tableau vendeur/admin; email/SMS attendent la mise en place d’un prestataire de notification.
- Les produits liés à une vente ne seront jamais supprimés physiquement; prévoir l’archivage.
- Pour l’électronique, réserve à la création du paiement; expiration par défaut **15 minutes en environnement de test**, valeur configurable. À confirmation serveur, consommer physiquement le stock; à échec, annulation ou expiration, libérer la réservation.
- Pour le paiement à la livraison, réserver à la confirmation de commande; consommer physiquement au scan/événement vérifié de remise au transporteur. Après échec, ne réintégrer qu’au retour vérifié et enregistré par le vendeur.
- Réservations/COD non acceptés par le vendeur : expiration de travail de **24 heures** en test, configurable et libérant le stock. Ne pas appliquer en production avant validation opérationnelle et affichage de la règle au vendeur/client.
- Les opérations concurrentes utilisent PostgreSQL transactionnel et une mise à jour conditionnelle/verrou de ligne; rejouer une requête avec la même clé ne crée pas un second mouvement.

### Phase 4 — Panier et commandes

- Compte client obligatoire; pas de commande invitée dans le MVP, afin d’assurer le suivi, l’accès autorisé et les réclamations.
- La conception détaillée des identités, paniers, snapshots de commande, API et garde-fous est dans [la conception phase 4](./phase-4-conception-panier-commandes.md). Les comptes communs/rôles et paniers sont préparés avant la commande; l’espace client complet et les notifications restent en phase 6.
- Un panier multi-vendeurs crée un numéro parent et une sous-commande par vendeur. Chaque sous-commande possède son cycle, son paiement, son stock et sa livraison.
- Frais de livraison calculés par sous-commande (un colis vendeur = une livraison) et totalisés dans la commande parent; le client voit les frais de chaque vendeur avant confirmation. Ne pas supposer qu’un panier de vendeurs différents constitue un seul colis.
- Le serveur recalcule tous les prix et disponibilités; snapshots immuables du produit/variante, prix XAF, quantité, coordonnées, adresse, grille de livraison, commission et montants à l’instant de la confirmation.
- Pas de promotions, frais de service ni taxe calculée dans le MVP tant que les règles correspondantes ne sont pas confirmées. La commission reste une proposition; son taux/version doit être configurable et figé dans le snapshot.
- Annulation avant acceptation vendeur sans frais; après acceptation mais avant début réel de préparation sans frais; après préparation, traitement avec examen; après remise au livreur, incident/refus plutôt qu’annulation simple. Stock et argent suivent une transition tracée, jamais une suppression de commande.

### Phase 5 — Paiement et livraison

- Construire une interface d’adaptation fournisseur de paiement, mais commencer par un fournisseur simulé réservé aux tests. **Aucun faux paiement ne sera activable en production.**
- Aucun prestataire réel n’est choisi par défaut. Paiement électronique en production désactivé jusqu’à contrat, confirmation de paiement serveur, frais, mécanisme de commission et remboursement validés.
- Paiement à la livraison peut être modélisé et testé; ne pas considérer le paiement comme encaissé ni le reversement comme effectué sans preuve de collecte et rapprochement réel.
- Démarrer le pilote avec une livraison manuelle traçable si aucun partenaire n’est intégré : opérateur identifié, statuts historisés, code de preuve à usage unique, incidents et preuve de remise. Activer uniquement les zones et tarifs validés; les valeurs proposées dans la phase 1 restent des brouillons de configuration.
- Les webhooks doivent être authentifiés, idempotents, contrôler montant/devise/référence et tolérer répétition ou désordre. Les remboursements sont séparés, justifiés et plafonnés au montant non remboursé.

### Phase 6 — Comptes, notifications et expérience

- Comptes unifiés et rôles explicites; client, vendeur, support, modérateur et admin ont des permissions minimales.
- Authentification client obligatoire pour commander; accès aux commandes limité au compte propriétaire. Les vendeurs n’accèdent qu’à leurs sous-commandes et stocks.
- Mettre d’abord en place l’espace client (profil, commandes, statuts, adresse snapshot et demandes de support) et l’espace vendeur (commandes à préparer, stocks, mouvements, alertes).
- Favoris restent locaux jusqu’à la disponibilité des comptes clients; les migrer vers le compte ultérieurement sans perdre les favoris locaux.
- Notifications email transactionnelles comme premier canal seulement après choix d’un fournisseur et gestion des rebonds; SMS après mesure des besoins/coûts. Les notifications ne sont jamais une preuve de paiement/livraison.
- La récupération de mot de passe n’est développée qu’avec un canal vérifié et des jetons à durée limitée, à usage unique; pas de mécanisme manuel qui divulgue un compte ou un secret.

### Phase 7 — Administration et support

- Remplacer la clé admin partagée par des comptes admin individuels et rôles avant commandes réelles; le mécanisme actuel peut rester temporairement pour les opérations existantes mais ne donne pas d’identité d’audit satisfaisante.
- Ajouter journal d’audit obligatoire aux approbations, refus, suspensions, changements de stock par admin, transitions de commande, ajustements financiers et remboursements.
- Ajouter pagination/recherche aux listes et vues de commande consolidant vendeur, paiement, stock, livraison et événements.
- Remboursement, suspension et modification financière exigent un motif; les actions financières à risque doivent nécessiter une permission dédiée et confirmation explicite.
- Support commence avec des dossiers de réclamation liés à la commande, preuves, responsable et historique; objectif de réponse de deux jours ouvrables affiché uniquement après validation de la capacité opérationnelle.

### Phase 8 — Qualité, sécurité et exploitation

- Tests automatisés backend/API et base de test pour stock, concurrence dernière unité, idempotence, transitions et permissions client/vendeur/admin.
- Build/lint/typecheck et tests requis avant merge/déploiement; tests de parcours de bout en bout avant pilote.
- Sauvegardes Neon configurées selon le plan réellement souscrit et restauration répétée documentée avant transactions réelles; aucune hypothèse sur les capacités du compte.
- Journalisation sans secrets ou données de carte; HTTPS et cookies sécurisés en production; examen dépendances, alertes d’erreur et procédure de retour arrière.
- Les réservations expirées sont libérées par une tâche persistante/rejouable côté backend, qui fonctionne après redémarrage et journalise les résultats.

### Phase 9 — Pilote et lancement

- Lancement progressif en quatre étapes : catalogue actuel; préproduction avec paiement simulé; pilote réel limité à des vendeurs/zones explicitement sélectionnés; extension seulement après revue des incidents et indicateurs.
- Le pilote ne démarre qu’après vérification simultanée du stock, du parcours commande, paiement réel si activé, livraison, support, droit d’accès, documents juridiques, sauvegarde/restauration et plan de rollback.
- Aucun seuil arbitraire de nombre de vendeurs ou de commandes n’est fixé ici; le responsable opérationnel le décide selon sa capacité de support et de rapprochement.
- Décision go/no-go documentée par les responsables; en cas d’échec de contrôle financier, survente ou accès non autorisé, arrêt des transactions et retour au catalogue seul.

### Phase 10 — Évolutions après stabilisation

- Après un pilote sans défaut bloquant : promotions, avis modérés, recherche/recommandations, analytics vendeurs, automatisation logistique, application/PWA.
- Pas de multi-pays ni multi-devises avant validation de la première zone, des paiements, du support et de la conformité.

## 11. État des phases et prochain lot

La migration et les premiers écrans/API de la **Phase 3 : stock vendeur** ont été ajoutés; la migration `004_product_inventory.sql` a été appliquée à Neon production après confirmation explicite. La spécification est dans [la conception du stock phase 3](./phase-3-conception-stock.md). Les tests d’intégration DB n’ont pas encore été exécutés car aucune base de test isolée n’est configurée; le test est ignoré sans `ORIVFIDE_TEST_DATABASE_URL` et sa confirmation explicite.

La conception phase 4 est détaillée dans [comptes clients, panier et commandes](./phase-4-conception-panier-commandes.md). Un premier incrément de comptes clients et panier est maintenant présent dans le code, avec migration 005 non appliquée. Aucun schéma de commande, checkout, paiement ou livraison n’a été activé. La validation des tests phase 3 sur base isolée demeure un préalable au développement transactionnel des commandes.

**Garde-fou :** la migration 005 doit être testée sur une base dédiée avant déploiement coordonné. La confirmation de commande, les paiements et la livraison restent désactivés tant que les tests techniques, validations commerciales/juridiques, frais, partenaires et zones n’ont pas été vérifiés. Aucun document de conception ne constitue une autorisation de lancer des transactions.
