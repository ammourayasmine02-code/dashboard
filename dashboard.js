// ============================================================
//  UNICEF Dashboard — Droits de l'Enfant en France
//  dashboard.js — Logique principale de l'application
// ============================================================
//
//  Règles UX/UI appliquées :
//  • Nombres : format anglais (1,200,000.00 — virgule milliers, point décimales)
//  • Tableaux : cellules numériques alignées à droite, texte à gauche
//  • Libellés : casse de phrase, courts, explicites ; boutons avec verbes
//  • Titres : h2 pour la section sidebar (hiérarchie h1→h2, sans saut)
//  • Chargement : spinner affiché pendant le rendu (feedback asynchrone)
//  • Accessibilité : aria-pressed sur boutons bascule, aria-live sur zones dynamiques
//  • Couleurs : jamais utilisées seules comme indicateur (état actif = rempli + aria-pressed)
// ============================================================

// ── Palette UNICEF pour les graphiques (bleu site #1CABE2 en premier) ──
const CHART_PALETTE = [
  '#1CABE2', // bleu UNICEF (couleur principale du site)
  '#6A1E74', // violet  — Education
  '#F26A21', // orange  — Santé
  '#E2231A', // rouge   — Nutrition
  '#00833D', // vert    — Climat
  '#80BD41', // vert clair — Numérique
  '#961A49', // fuchsia — Pauvreté
  '#777779', // gris    — Démographie
  '#2653B9', // bleu foncé (nouvelle charte)
  '#FFC20E', // jaune
  '#FF7100', // orange vif
  '#374EA2', // bleu foncé UNICEF
];

// ── Couleurs officielles par thématique (charte graphique UNICEF) ──
const THEME_COLORS = {
  'Démographie':    '#777779', // gris foncé
  'Education':      '#6A1E74', // violet
  'Santé':          '#FF7100', // orange 100 %
  'Santé mentale':  '#FF9A50', // orange 50 % (#FF7100 à 50 % d'opacité)
  'Nutrition':      '#E2231A', // rouge
  'Protection':     '#2653B9', // bleu foncé (nouvelle charte)
  'Petite Enfance': '#1CABE2', // bleu cyan
  'Migration':      '#6686C8', // #2653B9 à 50 % d'opacité
  'Numérique':      '#80BD41', // vert clair
  'Climat':         '#00833D', // vert foncé
  'Pauvreté':       '#961A49', // rose foncé / fuchsia
};

// Icônes chargées depuis icons.js (extraites de roue_fixed.js).
// THEME_ICONS_B64 = { 'NomThème': 'data:image/png;base64,...' }

// ── État global de l'application ──
let state = {
  themeIdx:     0,    // Index de la thématique active
  indicatorIdx: 0,    // Index de l'indicateur actif
  chartType:    'bar', // Type de graphique : 'bar' | 'line'
  showAverage:  true, // Afficher/masquer la ligne de moyenne
  currentChart: null, // Instance Chart.js en cours (pour la détruire avant de recréer)
};

// ============================================================
//  INITIALISATION
// ============================================================

/**
 * Point d'entrée — appelé depuis index.html après le chargement des scripts.
 * Vérifie la présence de DASHBOARD_DATA puis initialise l'interface.
 *
 * Si l'URL contient ?theme=X&indicator=Y (venant de la roue),
 * sélectionne automatiquement la bonne thématique et le bon indicateur.
 */
function init() {
  if (typeof DASHBOARD_DATA === 'undefined') {
    // Erreur bloquante : affiche un message clair à l'utilisateur
    document.getElementById('main-content').innerHTML =
      '<div class="alert alert-danger m-3" role="alert">' +
      '<strong>Erreur :</strong> le fichier <code>data.js</code> est introuvable.' +
      '</div>';
    return;
  }

  // Lecture des paramètres URL transmis par la roue (?theme=...&indicator=...)
  const params       = new URLSearchParams(window.location.search);
  const themeParam   = params.get('theme');
  const indicParam   = params.get('indicator');

  if (themeParam) {
    // Venu de la roue → affiche le bouton retour dans la navbar
    _showBackButton(true, themeParam);

    // Recherche du thème par nom (insensible à la casse)
    const themeIdx = DASHBOARD_DATA.findIndex(
      t => t.name.toLowerCase() === themeParam.toLowerCase()
    );

    if (themeIdx !== -1) {
      // Thème trouvé → sélection
      state.themeIdx = themeIdx;
      renderThemeTabs();
      renderSidebar();

      if (indicParam) {
        // Recherche de l'indicateur par nom (correspondance partielle, insensible à la casse)
        const indicators = DASHBOARD_DATA[themeIdx].indicators;
        const indicIdx   = indicators.findIndex(
          ind => ind.name.toLowerCase().includes(indicParam.toLowerCase()) ||
                 indicParam.toLowerCase().includes(ind.name.toLowerCase())
        );
        selectIndicator(indicIdx !== -1 ? indicIdx : 0);
      } else {
        selectIndicator(0);
      }
      return; // Initialisation via URL params terminée
    }
  }

  // Aucun paramètre URL → sélection par défaut (premier thème, premier indicateur)
  selectTheme(0);
}

/**
 * Affiche le bouton "Retour à la roue" dans la navbar si on est arrivé
 * depuis la roue (paramètre ?theme= présent dans l'URL).
 * @param {boolean} visible
 */
function _showBackButton(visible, themeName) {
  const btn = document.getElementById('backToRoueBtn');
  if (!btn) return;
  btn.classList.toggle('d-none', !visible);
  if (visible && themeName) {
    btn.href = '../Roue Observatoire/index.html?theme=' + encodeURIComponent(themeName);
  }
}

// ============================================================
//  ONGLETS DE THÉMATIQUES — Bootstrap nav-tabs
// ============================================================

/**
 * Génère les onglets de thématiques dans la barre de navigation.
 * Utilise DocumentFragment pour minimiser les manipulations du DOM.
 */
function renderThemeTabs() {
  const bar = document.getElementById('themesBar');

  // DocumentFragment = insertion unique dans le DOM → meilleure performance
  const frag = document.createDocumentFragment();

  DASHBOARD_DATA.forEach((theme, i) => {
    const isActive   = (i === state.themeIdx);
    const themeColor = THEME_COLORS[theme.name] || '#1CABE2';
    const iconSrc    = (typeof THEME_ICONS_B64 !== 'undefined') ? THEME_ICONS_B64[theme.name] : null;

    const li = document.createElement('li');
    li.className = 'nav-item';

    const a = document.createElement('a');
    a.className = 'nav-link' + (isActive ? ' active' : '');
    a.href = '#';
    a.setAttribute('role', 'tab');
    a.setAttribute('aria-selected', String(isActive));

    // Style visuel : fond plein (actif) ou fond teinté à 15 % + bordure (inactif)
    if (isActive) {
      a.style.cssText = `background-color:${themeColor};border-color:${themeColor};border-bottom:none;color:#fff;font-weight:700;`;
    } else {
      a.style.cssText = `background-color:${themeColor}26;border-color:${themeColor};border-bottom:none;color:${themeColor};`;
    }

    if (iconSrc) {
      // Icône blanche sur onglet actif, couleur d'origine sur inactif
      const img = document.createElement('img');
      img.src = iconSrc;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.style.cssText = 'width:26px;height:26px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:' +
        (isActive ? 'brightness(0) invert(1)' : 'none');
      a.appendChild(img);
      a.appendChild(document.createTextNode(' ' + theme.name));
    } else {
      a.textContent = theme.name;
    }

    // Sélection de la thématique au clic
    a.addEventListener('click', (e) => { e.preventDefault(); selectTheme(i); });

    li.appendChild(a);
    frag.appendChild(li);
  });

  // Remplacement unique du contenu (évite les re-rendus successifs)
  bar.innerHTML = '';
  bar.appendChild(frag);
}

/**
 * Active la thématique à l'index donné et réinitialise l'indicateur sélectionné.
 * @param {number} idx - Index de la thématique dans DASHBOARD_DATA
 */
function selectTheme(idx) {
  state.themeIdx     = idx;
  state.indicatorIdx = 0;
  renderThemeTabs();  // Met à jour les styles actif/inactif des onglets
  renderSidebar();    // Recharge la liste des indicateurs
  selectIndicator(0); // Sélectionne le premier indicateur par défaut
}

// ============================================================
//  SIDEBAR — Liste des indicateurs (Bootstrap list-group)
// ============================================================

/**
 * Construit la liste des indicateurs de la thématique active.
 * UX : h2 de section pour maintenir la hiérarchie (h1 sr-only → h2 ici).
 */
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const theme   = DASHBOARD_DATA[state.themeIdx];

  // Construit tous les éléments via DocumentFragment pour une seule insertion DOM
  const frag = document.createDocumentFragment();

  // h2 avec style visuel réduit via CSS (.sidebar-section-title)
  const h2 = document.createElement('h2');
  h2.className   = 'sidebar-section-title';
  h2.textContent = theme.name;
  frag.appendChild(h2);

  theme.indicators.forEach((ind, i) => {
    const a = document.createElement('a');
    a.href      = '#';
    a.className = 'list-group-item list-group-item-action' + (i === state.indicatorIdx ? ' active' : '');
    a.textContent = ind.name;
    a.title       = ind.name; // Infobulle pour les noms longs
    a.setAttribute('role', 'option');
    a.setAttribute('aria-selected', String(i === state.indicatorIdx));
    a.addEventListener('click', (e) => { e.preventDefault(); selectIndicator(i); });
    frag.appendChild(a);
  });

  sidebar.innerHTML = '';
  sidebar.appendChild(frag);
}

/**
 * Active l'indicateur à l'index donné et déclenche le rendu du graphique.
 * Met à jour les classes CSS et attributs ARIA sans reconstruire tout le DOM.
 * @param {number} idx - Index de l'indicateur dans le thème actif
 */
function selectIndicator(idx) {
  state.indicatorIdx = idx;

  // Mise à jour ciblée des classes et attributs ARIA (pas de re-rendu complet)
  document.querySelectorAll('#sidebar .list-group-item-action').forEach((el, i) => {
    const active = (i === idx);
    el.classList.toggle('active', active);
    el.setAttribute('aria-selected', String(active));
  });

  renderChart();
}

// ============================================================
//  GRAPHIQUE — Rendu principal
// ============================================================

/**
 * Orchestre le rendu du graphique :
 * affiche le spinner, puis délègue à _doRenderChart via setTimeout(0)
 * afin que le navigateur repeigne le spinner avant le calcul bloquant.
 */
function renderChart() {
  const ind = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  if (!ind) return;

  // Mise à jour du titre (h2) — noir per guideline UX (pas bleu lien)
  document.getElementById('chartTitle').textContent = ind.name;

  // Mise à jour de l'aria-label pour les lecteurs d'écran
  document.getElementById('chartRegion').setAttribute('aria-label', 'Graphique : ' + ind.name);

  // Affiche le spinner (feedback UX asynchrone)
  showSpinner(true);

  // setTimeout(0) garantit que le spinner est visible AVANT le rendu bloquant du graphique
  setTimeout(() => {
    _doRenderChart(ind);
    showSpinner(false);

    // Affiche l'analyse de l'indicateur (mis à jour après le graphique)
    const analyseEl = document.getElementById('indicatorAnalysis');
    if (analyseEl) {
      const text = (typeof INDICATOR_ANALYSES !== 'undefined' && INDICATOR_ANALYSES[ind.name]) || '';
      analyseEl.textContent = text;
      analyseEl.style.display = text ? 'block' : 'none';
    }
  }, 0);
}

/**
 * Affiche ou masque le spinner de chargement.
 * @param {boolean} visible
 */
function showSpinner(visible) {
  document.getElementById('chartSpinner').classList.toggle('d-none', !visible);
}

/**
 * Construit et affiche le graphique Chart.js pour l'indicateur donné.
 * Gère aussi les indicateurs sans données numériques (tableau texte uniquement).
 * @param {Object} ind - Objet indicateur (name, headers, data, chart_type)
 */
function _doRenderChart(ind) {
  const { headers, data: rows } = ind;

  // Extraction des libellés de l'axe X (première colonne)
  const labels = rows.map(r => (r[0] != null ? String(r[0]) : ''));

  // Extraction des séries numériques (colonnes 1+)
  const series = _extractNumericSeries(headers, rows);

  // Destruction de l'instance précédente pour libérer la mémoire
  if (state.currentChart) {
    state.currentChart.destroy();
    state.currentChart = null;
  }

  const canvas  = document.getElementById('mainChart');
  const noData  = document.getElementById('noData');
  const dlBtn   = document.getElementById('chartActions');

  // Aucune donnée numérique → affiche le message "données textuelles"
  if (series.length === 0) {
    canvas.style.display = 'none';
    noData.style.display = 'flex';
    if (dlBtn) dlBtn.style.display = 'none';
    return;
  }

  // Données numériques présentes → affiche le graphique
  canvas.style.display = 'block';
  noData.style.display = 'none';
  if (dlBtn) dlBtn.style.display = '';

  const type = state.chartType; // 'bar' | 'line'
  const avg  = _computeAverage(series[0].values); // Moyenne de la première série

  // Construction des datasets Chart.js
  const datasets = series.map((s, i) => {
    const color = CHART_PALETTE[i % CHART_PALETTE.length];
    return {
      label:              s.label,
      data:               s.values,
      backgroundColor:    type === 'bar' ? color + 'cc' : color + '22', // 80% / 13% opacité
      borderColor:        color,
      borderWidth:        type === 'bar' ? 0 : 2.5,
      borderRadius:       type === 'bar' ? 3 : 0,
      tension:            0.35, // Courbe lissée pour le graphique en ligne
      fill:               type === 'line' && i === 0, // Zone remplie uniquement sur la 1ère série
      pointRadius:        type === 'line' ? 4 : 0,
      pointHoverRadius:   6,
      pointBackgroundColor: color,
    };
  });

  // Plugin personnalisé : ligne de moyenne en pointillés
  const avgLinePlugin = _buildAvgLinePlugin(avg);

  state.currentChart = new Chart(canvas.getContext('2d'), {
    type,
    data:    { labels, datasets },
    plugins: [avgLinePlugin],
    options: _buildChartOptions(),
  });
}

// ============================================================
//  FONCTIONS UTILITAIRES INTERNES
// ============================================================

/**
 * Extrait les séries numériques d'un indicateur (colonnes 1 à n).
 * Ignore les colonnes vides et celles ne contenant que des nulls.
 * @param {string[]} headers - En-têtes du tableau
 * @param {Array[]}  rows    - Lignes de données
 * @returns {{ label: string, values: (number|null)[] }[]}
 */
function _extractNumericSeries(headers, rows) {
  const series = [];
  for (let col = 1; col < headers.length; col++) {
    const h = headers[col];
    if (!h || !h.trim()) continue; // Ignore les colonnes sans en-tête

    const values = rows.map(r => {
      const v = r[col];
      if (v === null || v === undefined || v === '') return null;
      const n = parseFloat(String(v).replace(',', '.')); // Normalise virgule→point
      return isNaN(n) ? null : n;
    });

    if (values.every(v => v === null)) continue; // Ignore les colonnes 100 % vides
    series.push({ label: h, values });
  }
  return series;
}

/**
 * Calcule la moyenne des valeurs non nulles d'un tableau.
 * @param {(number|null)[]} values
 * @returns {number|null} Moyenne ou null si aucune valeur valide
 */
function _computeAverage(values) {
  const valid = values.filter(v => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

/**
 * Construit le plugin Chart.js pour afficher la ligne de moyenne en pointillés.
 * La ligne n'est dessinée que si state.showAverage === true et avg !== null.
 * @param {number|null} avg - Valeur de la moyenne
 * @returns {Object} Plugin Chart.js
 */
function _buildAvgLinePlugin(avg) {
  return {
    id: 'avgLine',
    afterDraw(chart) {
      if (!state.showAverage || avg === null) return;

      const { ctx: c, scales: { y }, chartArea: { left, right } } = chart;
      if (!y) return;

      const yPos = y.getPixelForValue(avg);

      c.save();
      c.setLineDash([7, 4]);              // Pointillés 7px trait / 4px espace
      c.strokeStyle = '#00aeef';          // Bleu UNICEF variante
      c.lineWidth   = 1.8;
      c.beginPath();
      c.moveTo(left, yPos);
      c.lineTo(right, yPos);
      c.stroke();
      c.setLineDash([]);                  // Réinitialise le style de trait

      // Libellé de la moyenne (format anglais, WCAG AA sur fond blanc)
      c.fillStyle = '#005a9e';
      c.font      = '11px "Segoe UI", Arial, sans-serif';
      const txt   = 'Average: ' + fmtNum(avg);
      c.fillText(txt, right - c.measureText(txt).width - 8, yPos - 5);
      c.restore();
    },
  };
}

/**
 * Retourne l'objet options commun à tous les graphiques Chart.js.
 * Centralise la configuration pour faciliter la maintenance.
 * @returns {Object} Options Chart.js
 */
function _buildChartOptions() {
  return {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false }, // Tooltip groupé sur la même abscisse

    plugins: {
      legend: {
        display:  ctx => ctx.chart.data.datasets.length > 1,
        position: 'top',
        labels:   { font: { size: 11 }, color: '#212529', padding: 14 },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor:      '#212529',   // Noir — guideline UX (pas bleu lien)
        bodyColor:       '#343a40',
        borderColor:     '#dee2e6',
        borderWidth:     1,
        padding:         10,
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y;
            if (v === null || v === undefined) return '';
            return ' ' + ctx.dataset.label + ': ' + fmtNum(v); // Format anglais
          },
        },
      },
    },

    scales: {
      x: {
        grid:  { color: '#f2f2f2' },
        ticks: { color: '#495057', font: { size: 11 }, maxRotation: 40 },
      },
      y: {
        grid:  { color: '#f2f2f2' },
        ticks: {
          color:    '#495057',
          font:     { size: 11 },
          callback: v => fmtNum(v), // Format anglais sur l'axe Y
        },
        beginAtZero: false,
      },
    },
  };
}

// ============================================================
//  FORMAT DES NOMBRES — Format  (guideline UX)
// ============================================================

/**
 * Formate un nombre (1,200,000.00).
 * Retourne '—' pour les valeurs nulles ou indéfinies.
 * @param {number|null|undefined} v
 * @returns {string}
 */
function fmtNum(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// ============================================================
//  TYPE DE GRAPHIQUE
// ============================================================

/**
 * Bascule entre graphique en colonnes ('bar') et en ligne ('line').
 * UX : btn-primary (rempli) = actif ; btn-outline-primary = inactif.
 * Accessibilité : aria-pressed pour indiquer l'état sans se fier à la couleur seule.
 * @param {'bar'|'line'} type
 */
function setChartType(type) {
  state.chartType = type;

  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    const active = btn.dataset.type === type;
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-outline-primary', !active);
    btn.setAttribute('aria-pressed', String(active));
  });

  renderChart();
}

// ============================================================
//  BASCULE LIGNE DE MOYENNE
// ============================================================

/**
 * Affiche ou masque la ligne de moyenne sur le graphique.
 * Met à jour aria-checked pour les lecteurs d'écran.
 * @param {boolean} checked
 */
function toggleAverage(checked) {
  state.showAverage = checked;
  // Mise à jour légère du graphique existant (pas de reconstruction complète)
  if (state.currentChart) state.currentChart.update();
}

// ============================================================
//  PARTAGE SUR LES RÉSEAUX SOCIAUX
// ============================================================

/**
 * Partage le graphique actuel sur LinkedIn ou Facebook.
 * Ouvre une popup de partage avec l'URL de la page courante
 * et le nom de l'indicateur comme texte.
 * @param {'linkedin'|'facebook'} platform
 */
function shareChart(platform) {
  const ind   = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  const title = ind ? ind.name : 'Indicateur UNICEF';

  // URL de la page actuelle (fonctionne sur un serveur ; en local = file://)
  const pageUrl = encodeURIComponent(window.location.href);
  const text    = encodeURIComponent('📊 ' + title + ' — Tableau de bord Droits de l\'Enfant UNICEF France');

  const urls = {
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${pageUrl}&title=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}&quote=${text}`,
  };

  // Ouvre la popup de partage (600×500 px, centrée)
  const w = 600, h = 500;
  const left = Math.round((screen.width  - w) / 2);
  const top  = Math.round((screen.height - h) / 2);
  window.open(
    urls[platform],
    'share_' + platform,
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

// ============================================================
//  TÉLÉCHARGEMENT DU GRAPHIQUE
// ============================================================

/**
 * Exporte le graphique actuel en PNG avec fond blanc.
 * Le canvas Chart.js est transparent par défaut, d'où la copie sur fond blanc.
 */
function downloadChart() {
  const canvas = document.getElementById('mainChart');
  if (!canvas || canvas.style.display === 'none') return;

  // Canvas hors écran avec fond blanc (le canvas Chart.js est transparent)
  const offscreen    = document.createElement('canvas');
  offscreen.width    = canvas.width;
  offscreen.height   = canvas.height;
  const ctx          = offscreen.getContext('2d');
  ctx.fillStyle      = '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);
  ctx.drawImage(canvas, 0, 0);

  // Nom de fichier : nom de l'indicateur sanitisé (caractères spéciaux → supprimés)
  const ind      = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  const filename = ind
    ? ind.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_')
    : 'graphique';

  // Création et déclenchement du lien de téléchargement
  const link      = document.createElement('a');
  link.download   = filename + '.png';
  link.href       = offscreen.toDataURL('image/png');
  link.click();
}

// ============================================================
//  SÉCURITÉ — Échappement HTML (protection XSS)
// ============================================================

/**
 * Échappe les caractères HTML spéciaux pour prévenir les injections XSS.
 * À utiliser sur tout contenu externe inséré dans le DOM via innerHTML.
 * @param {string} s - Chaîne à sécuriser
 * @returns {string}
 */
function escHtml(s) {
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}
