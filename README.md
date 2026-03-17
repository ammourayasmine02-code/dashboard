# Tableau de bord — Indicateurs des droits de l'enfant en France
**COMITE FRANCAIS POUR L'UNICEF**

Dashboard interactif de visualisation des indicateurs relatifs aux droits de l'enfant en France, organisé en 12 thématiques.

---

## Sommaire

1. [Thématiques](#thématique)
2. [Fonctionnalités](#fonctionnalités)
3. [Structure du projet](#structure-du-projet)
4. [Technologies utilisées](#technologies-utilisées)
5. [Déploiement](#déploiement)
6. [Données](#données)
7. [Scripts utilitaires](#scripts-utilitaires)
8. [Accessibilité](#accessibilité)
9. [Flux de données](#flux-de-données)

---

 Thématique
 1  Démographie 
 2  Éducation 
 3  Santé 
 4  Santé mentale 
 5  Nutrition 
 6  Protection 
 7  Petite enfance 
 8  Migration 
 9  Numérique 
 10  Climat 
 11  Pauvreté 
 12  Nutrition   

---

## Fonctionnalités

- **Navigation par onglets** : sélection de la thématique via des onglets en haut de page
- **Liste d'indicateurs** : panneau latéral gauche listant les indicateurs de la thématique active
- **Graphiques interactifs** : rendu via Chart.js (barres ou courbes)
- **Ligne de moyenne** : affichage optionnel d'une ligne de tendance en pointillés
- **Export PNG** : téléchargement du graphique en image (fond blanc)
- **Partage social** : boutons LinkedIn et Facebook pour partager un indicateur
- **Analyse textuelle** : bloc d'analyse détaillée affiché sous chaque graphique
- **Navigation par URL** : paramètres `?theme=...&indicator=...` pour un lien direct vers un indicateur
- **Design responsive** : adapté bureau et mobile

---

## Structure du projet

```
dashboard/
├── index.html                   # Point d'entrée HTML principal
├── dashboard.js                 # Logique applicative (état, graphiques, interactions)
├── dashboard.css                # Styles et mise en page (variables CSS, responsive)
├── data.js                      # Données des indicateurs (objet JS DASHBOARD_DATA)
├── analyses.js                  # Textes d'analyse par indicateur (objet JS INDICATOR_ANALYSES)
├── icons.js                     # Icônes thématiques encodées en base64 (THEME_ICONS_B64)
├── LOGOS-~1 1.JPG               # Logo UNICEF France
├── analyses_indicateurs.docx    # Documentation source des analyses
├── build_analyses.ps1           # Script PowerShell de génération de analyses.js
└── Data/
    ├── dashboard_data.json      # Export JSON consolidé de toutes les données
    ├── Thématique Climat.xlsx
    ├── Thématique Démographie.xlsx
    ├── Thématique Education.xlsx
    ├── Thématique Migration.xlsx
    ├── Thématique Numérique.xlsx
    ├── Thématique Nutrition.xlsx
    ├── Thématique Pauvreté.xlsx
    ├── Thématique Petite Enfance.xlsx
    ├── Thématique Protection.xlsx
    ├── Thématique Santé mentale.xlsx
    └── Thématique Santé.xlsx
```

### Rôle de chaque fichier clé

| Fichier | Taille | Rôle |
|---------|--------|------|
| `index.html` | 9,6 Ko | Structure HTML, imports CDN, squelette de l'interface |
| `dashboard.js` | 24 Ko | Initialisation, rendu des graphiques, gestion de l'état |
| `dashboard.css` | 8 Ko | Mise en page flex, variables UNICEF, media queries |
| `data.js` | 39 Ko | Objet `DASHBOARD_DATA` : séries temporelles par indicateur |
| `analyses.js` | 48 Ko | Objet `INDICATOR_ANALYSES` : textes analytiques |
| `icons.js` | 545 Ko | Objet `THEME_ICONS_B64` : icônes PNG en base64 |
| `Data/*.xlsx` | 19–27 Ko | Données brutes source par thématique |
| `Data/dashboard_data.json` | 35 Ko | Export JSON (sauvegarde ou import alternatif) |

---

## Technologies utilisées

| Composant | Technologie |
|-----------|-------------|
| Rendu HTML | HTML5 vanilla |
| Logique JS | JavaScript ES6 (pas de framework) |
| Graphiques | [Chart.js v4.4.3](https://www.chartjs.org/) via CDN jsDelivr |
| Design system | UNICEF Design System (Bootstrap 4 compilé) via CDN |
| Styles | CSS3 avec variables custom (`--unicef-blue`, etc.) |
| Données | Objets JavaScript statiques + fichiers Excel source |

**Aucune étape de compilation requise.** Le projet est un frontend statique pur.

---

## Déploiement

### Lancement local (méthode simple)

Ouvrir directement `index.html` dans un navigateur moderne (Chrome, Firefox, Edge).

> Certains navigateurs bloquent le chargement de fichiers JS locaux en raison des restrictions CORS. En cas de problème, utiliser un serveur local :

```bash
# Python 3
python -m http.server 8080
# puis ouvrir http://localhost:8080
```

```bash
# Node.js (avec npx)
npx serve .
```

### Déploiement en production

Copier l'ensemble du dossier `dashboard/` sur n'importe quel hébergement de fichiers statiques (Apache, Nginx, GitHub Pages, etc.). Aucune configuration serveur spécifique n'est requise.

**Dépendances réseau (CDN) :**
- UNICEF Design System CSS + JS (jsDelivr)
- Chart.js v4.4.3 (jsDelivr)

> Le tableau de bord nécessite un accès internet pour charger ces dépendances.

---

## Données

### Format de `DASHBOARD_DATA` (dans `data.js`)

```javascript
[
  {
    "name": "Démographie",
    "id": "demographie",
    "indicators": [
      {
        "name": "Age moyen a la maternite",
        "headers": ["Année", "France entière", "Hexagone"],
        "data": [
          [2019, 30.6, 30.5],
          [2020, 30.7, 30.6],
          ...
        ],
        "chart_type": "line"   // "bar" ou "line"
      },
      ...
    ]
  },
  ...
]
```

### Format de `INDICATOR_ANALYSES` (dans `analyses.js`)

```javascript
{
  "Age moyen a la maternite": "Depuis plusieurs décennies, l'âge moyen...",
  "Taux de natalite en Hexagone": "Le taux de natalité en France...",
  ...
}
```

### Mise à jour des données

1. Modifier les fichiers Excel dans `Data/`
2. Mettre à jour manuellement les valeurs correspondantes dans `data.js`
3. (Optionnel) Mettre à jour `Data/dashboard_data.json` pour garder la cohérence
4. Pour mettre à jour les textes d'analyse : modifier `analyses_indicateurs.docx`, puis relancer `build_analyses.ps1` (voir ci-dessous)

---

## Scripts utilitaires

### `build_analyses.ps1` — Génération de `analyses.js`

Ce script PowerShell extrait les textes d'analyse depuis un fichier texte intermédiaire (`analyses_temp.txt`) et génère un fichier JavaScript (`analyses_ascii.js`).

**Prérequis :**
- Windows avec PowerShell 5.1+
- Fichier `analyses_temp.txt` présent dans `C:\Users\yammoura\Downloads\dashboard\`

**Utilisation :**

```powershell
# Depuis PowerShell
cd C:\Users\yammoura\Downloads\dashboard
.\build_analyses.ps1
```

**Ce que fait le script :**
1. Lit `analyses_temp.txt` en UTF-8
2. Découpe le texte en segments nommés grâce à la fonction `Seg()` (extraction entre deux marqueurs)
3. Nettoie les retours à la ligne et les espaces superflus
4. Échappe les apostrophes et antislashes pour la syntaxe JS
5. Génère `analyses_ascii.js` contenant l'objet `INDICATOR_ANALYSES`

> Après génération, renommer `analyses_ascii.js` en `analyses.js` (ou adapter l'import dans `index.html`).

---

## Accessibilité

Le tableau de bord respecte les critères **WCAG AA** :

- Lien d'évitement ("Aller au contenu principal") en début de page
- Hiérarchie de titres correcte (pas de saut h1→h3)
- Attributs ARIA : `aria-pressed`, `aria-selected`, `role="tab"`, `role="option"`
- Styles de focus visibles (contour bleu 3px, offset 2px)
- Les couleurs ne sont jamais le seul indicateur d'état
- Textes alternatifs sur les éléments interactifs
- Compatibilité lecteurs d'écran

---

## Flux de données

```
Fichiers Excel (Data/*.xlsx)
           │
           ▼
   [Saisie manuelle]
           │
     ┌─────┴──────┐
     ▼            ▼
  data.js    analyses_indicateurs.docx
                   │
                   ▼
          analyses_temp.txt
                   │
          build_analyses.ps1
                   │
                   ▼
             analyses.js
                   │
  ┌────────────────┼────────────────┐
  ▼                ▼                ▼
data.js       analyses.js       icons.js
  └─────────────────┬──────────────┘
                    ▼
              index.html
                    │
         Chart.js + UNICEF Design System
                    │
            Rendu navigateur (Canvas HTML5)
```

---

*Dashboard développé pour le Comité Français pour l'UNICEF.*
