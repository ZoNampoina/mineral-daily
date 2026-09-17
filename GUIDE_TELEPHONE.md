# MINERAL DAILY — VERSION TÉLÉPHONE UNIQUEMENT

Tu n'as besoin ni de PC, ni de Flutter, ni d'Android Studio.

Le principe :
Téléphone -> GitHub -> Build dans le cloud -> MineralDaily.apk -> installation sur le téléphone.

## ÉTAPE 1 — Créer un compte GitHub

Depuis Chrome sur ton téléphone :
1. Va sur github.com
2. Crée un compte gratuit si tu n'en as pas.
3. Connecte-toi.

## ÉTAPE 2 — Créer un dépôt

1. Sur GitHub, appuie sur "+" puis "New repository".
2. Nom : `mineral-daily`
3. Choisis `Private` si tu veux garder le code privé.
4. Appuie sur "Create repository".

## ÉTAPE 3 — Envoyer les fichiers

1. Décompresse `MineralDaily_PHONE_ONLY.zip` avec Fichiers ou ZArchiver.
2. Dans ton dépôt GitHub, utilise "Add file" -> "Upload files".
3. Envoie tout le contenu du dossier décompressé.

Il faut absolument conserver :
- `lib/main.dart`
- `pubspec.yaml`
- `.github/workflows/build-apk.yml`

Si le dossier `.github` n'apparaît pas, active l'affichage des fichiers cachés dans ton gestionnaire de fichiers ou utilise ZArchiver.

## ÉTAPE 4 — Lancer la fabrication de l'APK

1. Ouvre ton dépôt `mineral-daily`.
2. Appuie sur l'onglet `Actions`.
3. Ouvre `Build Mineral Daily APK`.
4. Appuie sur `Run workflow`.
5. Lance le workflow.
6. Quand le build devient vert, ouvre-le.

## ÉTAPE 5 — Télécharger l'application

Dans le build terminé :
1. Descends jusqu'à `Artifacts`.
2. Appuie sur `MineralDaily-APK`.
3. GitHub télécharge un ZIP.
4. Décompresse-le.
5. À l'intérieur se trouve `MineralDaily.apk`.
6. Appuie dessus pour installer l'application.

Android peut demander l'autorisation d'installer des applications provenant du navigateur ou du gestionnaire de fichiers.

## PREMIER LANCEMENT

Autorise :
- les notifications ;
- les alarmes/rappels exacts si Android le demande.

Le rappel est réglé sur 07:00 par défaut, fuseau Madagascar.

## SI LE BUILD EST ROUGE

Ne modifie rien au hasard.
Fais une capture d'écran de la dernière erreur affichée dans GitHub Actions et envoie-la à ChatGPT.

## SÉCURITÉ

Cette V1 ne contient aucune clé OpenAI.
La future V2 utilisera un backend sécurisé pour la génération IA quotidienne.
