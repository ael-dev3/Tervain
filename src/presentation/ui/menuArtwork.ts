/**
 * Original Tervain inscription, authored as vector silhouettes and metal facets.
 * Gold, tapered points and the blade-I connect it to the shared Hegemony identity.
 * It contains no separate seal or copied reference lettering. MenuView supplies
 * the accessible heading; this artwork stays static and decorative.
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
let wordmarkInstance = 0;

export function createMenuWordmark(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const id = `tervain-menu-wordmark-${wordmarkInstance++}`;
  svg.setAttribute('viewBox', '0 0 1020 250');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('role', 'presentation');
  svg.setAttribute('class', 'menu-wordmark-art');
  svg.style.pointerEvents = 'none';
  svg.innerHTML = `
    <defs>
      <linearGradient id="${id}-face" x1="0" y1="0" x2=".14" y2="1">
        <stop offset="0" stop-color="#fff0b8"/>
        <stop offset=".22" stop-color="#e5b34e"/>
        <stop offset=".43" stop-color="#a96320"/>
        <stop offset=".48" stop-color="#e2ac43"/>
        <stop offset=".61" stop-color="#f9d989"/>
        <stop offset=".83" stop-color="#b67627"/>
        <stop offset="1" stop-color="#ebbc60"/>
      </linearGradient>
      <linearGradient id="${id}-bevel" x1="0" y1="0" x2=".65" y2="1">
        <stop offset="0" stop-color="#fff4c7"/>
        <stop offset=".25" stop-color="#d6a14a"/>
        <stop offset=".46" stop-color="#744721"/>
        <stop offset=".58" stop-color="#f3ce7b"/>
        <stop offset="1" stop-color="#70451e"/>
      </linearGradient>
      <linearGradient id="${id}-lit-plane" x1="0" y1="0" x2="1" y2=".28">
        <stop offset="0" stop-color="#fff6d4" stop-opacity=".9"/>
        <stop offset=".52" stop-color="#f1ce7e" stop-opacity=".45"/>
        <stop offset="1" stop-color="#dc9837" stop-opacity=".12"/>
      </linearGradient>
      <linearGradient id="${id}-recess" x1="0" y1="0" x2="1" y2=".1">
        <stop offset="0" stop-color="#754017" stop-opacity=".1"/>
        <stop offset=".66" stop-color="#633415" stop-opacity=".48"/>
        <stop offset="1" stop-color="#48291b" stop-opacity=".75"/>
      </linearGradient>
      <filter id="${id}-shadow" x="-6%" y="-10%" width="115%" height="140%" color-interpolation-filters="sRGB">
        <feDropShadow dx="1" dy="7" stdDeviation="3" flood-color="#100e0d" flood-opacity=".8"/>
      </filter>
      <g id="${id}-letters" transform="translate(32 10)" fill-rule="evenodd">
        <path d="M0 48H118L123 88L115 84L105 67H75V176L87 187L91 198H32L36 187L51 176V67H15L4 86L-4 88Z"/>
        <path d="M140 48H246L250 86L241 81L230 66H184V107H217L229 95L232 96V139L229 140L217 124H184V177H231L249 157L254 159L248 198H139L145 185L155 176V69L141 58Z"/>
        <path d="M267 48H332Q380 48 380 86Q380 115 348 121L377 171L403 193V199H361L317 127H309V176L326 189V198H267L273 185L284 176V69L268 59ZM309 66V110H329Q355 110 355 88Q355 66 329 66Z"/>
        <path d="M401 48H462L456 60L445 68L487 158L528 68L517 61L512 48H569L564 62L551 71L495 204L485 214L475 203L419 71L406 61Z"/>
        <path d="M575 186L589 176L637 43H650L694 176L711 186L716 198H656L660 187L671 177L661 147H615L605 177L619 187L623 198H571ZM621 130H655L639 83Z"/>
        <path d="M765 14L782 34L775 51H791L796 62L779 74V172L765 215L751 172V74L734 62L739 51H755L748 34ZM765 23L757 34L765 43L773 34Z"/>
        <path d="M812 48H850L914 160V71L896 60L892 48H952L948 60L934 71V198H914L850 91V176L868 189V198H811L817 185L828 176V70L811 58Z"/>
      </g>
      <clipPath id="${id}-cut"><use href="#${id}-letters"/></clipPath>
    </defs>
    <g filter="url(#${id}-shadow)" stroke-linejoin="bevel" paint-order="stroke fill">
      <use href="#${id}-letters" transform="translate(3.5 6.5)" fill="#3a281e" stroke="#111314" stroke-width="8"/>
      <use href="#${id}-letters" fill="#94602d" stroke="#38291e" stroke-width="7"/>
      <use href="#${id}-letters" fill="url(#${id}-face)" stroke="url(#${id}-bevel)" stroke-width="4.8"/>
      <g clip-path="url(#${id}-cut)">
        <!-- Offset edges are clipped to the face, forming light and recessed inner bevels. -->
        <use href="#${id}-letters" transform="translate(2.2 2.8)" fill="none" stroke="#5b331c" stroke-width="5.6" opacity=".64"/>
        <use href="#${id}-letters" transform="translate(-1.8 -1.8)" fill="none" stroke="#fff0be" stroke-width="2.4" opacity=".88"/>
        <g transform="translate(32 10)">
          <!-- Broad planes follow the actual stems; they never float outside a glyph. -->
          <path d="M55 73L63 65L69 74V173L63 184L55 177ZM160 72L168 64L177 71V175L168 187L160 178ZM289 71L297 64L303 72V175L297 187L289 179ZM424 72L434 66L485 188L484 204L477 198ZM643 55L650 71L686 175L679 184L664 144ZM754 76L765 67V196L758 172ZM833 73L842 64L846 77V175L840 187L833 179ZM919 73L925 64L929 75V176L925 188L919 184Z"
            fill="url(#${id}-lit-plane)"/>
          <path d="M64 76L71 72V177L64 188ZM170 73L179 69V180L170 191ZM298 74L305 70V180L298 192ZM322 124L333 122L377 190L363 190ZM488 176L534 73L544 66L493 200L486 206ZM640 85L650 116L686 184L676 183L659 139ZM766 74L776 78V171L767 197ZM849 71L854 64L916 177L916 190L848 75ZM926 75L931 70V188L926 193Z"
            fill="url(#${id}-recess)"/>
          <path d="M3 54H113L117 72M145 54H241L245 73M146 191H242M273 54H331Q365 54 371 78M408 54H453M519 54H559M644 50L686 176M739 57H790M818 54H846M899 54H945"
            fill="none" stroke="#fff1c5" stroke-width="1.5" opacity=".9"/>
          <path d="M63 77V171M168 76V171M297 77V171M840 78V171M925 78V172M765 76V195"
            fill="none" stroke="#633b20" stroke-width="1.4" opacity=".76"/>
          <path d="M62 78V169M167 77V169M296 78V169M839 79V169M924 79V170M763.5 76V192"
            fill="none" stroke="#fff1bf" stroke-width="1" opacity=".83"/>
          <path d="M315 117H330Q354 117 365 103M322 130L367 188M621 139H654M438 73L483 173M855 83L909 177M753 34L765 19L777 34M757 47L765 50L773 47M741 63H789"
            fill="none" stroke="#fff0b7" stroke-width="1.5" opacity=".72"/>
          <!-- A few authored chisel marks give scale without a noisy generated texture. -->
          <path d="M25 60L38 61M82 58L99 57M164 94L171 93M209 186L222 184M291 153L297 151M356 74L361 72M471 148L476 151M631 67L637 65M673 188L684 186M759 113L764 111M851 61L857 63M920 146L926 144"
            fill="none" stroke="#704321" stroke-width="1" opacity=".3"/>
        </g>
      </g>
      <use href="#${id}-letters" fill="none" stroke="#f1d392" stroke-width=".7" opacity=".65"/>
    </g>
  `;
  return svg;
}
