/*
 * SigmaMarket · la vitrine gardée dans le téléphone du client (D85).
 *
 * Le client qui a déjà ouvert la vitrine peut la rouvrir sans réseau : le catalogue est dans
 * l'adresse, la page garde alors le parcours d'aujourd'hui (le code QR et WhatsApp, rien ne passe
 * par le serveur). Le réseau d'abord : en ligne, c'est toujours la page publiée qui s'ouvre ; le
 * téléphone ensuite, seulement si le réseau ne répond pas en 4 secondes ou pas du tout.
 *
 * Seulement les fichiers de la vitrine, et seulement pour les lire (GET) : ni la page du live
 * (D53, qui ne change pas), ni les appels au serveur, ni les photos. Enregistré par index.html sur
 * une page en https. ES5, sans dépendance.
 */
(function (moi) {
  'use strict';

  // La version des fichiers de la page (le « ?v= » de ses scripts dans index.html) : le cache la suit.
  var VERSION = '15';
  var CACHE = 'sigmamarket-vitrine-' + VERSION;
  var PAGES = ['index.html', 'donnees.html'];
  var SCRIPTS = ['reglages.js', 'format.js', 'numero.js', 'reseau.js'];
  // Ce que l'installation garde : les pages, et les scripts à la version que la page demande.
  var FICHIERS = PAGES.concat(SCRIPTS.map(function (f) { return f + '?v=' + VERSION; }));
  var ATTENTE_MS = 4000;

  function base() {
    return moi.registration && moi.registration.scope ? String(moi.registration.scope) : '';
  }

  /**
   * La clé d'une requête dans le cache ; null pour tout le reste. Une page : son adresse, sans « ? »
   * ni « # » (le catalogue de l'adresse n'y est pas gardé). Un script : son adresse AVEC sa version
   * (« format.js?v=16 ») : un script demandé dans une version n'est jamais rendu dans une autre (après
   * une nouvelle publication, sur un réseau lent, la page nouvelle recevait le script gardé d'avant).
   */
  function cleDe(url) {
    var b = base();
    if (!b || String(url).indexOf(b) !== 0) return null;
    var reste = String(url).slice(b.length).split('#')[0];
    var i = reste.indexOf('?');
    var chemin = i < 0 ? reste : reste.slice(0, i);
    if (chemin === '') chemin = 'index.html';
    if (PAGES.indexOf(chemin) >= 0) return b + chemin;
    if (SCRIPTS.indexOf(chemin) < 0) return null;
    var v = i < 0 ? null : /(?:^|&)v=([0-9]{1,6})(?:&|$)/.exec(reste.slice(i + 1));
    return b + chemin + (v ? '?v=' + v[1] : '');
  }

  function duTelephone(cle) {
    return moi.caches.open(CACHE).then(function (c) { return c.match(cle); });
  }

  /** Le réseau d'abord ; la réponse gardée ensuite (sans réseau, ou 4 secondes sans réponse). */
  function reseauPuisTelephone(requete, cle) {
    return new Promise(function (resoudre, rejeter) {
      var fini = false;
      function finir(r) {
        if (fini) return;
        fini = true;
        resoudre(r);
      }
      var minuteur = setTimeout(function () {
        duTelephone(cle).then(function (r) { if (r) finir(r); }, function () {});
      }, ATTENTE_MS);
      moi.fetch(requete).then(function (r) {
        clearTimeout(minuteur);
        if (r && r.ok) {
          var copie = r.clone();
          moi.caches.open(CACHE).then(function (c) { return c.put(cle, copie); }).then(function () {}, function () {});
        }
        finir(r);
      }, function (erreur) {
        clearTimeout(minuteur);
        duTelephone(cle).then(function (r) {
          if (r) finir(r);
          else if (!fini) { fini = true; rejeter(erreur); }
        }, function () {
          if (!fini) { fini = true; rejeter(erreur); }
        });
      });
    });
  }

  moi.addEventListener('install', function (e) {
    e.waitUntil(moi.caches.open(CACHE).then(function (c) {
      return c.addAll(FICHIERS.map(function (f) { return base() + f; }));
    }).then(function () {}, function () {}).then(function () { return moi.skipWaiting(); }));
  });

  moi.addEventListener('activate', function (e) {
    e.waitUntil(moi.caches.keys().then(function (cles) {
      return Promise.all(cles.filter(function (k) { return k.indexOf('sigmamarket-vitrine-') === 0 && k !== CACHE; }).map(function (k) {
        return moi.caches.delete(k);
      }));
    }).then(function () { return moi.clients.claim(); }));
  });

  moi.addEventListener('fetch', function (e) {
    var requete = e.request;
    if (requete.method !== 'GET') return;
    var cle = cleDe(requete.url);
    if (cle === null) return;
    e.respondWith(reseauPuisTelephone(requete, cle));
  });

  moi.VitrineGardee = { VERSION: VERSION, CACHE: CACHE, FICHIERS: FICHIERS, ATTENTE_MS: ATTENTE_MS, cleDe: cleDe };
})(self);
