/**
 * Shared opening for wind and foliage captures (stills and clips).
 *
 * Shot mode (?shot=1) forces reduced motion unless the URL carries motion=1 (src/app.ts), and reduced motion sets the
 * foliage wind strength to 0 (world.ts), so a capture without it records a static tree. openWindPage adds motion=1,
 * also emulates prefers-reduced-motion: no-preference for non-shot pages, waits for the world, and refuses to go on
 * while the wind strength is 0 or the pause menu is up. It changes nothing in the game for players.
 *
 *   const { page, frame } = await openWindPage(url, { w: 1280, h: 720 });
 *   await frame.look({ at: [-70.2, 78.4], dist: 12, camh: 2.2, lookh: 5, az: 0.6 });
 *   await frame.draw({ dt: 1 / 30, hour: 11 });      // advances the wind clock and draws one frame
 *   const jpeg = await page.image('jpeg', 93);
 */
import { openPage } from './cdp.mjs';

export async function openWindPage(url, { w = 1280, h = 720, requestTimeoutMs = 600000, headed = false, waitMs = 600000 } = {}) {
  const u = new URL(url);
  u.searchParams.set('motion', '1');
  const page = await openPage(u.href, { w, h, requestTimeoutMs, headed });
  try {
    await page.cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    const deadline = Date.now() + waitMs;
    for (;;) {
      const s = await page.eval('return {play:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
      if (s.failed) throw new Error('world build failed');
      if (s.play) break;
      if (Date.now() > deadline) throw new Error('page never became READY');
      await page.wait(250);
    }
    // Freeze the game's own loop; the capture draws frames itself.
    await page.eval('const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;');
    if (u.searchParams.get('windtest') === '1') for (let i = 0; i < 240 && !(await page.eval('return !!window.tervainWindTest')); i++) await page.wait(250);
    await page.eval('window.tervain.player.group.visible=false;return 1');
    const frame = {
      async look({ at, dist = 12, camh = 2.2, lookh = 5, az = 0.6 }) {
        await page.eval(`const T=window.tervain,p=[${at[0]},${at[1]}],h=T.world.terrain.heightAt(p[0],p[1]);const cx=p[0]+Math.cos(${az})*${dist},cz=p[1]+Math.sin(${az})*${dist};const ch=T.world.terrain.heightAt(cx,cz);T.player.setPosition(cx+3,cz+3,0,T.world.terrain);const camera=T.cam.camera;camera.position.set(cx,ch+${camh},cz);camera.lookAt(p[0],h+${lookh},p[1]);camera.updateMatrixWorld();return 1`);
      },
      /** One world update at `hour` (advancing the wind by dt) and one graded draw. */
      async draw({ dt = 1 / 30, hour = 11 } = {}) {
        return page.eval(`const T=window.tervain,camera=T.cam.camera;T.world.foliage.wind.update(${dt});for(const m of T.world.modules)m.module.prepare?.(T.renderer,0);T.world.update(${dt},T.game.state,T.player.group.position,T.settings,${hour},camera,false);T.grade.render(T.world.scene,camera,0,T.world.waterRenderInputs(T.settings));return T.world.foliage.strength.value`);
      },
    };
    // Guard: a static tree is the failure this helper exists to stop, so check before recording anything.
    const strength = await frame.draw({ dt: 1 / 30 });
    const state = await page.eval('return {rm:window.tervain.settings.reducedMotion,menu:!!document.querySelector(".pause-menu,.menu-open,[data-menu=pause]")}');
    if (!(strength > 0) || state.rm) throw new Error(`wind is off (foliage.strength=${strength}, reducedMotion=${state.rm}); the capture would be static`);
    return { page, frame, strength };
  } catch (error) { page.close(); throw error; }
}
