/*
 * SigmaMarket · page du live (live.html) : les règles, sans rien dessiner.
 *
 * Copie en JavaScript ES2015 sans dépendance de src/domain/live.ts (le lien du live, le compte à
 * rebours, sa couleur et la part qui reste pour l'anneau) : tests/domain/live.test.ts charge ce fichier tel quel et vérifie que les
 * deux disent la même chose. Plus l'appel au serveur : les quatre fonctions SQL ouvertes au client
 * (supabase/migrations/0006_live.sql), par HTTP, avec la seule clé publique.
 *
 * Il parle au serveur de SigmaMarket et à lui seul : la référence du projet est posée dans
 * reglages.js (chargé avant), la page du live refuse tout autre serveur donné dans un lien.
 *
 * Expose `VitrineLive` sur l'objet global.
 */
(function (racine) {
  'use strict';

  var CODE_LIVE = /^[A-HJKMNP-Z2-9]{8}$/;
  var BORNES = { lignes: 10, quantite: 99, prenom: 20 };
  var DELAI_RESEAU_MS = 15000;
  /** Prénom et numéro gardés dans le navigateur du client : 90 jours au plus (conditions, annexe B). */
  var MEMOIRE_CLIENT_MS = 90 * 24 * 3600 * 1000;
  /** Une commande retrouvée après sa fin : le temps de dire comment elle s'est finie, pas plus. */
  var MARGE_COMMANDE_MS = 5 * 60 * 1000;

  /**
   * Le serveur auquel la page accepte de parler : le projet Supabase de SigmaMarket, dont la référence
   * est posée dans reglages.js, ou (essais sur l'ordinateur) le serveur d'essai local. Aucun autre,
   * même pas un autre projet Supabase (constat 44 de l'audit du 23 octobre 2026).
   */
  function serveurPermis(url) {
    var r = racine.SIGMA_REGLAGES;
    return !!r && r.serveurPermis(url);
  }

  /** `#l=CODE&s=…&k=…` → { code, serveur: { url, cle } }, ou null. Comme lireAdresseLive. */
  function lireAdresseLive(adresse) {
    var i = adresse.indexOf('#');
    if (i < 0) return null;
    var champs = {};
    var morceaux = adresse.slice(i + 1).split('&');
    for (var k = 0; k < morceaux.length; k++) {
      var egal = morceaux[k].indexOf('=');
      if (egal <= 0) continue;
      try {
        champs[morceaux[k].slice(0, egal)] = decodeURIComponent(morceaux[k].slice(egal + 1));
      } catch (e) {
        return null;
      }
    }
    var code = champs.l || '';
    var s = champs.s || '';
    var cle = champs.k || '';
    if (!CODE_LIVE.test(code) || cle === '' || cle.length > 1000) return null;
    var url = /^[a-z0-9]{20}$/.test(s) ? 'https://' + s + '.supabase.co' : s.replace(/\/+$/, '');
    if (!serveurPermis(url)) return null;
    return { code: code, serveur: { url: url, cle: cle } };
  }

  /**
   * L'adresse publique de la petite photo d'un article (D54), d'après son nom dans le bac `vitrine`
   * que rend live_voir (0007_photos_vitrine.sql). Null pour un nom qui n'a pas cette forme.
   */
  function adressePhoto(serveur, nom) {
    if (typeof nom !== 'string' || !/^[0-9a-f]{16}\/[1-9][0-9]{0,4}-[1-9][0-9]{0,4}\.jpg$/.test(nom)) return null;
    if (!serveurPermis(serveur.url)) return null;
    return serveur.url.replace(/\/+$/, '') + '/storage/v1/object/public/vitrine/' + nom;
  }

  function resteAPayerMs(expireLe, maintenantTelephone, ecart) {
    return Math.max(0, expireLe - (maintenantTelephone + ecart));
  }

  /** normal, orange passée la moitié du temps, rouge dans la dernière minute (ou le dernier cinquième). */
  function teinteCompteARebours(resteMs, delaiMs) {
    if (resteMs <= Math.max(60000, delaiMs / 5)) return 'rouge';
    if (resteMs <= delaiMs / 2) return 'orange';
    return 'normal';
  }

  /** La part du temps qui reste (de 1 à 0), pour l'anneau qui se vide : comme partRestante de src/domain/live.ts. */
  function partRestante(resteMs, delaiMs) {
    if (!(delaiMs > 0)) return 0;
    return Math.min(1, Math.max(0, resteMs / delaiMs));
  }

  /**
   * Le trait d'un anneau de rayon `rayon` qui montre `part` du tour, démarré en haut : comme
   * traitAnneau de src/ui/anneau-temps.ts. Une part qui reste montre au moins 4 % du tour.
   */
  function traitAnneau(part, rayon) {
    var tour = 2 * Math.PI * Math.max(0, rayon);
    if (!(part > 0)) return { tour: tour, decalage: tour, vide: true };
    var montree = Math.min(1, Math.max(0.04, part));
    return { tour: tour, decalage: tour * (1 - montree), vide: false };
  }

  function formaterCompteARebours(resteMs) {
    var secondes = Math.ceil(Math.max(0, resteMs) / 1000);
    var minutes = Math.floor(secondes / 60);
    var s = secondes % 60;
    return minutes + ':' + (s < 10 ? '0' : '') + s;
  }

  function minutesRestantes(resteMs) {
    return resteMs <= 0 ? 0 : Math.max(1, Math.round(resteMs / 60000));
  }

  function chiffres(texte) {
    return String(texte || '').replace(/\D/g, '');
  }

  function grouperNumero(texte) {
    return chiffres(texte).replace(/(\d{2})(?=\d)/g, '$1 ');
  }

  /**
   * Le numéro WhatsApp du vendeur, tel que le serveur le donne, pour le lien wa.me : des chiffres,
   * 8 à 15, sans 0 devant ; sinon null (la page n'écrit alors pas de lien).
   */
  function numeroWhatsApp(valeur) {
    return typeof valeur === 'string' && /^[1-9][0-9]{7,14}$/.test(valeur) ? valeur : null;
  }

  /**
   * Ce que la page garde dans le navigateur, avec sa date et sa fin : { v, le, jusqua }. Une valeur
   * sans date (gardée par une page d'avant) ou périmée est oubliée. `jusqua` : l'heure du navigateur.
   */
  function emballer(valeur, maintenant, jusqua) {
    return JSON.stringify({ v: String(valeur), le: maintenant, jusqua: jusqua });
  }
  function deballer(brut, maintenant) {
    if (typeof brut !== 'string') return null;
    var x;
    try { x = JSON.parse(brut); } catch (e) { return null; }
    if (!x || typeof x !== 'object' || typeof x.v !== 'string' || typeof x.le !== 'number' || typeof x.jusqua !== 'number') return null;
    if (!(x.jusqua > maintenant) || x.le > maintenant + 60000) return null;
    return x.v;
  }

  /** Ce que la page dit d'un refus du serveur (et, pour le stock, de ce qu'il en reste : un niveau, ou « plus que 2 »). */
  function texteRefus(refus, detail) {
    switch (refus) {
      case 'live_inconnu': return 'Ce live n’existe pas, ou le lien est abîmé.';
      case 'live_ferme': return 'Le live est fermé : on ne peut plus commander.';
      case 'prenom_manquant': return 'Écris ton prénom.';
      case 'prenom_invalide': return 'Écris seulement ton prénom, avec des lettres.';
      case 'quantite_trop_grande': return 'C’est beaucoup d’un coup. Prends-en moins, ou fais deux commandes.';
      case 'telephone_invalide': return 'Écris ton numéro de téléphone en entier.';
      case 'panier_invalide': return 'Ton panier ne se lit pas. Recommence.';
      case 'deja_une_commande': return 'Tu as déjà une commande qui attend. Paie-la, ou annule-la.';
      case 'trop_de_commandes': return 'Trop de commandes en ce moment. Réessaie dans quelques minutes.';
      case 'article_absent': return 'Un article n’est plus en vente. Il a été retiré de ton panier.';
      case 'stock_insuffisant':
        if (detail && detail.length) {
          return 'Il n’en reste pas assez : ' + detail.map(function (d) {
            return 'n° ' + d.numero + (d.reste > 0 ? ', plus que ' + d.reste : d.niveau === 'epuise' || d.reste === 0 ? ', épuisé' : ', moins que ça');
          }).join(' ; ') + '. Ton panier a été corrigé.';
        }
        return 'Il n’en reste pas assez.';
      case 'commande_inconnue': return 'Cette commande n’existe plus.';
      default: return 'Ça n’a pas marché. Réessaie.';
    }
  }

  /**
   * Appelle une fonction du serveur : POST <url>/rest/v1/rpc/<fonction>, la clé publique dans
   * `apikey` et rien d'autre (sans session, le serveur la traite en inconnu : rôle `anon`). Rend
   * la réponse JSON ; rejette sur une panne (réseau, serveur, 15 secondes sans réponse).
   */
  function appeler(f, serveur, fonction, corps) {
    var url = serveur.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fonction;
    return new Promise(function (resoudre, rejeter) {
      var fini = false;
      var minuteur = setTimeout(function () {
        if (!fini) { fini = true; rejeter(new Error('delai')); }
      }, DELAI_RESEAU_MS);
      f(url, {
        method: 'POST',
        headers: { apikey: serveur.cle, 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
      }).then(function (r) {
        if (!r.ok) throw new Error('serveur ' + r.status);
        return r.json();
      }).then(function (json) {
        if (fini) return;
        fini = true;
        clearTimeout(minuteur);
        resoudre(json);
      }, function (e) {
        if (fini) return;
        fini = true;
        clearTimeout(minuteur);
        rejeter(e);
      });
    });
  }

  racine.VitrineLive = {
    BORNES: BORNES,
    CODE_LIVE: CODE_LIVE,
    serveurPermis: serveurPermis,
    lireAdresseLive: lireAdresseLive,
    adressePhoto: adressePhoto,
    resteAPayerMs: resteAPayerMs,
    teinteCompteARebours: teinteCompteARebours,
    partRestante: partRestante,
    traitAnneau: traitAnneau,
    formaterCompteARebours: formaterCompteARebours,
    minutesRestantes: minutesRestantes,
    chiffres: chiffres,
    grouperNumero: grouperNumero,
    texteRefus: texteRefus,
    numeroWhatsApp: numeroWhatsApp,
    MEMOIRE_CLIENT_MS: MEMOIRE_CLIENT_MS,
    MARGE_COMMANDE_MS: MARGE_COMMANDE_MS,
    emballer: emballer,
    deballer: deballer,
    appeler: appeler,
  };
})(typeof self !== 'undefined' ? self : this);
