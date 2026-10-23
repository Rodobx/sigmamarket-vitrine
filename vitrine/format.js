/*
 * SigmaMarket · vitrine : les formats du catalogue (#c=) et du panier (#p=), côté page du client.
 *
 * C'est la copie, en JavaScript ES2015 sans dépendance, de src/domain/vitrine.ts (la description
 * des octets y est) : mêmes octets, mêmes bornes, mêmes refus, mêmes codes d'erreur.
 * tests/domain/vitrine.test.ts charge ce fichier tel quel et le compare à l'application, sur des
 * allers-retours et sur des milliers de contenus abîmés ou fabriqués.
 *
 * Aucun appel réseau. Les petites photos (catalogue en version 2, D54) se chargent depuis le
 * serveur de la boutique, et de lui seul : adresseMiniature. Expose `VitrineFormat` sur l'objet global.
 */
(function (racine) {
  'use strict';

  const VERSION_CATALOGUE = 2;
  const VERSION_PANIER = 1;
  const TYPE_CATALOGUE = 1;
  const TYPE_PANIER = 2;
  const BORNES = {
    nomBoutique: 40,
    nomArticle: 24,
    prenom: 20,
    articles: 250,
    lignes: 30,
    quantite: 999,
    numero: 99999,
    octetsCatalogue: 12000,
    octetsPanier: 600,
  };
  const JOURS_MAX = 36524;
  const ORIGINE_JOURS = Date.UTC(2024, 0, 1);
  const MS_PAR_JOUR = 86400000;
  const MONTANT_MAX = 999999999;
  const WHATSAPP_MAX = 999999999999999;
  const PRIX_CODE_MAX = MONTANT_MAX * 2 + 1;
  const TEXTE_LU_MAX = 64000;
  const NIVEAUX = ['epuise', 'bientot_fini', 'disponible'];
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const PAQUET_ANDROID = 'com.sigmamarket.app';
  const VERSION_PHOTO_MAX = 16383;
  const SERVEUR_COURT_MAX = 64;
  const PORT_SERVEUR_ESSAI = 54321;
  const SUPABASE = /^https:\/\/([a-z0-9]{20})\.supabase\.co\/?$/;
  const ESSAI = new RegExp('^http:\\/\\/[A-Za-z0-9.-]+:' + PORT_SERVEUR_ESSAI + '\\/?$');
  const BAC_VITRINE = 'vitrine';

  function erreur(code, detail) {
    let e = new Error(detail ? code + ' : ' + detail : code);
    e.name = 'ErreurVitrine';
    e.code = code;
    e.detail = detail;
    return e;
  }
  function exiger(condition, detail) {
    if (!condition) throw erreur('hors_bornes', detail);
  }
  function estEntier(n, min, max) {
    return typeof n === 'number' && Number.isInteger(n) && n >= min && n <= max;
  }

  // ---------------------------------------------------------------- textes

  function estEspace(c) {
    return c <= 0x20 || (c >= 0x7f && c <= 0xa0) || c === 0x1680 || (c >= 0x2000 && c <= 0x200a) ||
      c === 0x2028 || c === 0x2029 || c === 0x202f || c === 0x205f || c === 0x3000;
  }
  function estInvisible(c) {
    return c === 0xad || c === 0x34f || c === 0x61c || c === 0x115f || c === 0x1160 || c === 0x17b4 ||
      c === 0x17b5 || c === 0x180e || (c >= 0x200b && c <= 0x200f) || (c >= 0x202a && c <= 0x202e) ||
      (c >= 0x2060 && c <= 0x206f) || c === 0x3164 || (c >= 0xd800 && c <= 0xdfff) || c === 0xfeff ||
      c === 0xffa0 || (c >= 0xfff0 && c <= 0xfffb) || (c >= 0xe0000 && c <= 0xe0fff);
  }

  /** Invisibles retirés, espaces fondues, rien au bout, coupé à `max` signes (points de code). */
  function nettoyerTexte(texte, max) {
    let sortie = '';
    let signes = 0;
    let espaceEnAttente = false;
    for (let signe of String(texte)) {
      let c = signe.codePointAt(0);
      if (estEspace(c)) {
        espaceEnAttente = signes > 0;
        continue;
      }
      if (estInvisible(c)) continue;
      if (espaceEnAttente) {
        if (signes + 2 > max) break;
        sortie += ' ';
        signes += 1;
        espaceEnAttente = false;
      }
      if (signes + 1 > max) break;
      sortie += signe;
      signes += 1;
    }
    return sortie;
  }

  /** Une lettre : d'une écriture à majuscules (latin, grec, cyrillique…), ou arabe, ou n'ko. */
  function estLettre(signe) {
    let c = signe.codePointAt(0);
    return signe.toLowerCase() !== signe.toUpperCase() || (c >= 0x620 && c <= 0x64a) || (c >= 0x7ca && c <= 0x7ea);
  }

  /**
   * Le prénom tel que l'application le dira (copie de prenomLisible) : des lettres, au plus deux
   * mots, un trait d'union ou une apostrophe entre deux lettres ; sinon rien.
   */
  function prenomLisible(prenom) {
    let mots = 1;
    let avant = '';
    for (let signe of String(prenom)) {
      let c = signe.codePointAt(0);
      if (estLettre(signe) || (avant === 'l' && c >= 0x300 && c <= 0x36f)) {
        avant = 'l';
        continue;
      }
      if (avant !== 'l') return '';
      if (signe === ' ') {
        mots += 1;
        if (mots > 2) return '';
      } else if (signe !== '-' && signe !== "'" && signe !== '’') {
        return '';
      }
      avant = 's';
    }
    return avant === 'l' ? prenom : '';
  }

  function versUtf8(texte) {
    let octets = [];
    for (let signe of texte) {
      let c = signe.codePointAt(0);
      if (c < 0x80) octets.push(c);
      else if (c < 0x800) octets.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else if (c < 0x10000) octets.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      else octets.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return octets;
  }

  function depuisUtf8(o, debut, fin) {
    let texte = '';
    let i = debut;
    function suite(bas, haut) {
      if (i >= fin) throw erreur('hors_bornes', 'UTF-8 coupé');
      let b = o[i++];
      if (b < bas || b > haut) throw erreur('hors_bornes', 'UTF-8 invalide');
      return b & 0x3f;
    }
    while (i < fin) {
      let b = o[i++];
      let c;
      if (b < 0x80) c = b;
      else if (b >= 0xc2 && b <= 0xdf) c = ((b & 0x1f) << 6) | suite(0x80, 0xbf);
      else if (b >= 0xe0 && b <= 0xef) {
        let deux = suite(b === 0xe0 ? 0xa0 : 0x80, b === 0xed ? 0x9f : 0xbf);
        c = ((b & 0x0f) << 12) | (deux << 6) | suite(0x80, 0xbf);
      } else if (b >= 0xf0 && b <= 0xf4) {
        let d2 = suite(b === 0xf0 ? 0x90 : 0x80, b === 0xf4 ? 0x8f : 0xbf);
        let d3 = suite(0x80, 0xbf);
        c = ((b & 0x07) << 18) | (d2 << 12) | (d3 << 6) | suite(0x80, 0xbf);
      } else throw erreur('hors_bornes', 'UTF-8 invalide');
      texte += String.fromCodePoint(c);
    }
    return texte;
  }

  // ---------------------------------------------------------------- base64url

  function versBase64url(o) {
    let s = '';
    for (let i = 0; i < o.length; i += 3) {
      let n = (o[i] << 16) | ((i + 1 < o.length ? o[i + 1] : 0) << 8) | (i + 2 < o.length ? o[i + 2] : 0);
      s += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
      if (i + 1 < o.length) s += ALPHABET[(n >> 6) & 63];
      if (i + 2 < o.length) s += ALPHABET[n & 63];
    }
    return s;
  }

  function depuisBase64url(s) {
    if (s.length % 4 === 1) throw erreur('illisible', 'longueur');
    let sortie = new Uint8Array(Math.floor((s.length * 3) / 4));
    let accu = 0;
    let bits = 0;
    let j = 0;
    for (let i = 0; i < s.length; i++) {
      let v = ALPHABET.indexOf(s[i]);
      if (v < 0) throw erreur('illisible', 'signe');
      accu = ((accu << 6) | v) & 0xffffff;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        sortie[j++] = (accu >> bits) & 0xff;
      }
    }
    if ((accu & ((1 << bits) - 1)) !== 0) throw erreur('illisible', 'bits en trop');
    return sortie;
  }

  // ---------------------------------------------------------------- octets

  function fnv1a(o, fin) {
    let h = 0x811c9dc5;
    for (let i = 0; i < fin; i++) {
      h ^= o[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  }

  function ecrivain() {
    let octets = [];
    const w = {
      u8: function (n) { octets.push(n & 0xff); },
      u32: function (n) { w.u8(n >>> 24); w.u8(n >>> 16); w.u8(n >>> 8); w.u8(n); },
      varint: function (n) {
        let reste = n;
        while (reste >= 128) {
          octets.push((reste % 128) | 128);
          reste = Math.floor(reste / 128);
        }
        octets.push(reste);
      },
      texte: function (t) {
        let b = versUtf8(t);
        w.varint(b.length);
        for (let k = 0; k < b.length; k++) octets.push(b[k]);
      },
      fin: function () {
        let somme = fnv1a(octets, octets.length) & 0xffff;
        w.u8(somme >>> 8);
        w.u8(somme);
        return Uint8Array.from(octets);
      },
    };
    return w;
  }

  function lecteur(o, fin) {
    let i = 1;
    const r = {
      u8: function () {
        if (i >= fin) throw erreur('abime', 'contenu coupé');
        return o[i++];
      },
      u32: function () {
        let a = r.u8();
        let b = r.u8();
        let c = r.u8();
        let d = r.u8();
        return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
      },
      varint: function (max) {
        let n = 0;
        let poids = 1;
        for (let k = 0; k < 8; k++) {
          let b = r.u8();
          n += (b & 127) * poids;
          if ((b & 128) === 0) {
            if (b === 0 && k > 0) throw erreur('abime', 'entier mal codé');
            if (n > max) throw erreur('hors_bornes', 'entier ' + n + ' > ' + max);
            return n;
          }
          poids *= 128;
        }
        throw erreur('abime', 'entier trop long');
      },
      texte: function (maxSignes) {
        let n = r.varint(maxSignes * 4);
        if (i + n > fin) throw erreur('abime', 'texte coupé');
        let t = depuisUtf8(o, i, i + n);
        i += n;
        if (nettoyerTexte(t, maxSignes) !== t) throw erreur('hors_bornes', 'texte non nettoyé');
        return t;
      },
      terminer: function () {
        if (i !== fin) throw erreur('abime', 'octets en trop');
      },
    };
    return r;
  }

  function ouvrir(o, type, version, octetsMax) {
    if (o.length > octetsMax) throw erreur('trop_long');
    if (o.length < 3) throw erreur('abime', 'trop court');
    if (o[0] >> 4 !== type) throw erreur('mauvais_type');
    if ((o[0] & 15) < 1 || (o[0] & 15) > version) throw erreur('version_inconnue', 'version ' + (o[0] & 15));
    let fin = o.length - 2;
    let somme = fnv1a(o, fin) & 0xffff;
    if (((o[fin] << 8) | o[fin + 1]) !== somme) throw erreur('abime', 'somme de contrôle');
    return lecteur(o, fin);
  }

  function codePrix(prix) {
    return prix % 5 === 0 ? (prix / 5) * 2 : prix * 2 + 1;
  }
  function prixDuCode(c) {
    let prix;
    if (c % 2 === 0) {
      prix = (c / 2) * 5;
      if (prix > MONTANT_MAX) throw erreur('hors_bornes', 'prix');
      return prix;
    }
    prix = (c - 1) / 2;
    if (prix % 5 === 0) throw erreur('hors_bornes', 'prix mal codé');
    return prix;
  }
  function estMontantValide(n) {
    return estEntier(n, 0, MONTANT_MAX);
  }

  function nombreVersJour(n) {
    let d = new Date(ORIGINE_JOURS + n * MS_PAR_JOUR);
    let deux = function (x) { return x < 10 ? '0' + x : String(x); };
    return d.getUTCFullYear() + '-' + deux(d.getUTCMonth() + 1) + '-' + deux(d.getUTCDate());
  }

  // ---------------------------------------------------------------- petites photos (D54)

  /** Le serveur auquel la page accepte de parler : un projet Supabase (https) ou le serveur d'essai. */
  function serveurPermis(url) {
    return SUPABASE.test(url) || ESSAI.test(url);
  }
  function estServeurCourt(court) {
    return court.length <= SERVEUR_COURT_MAX && court.slice(-1) !== '/' && (/^[a-z0-9]{20}$/.test(court) || ESSAI.test(court));
  }
  /** « abcdefghijklmnopqrst » → https://abcdefghijklmnopqrst.supabase.co ; null si le serveur n'est pas permis. */
  function urlDuServeur(court) {
    let url = /^[a-z0-9]{20}$/.test(court) ? 'https://' + court + '.supabase.co' : String(court).replace(/\/+$/, '');
    return serveurPermis(url) ? url : null;
  }
  function hexa8(n) {
    return ('00000000' + (n >>> 0).toString(16)).slice(-8);
  }
  /** L'adresse publique de la petite photo d'un article, ou null s'il n'en a pas. */
  function adresseMiniature(catalogue, article) {
    let photos = catalogue.photos || null;
    if (photos === null || !article.photo) return null;
    let url = urlDuServeur(photos.serveur);
    if (url === null) return null;
    return url + '/storage/v1/object/public/' + BAC_VITRINE + '/' + photos.dossier + '/' + article.numero + '-' + article.photo + '.jpg';
  }
  /** L'origine d'où viennent les photos d'un catalogue (« https://xxxx.supabase.co »), ou null. */
  function originePhotos(catalogue) {
    let photos = catalogue.photos || null;
    return photos === null ? null : urlDuServeur(photos.serveur);
  }

  // ---------------------------------------------------------------- catalogue et panier

  function decoderCatalogue(o) {
    let r = ouvrir(o, TYPE_CATALOGUE, VERSION_CATALOGUE, BORNES.octetsCatalogue);
    let avecPhotos = (o[0] & 15) === 2;
    let cle = r.u32();
    let jour = nombreVersJour(r.varint(JOURS_MAX));
    let boutique = r.texte(BORNES.nomBoutique);
    let w = r.varint(WHATSAPP_MAX);
    let whatsapp = w === 0 ? null : String(w);
    exiger(whatsapp === null || /^[1-9]\d{7,14}$/.test(whatsapp), 'numéro WhatsApp');
    let photos = null;
    if (avecPhotos) {
      let serveur = r.texte(SERVEUR_COURT_MAX);
      exiger(estServeurCourt(serveur), 'serveur');
      photos = { serveur: serveur, dossier: hexa8(cle) + hexa8(r.u32()) };
    }
    let n = r.varint(BORNES.articles);
    let articles = [];
    let numero = 0;
    let unePhoto = false;
    for (let k = 0; k < n; k++) {
      let v = r.varint(BORNES.numero * 4 + 3);
      let ecart = Math.floor(v / 4);
      exiger(ecart >= 1, 'numéro en double ou nul');
      numero += ecart;
      exiger(numero <= BORNES.numero, 'numéro ' + numero);
      exiger(v % 4 <= 2, 'niveau');
      let nom = r.texte(BORNES.nomArticle);
      let prix = prixDuCode(r.varint(PRIX_CODE_MAX));
      let article = { numero: numero, nom: nom, prix: prix, niveau: NIVEAUX[v % 4] };
      if (avecPhotos) {
        let photo = r.varint(VERSION_PHOTO_MAX);
        if (photo > 0) {
          article.photo = photo;
          unePhoto = true;
        }
      }
      articles.push(article);
    }
    r.terminer();
    exiger(!avecPhotos || unePhoto, 'version 2 sans photo');
    let catalogue = { cle: cle, jour: jour, boutique: boutique, whatsapp: whatsapp, articles: articles };
    if (photos !== null) catalogue.photos = photos;
    return catalogue;
  }

  function encoderPanier(panier) {
    exiger(estEntier(panier.cle, 0, 0xffffffff), 'clé de boutique');
    exiger(/^[0-9a-f]{8}$/.test(panier.demande), 'demande');
    exiger(panier.lignes.length >= 1 && panier.lignes.length <= BORNES.lignes, 'nombre de lignes');
    let rangees = panier.lignes.slice().sort(function (a, b) { return a.numero - b.numero; });
    let w = ecrivain();
    w.u8((TYPE_PANIER << 4) | VERSION_PANIER);
    w.u32(panier.cle);
    w.u32(parseInt(panier.demande, 16));
    w.varint(rangees.length);
    let precedent = 0;
    rangees.forEach(function (l) {
      exiger(estEntier(l.numero, 1, BORNES.numero), 'numéro ' + l.numero);
      exiger(l.numero > precedent, 'numéro ' + l.numero + ' en double');
      exiger(estEntier(l.quantite, 1, BORNES.quantite), 'quantité ' + l.quantite);
      exiger(estMontantValide(l.prixVu), 'prix ' + l.prixVu);
      w.varint(l.numero - precedent);
      w.varint(l.quantite);
      w.varint(codePrix(l.prixVu));
      precedent = l.numero;
    });
    w.texte(nettoyerTexte(panier.prenom, BORNES.prenom));
    return w.fin();
  }

  function decoderPanier(o) {
    let r = ouvrir(o, TYPE_PANIER, VERSION_PANIER, BORNES.octetsPanier);
    let cle = r.u32();
    let demande = ('00000000' + r.u32().toString(16)).slice(-8);
    let n = r.varint(BORNES.lignes);
    exiger(n >= 1, 'panier vide');
    let lignes = [];
    let numero = 0;
    for (let k = 0; k < n; k++) {
      let ecart = r.varint(BORNES.numero);
      exiger(ecart >= 1, 'numéro en double ou nul');
      numero += ecart;
      exiger(numero <= BORNES.numero, 'numéro ' + numero);
      let quantite = r.varint(BORNES.quantite);
      exiger(quantite >= 1, 'quantité nulle');
      let prixVu = prixDuCode(r.varint(PRIX_CODE_MAX));
      lignes.push({ numero: numero, quantite: quantite, prixVu: prixVu });
    }
    let prenom = r.texte(BORNES.prenom);
    r.terminer();
    return { cle: cle, demande: demande, lignes: lignes, prenom: prenom };
  }

  function lireContenu(type, contenu) {
    if (type === 'c') {
      if (contenu.length > Math.ceil((BORNES.octetsCatalogue * 4) / 3)) throw erreur('trop_long');
      return { type: 'catalogue', catalogue: decoderCatalogue(depuisBase64url(contenu)), texte: contenu };
    }
    if (contenu.length > Math.ceil((BORNES.octetsPanier * 4) / 3)) throw erreur('trop_long');
    return { type: 'panier', panier: decoderPanier(depuisBase64url(contenu)), texte: contenu };
  }

  /**
   * Un #c=… ou #p=… d'un texte (adresse, message copié, contenu seul) : le DERNIER qui se lit,
   * puisque le message met le lien à la fin ; sinon l'erreur du dernier.
   */
  function lireAdresse(texte) {
    if (texte.length > TEXTE_LU_MAX) throw erreur('trop_long');
    let marque = /(?:^|#)([cp])=([A-Za-z0-9_-]*)/g;
    let marques = [];
    let m;
    while ((m = marque.exec(texte)) !== null) marques.push(m);
    if (marques.length === 0) throw erreur('pas_un_lien');
    let premiere = null;
    for (let k = marques.length - 1; k >= 0; k--) {
      try {
        return lireContenu(marques[k][1], marques[k][2]);
      } catch (e) {
        if (e.name !== 'ErreurVitrine') throw e;
        if (premiere === null) premiere = e;
      }
    }
    throw premiere;
  }

  // ---------------------------------------------------------------- pour la page

  const ESPACE_INSECABLE = ' ';
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre',
    'novembre', 'décembre'];

  /** 10500 → « 10 500 » (espace insécable entre les milliers). */
  function formaterNombre(n) {
    return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ESPACE_INSECABLE);
  }

  /** 2250707123456 → « +225 07 07 12 34 56 » ; les autres pays : « +221771234567 ». */
  function formaterWhatsApp(numero) {
    if (/^225\d{10}$/.test(numero)) return '+225 ' + numero.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ');
    return '+' + numero;
  }

  /** « aujourd'hui », « hier », « 14 octobre », ou « 14 octobre 2025 » une autre année. */
  function jourEnClair(jour, aujourdhui) {
    if (jour === aujourdhui) return 'aujourd’hui';
    let a = Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10));
    let b = Date.UTC(+aujourdhui.slice(0, 4), +aujourdhui.slice(5, 7) - 1, +aujourdhui.slice(8, 10));
    if (b - a === MS_PAR_JOUR) return 'hier';
    let texte = (+jour.slice(8, 10)) + ' ' + MOIS[+jour.slice(5, 7) - 1];
    return jour.slice(0, 4) === aujourdhui.slice(0, 4) ? texte : texte + ' ' + jour.slice(0, 4);
  }

  /**
   * Les lignes d'un panier d'après les quantités choisies ({ numero: quantite }) : seulement les
   * articles du catalogue encore en vente, au prix affiché, rangées par numéro, bornées.
   */
  function lignesDuPanier(catalogue, quantites) {
    let lignes = [];
    catalogue.articles.forEach(function (a) {
      let q = quantites[a.numero];
      if (a.niveau === 'epuise' || !estEntier(q, 1, 1e9)) return;
      if (lignes.length >= BORNES.lignes) return;
      lignes.push({ numero: a.numero, quantite: Math.min(q, BORNES.quantite), prixVu: a.prix });
    });
    return lignes.sort(function (x, y) { return x.numero - y.numero; });
  }

  function totalPanier(lignes) {
    return lignes.reduce(function (s, l) { return s + l.quantite * l.prixVu; }, 0);
  }

  function nombreArticles(lignes) {
    return lignes.reduce(function (s, l) { return s + l.quantite; }, 0);
  }

  /**
   * Le message WhatsApp, lisible par un humain même sans la page :
   * « Bonjour, je voudrais : / 12 Pagne wax ×2 / 7 Savon ×1 / Total affiché : 35 000 FCFA / <lien> ».
   */
  function texteWhatsApp(catalogue, lignes, prenom, lien) {
    let noms = {};
    catalogue.articles.forEach(function (a) { noms[a.numero] = a.nom; });
    let p = nettoyerTexte(prenom || '', BORNES.prenom);
    let texte = (p ? 'Bonjour, c’est ' + p + '. Je voudrais :' : 'Bonjour, je voudrais :') + '\n';
    lignes.forEach(function (l) {
      let nom = noms[l.numero];
      texte += (nom ? l.numero + ' ' + nom : 'N° ' + l.numero) + ' ×' + l.quantite + '\n';
    });
    let total = totalPanier(lignes);
    // Une espace simple : l'insécable ne passe pas toujours bien dans un message.
    if (total > 0) texte += 'Total affiché : ' + formaterNombre(total).replace(/ /g, ' ') + ' FCFA\n';
    return texte + lien;
  }

  function lienWhatsApp(numero, texte) {
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texte);
  }

  /**
   * L'intent qui ouvre l'application (Android seulement) sur sigmamarket://panier?p=… : Chrome
   * ouvre SigmaMarket s'il est installé, sinon il revient à `retour` (cette page).
   */
  function lienApplication(contenu, retour) {
    return 'intent://panier?p=' + contenu + '#Intent;scheme=sigmamarket;package=' + PAQUET_ANDROID +
      ';S.browser_fallback_url=' + encodeURIComponent(retour) + ';end';
  }

  /**
   * Rouvre le catalogue dans Chrome depuis le navigateur d'une autre application (Android).
   * Un intent ne porte pas de « # » : le catalogue passe en « ?c= », que la page relit et remet
   * aussitôt après le « # ». Seulement le catalogue (public) ; jamais un panier, qui porte un prénom.
   */
  function lienChrome(page, contenuCatalogue) {
    let m = /^(https?):\/\/([^#?]*)$/.exec(page);
    if (m === null) return null;
    return 'intent://' + m[2] + '?c=' + contenuCatalogue + '#Intent;scheme=' + m[1] +
      ';package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(page + '#c=' + contenuCatalogue) + ';end';
  }

  /** Navigateur intégré à une application (TikTok, Facebook, Instagram…) : il ouvre mal WhatsApp. */
  function estNavigateurIntegre(ua) {
    return /FBAN|FBAV|FB_IAB|FBIOS|Instagram|musical_ly|Bytedance|TikTok|trill_|Snapchat|Line\//i.test(ua || '');
  }

  racine.VitrineFormat = {
    VERSION_CATALOGUE: VERSION_CATALOGUE,
    VERSION_PANIER: VERSION_PANIER,
    BORNES: BORNES,
    nettoyerTexte: nettoyerTexte,
    prenomLisible: prenomLisible,
    versUtf8: versUtf8,
    versBase64url: versBase64url,
    depuisBase64url: depuisBase64url,
    decoderCatalogue: decoderCatalogue,
    serveurPermis: serveurPermis,
    urlDuServeur: urlDuServeur,
    adresseMiniature: adresseMiniature,
    originePhotos: originePhotos,
    encoderPanier: encoderPanier,
    decoderPanier: decoderPanier,
    lireAdresse: lireAdresse,
    formaterNombre: formaterNombre,
    formaterWhatsApp: formaterWhatsApp,
    jourEnClair: jourEnClair,
    lignesDuPanier: lignesDuPanier,
    totalPanier: totalPanier,
    nombreArticles: nombreArticles,
    texteWhatsApp: texteWhatsApp,
    lienWhatsApp: lienWhatsApp,
    lienApplication: lienApplication,
    lienChrome: lienChrome,
    estNavigateurIntegre: estNavigateurIntegre,
  };
})(typeof self !== 'undefined' ? self : this);
