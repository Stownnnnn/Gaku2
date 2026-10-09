/* =====================================================================
   CROC — SPRITES : le pixel art des personnages, partagé par tout le site
   (app.js : PSYCHÉ, combat, titre, menu, sauvegarde ; balade.js : BALADE).
   - Croc et Eilyn : tableaux de pixels (1 caractère = 1 pixel, « . » = vide),
     une palette par personnage, ombrage en 3 tons, lumière en haut à gauche.
   - PNJ : petit générateur commenté (coiffures, tenues, accessoires, palettes).
   - Monstre de la scène de combat et marteau : dessin procédural pixel par pixel.
   Aucun fait inventé : apparence d'après les illustrations de référence.
   ===================================================================== */
window.CROC_SPRITES=(()=>{
'use strict';
const S={pal:{}};
/* ---------- Croc, vue de dessus 16×24 (PSYCHÉ, titre, menu, combat, sauvegarde) ----------
   frames : 0 repos · 1 souffle (la tête et les épaules s'abaissent d'1 px) · 2-5 marche (contact, passage, contact, passage)
   lumière en haut à gauche, 3 tons par matière ; « profil » regarde vers la gauche (miroir pour la droite) */
S.pal.croc={"o": "#0b0a10", "h": "#f4fbfd", "H": "#bcdde7", "I": "#7aa6b8", "J": "#4e7488", "s": "#e3d7cc", "S": "#b9a497", "T": "#8a7470", "e": "#e0243c", "E": "#3a0a14", "r": "#a8142c", "k": "#050408", "m": "#7a5450", "c": "#2c2442", "C": "#463a62", "D": "#5e5080", "d": "#17121f", "g": "#cdb27a", "b": "#efe7d6", "B": "#b3a893", "p": "#241e31", "P": "#3a3150", "q": "#120e18", "f": "#dbe5ee", "F": "#8a97a9", "w": "#5c6678"};
S.croc={down:[
 [".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....",".....dCCccd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccgccdcqo",".oCDcdCccccdcdqo",".oCcBdCcccccdcqo",".obBbdCcccccdBbo",".oBbBdcccccccbBo","..bb.dcccccccbb.","....qpPp.pPpq...","....qpPp.pPpq...","....fFff.ffFf...","....wwww.wwww..."],
 ["................",".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....","...oddCCccddo...","..oCCDcccccdco..",".oCDcCcccgccdcqo",".oCDcdCccccdcdqo",".oCcBdCcccccdcqo",".obBbdCcccccdBbo",".oBbBdcccccccbBo","..bb.dcccccccbb.","....qpPp.pPpq...","....qpPp.pPpq...","....fFff.ffFf...","....wwww.wwww..."],
 ["................",".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....",".....dCCccd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccgccdcqo","..CDcdCccccdcdqo",".oCcBdCcccccdcqo",".obBbdCcccccdBbo",".oBbBdcccccccbBo",".obbqdcccccccbb.","....fFff.pPpq...","....wwww.ffFf...","..........www..."],
 [".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....",".....dCCccd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccgccdcqo",".oCDcdCccccdcdqo",".oCcBdCcccccdcqo",".obBbdCcccccdBbo",".oBbBdcccccccbBo","..bb.dcccccccbb.","....qpPpppPpq...","....qpPpppPpq...",".....fFfffFf....",".....wwwwwww...."],
 ["................",".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....",".....dCCccd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccgccdcqo",".oCDcdCccccdc.q.",".oCcBdCcccccddqo",".obBbdCcccccdcbo",".oBbBdcccccccBBo","..bbqdcccccccbbo","....qpPp.ffFf...","....fFff.wwww...","....www........."],
 [".....h..h..h....","...h.hh.hhhh.h..","...hhhhhhhhhhhh.","..hhhHhhhhhhHhhh",".hhHhhHhhhhHhhHh","..IHHhHHhhHHhHI.","..JIHsHssssHsIJ.","..JIsEesseEsIJ..","...ISrssssssSI..","...kTssssssTk...","....TSsTTsST....",".....dCCccd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccgccdcqo",".oCDcdCccccdcdqo",".oCcBdCcccccdcqo",".obBbdCcccccdBbo",".oBbBdcccccccbBo","..bb.dcccccccbb.","....qpPpppPpq...","....qpPpppPpq...",".....fFfffFf....",".....wwwwwww...."]
],up:[
 ["....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....",".....dJJJJd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccccdcqo.",".oCDcdCccdcdcdqo",".oCcBdCccdccdcqo",".obBbdCccdccdBbo",".oBbBdcccdcccbBo","..bb.dcccdccdbb.","....qpPp.pPpq...","....qpPp.pPpq...","....fFff.ffFf...","....wwww.wwww..."],
 ["................","....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....","...oddJJJJddo...","..oCCDcccccdco..",".oCDcCcccccdcqo.",".oCDcdCccdcdcdqo",".oCcBdCccdccdcqo",".obBbdCccdccdBbo",".oBbBdcccdcccbBo","..bb.dcccdccdbb.","....qpPp.pPpq...","....qpPp.pPpq...","....fFff.ffFf...","....wwww.wwww..."],
 ["................","....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....",".....dJJJJd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccccdcqo.","..CDcdCccdcdcdqo",".oCcBdCccdccdcqo",".obBbdCccdccdBbo",".oBbBdcccdcccbBo",".obbqdcccdccdbb.","....fFff.pPpq...","....wwww.ffFf...","..........www..."],
 ["....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....",".....dJJJJd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccccdcqo.",".oCDcdCccdcdcdqo",".oCcBdCccdccdcqo",".obBbdCccdccdBbo",".oBbBdcccdcccbBo","..bb.dcccdccdbb.","....qpPpppPpq...","....qpPpppPpq...",".....fFfffFf....",".....wwwwwww...."],
 ["................","....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....",".....dJJJJd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccccdcqo.",".oCDcdCccdcdc.q.",".oCcBdCccdccddqo",".obBbdCccdccdcbo",".oBbBdcccdcccBBo","..bbqdcccdccdbbo","....qpPp.ffFf...","....fFff.wwww...","....www........."],
 ["....h..h.h..h...","...hhh.hhhhhhh..","..hhhhhhhhhhhhh.",".hhHhhhhhhhhhHhh","..hHHhHhhHhHHHh.",".IHHIHhHHhHhIHHI","..IHHIHhhHIHHHI.","..IIHIHHHHIHIII.","...kIJIHHIJIk...","...TJIJJJJIJT...","....JIJJJJIJ....",".....dJJJJd.....","...odCCCCccdo...","..oCCDcccccdco..",".oCDcCcccccdcqo.",".oCDcdCccdcdcdqo",".oCcBdCccdccdcqo",".obBbdCccdccdBbo",".oBbBdcccdcccbBo","..bb.dcccdccdbb.","....qpPpppPpq...","....qpPpppPpq...",".....fFfffFf....",".....wwwwwww...."]
],left:[
 [".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCd.........","....dCCCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bb.dccccdo...",".....qpPpPq.....",".....qpPpPq.....","....fFffFf......","....wwwww......."],
 ["................",".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCdCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bb.dccccdo...",".....qpPpPq.....",".....qpPpPq.....","....fFffFf......","....wwwww......."],
 ["................",".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCd.........","....dCCCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bbpdccccdo...","...qpPp...qpPq..","..fFff....fFff..","..www......www.."],
 [".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCd.........","....dCCCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bb.dccccdo...",".....qpPpPq.....",".....qpPpq......","....fFfFfq......","....wwwwww......"],
 ["................",".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCd.........","....dCCCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bbpdccccdo...","...qpPp...qpPq..","..fFff....fFff..","..www......www.."],
 [".......h..h.....","......hhhhhh.h..",".....hhhhhhhhh..","....hhhHhhhhhhhh","...hhHhhhhHhhhh.","...hHhHhhhHHhIh.","...IHsHhhhIHI...","..sEesIhhIHhJ...","..ssssIkHIJ.....","..Trsss.kJ......","...TssS.........","....dCd.........","....dCCCcd......","...oCDcccccdo...","..oCDcgcccccdo..","..oCDccccccdqo..","..oCcDcccccdqo..","..obBdcccccdqo..","..oBbBccccccdo..","...bb.dccccdo...",".....qpPpPq.....",".....qpPpq......","....fFfFfq......","....wwwwww......"]
]};
S.crocDy=[0,0,1,0,1,0];
/* ---------- Eilyn : face 16×24 (lit, souffle, mèche, page, page, marche ×4) et profil 18×30 pour la BALADE ---------- */
S.pal.eilyn={"o": "#2a2533", "h": "#eef3f4", "H": "#c4cfd5", "I": "#8d9ba5", "s": "#f0dccf", "S": "#cfb2a3", "e": "#4a6cf0", "E": "#26305e", "t": "#f6f5f0", "T": "#c9ced8", "c": "#dccfb6", "C": "#b3a488", "K": "#7f715c", "w": "#f0e7d4", "k": "#1d1f2b", "B": "#454a68", "x": "#fbfbf6", "p": "#3b3a48", "P": "#52506a", "f": "#262330", "F": "#4a4658"};
S.eilyn={front:[
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K..fFffFf..K..",".....ffffff....."],
 ["................","......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....","...KwSttttStwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K..fFffFf..K..",".....ffffff....."],
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHhHhhHsHhH..","..HIssHsssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K..fFffFf..K..",".....ffffff....."],
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtxxttttTcCK",".KwcskskkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K..fFffFf..K..",".....ffffff....."],
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwccttttxttccwK",".KwcTtttxxttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K..fFffFf..K..",".....ffffff....."],
 ["................","......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cKc.fFppPp.cKc.","..K..fffpPp..K..","..........ff...."],
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K...fFfF...K..","......ffff......"],
 ["................","......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cKc.pPppFf.cKc.","..K..pPpfff..K..",".....ff........."],
 ["......hh.h......","...h.hhhhhhh....","..hhhhhhhhhhh...","..hHhhhhhhhhHh..",".hHhhHhhhhHhhHh.",".hHhHHhhhHHhHhh.","..HhHsHhhHsHhH..","..HIsHesssHHsI..","...IssssssssI...","...ISssssssSI...","....SssSSssS....",".....SttttS.....","...KwtTtTtTtwK..","..KwctttttttcwK.",".KwcctttttttccwK",".KwcTtttttttTcCK",".KwcskkkkkkstcCK",".KwcsBkkkkkstcCK",".KCcTtttttttTcCK",".KCcTtttttttTcCK",".cCc.pPppPp.cCc.",".cKc.pPppPp.cKc.","..K...fFfF...K..","......ffff......"]
],profile:[
 [".......hh.........","....hhhhhhh.......","...hhhhhhhhh......","..hhhhhhhhHhh.....","..hHhhhhhHhhhh....","..HhHhhhhhhHhI....",".hHhHhhhhhHhIh....",".sHhsHhhhHhIhI....",".sHeshhhhIhIh.....","sssssshhIhII......",".SsssShIIhI.......","..SssSI..I........","...Stt............","...wtTtcc.........","..cwtttcwc........","..ctttTcwcc.......",".skktttcwcc.......",".skBktTcwcCc......",".SkkkttcwcCc......","..cttttcwcCc......","..cTtttcwCCc......","..cCtttccwCc......","..cCtttccwCcc.....","..cCcttccwCCc.....","..cCcpPpccCCc.....","...KcpPpcKKK......","....KpPp..........","....pPpp..........","...fffFf..........","...FFFFF.........."],
 ["..................",".......hh.........","....hhhhhhh.......","...hhhhhhhhh......","..hhhhhhhhHhh.....","..hHhhhhhHhhhh....","..HhHhhhhhhHhI....",".hHhHhhhhhHhIh....",".sHhsHhhhHhIhI....",".sHeshhhhIhIh.....","sssssshhIhII......",".SsssShIIhI.......","..SssSI..I........","...Stttcc.........","..cwtttcwc........","..ctttTcwcc.......",".skktttcwcc.......",".skBktTcwcCc......",".SkkkttcwcCc......","..cttttcwcCc......","..cTtttcwCCc......","..cCtttccwCc......","..cCtttccwCcc.....","..cCcttccwCCc.....","..cCcpPpccCCc.....","...KcpPpcKKK......","....KpPp..........","....pPpp..........","...fffFf..........","...FFFFF.........."],
 [".......hh.........","....hhhhhhh.......","...hhhhhhhhh......","..hhhhhhhhHhh.....","..hHhhhhhHhhhh....","..HhHhhhhhhHhI....",".hHhHhhhhhHhIh....",".shhsHhhhHhIhI....",".sheshhhhIhIh.....","sssssshhIhII......",".SsssShIIhI.......","..SssSI..I........","...Stt............","...wtTtcc.........","..cwtttcwc........","..ctttTcwcc.......",".skktttcwcc.......",".skBktTcwcCc......",".SkkkttcwcCc......","..cttttcwcCc......","..cTtttcwCCc......","..cCtttccwCc......","..cCtttccwCcc.....","..cCcttccwCCc.....","..cCcpPpccCCc.....","...KcpPpcKKK......","....KpPp..........","....pPpp..........","...fffFf..........","...FFFFF.........."],
 [".......hh.........","....hhhhhhh.......","...hhhhhhhhh......","..hhhhhhhhHhh.....","..hHhhhhhHhhhh....","..HhHhhhhhhHhI....",".hHhHhhhhhHhIh....",".sHhsHhhhHhIhI....",".sHeshhhhIhIh.....","sssssshhIhII......",".SsssShIIhI.......","..SssSI..I........","...Stt............","...wtTtcc.........","..cwtttcwc........",".xctttTcwcc.......","sskktttcwcc.......",".skBktTcwcCc......",".SkkkttcwcCc......","..cttttcwcCc......","..cTtttcwCCc......","..cCtttccwCc......","..cCtttccwCcc.....","..cCcttccwCCc.....","..cCcpPpccCCc.....","...KcpPpcKKK......","....KpPp..........","....pPpp..........","...fffFf..........","...FFFFF.........."],
 [".......hh.........","....hhhhhhh.......","...hhhhhhhhh......","..hhhhhhhhHhh.....","..hHhhhhhHhhhh....","..HhHhhhhhhHhI....",".hHhHhhhhhHhIh....",".sHhsHhhhHhIhI....",".sHeshhhhIhIh.....","sssssshhIhII......",".SsssShIIhI.......","..SssSI..I........","...Stt............","...wtTtcc.........","..cwtttcwc........","..xxttTcwcc.......",".xkktttcwcc.......",".skBktTcwcCc......",".SkkkttcwcCc......","..cttttcwcCc......","..cTtttcwCCc......","..cCtttccwCc......","..cCtttccwCcc.....","..cCcttccwCCc.....","..cCcpPpccCCc.....","...KcpPpcKKK......","....KpPp..........","....pPpp..........","...fffFf..........","...FFFFF.........."]
]};

/* ---------- outils ---------- */
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingEnabled=false;return[c,x]};
const rgb=h=>{const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]};
const hex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
/* éclaircit (k>0) ou assombrit (k<0) une couleur */
const tone=(h,k)=>{const c=rgb(h);return hex(c.map(v=>k>0?v+(255-v)*k:v*(1+k)))};
S.rows=(rows,pal)=>{const h=rows.length,w=Math.max(...rows.map(r=>r.length));const[c,x]=mk(w,h);rows.forEach((r,y)=>{for(let i=0;i<r.length;i++){const ch=r[i];if(ch==='.'||ch===' ')continue;const col=pal[ch];if(!col)continue;x.fillStyle=col;x.fillRect(i,y,1,1)}});return c};
function poly(x,P,c){x.fillStyle=c;let y0=1e9,y1=-1e9;for(const p of P){y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1])}
 for(let y=Math.floor(y0);y<Math.ceil(y1);y++){const yc=y+.5,xs=[];for(let i=0;i<P.length;i++){const a=P[i],b=P[(i+1)%P.length];if((yc>=a[1]&&yc<b[1])||(yc>=b[1]&&yc<a[1]))xs.push(a[0]+(yc-a[1])*(b[0]-a[0])/(b[1]-a[1]))}
  xs.sort((a,b)=>a-b);for(let i=0;i+1<xs.length;i+=2){const l=Math.round(xs[i]),r=Math.round(xs[i+1]);if(r>l)x.fillRect(l,y,r-l,1)}}}
function line(x,x0,y0,x1,y1,c,w=1){x.fillStyle=c;const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1,o=w>>1;for(let i=0;i<=n;i++)x.fillRect(Math.round(x0+(x1-x0)*i/n)-o,Math.round(y0+(y1-y0)*i/n)-o,w,w)}

/* =====================================================================
   PNJ (vue de dessus, 12×18) — générés à partir d'un « kit » :
   coiffure, tenue, accessoire, teint et palette (1 cheveux, 2 vêtement, 3 ombre, 4 pantalon).
   frames : 0 repos · 1 souffle · 2-5 marche
   ===================================================================== */
S.NPC_PALS=[
 {1:'#5b3a29',2:'#4b5d7a',3:'#2f3b52',4:'#2a2140'},{1:'#1a1422',2:'#7a4b5d',3:'#52303e',4:'#16131f'},{1:'#8a7a5a',2:'#5d7a4b',3:'#3b5230',4:'#2a2140'},
 {1:'#6b6577',2:'#7a6a4b',3:'#524630',4:'#1d1830'},{1:'#3a2a1a',2:'#45365e',3:'#2a2140',4:'#16131f'},{1:'#a05a3a',2:'#6b6577',3:'#45405a',4:'#1d1830'},
 {1:'#2a2a3a',2:'#8a3a3a',3:'#5a2020',4:'#16131f'},{1:'#c9a86a',2:'#3a5a6a',3:'#24404c',4:'#2a2140'},
 {1:'#2a1e18',2:'#6a5a3a',3:'#4a3e28',4:'#1d1830'},{1:'#cfc7b8',2:'#3a4a5a',3:'#26323e',4:'#16131f'},{1:'#5a2a1a',2:'#7a3a5a',3:'#502640',4:'#2a2140'},{1:'#151018',2:'#2f5a4f',3:'#1f3e36',4:'#1d1830'}];
const SKIN=['#e8cbb4','#d9b9a3','#b98c6c','#8c5e44'];
/* une ligne par silhouette : coiffure, tenue, accessoire, teint */
S.NPC_KIT=[
 ['court','manteau',null,1],['long','robe','sac',0],['casquette','sweat',null,2],['chignon','veste','lunettes',1],
 ['capuche','sweat','tel',3],['court','veste','echarpe',0],['boucle','manteau','sac',2],['queue','sweat',null,1],
 ['rase','veste','lunettes',3],['long','manteau','echarpe',1],['casquette','veste','tel',0],['chignon','robe',null,2]];
S.npc=(pi,f,palO)=>{
 const pal=palO||S.NPC_PALS[pi%S.NPC_PALS.length],kit=palO?['court','manteau',null,1]:S.NPC_KIT[pi%S.NPC_KIT.length];
 const[hair,top,acc,sk]=kit,skin=SKIN[sk],skin2=tone(skin,-.2),H=pal[1],H2=tone(H,-.35),H1=tone(H,.25),cl=pal[2],cl2=pal[3],cl1=tone(cl,.22),pt=pal[4],pt1=tone(pt,.3),ink='#0d0b12';
 const[c,x]=mk(12,18);const P=(a,b,w,h,col)=>{x.fillStyle=col;x.fillRect(a,b,w,h)};
 const walk=f>=2?f-2:-1,dy=(walk===0||walk===2)?1:0,hd=f===1?1:0;
 /* jambes et chaussures */
 const legL=walk===0?-1:0,legR=walk===2?-1:0;
 if(top!=='robe'||true){P(3,13,2,4+legL,pt);P(7,13,2,4+legR,pt);P(3,13,1,4+legL,pt1);P(7,13,1,4+legR,pt1)}
 P(3,17+legL,2,1,ink);P(7,17+legR,2,1,ink);P(3,16+legL,2,1,tone(pt,-.3));P(7,16+legR,2,1,tone(pt,-.3));
 /* buste */
 const y0=7+dy;
 P(2,y0+1,8,6,cl);P(2,y0+1,2,6,cl1);P(8,y0+1,2,6,cl2);P(2,y0+6,8,1,cl2);
 if(top==='manteau'){P(2,y0+7,8,2,cl);P(2,y0+7,2,2,cl1);P(8,y0+7,2,2,cl2);P(5,y0+2,1,7,cl2);P(6,y0+3,1,1,'#c9b98a')}
 if(top==='robe'){P(2,y0+7,8,3,cl);P(1,y0+9,10,1,cl2);P(2,y0+7,2,3,cl1);P(4,y0+1,4,1,tone(cl,.35))}
 if(top==='sweat'){P(4,y0+5,4,1,cl2);P(4,y0+1,4,1,cl2);P(5,y0+2,1,2,tone(cl,.5));P(6,y0+2,1,2,tone(cl,.5))}
 if(top==='veste'){P(5,y0+1,2,6,tone(cl,.55));P(5,y0+1,2,1,tone(cl,.7));P(4,y0+2,1,4,cl2);P(7,y0+2,1,4,cl2)}
 /* bras et mains (balancement en marchant) */
 const aL=walk===0?1:walk===2?-1:0;
 P(1,y0+2+Math.max(0,-aL),1,4,cl1);P(10,y0+2+Math.max(0,aL),1,4,cl2);
 P(1,y0+6-(aL<0?0:0)+aL,1,1,skin);P(10,y0+6-aL,1,1,skin2);
 /* accessoires */
 if(acc==='sac'){line(x,2,y0+1,9,y0+5,tone(cl2,-.3));P(9,y0+5,2,3,'#3a2a20');P(9,y0+5,2,1,'#5a4030')}
 if(acc==='echarpe'){P(3,y0+1,6,1,'#b0102a');P(3,y0+2,2,3,'#8a0c22');P(3,y0+1,1,1,'#e0263d')}
 if(acc==='tel'){P(4,y0+4,2,2,skin);P(5,y0+3,1,2,'#9ff8ff')}
 /* tête */
 const hy=hd+dy;
 P(5,6+hy,2,1,skin2);
 P(3,2+hy,6,5,skin);P(8,2+hy,1,5,skin2);P(3,6+hy,6,1,skin2);P(4,4+hy,1,1,ink);P(7,4+hy,1,1,ink);
 if(acc==='lunettes'){P(3,4+hy,6,1,'#1a1626');P(4,4+hy,1,1,'#8fe3f0');P(7,4+hy,1,1,'#8fe3f0')}
 const hr=(a,b,w,h,col)=>P(a,b+hy,w,h,col);
 switch(hair){
  case'court':hr(3,1,6,2,H);hr(2,2,1,3,H2);hr(9,2,1,3,H2);hr(4,1,3,1,H1);hr(3,3,2,1,H);break;
  case'long':hr(3,1,6,2,H);hr(2,2,1,7,H);hr(9,2,1,7,H2);hr(1,5,1,4,H2);hr(10,5,1,4,H2);hr(4,1,2,1,H1);hr(3,3,1,1,H);break;
  case'chignon':hr(3,1,6,2,H);hr(5,-1,2,2,H);hr(5,-1,1,1,H1);hr(2,2,1,3,H2);hr(9,2,1,3,H2);break;
  case'casquette':hr(3,0,6,3,tone(cl2,-.2));hr(2,2,8,1,tone(cl2,-.4));hr(4,0,2,1,tone(cl,.2));hr(2,3,1,2,H);hr(9,3,1,2,H2);break;
  case'capuche':hr(2,0,8,2,cl);hr(1,1,2,7,cl);hr(9,1,2,7,cl2);hr(3,0,4,1,cl1);hr(3,2,6,1,H2);break;
  case'boucle':hr(2,0,8,3,H);hr(1,1,1,5,H);hr(10,1,1,5,H2);[2,4,6,8].forEach(i=>hr(i,0,1,1,H1));hr(3,3,1,1,H);hr(8,3,1,1,H2);break;
  case'queue':hr(3,1,6,2,H);hr(2,2,1,3,H2);hr(9,2,2,2,H);hr(10,4,1,4,H2);hr(4,1,3,1,H1);break;
  case'rase':hr(3,1,6,1,H2);hr(3,2,1,1,H2);hr(8,2,1,1,H2);break;
 }
 return c;
};

/* =====================================================================
   MONSTRE de la scène de combat (36×52, tourné vers la droite) :
   colosse d'ombre voûté, cornes, gueule, longs bras griffus, fumée.
   frames : 0-1 respiration · 2 recul (touché)
   ===================================================================== */
S.FOE={ink:'#0c0912',mid:'#1b1427',lo:'#2a1f3c',rim:'#4a3868',hi:'#7a62a8',claw:'#b9b2c8',tooth:'#d8d0c0'};
S.foeEyes=[[25,17],[29,17]];
S.foe=(f)=>{
 const C=S.FOE,[c,x]=mk(36,52);const b=f===1?1:0,h=f===2?1:0;const X=v=>v-h*2,Y=v=>v+b;
 /* jambes (digitigrades) */
 for(const[i,lx]of[[0,9],[1,18]]){const col=i?C.mid:C.ink;line(x,X(lx),Y(36),X(lx-3+i*2),Y(43),col,3);line(x,X(lx-3+i*2),Y(43),X(lx+1+i*2),Y(50),col,2);x.fillStyle=C.ink;x.fillRect(X(lx-1+i*2),50,6,2);x.fillStyle=C.claw;x.fillRect(X(lx+4+i*2),51,1,1)}
 /* bras arrière */
 line(x,X(12),Y(20),X(8),Y(32),C.mid,3);line(x,X(8),Y(32),X(11),Y(44),C.mid,2);
 /* corps voûté */
 poly(x,[[X(3),Y(36)],[X(4),Y(22)],[X(10),Y(13)],[X(19),Y(10)],[X(26),Y(13)],[X(28),Y(22)],[X(24),Y(34)],[X(16),Y(40)]],C.ink);
 poly(x,[[X(8),Y(33)],[X(9),Y(22)],[X(14),Y(16)],[X(20),Y(16)],[X(22),Y(26)],[X(17),Y(35)]],C.mid);
 poly(x,[[X(12),Y(30)],[X(13),Y(23)],[X(17),Y(20)],[X(18),Y(27)]],C.lo);
 /* épines dorsales */
 for(const[a,bb,cc]of[[[4,24],[0,17],[7,21]],[[7,17],[4,9],[11,15]],[[12,13],[11,4],[16,12]],[[17,11],[19,3],[21,11]]])poly(x,[[X(a[0]),Y(a[1])],[X(bb[0]),Y(bb[1])],[X(cc[0]),Y(cc[1])]],C.ink);
 /* lambeaux de fumée en bas */
 for(let i=0;i<6;i++){const wx=X(5+i*3.5);x.fillStyle=i%2?C.mid:C.ink;x.fillRect(wx,Y(37+(i%3)),2,3+(i%2)*2)}
 /* tête basse, cornes, gueule */
 poly(x,[[X(21),Y(14)],[X(31),Y(14)],[X(34),Y(19)],[X(31),Y(25)],[X(23),Y(24)],[X(20),Y(19)]],C.ink);
 line(x,X(23),Y(14),X(19),Y(7),C.ink,2);line(x,X(19),Y(7),X(21),Y(3),C.ink,1);line(x,X(29),Y(14),X(32),Y(8),C.ink,2);line(x,X(32),Y(8),X(30),Y(4),C.ink,1);
 x.fillStyle=C.rim;x.fillRect(X(19),Y(7),1,1);x.fillRect(X(32),Y(8),1,1);
 poly(x,[[X(24),Y(22)],[X(34),Y(21)],[X(33),Y(27)],[X(25),Y(26)]],'#2a0810');
 x.fillStyle=C.tooth;for(const tx of[26,28,30,32])x.fillRect(X(tx),Y(22),1,2);for(const tx of[27,29,31])x.fillRect(X(tx),Y(25),1,1);
 /* bras avant : pend jusqu'au sol, griffes */
 line(x,X(24),Y(21),X(29),Y(31),C.ink,3);line(x,X(29),Y(31),X(28),Y(43),C.ink,3);
 for(let k=0;k<3;k++)line(x,X(27+k),Y(43),X(29+k*2),Y(47),C.claw,1);
 /* liseré éclairé (lumière en haut à droite, côté Croc) */
 x.globalCompositeOperation='source-atop';x.fillStyle=C.rim;
 for(const[a,bb]of[[19,10],[22,11],[25,13],[27,16],[28,20],[31,14],[33,17]])x.fillRect(X(a),Y(bb),1,1);
 x.fillStyle=C.hi;x.fillRect(X(20),Y(10),1,1);x.fillRect(X(32),Y(15),1,1);x.globalCompositeOperation='source-over';
 return c;
};

/* =====================================================================
   MARTEAU (vue de dessus, posé sur l'épaule) — tête-bloc couverte de pointes,
   manche long, ruban noué. Coordonnées dans le repère du sprite 16×24.
   ===================================================================== */
const HAM_HEAD=[
"..h...h...",
".oLooLooo.",
"oLMmLmmMdo",
"oMmLmmLmdo",
"oLmmLmmLdo",
"omMmmMmmdo",
"odddddddqo",
".oooooooo.",
];
const HAM_PAL={o:'#0b0a10',h:'#e8e0cc',L:'#e8e0cc',M:'#a39cb2',m:'#6b6577',d:'#45405a',q:'#2c2838'};
let HAMC=null;
S.hammerHead=()=>HAMC||(HAMC=S.rows(HAM_HEAD,HAM_PAL));
S.hammer=(x,ox,oy,dir,sc=1)=>{
 if(!HAMC)HAMC=S.rows(HAM_HEAD,HAM_PAL);
 const R=(px,py,w,h,c)=>{x.fillStyle=c;x.fillRect(ox+px*sc,oy+py*sc,w*sc,h*sc)};
 const shaft=(fx,i)=>{R(fx,16-i,1,1,i%4===0?'#4d4660':'#2e293a')};
 const head=(hx,hy,flip)=>{x.save();x.translate(ox+(hx+(flip?10:0))*sc,oy+hy*sc);if(flip)x.scale(-1,1);x.drawImage(HAMC,0,0,10*sc,8*sc);x.restore()};
 const rib=(rx,ry,d)=>{R(rx,ry,1,1,'#d4ecf4');R(rx+d,ry+1,1,1,'#d4ecf4');R(rx+d,ry+2,1,1,'#86b4c6');R(rx+d*2,ry+3,1,1,'#86b4c6')};
 if(dir==='down'){for(let i=0;i<13;i++)shaft(14+Math.round(i*.15),i);head(11,-3,0);rib(14,16,1)}
 else if(dir==='up'){for(let i=0;i<13;i++)shaft(1-Math.round(i*.15),i);head(-5,-3,1);rib(1,16,-1)}
 else{const Lf=dir==='left';for(let i=0;i<12;i++)R(Lf?4+Math.round(i*.7):11-Math.round(i*.7),16-i,1,1,i%4===0?'#4d4660':'#2e293a');head(Lf?10:-4,-3,!Lf);rib(Lf?4:11,16,Lf?-1:1)}
};
return S;
})();
