# PR #767: 0.0.45 rebase verification

Head `aabff10e177e6f9312cb2e789e3f62d39a883903` on `0a9c0383a7670b475bd20ecc8da97dc235820710`. The implementation patch is unchanged (range-diff attached); #757 drops its already-merged #756 prerequisite rather than applying it twice.

9 focused tests and build pass. The stock compiled budget uses two same-revision live probes, four completed frames per probe, no allowances, no preload/init hook and the unchanged sampler. Candidate max draws/triangles/errors: 284 / 2956234 / 0; live 0a9c038: 284 / 2956234 / 0.

Earlier native captures and CPU studies stay pinned to their original revisions; they were not retimed or rerendered by this rebase. This is fresh compiled budget/test evidence, not current hardware pacing or heat proof. `cleanup.json` records only disposable profiles for this run; only #765 changes cleanup.
