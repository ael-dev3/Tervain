# PR #767: 0.0.45 rebase verification

Head `0d32541b4d55730a5128c5edbb6fe650631b8f0d` on `9394371fe3d745a8e6d0f949eb1e49704422ffc2`. The implementation patch is unchanged (range-diff attached); #757 drops its already-merged #756 prerequisite rather than applying it twice.

9 focused tests and build pass. The stock compiled budget uses two same-revision live probes, four completed frames per probe, no allowances, no preload/init hook and the unchanged sampler. Candidate max draws/triangles/errors: 284 / 2956234 / 0; live 9394371: 284 / 2956234 / 0.

Earlier native captures and CPU studies stay pinned to their original revisions; they were not retimed or rerendered by this rebase. This is fresh compiled budget/test evidence, not current hardware pacing or heat proof. `cleanup.json` records only disposable profiles for this run; only #765 changes cleanup.
