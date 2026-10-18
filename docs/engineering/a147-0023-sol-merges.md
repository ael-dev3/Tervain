# A147: 0.0.23, Sol's merges since 0.0.22

- Pine-only 0.0.22 (A146) is live; this release adds Sol's merged performance and grass work on top: #630 (sea visibility bounds around wet coastal cells), #633 (static forest uploads only for changed instance slots), #636 (trims fully faded grass tails), #637 (tree placement culling of empty regions) and #638 (resends cached forest-floor coverage when the prefix grows).
- Each merged head carried a play-gate PASS line and a baseline-then-build check against live. Frame pacing on the release build: median 16.7 ms, p95 17.1 ms, 0.5% of frames over 25 ms.
- The oak floating-foliage work (hero and verdant oaks) is not in this release; its open audit is recorded in A146 and the decisions log.
