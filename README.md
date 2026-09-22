# arizona-mineral.mg

ARIZONA — application web de fiches professionnelles sur les minéraux, synchronisée avec Supabase.

## Hébergement
Le contenu du dossier `docs/` est publié par GitHub Pages.

## Sécurité
- Authentification Supabase.
- Rôles `standard` et `admin` protégés par RLS.
- Aucun mot de passe, token privé ou clé `service_role` dans le dépôt.
- La clé Supabase présente dans le frontend est une clé **publishable**, conçue pour le client web.

## Domaine
Le nom d'application est `arizona-mineral.mg`. Le domaine personnalisé pourra être connecté lorsqu'il sera enregistré.
