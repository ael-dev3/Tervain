# Tervain

**A serious single-player high-fantasy RPG for PC, being developed toward a Steam release.**

Explore a rugged coast, woodland roads and inhabited settlements in an original world of old orders, independent peoples and obligations older than its rulers. A Templar-inspired order affiliated with the Hegemony anchors the setting. Regional loyalties, dangerous travel and the freedom to find your own place guide the design.

*Gothic 3* and *Hyperion* are creative inspirations. Tervain's characters, geography, stories and visual identity are original; reference material is separate from the original game.

## License and commercial permissions

Eligible original Tervain software code is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE), subject to the [exact scope and exceptions](LICENSE-SCOPE.md). **Commercial use of covered code requires separate permission.** Contact [ael.dev@proton.me](mailto:ael.dev@proton.me) for permission requests.

This is a source-available project. Public access does not make its art, music, 3D models, story, branding or other non-code content freely reusable. Those materials retain their own rights and provenance. Dependencies and separately licensed files keep their existing terms; see [NOTICE](NOTICE) and [third-party notices](public/third-party-notices.txt). Gothic 3 study and reconstruction material is expressly outside this grant.

## Prototype status

The main branch contains the **0.0.10** browser prototype. Later work remains in development; a branch or version label alone does not establish a deployed release. Tervain stays in the **0.0.x** stage until its quality gate is met. A desktop package and Steam integration are not yet available.

The prototype includes:

- A sparse coastal arrival, a continuous woodland journey and inland settlements.
- A supplied animated Wanderer, grounded natural scenery and coastal water.
- World pickups, inventory, equipment, an initially empty ten-slot item hotbar, journal and map.
- Physical movable supplies, saved progress and keyboard/mouse or controller controls.
- [World sound](docs/engineering/world-audio.md), generated and crafted in code: foley, place ambience, wildlife by hour and an in-world score.
- A Templar vigil menu with The Sovereign's Oath, distant ships and a score-led spirit grove.

[Launch address](https://ael-dev3.github.io/Tervain/) — GitHub Pages is currently disabled. The source remains available for local evaluation. Use a desktop WebGL browser; save data is stored in that browser.

See the [0.0.10 release record](docs/production/releases/0.0.10.md) for verified results and limitations, and the [prototype guide](docs/engineering/prototype.md) for controls and boundaries.

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

The original Tervain game is separate from the [Gothic 3 reconstruction](docs/engineering/gothic3-browser-port.md) and the [local-install study viewer](docs/engineering/gothic3-local.md). The latter reads the visitor's own installed files in their browser and hosts no game data. Neither route grants rights to Gothic 3 material or establishes commercial-release clearance.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [LICENSE-SCOPE.md](LICENSE-SCOPE.md) before proposing work. Identify authorship and applicable terms for code and assets. Contributions do not transfer copyright or create blanket relicensing permission.
