/* =====================================================================
   CROC — DONNÉES DU SITE
   Tout le contenu du site est ici. Modifie les textes, sauvegarde,
   recharge la page : le site se reconstruit tout seul.
   Rien n'a été inventé en dehors de ta fiche : ce qui n'y figure pas
   est resté « ??? » ou a été omis.
   ===================================================================== */
window.CROC = {

nom: 'CROC',
sousTitre: 'Vampire · 22 ans · Muet de naissance',
frere: 'Eilyn',   /* le seul qui n'est pas un NPC */

/* Lignes tapées par le Système à l'ouverture */
boot: [
  '[SYSTÈME] Ouverture de la fiche…',
  '[SYSTÈME] Nom : ???   Prénom : ???',
  '[SYSTÈME] Espèce : Vampire',
  '[SYSTÈME] Prudence recommandée.',
],

/* IDENTITÉ */
champs: [
  { label: 'Surnom',   valeur: 'Croc' },
  { label: 'Nom',      valeur: '???' },
  { label: 'Prénom',   valeur: '???' },
  { label: 'Âge',      valeur: '22 ans' },
  { label: 'Espèce',   valeur: 'Vampire' },
  { label: 'Taille',   valeur: '1,99 m' },
  { label: 'Poids',    valeur: '95 kg' },
  { label: 'Croyance', valeur: 'Aucune' },
],
physique: [
  "Il soulève de la fonte dès qu'il ne tue pas de monstres et à force son corps est bâti « comme une machine ».",
  "Il est couvert de cicatrices de toutes tailles, laissées par des monstres comme par des êtres doués de raison.",
  "Muet.",
],

/* PSYCHOLOGIE */
psycho: [
  "Difficile à cerner, distant, froid. Aucune émotion ne passe sur son visage : il semble absorbé dans son propre monde.",
  "Il considère la plupart des gens comme des NPC, une habitude venue des jeux vidéo, auxquels il joue depuis tout petit.",
  "Son frère, Eilyn, est la seule exception, à cause des circonstances inhabituelles de leur naissance.",
  "Il s'en est déjà pris à des gens qu'il jugeait comme des « mauvais NPC », cela a souvent mené à des bagarres de rues. La frontière entre bon et mauvais NPC est très mince pour lui : prudence en l'abordant.",
],

/* STATISTIQUES (max 20 = barre à niveaux) */
stats: [
  { nom: 'F. Musculaire', val: 1, max: 20, bonus: '+10 %' },
  { nom: 'F. Physique',   val: 2, max: 20, bonus: '+10 %' },
  { nom: 'Agilité',       val: 1, max: 20 },
  { nom: 'Robustesse',    val: 1, max: 20 },
  { nom: 'Endurance',     val: 1, max: 20 },
  { nom: 'Vitalité',      val: 2, max: 20 },
  { nom: 'P. Magique',    val: 1, max: 20 },
  { nom: 'Perception',    val: 1, max: 20 },
],
rolls: [
  { nom: 'Roll Chance', val: 3 },
  { nom: 'Roll Magie',  val: 100 },
],

/* COMPÉTENCES
   groupe : 'Spéciale' ou 'Classique' (titres de groupe dans l'écran COMPÉTENCES) */
competences: [
  {
    nom: 'Lien Infortuné', groupe: 'Spéciale', type: 'Active', icone: 'lien',
    desc: "Crée un lien inséparable avec une cible et lui transfère la chance de l'utilisateur. Le malheur accumulé déclenche un événement catastrophique aléatoire. Le Système prévient l'utilisateur quelques secondes avant, mais l'utilisateur est toujours compté parmi les victimes. Les dégâts collatéraux peuvent provoquer des catastrophes plus grandes que prévu.",
    des: 100,   /* dé lancé au LV.5 (1 à des) — valeur à confirmer */
    niveaux: [
      { lv: 1, cout: 40, preavis: 5,  requis: 'Niveau de départ.' },
      { lv: 2, cout: 35, preavis: 5,  requis: '10 catastrophes depuis le niveau précédent.' },
      { lv: 3, cout: 35, preavis: 10, requis: '10 catastrophes depuis le niveau précédent.' },
      { lv: 4, cout: 30, preavis: 10, requis: '20 catastrophes depuis le niveau précédent.' },
      { lv: 5, cout: 30, preavis: 10, requis: '30 catastrophes depuis le niveau précédent.',
        special: "Le Système lance un dé : si le résultat est inférieur à 20, seule la cible est incluse dans la catastrophe." },
    ],
  },
  {
    nom: 'Accumulation du Chaos', groupe: 'Spéciale', type: 'Active', icone: 'chaos', niveau: 1,
    desc: "Le Chaos est une marque que Croc applique à ses adversaires. Chaque personne ou monstre marqué qu'il abattra lui fera absorber cette marque et renforcera ses statistiques de 0,5 %. La compétence évolue en absorbant des marques.",
    /* cout = % d'ENE · recharge = adversaires tués après une marque absorbée
       bonus = renfort par marque (en %) · marques = marques posées par rechargement */
    niveaux: [
      { lv: 1, cout: 10, recharge: 5,  bonus: 0.5, marques: 1, requis: 'Niveau de départ.' },
      { lv: 2, cout: 10, recharge: 10, bonus: 0.5, marques: 1, requis: '5 marques absorbées depuis le niveau précédent.' },
      { lv: 3, cout: 10, recharge: 15, bonus: 1,   marques: 1, requis: '5 marques absorbées depuis le niveau précédent.',
        special: "Les marques renforcent les statistiques de Force Physique, de Force Musculaire et de Robustesse de Croc désormais de 1 % par 1 %." },
      { lv: 4, cout: 10, recharge: 25, bonus: 1,   marques: 1, requis: '10 marques absorbées depuis le niveau précédent.' },
      { lv: 5, cout: 10, recharge: 35, bonus: 1,   marques: 2, requis: '10 marques absorbées depuis le niveau précédent.',
        special: "Croc peut désormais poser ses marques sur deux adversaires simultanément à chaque rechargement." },
    ],
  },
  {
    nom: 'Maîtrise des armes lourdes', groupe: 'Classique', type: 'Classique', icone: 'marteau', niveau: 1,
    desc: "Progresse à force d'utiliser des armes lourdes. La compétence n'a aucun effet.",
  },
],
/* Événements de la simulation (exemples libres, remplace-les à ta guise) */
catastrophes: [
  'Plafond effondré', 'Rupture de canalisation', 'Panne générale', 'Incendie spontané',
  'Pont rompu', 'Stampede de monstres', 'Court-circuit en chaîne', 'Éboulement',
],

/* RELATIONS — écran RELATIONS du menu.
   Pour ajouter quelqu'un : copie un bloc { ... } et change les valeurs.
   statut   : 'ALLIÉ' | 'NEUTRE' | 'ENNEMI' | 'INCONNU' (couleur et icône automatiques), null = non défini
   npc      : false = Croc ne le voit PAS comme un NPC (sinon, laisse true)
   affinite : 0 à 100 (affichée en cœurs), ou null si non évaluée
   portrait : 'images/mon-image.jpg' (rendue en pixel art), ou null pour un sprite
   citation, rencontre, derniereMaj, note : texte, ou null pour ne rien afficher */
relations: [
  {
    nom: 'Eilyn', role: 'Frère', statut: null, npc: false, affinite: null,
    citation: null, portrait: 'images/eilyn-portrait.jpg', rencontre: null, derniereMaj: null,
    note: "Le seul que Croc ne voit pas comme un NPC, à cause des circonstances inhabituelles de leur naissance.",
  },
  /* Exemple à copier :
  {
    nom: 'Nom', role: 'Rôle / lieu de rencontre', statut: 'NEUTRE', npc: true, affinite: 40,
    citation: '« ... »', portrait: null, rencontre: 'Jour 01, Le Dédale', derniereMaj: 'Jour 02',
    note: null,
  },
  */
],
relationsCases: 6,   // nombre de cases affichées (les vides sont grisées)

/* TITRE */
titres: [
  {
    nom: 'GROS MOOSKLES !!!',
    condition: "Avoir vaincu un Géant en tête-à-tête, uniquement à mains nues, avec des statistiques de départ.",
    effet: "Force Physique et Force Musculaire augmentées de 10 %.",
  },
],

/* GALERIE (fan arts : droits réservés à leurs auteurs) */
galerie: [
  { src: 'images/croc-accroupi.jpg', alt: 'Croc accroupi, marteau cloué de pointes en main' },
  { src: 'images/croc-encre.jpg',    alt: 'Portrait à l\'encre, sang sur le visage' },
  { src: 'images/croc-couloir.jpg',  alt: 'Croc de dos, descendant un escalier sous une lumière rouge' },
  { src: 'images/croc-marteau.jpg',  alt: 'Croc de profil, le marteau sur l\'épaule' },
  { src: 'images/croc-sourire.jpg',  alt: 'Croc souriant, cicatrices fraîches sur la joue' },
],

};

/* =====================================================================
   AJOUT PROPRE À LA VARIANTE « JEU VIDÉO RÉTRO » (optionnel)
   Répliques génériques des PNJ dans l'écran PSYCHÉ. Ce ne sont PAS des
   faits sur Croc : juste des phrases toutes faites de PNJ de jeu vidéo.
   Tu peux les modifier, en ajouter ou supprimer ce bloc entier.
   ===================================================================== */
window.CROC.retro = {
  repliquesPNJ: [
    'Bonjour, voyageur !',
    'Belle journée, hein ?',
    'Je dis toujours la même phrase.',
    '…',
    'Hé ! Arrête de me fixer comme ça.',
    'Tu as l\'air costaud, toi.',
    'Bienvenue ! Bienvenue ! Bienvenue !',
  ],
};
