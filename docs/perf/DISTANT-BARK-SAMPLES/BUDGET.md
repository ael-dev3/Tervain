# Budget gate: PASS

- Live (https://ael-dev3.github.io/Tervain/, revision b317734): draw calls 285, triangles 3048306, console errors 0
- Candidate (<candidate-build-url>, revision de2cf5322): draw calls 285, triangles 3048306, console errors 0
- Draws not above live: yes; triangles not above live: yes; no console errors: yes; revision matches head de2cf53223572bfef0ab1f77ca0ed399ed9b8478: yes; maximum over four samples; live is the larger of two live probes
- Not measured by the page: texture taps, shader cost, JS frame CPU. Each PR posts its own cost table; the gate does not claim them.
- Wall-clock pacing (over-25 ms share, p95): advisory only, see docs/perf/LATEST.md (A/A band 1.7 points). Not a pass/fail condition.

play-gate: PASS de2cf5322
