/**
 * Original Tervain menu ornament. Authored vectors suggest worked metal
 * and carved lettering; they contain no image files or artwork from the reference game.
 * All surface effects are static, and the decorations stay outside the focus order.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const instances = { frame: 0, wordmark: 0 };

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

/** Heavy worked-iron perimeter with oversized brass scrolls and forged rivets. */
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
        <circle cx="40" cy="40" r="5" fill="url(#${id}-brass)" stroke="#ebcb88" stroke-width=".8"/>
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
        <path d="m0-6 6 6-6 6-6-6z" fill="url(#${id}-brass)" stroke="#b9a67a" stroke-width=".5"/>
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
