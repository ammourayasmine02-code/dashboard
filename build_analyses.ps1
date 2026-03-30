# ============================================================
# SCRIPT : build_analyses.ps1
# ROLE   : Lit le fichier texte source (analyses_temp.txt),
#          extrait les textes d'analyse de chaque indicateur,
#          et génère le fichier JavaScript analyses_ascii.js
#          contenant l'objet INDICATOR_ANALYSES.
# USAGE  : Lancer depuis PowerShell dans le dossier dashboard\
# ============================================================

# Force l'encodage UTF-8 dans la console pour éviter les problèmes d'accents
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Résolution du chemin relatif au répertoire du script (portable, pas de chemin absolu)
# $PSScriptRoot = dossier contenant build_analyses.ps1 — fonctionne peu importe l'utilisateur
# ou la machine. Les chemins absolus codés en dur exposent le nom d'utilisateur Windows
# et empêchent l'exécution sur d'autres postes ou en CI/CD.
$scriptDir   = $PSScriptRoot
$inputFile   = Join-Path $scriptDir 'analyses_temp.txt'
$outputFile  = Join-Path $scriptDir 'analyses_ascii.js'

# Vérification d'existence du fichier source avant lecture
if (-not (Test-Path $inputFile)) {
  Write-Error "Fichier source introuvable : $inputFile"
  exit 1
}

$t = Get-Content $inputFile -Encoding UTF8 -Raw

# ------------------------------------------------------------
# Fonction Seg : extrait le texte situé entre deux marqueurs
#   $t : le texte complet
#   $a : marqueur de début (le texte commence juste après)
#   $b : marqueur de fin   (le texte s'arrête juste avant)
#        si $b est vide, on extrait jusqu'à la fin du fichier
# ------------------------------------------------------------
function Seg($t, $a, $b) {
  $i = $t.IndexOf($a)
  if ($i -lt 0) { return '' }        # marqueur de début introuvable : retourne vide
  $i += $a.Length                    # on se place juste après le marqueur de début
  if ($b) { $j = $t.IndexOf($b, $i) } else { $j = $t.Length }
  if ($j -lt 0) { $j = $t.Length }  # marqueur de fin introuvable : on va jusqu'au bout
  return $t.Substring($i, $j - $i).Trim()
}

# ------------------------------------------------------------
# Table de correspondance : clé JS de l'indicateur => texte extrait
# Chaque ligne appelle Seg() avec les marqueurs de début et de fin
# tels qu'ils apparaissent dans analyses_temp.txt
# ------------------------------------------------------------
$map = [ordered]@{
  "Age moyen a la maternite"                = (Seg $t "Age moyen a la maternite" "Pourcentage de meres de moins de 18 ans")
  "Pourcentage de meres agees de  moins de 18 ans" = (Seg $t "Pourcentage de meres de moins de 18 ans" "Part des familles monoparentales")
  "Part des familles monoparentale"         = (Seg $t "Part des familles monoparentales" "Nombre de naissances vivantes domiciliees en France")
  "Taux de natalite en Hexagone"            = (Seg $t "Taux de natalite en Hexagone" "Taux de natalite en Guyane")
  "Depense annuelle par eleve"              = (Seg $t "Depense annuelle par eleve" "Taux de NEET 15-19 ans (national)")
  "Taux de NEET des 15-19 ans national"     = (Seg $t "Taux de NEET 15-19 ans (national)" "Taux de NEET 15-19 ans (La Reunion)")
  "Pourcentage d eleves de REP + s"         = (Seg $t "Eleves de REP+ sous le niveau attendu" "Part de jeunes en difficultes de lecture")
  "Part de jeunes en difficultes de lecture"= (Seg $t "Part de jeunes en difficultes de lecture" "Ecart de performance socio-economique (PISA)")
  "Ecart moyen de performance"              = (Seg $t "Ecart de performance socio-economique (PISA)" "Heures d enseignement annuelles")
  "Heures (France - College)"               = (Seg $t "Heures d enseignement annuelles - College" "Taille moyenne des classes - Primaire")
  "CITE 1 (Primaire)"                       = (Seg $t "Taille moyenne des classes - Primaire (CITE1)" "Taille moyenne des classes - College")
  "(CITE 1)"                                = (Seg $t "Taille moyenne des classes - College (CITE2)" "Effectif d eleves en primaire")
  "Nombre d eleves avec PPS"                = (Seg $t "Eleves avec un Projet Personnalise de Scolarisation (PPS)" "3. Opinion")
  "Valeur"                                  = (Seg $t "Taux de couverture des services essentiels de sante (en %)" "Taux de mortalite infantile")
  "Taux pour 1 000 naissances"              = (Seg $t "Taux de mortalite infantile (en %)" "Taux de vaccination")
  "Nombre de jeunes accompagnes"            = (Seg $t "Nombre d enfants et adolescents handicapes accompagnes" "8. Sante mentale")
  "Score Moyen"                             = (Seg $t "Score de niveau de bien-etre et qualite de vie en lien avec la sante declaree par les enfants de 6 a 11 ans" "Part des enfants de 11, 13 et 15 ans")
  "Garcons (%)"                             = (Seg $t "Part des enfants de 11, 13 et 15 ans subissant du harcelement a l ecole en France" "Part des enfants presentant un trouble probable")
  "Prevalence Globale (%)"                  = (Seg $t "Part des enfants presentant un trouble probable de sante mentale" "Nombre annuel moyen de passages aux urgences")
  "Part d enfants cyberharcel s (au moins 1-2 fois)" = (Seg $t "Part d enfants qui ont ete cyberharce les au moins 1 a 2 fois ces derniers mois" "9. Nutrition")
  "% de menages avec enfants concernes"     = (Seg $t "Part des menages avec enfants en situation de precarite alimentaire" "Prevalence de l obesite")
  "% d obesite infantile"                   = (Seg $t "Pourcentage d enfants en obesite (en %)" "Pourcentage d enfants en surpoids")
  "% d enfants en surpoids (Obesite incluse)"= (Seg $t "Pourcentage d enfants en surpoids (en %)" "10. Changement climatique")
  "Nombre de deces (Mineurs)"               = (Seg $t "Nombre de mineurs decedes de mort violente au sein de la famille en France" "Nombre d enfants suivis par l Aide sociale")
  "Nombre de suivis (ASE)"                  = (Seg $t "Nombre d enfants suivis par l Aide sociale a l enfance (ASE)" "Nombre et part d enfants suivis par la Protection")
  "Nombre de mineurs suivis par la pjj"     = (Seg $t "Nombre et part d enfants suivis par la Protection judiciaire de la jeunesse" "Nombre d enfants concernes par une situation de danger")
  "Appels donnant lieu a une suite"         = (Seg $t "Nombre d enfants concernes par une situation de danger ou en risque de l etre, faisant l objet d un appel au 119" "Nombre d enfants victimes de violences physiques")
  "Nombre de victimes"                      = (Seg $t "Nombre d enfants victimes de violences physiques" "Nombre d enfants victimes de violences sexuelles")
  "% de parents concernes"                  = (Seg $t "Pourcentage de parents declarant avoir eu recours a au moins une violence educative ordinaire" "Nombre d enfants victimes d exploitation")
  "Nombre de victimes identifiees"          = (Seg $t "Nombre d enfants victimes d exploitation a des fins d activites criminelles" "6. Migration")
  "Taux de recours (2022)"                  = (Seg $t "Taux de recours a un mode d accueil formel des enfants de moins de 3 ans dans les familles aux plus hauts revenus" "Taux de recours a un mode d accueil formel des enfants de moins de 3 ans dans les familles modestes")
  "Taux de couverture (%)"                  = (Seg $t "Taux de couverture des PMI par rapport aux besoins de consultations infantiles" "Nombre de femmes ayant pu suivre")
  "Nombre de demandes (OFPRA)"              = (Seg $t "Nombre de demandeurs d asile consideres comme mineurs non accompagnes par nationalite, age et sexe" "Nombre de MNA pris en charge")
  "Nombre de MNA pris en charge"            = (Seg $t "Nombre de MNA pris en charge par l Aide sociale a l enfance" "Nombre de mineurs enfermes en retention administrative a Mayotte")
  "Hexagone (Enfants)"                      = (Seg $t "Nombre de mineurs enfermes en retention administrative en Hexagone" "7. Sante")
  "Part d utilisateurs (2019)"              = (Seg $t "Part d enfants de 0-6 ans utilisant un ecran numerique" "% d enfants exposes le matin")
  "% d enfants exposes le matin presentant des troubles du langage" = (Seg $t "Pourcentage d enfants en maternelle exposes aux ecrans le matin avant l ecole" "Nombre d infractions liees au numerique")
  "Nombre de faits enregistres"             = (Seg $t "Nombre d infractions liees au numerique (crimes et delits commis a l aide d un outil numerique) sur des mineurs en France" "Pourcentage d enfants entre 6 et 10 ans connectes")
  "Pourcentage d enfants entre 6 et 10 connectes et equipes d un smartphone" = (Seg $t "Pourcentage d enfants entre 6 et 10 ans connectes et equipes d un smartphone" "Pourcentage d enfants utilisant un equipement numerique")
  "Pourcentage d enfants utilisant 1 equipement numerique" = (Seg $t "Pourcentage d enfants utilisant un equipement numerique" "Pourcentage d enfants entre 8 et 10 ans")
  "Pourcentage d enfants inscrits"          = (Seg $t "Pourcentage d enfants entre 8 et 10 ans declarant etre inscrits aux reseaux sociaux" "Temps d ecran des enfants de 2 ans")
  "Temps d ecran moyen / jour"              = (Seg $t "Temps d ecran des enfants de 2 ans dans enfants de la cohorte nationale ELFE" "Pourcentage des parents qui regulen")
  "% de parents regulant l usage"           = (Seg $t "Pourcentage des parents qui regulen" "Pourcentage des parents imposant des restrictions sur les smartphones")
  "% de parents imposant des restrictions"  = (Seg $t "Pourcentage des parents imposant des restrictions sur les smartphones" "Proportion d enfants victimes de cyberharcelement")
  "Enfants avec BLL > 5 µg/dL (%)"         = (Seg $t "Estimations du nombre d enfants (0-19 ans) ayant des niveaux de plomb dans le sang" "Pourcentage d enfants de moins de 18 ans vivant dans des zones")
  "Enfants exposes a haut risque (2019)"    = (Seg $t "Pourcentage d enfants de moins de 18 ans vivant dans des zones a haut risque de pollution par les pesticides" "Espaces verts urbains")
  "Surface d espaces verts par habitant (m^2)" = (Seg $t "Espaces verts urbains par habitant (en m" "Nombre d eleves touches")
  "Eleves touches"                          = (Seg $t "Nombre d eleves touches par des perturbations scolaires liees au climat" "Nombre d enfants deplaces a cause")
  "Nombre d enfants deplaces (Mondial)"     = (Seg $t "Nombre d enfants deplaces a cause d evenements dus au changement climatique" "11. Numerique")
  "Taux global (Ensemble)"                  = (Seg $t "Taux de privation materielle et sociale par age et sexe" "Taux de pauvrete des moins de 18 ans")
  "Taux de pauvrete infantile"              = (Seg $t "Taux de pauvrete des moins de 18 ans" "Nombre d enfants sans abri")
  "Enfants restant a la rue (chaque soir)"  = (Seg $t "Nombre d enfants sans abri ou vivant a l hotel" "Taux d enfants de 0 a 17 ans")
}

# ------------------------------------------------------------
# Génération du fichier JavaScript de sortie
# On construit la chaîne de caractères ligne par ligne,
# puis on l'écrit dans analyses_ascii.js
# ------------------------------------------------------------

# Utilisation d'un StringBuilder pour construire le contenu JS efficacement
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine("const INDICATOR_ANALYSES = {")

foreach ($k in $map.Keys) {
  $v = $map[$k]
  # On ignore les valeurs vides ou trop courtes (moins de 5 caractères)
  if ($v -and $v.Length -gt 5) {

    # ── Nettoyage des espaces blancs ──────────────────────────────────────
    # Remplace toutes les séquences de whitespace (CRLF, LF, CR, tab) par un espace simple.
    $vClean = $v -replace "[\r\n\t]+", " " -replace "\s+", " "

    # ── Échappement complet pour les littéraux JavaScript ────────────────
    # ORDRE IMPÉRATIF : l'antislash doit être échappé EN PREMIER,
    # sinon les échappements suivants doubleraient les antislashs déjà insérés.
    #
    # Vecteurs traités :
    #  1) \        → \\     (antislash — caractère d'échappement JS)
    #  2) '        → \'     (apostrophe — délimiteur du littéral JS)
    #  3) "        → \"     (guillemet  — protection défensive)
    #  4) octet nul→ ""     (null byte  — troncature de chaîne en C/certains parseurs)
    #  Les sauts de ligne sont déjà traités à l'étape de nettoyage ci-dessus.
    $vClean = $vClean -replace "\\",   "\\\\"     # 1) \ → \\
    $vClean = $vClean -replace "'",    "\\'"      # 2) ' → \'
    $vClean = $vClean -replace '"',    '\\"'      # 3) " → \"
    $vClean = $vClean -replace "\x00", ""         # 4) null byte → supprimé

    # Échappement de la clé JS (même logique, par cohérence)
    $kClean = $k      -replace "\\",   "\\\\"
    $kClean = $kClean -replace "'",    "\\'"
    $kClean = $kClean -replace '"',    '\\"'
    $kClean = $kClean -replace "\x00", ""

    [void]$sb.AppendLine("  '$kClean': '$vClean',")
  }
}

[void]$sb.AppendLine("};")

# Écriture du résultat dans le fichier de sortie en UTF-8 (chemin relatif via $scriptDir)
# → Renommer ensuite analyses_ascii.js en analyses.js pour l'utiliser dans le dashboard
$sb.ToString() | Out-File $outputFile -Encoding UTF8
Write-Host "Terminé — fichier généré : $outputFile"
