/*
 * SigmaMarket · pages des clients : parler au serveur de SigmaMarket (D85, la commande directe).
 *
 * Les quatre fonctions SQL ouvertes au client de la vitrine en ligne (vitrine_voir,
 * vitrine_commander, vitrine_mon_panier, vitrine_annuler_mon_panier ; contrat :
 * docs/COMMANDE-DIRECTE-CONTRAT.md, § 6.3), par HTTP, avec la seule clé publique ; et ce qu'elles
 * demandent à la page : ses bornes, l'identifiant et le jeton tirés avant tout appel, les heures
 * dites simplement.
 *
 * `appeler`, `numeroWhatsApp`, `adressePhoto` et `texteRefus` sont ceux de live.js (la page du live) :
 * un test vérifie qu'ils disent la même chose. live.js garde pour l'instant sa copie : la page du
 * live ne change pas (D53), et une page live.html encore en cache après la publication chargerait un
 * live.js qui ne marcherait plus sans ce fichier.
 *
 * Il parle au serveur de SigmaMarket et à lui seul (reglages.js, chargé avant). ES5, sans
 * dépendance. Expose `VitrineReseau` sur l'objet global.
 */
(function (racine) {
  'use strict';

  var MINUTE = 60000;
  var JOUR = 24 * 60 * MINUTE;

  /**
   * Les bornes de la page (BORNES_VITRINE_EN_LIGNE de src/sync/protocole.ts, la partie qui la
   * concerne ; un test les compare).
   */
  var BORNES_EN_LIGNE = {
    lignes: 30,
    quantite: 99,
    totalMax: 999999999,
    prenom: 20,
    telephoneMin: 8,
    telephoneMax: 15,
    echeanceMs: JOUR,
    boutiqueAbsenteMs: 30 * MINUTE,
    servisMontresDes: 10,
    voirAttenteMs: 5000,
    envoiAttenteMs: 10000,
    envoiLentMs: 4000,
    prevenirGrosMs: 10 * MINUTE,
    suiviRapideMs: 15000,
    suiviRapidePendantMs: 10 * MINUTE,
    suiviLentMs: MINUTE,
    souvenirClientMs: 30 * JOUR,
    derniersPaniersGardes: 3,
  };
  var ETATS_VIVANTS = ['attente', 'recu', 'pret', 'pris'];
  var ETATS_FINIS = ['vendu', 'refuse', 'annule', 'expire'];

  /** Le serveur auquel la page accepte de parler (reglages.js) : le projet officiel, ou le serveur d'essai local. */
  function serveurPermis(url) {
    var r = racine.SIGMA_REGLAGES;
    return !!r && r.serveurPermis(url);
  }

  /**
   * Le serveur à appeler pour cette adresse : { url, cle } avec la clé publique posée dans
   * reglages.js. Le serveur d'essai l'ignore ; le projet officiel sans clé posée : null (la page
   * garde alors le parcours d'aujourd'hui).
   */
  function serveurEnLigne(url) {
    var r = racine.SIGMA_REGLAGES;
    if (typeof url !== 'string' || !serveurPermis(url)) return null;
    var cle = r && r.CLE_PUBLIQUE ? r.CLE_PUBLIQUE : '';
    if (cle === '' && r.referenceDe(url) !== null) return null;
    return { url: url.replace(/\/+$/, ''), cle: cle || 'essai' };
  }

  /**
   * Appelle une fonction du serveur : POST <url>/rest/v1/rpc/<fonction>, la clé publique dans
   * `apikey` et rien d'autre (sans session, le serveur la traite en inconnu : rôle `anon`). Rend la
   * réponse JSON ; rejette sur une panne (réseau, statut autre que 200, `delaiMs` sans réponse).
   */
  function appeler(f, serveur, fonction, corps, delaiMs) {
    return new Promise(function (resoudre, rejeter) {
      if (!serveur || !serveurPermis(serveur.url)) {
        rejeter(new Error('serveur refusé'));
        return;
      }
      var url = serveur.url.replace(/\/+$/, '') + '/rest/v1/rpc/' + fonction;
      var fini = false;
      var minuteur = setTimeout(function () {
        if (!fini) { fini = true; rejeter(new Error('delai')); }
      }, delaiMs || 15000);
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

  // ------------------------------------------------------------ les quatre fonctions du client (§ 6.3)

  function voir(f, serveur, code, etiquette) {
    return appeler(f, serveur, 'vitrine_voir', { p_code: code, p_etiquette: etiquette || null }, BORNES_EN_LIGNE.voirAttenteMs);
  }
  function commander(f, serveur, code, panier) {
    return appeler(f, serveur, 'vitrine_commander', { p_code: code, p_panier: panier }, BORNES_EN_LIGNE.envoiAttenteMs);
  }
  function monPanier(f, serveur, jeton) {
    return appeler(f, serveur, 'vitrine_mon_panier', { p_jeton: jeton }, BORNES_EN_LIGNE.envoiAttenteMs);
  }
  function annulerMonPanier(f, serveur, jeton) {
    return appeler(f, serveur, 'vitrine_annuler_mon_panier', { p_jeton: jeton }, BORNES_EN_LIGNE.envoiAttenteMs);
  }

  // ------------------------------------------------------------ l'identifiant et le jeton (§ 3)

  /** Le tirage sûr du navigateur ; sans lui, pas d'envoi direct (un jeton deviné ouvrirait le panier d'un autre). */
  function peutTirer() {
    var c = racine.crypto;
    return !!c && typeof c.getRandomValues === 'function';
  }
  function hexa(octets) {
    var o = new Uint8Array(octets);
    racine.crypto.getRandomValues(o);
    var s = '';
    for (var k = 0; k < o.length; k++) s += (o[k] < 16 ? '0' : '') + o[k].toString(16);
    return s;
  }
  /** Une nouvelle paire : l'identifiant du panier (8 chiffres hexadécimaux) et son jeton (64). */
  function tirerPaire() {
    return { demande: hexa(4), jeton: hexa(32) };
  }

  // ------------------------------------------------------------ ce que la page montre et dit

  /** Le numéro WhatsApp de la boutique pour le lien wa.me : 8 à 15 chiffres, sans 0 devant ; sinon null. */
  function numeroWhatsApp(valeur) {
    return typeof valeur === 'string' && /^[1-9][0-9]{7,14}$/.test(valeur) ? valeur : null;
  }

  /** L'adresse publique de la petite photo d'un article, d'après son nom dans le bac `vitrine` ; sinon null. */
  function adressePhoto(serveur, nom) {
    if (typeof nom !== 'string' || !/^[0-9a-f]{16}\/[1-9][0-9]{0,4}-[1-9][0-9]{0,4}\.jpg$/.test(nom)) return null;
    if (!serveur || !serveurPermis(serveur.url)) return null;
    return serveur.url.replace(/\/+$/, '') + '/storage/v1/object/public/vitrine/' + nom;
  }

  /** Ce que la page dit d'un refus du serveur. Les mots du live, et ceux de la vitrine en ligne. */
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
      // La vitrine en ligne (D85).
      case 'deja_vendu': return 'La boutique a déjà servi ce panier.';
      case 'pris': return 'La boutique est en train de le servir : appelle-la.';
      case 'panier_inconnu': return 'Ce panier n’existe plus.';
      default: return 'Ça n’a pas marché. Réessaie.';
    }
  }

  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

  /** « 9 h 42 » (heure du téléphone du client). */
  function heure(ms) {
    var d = new Date(ms);
    var m = d.getMinutes();
    return d.getHours() + ' h ' + (m < 10 ? '0' : '') + m;
  }
  function memeJour(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  /** Combien de jours séparent deux dates, au calendrier du téléphone (0 : le même jour). */
  function joursEntre(ms, maintenant) {
    var a = new Date(ms);
    var b = new Date(maintenant);
    var debutA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
    var debutB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
    return Math.round((debutB - debutA) / JOUR);
  }
  /** « 9 h 42 », « hier, 18 h 10 », « demain 9 h 42 », ou « 26 oct., 9 h 42 ». */
  function quand(ms, maintenant) {
    var j = joursEntre(ms, maintenant);
    if (j === 0) return heure(ms);
    if (j === 1) return 'hier, ' + heure(ms);
    if (j === -1) return 'demain ' + heure(ms);
    return date(ms) + ', ' + heure(ms);
  }
  /** « 27 oct. ». */
  function date(ms) {
    var d = new Date(ms);
    return d.getDate() + ' ' + MOIS_COURTS[d.getMonth()];
  }
  /** « Mardi 27 octobre ». */
  function dateLongue(ms) {
    var d = new Date(ms);
    var j = JOURS[d.getDay()];
    return j.charAt(0).toUpperCase() + j.slice(1) + ' ' + d.getDate() + ' ' + MOIS[d.getMonth()];
  }
  /** « 2026-06 » → « juin » (cette année), « juin 2025 » sinon. */
  function moisDepuis(texte, maintenant) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(texte || ''));
    if (m === null || +m[2] < 1 || +m[2] > 12) return '';
    return MOIS[+m[2] - 1] + (+m[1] === new Date(maintenant).getFullYear() ? '' : ' ' + m[1]);
  }
  /** Avant une voyelle : « depuis avril », « d’avril » ; sinon « de juin ». */
  function de(mot) {
    return /^[aeiouyéèêàâh]/i.test(mot) ? 'd’' + mot : 'de ' + mot;
  }

  function estVivant(etat) {
    return ETATS_VIVANTS.indexOf(etat) >= 0;
  }
  function estFini(etat) {
    return ETATS_FINIS.indexOf(etat) >= 0;
  }

  racine.VitrineReseau = {
    BORNES_EN_LIGNE: BORNES_EN_LIGNE,
    ETATS_VIVANTS: ETATS_VIVANTS,
    ETATS_FINIS: ETATS_FINIS,
    serveurPermis: serveurPermis,
    serveurEnLigne: serveurEnLigne,
    appeler: appeler,
    voir: voir,
    commander: commander,
    monPanier: monPanier,
    annulerMonPanier: annulerMonPanier,
    peutTirer: peutTirer,
    tirerPaire: tirerPaire,
    numeroWhatsApp: numeroWhatsApp,
    adressePhoto: adressePhoto,
    texteRefus: texteRefus,
    heure: heure,
    quand: quand,
    joursEntre: joursEntre,
    date: date,
    dateLongue: dateLongue,
    moisDepuis: moisDepuis,
    de: de,
    estVivant: estVivant,
    estFini: estFini,
  };
})(typeof self !== 'undefined' ? self : this);
