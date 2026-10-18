# Live baseline retry

The repeat started against 0.0.28 · 22b9fd1, then failed during world loading. Pages had moved to 0.0.29 · 4b4982b. The browser reported a failed dynamic import of `assets/world-dNS2xJIy.js`; a subsequent public request confirmed HTTP 404. No CPU or budget sample was recorded, and this retry supplies no PASS receipt.

The seven successful image pairs and the completed CPU pair in this directory remain explicitly scoped to 0.0.28. Repeat after rebasing against the newly published build. Stale-shell recovery requires separate reproduction before proposing a fix.
