# Game static class-name family

The producer normalizes the original 363 initializer/getter/destructor patterns
from the matching Game DLL. Six overlapping caches use their established runtime
owners; other patterns retain separate cache, descriptor, result and cleanup
identities. Capture coverage is broader than execution coverage.

The local startup walker executes the original table selection, initializer CALL,
result store and RET. It translates getters using the same platform's SharedBase
heap. The first 37 captured initializers return; execution stops at
`204b1620 -> 2000fed4` on the pointer template argument in
`.?AV?$bTRefPtrArray@PAVbCPropertyObjectBase@@@@`. It retains that getter's
completed guards and call frames without replaying earlier initializers.

The complete suite passes 3,166 tests in 292 files; typechecking, production build
and an Ardea production preview pass. The preview reports the same boundary and
3,130 environment/startup operations. These results establish a startup prefix,
not complete engine attachment, world activation or a finishable campaign.

```powershell
python tools/gothic3/prepare_game_class_name_family_source.py --study '<matching study directory>' --output assets/gothic3/game-class-name-family/source.json --runtime-output src/gothic3/native-game-class-name-family-source.ts
```

See the [rebuild guide](../../../docs/engineering/gothic3-rebuild-guide.md) for
input locations, reconstruction workflow and publication status.
