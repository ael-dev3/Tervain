import { describe, expect, it } from 'vitest';
import type { NativeValue } from '../../src/gothic3/dialogue';
import type { NativeHeapCString } from '../../src/gothic3/native-heap-cstring';
import { NativeHeapObjectViews } from '../../src/gothic3/native-heap-views';
import { NativeGameScriptAdminLookup } from '../../src/gothic3/native-game-script-admin-lookup';
import type { NativeGameScriptAdminLookupHost } from '../../src/gothic3/native-game-script-admin-lookup';

const known = <T>(value: T): NativeValue<T> => ({ known: true, value });
const unknown = <T>(reason: string): NativeValue<T> => ({ known: false, reason });
type TestAdmin = { identity: object };
function views(bytes: number) {
  return new NativeHeapObjectViews({ identity: {}, bytes: new Uint8Array(bytes),
    knownMask: new Uint8Array(bytes).fill(255), freed: false });
}
function name(): NativeHeapCString {
  // This test double supplies the class-name text only. CString construction,
  // allocation and destruction remain a separate owner and are not exercised.
  return { text: () => known('gCScriptAdmin') } as unknown as NativeHeapCString;
}
function fixture(overrides: Partial<NativeGameScriptAdminLookupHost<TestAdmin, object>> = {}, classNameValue = name()) {
  const application = views(1), globals = views(8);
  const module = {}, admin: TestAdmin = { identity: {} }, calls: string[] = [];
  const className = classNameValue;
  const host: NativeGameScriptAdminLookupHost<TestAdmin, typeof module> = {
    className: () => { calls.push('className'); return known(className); },
    moduleAdmin: () => { calls.push('moduleAdmin'); return known(module); },
    findModule: (owner, actualName) => {
      expect(owner).toBe(module); expect(actualName).toBe(className); calls.push('findModule'); return known(admin);
    },
    dynamicCast: (component, source, target) => {
      expect(component).toBe(admin); expect(source).toBe('eCEngineComponentBase');
      expect(target).toBe('gCScriptAdmin'); calls.push('dynamicCast'); return known(component as TestAdmin | null);
    },
    ...overrides,
  };
  const lookup = new NativeGameScriptAdminLookup(application, globals, host);
  return { application, globals, host, lookup, calls, module, admin, className };
}

describe('source ScriptAdmin lazy singleton getter', () => {
  it('returns NULL before Engine initialization without setting the Game guard', () => {
    const f = fixture();
    expect(f.lookup.getInstance()).toEqual(known(null));
    f.application.writeUnsigned(0, 2, 1);
    expect(f.lookup.getInstance()).toEqual(known(null));
    expect(f.globals.readUnsigned(4)).toBe(0);
    expect(f.calls).toEqual([]);
  });

  it('sets the guard first, looks up by the exact type name, casts and caches once', () => {
    const f = fixture(); f.application.writeUnsigned(0, 1, 1);
    expect(f.lookup.getInstance()).toEqual(known(f.admin));
    expect(f.globals.readUnsigned(4)).toBe(1);
    expect(f.globals.pointer(0).get()).toBe(f.admin);
    expect(f.calls).toEqual(['className', 'moduleAdmin', 'findModule', 'dynamicCast']);
    expect(f.lookup.getInstance()).toEqual(known(f.admin));
    expect(f.calls).toEqual(['className', 'moduleAdmin', 'findModule', 'dynamicCast']);
    expect(f.lookup.snapshot().trace).toEqual(['scriptAdmin.lookup.guard', 'scriptAdmin.lookup.cache']);
  });

  it('returns the current NULL cache on reentry after the native guard is set', () => {
    let lookup: NativeGameScriptAdminLookup<TestAdmin, object>;
    const className = name();
    const f = fixture({ className: () => { expect(lookup.getInstance()).toEqual(known(null)); return known(className); } }, className);
    lookup = f.lookup;
    f.application.writeUnsigned(0, 1, 1);
    expect(f.lookup.getInstance()).toEqual(known(f.admin));
    expect(f.calls).toEqual(['moduleAdmin', 'findModule', 'dynamicCast']);
  });

  it('caches a missing registered module as NULL', () => {
    let casts = 0;
    const f = fixture({ findModule: (_module, _name) => { f.calls.push('findModule'); return known(null); },
      dynamicCast: component => { casts++; return known(component as { identity: object } | null); } });
    f.application.writeUnsigned(0, 1, 1);
    expect(f.lookup.getInstance()).toEqual(known(null));
    expect(f.lookup.getInstance()).toEqual(known(null));
    expect(casts).toBe(1);
    expect(f.calls).toEqual(['className', 'moduleAdmin', 'findModule']);
  });

  it('retains a blocked dependency after setting the one-time guard', () => {
    let moduleCalls = 0;
    const f = fixture({ className: () => unknown('original class-name owner is not connected'),
      moduleAdmin: () => { moduleCalls++; return known({}); } });
    f.application.writeUnsigned(0, 1, 1);
    const result = f.lookup.getInstance();
    expect(result.known).toBe(false);
    if (result.known) throw new Error('Expected the unowned class-name boundary');
    expect(result.reason).toContain('original class-name owner is not connected');
    expect(f.globals.readUnsigned(4)).toBe(1);
    expect(f.lookup.getInstance()).toEqual(result);
    f.application.writeUnsigned(0, 0, 1);
    expect(f.lookup.getInstance()).toEqual(known(null));
    expect(moduleCalls).toBe(0);
  });

  it('preserves the native NULL ModuleAdmin dereference boundary', () => {
    const f = fixture({ moduleAdmin: () => known(null) }); f.application.writeUnsigned(0, 1, 1);
    const result = f.lookup.getInstance();
    expect(result.known).toBe(false);
    if (!result.known) expect(result.reason).toContain('FindModule dereferences NULL ModuleAdmin');
  });
});
