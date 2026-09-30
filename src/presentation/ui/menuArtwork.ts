/**
 * Original Tervain title artwork, drawn as seven vector glyphs rather than a font.
 * The approved Hegemony identity informs its gold, blade and diamond vocabulary;
 * no reference-game artwork, sibling glyph meshes or replacement faction seal is used.
 * The title is static and decorative: MenuView keeps the accessible game name.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
let wordmarkInstance = 0;

/**
 * Monumental brass lettering with narrow, tapered serifs and restrained relief.
 * A lowered V anchors the inscription; the I's diamond pommel and blade-shaped foot
 * are part of the glyph silhouette. The remaining letters share one cap and baseline.
 */
export function createMenuWordmark(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const id = `tervain-menu-wordmark-${wordmarkInstance++}`;
  svg.setAttribute('viewBox', '0 0 1000 210');
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
      <linearGradient id="${id}-face" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff0bc"/>
        <stop offset=".19" stop-color="#f0d08b"/>
        <stop offset=".43" stop-color="#d5a04a"/>
        <stop offset=".58" stop-color="#efd091"/>
        <stop offset=".79" stop-color="#b98035"/>
        <stop offset="1" stop-color="#e6c278"/>
      </linearGradient>
      <linearGradient id="${id}-bevel" x1="0" y1="0" x2=".28" y2="1">
        <stop offset="0" stop-color="#fff4cb"/>
        <stop offset=".3" stop-color="#b18440"/>
        <stop offset=".52" stop-color="#f4d591"/>
        <stop offset=".72" stop-color="#5b3e22"/>
        <stop offset="1" stop-color="#c49346"/>
      </linearGradient>
      <linearGradient id="${id}-facet" x1="0" y1="0" x2="1" y2=".18">
        <stop offset="0" stop-color="#fff5ce" stop-opacity=".76"/>
        <stop offset=".48" stop-color="#e9c171" stop-opacity=".18"/>
        <stop offset="1" stop-color="#604120" stop-opacity=".6"/>
      </linearGradient>
      <filter id="${id}-shadow" x="-5%" y="-14%" width="112%" height="138%" color-interpolation-filters="sRGB">
        <feDropShadow dx="0" dy="4" stdDeviation="2" flood-color="#0c1114" flood-opacity=".78"/>
      </filter>
      <g id="${id}-letters" transform="translate(28 8)" fill-rule="evenodd">
        <path id="${id}-glyph-t" d="M0 28H118L122 53H116L109 43H73V143L87 151V157H36V151L50 143V43H13L6 53H0Z"/>
        <path id="${id}-glyph-e" d="M136 28H240L242 51H237L226 42H178V80H213L222 72H227V105H222L214 95H178V143H228L238 132H244L240 157H136V151L152 143V42L136 34Z"/>
        <path id="${id}-glyph-r" d="M256 28H320Q368 28 368 61Q368 89 338 94L364 138L383 151V157H348L308 99H298V143L313 151V157H256V151L272 143V42L256 34ZM298 42V84H318Q342 84 342 63Q342 42 318 42Z"/>
        <path id="${id}-glyph-v" d="M396 28H452V34L438 43L481 145L522 43L508 34V28H559V34L546 44L490 173L480 180L470 173L411 44L396 34Z"/>
        <path id="${id}-glyph-a" d="M571 151L586 142L631 23H645L686 142L704 151V157H651V151L665 143L656 116H607L598 143L613 151V157H571ZM613 100H650L632 48Z"/>
        <path id="${id}-glyph-i" d="M757 6L768 17L761 28H780V34L768 42V141L757 172L746 141V42L734 34V28H753L746 17ZM757 12L752 17L757 23L762 17Z"/>
        <path id="${id}-glyph-n" d="M801 28H837L902 131V42L885 34V28H940V34L924 42V157H908L840 52V143L857 151V157H801V151L817 143V42L801 34Z"/>
      </g>
      <clipPath id="${id}-cut"><use href="#${id}-letters"/></clipPath>
    </defs>
    <g filter="url(#${id}-shadow)" paint-order="stroke fill" stroke-linejoin="bevel">
      <use href="#${id}-letters" transform="translate(1.7 3.4)" fill="#25211e" stroke="#0e1519" stroke-width="6.2"/>
      <use href="#${id}-letters" fill="#75512b" stroke="#302c24" stroke-width="5.2"/>
      <use href="#${id}-letters" fill="url(#${id}-face)" stroke="url(#${id}-bevel)" stroke-width="3.4"/>
      <g clip-path="url(#${id}-cut)" transform="translate(0 0)">
        <use href="#${id}-letters" transform="translate(1.5 1.8)" fill="none" stroke="#775025" stroke-width="3.2" opacity=".58"/>
        <use href="#${id}-letters" transform="translate(-1.1 -1.1)" fill="none" stroke="#fff1c5" stroke-width="1.3" opacity=".88"/>
        <g transform="translate(28 8)">
          <path d="M55 46 61 41 68 46V140L61 148 55 142ZM157 44 164 38 173 44V141L164 150 157 144ZM277 44 285 38 293 45V141L285 150 277 144ZM416 45 426 41 481 166 477 170ZM638 32 645 52 679 142 672 147ZM751 43 757 36 763 43V139L757 160 751 139ZM822 44 830 38 835 45V142L829 150 822 144ZM907 44 914 38 919 44V141L914 151 907 144Z"
            fill="url(#${id}-facet)"/>
          <path d="M10 33H112M141 33H234M143 151H234M262 33H319Q358 34 361 57M404 33H445M516 33H551M637 29 677 143M741 33H774M807 33H834M892 33H933"
            fill="none" stroke="#fff3ce" stroke-width="1.2" opacity=".8"/>
          <path d="M57 49V137M159 48V138M279 48V138M754 47V137M824 48V138M910 49V139"
            fill="none" stroke="#fff1c7" stroke-width=".8" opacity=".62"/>
          <path d="M306 91Q344 91 351 70M307 101 350 149M612 110H650M443 48 481 140M840 47 907 148"
            fill="none" stroke="#7e542c" stroke-width="1.4" opacity=".55"/>
          <path d="M480 149 482 156 486 158 482 160 480 168 478 160 474 158 478 156Z"
            fill="#fff0bc" stroke="#9a713c" stroke-width=".6" opacity=".92"/>
          <path d="M757 30V39M757 43V157" fill="none" stroke="#fff2c3" stroke-width="1.5" opacity=".87"/>
        </g>
      </g>
      <use href="#${id}-letters" fill="none" stroke="#edd6a0" stroke-width=".65" opacity=".64"/>
    </g>
  `;
  return svg;
}
