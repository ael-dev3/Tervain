import source from '../../assets/gothic3/property-registration-lifecycle/source.json';
export function admittedPropertySingletonExit(address: string): boolean {
  return address === '100e30a0' && source.sharedBaseSha256 === '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214' &&
    source.exitCallback.entry === address && source.exitCallback.raw === 'b9c0482f10e9aa35f2ff' &&
    source.exitCallback.receiver === '102f48c0' && source.exitCallback.targetEntry === '10006654' &&
    source.methods.destroyPropertySingleton.entryVA === '0x10006654' &&
    source.methods.destroyPropertySingleton.bodyVA === '0x100906f0' &&
    source.methods.destroyPropertySingleton.bodyInstructionBytesSha256 === '5d8c579c2d0db9e2d096efcd6a83c190e0bbf46338c44daa35ee5de424a45bd1';
}
export function admitPropertySingletonGetter(): void {
  if (!admittedPropertySingletonExit('100e30a0') || source.methods.getPropertySingleton.entryVA !== '0x10004fd4' ||
      source.methods.getPropertySingleton.bodyVA !== '0x10090750' ||
      source.methods.getPropertySingleton.bodyInstructionBytesSha256 !== '9788801ba55c453168b31f3de4e85fec88e9f8a25ad629511019281506070467') {
    throw new Error('Original property singleton getter source differs');
  }
}
