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

/** Full-screen perimeter: iron straps, worn brass inlay, curled corners and restrained edge filigree. */
export function createMenuFrame(): SVGSVGElement {
  return artwork('frame', '0 0 1600 1000', (id) => `
    <defs>
      <linearGradient id="${id}-brass" x1="0" y1="0" x2=".35" y2="1">
        <stop offset="0" stop-color="#c9b27b"/><stop offset=".18" stop-color="#76603b"/>
        <stop offset=".42" stop-color="#dbc38a"/><stop offset=".57" stop-color="#89703f"/>
        <stop offset=".8" stop-color="#3f3524"/><stop offset="1" stop-color="#9f8755"/>
      </linearGradient>
      <linearGradient id="${id}-iron" x2="0" y2="1">
        <stop stop-color="#403d33"/><stop offset=".38" stop-color="#1e201b"/>
        <stop offset=".64" stop-color="#464239"/><stop offset="1" stop-color="#10120f"/>
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
          fill="url(#${id}-iron)" stroke="#6b624b" stroke-width="1"/>
        <path d="M34 120V57c0-13 10-23 23-23h64" fill="none" stroke="url(#${id}-brass)" stroke-width="4"/>
        <path d="M39 116V57c0-10 8-18 18-18h60" fill="none" stroke="#d7bf87" stroke-width=".7" opacity=".65"/>
        <path d="M41 44C55 29 79 18 95 19c19 1 30 15 20 26-7 8-19 7-23-1-3-6 1-12 7-11 5 0 6 5 3 8"
          fill="none" stroke="#1a1c17" stroke-width="9" stroke-linecap="round"/>
        <path d="M41 44C55 29 79 18 95 19c19 1 30 15 20 26-7 8-19 7-23-1-3-6 1-12 7-11 5 0 6 5 3 8"
          fill="none" stroke="url(#${id}-brass)" stroke-width="5" stroke-linecap="round"/>
        <path d="M44 41C29 55 18 79 19 95c1 19 15 30 26 20 8-7 7-19-1-23-6-3-12 1-11 7 0 5 5 6 8 3"
          fill="none" stroke="#1a1c17" stroke-width="9" stroke-linecap="round"/>
        <path d="M44 41C29 55 18 79 19 95c1 19 15 30 26 20 8-7 7-19-1-23-6-3-12 1-11 7 0 5 5 6 8 3"
          fill="none" stroke="url(#${id}-brass)" stroke-width="5" stroke-linecap="round"/>
        <path d="M54 29c10-9 17-11 30-10-8 8-17 11-30 10m-25 25c-9 10-11 17-10 30 8-8 11-17 10-30"
          fill="url(#${id}-brass)" stroke="#292a21" stroke-width="1.2"/>
        <path d="m14 39 25-25 27 27-26 26z" fill="url(#${id}-iron)" stroke="#161b15" stroke-width="2"/>
        <path d="m21 39 18-18 20 20-19 19z" fill="url(#${id}-brass)" stroke="#b6a477" stroke-width=".6"/>
        <circle cx="40" cy="40" r="10" fill="#272b22" stroke="#736945" stroke-width="1.4"/>
        <path d="m40 31 6 9-6 9-6-9z" fill="url(#${id}-brass)" stroke="#dbca9a" stroke-width=".5"/>
        <path d="M72 49c-8 4-10 10-6 15 4 5 11 3 11-3m-28 11c4-8 10-10 15-6 5 4 3 11-3 11"
          fill="none" stroke="#97804e" stroke-width="1.2"/>
        <path d="M53 29c10-9 18-11 30-10M29 53c-9 10-11 18-10 30" fill="none" stroke="#dfc994" stroke-width=".7"/>
        <path d="M20 126V49C20 29 28 20 48 20h79v9H53c-16 0-24 8-24 24v73z"
          fill="url(#${id}-pitting)" opacity=".55"/>
        <circle cx="122" cy="24" r="2.2" fill="#191d16" stroke="#9d875a" stroke-width=".7"/>
        <circle cx="24" cy="122" r="2.2" fill="#191d16" stroke="#9d875a" stroke-width=".7"/>
      </g>
      <g id="${id}-edge-leaf" fill="none" stroke="#a88f59" stroke-width=".9">
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
    <rect x="24" y="24" width="1552" height="952" rx="3" fill="none" stroke="#080c08" stroke-width="15" opacity=".7"/>
    <rect x="26" y="26" width="1548" height="948" rx="2" fill="none" stroke="url(#${id}-iron)" stroke-width="10"/>
    <rect x="23" y="23" width="1554" height="954" rx="3" fill="none" stroke="#8b7850" stroke-width="1.2"/>
    <rect x="32" y="32" width="1536" height="936" rx="2" fill="none" stroke="#baa273" stroke-width=".85" opacity=".85"/>
    <rect x="38" y="38" width="1524" height="924" rx="3" fill="none" stroke="#544b34" stroke-width="1" opacity=".72"/>
    <path d="M156 26h526m236 0h526M156 974h526m236 0h526M26 156v279m0 130v279M1574 156v279m0 130v279"
      stroke="url(#${id}-brass)" stroke-width="2.3" fill="none"/>
    <use href="#${id}-edge-leaf" transform="translate(258 26)"/>
    <use href="#${id}-edge-leaf" transform="translate(520 26)"/>
    <use href="#${id}-edge-leaf" transform="translate(1000 26)"/>
    <use href="#${id}-edge-leaf" transform="translate(1262 26)"/>
    <use href="#${id}-edge-leaf" transform="translate(258 974)"/>
    <use href="#${id}-edge-leaf" transform="translate(520 974)"/>
    <use href="#${id}-edge-leaf" transform="translate(1000 974)"/>
    <use href="#${id}-edge-leaf" transform="translate(1262 974)"/>
    <use href="#${id}-edge-leaf" transform="translate(26 266) rotate(90)"/>
    <use href="#${id}-edge-leaf" transform="translate(26 654) rotate(90)"/>
    <use href="#${id}-edge-leaf" transform="translate(1574 266) rotate(90)"/>
    <use href="#${id}-edge-leaf" transform="translate(1574 654) rotate(90)"/>
    <use href="#${id}-corner" transform="translate(8 8)"/>
    <use href="#${id}-corner" transform="translate(1592 8) scale(-1 1)"/>
    <use href="#${id}-corner" transform="translate(8 992) scale(1 -1)"/>
    <use href="#${id}-corner" transform="translate(1592 992) scale(-1 -1)"/>
    <use href="#${id}-crest" transform="translate(800 26)"/>
    <use href="#${id}-crest" transform="translate(800 974) scale(1 -1)"/>
  `);
}

/** Long hanging textile. Overlay the menu inside x88..332, y130..710 in the 420×880 frame. */
export function createMenuBannerArt(): SVGSVGElement {
  return artwork('banner', '0 0 420 880', (id) => `
    <defs>
      <linearGradient id="${id}-cloth" x1="0" x2="1">
        <stop stop-color="#240b0b"/><stop offset=".08" stop-color="#4d1719"/>
        <stop offset=".22" stop-color="#7d292c"/><stop offset=".43" stop-color="#5b1d21"/>
        <stop offset=".69" stop-color="#70252a"/><stop offset=".89" stop-color="#471619"/><stop offset="1" stop-color="#280d0e"/>
      </linearGradient>
      <linearGradient id="${id}-gold" x2="0" y2="1">
        <stop stop-color="#d0b778"/><stop offset=".3" stop-color="#887040"/>
        <stop offset=".5" stop-color="#b89c60"/><stop offset="1" stop-color="#624b2d"/>
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
      <pattern id="${id}-weave" width="6" height="6" patternUnits="userSpaceOnUse">
        <path d="M0 1.5h6M0 4.5h6" stroke="#cf8c75" stroke-width=".45" opacity=".14"/>
        <path d="M1.5 0v6M4.5 0v6" stroke="#100b08" stroke-width=".7" opacity=".28"/>
        <path d="M0 0h3v3H0zM3 3h3v3H3z" fill="#ddaa8b" opacity=".035"/>
      </pattern>
      <pattern id="${id}-worn" width="71" height="93" patternUnits="userSpaceOnUse">
        <path d="M12 8v13m34 30v7m-37 31 7-2m43-64h3" stroke="#db9f88" stroke-width=".8" opacity=".15"/>
        <path d="M53 14v10m-27 39v6m32 9h4" stroke="#170908" stroke-width="1.1" opacity=".24"/>
      </pattern>
      <path id="${id}-shape" d="M51 66c74-4 244-4 318 0l-8 673-7 112-144-78L66 851l-7-112z"/>
      <clipPath id="${id}-cut"><use href="#${id}-shape"/></clipPath>
      <filter id="${id}-shadow" x="-15%" y="-6%" width="130%" height="116%" color-interpolation-filters="sRGB">
        <feDropShadow dx="3" dy="9" stdDeviation="5" flood-color="#090a06" flood-opacity=".65"/>
      </filter>
    </defs>
    <g filter="url(#${id}-shadow)">
      <rect x="21" y="34" width="378" height="15" rx="4" fill="url(#${id}-rod)" stroke="#25271e" stroke-width="1.3"/>
      <path d="M33 38h354" stroke="#d1bd83" stroke-width=".9" opacity=".7"/>
      <path d="M19 30v23m382-23v23" stroke="#2c2e22" stroke-width="9" stroke-linecap="round"/>
      <path d="M19 31v21m382-21v21" stroke="url(#${id}-gold)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="19" cy="41" r="6" fill="url(#${id}-rod)" stroke="#9e8755" stroke-width=".8"/>
      <circle cx="401" cy="41" r="6" fill="url(#${id}-rod)" stroke="#9e8755" stroke-width=".8"/>
      <path d="M78 31h27v41H78zM142 31h24v40h-24zM254 31h24v40h-24zM315 31h27v41h-27z"
        fill="#5b1b1c" stroke="#1c120d" stroke-width="1.2"/>
      <path d="M83 34v36m17-36v36m47-36v35m14-35v35m98-35v35m14-35v35m47-36v36m17-36v36"
        stroke="#b79a59" stroke-width=".65" stroke-dasharray="2 2" opacity=".85"/>
      <use href="#${id}-shape" fill="url(#${id}-cloth)" stroke="#190c09" stroke-width="2"/>
      <g clip-path="url(#${id}-cut)">
        <path d="M80 60C64 214 80 493 76 861h18c-10-251-12-520 6-801z" fill="#090706" opacity=".21"/>
        <path d="M110 60c-20 197-10 453-4 714l16-8c-11-252-11-523 4-706z" fill="#b96752" opacity=".1"/>
        <path d="M303 59c16 202 9 480-2 777l17 13c0-279 12-571 0-790z" fill="#080705" opacity=".22"/>
        <path d="M330 60c19 254 4 534 5 793l9 8c2-287 21-548 6-801z" fill="#bd725b" opacity=".09"/>
        <use href="#${id}-shape" fill="url(#${id}-weave)"/>
        <use href="#${id}-shape" fill="url(#${id}-worn)"/>
        <use href="#${id}-shape" fill="url(#${id}-shade)"/>
        <g fill="none" stroke="#d9b879" stroke-width="2.5" opacity=".12">
          <ellipse cx="210" cy="597" rx="73" ry="17"/>
          <path d="M137 597v37c18 26 128 26 146 0v-37m-146 18c20 25 124 25 146 0M151 590v-72c0-40 118-40 118 0v72M160 517h100M168 502h84"/>
          <path d="M195 545c0-17 30-17 30 0v23l8 10h-46l8-10zM191 582h38m-20-3v6m1-66v13"/>
          <path d="M210 694c-71-12-104-78-89-144m89 144c71-12 104-78 89-144M135 588l-23-15 17-9m7 51-22-8 14-15m29 48-24-3 7-19m32 43-22 4 2-18m113-38 22-8-14-15m-29 48 24-3-7-19m-32 43 22 4-2-18m20-74 23-15-17-9"/>
          <path d="M174 678l36 16 36-16M153 650h114m-96-17v-28m25 39v-31m27 31v-31m25 20v-28"/>
        </g>
      </g>
      <path d="M65 79c69-4 221-4 290 0l-8 658-5 91-132-71-132 71-5-91z" fill="none" stroke="url(#${id}-gold)" stroke-width="2.2"/>
      <path d="M72 86c65-4 211-4 276 0l-8 649-5 81-125-67-125 67-5-81z" fill="none" stroke="#c5a76b" stroke-width=".6" opacity=".8"/>
      <path d="M60 77l8 661 6 100 136-72 136 72 6-100 8-661" fill="none" stroke="#cfb382" stroke-width=".85" stroke-dasharray="2.8 4.2" opacity=".8"/>
      <path d="M78 105h264M79 109h262" stroke="#b49a63" stroke-width=".8" opacity=".65"/>
      <path d="M184 111h52m-49-4 6 4-6 4m46-8-6 4 6 4" fill="none" stroke="#d0b575" stroke-width=".8"/>
      <path d="m207 738 3-7 3 7-3 7z" fill="#ab8749" opacity=".8"/>
    </g>
  `);
}

/** Original carved wordmark: warm stone lettering with bronze edges and a static recessed shadow. */
export function createMenuWordmark(): SVGSVGElement {
  return artwork('wordmark', '0 0 1000 220', (id) => `
    <defs>
      <linearGradient id="${id}-face" x2="0" y2="1">
        <stop stop-color="#f1e9cd"/><stop offset=".28" stop-color="#d6cba9"/>
        <stop offset=".49" stop-color="#a79a78"/><stop offset=".53" stop-color="#eadfbb"/>
        <stop offset=".74" stop-color="#c0af83"/><stop offset="1" stop-color="#786343"/>
      </linearGradient>
      <linearGradient id="${id}-edge" x2="0" y2="1">
        <stop stop-color="#f5eacc"/><stop offset=".45" stop-color="#71634a"/><stop offset="1" stop-color="#32271a"/>
      </linearGradient>
      <pattern id="${id}-grain" width="51" height="43" patternUnits="userSpaceOnUse">
        <path d="M4 6h9m12 21h13m-30 10 8-2M34 10l6-2M19 4l-2 6" stroke="#342b21" stroke-width=".8" opacity=".32"/>
        <path d="m9 16 11-3m19 23h6M31 3h9" stroke="#fff7df" stroke-width=".65" opacity=".42"/>
        <path d="M3 26h2m22 12h2M43 20h3" stroke="#141c15" stroke-width="1.5" opacity=".25"/>
      </pattern>
      <filter id="${id}-shadow" x="-8%" y="-24%" width="116%" height="170%" color-interpolation-filters="sRGB">
        <feDropShadow dx="0" dy="6" stdDeviation="3" flood-color="#060906" flood-opacity=".95"/>
      </filter>
      <text id="${id}-letters" x="500" y="158" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="148" font-weight="bold" letter-spacing="10" textLength="887" lengthAdjust="spacingAndGlyphs">TERVAIN</text>
    </defs>
    <g filter="url(#${id}-shadow)" paint-order="stroke fill" stroke-linejoin="round">
      <use href="#${id}-letters" transform="translate(0 4)" fill="#372d20" stroke="#141a13" stroke-width="5"/>
      <use href="#${id}-letters" fill="url(#${id}-face)" stroke="url(#${id}-edge)" stroke-width="2.3"/>
      <use href="#${id}-letters" fill="url(#${id}-grain)" opacity=".65"/>
      <use href="#${id}-letters" transform="translate(0 -.65)" fill="none" stroke="#f1e5c2" stroke-width=".5" opacity=".6"/>
    </g>
    <g fill="none" stroke="#b4a077" opacity=".75">
      <path d="M335 191h117m96 0h117" stroke-width=".65"/>
      <path d="M449 191c18-1 25-4 51-13 26 9 33 12 51 13-18 1-25 4-51 13-26-9-33-12-51-13z" stroke-width="1"/>
      <path d="M479 191h42m-34-4 7 4-7 4m26-8-7 4 7 4" stroke-width=".7"/>
      <path d="m496 191 4-5 4 5-4 5z" fill="#ad9464" stroke-width=".5"/>
    </g>
  `, false);
}
