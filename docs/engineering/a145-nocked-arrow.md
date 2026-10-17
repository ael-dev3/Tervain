# A145: the nocked arrow reads from the shoulder camera

- While aiming, the camera sits behind and beside the hero, so his own draw arm and torso stood between it and the nocked arrow. A probe during a held aim showed the arrow built, visible and on screen (about 130 px long at 1440x900), hidden inside the sleeve and torso. The string above the shoulder was the only part that showed.
- The nocked arrow's meshes now ignore depth and draw late (`renderOrder` 6), so the shaft, tip and fletching read over the body, attached to the string's nock point. It is only ever on the string while aiming; the arrow in flight is a separate object and is unchanged.
- Test: `tests/presentation/playerHunting.test.ts` checks that every nocked-arrow mesh ignores depth and draws late.
