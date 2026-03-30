// UNICEF Dashboard — Droits de l'Enfant en France
// dashboard.js — Logique principale

// Tout le code est enfermé dans une fonction qui s'exécute immédiatement.
// Cela évite que les fonctions soient accessibles depuis l'extérieur (sécurité).
(function () {
'use strict'; // Active le mode strict : les erreurs de code deviennent visibles

// --- Couleurs des graphiques (palette UNICEF) ---
const CHART_PALETTE = [
  '#1CABE2', // bleu UNICEF
  '#6A1E74', // violet
  '#F26A21', // orange
  '#E2231A', // rouge
  '#00833D', // vert
  '#80BD41', // vert clair
  '#961A49', // fuchsia
  '#777779', // gris
  '#2653B9', // bleu foncé
  '#FFC20E', // jaune
  '#FF7100', // orange vif
  '#374EA2', // bleu foncé UNICEF
];

// Couleur officielle de chaque thématique
const THEME_COLORS = {
  'Démographie':    '#777779',
  'Education':      '#6A1E74',
  'Santé':          '#FF7100',
  'Santé mentale':  '#FF9A50',
  'Nutrition':      '#E2231A',
  'Protection':     '#2653B9',
  'Petite Enfance': '#1CABE2',
  'Migration':      '#6686C8',
  'Numérique':      '#80BD41',
  'Climat':         '#00833D',
  'Pauvreté':       '#961A49',
};

// État de l'application (thème actif, indicateur actif, type de graphique...)
let state = {
  themeIdx:     0,
  indicatorIdx: 0,
  chartType:    'bar',
  showAverage:  true,
  currentChart: null,
};

// =============================================================
//  INITIALISATION
// =============================================================

// Démarre l'application. Vérifie que les données sont chargées,
// puis lit les paramètres URL (?theme=...&indicator=...) si présents.
function init() {
  if (typeof DASHBOARD_DATA === 'undefined') {
    // Affiche une erreur si le fichier data.js est absent
    var errDiv    = document.createElement('div');
    errDiv.className = 'alert alert-danger m-3';
    errDiv.setAttribute('role', 'alert');
    var errStrong = document.createElement('strong');
    errStrong.textContent = 'Erreur :';
    errDiv.appendChild(errStrong);
    errDiv.appendChild(document.createTextNode(' le fichier data.js est introuvable.'));
    document.getElementById('main-content').appendChild(errDiv);
    return;
  }

  // Lecture des paramètres dans l'URL (ex: ?theme=Santé&indicator=...)
  // _validateParam() nettoie chaque valeur avant utilisation
  const params     = new URLSearchParams(window.location.search);
  const themeParam = _validateParam(params.get('theme'));
  const indicParam = _validateParam(params.get('indicator'));

  if (themeParam) {
    _showBackButton(true, themeParam);

    const themeIdx = DASHBOARD_DATA.findIndex(
      t => t.name.toLowerCase() === themeParam.toLowerCase()
    );

    if (themeIdx !== -1) {
      state.themeIdx = themeIdx;
      renderThemeTabs();
      renderSidebar();

      if (indicParam) {
        const indicators = DASHBOARD_DATA[themeIdx].indicators;
        const indicIdx   = indicators.findIndex(
          ind => ind.name.toLowerCase().includes(indicParam.toLowerCase()) ||
                 indicParam.toLowerCase().includes(ind.name.toLowerCase())
        );
        selectIndicator(indicIdx !== -1 ? indicIdx : 0);
      } else {
        selectIndicator(0);
      }
      return;
    }
  }

  selectTheme(0);
}

// Affiche ou cache le bouton "Retour à la roue" selon si on vient de la roue
function _showBackButton(visible, themeName) {
  const btn = document.getElementById('backToRoueBtn');
  if (!btn) return;
  btn.classList.toggle('d-none', !visible);
  if (visible && themeName) {
    btn.href = '../Roue Observatoire/index.html?theme=' + encodeURIComponent(themeName);
  }
}

// =============================================================
//  ONGLETS DE THÉMATIQUES
// =============================================================

// Construit les onglets en haut de page (un par thématique)
function renderThemeTabs() {
  const bar  = document.getElementById('themesBar');
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

    if (isActive) {
      a.style.cssText = `background-color:${themeColor};border-color:${themeColor};border-bottom:none;color:#fff;font-weight:700;`;
    } else {
      a.style.cssText = `background-color:${themeColor}26;border-color:${themeColor};border-bottom:none;color:${themeColor};`;
    }

    // On vérifie que l'icône est bien une image base64 (pas un lien dangereux)
    const safeSrc = (iconSrc && /^data:image\/[a-z]+;base64,/i.test(iconSrc)) ? iconSrc : null;

    if (safeSrc) {
      const img = document.createElement('img');
      img.src = safeSrc;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.style.cssText = 'width:26px;height:26px;object-fit:contain;vertical-align:middle;margin-right:6px;filter:' +
        (isActive ? 'brightness(0) invert(1)' : 'none');
      a.appendChild(img);
      a.appendChild(document.createTextNode(' ' + theme.name));
    } else {
      a.textContent = theme.name;
    }

    a.addEventListener('click', (e) => { e.preventDefault(); selectTheme(i); });

    li.appendChild(a);
    frag.appendChild(li);
  });

  bar.innerHTML = '';
  bar.appendChild(frag);
}

// Active la thématique choisie et charge son premier indicateur
function selectTheme(idx) {
  state.themeIdx     = idx;
  state.indicatorIdx = 0;
  renderThemeTabs();
  renderSidebar();
  selectIndicator(0);
}

// =============================================================
//  SIDEBAR — Liste des indicateurs
// =============================================================

// Construit la liste des indicateurs dans le panneau gauche
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const theme   = DASHBOARD_DATA[state.themeIdx];
  const frag    = document.createDocumentFragment();

  const h2 = document.createElement('h2');
  h2.className   = 'sidebar-section-title';
  h2.textContent = theme.name;
  frag.appendChild(h2);

  theme.indicators.forEach((ind, i) => {
    const a = document.createElement('a');
    a.href        = '#';
    a.className   = 'list-group-item list-group-item-action' + (i === state.indicatorIdx ? ' active' : '');
    a.textContent = ind.name;
    a.title       = ind.name;
    a.setAttribute('role', 'option');
    a.setAttribute('aria-selected', String(i === state.indicatorIdx));
    a.addEventListener('click', (e) => { e.preventDefault(); selectIndicator(i); });
    frag.appendChild(a);
  });

  sidebar.innerHTML = '';
  sidebar.appendChild(frag);
}

// Active l'indicateur cliqué et met à jour l'affichage
function selectIndicator(idx) {
  state.indicatorIdx = idx;

  document.querySelectorAll('#sidebar .list-group-item-action').forEach((el, i) => {
    const active = (i === idx);
    el.classList.toggle('active', active);
    el.setAttribute('aria-selected', String(active));
  });

  renderChart();
}

// =============================================================
//  GRAPHIQUE
// =============================================================

// Lance le rendu du graphique avec un spinner pendant le chargement
function renderChart() {
  const ind = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  if (!ind) return;

  document.getElementById('chartTitle').textContent = ind.name;
  document.getElementById('chartRegion').setAttribute('aria-label', 'Graphique : ' + ind.name);

  showSpinner(true);

  // setTimeout(0) laisse le navigateur afficher le spinner avant de dessiner le graphique
  setTimeout(() => {
    _doRenderChart(ind);
    showSpinner(false);

    const analyseEl = document.getElementById('indicatorAnalysis');
    if (analyseEl) {
      const text = (typeof INDICATOR_ANALYSES !== 'undefined' && INDICATOR_ANALYSES[ind.name]) || '';
      analyseEl.textContent = text;
      analyseEl.style.display = text ? 'block' : 'none';
    }
  }, 0);
}

// Affiche ou cache le spinner de chargement
function showSpinner(visible) {
  document.getElementById('chartSpinner').classList.toggle('d-none', !visible);
}

// Dessine le graphique Chart.js pour l'indicateur donné
function _doRenderChart(ind) {
  const { headers, data: rows } = ind;
  const labels = rows.map(r => (r[0] != null ? String(r[0]) : ''));
  const series = _extractNumericSeries(headers, rows);

  // On détruit le graphique précédent avant d'en créer un nouveau
  if (state.currentChart) {
    state.currentChart.destroy();
    state.currentChart = null;
  }

  const canvas = document.getElementById('mainChart');
  const noData = document.getElementById('noData');
  const dlBtn  = document.getElementById('chartActions');

  // Si aucune donnée numérique, on affiche le message "données textuelles"
  if (series.length === 0) {
    canvas.style.display = 'none';
    noData.style.display = 'flex';
    if (dlBtn) dlBtn.style.display = 'none';
    return;
  }

  canvas.style.display = 'block';
  noData.style.display = 'none';
  if (dlBtn) dlBtn.style.display = '';

  const type = state.chartType;
  const avg  = _computeAverage(series[0].values);

  const datasets = series.map((s, i) => {
    const color = CHART_PALETTE[i % CHART_PALETTE.length];
    return {
      label:               s.label,
      data:                s.values,
      backgroundColor:     type === 'bar' ? color + 'cc' : color + '22',
      borderColor:         color,
      borderWidth:         type === 'bar' ? 0 : 2.5,
      borderRadius:        type === 'bar' ? 3 : 0,
      tension:             0.35,
      fill:                type === 'line' && i === 0,
      pointRadius:         type === 'line' ? 4 : 0,
      pointHoverRadius:    6,
      pointBackgroundColor: color,
    };
  });

  const avgLinePlugin = _buildAvgLinePlugin(avg);

  state.currentChart = new Chart(canvas.getContext('2d'), {
    type,
    data:    { labels, datasets },
    plugins: [avgLinePlugin],
    options: _buildChartOptions(),
  });
}

// =============================================================
//  FONCTIONS UTILITAIRES
// =============================================================

// Récupère les colonnes numériques de l'indicateur (ignore les textes et les vides)
function _extractNumericSeries(headers, rows) {
  const series = [];
  for (let col = 1; col < headers.length; col++) {
    const h = headers[col];
    if (!h || !h.trim()) continue;

    const values = rows.map(r => {
      const v = r[col];
      if (v === null || v === undefined || v === '') return null;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? null : n;
    });

    if (values.every(v => v === null)) continue;
    series.push({ label: h, values });
  }
  return series;
}

// Calcule la moyenne des valeurs (ignore les nulls)
function _computeAverage(values) {
  const valid = values.filter(v => v !== null);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
}

// Crée le plugin qui dessine la ligne de moyenne en pointillés sur le graphique
function _buildAvgLinePlugin(avg) {
  return {
    id: 'avgLine',
    afterDraw(chart) {
      if (!state.showAverage || avg === null) return;

      const { ctx: c, scales: { y }, chartArea: { left, right } } = chart;
      if (!y) return;

      const yPos = y.getPixelForValue(avg);

      c.save();
      c.setLineDash([7, 4]);
      c.strokeStyle = '#00aeef';
      c.lineWidth   = 1.8;
      c.beginPath();
      c.moveTo(left, yPos);
      c.lineTo(right, yPos);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = '#005a9e';
      c.font      = '11px "Segoe UI", Arial, sans-serif';
      const txt   = 'Average: ' + fmtNum(avg);
      c.fillText(txt, right - c.measureText(txt).width - 8, yPos - 5);
      c.restore();
    },
  };
}

// Retourne la configuration commune des graphiques Chart.js
function _buildChartOptions() {
  return {
    responsive:          true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display:  ctx => ctx.chart.data.datasets.length > 1,
        position: 'top',
        labels:   { font: { size: 11 }, color: '#212529', padding: 14 },
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor:      '#212529',
        bodyColor:       '#343a40',
        borderColor:     '#dee2e6',
        borderWidth:     1,
        padding:         10,
        callbacks: {
          label: ctx => {
            const v = ctx.parsed.y;
            if (v === null || v === undefined) return '';
            return ' ' + ctx.dataset.label + ': ' + fmtNum(v);
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
          callback: v => fmtNum(v),
        },
        beginAtZero: false,
      },
    },
  };
}

// Formate un nombre en format anglais (ex: 1,200,000.00). Retourne '—' si vide.
function fmtNum(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
}

// =============================================================
//  TYPE DE GRAPHIQUE
// =============================================================

// Bascule entre barres ('bar') et courbe ('line')
function setChartType(type) {
  // On n'accepte que 'bar' ou 'line' — toute autre valeur est ignorée
  if (type !== 'bar' && type !== 'line') return;
  state.chartType = type;

  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    const active = btn.dataset.type === type;
    btn.classList.toggle('btn-primary', active);
    btn.classList.toggle('btn-outline-primary', !active);
    btn.setAttribute('aria-pressed', String(active));
  });

  renderChart();
}

// =============================================================
//  LIGNE DE MOYENNE
// =============================================================

// Affiche ou cache la ligne de moyenne sur le graphique
function toggleAverage(checked) {
  state.showAverage = checked;
  if (state.currentChart) state.currentChart.update();
}

// =============================================================
//  PARTAGE RÉSEAUX SOCIAUX
// =============================================================

// Ouvre une popup de partage LinkedIn ou Facebook
// Seules ces deux plateformes sont autorisées (sécurité)
function shareChart(platform) {
  const ALLOWED_PLATFORMS = ['linkedin', 'facebook'];
  if (!ALLOWED_PLATFORMS.includes(platform)) return;

  const ind   = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  const title = ind ? ind.name : 'Indicateur UNICEF';

  const pageUrl = encodeURIComponent(window.location.href);
  const text    = encodeURIComponent('Tableau de bord Droits de l\'Enfant UNICEF France — ' + title);

  const urls = {
    linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + pageUrl + '&title=' + text,
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + pageUrl + '&quote=' + text,
  };

  const w = 600, h = 500;
  const left = Math.round((screen.width  - w) / 2);
  const top  = Math.round((screen.height - h) / 2);

  // noopener,noreferrer : la popup ne peut pas modifier l'onglet qui l'a ouverte
  window.open(
    urls[platform],
    '_blank',
    'noopener,noreferrer,width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',resizable=yes,scrollbars=yes'
  );
}

// =============================================================
//  TÉLÉCHARGEMENT
// =============================================================

// Exporte le graphique en PNG avec fond blanc
function downloadChart() {
  const canvas = document.getElementById('mainChart');
  if (!canvas || canvas.style.display === 'none') return;

  // Le canvas Chart.js est transparent — on le recopie sur fond blanc
  const offscreen    = document.createElement('canvas');
  offscreen.width    = canvas.width;
  offscreen.height   = canvas.height;
  const ctx          = offscreen.getContext('2d');
  ctx.fillStyle      = '#ffffff';
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);
  ctx.drawImage(canvas, 0, 0);

  // Nom du fichier = nom de l'indicateur sans caractères spéciaux
  const ind      = DASHBOARD_DATA[state.themeIdx].indicators[state.indicatorIdx];
  const rawName  = ind ? ind.name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') : '';
  const filename = rawName || 'graphique';

  const link    = document.createElement('a');
  link.download = filename + '.png';
  link.href     = offscreen.toDataURL('image/png');
  link.click();
}

// =============================================================
//  SÉCURITÉ
// =============================================================

// Échappe les caractères HTML dangereux — à utiliser si on insère du texte via innerHTML
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Vérifie qu'un paramètre URL est safe avant de l'utiliser :
// - trop long → refusé
// - contient des caractères dangereux (< > " ' ...) → refusé
function _validateParam(p) {
  if (!p) return null;
  if (p.length > 200) return null;
  if (/[<>"'`\x00-\x1F\x7F]/.test(p)) return null;
  return p;
}

// =============================================================
//  ÉVÉNEMENTS — branchement des boutons
// =============================================================

// Attache les clics/changements aux boutons de la page
// (Les onclick= ont été retirés du HTML pour la sécurité CSP)
function _attachEventListeners() {
  document.querySelectorAll('.chart-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { setChartType(this.dataset.type); });
  });

  var avgToggle = document.getElementById('avgToggle');
  if (avgToggle) {
    avgToggle.addEventListener('change', function() { toggleAverage(this.checked); });
  }

  var downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadChart);
  }

  document.querySelectorAll('.share-btn[aria-label]').forEach(function(btn) {
    var label = btn.getAttribute('aria-label') || '';
    if (label.indexOf('LinkedIn') !== -1) {
      btn.addEventListener('click', function() { shareChart('linkedin'); });
    } else if (label.indexOf('Facebook') !== -1) {
      btn.addEventListener('click', function() { shareChart('facebook'); });
    }
  });
}

// Démarre tout au chargement de la page
_attachEventListeners();
init();

})();
