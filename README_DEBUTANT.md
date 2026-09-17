# Mineral Daily — V1

Application Android/Flutter personnelle pour apprendre un minéral chaque jour.

## Ce qui fonctionne déjà

- Écran « Aujourd'hui »
- 5 leçons intégrées : Or, Nickel, Cobalt, Graphite, Ilménite
- Fiches structurées : propriétés, genèse, monde, Madagascar, exploitation, traitement, économie, environnement
- Vocabulaire et cas concret
- Quiz interactifs
- Meilleurs scores
- Favoris
- Progression
- Historique
- Notification quotidienne configurable, 07:00 par défaut
- Fuseau horaire Madagascar : Indian/Antananarivo
- Données locales : l'app reste consultable hors connexion

## Important

Cette V1 n'appelle pas encore OpenAI automatiquement. C'est volontaire : une clé API ne doit pas être intégrée directement dans une APK, sinon elle peut être extraite. La V2 utilisera un petit backend sécurisé qui générera automatiquement une nouvelle fiche, vérifiera les données récentes (prix, production, etc.) et l'enverra à l'application.

## Méthode la plus simple sous Windows

1. Installer Flutter :
   https://docs.flutter.dev/get-started/install/windows/mobile

2. Installer Android Studio et accepter l'installation du SDK Android.

3. Ouvrir PowerShell dans ce dossier.

4. Exécuter :
   powershell -ExecutionPolicy Bypass -File .\INSTALLER_V1.ps1

Le script :
- crée un vrai projet Flutter ;
- copie l'application Mineral Daily ;
- ajoute les permissions Android ;
- télécharge les dépendances ;
- construit l'APK Release.

À la fin, l'APK se trouve normalement ici :
`mineral_daily\build\app\outputs\flutter-apk\app-release.apk`

## Installation sur téléphone

Copier `app-release.apk` sur le téléphone Android et l'ouvrir.
Android peut demander l'autorisation « Installer des applications inconnues » pour le gestionnaire de fichiers utilisé.

Au premier lancement :
- autoriser les notifications ;
- autoriser les alarmes/rappels exacts si Android le demande.

## Si le script signale que Flutter n'existe pas

Fermer puis rouvrir PowerShell après l'installation de Flutter, ou redémarrer Windows.

## Structure

- `lib/main.dart` : application complète
- `pubspec.yaml` : dépendances Flutter
- `android_patch/AndroidManifest_permissions.xml` : permissions nécessaires
- `INSTALLER_V1.ps1` : création + compilation automatisée
- `BUILD_APK.bat` : recompilation rapide après installation

## Étape suivante prévue — V2

- backend sécurisé
- génération IA quotidienne
- cours/prix actuels
- sources web
- anti-répétition illimitée
- répétition espacée
- questions libres type messagerie
- synchronisation des leçons
- vraie base de données locale
## Notes techniques V1

La V1 utilise actuellement :
- `flutter_local_notifications 22.3.1`
- `shared_preferences 2.5.5`
- `timezone 0.11.1`

Le script ajoute automatiquement les permissions et receivers Android nécessaires aux notifications programmées ainsi que le core library desugaring demandé par le plugin.

La compilation n'a pas été exécutée dans l'environnement de génération de ce paquet car Flutter/Android SDK n'y sont pas installés. Le script est prévu pour compiler sur un PC Windows équipé de Flutter et Android Studio.
