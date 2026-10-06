import { describe, expect, it } from 'vitest';
import { connectOriginalEntityRead } from '../../src/gothic3/entity-loading';
import type { NativeEntityReadServices } from '../../src/gothic3/entity-loading';
import { NativeEntityReadData } from '../../src/gothic3/entity-reading';
import { NativeLiveEntity } from '../../src/gothic3/entity-lifecycle';
import { NativeEntitySetters, NativeSceneNameRegistry } from '../../src/gothic3/entity-setters';
import { OriginalPropertyOwner } from '../../src/gothic3/native-properties';

function fixture() {
  const entity = new NativeLiveEntity('physical-entity',
    OriginalPropertyOwner.fromConstructor('physical-entity', 'gCEntity'), '1'.repeat(32) + '00000000');
  const data = new NativeEntityReadData(entity, { worldMatrix: new Array(16), localMatrix: new Array(16),
    treeBox: new Array(6), localBox: new Array(6), worldBox: new Array(6), worldSphere: new Array(4), localSphere: new Array(4) }, '');
  const setters = new NativeEntitySetters({
    child: () => { throw new Error('No children are owned by this fixture.'); },
    collisionShape: () => { throw new Error('Collision is outside this setter exercise.'); },
    physicalObject: () => { throw new Error('Physics is outside this setter exercise.'); },
    modified: target => ({ known: true, value: target.entity.propertyOwner.modified() }),
    entityProcessingChanged: () => { throw new Error('The fixture is not in processing range.'); },
  }, new NativeSceneNameRegistry());
  // Unexercised dependencies throw rather than standing in as successful native callbacks.
  const uncalled = new Proxy({}, { get() { throw new Error('Unexpected reader dependency'); } });
  const host = connectOriginalEntityRead({ setters,
    properties: uncalled, reflection: uncalled, diagnostics: uncalled,
    pureScalingX: () => { throw new Error('Unexpected scaling operation'); },
  } as unknown as NativeEntityReadServices);
  return { entity, data, setters, host };
}

describe('composed original entity read setter', () => {
  it('retains the controller receiver and writes the same physical flag storage', () => {
    const { entity, data, host } = fixture();
    expect(host.setter(data, 'Enable', false)).toEqual({ known: true, value: undefined });
    expect(entity.flags.value & 8).toBe(0);
    expect(host.setter(data, 'Enable', true)).toEqual({ known: true, value: undefined });
    expect(entity.flags.value & 8).toBe(8);
    expect(entity.flags.knownMask & 8).toBe(8);
  });

  it('forwards render alpha and recursive arguments to the retained controller', () => {
    const { data, host } = fixture();
    expect(host.setter(data, 'SetRenderAlphaValue', Math.fround(0.25), true))
      .toEqual({ known: true, value: undefined });
    expect(data.numeric.get(0x34)).toBe(0.25);
  });

  it('returns a rejected scalar as unknown without writing a fabricated alpha', () => {
    const { data, host, setters } = fixture();
    expect(host.setter(data, 'SetRenderAlphaValue', NaN)).toEqual({ known: false,
      reason: 'Render alpha requires native finite float32' });
    expect(data.numeric.has(0x34)).toBe(false);
    expect(setters.readHostSetter(data, 'Enable', false).known).toBe(false);
  });
});
