# Hero-oak twig-root contact lead

On published **0.0.33 · b317734**, registered near wood position/index bytes and the complete twig plans for all three hero-oak variants match the source study exactly. The native inspection reads actual registered geometry with raster suppressed; it is not an image, GPU timing or visual-quality proof.

| Near template | Retained twigs | Root centres >0.12 local m from other wood | Max local distance | Registered example (world x,z) |
| --- | ---: | ---: | ---: | --- |
| hero-oak | 24 | 2 | 2.526215 | tree:wild:45:12 (-92.580,-89.193) |
| hero-oak-b | 22 | 3 | 0.506531 | tree:wild:57:20 (-17.989,-38.186) |
| hero-oak-c | 31 | 5 | 2.135182 | tree:wild:68:13 (51.161,-79.837) |

These are **ten root rings across three instanced templates**, not ten world trees or ten detached crown islands. Distances are template-local units; instance scale is not applied. The metric compares the first rendered ring's centre with other indexed wood triangles after excluding its own entire twig. A centre-to-surface distance is not literal surface clearance. It does not prove that the twig lacks contact farther along its body or validate its wind pose.

The hero's `userData.twigIndex` is a collision-prefix boundary, not the start of generated twig indices. The study infers the appended vertex/index ranges from the actual retained plans and checks both final boundaries, avoiding that false measurement.

[Source distances and hashes](proofs/hero-twig-root-study/source.json), [actual published registered buffers/plans](proofs/hero-twig-root-study/native.json), [independent agreement](proofs/hero-twig-root-study/agreement.json).

Reproduce on this snapshot:

```sh
HERO_ROOT_STUDY_OUT=hero-root-study.json npx vitest run tests/presentation/heroTwigRootStudy.test.ts
```

The test measures the real GLBs and production factory without altering them. It checks geometry-range accounting and finite distances; it does not require defects to remain present in future models.

A preliminary reuse of the birch re-anchor removes these root-centre flags with unchanged triangle counts, but later seating moves 24 leaf-position scalars. That variant is held: it is not a wood-only fix. Next checks are a repair after leaf placement, whole-stem contact and native wind/image/budget evidence. No production tree or generator change is included.
