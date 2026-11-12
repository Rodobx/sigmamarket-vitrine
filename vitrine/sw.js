/*
 * SigmaMarket · la vitrine gardée dans le téléphone du client (D85).
 *
 * Le client qui a déjà ouvert la vitrine peut la rouvrir sans réseau : le catalogue est dans
 * l'adresse, la page garde alors le parcours d'aujourd'hui (le code QR et WhatsApp, rien ne passe
 * par le serveur). Le réseau d'abord : en ligne, c'est toujours la page publiée qui s'ouvre ; le
 * téléphone ensuite, seulement si le réseau ne répond pas en 4 secondes ou pas du tout.
 *
 * Seulement les fichiers de la vitrine, et seulement pour les lire (GET) : ni la page du live
 * (D53, qui ne change pas), ni les appels au serveur. Enregistré par index.html sur une page en
 * https. ES5, sans dépendance.
 *
 * Les photos des articles vus (D95) : sans réseau, « Ton panier » et la vitrine ne montraient plus
 * que des cadres vides. Elles se gardent dans un cache à part, 60 photos et 6 Mo au plus (les plus
 * anciennes sortent), qui survit aux nouvelles versions de la page. Elles viennent d'une autre
 * origine (le serveur des photos) : le travailleur les redemande en `cors` et ne garde qu'une
 * réponse lisible (`cors` ou `basic`, `ok`), jamais une réponse opaque (Chrome compte chacune pour
 * plusieurs Mo). Si le serveur refuse le `cors`, la photo s'affiche comme avant, sans être gardée.
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
  // Les photos des articles vus : un cache à part, qui ne suit pas la version de la page.
  var PHOTOS = 'sigmamarket-photos-1';
  var PHOTOS_MAX = 60;
  var PHOTOS_OCTETS_MAX = 6 * 1024 * 1024;
  // Le chemin des photos de la vitrine sur le serveur (format.js, reseau.js : « /storage/v1/object/public/vitrine/… »).
  var CHEMIN_PHOTO = /^https?:\/\/[^\/?#]+\/storage\/v1\/object\/public\/vitrine\/[A-Za-z0-9_.\/-]+\.(?:jpg|jpeg|png|webp)$/;

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

  /** Une photo d'article de la vitrine (son adresse sans « ? » ni « # ») ; null pour tout le reste. */
  function clePhoto(url) {
    var u = String(url);
    if (u.indexOf('..') >= 0 || !CHEMIN_PHOTO.test(u)) return null;
    return u;
  }

  /** Une réponse qu'on peut garder : lisible (jamais opaque) et bonne. */
  function gardable(r) {
    return !!r && r.ok === true && (r.type === 'cors' || r.type === 'basic');
  }

  // Les photos gardées l'une après l'autre : deux rangements en même temps se marcheraient dessus.
  var filePhotos = Promise.resolve();

  /**
   * Garde la photo, puis fait sortir les plus anciennes tant qu'il y en a plus de 60 ou plus de
   * 6 Mo. Le poids est noté dans la réponse gardée (« X-Octets ») : on ne relit pas les photos.
   */
  function garderPhoto(cle, reponse) {
    filePhotos = filePhotos.then(function () {
      return reponse.blob().then(function (corps) {
        var type = (reponse.headers && reponse.headers.get && reponse.headers.get('Content-Type')) || 'image/jpeg';
        var gardee = new moi.Response(corps, { status: 200, headers: { 'Content-Type': type, 'X-Octets': String(corps.size) } });
        return moi.caches.open(PHOTOS).then(function (c) {
          return c.delete(cle).then(function () { return c.put(cle, gardee); }).then(function () { return ranger(c); });
        });
      });
    }).then(function () {}, function () {});
    return filePhotos;
  }

  /** Les plus anciennes sortent (l'ordre du cache est celui des ajouts). */
  function ranger(c) {
    return c.keys().then(function (requetes) {
      return Promise.all(requetes.map(function (q) { return c.match(q); })).then(function (reponses) {
        var octets = reponses.map(function (r) { return r ? parseInt(r.headers.get('X-Octets') || '0', 10) || 0 : 0; });
        var total = octets.reduce(function (s, n) { return s + n; }, 0);
        var sorties = [];
        for (var i = 0; i < requetes.length && (requetes.length - sorties.length > PHOTOS_MAX || total > PHOTOS_OCTETS_MAX); i++) {
          sorties.push(c.delete(requetes[i]));
          total -= octets[i];
        }
        return Promise.all(sorties);
      });
    });
  }

  function photoGardee(cle) {
    return moi.caches.open(PHOTOS).then(function (c) { return c.match(cle); }, function () { return undefined; });
  }

  /**
   * Une photo : le réseau d'abord, en `cors` (gardée si elle est lisible) ; sans réseau (ou 4
   * secondes sans réponse), la photo gardée ; si le serveur refuse le `cors`, la demande de la page
   * telle quelle (affichée, jamais gardée).
   */
  function photo(requete, cle) {
    return new Promise(function (resoudre, rejeter) {
      var fini = false;
      function finir(r) {
        if (fini) return;
        fini = true;
        resoudre(r);
      }
      var minuteur = setTimeout(function () {
        photoGardee(cle).then(function (r) { if (r) finir(r); }, function () {});
      }, ATTENTE_MS);
      moi.fetch(cle, { mode: 'cors', credentials: 'omit' }).then(function (r) {
        clearTimeout(minuteur);
        if (gardable(r)) garderPhoto(cle, r.clone());
        finir(r);
      }, function () {
        clearTimeout(minuteur);
        photoGardee(cle).then(function (r) {
          if (r) { finir(r); return; }
          // Pas gardée : la demande de la page elle-même (le serveur sans `cors`, ou vraiment pas de réseau).
          moi.fetch(requete).then(finir, function (erreur) {
            if (!fini) { fini = true; rejeter(erreur); }
          });
        }, function (erreur) {
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
    if (cle !== null) {
      e.respondWith(reseauPuisTelephone(requete, cle));
      return;
    }
    var cleP = clePhoto(requete.url);
    if (cleP !== null) e.respondWith(photo(requete, cleP));
  });

  moi.VitrineGardee = {
    VERSION: VERSION, CACHE: CACHE, FICHIERS: FICHIERS, ATTENTE_MS: ATTENTE_MS, cleDe: cleDe,
    PHOTOS: PHOTOS, PHOTOS_MAX: PHOTOS_MAX, PHOTOS_OCTETS_MAX: PHOTOS_OCTETS_MAX, clePhoto: clePhoto,
  };
})(self);
