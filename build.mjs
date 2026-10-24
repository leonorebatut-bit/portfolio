// Générateur de site statique — aucune dépendance.
// Usage : node build.mjs   →   produit le dossier dist/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'content', f), 'utf8'));

const site = readJSON('site.json');
const projects = readJSON('projects.json');
const experiences = readJSON('experiences.json');
const formation = readJSON('formation.json');
const skills = readJSON('skills.json');
const arts = readJSON('arts.json');
const engagements = readJSON('engagements.json');
const readings = readJSON('readings.json');

const warnings = [];
let todoCount = 0;
let R = './'; // préfixe relatif vers la racine pour la page en cours

/* ───────────── Utilitaires ───────────── */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const u = (p = '') => R + p;
const exists = (rel) => fs.existsSync(path.join(ROOT, 'public', rel));
const findFile = (dir, base, exts) => {
  for (const e of exts) if (exists(`${dir}/${base}.${e}`)) return `${dir}/${base}.${e}`;
  return null;
};
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const arr = (v) => (Array.isArray(v) ? v : v ? [v] : []);
const has = (v) => (Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== '');

function inline(s) {
  let t = esc(s);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, txt, url) => extLink(url, txt, true));
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  return t;
}
function extLink(url, label, labelIsHtml = false) {
  return `<a class="ext" href="${url}" target="_blank" rel="noopener noreferrer">${labelIsHtml ? label : esc(label)}<span class="sr-only"> (nouvelle fenêtre)</span></a>`;
}
const paras = (a) => arr(a).map((t) => `<p>${inline(t)}</p>`).join('');
const ul = (a, cls = '') => (has(a) ? `<ul${cls ? ` class="${cls}"` : ''}>${arr(a).map((t) => `<li>${inline(t)}</li>`).join('')}</ul>` : '');
const todo = (msg) => {
  todoCount++;
  return site.showPlaceholders ? `<p class="todo"><span>À compléter</span>${esc(msg)}</p>` : '';
};

const STATUS = {
  'en-cours': 'En cours', termine: 'Terminé', publie: 'Publié', soumis: 'Soumis', preprint: 'Préprint',
  manuscrit: 'Manuscrit en préparation', 'rapport-etudiant': 'Rapport étudiant',
  'projet-personnel': 'Projet personnel de recherche', 'projet-collectif': 'Projet collectif',
  contribution: 'Contribution éditoriale', 'a-preciser': 'Statut à préciser'
};
const TAGS = {
  realise: 'Réalisé', observe: 'Observé', interprete: 'Interprété', hypothese: 'Hypothèse ou perspective', encours: 'En cours'
};
const CATEGORY_ORDER = [
  'Recherche indépendante', 'Projets universitaires', 'Projets de programmation et de données',
  'Lectures et analyses scientifiques', 'Contributions éditoriales', 'Travaux interdisciplinaires'
];

const NAV = [
  ['', 'Accueil'], ['recherche/', 'Recherche & projets'], ['experiences/', 'Expériences'], ['formation/', 'Formation'],
  ['competences/', 'Compétences'], ['arts-culture/', 'Arts & culture'], ['engagements/', 'Engagements'],
  ['a-propos/', 'À propos'], ['contact/', 'Contact']
];

/* ───────────── Données dérivées ───────────── */
for (const p of projects) {
  for (const d of p.documents || []) {
    const rel = d.file || findFile('documents', d.id, ['pdf', 'pptx', 'ppt', 'docx', 'zip', 'csv', 'py', 'ipynb', 'txt']);
    if (d.file && !exists(`documents/${d.file}`)) {
      warnings.push(`Document introuvable : public/documents/${d.file} (projet ${p.slug})`);
      d._path = null;
    } else d._path = d.file ? `documents/${d.file}` : rel;
  }
}
const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
const allExpItems = experiences.categories.flatMap((c) => c.groups.flatMap((g) => g.items));
const expById = Object.fromEntries(allExpItems.map((e) => [e.id, e]));
const skillId = (name) => 'comp-' + slugify(name).slice(0, 40);
const portraitPath = site.portrait.file ? `images/${site.portrait.file}` : findFile('images', 'portrait', ['jpg', 'jpeg', 'png', 'webp']);

const projectHref = (p) => `recherche/projets/${p.slug}/`;
const sortedProjects = [...projects].sort((a, b) => (b.year || 0) - (a.year || 0));
const periodOf = (p) => p.period || (p.year ? String(p.year) : 'Période à préciser');

/* ───────────── Mise en page ───────────── */
const index = []; // index de recherche

function layout({ pagePath, title, desc, body, cls = '', ogType = 'website', jsonld = null, noindex = false, head = '' }) {
  const isHome = pagePath === '';
  const full = isHome ? site.title : `${title} — ${site.name}`;
  const base = site.url ? site.url.replace(/\/$/, '') : '';
  const canonical = base ? `${base}/${pagePath}` : '';
  const active = NAV.find(([k]) => k && pagePath.startsWith(k))?.[0] ?? (isHome ? '' : null);
  const ogImg = base && exists('images/og.jpg') ? `${base}/images/og.jpg` : '';
  const icon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%2328551F'/%3E%3Ctext x='16' y='22' font-family='Georgia,serif' font-size='17' text-anchor='middle' fill='%23FCFBF7'%3ELB%3C/text%3E%3C/svg%3E";
  const navHtml = NAV.map(([k, label]) => `<li><a href="${u(k)}"${k === active ? ' aria-current="page"' : ''}>${esc(label)}</a></li>`).join('');
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="${site.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(desc || site.description)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
${canonical ? `<link rel="canonical" href="${canonical}">` : ''}
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(desc || site.description)}">
<meta property="og:type" content="${ogType}">
<meta property="og:locale" content="fr_FR">
${canonical ? `<meta property="og:url" content="${canonical}">` : ''}
${ogImg ? `<meta property="og:image" content="${ogImg}">` : ''}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#28551F">
<link rel="icon" href="${icon}">
<script>try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}</script>
<link rel="stylesheet" href="${u('css/style.css')}">
${head}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body class="${cls}">
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="masthead">
  <div class="container masthead__top">
    <a class="logo" href="${u()}">${esc(site.name)}</a>
    <div class="masthead__tools">
      <button class="btn-text" type="button" data-theme-toggle>Thème sombre</button>
      <button class="btn-text menu-btn" type="button" aria-expanded="false" aria-controls="nav-principal" data-menu-btn>Menu</button>
    </div>
  </div>
  <nav class="nav" id="nav-principal" aria-label="Navigation principale">
    <ul class="container">${navHtml}</ul>
  </nav>
</header>
<main id="contenu" tabindex="-1">
${body}
</main>
<footer class="footer">
  <div class="container footer__grid">
    <div>
      <p class="footer__name">${esc(site.name)}</p>
      <p class="muted">Étudiante en CPES Sciences des données, arts et cultures<br>Université PSL · lycée Louis-le-Grand</p>
    </div>
    <div>
      <h2 class="footer__h">Contact</h2>
      <ul class="plain">
        <li><a href="mailto:${site.email}">${site.email}</a></li>
        <li><a href="mailto:${site.emailUniversity}">${site.emailUniversity}</a></li>
        <li>${extLink(site.linkedin, 'LinkedIn')}</li>
      </ul>
    </div>
    <div>
      <h2 class="footer__h">Sections</h2>
      <ul class="plain footer__cols">${NAV.slice(1).map(([k, l]) => `<li><a href="${u(k)}">${esc(l)}</a></li>`).join('')}<li><a href="${u('rechercher/')}">Rechercher dans le site</a></li></ul>
    </div>
  </div>
  <div class="container footer__legal"><p class="muted">© ${year} ${esc(site.name)}. Aucun suivi publicitaire, aucun cookie de mesure d'audience.</p></div>
</footer>
<script src="${u('js/site.js')}" defer></script>
</body>
</html>`;
}

function writePage(pagePath, opts, bodyFn) {
  const depth = pagePath ? pagePath.split('/').filter(Boolean).length : 0;
  R = depth ? '../'.repeat(depth) : './';
  const html = layout({ pagePath, ...opts, body: bodyFn() });
  const out = path.join(DIST, pagePath, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

const pageHeader = (crumbs, title, lead) => `
<div class="container page-head">
  ${crumbs ? breadcrumb(crumbs) : ''}
  <h1>${esc(title)}</h1>
  ${lead ? `<p class="lead">${inline(lead)}</p>` : ''}
</div>`;

function breadcrumb(items) {
  return `<nav class="crumbs" aria-label="Fil d'Ariane"><ol>${items
    .map(([label, href], i) => (i === items.length - 1 ? `<li aria-current="page">${esc(label)}</li>` : `<li><a href="${u(href)}">${esc(label)}</a></li>`))
    .join('')}</ol></nav>`;
}
const section = (id, title, inner, cls = '') =>
  `<section class="section ${cls}"${id ? ` id="${id}"` : ''} aria-labelledby="${id || slugify(title)}-t"><div class="container section__grid"><h2 class="section__title" id="${id || slugify(title)}-t">${esc(title)}</h2><div class="section__body">${inner}</div></div></section>`;

/* ───────────── Composants ───────────── */
function projectItem(p, { data = false } = {}) {
  const attrs = data
    ? ` data-cat="${esc(p.category)}" data-dom="${esc(arr(p.domains).join('|'))}" data-met="${esc(arr(p.methods).join('|'))}" data-prod="${esc(p.production || '')}" data-year="${p.year || ''}" data-text="${esc([p.title, p.shortTitle, p.summary, ...arr(p.domains), ...arr(p.methods), p.production, p.category].join(' '))}"`
    : '';
  return `<li class="project"${attrs}>
  <div class="project__meta"><span>${esc(periodOf(p))}</span><span>${esc(p.category)}</span></div>
  <div class="project__body">
    <h3 class="project__title"><a href="${u(projectHref(p))}">${esc(p.title)}</a></h3>
    <p>${esc(p.summary)}</p>
    <p class="project__tags muted">${esc(STATUS[p.status] || STATUS['a-preciser'])}${has(p.domains) ? ' · ' + esc(arr(p.domains).join(', ')) : ''}</p>
  </div>
</li>`;
}

function documentItem(d) {
  const f = d._path;
  const meta = [d.type, d.date].filter(Boolean).map(esc).join(' · ');
  if (!f) {
    if (!site.showPlaceholders) return '';
    return `<li class="doc doc--missing"><p class="doc__type">${meta}</p><h3>${esc(d.title)}</h3>${d.description ? `<p>${esc(d.description)}</p>` : ''}<p class="todo"><span>À ajouter</span>Document à ajouter</p></li>`;
  }
  const isPdf = f.toLowerCase().endsWith('.pdf');
  return `<li class="doc"><p class="doc__type">${meta}</p><h3>${esc(d.title)}</h3>${d.description ? `<p>${esc(d.description)}</p>` : ''}
<p class="doc__actions"><a class="btn btn--small" href="${u(f)}" target="_blank" rel="noopener"${isPdf ? ' data-pdf-view' : ''}>Consulter<span class="sr-only"> : ${esc(d.title)}</span></a> <a class="btn btn--ghost btn--small" href="${u(f)}" download>Télécharger<span class="sr-only"> : ${esc(d.title)}</span></a></p>
<div class="doc__viewer" hidden></div></li>`;
}

/* ───────────── Pages ───────────── */
function homePage() {
  const feat = projects.filter((p) => p.featured).sort((a, b) => (a.featuredOrder || 9) - (b.featuredOrder || 9));
  const hero = `
<section class="container hero" aria-labelledby="h-nom">
  <div class="hero__text">
    <p class="kicker">${esc(site.hero.status)}</p>
    <h1 id="h-nom">${esc(site.name)}</h1>
    ${paras(site.hero.paras)}
    <p class="hero__actions"><a class="btn" href="${u('recherche/')}">Découvrir mes projets</a> <a class="btn btn--ghost" href="${u('formation/')}">Consulter mon parcours</a></p>
  </div>
  <figure class="portrait">${portraitPath
    ? `<img src="${u(portraitPath)}" alt="${esc(site.portrait.alt)}" width="640" height="800" fetchpriority="high">`
    : `<div class="portrait__empty" role="img" aria-label="Emplacement du portrait (à ajouter)"><span>Portrait<br><small>à ajouter dans public/images/portrait.jpg</small></span></div>`}</figure>
</section>`;

  const interests = section('interets', "Ce qui m'intéresse", `<ol class="axes">${site.interests
    .map((a, i) => `<li><span class="axes__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3>${esc(a.title)}</h3><p>${inline(a.text)}</p><ul class="plain inline-links">${a.links.map((l) => `<li><a href="${u(l.href)}">${esc(l.label)}</a></li>`).join('')}</ul></li>`)
    .join('')}</ol>`);

  const featured = section('projets', 'Projets à découvrir', `<ul class="plist">${feat.map((p) => projectItem(p)).join('')}
<li class="project project--future"><div class="project__meta"><span>À venir</span></div><div class="project__body"><h3 class="project__title"><a href="${u(site.future.href)}">${esc(site.future.title)}</a></h3><p>${esc(site.future.text)}</p></div></li></ul>
<p><a class="more" href="${u('recherche/')}">Tous les projets →</a></p>`);

  const tl = section('parcours', 'Parcours en bref', `<ol class="tl">${site.timeline
    .map((t) => `<li><span class="tl__date">${esc(t.date)}</span><div><a href="${u(t.href)}"><strong>${esc(t.label)}</strong></a>${t.text ? `<br><span class="muted">${esc(t.text)}</span>` : ''}</div></li>`)
    .join('')}</ol><p><a class="more" href="${u('formation/')}">Formation complète →</a> <a class="more" href="${u('experiences/')}">Toutes les expériences →</a></p>`);

  let now = '';
  if (site.now.visible) {
    const filled = site.now.items.filter((i) => has(i.text));
    if (filled.length || site.showPlaceholders) {
      const dl = site.now.items.map((i) => `<div><dt>${esc(i.label)}</dt><dd>${has(i.text) ? inline(i.text) : todo('Rubrique facultative : à renseigner ou à laisser vide.')}</dd></div>`).filter((x) => x.includes('<dd>') && !x.includes('<dd></dd>')).join('');
      now = section('en-ce-moment', 'En ce moment', `<dl class="now">${dl}</dl>${site.showPlaceholders ? '<p class="todo"><span>Note</span>Pour masquer cette section : « now.visible » à false dans content/site.json.</p>' : ''}`);
    }
  }

  const explore = section('explorer', 'Explorer', `<ul class="explore">${[
    ['recherche/', 'Recherche & projets', 'Projets académiques, lectures et réflexions'],
    ['formation/', 'Parcours', 'Formation et certifications'],
    ['competences/', 'Compétences', 'Programmation, méthodes, arts, langues'],
    ['arts-culture/', 'Arts & culture', 'Musique, scène, photographie'],
    ['engagements/', 'Engagements', 'Scoutisme, bénévolat, vie associative']
  ].map(([h, t, d]) => `<li><a href="${u(h)}"><span class="explore__t">${t}</span><span class="muted">${d}</span><span class="explore__arrow" aria-hidden="true">→</span></a></li>`).join('')}</ul>
<p class="closing">Pour en savoir plus sur mes travaux, <a href="${u('recherche/')}">consultez les projets</a> ou <a href="${u('contact/')}">écrivez-moi</a>.</p>`);

  return hero + interests + featured + tl + now + explore;
}

function researchPage() {
  const used = CATEGORY_ORDER.filter((c) => projects.some((p) => p.category === c));
  const uniq = (f) => [...new Set(projects.flatMap((p) => arr(p[f])))].sort((a, b) => a.localeCompare(b, 'fr'));
  const years = [...new Set(projects.map((p) => p.year).filter(Boolean))].sort((a, b) => b - a);
  const opt = (a) => a.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
  const sel = (id, label, options) => `<div class="field"><label for="${id}">${label}</label><select id="${id}" data-filter="${id}"><option value="">Tous</option>${options}</select></div>`;
  const prods = [...new Set(projects.map((p) => p.production).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));

  const controls = `<form class="filters js-only" role="search" aria-label="Filtrer les projets" onsubmit="return false">
  <div class="field field--wide"><label for="q">Rechercher dans les projets</label><input id="q" type="search" data-filter="q" placeholder="Mot-clé, domaine, méthode…" autocomplete="off"></div>
  ${sel('cat', 'Catégorie', opt(used))}${sel('dom', 'Domaine', opt(uniq('domains')))}${sel('met', 'Méthode', opt(uniq('methods')))}${sel('prod', 'Type de production', opt(prods))}${sel('year', 'Année', years.map((y) => `<option value="${y}">${y}</option>`).join(''))}
  <div class="field"><label for="sort">Tri</label><select id="sort"><option value="desc">Plus récents d'abord</option><option value="asc">Plus anciens d'abord</option></select></div>
  <div class="field field--btn"><button class="btn btn--ghost btn--small" type="button" data-reset>Réinitialiser</button></div>
</form>
<p class="count js-only" role="status" aria-live="polite" data-count></p>`;

  const list = `<ul class="plist" data-projects>${sortedProjects.map((p) => projectItem(p, { data: true })).join('')}</ul><p class="muted" data-empty hidden>Aucun projet ne correspond à ces critères.</p>`;
  const reads = section('lectures', 'Lectures & réflexions', `${paras(readings.intro[0])}<p><a class="more" href="${u('recherche/lectures/')}">Ouvrir la rubrique${readings.entries.length ? ` (${readings.entries.length})` : ''} →</a></p>`);
  return pageHeader([['Accueil', ''], ['Recherche & projets académiques', '']], 'Recherche & projets académiques',
    "Projets de recherche, travaux universitaires, productions informatiques et contributions éditoriales. Chaque projet distingue ce qui a été réalisé, observé, interprété et ce qui reste à faire.")
    + `<div class="container"><div class="research">${controls}${list}</div></div>${reads}`
    + `<div class="container"><p class="small muted">Vous cherchez autre chose ? <a href="${u('rechercher/')}">Rechercher dans tout le site</a>.</p></div>`;
}

function projectPage(p) {
  const sections = (p.sections || []).filter((s) => has(s.paras) || has(s.list) || (s.todo && site.showPlaceholders));
  const nonTech = sections.filter((s) => !s.technical);
  const tech = sections.filter((s) => s.technical);
  const renderSec = (s) => {
    const content = `${paras(s.paras)}${ul(s.list)}`;
    const missing = s.todo ? todo(s.todo) : '';
    return `<section class="psec" id="${s.id}"><h3>${esc(s.title)}${s.tag ? ` <span class="tag tag--${s.tag}">${TAGS[s.tag]}</span>` : ''}</h3>${content}${missing}</section>`;
  };
  const docs = (p.documents || []).map(documentItem).filter(Boolean);
  const res = (p.resources || []).map((r) =>
    r.url ? `<li><span class="muted">${esc(r.kind)}</span> ${extLink(r.url, r.label)}</li>`
      : site.showPlaceholders ? `<li><span class="muted">${esc(r.kind)}</span> ${esc(r.label)} <span class="todo-inline">lien à ajouter</span></li>` : '').filter(Boolean);
  const refs = (p.references || []).map((r) => `<li>${r.url ? extLink(r.url, r.text) : esc(r.text)}</li>`);
  const related = [];
  for (const g of skills.groups) for (const s of g.items) if (arr(s.projects).includes(p.slug)) related.push({ label: s.name, href: `competences/#${skillId(s.name)}` });
  const collab = arr(p.collaborators);

  const facts = [
    ['Période', periodOf(p)], ['Statut', STATUS[p.status] || STATUS['a-preciser']], ['Catégorie', p.category],
    ['Domaine', arr(p.domains).join(', ')], ['Méthodes', arr(p.methods).join(', ')], ['Production', p.production],
    ['Collaborateurs', collab.join(', ')]
  ].filter(([, v]) => has(v));

  const toc = [
    ...nonTech.map((s) => [s.id, s.title]), ...(tech.length ? [['developpement', 'Développement technique']] : []),
    ...(docs.length ? [['documents', 'Documents']] : []), ...(res.length ? [['ressources', 'Code, données et démonstrations']] : []),
    ...(refs.length ? [['references', 'Références']] : [])
  ];
  const others = sortedProjects.filter((x) => x.slug !== p.slug);
  const shareTitle = encodeURIComponent(p.title);
  const base = site.url ? site.url.replace(/\/$/, '') : '';
  const pageUrl = base ? `${base}/${projectHref(p)}` : '';
  const tagsUsed = [...new Set(sections.map((s) => s.tag).filter(Boolean))];

  return `${pageHeader([['Accueil', ''], ['Recherche & projets académiques', 'recherche/'], [p.title, '']], p.title, null)}
<div class="container project-layout">
  <aside class="project-aside" aria-label="Informations sur le projet">
    <dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    ${toc.length > 2 ? `<nav aria-label="Sommaire du projet"><h2 class="aside-h">Sommaire</h2><ul class="plain">${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></nav>` : ''}
    <div class="share"><h2 class="aside-h">Partager</h2><ul class="plain">
      <li><button class="btn-text" type="button" data-copy-link hidden>Copier le lien</button></li>
      <li><a href="mailto:?subject=${shareTitle}" data-share-mail>Envoyer par e-mail</a></li>
      ${pageUrl ? `<li>${extLink('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(pageUrl), 'Partager sur LinkedIn')}</li>` : ''}
    </ul><p class="small muted" data-copy-status role="status"></p></div>
  </aside>
  <article class="project-main">
    ${p.shortTitle && p.shortTitle !== p.title ? `<p class="lead lead--serif">${esc(p.shortTitle)}</p>` : ''}
    <div class="summary"><h2 class="aside-h">En bref</h2><p>${esc(p.summary)}</p>${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}</div>
    ${tagsUsed.length ? `<p class="small muted legend">Repères : ${tagsUsed.map((t) => `<span class="tag tag--${t}">${TAGS[t]}</span>`).join(' ')} — les éléments observés, interprétés et hypothétiques sont distingués.</p>` : ''}
    ${nonTech.map(renderSec).join('')}
    ${tech.length ? `<details class="tech" id="developpement" open><summary>Développement technique</summary>${tech.map(renderSec).join('')}</details>` : ''}
    ${docs.length ? `<section class="psec" id="documents"><h3>Documents</h3><ul class="docs">${docs.join('')}</ul></section>` : ''}
    ${res.length ? `<section class="psec" id="ressources"><h3>Code, données et démonstrations</h3><ul class="plain">${res.join('')}</ul></section>` : ''}
    ${refs.length ? `<section class="psec" id="references"><h3>Références et liens externes</h3><ul>${refs.join('')}</ul></section>` : ''}
    ${related.length ? `<section class="psec"><h3>Compétences liées</h3><ul class="plain inline-links">${related.map((r) => `<li><a href="${u(r.href)}">${esc(r.label)}</a></li>`).join('')}</ul></section>` : ''}
  </article>
</div>
${others.length ? section('autres-projets', 'Autres projets', `<ul class="plist">${others.map((x) => projectItem(x)).join('')}</ul>`) : ''}`;
}

function readingsPage() {
  const entries = readings.entries.map((e) => `<article class="reading" id="${esc(e.id)}"><p class="muted small">${esc(e.date || '')}</p><h3>${esc(e.ref)}</h3>
<div class="reading__cols"><div><h4>Ce que dit le texte</h4>${paras(e.summary)}${has(e.concepts) ? `<p><strong>Concepts clés</strong></p>${ul(e.concepts)}` : ''}</div>
<div><h4>Ma réflexion</h4>${has(e.questions) ? `<p><strong>Questions soulevées</strong></p>${ul(e.questions)}` : ''}${has(e.limits) ? `<p><strong>Limites ou objections</strong></p>${ul(e.limits)}` : ''}${paras(e.links)}</div></div></article>`).join('');
  return pageHeader([['Accueil', ''], ['Recherche & projets académiques', 'recherche/'], ['Lectures & réflexions', '']], 'Lectures & réflexions', null)
    + `<div class="container prose">${paras(readings.intro)}${entries || '<p class="muted">Aucune note de lecture publiée pour l\'instant.</p>'}</div>`;
}

function fiche(item) {
  const f = item.fiche || {};
  const rows = [];
  const add = (label, val, hint) => rows.push(`<div><dt>${label}</dt><dd>${has(val) ? (Array.isArray(val) ? ul(val) : inline(val)) : todo(hint)}</dd></div>`);
  add('Contexte', f.contexte, 'Décrire le contexte.');
  add('Dates', item.period, 'Préciser les dates.');
  if ('matieres' in f) { add('Matières enseignées', f.matieres, 'Préciser les matières.'); add('Niveaux concernés', f.niveaux, 'Préciser les niveaux.'); add('Responsabilités exercées', f.responsabilites, 'Préciser les responsabilités.'); }
  else add('Missions', f.missions, 'Détailler les missions réellement exercées.');
  add('Compétences développées', f.competences, 'Indiquer les compétences développées.');
  if ('liens' in f) add('Liens et documents', f.liens, 'Ajouter si pertinent.');
  const filled = rows.filter((r) => !r.includes('<dd></dd>'));
  return `<dl class="fiche">${filled.join('')}</dl>`;
}

function experiencesPage() {
  const itemHtml = (it) => {
    const linked = skills.groups.flatMap((g) => g.items).filter((s) => arr(s.experiences).includes(it.id));
    return `<article class="exp" id="${it.id}"><header><h4>${esc(it.title)}</h4><p class="muted">${[it.kind, it.period].filter(Boolean).map(esc).join(' · ') || ''}</p></header>${it.summary ? `<p>${esc(it.summary)}</p>` : ''}<details class="fiche-d"><summary>Fiche détaillée</summary>${fiche(it)}${linked.length ? `<p class="small">Compétences associées : ${[...new Set(linked.map((s) => s.name))].map((n) => `<a href="${u('competences/#' + skillId(n))}">${esc(n)}</a>`).join(', ')}</p>` : ''}</details></article>`;
  };
  const cats = experiences.categories.map((c) => section(c.id, c.title, c.groups.map((g) => `<div class="egroup" id="${g.id}"><h3>${esc(g.title)}</h3>${g.intro ? `<p class="muted">${esc(g.intro)}</p>` : ''}${g.items.map(itemHtml).join('')}</div>`).join(''))).join('');
  const proj = section('projets-liens', 'Projets', `<p>Les projets de recherche et de programmation sont présentés sur leur propre page.</p><ul class="plist">${sortedProjects.map((p) => projectItem(p)).join('')}</ul>`);
  return pageHeader([['Accueil', ''], ['Expériences', '']], 'Expériences', 'Expériences professionnelles, responsabilités associatives et projets, distinguées les unes des autres.') + cats + proj;
}

function formationPage() {
  const items = formation.items.map((f) => `<article class="edu" id="${f.id}"><p class="edu__date">${esc(f.period)}</p><div><h3>${esc(f.title)}</h3><p class="muted">${esc(f.org)}</p>${f.intro ? `<p>${esc(f.intro)}</p>` : ''}${f.listTitle ? `<h4>${esc(f.listTitle)}</h4>` : ''}${ul(f.list)}</div></article>`).join('');
  const certs = formation.certifications.map((c) => {
    const detail = [c.date ? `<div><dt>Date</dt><dd>${esc(c.date)}</dd></div>` : '', c.description ? `<div><dt>Description</dt><dd>${esc(c.description)}</dd></div>` : '', c.verifyUrl ? `<div><dt>Vérification</dt><dd>${extLink(c.verifyUrl, 'Lien de vérification')}</dd></div>` : ''].join('');
    const hint = site.showPlaceholders && !detail ? todo('Ajouter la date, une description et, si disponible, un lien de vérification (aucun lien fictif).') : '';
    return `<li id="${c.id}"><details><summary><strong>${esc(c.title)}</strong> <span class="muted">· ${esc(c.org)}</span></summary>${detail ? `<dl class="fiche">${detail}</dl>` : ''}${hint}</details></li>`;
  }).join('');
  return pageHeader([['Accueil', ''], ['Formation', '']], 'Formation', 'Parcours académique, du baccalauréat au CPES, et formations complémentaires.')
    + section('parcours-academique', 'Parcours académique', items)
    + section('certifications', 'Formations complémentaires et certifications', `<ul class="certs">${certs}</ul>`);
}

function skillsPage() {
  const groups = skills.groups.map((g) => section(g.id, g.title, `${g.intro && site.showPlaceholders ? `<p class="small muted">${esc(g.intro)}</p>` : ''}<ul class="skills">${g.items.map((s) => {
    const links = [...arr(s.projects).map((x) => projectBySlug[x] && `<a href="${u(projectHref(projectBySlug[x]))}">${esc(projectBySlug[x].title)}</a>`), ...arr(s.experiences).map((x) => expById[x] && `<a href="${u('experiences/#' + x)}">${esc(expById[x].title)}</a>`)].filter(Boolean);
    return `<li id="${skillId(s.name)}"><span class="skills__name">${esc(s.name)}</span>${s.level ? `<span class="skills__level">${esc(s.level)}</span>` : ''}${s.context ? `<span class="muted"> ${esc(s.context)}</span>` : ''}${links.length ? `<span class="skills__links small">Illustré par : ${links.join(', ')}</span>` : ''}</li>`;
  }).join('')}</ul>`)).join('');
  const certs = section('certifications-competences', 'Certifications', `<ul class="plain">${formation.certifications.map((c) => `<li><a href="${u('formation/#' + c.id)}">${esc(c.title)}</a> <span class="muted">· ${esc(c.org)}</span></li>`).join('')}</ul><p><a class="more" href="${u('formation/#certifications')}">Consulter le détail →</a></p>`);
  return pageHeader([['Accueil', ''], ['Compétences', '']], 'Compétences', "Les compétences sont décrites par catégories, sans barres de progression ni pourcentages : un niveau n'est indiqué que lorsqu'il est attesté.") + groups + certs;
}

function artsPage() {
  const secs = arts.sections.map((s) => {
    const gallery = arr(s.gallery).filter((g) => (g.file && exists(`images/arts/${g.file}`)) || (warnings.push(`Image introuvable : public/images/arts/${g.file}`), false));
    const g = gallery.length ? `<div class="gallery">${gallery.map((x) => `<figure><img src="${u('images/arts/' + x.file)}" alt="${esc(x.alt || '')}" loading="lazy"><figcaption>${esc(x.caption || '')}${x.date ? ` <span class="muted">${esc(x.date)}</span>` : ''}${x.category ? ` <span class="muted">· ${esc(x.category)}</span>` : ''}</figcaption></figure>`).join('')}</div>` : '';
    const content = `${paras(s.paras)}${ul(s.list)}${g}`;
    const hasContent = has(s.paras) || has(s.list) || gallery.length;
    const missing = s.todo && !gallery.length ? todo(s.todo) : '';
    if (!hasContent && !missing) return '';
    return section(s.id, s.title, content + missing, 'section--arts');
  }).join('');
  return `<div class="container page-head">${breadcrumb([['Accueil', ''], ['Arts & culture', '']])}<h1>Arts <em>&amp;</em> culture</h1><p class="lead lead--serif">${esc(arts.intro)}</p></div>${secs}`;
}

function engagementsPage() {
  const blocks = engagements.blocks.map((b) => {
    const meta = [b.org, b.period].filter(Boolean).map(esc).join(' · ');
    const list = b.list ? `<ul class="dated">${b.list.map((i) => `<li>${i.date ? `<span class="tl__date">${esc(i.date)}</span>` : '<span class="tl__date"></span>'}<span>${esc(i.text)}</span></li>`).join('')}</ul>` : '';
    return section(b.id, b.title, `${meta ? `<p class="muted">${meta}</p>` : ''}${paras(b.paras)}${list}${b.todo ? todo(b.todo) : ''}`);
  }).join('');
  return pageHeader([['Accueil', ''], ['Engagements', '']], 'Engagements', engagements.intro) + blocks
    + section('competences-engagements', engagements.skills.title, paras(engagements.skills.paras));
}

function aboutPage() {
  return pageHeader([['Accueil', ''], ['À propos', '']], 'À propos', null) + `<div class="container prose prose--about">${paras(site.about.paras)}</div>
<div class="container"><p class="closing"><a href="${u('recherche/')}">Découvrir mes projets</a> · <a href="${u('contact/')}">Me contacter</a></p></div>`;
}

function contactPage() {
  const phone = site.phone.public && site.phone.value ? `<li><span class="muted">Téléphone</span> <a href="tel:${esc(site.phone.value.replace(/\s/g, ''))}">${esc(site.phone.value)}</a></li>` : '';
  return pageHeader([['Accueil', ''], ['Contact', '']], 'Contact', null)
    + `<div class="container prose">${paras(site.contact.paras)}
<ul class="contact plain"><li><span class="muted">E-mail</span> <a href="mailto:${site.email}">${site.email}</a></li><li><span class="muted">E-mail universitaire</span> <a href="mailto:${site.emailUniversity}">${site.emailUniversity}</a></li><li><span class="muted">LinkedIn</span> ${extLink(site.linkedin, 'leonore-b-a24623280')}</li>${phone}</ul>
<p class="small muted">Aucun formulaire : un lien e-mail évite de simuler un envoi et de collecter des données inutiles.</p></div>`;
}

function searchPage() {
  return pageHeader([['Accueil', ''], ['Rechercher', '']], 'Rechercher dans le site', null)
    + `<div class="container prose"><form role="search" onsubmit="return false"><div class="field field--wide"><label for="site-q">Rechercher un projet, une expérience, une compétence…</label><input id="site-q" type="search" autocomplete="off" data-site-search data-index="${u('search-index.json')}"></div></form><p class="count" role="status" aria-live="polite" data-search-count></p><ul class="results plain" data-results></ul><noscript><p>La recherche nécessite JavaScript. Vous pouvez parcourir les sections depuis le menu.</p></noscript></div>`;
}

/* ───────────── Index de recherche ───────────── */
function buildIndex() {
  const add = (type, title, href, text) => index.push({ type, title, href, text: String(text || '').replace(/\s+/g, ' ').trim() });
  for (const p of projects) add('Projet', p.title, projectHref(p), [p.shortTitle, p.summary, p.category, ...arr(p.domains), ...arr(p.methods), p.production, ...(p.sections || []).flatMap((s) => [s.title, ...arr(s.paras), ...arr(s.list)])].join(' '));
  for (const e of allExpItems) add('Expérience', e.title, `experiences/#${e.id}`, [e.kind, e.period, e.summary, ...arr(e.fiche?.missions), ...arr(e.fiche?.competences)].join(' '));
  for (const f of formation.items) add('Formation', f.title, `formation/#${f.id}`, [f.org, f.period, f.intro, ...arr(f.list)].join(' '));
  for (const c of formation.certifications) add('Certification', c.title, `formation/#${c.id}`, [c.org, c.description].join(' '));
  for (const g of skills.groups) for (const s of g.items) add('Compétence', s.name, `competences/#${skillId(s.name)}`, [g.title, s.level, s.context].join(' '));
  for (const s of arts.sections) add('Arts & culture', s.title, `arts-culture/#${s.id}`, [...arr(s.paras), ...arr(s.list)].join(' '));
  for (const b of engagements.blocks) add('Engagement', b.title, `engagements/#${b.id}`, [b.org, b.period, ...arr(b.paras), ...arr(b.list?.map((i) => i.text))].join(' '));
  for (const r of readings.entries) add('Lecture', r.ref, `recherche/lectures/#${r.id}`, [r.summary, ...arr(r.concepts)].join(' '));
  add('Page', 'À propos', 'a-propos/', site.about.paras.join(' '));
}

/* ───────────── Génération ───────────── */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), DIST, { recursive: true });

const person = { '@context': 'https://schema.org', '@type': 'Person', name: site.name, description: site.description, sameAs: [site.linkedin], ...(site.url ? { url: site.url } : {}) };

writePage('', { title: site.title, desc: site.description, jsonld: person }, homePage);
writePage('recherche/', { title: 'Recherche & projets académiques', desc: 'Projets de recherche, travaux universitaires, projets informatiques et contributions éditoriales de Léonore Batut.' }, researchPage);
for (const p of projects) {
  writePage(projectHref(p), {
    title: p.title, desc: p.summary, ogType: 'article',
    jsonld: { '@context': 'https://schema.org', '@type': 'CreativeWork', name: p.title, description: p.summary, author: { '@type': 'Person', name: site.name }, ...(p.year ? { dateCreated: String(p.year) } : {}), ...(site.url ? { url: `${site.url.replace(/\/$/, '')}/${projectHref(p)}` } : {}) }
  }, () => projectPage(p));
}
writePage('recherche/lectures/', { title: 'Lectures & réflexions', desc: 'Notes de lecture et réflexions personnelles, distinguées des arguments des auteurs.' }, readingsPage);
writePage('experiences/', { title: 'Expériences', desc: 'Expériences professionnelles, responsabilités associatives et projets de Léonore Batut.' }, experiencesPage);
writePage('formation/', { title: 'Formation', desc: 'CPES Sciences des données, arts et cultures (PSL – Louis-le-Grand), baccalauréat, certifications.' }, formationPage);
writePage('competences/', { title: 'Compétences', desc: 'Programmation et données, méthodes scientifiques, arts et expression, langues.' }, skillsPage);
writePage('arts-culture/', { title: 'Arts & culture', desc: 'Musique, scène, photographie, culture et histoire de l\'art : portfolio artistique de Léonore Batut.', cls: 'theme-arts' }, artsPage);
writePage('engagements/', { title: 'Engagements', desc: 'Scoutisme, soutien scolaire bénévole et engagements citoyens de Léonore Batut.' }, engagementsPage);
writePage('a-propos/', { title: 'À propos', desc: 'Parcours pluridisciplinaire, intérêt pour les sciences cognitives et les approches quantitatives.' }, aboutPage);
writePage('contact/', { title: 'Contact', desc: 'Contacter Léonore Batut pour un échange scientifique, un projet interdisciplinaire ou une collaboration étudiante.' }, contactPage);
writePage('rechercher/', { title: 'Rechercher dans le site', desc: 'Recherche dans les projets, expériences, compétences et engagements.', noindex: true }, searchPage);

// Page 404 (chemins absolus)
{
  R = '/';
  fs.writeFileSync(path.join(DIST, '404.html'), layout({ pagePath: '404', title: 'Page introuvable', desc: 'Page introuvable.', noindex: true, body: `<div class="container page-head"><h1>Page introuvable</h1><p class="lead">Cette page n'existe pas ou a été déplacée. <a href="/">Retour à l'accueil</a> ou <a href="/recherche/">aux projets</a>.</p></div>` }));
}

buildIndex();
fs.writeFileSync(path.join(DIST, 'search-index.json'), JSON.stringify(index));

const urls = ['', 'recherche/', ...projects.map(projectHref), 'recherche/lectures/', 'experiences/', 'formation/', 'competences/', 'arts-culture/', 'engagements/', 'a-propos/', 'contact/'];
const base = site.url ? site.url.replace(/\/$/, '') : '';
if (base) {
  fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((x) => `  <url><loc>${base}/${x}</loc></url>`).join('\n')}\n</urlset>\n`);
}
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n${base ? `Sitemap: ${base}/sitemap.xml\n` : ''}`);

/* ───────────── Contrôle des liens internes ───────────── */
const broken = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html') && !f.endsWith('404.html'));
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  for (const m of html.matchAll(/(?:href|src)="([^"#][^"]*)"/g)) {
    const link = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(link)) continue;
    const [pathPart, hash] = link.split('#');
    let target = path.resolve(path.dirname(f), pathPart);
    if (!fs.existsSync(target)) { broken.push(`${path.relative(DIST, f)} → ${link}`); continue; }
    if (fs.statSync(target).isDirectory()) target = path.join(target, 'index.html');
    if (hash && target.endsWith('.html') && target !== f) {
      const th = fs.readFileSync(target, 'utf8');
      if (!new RegExp(`\\sid="${hash}"`).test(th)) broken.push(`${path.relative(DIST, f)} → ${link} (ancre absente)`);
    }
  }
  for (const m of html.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) broken.push(`${path.relative(DIST, f)} → #${m[1]} (ancre absente)`);
}

console.log(`✓ Site généré dans dist/ (${htmlFiles.length + 1} pages, ${index.length} entrées de recherche)`);
console.log(`  Emplacements « à compléter » : ${todoCount}${site.showPlaceholders ? ' (affichés — voir showPlaceholders dans content/site.json)' : ' (masqués)'}`);
if (!site.url) console.log('  ℹ  « url » vide dans content/site.json : sitemap et URL canoniques non générés.');
warnings.forEach((w) => console.warn('  ⚠ ' + w));
if (broken.length) { console.error('✗ Liens internes cassés :'); broken.forEach((b) => console.error('  - ' + b)); process.exitCode = 1; }
else console.log('✓ Aucun lien interne cassé.');
