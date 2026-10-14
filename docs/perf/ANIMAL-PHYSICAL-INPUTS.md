# Wildlife physical input reuse

Grass requests every visible animal's physical inputs each world update. The getter previously built a filtered array, a mapped array and a fresh physical record per animal on every read. Cache one record per animal and reuse the returned array; refresh positions and live/corpse dimensions on every read, and omit ridden or invisible animals.

The interface now explicitly describes these values as borrowed until the next read. The production consumer iterates them synchronously; callers retaining historical values must copy them. The pool is owned per wildlife controller, so separate worlds do not share storage. This does not cache positions or suppress simulation updates.

## Before/after proof

```sh
node tools/repro-animal-physical-inputs.mjs --baseline 421d34b --out animal-physical-input-proof
npx vitest run tests/presentation/animalPhysicalInputs.test.ts tests/presentation/animalHunting.test.ts tests/presentation/animals.test.ts tests/presentation/animalConstruction.test.ts
npm run build
```

The native fixture builds actual animal controllers from all 19 delivered, textured, rigged GLBs. It performs 120 controlled root translations and reads, recording every output value. Original and candidate sources run in separate software-WebGL pages with shared dependencies. The fixture asserts equal snapshot hashes and renders the first model through native Grade/4× MSAA.

| Counter, 120 reads | Before | After |
| --- | ---: | ---: |
| Returned array identities | 120 | 1 |
| Physical input record identities | 2,280 | 19 |
| Draw calls | 5 | 5 |
| Triangles | 47,159 | 47,159 |
| Textures | 8 | 8 |
| Source upload bytes | 15,312,478 | 15,312,478 |
| Nominal texture image/mip payload bytes | 18,335,776 | 18,335,776 |

Every snapshot value and captured RGB channel matches; GL errors are zero. These identity counts cover the exposed input records and returned arrays, not all heap allocations; corpse-contact temporaries are outside this change. The render is a model fixture, not a full-world performance or heat test.

43 focused tests pass, including moved roots, riding, corpse dimensions, skinning/restoration and independent-world ownership. The production build passes.

[Native receipt](proofs/animal-physical-inputs/report.json) · [Before](proofs/animal-physical-inputs/before.png) · [After](proofs/animal-physical-inputs/after.png).

Live release baseline: https://ael-dev3.github.io/Tervain/ (0.0.18 · 421d34b). Hardware frame-time gains require a separate hardware gate.
