# ORIVFIDE — Frontend

Application Next.js du projet ORIVFIDE. Les comptes vendeurs, les boutiques et les produits sont gérés par l’API Node.js du dossier `backend`; le frontend ne se connecte pas directement à PostgreSQL.

## Développement local

1. Démarrer le backend à partir du dossier `backend` (voir son README).
2. Copier `.env.example` dans `.env.local` si l’URL de l’API diffère de la valeur locale.
3. Depuis ce dossier, lancer :

   ```bash
   npm install
   npm run dev
   ```

Le site est disponible sur [http://localhost:3000](http://localhost:3000).

## Déploiement

Déployer `web` comme projet Next.js avec `web` pour répertoire racine dans Vercel. Définir `BACKEND_API_URL` avec l’URL HTTPS du backend Node.js déployé. Le navigateur utilise des Server Actions Next.js et des cookies `HttpOnly`; les appels au backend sont donc exécutés côté serveur. Pour administrer les demandes, ouvrir `/admin/connexion` : la clé doit être définie comme `ADMIN_API_KEY` dans les variables du backend Railway.

Les inscriptions vendeurs restent en attente et privées jusqu’à leur approbation dans `/admin/vendeurs`. Le parcours de signature du contrat est suspendu jusqu’à la finalisation du contrat ORIVFIDE.
