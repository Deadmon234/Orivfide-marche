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

Déployer `web` comme projet Next.js avec `web` pour répertoire racine dans Vercel. Définir `BACKEND_API_URL` avec l’URL HTTPS du backend Node.js déployé. Le navigateur utilise des Server Actions Next.js et des cookies `HttpOnly`; les appels au backend sont donc exécutés côté serveur.

Les boutiques dont le vendeur a confirmé le brouillon apparaissent en mode test avec un avertissement public. Le brouillon n’est pas le contrat définitif ORIVFIDE.
