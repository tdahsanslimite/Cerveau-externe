# Clé de signature Android

`cerveau-externe.jks` signe chaque version de l'appli. Elle est chiffrée par un mot de passe
qui n'est PAS dans ce dépôt : il est stocké dans le secret GitHub `CE_KEYSTORE_PASSWORD`.

Sans cette clé (et son mot de passe), une nouvelle version ne peut pas s'installer
par-dessus l'ancienne : il faudrait désinstaller l'appli et perdre les données.
Garder une copie de sauvegarde de la clé et du mot de passe hors de GitHub.

Si ce dépôt devient public un jour : retirer la clé du dépôt et de son historique avant.
