# Tervain

**A serious single-player high-fantasy RPG for PC, being developed toward a Steam release.**

Explore a rugged coast, woodland roads and inhabited settlements in an original world of old orders, independent peoples and obligations older than its rulers. A Templar-inspired order affiliated with the Hegemony anchors the setting. Regional loyalties, dangerous travel and the freedom to find your own place guide the design.

*Gothic 3* and *Hyperion* are creative inspirations. Tervain's characters, geography, stories and visual identity are original; reference material is separate from the original game.

## License and commercial permissions

Eligible original Tervain software code is offered under the [PolyForm Noncommercial License 1.0.0](LICENSE), subject to the [exact scope and exceptions](LICENSE-SCOPE.md). **Commercial use of covered code requires separate permission.** Contact [ael.dev@proton.me](mailto:ael.dev@proton.me) for permission requests.

This is a source-available project. Public access does not make its art, music, 3D models, story, branding or other non-code content freely reusable. Those materials retain their own rights and provenance. Dependencies and separately licensed files keep their existing terms; see [NOTICE](NOTICE) and [third-party notices](public/third-party-notices.txt). Gothic 3 study and reconstruction material is expressly outside this grant.

For models, see the [3D asset credits and license ledger](docs/engineering/model-licenses.md), also linked from the game's About screen. A confirmed Creative Commons asset retains its own permitted uses, including commercial uses where its license allows them; the code license does not restrict those rights. Model entries with unresolved provenance are explicitly marked pending.

## Prototype status

This integration develops the **0.0.13** browser prototype. A source version alone does not establish deployment; check the normal publish workflow and the game’s displayed revision. Tervain stays in the **0.0.x** stage until its quality gate is met. A desktop package and Steam integration are not yet available.

The prototype includes:

- A sparse coastal arrival, a continuous woodland journey and inland settlements.
- The animated Wanderer, 17 adapted Meshy NPC roles and diverse supplied-tree habitats, with protected custom Pine geometry.
- Residents on full-body rigs of their own, moving with authored motion: walks matched to the ground they cover,
  idles and conversation, sitting down on real benches and getting up, a working motion for every trade with tools in
  hand, and fights; skirts and capes that hold together in motion, and skin, cloth, leather and steel that shade as
  what they are.
- Rougher terrain, rooted vegetation and grounded scenery; every building can be walked into, through a door that swings
  open, to furnished rooms with a fire in the hearth.
- Weathered, high-resolution surfaces: rubble in dirty mortar, peeling damp-stained render, split boards, sooted tiles and
  mossy thatch, under matte materials and an earthy grade.
- One physical water system: a refracting, breaking sea with surf and swash, streams within their banks, a spring
  and its pool; floating cargo, wading, an authored breaststroke and a view under the surface.
- Lush blade-by-blade meadows that gusts sweep across and that the hero, residents, animals and cargo push through,
  leaving trails that slowly close.
- Woods that move in the same wind: trunks lean and sway, branches swing and leaves flutter and glow against the
  light; ferns part around the hero and a struck tree shakes and drops a few leaves.
- Nineteen supplied, optimized and rigged animals across settlement, forest and warm-woodland habitats.
- Bow hunting, grounded carcasses and saved skinning rewards for thirteen wild animals; cats, dogs and the saddled trail mount remain protected. Rowan Vale welcomes you at a solid woodland supply table with an offline Eleven v4 voice.
- Adaptive world music, surface footsteps, item/combat/work sounds, wildlife and captioned resident speech.
- World pickups, inventory, equipment, an initially empty ten-slot item hotbar, journal and map.
- Physical movable supplies, saved progress and keyboard/mouse or controller controls.
- A Templar vigil menu with The Sovereign's Oath, distant ships, a score-led spirit grove and a backlit heath that the sea wind, a grazing stag and your pointer move through.

**[Launch Tervain](https://ael-dev3.github.io/Tervain/)** — Published from `main` through the normal GitHub Pages workflow. Use a desktop WebGL browser; save data is stored in that browser. The title shows the version and F3 shows the source revision.

See the [0.0.13 release record](docs/production/releases/0.0.13.md) for verified results and limitations, and the [prototype guide](docs/engineering/prototype.md) for controls and boundaries.

## Gothic 3 browser reconstruction

The separate `/gothic3/` reconstruction is being implemented in TypeScript from
local asset and native behavior evidence. Startup and campaign integration are
still incomplete.

- [Gothic 3 rebuilding process: start here](docs/engineering/gothic3-rebuild-guide.md)
- [How rebuilding works](docs/engineering/gothic3-rebuild-overview.md)
- [Step-by-step process, repository map and current status](docs/engineering/gothic3-rebuild-workflow.md)
- [Technical checkpoint history](docs/engineering/gothic3-rebuilding-process.md)

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
- [Illustrated Gothic 3 video / Tervain visual audit](docs/art/studies/gothic3-video-2026-10-05/README.md) — dated study, comparisons and selected motion evidence.
- [Shared asset provenance](docs/engineering/shared-assets.md)
- [Gothic 3 rebuilding process](docs/engineering/gothic3-rebuild-overview.md) — source folders, extraction and behavior research, TypeScript integration, reproduction commands, hosting and unfinished campaign work.

## Gothic 3 browser rebuild and study viewers

See the [step-by-step Gothic 3 rebuild workflow](docs/engineering/gothic3-rebuild-workflow.md) for extraction, behavior research, TypeScript integration, validation and hosting.

The [Gothic 3 / Ardea reconstruction](https://ael-dev3.github.io/Tervain/gothic3/)
is a separate, incomplete TypeScript browser port. The rebuild proceeds in
connected stages. It is a new browser implementation guided by the installed
game; the Windows executable is not compiled into the site, and decompiled
listings are not treated as original source code.

### Rebuilding process

1. **Inventory the source.** Read the local installation and offline study as
   references. Hash the inputs and identify the archive or patch layer that
   supplies each resource, so an older duplicate is not selected by accident.
2. **Decode selected data.** Use format-specific tools for world placements,
   geometry, actors, textures, materials, animation and gameplay records. Keep
   source paths, hashes, coordinate conversions and known omissions with the
   portable browser assets.
3. **Recover behavior.** Trace one native operation at a time through functions,
   callbacks, layouts and state changes. Decompiled listings help navigate the
   code, but compare important claims with original binary bytes and game data.
   Leave unresolved engine calls explicit instead of guessing.
4. **Implement a bounded slice.** Recreate the supported operation in
   TypeScript, using the source-derived identities and values. An isolated
   reader or formula is still a component, not a playable feature.
5. **Connect the slice to gameplay.** Make its assets and behavior use the same
   live world and saved state as ordinary play: input, actors, interactions,
   quests, time and save/load as needed for that feature.
6. **Review and expand.** Run the relevant checks, exercise the exact scenario
   in the browser, and verify save/restore when it applies. Record what worked
   and what remains missing, then connect the next part of the campaign.
   Completion means starting a new game and reaching an available ending with
   the surrounding NPC, quest, combat, travel and save systems working together.

An extracted file, converted model, passing unit test or successful build only
proves its own part of this chain. The [rebuilding overview](docs/engineering/gothic3-rebuild-overview.md)
explains the method with examples, and the
[detailed process with dated checkpoints](docs/engineering/gothic3-rebuilding-process.md)
keeps the evidence and implementation history. See also the
[current scope and controls](docs/engineering/gothic3-browser-port.md).

This project is separate from the original Tervain game and from the
[local-install study viewer](docs/engineering/gothic3-local.md), which reads
the visitor's own installed files in their browser and hosts no game data.
Neither route grants rights to Gothic 3 material or establishes
commercial-release clearance.

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
