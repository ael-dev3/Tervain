# Tervain

**A serious single-player high-fantasy RPG for PC, being developed toward a Steam release.**

Explore a rugged coast, woodland roads and inhabited settlements in an original world of old orders, independent peoples and obligations older than its rulers. A Templar-inspired order affiliated with the Hegemony anchors the setting. Regional loyalties, dangerous travel and the freedom to find your own place guide the design.

*Gothic 3* and *Hyperion* are creative inspirations. Tervain's characters, geography, stories and visual identity are original; reference material is separate from the original game.

## License and commercial permissions

Eligible original Tervain software code is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE), subject to the [exact scope and exceptions](LICENSE-SCOPE.md). **Commercial use of covered code requires separate permission.** Contact [ael.dev@proton.me](mailto:ael.dev@proton.me) for permission requests.

This is a source-available project. Public access does not make its art, music, 3D models, story, branding or other non-code content freely reusable. Those materials retain their own rights and provenance. Dependencies and separately licensed files keep their existing terms; see [NOTICE](NOTICE) and [third-party notices](public/third-party-notices.txt). Gothic 3 study and reconstruction material is expressly outside this grant.

For models, see the [3D asset credits and license ledger](docs/engineering/model-licenses.md), also linked from the game's About screen. A confirmed Creative Commons asset retains its own permitted uses, including commercial uses where its license allows them; the code license does not restrict those rights. Model entries with unresolved provenance are explicitly marked pending.

## Prototype status

The **0.0.13 hunting review candidate** builds on the verified **0.0.12** published baseline. Strict TypeScript, production builds, the combined suite of 1,575 tests in 157 files and browser gameplay/cover checks pass. The hunting game has not been deployed. Tervain stays in the **0.0.x** stage until its quality gate is met. A desktop package and Steam integration are not yet available.

Find the bow, knife and 24 arrows beside the woodland trail; one head hit or two body hits kills an animal. Skin the carcass for hide and meat, then exchange a hide for six arrows. The candidate adds 18 distinct supplied, rigged animals, each below 50,000 triangles; the nineteenth boar still awaits its source model. See the [hunting guide](docs/engineering/hunting-0.0.13.md) and [candidate release record](docs/production/releases/0.0.13.md).

The prototype includes:

- A sparse coastal arrival, a continuous woodland journey and inland settlements.
- The animated Wanderer, 17 adapted Meshy NPC roles and diverse supplied-tree habitats, with protected custom Pine geometry.
- Rougher terrain, rooted vegetation, weathered buildings, grounded scenery and coastal water.
- Adaptive world music, surface footsteps, item/combat/work sounds, wildlife and captioned resident speech.
- World pickups, inventory, equipment, an initially empty ten-slot item hotbar, journal and map.
- The hunting candidate adds aim/draw/release bow controls, one-time animated carcass harvesting and saved hunting progress.
- Physical movable supplies, saved progress and keyboard/mouse or controller controls.
- A Templar vigil menu with The Sovereign's Oath, distant ships and a score-led spirit grove.

**[Launch Tervain](https://ael-dev3.github.io/Tervain/)** — The verified live baseline is 0.0.12; the hunting candidate has not been deployed as a game. The complete 19-animal release awaits its remaining source model. Use a desktop WebGL browser; save data is stored in that browser. The title shows the version and F3 shows the source revision.

See the [0.0.12 release record](docs/production/releases/0.0.12.md) for verified results and limitations, and the [prototype guide](docs/engineering/prototype.md) for controls and boundaries.

## Develop locally

```sh
npm ci
npm run dev
```

Validate changes with:

```sh
npm run typecheck
npm test
npm run build
```

Browser checks do not establish packaged desktop compatibility or performance on other hardware.

## Project documentation

- [Vision](docs/vision.md)
- [Setting and original-world direction](docs/world/setting.md)
- [Decision register](docs/decisions.md)
- [Vertical slice](docs/production/vertical-slice.md)
- [Art direction](docs/art/art-audio-ui.md)
- [Shared asset provenance](docs/engineering/shared-assets.md)

## Separate study viewers

The [Gothic 3 / Ardea reconstruction](https://ael-dev3.github.io/Tervain/gothic3/) is an incomplete TypeScript browser port; see its [scope and controls](docs/engineering/gothic3-browser-port.md) and [rebuilding process](docs/engineering/gothic3-rebuild-overview.md). It is separate from the original Tervain game and from the [local-install study viewer](docs/engineering/gothic3-local.md), which reads the visitor's own installed files in their browser and hosts no game data. Neither route grants rights to Gothic 3 material or establishes commercial-release clearance.

### Gothic 3 study viewer examples

<p align="center">
  <img src="docs/engineering/gothic3-local/coast.jpg" width="49%" alt="Gothic 3: tall grass on a sea cliff above a sandy beach.">
  <img src="docs/engineering/gothic3-local/ardea.jpg" width="49%" alt="Gothic 3: Ardea's cobbled square, roofs and palisade.">
  <img src="docs/engineering/gothic3-local/forest.jpg" width="49%" alt="Gothic 3: lichen-covered rocks and dry grass beside a fir forest.">
  <img src="docs/engineering/gothic3-local/bay.jpg" width="49%" alt="Gothic 3: a watchtower on a cliff above a quiet bay.">
</p>

<sub>These pictures show the separate Gothic 3 local-install study viewer, 4 October 2026, not Tervain. Gothic 3 © THQ Nordic GmbH, developed by Piranha Bytes. The viewer is not affiliated with or endorsed by them. See [screenshot provenance](docs/engineering/gothic3-local.md#screenshots).</sub>

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [LICENSE-SCOPE.md](LICENSE-SCOPE.md) before proposing work. Identify authorship and applicable terms for code and assets. Contributions do not transfer copyright or create blanket relicensing permission.
