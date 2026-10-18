# A149: 0.0.25, oak detached clumps moved onto wood

- Each detached oak leaf clump (a group of cards with no sample point within 1.5 m of wood, measured in the tree's local units) is translated 90% of the way to its nearest wood point. No card is removed, so the clump keeps its size and orientation.
- Canopy audit, oak: detached clumps 542 → 516; detached cards 5,988 → 5,368. Total: 712 → 686 clumps. The remaining oak clumps are the next goal.
- Budget gate against live 0.0.24: draws 237 and triangles 2,860,704 against live's 237 and 2,862,984; no console errors.
- Same-pose stills of the upper crown on the candidate and on live match. A woods play clip passes the gate.
- Not yet done: a test asserting the generator flags exactly the audit's detached clumps. The audit and generator currently use different groupings.
