/*
 * SigmaMarket · pages des clients (index.html, live.html) : ce qui est posé UNE FOIS, à la
 * publication, et les règles qui en dépendent. Chargé avant format.js et live.js.
 *
 *   - le SEUL serveur auquel les pages parlent (audit de sécurité du 23 octobre 2026, constats 44 et
 *     45) : le projet Supabase de SigmaMarket, dont la référence est écrite ici ; plus, pour les
 *     essais sur l'ordinateur, le serveur d'essai (http, port 54321) SI la page elle-même est servie
 *     d'un ordinateur local. Un lien ou un catalogue qui désigne un autre serveur est refusé, même
 *     si c'est un autre projet Supabase ;
 *   - le petit texte d'information en bas des pages (conditions d'utilisation, annexe B) : écrit
 *     une seule fois, montré et DIT par chaque page ;
 *   - le lien « Tes données » et le téléphone de l'éditeur, quand la boutique n'a pas de WhatsApp ;
 *   - la clé publique du projet (D85) : la vitrine en ligne appelle le serveur avec elle seule.
 *
 * Avant de recopier la page en ligne : `npm run vitrine:reglages -- <adresse du projet> --cle <clé
 * publique>` écrit la référence et la clé ci-dessous (outils/fixer-reglages-vitrine.mjs). Tant qu'elle est vide, aucune adresse
 * hébergée n'est acceptée : la page le dit au lieu de parler à un serveur inconnu.
 *
 * ES2015, sans dépendance. Expose `SIGMA_REGLAGES` sur l'objet global.
 */
(function (racine) {
  'use strict';

  /** La référence (20 signes) du projet Supabase de SigmaMarket. Vide : pas encore posée. */
  var SERVEUR_OFFICIEL = 'ndxfdlaepbectpdnlxuv';
  /** Le téléphone de l'éditeur, pour les clients d'une boutique sans WhatsApp. Vide : pas dit. */
  var TELEPHONE_EDITEUR = '';
  /**
   * La clé publique du projet (celle de l'application, publique elle aussi) : la vitrine en ligne
   * (D85) appelle le serveur avec elle. Vide : la page garde le parcours d'aujourd'hui.
   */
  var CLE_PUBLIQUE = 'sb_publishable_flmk8kmIlF_yINSvC872vw_U0VfavEi';
  /** Où mène « Tes données » (la page est dans le même dossier). */
  var PAGE_DONNEES = 'donnees.html';

  var PORT_SERVEUR_ESSAI = 54321;
  var SUPABASE = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
  var ESSAI = new RegExp('^http:\\/\\/([A-Za-z0-9.-]+):' + PORT_SERVEUR_ESSAI + '\\/?$');

  /** Un nom d'hôte de l'ordinateur ou du réseau de la maison : jamais un hôte d'Internet. */
  function hoteLocal(hote) {
    var h = String(hote || '').toLowerCase();
    if (h === 'localhost' || h === '[::1]' || /\.local(host)?$/.test(h)) return true;
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
    if (m) {
      var a = +m[1];
      var b = +m[2];
      return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
    }
    // Un nom de machine du réseau local n'a pas de point.
    return h.indexOf('.') < 0 && /^[a-z0-9-]+$/.test(h);
  }

  var hotePage = '';
  try { hotePage = racine.location && racine.location.hostname ? String(racine.location.hostname) : ''; } catch (e) { hotePage = ''; }
  /** Vrai si la page est servie d'un ordinateur local : le serveur d'essai est alors permis. */
  var essai = hoteLocal(hotePage);

  /** La référence du projet officiel d'une adresse (https://<ref>.supabase.co), ou null. */
  function referenceDe(url) {
    var m = SUPABASE.exec(String(url));
    return m ? m[1] : null;
  }

  /** Le serveur auquel la page accepte de parler : le projet officiel, ou (essais) le serveur d'essai local. */
  function serveurPermis(url) {
    var texte = String(url);
    var ref = referenceDe(texte);
    if (ref !== null) return SERVEUR_OFFICIEL !== '' && ref === SERVEUR_OFFICIEL;
    var m = ESSAI.exec(texte);
    return m !== null && essai && hoteLocal(m[1]);
  }

  /** Vrai si cette référence courte (20 signes) est celle du projet officiel. */
  function referencePermise(ref) {
    return /^[a-z0-9]{20}$/.test(String(ref)) && SERVEUR_OFFICIEL !== '' && ref === SERVEUR_OFFICIEL;
  }

  /** La même règle pour la forme courte d'un catalogue : « <ref> » ou « http://hôte:54321 ». */
  function serveurCourtPermis(court) {
    var c = String(court);
    return /^[a-z0-9]{20}$/.test(c) ? referencePermise(c) : serveurPermis(c);
  }

  /** Le numéro de la boutique, tel qu'il se lit : « +225 07 07 12 34 56 » devient « +2250707123456 » (chiffres seulement). */
  function numeroAffiche(whatsapp) {
    var chiffres = String(whatsapp || '').replace(/\D/g, '');
    return /^[1-9][0-9]{7,14}$/.test(chiffres) ? '+' + chiffres : '';
  }

  /** Le nom de la boutique pour une phrase : sans guillemets ni espaces en trop. */
  function nomPour(nom) {
    var n = String(nom || '').replace(/[«»"]/g, '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
    return n;
  }

  /** La dernière phrase : à qui poser ses questions (la boutique, sinon l'éditeur si son téléphone est posé). */
  function questions(contact) {
    if (contact) return ' Questions : la boutique, au ' + contact + '.';
    if (TELEPHONE_EDITEUR) return ' Questions : SigmaMarket, au ' + TELEPHONE_EDITEUR + '.';
    return '';
  }

  /**
   * Le petit texte en bas de la VITRINE (conditions d'utilisation, annexe B). `contact` : le numéro
   * de la boutique tel qu'on le lit (vide s'il n'y en a pas). `enLigne` : la page peut envoyer le
   * panier à la boutique (D85) ; elle dit alors ce qui part, et combien de temps cela reste.
   */
  function informationVitrine(nom, contact, enLigne) {
    var n = nomPour(nom);
    var debut = n ? 'Cette page est celle de la boutique « ' + n + ' », faite avec SigmaMarket.' : 'Cette page est faite avec SigmaMarket.';
    if (enLigne) {
      return debut + ' Si tu envoies ton panier, ton numéro (et ton prénom) vont à la boutique et restent 7 jours sur le serveur de SigmaMarket.' +
        ' Ton téléphone garde ton prénom, ton numéro et tes 3 derniers paniers 30 jours au plus.' + questions(contact);
    }
    return debut + ' Ton panier, et ton prénom si tu le mets, restent dans ton téléphone 24 heures.' +
      ' La boutique les reçoit seulement quand tu les lui envoies.' + questions(contact);
  }

  /** Le petit texte en bas du LIVE, sous le formulaire du prénom et du numéro. */
  function informationLive(nom, contact) {
    var n = nomPour(nom);
    return 'Ton prénom et ton numéro vont à la boutique' + (n ? ' « ' + n + ' »' : '') + ', pour ta commande et le paiement.' +
      ' Ton prénom peut être dit à voix haute pendant le live.' +
      ' Ils sont gardés sur le serveur de SigmaMarket, en Europe.' +
      ' Ils restent aussi dans ton téléphone, 90 jours au plus, pour ta prochaine commande.' + questions(contact);
  }

  racine.SIGMA_REGLAGES = {
    SERVEUR_OFFICIEL: SERVEUR_OFFICIEL,
    CLE_PUBLIQUE: CLE_PUBLIQUE,
    TELEPHONE_EDITEUR: TELEPHONE_EDITEUR,
    PAGE_DONNEES: PAGE_DONNEES,
    PORT_SERVEUR_ESSAI: PORT_SERVEUR_ESSAI,
    essai: essai,
    hoteLocal: hoteLocal,
    referenceDe: referenceDe,
    serveurPermis: serveurPermis,
    serveurCourtPermis: serveurCourtPermis,
    numeroAffiche: numeroAffiche,
    informationVitrine: informationVitrine,
    informationLive: informationLive,
  };
})(typeof self !== 'undefined' ? self : this);
