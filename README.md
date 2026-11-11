# CoC Freemium Optimizer (v18.600.5)

Tableau de bord d'optimisation freemium et moteur de conseils personnalisés pour joueur **Clash of Clans** (mise à jour version 18.600.5).

---

## 1. Caractéristiques Principales

- **Direction Artistique Apple Minimaliste** : Palette système, typographie SF Pro avec chiffres tabulaires (`font-variant-numeric: tabular-nums`), thèmes clair et sombre automatiques (`prefers-color-scheme`) et bascule manuelle, cartes opaques sans halos superflus.
- **PWA 100% Hors-Ligne** : Service Worker (`sw.js`) avec stratégie *Cache-First* pour l'App Shell et *Stale-While-Revalidate* pour les données. Installable sur iPhone, Android, iPad et macOS/desktop.
- **Zéro Dépendance CDN** : Vanilla ES Modules, aucun framework lourd (zéro React/Vue/Tailwind), Chart.js et QRious auto-hébergés localement dans `public/vendor/`.
- **Moteur de Conseils Data-Driven** : Aucune valeur codée en dur. Règles déclaratives organisées en 3 couches (Playbook HDV, état des éléments, principes freemium) dans `public/data/advice_rules.json`.
- **Compatibilité v18.600.5** : Prise en charge des 4 héros du village principal (dont **Prince Gargouille** et ses 12 équipements, paliers multiples de 3), **Station d'Artisanat Défensif** modulaire (3 modes et 9 modules), et 6 ouvriers (**Cabane B.O.B**).
- **Synchronisation Inter-Appareils Sécurisée** : Transfert instantané Desktop ↔ Mobile via URL Hash compressé (`CompressionStream` gzip v2 avec checksum CRC32 et protection anti-XSS) et QR Code intégré.

---

## 2. Installation & Lancement Local (via uv)

Le projet s'exécute localement avec l'outillage standard Python moderne via **uv** (natif Apple Silicon ARM64, sans pip direct) :

```bash
# 1. Vérifier l'installation de uv
uv --version

# 2. Lancer le serveur local
uv run python app.py
```

Le tableau de bord est alors accessible sur : **http://localhost:8080**

### Lancer les Tests Automatisés

```bash
# Exécution de la suite de tests complète (node:test natif)
npm test
```

---

## 3. Déploiement Vercel & Variables d'Environnement

Le projet est préconfiguré pour un déploiement instantané sur Vercel avec fonctions serverless Node.js (ES Modules).

### Variables d'Environnement (Vercel Project Settings)

| Variable | Rôle | Valeur recommandée |
| :--- | :--- | :--- |
| `SYNC_SECRET` | Protège l'écriture (`POST /api/village`) contre les modifications non autorisées | Chaîne aléatoire sécurisée |
| `COC_API_TOKEN` | Jeton d'accès officiel à l'API Clash of Clans (Dev Portal) | Votre API Key Supercell |
| `GITHUB_TOKEN` | *(Optionnel)* Permet de commiter automatiquement le village mis à jour dans le repo | Personal Access Token GitHub (scope `repo`) |
| `GITHUB_REPO` | *(Optionnel)* Dépôt cible pour la sauvegarde distante | `votre-compte/votre-repo` |

---

## 4. Guide d'Évolution & Maintenance

### A. Comment ajouter une nouvelle règle de conseil ?
Ouvrez [`public/data/advice_rules.json`](file:///Users/fffamily/Documents/DEV/COC_DATA/public/data/advice_rules.json) et ajoutez un objet respectant le schéma déclaratif :
```json
{
  "id": "rule_ma_nouvelle_regle",
  "titre_court": "Titre Court",
  "categorie": "heros",
  "thLevels": [11, 12],
  "condition": "hero_index < 70",
  "priorite": 4,
  "urgence": "important",
  "titre": "Titre complet du conseil",
  "explication_simple": "Explication en une phrase accessible sans jargon.",
  "pourquoi": "Impact concret sur la puissance du village.",
  "action": "Ce que le joueur doit faire concrètement.",
  "erreur_courante_a_eviter": "Ce qu'il ne faut surtout pas faire.",
  "cout_estime": "Montant estimé",
  "duree_estimee": "Durée estimée",
  "verified": true,
  "source": "Guide Supercell"
}
```
*Note : Si une valeur n'est pas issue d'une source officielle vérifiée, marquez impérativement `"verified": false`.*

### B. Comment mettre à jour les plafonds d'Hôtel de Ville ?
Ouvrez [`public/data/townhall_caps.json`](file:///Users/fffamily/Documents/DEV/COC_DATA/public/data/townhall_caps.json) et complétez l'entrée du niveau d'HDV souhaité (bâtiments, héros, équipements, unités, sorts).

### C. Comment ajouter un nouvel identifiant numérique de jeu ?
Ouvrez [`public/js/coc_data.js`](file:///Users/fffamily/Documents/DEV/COC_DATA/public/js/coc_data.js) et référencez le nouvel ID dans la catégorie appropriée (`buildings`, `heroes`, `equipment`, `units`, `spells`). Si un ID inconnu est rencontré lors d'un import, l'application ne plante pas et génère automatiquement un élément de repli avec un avertissement en console.

---

## 5. Architecture des Fichiers

```text
COC_DATA/
├── api/
│   ├── player.js               # Proxy Supercell sécurisé avec fallback local
│   ├── village.js              # GET public & POST protégé par SYNC_SECRET
│   └── villageData.js          # Fallback statique autonome
├── data/
│   └── village_state.json      # Snapshot du village (#GUQLRP8LV)
├── public/
│   ├── index.html              # Shell PWA sémantique, accessible, zéro CDN
│   ├── manifest.webmanifest    # Manifeste PWA installable
│   ├── sw.js                   # Service Worker (cache-first app shell, SWR données)
│   ├── css/                    # Tokens, Base, Composants et Vues Apple Minimaliste
│   ├── js/                     # Modules ES purs : app, router, store, i18n, coc_data, analysis, advice, sync, charts, ui/*
│   ├── data/                   # Données déclaratives : townhall_caps, upgrade_costs, advice_rules, glossary
│   └── vendor/                 # Bibliothèques locales figées : chart.umd.min.js, qrious.min.js
├── tests/                      # Tests unitaires natifs node:test & jeux de fixtures
├── app.py                      # Serveur local Python standard exécutable via uv
├── pyproject.toml              # Configuration uv
└── vercel.json                 # Configuration et routage Vercel
```
