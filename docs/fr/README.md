# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>Transformer l’historique du navigateur en une vraie boîte à outils de sites que l’on peut retrouver.</strong></p>

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · Français · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · [Bahasa Indonesia](../id/README.md) · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center"><a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Télécharger Chrome Beta v0.1.0</strong></a> · <a href="INSTALL.md">Installation</a> · <a href="../LANGUAGES.md">Documentation en 18 langues</a></p>

## Quelques mots du développeur : pourquoi BestHistory existe

BestHistory est un petit outil que j’ai créé comme développeur indépendant pour résoudre un problème que je rencontrais moi-même sans arrêt.

J’utilisais un site très pratique, puis quelques jours plus tard j’en avais de nouveau besoin et j’étais incapable de me souvenir de son nom. Parfois je savais seulement que « j’avais vu ça sur un site », sans retrouver la page exacte. Par peur de ne plus jamais retrouver ces choses, je gardais trop d’onglets et de fenêtres ouverts, j’épinglais certains sites et j’en ajoutais encore d’autres aux favoris. Au bout d’un moment, j’avais l’historique, les onglets épinglés, les favoris et des dizaines de pages que je n’osais pas fermer — et retrouver un ancien site restait compliqué.

J’ai compris que je ne voulais pas simplement une liste d’historique plus jolie.

Je voulais quelque chose de plus proche de la manière dont je me souviens réellement :

**j’oublie parfois le titre d’une page et la date, mais je me souviens souvent du type de site et de ce que j’en avais fait.**

C’est ainsi qu’est né BestHistory.

> **Vous permettre de fermer les onglets que vous gardez ouverts uniquement par peur de ne jamais les retrouver.**  
> Le jour où vous en avez vraiment besoin, BestHistory devrait pouvoir vous y ramener.

BestHistory reste un projet personnel très jeune. S’il résout un problème que vous connaissez aussi, cela me fera vraiment plaisir. Et j’aimerais sincèrement savoir ce qui fonctionne, ce qui gêne et ce que vous voudriez qu’il résolve ensuite.

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory sites" width="100%" /></p>
<p align="center"><sub>Passer de milliers de pages visitées à une question simple : « quels sites ai-je utilisés ? »</sub></p>

---

## En quoi BestHistory diffère-t-il de l’historique classique ?

### 1. D’abord les sites, pas des dizaines de milliers de pages

L’historique normal place chaque visite dans une longue liste. Si vous ouvrez beaucoup de pages sur le même site, celui-ci finit par remplir l’écran.

BestHistory regroupe d’abord l’historique par **site web**. Vous voyez les sites récents, les plus utilisés, la dernière visite et les pages précises consultées dans chacun.

### 2. Plusieurs tris pour voir les sites qui comptent vraiment

- **Récents**
- **Les plus visités**
- **Nom**
- **Épinglés**
- vues séparées comme **Non classés / Corbeille / Sites privés**

### 3. Vos propres étiquettes

Un site peut être « outil » pour quelqu’un et « travail » pour vous. Il peut être à la fois « design », « IA » et « à réutiliser ».

BestHistory accepte les **étiquettes personnalisées**, plusieurs par site. Le but n’est pas de construire une classification parfaite, mais d’offrir davantage de chemins pour retrouver un site lorsque, des mois plus tard, vous ne vous souvenez plus que de son utilité.

### 4. Une chronologie qui replie les pages du même site

On a parfois encore besoin de répondre à : « qu’est-ce que je regardais hier après-midi ? »

La chronologie de BestHistory regroupe les pages consécutives du même site et ne les déplie que lorsque vous voulez le détail.

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="Chronologie repliable BestHistory" width="100%" /></p>
<p align="center"><sub>Les pages d’un même site restent ensemble : la chronologie ressemble à un parcours plutôt qu’à un mur de titres.</sub></p>

### 5. Une description que vous seul avez besoin de comprendre

Le nom officiel d’un site ne me rappelle pas toujours pourquoi je l’ai utilisé. Vous pouvez donc écrire votre propre nom, note ou description :

> « Le site utilisé pour convertir un PDF en images »
>
> « La référence trouvée pour des illustrations pour enfants »
>
> « Le petit outil qui vérifie l’historique des prix »

Ces mots peuvent ensuite être recherchés. Votre propre description correspond parfois beaucoup mieux à votre mémoire que le titre officiel.

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="Détails, étiquettes et notes BestHistory" width="100%" /></p>

---

## Mode privé : un historique que je veux garder, mais pas laisser visible

Certains sites ne sont pas des choses que nous voulons « oublier ». Nous voulons simplement éviter qu’ils soient mélangés à l’historique ordinaire, visibles d’un coup d’œil.

Le **Mode privé (Pro)** chiffre localement les URL privées, titres et visites. Ils ne sont visibles qu’après saisie du mot de passe privé défini par l’utilisateur.

Si vous autorisez explicitement BestHistory à fonctionner en navigation privée, il peut également enregistrer ces visites sous forme chiffrée. Elles ne se mélangent pas à la liste normale et restent masquées lorsque le Mode privé est verrouillé.

> **Les sites que vous ne souhaitez pas laisser dans l’historique normal peuvent malgré tout être mémorisés discrètement par BestHistory.**

Les données privées restent sur l’appareil. Le serveur BestHistory ne stocke pas les URL privées, titres, historique privé ou mot de passe.

---

## Recherche, épingles et Corbeille

La recherche utilise les sites, domaines, étiquettes, notes et titres de pages. Même si vous oubliez complètement le nom d’un site, le souvenir d’un contenu consulté peut permettre de le retrouver.

Les sites fréquents peuvent être épinglés. Ceux que vous ne voulez pas voir pour l’instant peuvent aller dans la **Corbeille** sans être supprimés immédiatement ; ils pourront être restaurés ou supprimés définitivement plus tard.

Organiser son historique ne devrait pas obliger à prendre une décision irréversible à chaque fois.

---

## Sauvegarde, restauration et migration entre navigateurs

Les données d’organisation de BestHistory restent principalement en local.

Un fichier `.bhbackup` unique permet de déplacer et fusionner vos données entre ordinateurs, installations, appareils et navigateurs. La restauration utilise une fusion sûre et ne remplace pas aveuglément toutes les données actuelles.

Les données du Mode privé restent chiffrées dans la sauvegarde et nécessitent le mot de passe d’origine.

> Pour l’instant, « synchronisation entre navigateurs » signifie transfert et fusion via sauvegarde locale. BestHistory **n’envoie pas tout votre historique dans le cloud** pour une synchronisation en temps réel.

C’est volontaire : je veux que BestHistory soit d’abord un outil **local-first**.

---

## Vie privée, Free et Pro

Le serveur BestHistory ne stocke pas votre historique, vos URL, titres, étiquettes, notes, recherches, données privées, clés de chiffrement ou contenu `.bhbackup`.

Si vous vous connectez, le serveur traite principalement le compte, l’authentification et les droits Free / Trial / Pro. Voir [PRIVACY.md](PRIVACY.md).

Les fonctions locales principales sont utilisables **sans connexion**. Pendant la Beta, les nouveaux comptes reçoivent actuellement **30 jours d’essai Pro**. Le Mode privé est aujourd’hui la principale fonction Pro.

---

## Interface et documentation en 18 langues

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 langues" width="100%" /></p>

README, installation, confidentialité, FAQ, sécurité, changelog et Release Note sont également disponibles dans les 18 langues. Voir [l’index des langues](../LANGUAGES.md).

---

## Ce n’est encore que le début

BestHistory est né parce que j’avais moi-même peur de fermer des onglets et de ne jamais retrouver les sites.

Aujourd’hui il peut déjà m’aider à retrouver un site après l’avoir fermé. Je veux continuer autour du même problème : fermer plus sereinement les onglets inutiles et mieux organiser les sites que nous utilisons vraiment, plutôt que d’ajouter des fonctions pour le principe.

Si BestHistory vous aide, une ⭐ Star, un Issue lorsqu’un problème apparaît, ou simplement un message sur votre manière de gérer historique, favoris et trop d’onglets est très utile. Pour un retour privé : **besthistory@126.com**.

N’ajoutez pas d’URL privées, mots de passe, historique privé ou sauvegardes complètes dans des Issues publics.

---

## Installation Beta

**[⬇️ BestHistory v0.1.0 Beta pour Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

Pour l’instant : **Mode développeur → Charger l’extension non empaquetée**. Voir [INSTALL.md](INSTALL.md).

---

**Le code source de l’application BestHistory est propriétaire et n’est pas publié dans ce dépôt.**

Version actuelle : **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
