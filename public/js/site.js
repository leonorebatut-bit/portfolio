/* Scripts légers, sans dépendance. Le site reste lisible sans JavaScript. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var norm = function (s) { return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };

  /* Thème clair / sombre */
  var tbtn = d.querySelector('[data-theme-toggle]');
  if (tbtn) {
    var cur = function () { return root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); };
    var sync = function () { tbtn.textContent = cur() === 'dark' ? 'Thème clair' : 'Thème sombre'; };
    tbtn.addEventListener('click', function () {
      var n = cur() === 'dark' ? 'light' : 'dark';
      root.dataset.theme = n;
      try { localStorage.setItem('theme', n); } catch (e) {}
      sync();
    });
    sync();
  }

  /* Menu mobile */
  var mb = d.querySelector('[data-menu-btn]'), nav = d.getElementById('nav-principal');
  if (mb && nav) {
    mb.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      mb.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* Copier le lien / partage par e-mail */
  var copy = d.querySelector('[data-copy-link]');
  if (copy) {
    copy.hidden = false;
    var st = d.querySelector('[data-copy-status]');
    copy.addEventListener('click', function () {
      var done = function (m) { if (st) st.textContent = m; };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { done('Lien copié.'); }, function () { done('Copie impossible : copiez l\'adresse depuis le navigateur.'); });
      else done('Copiez l\'adresse depuis la barre du navigateur.');
    });
  }
  d.querySelectorAll('[data-share-mail]').forEach(function (a) {
    a.href = a.getAttribute('href') + '&body=' + encodeURIComponent(location.href);
  });

  /* Lecteur PDF intégré (ordinateur) ; sur mobile, ouverture dans un nouvel onglet */
  d.querySelectorAll('[data-pdf-view]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!matchMedia('(min-width: 800px)').matches) return;
      e.preventDefault();
      var box = a.closest('.doc').querySelector('.doc__viewer');
      if (!box.hidden) { box.hidden = true; box.textContent = ''; return; }
      var f = d.createElement('iframe');
      f.src = a.href; f.title = 'Lecteur PDF';
      box.appendChild(f); box.hidden = false;
    });
  });

  /* Filtres et recherche des projets */
  var list = d.querySelector('[data-projects]');
  if (list) {
    var items = Array.prototype.slice.call(list.children);
    var ctl = {};
    d.querySelectorAll('[data-filter]').forEach(function (el) { ctl[el.dataset.filter] = el; });
    var sortSel = d.getElementById('sort'), count = d.querySelector('[data-count]'), empty = d.querySelector('[data-empty]');
    var apply = function () {
      var terms = norm(ctl.q.value).split(/\s+/).filter(Boolean), n = 0;
      var cat = ctl.cat.value, dom = ctl.dom.value, met = ctl.met.value, prod = ctl.prod.value, yr = ctl.year.value;
      items.forEach(function (li) {
        var t = norm(li.dataset.text);
        var ok = terms.every(function (x) { return t.indexOf(x) > -1; }) &&
          (!cat || li.dataset.cat === cat) && (!dom || li.dataset.dom.split('|').indexOf(dom) > -1) &&
          (!met || li.dataset.met.split('|').indexOf(met) > -1) && (!prod || li.dataset.prod === prod) && (!yr || li.dataset.year === yr);
        li.hidden = !ok; if (ok) n++;
      });
      count.textContent = n + (n > 1 ? ' projets' : ' projet');
      empty.hidden = n > 0;
    };
    var sortNow = function () {
      var dir = sortSel.value === 'asc' ? 1 : -1;
      items.sort(function (a, b) { return ((+a.dataset.year || 0) - (+b.dataset.year || 0)) * dir; });
      items.forEach(function (li) { list.appendChild(li); });
    };
    Object.keys(ctl).forEach(function (k) { ctl[k].addEventListener('input', apply); });
    sortSel.addEventListener('change', sortNow);
    d.querySelector('[data-reset]').addEventListener('click', function () {
      Object.keys(ctl).forEach(function (k) { ctl[k].value = ''; });
      sortSel.value = 'desc'; sortNow(); apply();
    });
    apply();
  }

  /* Recherche dans tout le site */
  var sq = d.querySelector('[data-site-search]');
  if (sq) {
    var data = null, out = d.querySelector('[data-results]'), cnt = d.querySelector('[data-search-count]');
    var render = function () {
      var terms = norm(sq.value).split(/\s+/).filter(Boolean);
      out.textContent = '';
      if (!terms.length) { cnt.textContent = ''; return; }
      var res = data.map(function (it) {
        var ti = norm(it.title), tx = norm(it.text), s = 0;
        for (var i = 0; i < terms.length; i++) {
          var inT = ti.indexOf(terms[i]) > -1, inX = tx.indexOf(terms[i]) > -1;
          if (!inT && !inX) return null;
          s += (inT ? 3 : 0) + (inX ? 1 : 0);
        }
        return { it: it, s: s };
      }).filter(Boolean).sort(function (a, b) { return b.s - a.s; }).slice(0, 30);
      cnt.textContent = res.length ? res.length + ' résultat' + (res.length > 1 ? 's' : '') : 'Aucun résultat.';
      res.forEach(function (r) {
        var li = d.createElement('li'), t = d.createElement('span'), a = d.createElement('a'), p = d.createElement('p');
        t.className = 'type'; t.textContent = r.it.type;
        a.href = sq.dataset.index.replace('search-index.json', '') + r.it.href; a.textContent = r.it.title;
        p.className = 'muted small'; p.textContent = r.it.text.slice(0, 180) + (r.it.text.length > 180 ? '…' : '');
        li.appendChild(t); li.appendChild(a); li.appendChild(p); out.appendChild(li);
      });
    };
    fetch(sq.dataset.index).then(function (r) { return r.json(); }).then(function (j) { data = j; sq.addEventListener('input', render); render(); })
      .catch(function () { cnt.textContent = 'La recherche est indisponible pour le moment.'; });
  }
})();
