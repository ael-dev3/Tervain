# AI helper accessor creator startup

Original initializer `204b2720` calls AI helper administrator class-name getter
`200191f0`, then passes that CString pointer and retained PropertyID `207b52a8`
to SharedBase's `bCAccessorCreator` constructor import `207d86b4`. Its receiver
is the separate four-byte image storage `207b52bc`.

The source package records nine original instructions, constructor and cleanup
imports, receiver storage, and cleanup callback `20549d50`. It is reproducible:

```powershell
python tools/gothic3/prepare_ai_helper_accessor_creator_source.py --study "C:/Users/heyas/OneDrive/Рабочий стол/Gothic3_Decompiled_Study_2026-10-04" --output assets/gothic3/ai-helper-accessor-creator-startup/research.json --typescript src/gothic3/native-game-ai-helper-accessor-creator-source.ts
```

The class-name call is connected to the existing canonical CString owner.
The constructor enters the original object query. The query resolves the
registered AI helper type, retrieves its factory and dispatches the root
wrapper's original clone routine. The clone allocates and constructs its base,
obtains the canonical type and enters non-root initialization. That path
allocates a separate component and stops before its Engine constructor CALL
`200766b2`. Reference callbacks, cleanup registration and initializer return
remain unfinished. Captured source alone proves no runtime execution. See the
[rebuild guide](../../../docs/engineering/gothic3-rebuild-guide.md) for validation
receipts and the remaining campaign work.
