/*
 * SigmaMarket · les numéros de téléphone, pays par pays, pour les pages des clients (D64).
 *
 * FICHIER FABRIQUÉ : ne pas le modifier ici. Il vient de outils/pages/numero-modele.js (les règles)
 * et de src/domain/pays-numeros.ts + libphonenumber-js (les pays, les drapeaux, les formes de numéro),
 * par `npm run pages:numeros`. tests/domain/numero-page.test.ts refuse un fichier qui n'est plus celui
 * que cette commande écrirait, et compare ses réponses à celles de l'application sur des milliers
 * de numéros.
 *
 * ES2015, sans dépendance. Expose `VitrineNumero` sur l'objet global.
 *
 * Un pays : c = code, i = indicatif, n = nom, l = nombre de chiffres, g = groupes de lecture,
 * d = début d'un mobile typique, m = forme d'un numéro du pays (expression régulière), t = zéro de
 * l'appel local, q = ce qu'on retire en tête en appelant dans le pays (expression régulière),
 * r = comment on recolle ce qui reste, f = dessin du drapeau (cadre de 60 x 40).
 */
(function (racine) {
  'use strict';

  var PAYS = [{"c":"CI","i":"225","n":"Côte d'Ivoire","l":[10],"g":[2,2,2,2,2],"d":"07","m":"[02]\\d{9}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#F77F00"],["r",20,0,20.4,40,"#FFFFFF"],["r",40,0,20.4,40,"#009E60"]]},{"c":"SN","i":"221","n":"Sénégal","l":[9],"g":[2,3,2,2],"d":"77","m":"(?:[378]\\d|93)\\d{7}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#00853F"],["r",20,0,20.4,40,"#FDEF42"],["r",40,0,20.4,40,"#E31B23"],["p","30,12 31.8,17.53 37.61,17.53 32.91,20.94 34.7,26.47 30,23.06 25.3,26.47 27.09,20.94 22.39,17.53 28.2,17.53","#00853F"]]},{"c":"ML","i":"223","n":"Mali","l":[8],"g":[2,2,2,2],"d":"7","m":"[24-9]\\d{7}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#14B53A"],["r",20,0,20.4,40,"#FCD116"],["r",40,0,20.4,40,"#CE1126"]]},{"c":"BF","i":"226","n":"Burkina Faso","l":[8],"g":[2,2,2,2],"d":"7","m":"[024-7]\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,20.4,"#EF2B2D"],["r",0,20,60,20.4,"#009E49"],["p","30,12 32.02,18.22 38.56,18.22 33.27,22.06 35.29,28.28 30,24.44 24.71,28.28 26.73,22.06 21.44,18.22 27.98,18.22","#FCD116"]]},{"c":"GN","i":"224","n":"Guinée","l":[9],"g":[3,2,2,2],"d":"6","m":"722\\d{6}|(?:3|6\\d)\\d{7}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#CE1126"],["r",20,0,20.4,40,"#FCD116"],["r",40,0,20.4,40,"#009460"]]},{"c":"GH","i":"233","n":"Ghana","l":[9],"g":[2,3,4],"d":"24","m":"[235]\\d{8}|800\\d{5,6}","t":"0","q":"","r":"","f":[["r",0,0,60,13.733333333333334,"#CE1126"],["r",0,13.333333333333334,60,13.733333333333334,"#FCD116"],["r",0,26.666666666666668,60,13.733333333333334,"#006B3F"],["p","30,14.5 31.46,18.99 36.18,18.99 32.36,21.77 33.82,26.26 30,23.48 26.18,26.26 27.64,21.77 23.82,18.99 28.54,18.99","#000000"]]},{"c":"TG","i":"228","n":"Togo","l":[8],"g":[2,2,2,2],"d":"9","m":"[279]\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,8.3,"#006A4E"],["r",0,8,60,8.3,"#FFCE00"],["r",0,16,60,8.3,"#006A4E"],["r",0,24,60,8.3,"#FFCE00"],["r",0,32,60,8.3,"#006A4E"],["r",0,0,24,24,"#D21034"],["p","12,5.5 13.57,10.34 18.66,10.34 14.54,13.33 16.11,18.16 12,15.17 7.89,18.16 9.46,13.33 5.34,10.34 10.43,10.34","#FFFFFF"]]},{"c":"BJ","i":"229","n":"Bénin","l":[10],"g":[2,2,2,2,2],"d":"01","m":"(?:01\\d|8)\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,20,"#FCD116"],["r",0,20,60,20,"#E8112D"],["r",0,0,22,40,"#008751"]]},{"c":"NE","i":"227","n":"Niger","l":[8],"g":[2,2,2,2],"d":"9","m":"[027-9]\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,13.733333333333334,"#E05206"],["r",0,13.333333333333334,60,13.733333333333334,"#FFFFFF"],["r",0,26.666666666666668,60,13.733333333333334,"#0DB02B"],["c",30,20,5.2,"#E05206"]]},{"c":"CM","i":"237","n":"Cameroun","l":[9],"g":[1,2,2,2,2],"d":"6","m":"[26]\\d{8}|88\\d{6,7}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#007A5E"],["r",20,0,20.4,40,"#CE1126"],["r",40,0,20.4,40,"#FCD116"],["p","30,13.5 31.57,18.34 36.66,18.34 32.54,21.33 34.11,26.16 30,23.17 25.89,26.16 27.46,21.33 23.34,18.34 28.43,18.34","#FCD116"]]},{"c":"NG","i":"234","n":"Nigéria","l":[10],"g":[3,3,4],"d":"803","m":"(?:20|9\\d)\\d{8}|[78]\\d{9,13}","t":"0","q":"","r":"","f":[["r",0,0,20.4,40,"#008751"],["r",20,0,20.4,40,"#FFFFFF"],["r",40,0,20.4,40,"#008751"]]},{"c":"FR","i":"33","n":"France","l":[9],"g":[1,2,2,2,2],"d":"6","m":"[1-9]\\d{8}","t":"0","q":"","r":"","f":[["r",0,0,20.4,40,"#0055A4"],["r",20,0,20.4,40,"#FFFFFF"],["r",40,0,20.4,40,"#EF4135"]]},{"c":"MR","i":"222","n":"Mauritanie","l":[8],"g":[2,2,2,2],"d":"3","m":"(?:[2-4]\\d\\d|800)\\d{5}","t":"","q":"","r":"","f":[["r",0,0,60,40,"#006233"],["r",0,0,60,5,"#D01C1F"],["r",0,35,60,5,"#D01C1F"],["c",30,17,10,"#FFD700"],["c",30,17,8.2,"#006233"],["c",30,12.5,8.4,"#006233"],["p","30,11.5 30.9,14.26 33.8,14.26 31.45,15.97 32.35,18.74 30,17.03 27.65,18.74 28.55,15.97 26.2,14.26 29.1,14.26","#FFD700"]]},{"c":"GM","i":"220","n":"Gambie","l":[7],"g":[3,4],"d":"3","m":"[48]\\d{8}|[2-9]\\d{6}","t":"","q":"","r":"","f":[["r",0,0,60,13.4,"#CE1126"],["r",0,13,60,2.4,"#FFFFFF"],["r",0,15,60,10.4,"#0C1C8C"],["r",0,25,60,2.4,"#FFFFFF"],["r",0,27,60,13.4,"#3A7728"]]},{"c":"GW","i":"245","n":"Guinée-Bissau","l":[9],"g":[3,2,2,2],"d":"95","m":"[49]\\d{8}|4\\d{6}","t":"","q":"","r":"","f":[["r",0,0,60,20,"#FCD116"],["r",0,20,60,20,"#009E49"],["r",0,0,20,40,"#CE1126"],["p","10,14.5 11.46,18.99 16.18,18.99 12.36,21.77 13.82,26.26 10,23.48 6.18,26.26 7.64,21.77 3.82,18.99 8.54,18.99","#000000"]]},{"c":"SL","i":"232","n":"Sierra Leone","l":[8],"g":[2,2,2,2],"d":"76","m":"(?:[237-9]\\d|66)\\d{6}","t":"0","q":"","r":"","f":[["r",0,0,60,13.733333333333334,"#1EB53A"],["r",0,13.333333333333334,60,13.733333333333334,"#FFFFFF"],["r",0,26.666666666666668,60,13.733333333333334,"#0072C6"]]},{"c":"LR","i":"231","n":"Libéria","l":[9,7],"g":[2,3,4],"d":"77","m":"(?:[2457]\\d|33|88)\\d{7}|(?:2\\d|[4-6])\\d{6}","t":"0","q":"","r":"","f":[["r",0,0,60,3.936363636363636,"#BF0A30"],["r",0,3.6363636363636362,60,3.936363636363636,"#FFFFFF"],["r",0,7.2727272727272725,60,3.936363636363636,"#BF0A30"],["r",0,10.909090909090908,60,3.936363636363636,"#FFFFFF"],["r",0,14.545454545454545,60,3.936363636363636,"#BF0A30"],["r",0,18.18181818181818,60,3.936363636363636,"#FFFFFF"],["r",0,21.818181818181817,60,3.936363636363636,"#BF0A30"],["r",0,25.454545454545453,60,3.936363636363636,"#FFFFFF"],["r",0,29.09090909090909,60,3.936363636363636,"#BF0A30"],["r",0,32.72727272727273,60,3.936363636363636,"#FFFFFF"],["r",0,36.36363636363636,60,3.936363636363636,"#BF0A30"],["r",0,0,18.18181818181818,18.18181818181818,"#002868"],["p","9.09,3.09 10.44,7.24 14.8,7.24 11.27,9.8 12.62,13.95 9.09,11.38 5.56,13.95 6.91,9.8 3.38,7.24 7.74,7.24","#FFFFFF"]]},{"c":"CV","i":"238","n":"Cap-Vert","l":[7],"g":[3,2,2],"d":"9","m":"(?:[2-59]\\d\\d|800)\\d{4}","t":"","q":"","r":"","f":[["r",0,0,60,40,"#003893"],["r",0,21,60,3.5,"#FFFFFF"],["r",0,24.5,60,3.5,"#CF2027"],["r",0,28,60,3.5,"#FFFFFF"],["c",32,26,1.4,"#FCD116"],["c",30.09,31.88,1.4,"#FCD116"],["c",25.09,35.51,1.4,"#FCD116"],["c",18.91,35.51,1.4,"#FCD116"],["c",13.91,31.88,1.4,"#FCD116"],["c",12,26,1.4,"#FCD116"],["c",13.91,20.12,1.4,"#FCD116"],["c",18.91,16.49,1.4,"#FCD116"],["c",25.09,16.49,1.4,"#FCD116"],["c",30.09,20.12,1.4,"#FCD116"]]},{"c":"GA","i":"241","n":"Gabon","l":[8],"g":[2,2,2,2],"d":"6","m":"(?:[067]\\d|11)\\d{6}|[2-7]\\d{6}","t":"","q":"0(11\\d{6}|60\\d{6}|61\\d{6}|6[256]\\d{6}|7[467]\\d{6})","r":"$1","f":[["r",0,0,60,13.733333333333334,"#009E60"],["r",0,13.333333333333334,60,13.733333333333334,"#FCD116"],["r",0,26.666666666666668,60,13.733333333333334,"#3A75C4"]]},{"c":"CG","i":"242","n":"Congo","l":[9],"g":[2,3,2,2],"d":"06","m":"222\\d{6}|(?:0\\d|80)\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,40,"#FBDE4A"],["p","0,0 44,0 0,29","#009543"],["p","60,40 16,40 60,11","#DC241F"]]},{"c":"CD","i":"243","n":"République démocratique du Congo","l":[9],"g":[3,3,3],"d":"81","m":"(?:(?:[189]|5\\d)\\d|2)\\d{7}|[1-68]\\d{6}","t":"0","q":"","r":"","f":[["r",0,0,60,40,"#007FFF"],["l",-4,44,64,-4,11,"#FCD116"],["l",-4,44,64,-4,7,"#CE1021"],["p","10,3.5 11.46,7.99 16.18,7.99 12.36,10.77 13.82,15.26 10,12.48 6.18,15.26 7.64,10.77 3.82,7.99 8.54,7.99","#FCD116"]]},{"c":"TD","i":"235","n":"Tchad","l":[8],"g":[2,2,2,2],"d":"6","m":"(?:22|[3689]\\d|77)\\d{6}","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#002664"],["r",20,0,20.4,40,"#FECB00"],["r",40,0,20.4,40,"#C60C30"]]},{"c":"CF","i":"236","n":"Centrafrique","l":[8],"g":[2,2,2,2],"d":"7","m":"8776\\d{4}|(?:[27]\\d|61)\\d{6}","t":"","q":"","r":"","f":[["r",0,0,60,10.4,"#003082"],["r",0,10,60,10.4,"#FFFFFF"],["r",0,20,60,10.4,"#289728"],["r",0,30,60,10.4,"#FFCE00"],["r",26,0,8,40,"#D21034"],["p","9,1.4 9.81,3.89 12.42,3.89 10.31,5.42 11.12,7.91 9,6.38 6.88,7.91 7.69,5.42 5.58,3.89 8.19,3.89","#FFCE00"]]},{"c":"MA","i":"212","n":"Maroc","l":[9],"g":[1,2,2,2,2],"d":"6","m":"[5-8]\\d{8}","t":"0","q":"","r":"","f":[["r",0,0,60,40,"#C1272D"],["q","30,10 36.47,29.9 19.54,17.6 40.46,17.6 23.53,29.9",1.8,"#006233"]]},{"c":"DZ","i":"213","n":"Algérie","l":[9],"g":[1,2,2,2,2],"d":"5","m":"(?:[1-4]|[5-79]\\d|80)\\d{7}","t":"0","q":"","r":"","f":[["r",0,0,30.4,40,"#006233"],["r",30,0,30.4,40,"#FFFFFF"],["c",30,20,11,"#D21034"],["c",33.6,20,9.02,"#FFFFFF"],["p","33.5,15.4 34.53,18.58 37.87,18.58 35.17,20.54 36.2,23.72 33.5,21.76 30.8,23.72 31.83,20.54 29.13,18.58 32.47,18.58","#D21034"]]},{"c":"TN","i":"216","n":"Tunisie","l":[8],"g":[2,3,3],"d":"2","m":"[2-57-9]\\d{7}","t":"","q":"","r":"","f":[["r",0,0,60,40,"#E70013"],["c",30,20,12,"#FFFFFF"],["c",29.5,20,9.6,"#E70013"],["c",31.6,20,7.8,"#FFFFFF"],["p","32,15.8 32.94,18.7 35.99,18.7 33.53,20.5 34.47,23.4 32,21.6 29.53,23.4 30.47,20.5 28.01,18.7 31.06,18.7","#E70013"]]},{"c":"BE","i":"32","n":"Belgique","l":[9],"g":[3,2,2,2],"d":"47","m":"4\\d{8}|[1-9]\\d{7}","t":"0","q":"","r":"","f":[["r",0,0,20.4,40,"#000000"],["r",20,0,20.4,40,"#FDDA24"],["r",40,0,20.4,40,"#EF3340"]]},{"c":"CH","i":"41","n":"Suisse","l":[9],"g":[2,3,2,2],"d":"78","m":"8\\d{11}|[2-9]\\d{8}","t":"0","q":"","r":"","f":[["r",0,0,60,40,"#DA291C"],["r",26,8,8,24,"#FFFFFF"],["r",18,16,24,8,"#FFFFFF"]]},{"c":"CA","i":"1","n":"Canada","l":[10],"g":[3,3,4],"d":"514","m":"[2-9]\\d{9}|3\\d{6}","t":"1","q":"","r":"","f":[["r",0,0,60,40,"#FFFFFF"],["r",0,0,15,40,"#D52B1E"],["r",45,0,15,40,"#D52B1E"],["p","30,6 32.4,12 36.6,10.2 35,18 39,16.6 37.4,20.6 41,23 31.2,25 31.2,33 28.8,33 28.8,25 19,23 22.6,20.6 21,16.6 25,18 23.4,10.2 27.6,12","#D52B1E"]]},{"c":"US","i":"1","n":"États-Unis","l":[10],"g":[3,3,4],"d":"202","m":"[2-9]\\d{9}|3\\d{6}","t":"1","q":"","r":"","f":[["r",0,0,60,3.376923076923077,"#B22234"],["r",0,3.076923076923077,60,3.376923076923077,"#FFFFFF"],["r",0,6.153846153846154,60,3.376923076923077,"#B22234"],["r",0,9.230769230769232,60,3.376923076923077,"#FFFFFF"],["r",0,12.307692307692308,60,3.376923076923077,"#B22234"],["r",0,15.384615384615385,60,3.376923076923077,"#FFFFFF"],["r",0,18.461538461538463,60,3.376923076923077,"#B22234"],["r",0,21.53846153846154,60,3.376923076923077,"#FFFFFF"],["r",0,24.615384615384617,60,3.376923076923077,"#B22234"],["r",0,27.692307692307693,60,3.376923076923077,"#FFFFFF"],["r",0,30.76923076923077,60,3.376923076923077,"#B22234"],["r",0,33.84615384615385,60,3.376923076923077,"#FFFFFF"],["r",0,36.92307692307693,60,3.376923076923077,"#B22234"],["r",0,0,26,21.53846153846154,"#3C3B6E"],["c",4,3.5,1.1,"#FFFFFF"],["c",4,8,1.1,"#FFFFFF"],["c",4,12.5,1.1,"#FFFFFF"],["c",4,17,1.1,"#FFFFFF"],["c",10,3.5,1.1,"#FFFFFF"],["c",10,8,1.1,"#FFFFFF"],["c",10,12.5,1.1,"#FFFFFF"],["c",10,17,1.1,"#FFFFFF"],["c",16,3.5,1.1,"#FFFFFF"],["c",16,8,1.1,"#FFFFFF"],["c",16,12.5,1.1,"#FFFFFF"],["c",16,17,1.1,"#FFFFFF"],["c",22,3.5,1.1,"#FFFFFF"],["c",22,8,1.1,"#FFFFFF"],["c",22,12.5,1.1,"#FFFFFF"],["c",22,17,1.1,"#FFFFFF"]]},{"c":"GB","i":"44","n":"Royaume-Uni","l":[10],"g":[4,6],"d":"7911","m":"[1-357-9]\\d{9}|[18]\\d{8}|8\\d{6}","t":"0","q":"0|180020","r":"","f":[["r",0,0,60,40,"#012169"],["l",0,0,60,40,7,"#FFFFFF"],["l",0,40,60,0,7,"#FFFFFF"],["l",0,0,60,40,2.4,"#C8102E"],["l",0,40,60,0,2.4,"#C8102E"],["l",30,0,30,40,13,"#FFFFFF"],["l",0,20,60,20,13,"#FFFFFF"],["l",30,0,30,40,7.5,"#C8102E"],["l",0,20,60,20,7.5,"#C8102E"]]},{"c":"DE","i":"49","n":"Allemagne","l":[10,11],"g":[3,3,4],"d":"151","m":"[2579]\\d{5,14}|49(?:[34]0|69|8\\d)\\d\\d?|49(?:37|49|60|7[089]|9\\d)\\d{1,3}|49(?:2[024-9]|3[2-689]|7[1-7])\\d{1,8}|(?:1|[368]\\d|4[0-8])\\d{3,13}|49(?:[015]\\d|2[13]|31|[46][1-8])\\d{1,9}","t":"0","q":"","r":"","f":[["r",0,0,60,13.733333333333334,"#000000"],["r",0,13.333333333333334,60,13.733333333333334,"#DD0000"],["r",0,26.666666666666668,60,13.733333333333334,"#FFCE00"]]},{"c":"IT","i":"39","n":"Italie","l":[10],"g":[3,3,4],"d":"320","m":"0\\d{5,11}|1\\d{8,10}|3(?:[0-8]\\d{7,10}|9\\d{7,8})|(?:43|55|70)\\d{8}|8\\d{5}(?:\\d{2,4})?","t":"","q":"","r":"","f":[["r",0,0,20.4,40,"#009246"],["r",20,0,20.4,40,"#FFFFFF"],["r",40,0,20.4,40,"#CE2B37"]]},{"c":"ES","i":"34","n":"Espagne","l":[9],"g":[3,2,2,2],"d":"612","m":"(?:400|[5-9]\\d\\d)\\d{6}","t":"","q":"","r":"","f":[["r",0,0,60,10.4,"#AA151B"],["r",0,10,60,20.4,"#F1BF00"],["r",0,30,60,10.4,"#AA151B"]]},{"c":"PT","i":"351","n":"Portugal","l":[9],"g":[3,3,3],"d":"912","m":"1693\\d{5}|(?:[26-9]\\d|30)\\d{7}","t":"","q":"","r":"","f":[["r",0,0,24,40,"#006600"],["r",24,0,36,40,"#FF0000"],["c",24,20,7.5,"#FCD116"],["c",24,20,4.6,"#FF0000"],["c",24,20,2.6,"#FFFFFF"]]},{"c":"LB","i":"961","n":"Liban","l":[8],"g":[2,3,3],"d":"71","m":"[27-9]\\d{7}|[13-9]\\d{6}","t":"0","q":"","r":"","f":[["r",0,0,60,10.4,"#ED1C24"],["r",0,10,60,20.4,"#FFFFFF"],["r",0,30,60,10.4,"#ED1C24"],["p","30,9 34.6,17 32.2,17 36.4,24 32.2,24 31.2,29 28.8,29 27.8,24 23.6,24 27.8,17 25.4,17","#00A651"]]},{"c":"CN","i":"86","n":"Chine","l":[11],"g":[3,4,4],"d":"139","m":"(?:(?:1[03-689]|2\\d)\\d\\d|6)\\d{8}|1\\d{10}|[126]\\d{6}(?:\\d(?:\\d{2})?)?|86\\d{5,6}|(?:[3-579]\\d|8[0-57-9])\\d{5,9}","t":"0","q":"(1(?:[12]\\d|79)\\d\\d)|0","r":"","f":[["r",0,0,60,40,"#DE2910"],["p","11,4 12.57,8.84 17.66,8.84 13.54,11.83 15.11,16.66 11,13.67 6.89,16.66 8.46,11.83 4.34,8.84 9.43,8.84","#FCD116"],["p","22,2.3 22.49,3.82 24.09,3.82 22.8,4.76 23.29,6.28 22,5.34 20.71,6.28 21.2,4.76 19.91,3.82 21.51,3.82","#FCD116"],["p","26,7.3 26.49,8.82 28.09,8.82 26.8,9.76 27.29,11.28 26,10.34 24.71,11.28 25.2,9.76 23.91,8.82 25.51,8.82","#FCD116"],["p","26,13.8 26.49,15.32 28.09,15.32 26.8,16.26 27.29,17.78 26,16.84 24.71,17.78 25.2,16.26 23.91,15.32 25.51,15.32","#FCD116"],["p","22,18.8 22.49,20.32 24.09,20.32 22.8,21.26 23.29,22.78 22,21.84 20.71,22.78 21.2,21.26 19.91,20.32 21.51,20.32","#FCD116"]]}];

  var CHIFFRES_MAX = 15;

  function chiffres(texte) {
    return String(texte || '').replace(/\D/g, '');
  }

  function pays(code) {
    for (var k = 0; k < PAYS.length; k++) if (PAYS[k].c === code) return PAYS[k];
    return PAYS[0];
  }

  function estCode(code) {
    for (var k = 0; k < PAYS.length; k++) if (PAYS[k].c === code) return true;
    return false;
  }

  /** Les chiffres groupés comme on les lit : « 0707123456 » → « 07 07 12 34 56 ». */
  function grouper(texte, groupes) {
    var morceaux = [];
    var i = 0;
    for (var k = 0; k < groupes.length; k++) {
      if (i >= texte.length) break;
      morceaux.push(texte.slice(i, i + groupes[k]));
      i += groupes[k];
    }
    while (i < texte.length) {
      morceaux.push(texte.slice(i, i + 2));
      i += 2;
    }
    return morceaux.join(' ');
  }

  /** L'exemple pâle du clavier : « 07 00 00 00 00 ». */
  function exemple(code) {
    var p = pays(code);
    var texte = p.d;
    while (texte.length < p.l[0]) texte += '0';
    return grouper(texte, p.g);
  }

  function correspond(motif, texte) {
    return new RegExp('^(?:' + motif + ')$').test(texte);
  }

  /**
   * Les façons de lire des chiffres tapés comme un numéro national : tels quels, sans l'indicatif
   * s'il est tapé, sans le zéro de l'appel local, ou comme le pays les recolle (q, r).
   */
  function lectures(d, p) {
    var l = [d];
    var sansIndicatif = d.indexOf(p.i) === 0 ? d.slice(p.i.length) : null;
    var bases = sansIndicatif === null ? [d] : [d, sansIndicatif];
    for (var k = 0; k < bases.length; k++) {
      var b = bases[k];
      if (k > 0) l.push(b);
      if (p.q) {
        var re = new RegExp('^(?:' + p.q + ')');
        var m = re.exec(b);
        if (m) {
          var groupes = m.length > 1 && m[m.length - 1];
          if (p.r && groupes) l.push(b.replace(re, p.r));
          else l.push(b.slice(m[0].length));
        }
      } else if (p.t && b.indexOf(p.t) === 0) {
        l.push(b.slice(p.t.length));
      }
    }
    return l;
  }

  /**
   * Les chiffres tapés, sans l'indicatif s'il a été tapé en trop et sans le chiffre qu'on compose en
   * plus en appelant dans le pays : ce qui se compte pour dire « il manque des chiffres ».
   */
  function chiffresDuPays(d, p) {
    var n = d;
    var plus = Math.max.apply(null, p.l) + p.t.length;
    if (n.indexOf(p.i) === 0 && n.length > plus) n = n.slice(p.i.length);
    if (p.t && n.indexOf(p.t) === 0) n = n.slice(p.t.length);
    return n;
  }

  /**
   * Regarde ce qui est tapé pour ce pays : vide, bon, court (il manque des chiffres), long (trop de
   * chiffres) ou faux (le début ne ressemble pas à un numéro du pays). Comme analyserSaisie de
   * src/domain/telephone.ts. `e164` : l'indicatif et les chiffres, sans « + » (« 2250707123456 »).
   */
  function analyser(saisie, code) {
    var p = pays(code);
    var d = chiffres(saisie);
    var resultat = function (etat, e164, longueur) {
      return { etat: etat, e164: e164, pays: p.c, chiffres: d, attendus: p.l, longueur: longueur };
    };
    if (d === '') return resultat('vide', null, 0);
    // « 00 » est le début d'un appel international, pas d'un numéro du pays.
    var l = d.indexOf('00') === 0 ? [d] : lectures(d, p);
    for (var k = 0; k < l.length && d.indexOf('00') !== 0; k++) {
      if (!correspond(p.m, l[k])) continue;
      // Aucun numéro ivoirien ne commence par 225 : c'est un indicatif tapé, et pas fini.
      if (p.c === 'CI' && l[k].indexOf('225') === 0) continue;
      return resultat('bon', p.i + l[k], chiffresDuPays(d, p).length);
    }
    var national = chiffresDuPays(d, p);
    var plus = Math.max.apply(null, p.l);
    var moins = Math.min.apply(null, p.l);
    if (national.length < moins) return resultat('court', null, national.length);
    if (national.length > plus) return resultat('long', null, national.length);
    return resultat('faux', null, national.length);
  }

  /** Le pays d'un numéro international (chiffres sans « + »), ou null : le premier de la liste qui a cet indicatif. */
  function paysDe(e164) {
    var d = chiffres(e164);
    var meilleur = null;
    for (var k = 0; k < PAYS.length; k++) {
      var p = PAYS[k];
      if (d.indexOf(p.i) === 0 && (meilleur === null || p.i.length > meilleur.i.length)) meilleur = p;
    }
    return meilleur;
  }

  /** 2250707123456 → « +225 07 07 12 34 56 » ; un pays qui n'est pas dans la liste : « +… » en trois par trois. */
  function formater(e164) {
    var d = chiffres(e164);
    var p = paysDe(d);
    if (p === null) return '+' + grouper(d, [3, 3, 3]);
    return '+' + p.i + ' ' + grouper(d.slice(p.i.length), p.g);
  }

  /**
   * Ce qu'une page remet dans son clavier d'un numéro déjà donné : un numéro international
   * (« 2250707123456 »), ou, pour les pages d'avant, un numéro du pays du vendeur qui commence par 0.
   * Rend { pays, national }.
   */
  function depuis(enregistre, paysParDefaut) {
    var d = chiffres(enregistre);
    var secours = estCode(paysParDefaut) ? paysParDefaut : PAYS[0].c;
    if (d === '') return { pays: secours, national: '' };
    if (d.charAt(0) === '0') return { pays: secours, national: d };
    var p = paysDe(d);
    if (p === null) return { pays: secours, national: d };
    return { pays: p.c, national: d.slice(p.i.length) };
  }

  /** Le nombre de chiffres à montrer et à dire : la plus petite longueur permise qui n'est pas dépassée, sinon la plus grande. */
  function attenduPour(attendus, longueur) {
    var tries = attendus.slice().sort(function (a, b) { return a - b; });
    for (var k = 0; k < tries.length; k++) if (tries[k] >= longueur) return tries[k];
    return tries[tries.length - 1];
  }

  /** Ce que la page dit d'un numéro refusé. */
  function texteRefus(analyse) {
    var attendu = attenduPour(analyse.attendus, analyse.longueur);
    if (analyse.etat === 'court') return 'Il manque des chiffres. Dans ce pays, un numéro a ' + attendu + ' chiffres.';
    if (analyse.etat === 'long') return 'Il y a trop de chiffres. Dans ce pays, un numéro a ' + attendu + ' chiffres.';
    return 'Ce numéro n’est pas bon. Regarde le pays et les premiers chiffres.';
  }

  racine.VitrineNumero = {
    PAYS: PAYS,
    CHIFFRES_MAX: CHIFFRES_MAX,
    chiffres: chiffres,
    pays: pays,
    estCode: estCode,
    grouper: grouper,
    exemple: exemple,
    analyser: analyser,
    paysDe: paysDe,
    formater: formater,
    depuis: depuis,
    attenduPour: attenduPour,
    texteRefus: texteRefus,
  };
})(typeof self !== 'undefined' ? self : this);
