/**
 * Original Tervain menu ornament. Authored vectors suggest worked metal, dyed cloth,
 * and carved lettering; they contain no image files or artwork from the reference game.
 * All surface effects are static, and the decorations stay outside the focus order.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const instances = { frame: 0, banner: 0, wordmark: 0 };

function artwork(kind: keyof typeof instances, viewBox: string, contents: (prefix: string) => string, stretch = true): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const prefix = `tervain-menu-${kind}-${instances[kind]++}`;
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', stretch ? 'none' : 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('role', 'presentation');
  svg.setAttribute('class', `menu-${kind}-art`);
  svg.style.pointerEvents = 'none';
  svg.innerHTML = contents(prefix);
  return svg;
}

/** Heavy worked-iron perimeter with oversized brass scrolls and bell medallions. */
export function createMenuFrame(): SVGSVGElement {
  return artwork('frame', '0 0 1600 1000', (id) => `
    <defs>
      <linearGradient id="${id}-brass" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="#efcf84"/><stop offset=".18" stop-color="#76502a"/>
        <stop offset=".4" stop-color="#dfb765"/><stop offset=".56" stop-color="#9b6b32"/>
        <stop offset=".79" stop-color="#372719"/><stop offset="1" stop-color="#b28a45"/>
      </linearGradient>
      <linearGradient id="${id}-iron" x2="0" y2="1">
        <stop stop-color="#4d5250"/><stop offset=".38" stop-color="#171d21"/>
        <stop offset=".64" stop-color="#494941"/><stop offset="1" stop-color="#0b1014"/>
      </linearGradient>
      <pattern id="${id}-pitting" width="19" height="17" patternUnits="userSpaceOnUse">
        <path d="M2 3h4m7 8h3M6 15h2" stroke="#171a15" stroke-width=".7" opacity=".55"/>
        <path d="m9 5 3-1M2 11h2" stroke="#e6d4a0" stroke-width=".6" opacity=".38"/>
      </pattern>
      <filter id="${id}-shadow" x="-20%" y="-20%" width="140%" height="150%" color-interpolation-filters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#070905" flood-opacity=".8"/>
      </filter>
      <g id="${id}-corner" filter="url(#${id}-shadow)">
        <path d="M20 126V49C20 29 28 20 48 20h79v9H53c-16 0-24 8-24 24v73z"
          fill="url(#${id}-iron)" stroke="#6b624b" stroke-width="3"/>
        <path d="M34 120V57c0-13 10-23 23-23h64" fill="none" stroke="url(#${id}-brass)" stroke-width="6"/>
        <path d="M39 116V57c0-10 8-18 18-18h60" fill="none" stroke="#d7bf87" stroke-width=".7" opacity=".65"/>
        <path d="M41 44C55 29 79 18 95 19c19 1 30 15 20 26-7 8-19 7-23-1-3-6 1-12 7-11 5 0 6 5 3 8"
          fill="none" stroke="#111820" stroke-width="13" stroke-linecap="round"/>
        <path d="M41 44C55 29 79 18 95 19c19 1 30 15 20 26-7 8-19 7-23-1-3-6 1-12 7-11 5 0 6 5 3 8"
          fill="none" stroke="url(#${id}-brass)" stroke-width="8" stroke-linecap="round"/>
        <path d="M44 41C29 55 18 79 19 95c1 19 15 30 26 20 8-7 7-19-1-23-6-3-12 1-11 7 0 5 5 6 8 3"
          fill="none" stroke="#111820" stroke-width="13" stroke-linecap="round"/>
        <path d="M44 41C29 55 18 79 19 95c1 19 15 30 26 20 8-7 7-19-1-23-6-3-12 1-11 7 0 5 5 6 8 3"
          fill="none" stroke="url(#${id}-brass)" stroke-width="8" stroke-linecap="round"/>
        <path d="M54 29c10-9 17-11 30-10-8 8-17 11-30 10m-25 25c-9 10-11 17-10 30 8-8 11-17 10-30"
          fill="url(#${id}-brass)" stroke="#292a21" stroke-width="1.2"/>
        <path d="m9 39 30-30 34 32-33 34z" fill="url(#${id}-iron)" stroke="#0d141b" stroke-width="3"/>
        <path d="m15 39 24-24 28 26-27 27z" fill="url(#${id}-brass)" stroke="#ebc882" stroke-width="1"/>
        <circle cx="40" cy="40" r="18" fill="#20292d" stroke="#704921" stroke-width="3"/>
        <circle cx="40" cy="40" r="15" fill="url(#${id}-iron)" stroke="#c89950" stroke-width="1.4"/>
        <path d="M31 47h18l-4-5V34a5 5 0 0 0-10 0v8zM32 50h16" fill="url(#${id}-brass)" stroke="#ebcb88" stroke-width=".8"/>
        <circle cx="40" cy="52" r="2" fill="#d6b16c"/>
        <path d="M72 49c-8 4-10 10-6 15 4 5 11 3 11-3m-28 11c4-8 10-10 15-6 5 4 3 11-3 11"
          fill="none" stroke="#97804e" stroke-width="1.2"/>
        <path d="M53 29c10-9 18-11 30-10M29 53c-9 10-11 18-10 30" fill="none" stroke="#dfc994" stroke-width=".7"/>
        <path d="M20 126V49C20 29 28 20 48 20h79v9H53c-16 0-24 8-24 24v73z"
          fill="url(#${id}-pitting)" opacity=".23"/>
        <circle cx="122" cy="24" r="2.2" fill="#191d16" stroke="#9d875a" stroke-width=".7"/>
        <circle cx="24" cy="122" r="2.2" fill="#191d16" stroke="#9d875a" stroke-width=".7"/>
      </g>
      <g id="${id}-edge-leaf" fill="none" stroke="#c09a52" stroke-width="1.5">
        <path d="M0 0c19-1 24-8 42-8 17 0 23 7 40 8-17 1-23 8-40 8C24 8 19 1 0 0z"/>
        <path d="M10 0h62M28 0l8-5 8 5-8 5z" opacity=".65"/>
      </g>
      <g id="${id}-crest" filter="url(#${id}-shadow)">
        <path d="M-62 0c17-2 20-9 30-13 11-4 18-3 32-17 14 14 21 13 32 17C42-9 45-2 62 0c-17 2-20 9-30 13-11 4-18 3-32 17-14-14-21-13-32-17C-42 9-45 2-62 0z"
          fill="url(#${id}-iron)" stroke="#8c764b" stroke-width="1.5"/>
        <path d="M-41 0c17-2 20-6 28-8L0-21 13-8c8 2 11 6 28 8-17 2-20 6-28 8L0 21-13 8c-8-2-11-6-28-8z"
          fill="none" stroke="url(#${id}-brass)" stroke-width="2"/>
        <path d="M-6 8h12M-8 5l3-3V-6a5 5 0 0 1 10 0v8l3 3z" fill="url(#${id}-brass)" stroke="#b9a67a" stroke-width=".5"/>
        <circle cy="9" r="1.6" fill="#ccb88a"/>
      </g>
    </defs>
    <rect x="34" y="34" width="1532" height="932" rx="5" fill="none" stroke="#070d13" stroke-width="27" opacity=".85"/>
    <rect x="34" y="34" width="1532" height="932" rx="4" fill="none" stroke="url(#${id}-iron)" stroke-width="19"/>
    <rect x="25" y="25" width="1550" height="950" rx="4" fill="none" stroke="#987342" stroke-width="2"/>
    <rect x="43" y="43" width="1514" height="914" rx="3" fill="none" stroke="#dfb56c" stroke-width="1.9"/>
    <rect x="49" y="49" width="1502" height="902" rx="3" fill="none" stroke="#382e22" stroke-width="2.2" opacity=".85"/>
    <path d="M217 34h465m236 0h465M217 966h465m236 0h465M34 217v205m0 156v205M1566 217v205m0 156v205"
      stroke="url(#${id}-brass)" stroke-width="4.5" fill="none"/>
    <use href="#${id}-edge-leaf" transform="translate(265 34) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(519 34) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(976 34) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(1230 34) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(265 966) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(519 966) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(976 966) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(1230 966) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(34 264) rotate(90) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(34 635) rotate(90) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(1566 264) rotate(90) scale(1.3)"/>
    <use href="#${id}-edge-leaf" transform="translate(1566 635) rotate(90) scale(1.3)"/>
    <use href="#${id}-corner" transform="translate(0 0) scale(1.65)"/>
    <use href="#${id}-corner" transform="translate(1600 0) scale(-1.65 1.65)"/>
    <use href="#${id}-corner" transform="translate(0 1000) scale(1.65 -1.65)"/>
    <use href="#${id}-corner" transform="translate(1600 1000) scale(-1.65 -1.65)"/>
    <use href="#${id}-crest" transform="translate(800 46) scale(1.45)"/>
    <use href="#${id}-crest" transform="translate(800 954) scale(1.45 -1.45)"/>
    <use href="#${id}-crest" transform="translate(41 500) rotate(90) scale(1.2)"/>
    <use href="#${id}-crest" transform="translate(1559 500) rotate(-90) scale(1.2)"/>
  `);
}

/** Long hanging textile. Overlay the menu inside x88..332, y130..710 in the 420×880 frame. */
export function createMenuBannerArt(): SVGSVGElement {
  return artwork('banner', '0 0 420 880', (id) => `
    <defs>
      <linearGradient id="${id}-cloth" x1="0" x2="1">
        <stop stop-color="#170a08"/><stop offset=".1" stop-color="#572019"/>
        <stop offset=".22" stop-color="#883c29"/><stop offset=".34" stop-color="#3e1010"/>
        <stop offset=".49" stop-color="#280c0d"/><stop offset=".66" stop-color="#64201c"/>
        <stop offset=".79" stop-color="#7c3324"/><stop offset=".9" stop-color="#351010"/><stop offset="1" stop-color="#170908"/>
      </linearGradient>
      <linearGradient id="${id}-gold" x2="0" y2="1">
        <stop stop-color="#cba96a"/><stop offset=".3" stop-color="#68502d"/>
        <stop offset=".5" stop-color="#b08a45"/><stop offset="1" stop-color="#483321"/>
      </linearGradient>
      <linearGradient id="${id}-rod" x2="0" y2="1">
        <stop stop-color="#22231c"/><stop offset=".22" stop-color="#bdab76"/>
        <stop offset=".38" stop-color="#79653d"/><stop offset=".72" stop-color="#3d3523"/>
        <stop offset="1" stop-color="#171b15"/>
      </linearGradient>
      <linearGradient id="${id}-shade" x2="0" y2="1">
        <stop stop-color="#070805" stop-opacity=".42"/><stop offset=".13" stop-color="#070805" stop-opacity="0"/>
        <stop offset=".76" stop-color="#070805" stop-opacity="0"/><stop offset="1" stop-color="#070805" stop-opacity=".34"/>
      </linearGradient>
      <linearGradient id="${id}-fold" x1="0" x2="1">
        <stop stop-color="#120907" stop-opacity=".62"/><stop offset=".42" stop-color="#130907" stop-opacity=".06"/>
        <stop offset=".67" stop-color="#cd7445" stop-opacity=".36"/><stop offset="1" stop-color="#35130f" stop-opacity=".12"/>
      </linearGradient>
      <pattern id="${id}-weave" width="9" height="9" patternUnits="userSpaceOnUse">
        <path d="M0 2h9M0 6.5h9" stroke="#be8467" stroke-width=".55" opacity=".06"/>
        <path d="M2 0v9M6.5 0v9" stroke="#100b08" stroke-width=".9" opacity=".12"/>
      </pattern>
      <pattern id="${id}-worn" width="71" height="93" patternUnits="userSpaceOnUse">
        <path d="M12 8v13m34 30v7m-37 31 7-2m43-64h3" stroke="#db9f88" stroke-width=".8" opacity=".07"/>
        <path d="M53 14v10m-27 39v6m32 9h4" stroke="#170908" stroke-width="1.1" opacity=".1"/>
      </pattern>
      <path id="${id}-shape" d="M51 66c74-4 244-4 318 0l-8 673-5 53-5 2 3 21-4 36-61-32-4-7-6 1-69-40-82 43-7-2-4 8-51 29-4-48 3-7-6-47z"/>
      <clipPath id="${id}-cut"><use href="#${id}-shape"/></clipPath>
      <g id="${id}-seal" fill="none" stroke-linejoin="bevel" stroke-linecap="square">
        <path d="M165 242C78 228 27 162 36 58m129 184c87-14 138-80 129-184M50 99 26 81l6-20 28 28m-6 46-29-8 2-22 35 22m9 42-31 1-8-23 39 14m25 39-29 11-17-20 38 4m43 29-23 18-22-13 41-5m180-115 24-18-6-20-28 28m6 46 29-8-2-22-35 22m-9 42 31 1 8-23-39 14m-25 39 29 11 17-20-38 4m-43 29 23 18 22-13-41-5"/>
        <path d="M101 174v-84c0-55 128-55 128 0v84M105 84h120M125 61h80M132 80v84m66-84v84"/>
        <path d="M145 123c0-25 40-25 40 0v28l12 15h-64l12-15zM139 175h52m-28-8v16m2-91v11"/>
        <ellipse cx="165" cy="185" rx="89" ry="20"/>
        <path d="M76 185v32c26 34 152 34 178 0v-32M77 204c24 32 151 32 176 0M103 198v30m31-23v34m31-33v36m31-37v34m31-41v30M124 241l41 15 41-15"/>
      </g>
      <filter id="${id}-shadow" x="-15%" y="-6%" width="130%" height="116%" color-interpolation-filters="sRGB">
        <feDropShadow dx="3" dy="9" stdDeviation="5" flood-color="#090a06" flood-opacity=".65"/>
      </filter>
    </defs>
    <g filter="url(#${id}-shadow)">
      <rect x="21" y="34" width="378" height="15" rx="4" fill="url(#${id}-rod)" stroke="#25271e" stroke-width="2.2"/>
      <path d="M33 38h354" stroke="#d1bd83" stroke-width=".9" opacity=".7"/>
      <path d="M19 30v23m382-23v23" stroke="#2c2e22" stroke-width="9" stroke-linecap="round"/>
      <path d="M19 31v21m382-21v21" stroke="url(#${id}-gold)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="19" cy="41" r="9" fill="url(#${id}-rod)" stroke="#9e8755" stroke-width="1.8"/>
      <circle cx="401" cy="41" r="9" fill="url(#${id}-rod)" stroke="#9e8755" stroke-width="1.8"/>
      <path d="M78 31h27v41H78zM142 31h24v40h-24zM254 31h24v40h-24zM315 31h27v41h-27z"
        fill="#5b1b1c" stroke="#1c120d" stroke-width="1.2"/>
      <path d="M83 34v36m17-36v36m47-36v35m14-35v35m98-35v35m14-35v35m47-36v36m17-36v36"
        stroke="#b79a59" stroke-width=".65" stroke-dasharray="2 2" opacity=".85"/>
      <use href="#${id}-shape" fill="url(#${id}-cloth)" stroke="#190c09" stroke-width="2"/>
      <g clip-path="url(#${id}-cut)">
        <path d="M55 64C73 207 52 439 66 635l5 223 39-20C95 591 104 337 83 63z" fill="#100808" opacity=".54"/>
        <path d="M82 64c37 177 0 393 36 742l41-22c-34-251-5-487-24-721z" fill="url(#${id}-fold)"/>
        <path d="M133 63c-17 226 12 445 3 740l29-26c-9-269-21-489-7-714z" fill="#170b09" opacity=".26"/>
        <path d="M221 63c-31 222-9 481-1 724l69 45c-28-295-3-526-19-768z" fill="url(#${id}-fold)" opacity=".7"/>
        <path d="M291 63c39 207 12 451 21 775l27 12c-5-286 26-575 3-787z" fill="url(#${id}-fold)"/>
        <path d="M342 64c-2 228 16 511-5 776l36 24V63z" fill="#100808" opacity=".5"/>
        <path d="M103 65c24 221-8 451 27 716M310 65c31 254-1 481 17 743" fill="none" stroke="#b85d37" stroke-width="3" opacity=".18"/>
        <use class="menu-cloth-texture" href="#${id}-shape" fill="url(#${id}-weave)"/>
        <use class="menu-cloth-texture" href="#${id}-shape" fill="url(#${id}-worn)"/>
        <use href="#${id}-shape" fill="url(#${id}-shade)"/>
        <g class="menu-cloth-seal" transform="translate(53 494) scale(.95)" opacity=".16">
          <use href="#${id}-seal" stroke="#160c09" stroke-width="10" transform="translate(1.5 2)"/>
          <use href="#${id}-seal" stroke="#ba8e47" stroke-width="6"/>
          <use href="#${id}-seal" stroke="#e0bd79" stroke-width="1.4" transform="translate(-1 -1)"/>
        </g>
      </g>
      <path d="M65 79c69-4 221-4 290 0l-8 658-5 88-57-29-7-1-68-39-70 37-8 1-54 32-5-89z" fill="none" stroke="#25120c" stroke-width="10"/>
      <path d="M65 79c69-4 221-4 290 0l-8 658-5 88-57-29-7-1-68-39-70 37-8 1-54 32-5-89z" fill="none" stroke="url(#${id}-gold)" stroke-width="6"/>
      <path d="M73 87c66-4 208-4 274 0l-8 647-5 79-124-65-125 66-5-79z" fill="none" stroke="#c2a066" stroke-width="1.8" opacity=".7"/>
      <path d="M59 77l8 661 6 100 137-73 134 72 6-99 11-660" fill="none" stroke="#c1a174" stroke-width="1.5" stroke-dasharray="5 5" opacity=".6"/>
      <path d="M77 108h266M78 115h264" stroke="#92703e" stroke-width="3" opacity=".7"/>
      <path d="M166 111h88m-83-9 10 9-10 9m78-18-10 9 10 9" fill="none" stroke="#c4a26b" stroke-width="2.4" opacity=".75"/>
      <path d="m201 742 9-17 9 17-9 17z" fill="#ad8040" stroke="#d2b176" stroke-width="1.3" opacity=".8"/>
    </g>
  `);
}

/**
 * Seven hand-drawn glyphs, not typeset text. Uneven crowns, bellied bowls, cut serifs
 * and a dropped V make one readable carved mark without depending on a font file.
 * The iron faces stay recessed behind broad ochre rims; only the bevel catches light.
 */
export function createMenuWordmark(): SVGSVGElement {
  return artwork('wordmark', '0 0 1000 220', (id) => `
    <defs>
      <linearGradient id="${id}-face" x2="0" y2="1">
        <stop stop-color="#4c4434"/><stop offset=".25" stop-color="#282c29"/>
        <stop offset=".49" stop-color="#11191b"/><stop offset=".68" stop-color="#37392f"/>
        <stop offset="1" stop-color="#14191a"/>
      </linearGradient>
      <linearGradient id="${id}-edge" x2="0" y2="1">
        <stop stop-color="#ead297"/><stop offset=".18" stop-color="#ad8242"/>
        <stop offset=".43" stop-color="#d8b374"/><stop offset=".56" stop-color="#806033"/>
        <stop offset=".8" stop-color="#bb9250"/><stop offset="1" stop-color="#52371f"/>
      </linearGradient>
      <filter id="${id}-shadow" x="-8%" y="-20%" width="116%" height="145%" color-interpolation-filters="sRGB">
        <feDropShadow dx="1" dy="5" stdDeviation="2.5" flood-color="#060b10" flood-opacity=".95"/>
      </filter>
      <g id="${id}-letters" transform="translate(53 13) scale(.88 .85)" fill-rule="evenodd">
        <g id="${id}-glyph-t" transform="translate(0 12)">
          <path d="M0 12 9 0 24 9C51 13 113 13 137 6L150 0 146 45 135 49 126 31 96 35 92 139 108 148 99 159 62 155 45 166 41 150 61 138 65 35 30 33 18 53 7 49z"/>
        </g>
        <g id="${id}-glyph-e" transform="translate(169 33)">
          <path d="M5 4 42 0 98 4 106 30 94 35 80 20 46 24 43 48 78 47 88 37 98 43 92 75 79 77 72 65 44 67 42 104 83 107 101 83 113 87 105 136 62 132 23 137 0 129 4 117 18 111 21 24 1 17z"/>
        </g>
        <g id="${id}-glyph-r" transform="translate(300 22)">
          <path d="M3 5 37 0 76 3C111 2 130 15 129 43c-2 22-18 35-41 41l34 41 19 9-6 19-23-5-13 3-31-53-21-15-2 46 18 8-4 12-59-3 2-12 15-6 3-104L0 17zM49 25l-1 35c20 7 48-3 48-20 0-12-21-19-47-15z"/>
        </g>
        <g id="${id}-glyph-v" transform="translate(452 34)">
          <path d="M0 3 49 0 55 13 42 22 76 115 104 25 91 17 95 4 139 0 148 13 135 22 89 146 75 157 60 151 14 28 0 20z"/>
        </g>
        <g id="${id}-glyph-a" transform="translate(619 7)">
          <path d="M0 155 14 139 49 29 46 12 69 0 87 8 122 135 145 144 138 162 99 165 80 158 81 145 96 138 87 109 48 111 38 141 52 152 43 165 4 169zM62 57 51 94 83 93 72 54 68 44z"/>
        </g>
        <g id="${id}-glyph-i" transform="translate(782 41)">
          <path d="M0 1 20 5 61 0 71 14 54 26 52 106 70 117 64 132 20 128 0 134-3 118 16 108 18 27 0 18z"/>
        </g>
        <g id="${id}-glyph-n" transform="translate(873 16)">
          <path d="M0 5 36 0 49 13 105 110 107 25 92 17 97 3 136 0 146 15 130 27 126 150 113 164 97 154 41 52 40 128 55 139 49 152 7 157 0 143 17 132 20 28 0 18z"/>
        </g>
      </g>
      <clipPath id="${id}-cut"><use href="#${id}-letters"/></clipPath>
    </defs>
    <g filter="url(#${id}-shadow)" paint-order="stroke fill" stroke-linejoin="bevel">
      <use href="#${id}-letters" transform="translate(0 4)" fill="#271e17" stroke="#080e13" stroke-width="13"/>
      <use href="#${id}-letters" fill="#614321" stroke="#302219" stroke-width="11"/>
      <use href="#${id}-letters" fill="url(#${id}-face)" stroke="url(#${id}-edge)" stroke-width="8"/>
      <use href="#${id}-letters" fill="url(#${id}-face)" stroke="#1d211e" stroke-width="2.1"/>
      <g clip-path="url(#${id}-cut)" fill="none">
        <use href="#${id}-letters" transform="translate(1.3 2.1)" stroke="#050b0e" stroke-width="3.8"/>
        <use href="#${id}-letters" transform="translate(-1.1 -1.2)" stroke="#b38b4c" stroke-width="2.1"/>
        <path d="m104 35 20 3-9 6-9-3zm126 14 14-3 5 6-16 1zm118 50 5-16 7 9-7 9zm109 34 16-7-5 7-9 5zm67-73 13-5 4 6-12 3zm102 47 4-15 6 5-4 9zm62-41 14 3-8 6-8-3zm76 102 14-6-4 8-9 3zm72-104 10-3 7 6-12 2zm79 89 3-14 6 7-3 11z"
          fill="#ac864b" stroke="none" opacity=".53"/>
        <path d="m121 71-3 28 5 8m128-31 13 4-7 7m119-34 9 4-5 12m79 72 10 4 10-1m175-73-4 15 3 8m69 40 13-3m74-51-2 22 3 9m85-59 3 11-2 10"
          stroke="#070e13" stroke-width="2.5" opacity=".76"/>
      </g>
      <use href="#${id}-letters" transform="translate(-.4 -1.1)" fill="none" stroke="#ead39b" stroke-width="1.15" opacity=".8"/>
    </g>
  `, false);
}
