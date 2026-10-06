/** Independently reviewed Game startup pins. These select the Game receipt;
 * callers cannot substitute a source profile or infer addresses from Engine. */
interface StartupSource {
  schema: string; inputs: { Game?: string };
  methods: Record<string, { module?: string; entry: string; body: string; bodyInstructionBytesSha256: string }>;
}
const methodPins: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
  entry: Object.freeze(['20467ab3', '5b86564ed162b6a2eaa675a7174bcb6a9893d8cebd484a5bf0eb17d13367a8eb'] as const),
  securityInitCookie: Object.freeze(['20476a99', 'a04e61574f4be38556ecba86b2d10941ad2ecaff99ea3ecb09bb81d5ef0bfbd3'] as const),
  dllMainCrtStartup: Object.freeze(['204679bd', '9faad8198694ee6e6aeb3addf23f6934e715f04e00d315b1128d62e5e2e76318'] as const),
  crtAttach: Object.freeze(['204677e4', '9469f04e5cd533e1cf5aaa85553339f7e4eb4eb7f38ec894a6b4d8dd0493be27'] as const),
  initPointers: Object.freeze(['204667a8', '1de468a2a05e2edd6082e525b4a609159f6be406301e321af2a89b8a76d744dc'] as const),
  encodedNull: Object.freeze(['20467dd2', 'e58382981c7a36ba3f1066c370748dcc87e583c54e41f0a440673250d39cc7f3'] as const),
  initNewHandler: Object.freeze(['2047428c', '0a06b96e52991cc2ab91df87759d758032168fca044db398b9bc89c305bc845c'] as const),
  initSectionInitializer: Object.freeze(['204741ad', '0ea3ca256fec5494ceaeb743f4c816c83015ecd4cacc545ecc6f48a19143e741'] as const),
  initInvalidParameter: Object.freeze(['2046a0cc', 'b94bb921a955502faaacc32ff0d2ba182142a30790579b89b632ce0b27771250'] as const),
  initCrtReportHook: Object.freeze(['20469b83', 'b0762b11626802dba7af43996272841111848842aa40448237bc46c4320d60af'] as const),
  initUnhandledException: Object.freeze(['2047409f', 'bdc89595480ad4530309ad709721ac12507bd217fa6132ecead444667eddda05'] as const),
  initWinSignalPointers: Object.freeze(['20473bab', '66c28a31e645d45a8b7fc570dddb29fa0e0b28fdde78d12f785b115a3dac13d2'] as const),
  initDebugReportNoop: Object.freeze(['204739ff', 'ae3f4619b0413d70d3004b9131c3752153074e45725be13b9a148978895e359e'] as const),
  initEhHooks: Object.freeze(['204739ee', '788db4469c2bc2e6ac31568ec21b2062a64d36fe9e6e452e8f5af3344533ff4d'] as const),
  preCInit: Object.freeze(['204737dd', 'e407a3a43e414391aed8332ba09c6d75f9d9e32f4ba212542d9d822669c3b0ba'] as const),
  exitPointerTarget: Object.freeze(['20466779', '56833d9b869d4a324b0aadced821b799bcf7f4b4cbc7324de29c74e4a8660b00'] as const),
  terminatePointerTarget: Object.freeze(['2047396b', '16750ba70e18afce4f79f5d671fa8412c09b9a46657e76438fc7f55c112f3c15'] as const),
  mtInit: Object.freeze(['204681d9', '3e80229254d0d800267a9cf2495fd9ce8b6c4157620b1553cbc33900a041ba68'] as const),
  tlsAllocFallback: Object.freeze(['20467e49', '8804f7f168dfd8d917ce2605997bedc9adda1f6d826671a049efc508c94ddb84'] as const),
  tlsGetterDispatcher: Object.freeze(['20467e52', 'f346d43211505defafd45cdb6e1c20fa0db7aa36cd0b3dfb39b1e4f0863a7ae4'] as const),
  getCachedPtdGetter: Object.freeze(['20467e6d', '3be4b6443b7294be77855fc9c809c0638353770ca6facc581c3499ac2178d084'] as const),
  getPtdNoExit: Object.freeze(['20467fb4', '9e1482b8b02c305418824ccdc2056215c8084d1a7657661797c29c335b940818'] as const),
  initPtd: Object.freeze(['20467ef5', '82455361a1a6d0560827ddfc1ff717077c72a0947ccdf146f2f57adbfd0eb775'] as const),
  addLocaleRef: Object.freeze(['2046be69', 'b2ebfda384376c6ecfe886871c16b6a64327ae25c81eca49662dc034bf36bc7b'] as const),
  unlockInitPtd: Object.freeze(['20467fab', '85ed1d73fa9d2a42f1afe11290cccd1dd12f2b8312ffbbee97b2eee5d41a9703'] as const),
  mtTerm: Object.freeze(['20467eb8', '41a655890f1c81286526ad6ea9fe37f09a8b9e5a442851b924835d5212f9545d'] as const),
  freePtd: Object.freeze(['20468164', 'e828d7274cee25efd6ec898479cb6fe343f2c24d9bbe0732e11f94cd79e6d18d'] as const),
  freePtdCallback: Object.freeze(['20468043', '562d6c4f0e63062a5ff764f16bd52ed32c14f6234a88aa73e2e52a9f51ebbf78'] as const),
  removeLocaleRef: Object.freeze(['2046beef', '97fc0ca6135bf03d7372de7150e041442900f90ddce6ce3d3f1738ded9b9db6b'] as const),
  errno: Object.freeze(['2046a282', '0e0cc0d6c4d377eb8cef5833010fe4226fac61ce169f7f15a854c29ac2fd369d'] as const),
  getFlsIndex: Object.freeze(['20467e67', '38e5f16a0fb459832cec7b6e3e2bdc242c8a9b0d1028abbfb6a6f23dffb81b6a'] as const),
  unlockFreePtdMbc: Object.freeze(['2046814f', '1e67da0e95989014e18d7890b417cd98642bcb0661acef1dc53128d042e685a2'] as const),
  unlockFreePtdLocale: Object.freeze(['2046815b', '0fdcd93b994f8debebafca485c6a8dccb2d10e960a69cebbe2df565f40ffe47c'] as const),
  localeFree: Object.freeze(['2046bd29', '77b1f68c1f6c6119f4edf198c92ef520a72b8dabbdcd7379175359e1ecf307cc'] as const),
  heapInit: Object.freeze(['204769c5', 'ce939dcc3ad91e76647b492a04691ef9c17f59001477c59565acf0e60a1e34d0'] as const),
  heapTerm: Object.freeze(['20476a1f', '868c2a5c0c2513e2f30c43de68269b0e831f008db50344a87749aa9bffb27f2b'] as const),
  mtInitLocks: Object.freeze(['2047361e', 'fdc3b3bd6a6a9e6f3938945524d9076a4b9c0e7672dc1bb642d042274f2a47fb'] as const),
  free: Object.freeze(['20467c6a', '3f5fc78854ea9f1f767cfc155b115eb851f7d6f40a9939e546f05f04f94380cf'] as const),
});
export function admitGameCrtStartupSource(source: StartupSource, labels: readonly string[]): void {
  if (source.schema !== 'gothic3-game-crt-rules-v1' ||
      source.inputs.Game !== 'b09afc5c180969a6302d9d706f0ad8efebf7c1fcd9301096bf5c1b1f2cf8eb2f' ||
      labels.some(label => {
        const pin = methodPins[label], method = source.methods[label];
        return !pin || !method || method.module !== 'Game' || method.entry !== pin[0] ||
          method.body !== pin[0] || method.bodyInstructionBytesSha256 !== pin[1];
      })) throw new Error('Selected Game CRT startup source receipt differs');
}
// Actual instruction operands/stores, checked against Game ASM and PE bytes.
export const gameStartupInstructionPoints = Object.freeze({
  cookieRead: '20476a9f', cookieStore: '20476b1a', terminateStore: '204739f9', exitStore: '204667ed',
  osPlatformStore: '2046786b', osVersionStore: '2046787c', osMajorStore: '20467882',
  osMinorStore: '20467887', osBuildStore: '2046788d', commandLineIat: '207d7ca0',
  commandLineCall: '204678b9', threadAttachBranch: '2046794e',
  dllMainThunk: '2000f7cc', dllMainBody: '20459430',
});
