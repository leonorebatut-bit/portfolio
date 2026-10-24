# Portfolio académique — Léonore Batut

Site statique multipage, sans dépendance (Node ≥ 18 uniquement). Le contenu (dossier `content/`) est séparé de la présentation (`build.mjs`, `public/css`, `public/js`).

## Lancer en local

```bash
npm start        # construit dist/ puis sert http://localhost:4173
npm run dev      # idem, avec reconstruction automatique à chaque modification
npm run build    # construit seulement dist/
```

Ouvrez le site via le serveur local (pas en double-cliquant sur un fichier HTML).

## Modifier les contenus

| Fichier | Contenu |
|---|---|
| `content/site.json` | identité, texte d'accueil, centres d'intérêt, frise, section « En ce moment », À propos, contact, **url**, **showPlaceholders** |
| `content/projects.json` | projets (une entrée = une page à URL stable `/recherche/projets/<slug>/`) |
| `content/experiences.json` | expériences et responsabilités |
| `content/formation.json` | cursus et certifications |
| `content/skills.json` | compétences (liens vers projets/expériences via `projects` / `experiences`) |
| `content/arts.json` | page Arts & culture (galerie, réalisations…) |
| `content/engagements.json` | engagements |
| `content/readings.json` | Lectures & réflexions |

**Ajouter un projet** : copier une entrée de `projects.json`, changer `slug`, `title`, `category`, etc. Seules les rubriques renseignées s'affichent. Un champ `todo` indique un emplacement à compléter ; il n'est jamais transformé en contenu inventé. Chaque section peut porter un `tag` (`realise`, `observe`, `interprete`, `hypothese`, `encours`) pour distinguer ce qui a été fait, observé, interprété ou reste hypothétique. Statuts disponibles : `en-cours`, `termine`, `publie`, `soumis`, `preprint`, `manuscrit`, `rapport-etudiant`, `projet-personnel`, `projet-collectif`, `contribution`, `a-preciser`.

**Ajouter un document (PDF, présentation, code…)** : déposez le fichier dans `public/documents/` en le nommant comme l'`id` du document dans le projet (ex. `perception-du-temps-rapport.pdf`), puis relancez le build. Il apparaît automatiquement avec « Consulter » (lecteur PDF intégré sur ordinateur, nouvel onglet sur mobile) et « Télécharger ». Tant que le fichier n'existe pas, la mention « Document à ajouter » s'affiche ; aucun faux document n'est créé.

**Portrait** : déposez `public/images/portrait.jpg` (ou .png/.webp). **Photos** : `public/images/arts/`, puis déclarez-les dans `arts.json` (`file`, `alt`, `caption`, `date`, `category`). Pensez à compresser les images.

**Masquer les emplacements « À compléter »** avant publication : `"showPlaceholders": false` dans `content/site.json`. Les rubriques vides disparaissent alors. Le build indique combien d'emplacements restent à remplir.

**Numéro de téléphone** : `phone.value` + `"public": true` (jamais affiché par défaut).

## Déployer

1. Renseignez `"url"` dans `content/site.json` (ex. `https://leonorebatut.fr`) : active URL canoniques, Open Graph, `sitemap.xml`.
2. Mettez le dossier dans un dépôt Git (GitHub).
3. **Netlify** : « Add new site → Import from Git ». Build : `node build.mjs`, publication : `dist` (déjà dans `netlify.toml`).
   **Vercel** : « Add New Project », mêmes paramètres (`vercel.json` fourni).
4. Ou glissez-déposez le dossier `dist/` sur Netlify Drop.

Limites : aucun déploiement n'a été effectué depuis cet environnement. Pas de formulaire de contact (liens e-mail, pour ne pas simuler un envoi). Polices : piles système (aucune requête externe) ; pour des polices dédiées, auto-hébergez-les et modifiez `--serif`/`--sans` dans `public/css/style.css`.

## Contrôles intégrés

Le build vérifie tous les liens internes et ancres, et signale les documents ou images déclarés mais absents.
