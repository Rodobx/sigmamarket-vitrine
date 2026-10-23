/*
 * SigmaMarket · page du live (live.html) : les règles, sans rien dessiner.
 *
 * Copie en JavaScript ES2015 sans dépendance de src/domain/live.ts (le lien du live, le compte à
 * rebours et sa couleur) : tests/domain/live.test.ts charge ce fichier tel quel et vérifie que les
 * deux disent la même chose. Plus l'appel au serveur : les quatre fonctions SQL ouvertes au client
 * (supabase/migrations/0006_live.sql), par HTTP, avec la seule clé publique.
 *
 * Expose `VitrineLive` sur l'objet global.
 */
(function (racine) {
  'use strict';

  var CODE_LIVE = /^[A-HJKMNP-Z2-9]{8}$/;
  var PORT_SERVEUR_ESSAI = 54321;
  var SUPABASE = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
  var ESSAI = new RegExp('^http:\\/\\/[A-Za-z0-9.-]+:' + PORT_SERVEUR_ESSAI + '\\/?$');
  var BORNES = { lignes: 10, quantite: 99, prenom: 20 };
  var DELAI_RESEAU_MS = 15000;

  /** Le serveur auquel la page accepte de parler : Supabase (https) ou le serveur d'essai. */
  function serveurPermis(url) {
    return SUPABASE.test(url) || ESSAI.test(url);
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

  /** Ce que la page dit d'un refus du serveur (et, pour le stock, de ce qu'il reste). */
  function texteRefus(refus, detail) {
    switch (refus) {
      case 'live_inconnu': return 'Ce live n’existe pas, ou le lien est abîmé.';
      case 'live_ferme': return 'Le live est fermé : on ne peut plus commander.';
      case 'prenom_manquant': return 'Écris ton prénom.';
      case 'telephone_invalide': return 'Écris ton numéro de téléphone en entier.';
      case 'panier_invalide': return 'Ton panier ne se lit pas. Recommence.';
      case 'deja_une_commande': return 'Tu as déjà une commande qui attend. Paie-la, ou annule-la.';
      case 'trop_de_commandes': return 'Trop de commandes en ce moment. Réessaie dans quelques minutes.';
      case 'article_absent': return 'Un article n’est plus en vente. Il a été retiré de ton panier.';
      case 'stock_insuffisant':
        if (detail && detail.length) {
          return 'Il n’en reste pas assez : ' + detail.map(function (d) {
            return 'n° ' + d.numero + (d.reste > 0 ? ', plus que ' + d.reste : ', épuisé');
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
    formaterCompteARebours: formaterCompteARebours,
    minutesRestantes: minutesRestantes,
    chiffres: chiffres,
    grouperNumero: grouperNumero,
    texteRefus: texteRefus,
    appeler: appeler,
  };
})(typeof self !== 'undefined' ? self : this);
