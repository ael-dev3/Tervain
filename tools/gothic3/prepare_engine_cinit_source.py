"""Capture the pinned Engine CRT initializer and its immediate dependencies."""
import argparse
import sys
import hashlib
import json
import struct
import re
from pathlib import Path
from read_dialogue_native_evidence import EXPECTED_INPUTS, PE, audit_module


def capture(study):
    EXPECTED_INPUTS['Engine.dll'] = 'd49ef92c0fdfeda433f6d04d0edeb7751e41e4c7c7effc1265630717029dc7e3'
    source = audit_module(study, 'Engine_dll', 'Engine.dll', {
        0x3067d1c7: 'engineCinit',
        0x30791ef6: 'engineSharedCriticalSectionReferenceInitializer',
        0x30791f18: 'engineSharedCriticalSectionSecondReferenceInitializer',
        0x307b806e: 'engineSharedCriticalSectionSecondReferenceShutdown',
        0x30791f2e: 'engineStandardOutputFilebufInitializer',
        0x3067c3c1: 'engineStaticStreamsGetter',
        0x305eed30: 'engineStandardFilebufConstructor',
        0x305ee660: 'engineStandardStreambufConstructor',
        0x30670963: 'engineStandardStreambufLockConstructor',
        0x3067097b: 'engineStandardStreambufLockDestructor',
        0x306728e3: 'engineThrowingAllocationFactory',
        0x306824b9: 'engineAllocationNewHandler',
        0x30670832: 'engineStandardLocaleInitialize',
        0x30679b5b: 'engineLocaleEh3Prolog',
        0x30670503: 'engineStandardLocaleLockConstructor',
        0x30670524: 'engineStandardLocaleLockDestructor',
        0x30671353: 'engineEnterCriticalSectionWrapper',
        0x3067135e: 'engineLeaveCriticalSectionWrapper',
        0x305ed990: 'engineStandardFilebufInitialize',
        0x305f0c80: 'engineStandardFilebufDestructor',
        0x307b8082: 'engineStandardOutputFilebufShutdown',
        0x30670444: 'engineSharedCriticalSectionReferenceConstructor',
        0x30670473: 'engineSharedCriticalSectionReferenceDestructor',
        0x3067133d: 'engineInitializeCriticalSectionWrapper',
        0x30671348: 'engineDeleteCriticalSectionWrapper',
        0x307b805a: 'engineSharedCriticalSectionReferenceShutdown',
        0x3067ca49: 'engineReallocWrapper',
        0x30679200: 'engineReallocImplementation',
        0x3068aa20: 'engineReadonlyPointer',
        0x3068a9a0: 'engineValidateImage',
        0x3068a9d0: 'engineFindSection',
        0x30671672: 'engineFpInit',
        0x30671602: 'engineFloatConversionInit',
        0x3067f611: 'engineDivideDispatch',
        0x3067f5ac: 'enginePrecisionInit',
        0x3067f58d: 'engineEncodeFloatPointers',
        0x3067de64: 'engineEncodePointer',
        0x3067d012: 'engineErrorInitializerWalker',
        0x30671596: 'engineExitRegistration',
        0x3067ca01: 'engineCInitializerCalloc',
        0x3069c4f2: 'engineSse2Detection',
        0x3069c4a2: 'engineSse2ExecutionProbe',
        0x3067155a: 'engineOnexit',
        0x30671472: 'engineOnexitStorage',
        0x3067cfe8: 'engineExitLock',
        0x3067cff1: 'engineExitUnlock',
        0x30671590: 'engineExitFinally',
        0x3067e500: 'engineOnexitEh4Prolog',
        0x3067e545: 'engineOnexitEh4Epilog',
        0x3067dedb: 'engineDecodePointer',
        0x3067e45d: 'engineExitTableSize',
        0x3001c3c8: 'engineVisualAnimationFloatPropertyType',
        0x30016fea: 'engineVisualAnimationSecondPropertyType',
        0x30015bef: 'engineVisualAnimationThirdPropertyType',
        0x3000d9f9: 'engineCameraBaseObjectPropertyType',
        0x300247da: 'engineObjectRefBasePropertyType',
        0x3003251a: 'engineObsoleteClassPropertyType',
        0x30015fbe: 'engineMatrixPropertyType',
        0x3003f1a7: 'engineVectorPropertyType',
        0x30038852: 'engineVector2PropertyType',
        0x3001c468: 'engineRectPropertyType',
        0x3000c0b8: 'engineBoolPropertyType',
        0x30044a94: 'engineInputReceiverPropertyType',
        0x3001427c: 'engineGuidPropertyType',
        0x3003eecd: 'boxPropertyType',
        0x3003470c: 'processibleElementPropertyType',
        0x3002325e: 'entityPropertySetPropertyType',
        0x3002de43: 'baseCachePropertyType',
        0x30008cab: 'resourceStorageContextPropertyType',
        0x3001a89d: 'resourceBasePropertyType',
        0x3000bf41: 'mainCachePropertyType',
        0x3003bb42: 'resourceAdminPropertyType',
        0x3003d8f7: 'mainCacheTemplatePropertyType',
        0x3002112a: 'geometrySpatialContextPropertyType',
        0x30035747: 'pvsPrefetcher3PropertyType',
        0x30027a8e: 'occlusionProcessorPropertyType',
        0x3002a536: 'gfxAdminPropertyType',
        0x3002bd23: 'renderSystemAdminPropertyType',
        0x300393d8: 'imageCachePropertyType',
        0x3003f39b: 'materialCachePropertyType',
        0x3002f199: 'meshCachePropertyType',
        0x30032b5a: 'soundCachePropertyType',
        0x30036e67: 'collisionMeshCachePropertyType',
        0x30002f0e: 'animationCachePropertyType',
        0x300421ea: 'iteratorAdminPropertyType',
        0x3001f942: 'inpAdminPropertyType',
        0x30027471: 'dllInfoCtrlPropertyType',
        0x3000f650: 'wndPropertyType',
        0x3000ebba: 'physicsScenePropertyType',
        0x300073ab: 'animationAdminPropertyType',
        0x30028169: 'performanceAdminPropertyType',
        0x300146dc: 'vegetationAdminPropertyType',
        0x3000ddaa: 'shaderMaterialAdminPropertyType',
        0x300139d0: 'postProcessingAdminPropertyType',
        0x3003ea9a: 'shapeGroupContainerPropertyType',
        0x300018c5: 'shapeMaterialContainerPropertyType',
        0x3003f2f1: 'collisionGroupContainerPropertyType',
        0x3002774b: 'springAndDamperEffectorTemplatePropertyType',
        0x300261ed: 'audioModulePropertyType',
        0x30015ea1: 'animationResourceStringPropertyType',
        0x30033875: 'visualAnimationPsPropertyType',
        0x3003960d: 'springAndDamperEffectorPropertyType',
        0x3001e3a8: 'entityProxyPropertyType',
        0x300340db: 'effectorPropertyType',
        0x3003d91f: 'sceneAdminClassPropertyType',
        0x3002058b: 'triggerBasePsPropertyType',
        0x30005c18: 'guiModulePropertyType',
        0x306991ad: 'engineUndecorationTemplateNameParser',
        0x30698a86: 'engineUndecorationTemplateArgumentListParser',
        0x30038a87: 'engineComponentPropertyType',
        0x300140b0: 'illuminationAdminPropertyType',
        0x3003bbb0: 'materialAdminPropertyType',
        0x3000d34b: 'guiManagerPropertyType',
        0x3000b8f7: 'actionMapperPropertyType',
        0x3004284d: 'contextBasePropertyType',
        0x306713ae: 'enginePropertyTypeNameWrapper',
        0x3067da97: 'enginePropertyTypeName',
        0x3069b26b: 'engineUndecorateName',
        0x306832e3: 'engineUndecorationLockInit',
        0x3069747a: 'engineUndecorationParserConstructor',
        0x306972b8: 'engineUndecorationInternalObjectConstructor',
        0x30697051: 'engineUndecorationInternalFieldConstructor',
        0x30696bf0: 'engineUndecorationArenaAllocate',
        0x30672ec7: 'engineUndecorationMallocCallback',
        0x30696ef8: 'engineUndecorationFieldNodeConstructor',
        0x30696f1d: 'engineUndecorationFieldNodeLength',
        0x3069afb8: 'engineUndecorationNameParser',
        0x3069a2f7: 'engineUndecorationTypeParser',
        0x3069b876: 'engineUndecorationDataTypeParser',
        0x3069aad4: 'engineUndecorationDecoratedTypeDecoder',
        0x306976b2: 'engineUndecorationQualifierTemporaryConstructor',
        0x30697b16: 'engineUndecorationQualifiedTypeParser',
        0x30696ffb: 'engineUndecorationTemporaryConstructor',
        0x3069b738: 'engineUndecorationCompoundTypeParser',
        0x3069b3b1: 'engineUndecorationBasicTypeParser',
        0x306995dd: 'engineUndecorationClassTypeParser',
        0x30697f9d: 'engineUndecorationEnumUnderlyingTypeParser',
        0x306994ea: 'engineUndecorationScopedNameParser',
        0x30699300: 'engineUndecorationIdentifierParser',
        0x30697709: 'engineUndecorationDelimitedNameConstructor',
        0x306972d6: 'engineUndecorationNameReferenceAppend',
        0x30697906: 'engineUndecorationAppendValue',
        0x30697b95: 'engineUndecorationAppendCharacter',
        0x30697d9a: 'engineUndecorationTemplateValueCombine',
        0x30697dde: 'engineUndecorationLiteralValueCombine',
        0x306976d8: 'engineUndecorationLiteralValueStringConstructor',
        0x3069752b: 'engineUndecorationValueStatusSetter',
        0x30697139: 'engineUndecorationValueLastCharacter',
        0x306973c9: 'engineUndecorationTextNodeLastCharacter',
        0x30696ea2: 'engineUndecorationCharacterLength',
        0x30696ea6: 'engineUndecorationCharacterValue',
        0x30696eaa: 'engineUndecorationCharacterWrite',
        0x3069731d: 'engineUndecorationNodeToList',
        0x30696e63: 'engineUndecorationListAppend',
        0x30696ec9: 'engineUndecorationListConstructor',
        0x3069740c: 'engineUndecorationListLength',
        0x3069741b: 'engineUndecorationListSecondaryLength',
        0x3069742a: 'engineUndecorationListWrite',
        0x3067746c: 'engineUndecorationSecurityCookieCheck',
        0x30697a0f: 'engineUndecorationStringConstructor',
        0x3069760c: 'engineUndecorationStringInitialize',
        0x30697364: 'engineUndecorationTextNodeConstructor',
        0x30696f3c: 'engineUndecorationCopyCharacters',
        0x306970c9: 'engineUndecorationTemporaryEmpty',
        0x30696c93: 'engineUndecorationCopyValue',
        0x30696da9: 'engineUndecorationAssignValue',
        0x30697114: 'engineUndecorationStringLength',
        0x30697171: 'engineUndecorationWriteString',
        0x306970b2: 'engineUndecorationValueValid',
        0x30696ec5: 'engineUndecorationTextNodeLength',
        0x306973db: 'engineUndecorationTextNodeWrite',
        0x30696606: 'engineUndecorationArenaDestructor',
        0x30672f8a: 'engineUndecorationFreeCallback',
        0x3069b305: 'engineUndecorationFinally',
        0x306832b6: 'engineUndecorationUnlock',
        0x30679ad0: 'engineTypeNameStrlen',
        0x3068a84a: 'engineTypeNameCopyString',
    })
    pe = PE((study / '00_Original_Runtime/Engine.dll').read_bytes())
    # The exported function CSV omits this complete body; retain its assembly
    # rows only after comparing each encoding with the pinned original PE.
    recovered=[('engineExitTableInitializer',0x3067152b,0x3067155a,20),
               ('engineStreamTableInitializer',0x3067c3c7,0x3067c478,None),
               ('engineSse2Initializer',0x3067f720,0x3067f734,5),
               ('engineMultibyteInitializer',0x30685007,0x30685025,8),
               ('engineSse2ControlInitializer',0x3069c552,0x3069c55f,4),
               ('engineVisualAnimationFloatInitializer',0x307322b0,0x307322bb,3),
               ('engineVisualAnimationSecondPropertyInitializer',0x307322c0,0x307322cb,3),
               ('engineVisualAnimationThirdPropertyInitializer',0x307322d0,0x307322db,3),
               ('engineCameraBaseObjectPropertyInitializer',0x307322e0,0x307322eb,3),
               ('engineObjectRefBasePropertyInitializer',0x307322f0,0x307322fb,3),
               ('engineObsoleteClassPropertyInitializer',0x30732300,0x3073230b,3),
               ('engineMatrixPropertyInitializer',0x30732310,0x3073231b,3),
               ('engineVectorPropertyInitializer',0x30732320,0x3073232b,3),
               ('engineVector2PropertyInitializer',0x30732330,0x3073233b,3),
               ('engineRectPropertyInitializer',0x30732340,0x3073234b,3),
               ('engineBoolPropertyInitializer',0x30732350,0x3073235b,3),
               ('engineInputReceiverPropertyInitializer',0x30732360,0x3073236b,3),
               ('engineComponentPropertyInitializer',0x30732370,0x3073237b,3),
               ('illuminationAdminPropertyInitializer',0x30732380,0x3073238b,3),
               ('materialAdminPropertyInitializer',0x30732390,0x3073239b,3),
               ('guiManagerPropertyInitializer',0x307323a0,0x307323ab,3),
               ('actionMapperPropertyInitializer',0x307323b0,0x307323bb,3),
               ('contextBasePropertyInitializer',0x307323c0,0x307323cb,3),
               ('engineGuidPropertyInitializer',0x307323d0,0x307323db,3),
               ('boxPropertyInitializer',0x307323e0,0x307323eb,3),
               ('processibleElementPropertyInitializer',0x307323f0,0x307323fb,3),
               ('entityPropertySetPropertyInitializer',0x30732400,0x3073240b,3),
               ('baseCachePropertyInitializer',0x30732410,0x3073241b,3),
               ('resourceStorageContextPropertyInitializer',0x30732420,0x3073242b,3),
               ('resourceBasePropertyInitializer',0x30732430,0x3073243b,3),
               ('mainCachePropertyInitializer',0x30732440,0x3073244b,3),
               ('resourceAdminPropertyInitializer',0x30732450,0x3073245b,3),
               ('mainCacheTemplatePropertyInitializer',0x30732460,0x3073246b,3),
               ('geometrySpatialContextPropertyInitializer',0x30732470,0x3073247b,3),
               ('pvsPrefetcher3PropertyInitializer',0x30732480,0x3073248b,3),
               ('occlusionProcessorPropertyInitializer',0x30732490,0x3073249b,3),
               ('gfxAdminPropertyInitializer',0x307324a0,0x307324ab,3),
               ('renderSystemAdminPropertyInitializer',0x307324b0,0x307324bb,3),
               ('imageCachePropertyInitializer',0x307324c0,0x307324cb,3),
               ('materialCachePropertyInitializer',0x307324d0,0x307324db,3),
               ('meshCachePropertyInitializer',0x307324e0,0x307324eb,3),
               ('soundCachePropertyInitializer',0x307324f0,0x307324fb,3),
               ('collisionMeshCachePropertyInitializer',0x30732500,0x3073250b,3),
               ('animationCachePropertyInitializer',0x30732510,0x3073251b,3),
               ('iteratorAdminPropertyInitializer',0x30732520,0x3073252b,3),
               ('inpAdminPropertyInitializer',0x30732530,0x3073253b,3),
               ('dllInfoCtrlPropertyInitializer',0x30732540,0x3073254b,3),
               ('wndPropertyInitializer',0x30732550,0x3073255b,3),
               ('physicsScenePropertyInitializer',0x30732560,0x3073256b,3),
               ('animationAdminPropertyInitializer',0x30732570,0x3073257b,3),
               ('performanceAdminPropertyInitializer',0x30732580,0x3073258b,3),
               ('vegetationAdminPropertyInitializer',0x30732590,0x3073259b,3),
               ('shaderMaterialAdminPropertyInitializer',0x307325a0,0x307325ab,3),
               ('postProcessingAdminPropertyInitializer',0x307325b0,0x307325bb,3),
               ('shapeGroupContainerPropertyInitializer',0x30732640,0x3073264b,3),
               ('shapeMaterialContainerPropertyInitializer',0x30732650,0x3073265b,3),
               ('collisionGroupContainerPropertyInitializer',0x30732660,0x3073266b,3),
               ('springAndDamperEffectorTemplatePropertyInitializer',0x30732670,0x3073267b,3),
               ('audioModulePropertyInitializer',0x30732680,0x3073268b,3),
               ('animationResourceStringPropertyInitializer',0x30732630,0x3073263b,3),
               ('visualAnimationPsPropertyInitializer',0x30732620,0x3073262b,3),
               ('springAndDamperEffectorPropertyInitializer',0x30732610,0x3073261b,3),
               ('entityProxyPropertyInitializer',0x30732600,0x3073260b,3),
               ('effectorPropertyInitializer',0x307325f0,0x307325fb,3),
               ('sceneAdminClassPropertyInitializer',0x307325e0,0x307325eb,3),
               ('triggerBasePsPropertyInitializer',0x307325d0,0x307325db,3),
               ('guiModulePropertyInitializer',0x307325c0,0x307325cb,3)]
    collected={begin:[] for _,begin,_,_ in recovered}
    asm=study/'01_Decompiled_Code/Engine_dll/full_disassembly.asm'
    for number,line in enumerate(asm.open('rb'),1):
        match=re.match(rb'([0-9a-f]{8}) \| ([0-9a-f]+) \| (.+)',line)
        if not match:
            continue
        address=int(match[1],16)
        selected=next((begin for _,begin,end,_ in recovered if begin<=address<end),None)
        if selected is None:
            continue
        raw=bytes.fromhex(match[2].decode())
        if pe.bytes(address,len(raw))!=raw:
            raise ValueError('Original Engine exit-table initializer encoding differs')
        collected[selected].append(dict(va=f'{address:08x}',rva=f'{address-pe.base:x}',fileOffset=pe.offset(address,len(raw)),
            bytes=raw.hex(),instruction=match[3].decode().strip(),assemblyLine=number))
    for label,begin,end,count in recovered:
        rows=sorted(collected[begin],key=lambda row:int(row['va'],16))
        cursor=begin
        for row in rows:
            if int(row['va'],16)!=cursor:
                raise ValueError('Incomplete Engine initializer body: '+label)
            cursor+=len(bytes.fromhex(row['bytes']))
        if cursor!=end or (count is not None and len(rows)!=count):
            raise ValueError('Original Engine initializer extent differs: '+label)
        raw=b''.join(bytes.fromhex(row['bytes']) for row in rows)
        source['methods'].append(dict(label=label,entryVA=f'0x{begin:08x}',bodyVA=f'0x{begin:08x}',
            entryChain=[],bodyRanges=f'{begin:08x}-{end-1:08x}',instructions=rows,instructionCount=len(rows),
            bodyByteCount=len(raw),bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest(),
            recoveredFromAssemblyWithoutFunctionCSV=True))
    # This callback is absent from both the original listing and function CSV.
    # Decode only its exact pinned bytes, recording decoder provenance.
    import capstone
    decoder=capstone.Cs(capstone.CS_ARCH_X86,capstone.CS_MODE_32)
    begin,end=0x30671182,0x30671195
    raw=pe.bytes(begin,end-begin)
    if raw.hex()!='6844116730e80a040000f7d81bc05983e018c3':
        raise ValueError('Original Engine exit callback initializer differs')
    rows=[dict(va=f'{i.address:08x}',rva=f'{i.address-pe.base:x}',fileOffset=pe.offset(i.address,i.size),
        bytes=i.bytes.hex(),instruction=(i.mnemonic+' '+i.op_str).strip()) for i in decoder.disasm(raw,begin)]
    if len(rows)!=7 or b''.join(bytes.fromhex(r['bytes']) for r in rows)!=raw:
        raise ValueError('Incomplete Engine exit callback initializer decoding')
    source['methods'].append(dict(label='engineExitCallbackInitializer',entryVA=f'0x{begin:08x}',bodyVA=f'0x{begin:08x}',
        entryChain=[],bodyRanges=f'{begin:08x}-{end-1:08x}',instructions=rows,instructionCount=len(rows),
        bodyByteCount=len(raw),bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest(),
        recoveredFromOriginalPEWithoutAssembly=True,decoder=f'capstone {capstone.__version__}'))
    # These cleanup instructions are omitted from the function listing.
    # Admit them only from exact bytes in the hash-pinned original DLL.
    for label, begin, encoded, count in [
        ('engineComponentPropertyShutdownThunk', 0x30042037, 'e9c45e7500', 1),
        ('engineComponentPropertyShutdownBody', 0x30797f00, 'b9709aad30ff25dcdbaf30', 2),
        ('illuminationAdminPropertyShutdownThunk', 0x30026864, 'e987167700', 1),
        ('illuminationAdminPropertyShutdownBody', 0x30797ef0, 'b97c9aad30ff25dcdbaf30', 2),
        ('materialAdminPropertyShutdownThunk', 0x300267d8, 'e903177700', 1),
        ('materialAdminPropertyShutdownBody', 0x30797ee0, 'b9889aad30ff25dcdbaf30', 2),
        ('guiManagerPropertyShutdownThunk', 0x30030729, 'e9a2777600', 1),
        ('guiManagerPropertyShutdownBody', 0x30797ed0, 'b9949aad30ff25dcdbaf30', 2),
        ('actionMapperPropertyShutdownThunk', 0x30025ffe, 'e9bd1e7700', 1),
        ('actionMapperPropertyShutdownBody', 0x30797ec0, 'b9a09aad30ff25dcdbaf30', 2),
        ('contextBasePropertyShutdownThunk', 0x3003c2b3, 'e9f8bb7500', 1),
        ('contextBasePropertyShutdownBody', 0x30797eb0, 'b9ac9aad30ff25dcdbaf30', 2),
        ('boxPropertyShutdownThunk', 0x3003ae86, 'e905d07500', 1),
        ('boxPropertyShutdownBody', 0x30797e90, 'b9c49aad30ff25dcdbaf30', 2),
        ('processibleElementPropertyShutdownThunk', 0x3002eac8, 'e9b3937600', 1),
        ('processibleElementPropertyShutdownBody', 0x30797e80, 'b9d09aad30ff25dcdbaf30', 2),
        ('entityPropertySetPropertyShutdownThunk', 0x300191ff, 'e96cec7700', 1),
        ('entityPropertySetPropertyShutdownBody', 0x30797e70, 'b9dc9aad30ff25dcdbaf30', 2),
        ('baseCachePropertyShutdownThunk', 0x30044edb, 'e9802f7500', 1),
        ('baseCachePropertyShutdownBody', 0x30797e60, 'b9e89aad30ff25dcdbaf30', 2),
        ('resourceStorageContextPropertyShutdownThunk', 0x3002301a, 'e9314e7700', 1),
        ('resourceStorageContextPropertyShutdownBody', 0x30797e50, 'b9f49aad30ff25dcdbaf30', 2),
        ('resourceBasePropertyShutdownThunk', 0x3003f5f3, 'e948887500', 1),
        ('resourceBasePropertyShutdownBody', 0x30797e40, 'b9009bad30ff25dcdbaf30', 2),
        ('mainCachePropertyShutdownThunk', 0x300227fa, 'e931567700', 1),
        ('mainCachePropertyShutdownBody', 0x30797e30, 'b90c9bad30ff25dcdbaf30', 2),
        ('resourceAdminPropertyShutdownThunk', 0x30013908, 'e913457800', 1),
        ('resourceAdminPropertyShutdownBody', 0x30797e20, 'b9189bad30ff25dcdbaf30', 2),
        ('gfxAdminPropertyShutdownThunk', 0x30028af1, 'e9daf27600', 1),
        ('gfxAdminPropertyShutdownBody', 0x30797dd0, 'b9549bad30ff25dcdbaf30', 2),
        ('renderSystemAdminPropertyShutdownThunk', 0x3000bd2a, 'e991c07800', 1),
        ('renderSystemAdminPropertyShutdownBody', 0x30797dc0, 'b9609bad30ff25dcdbaf30', 2),
        ('imageCachePropertyShutdownThunk', 0x30018313, 'e998fa7700', 1),
        ('imageCachePropertyShutdownBody', 0x30797db0, 'b96c9bad30ff25dcdbaf30', 2),
        ('materialCachePropertyShutdownThunk', 0x3002ea91, 'e90a937600', 1),
        ('materialCachePropertyShutdownBody', 0x30797da0, 'b9789bad30ff25dcdbaf30', 2),
        ('meshCachePropertyShutdownThunk', 0x3002fe32, 'e9597f7600', 1),
        ('meshCachePropertyShutdownBody', 0x30797d90, 'b9849bad30ff25dcdbaf30', 2),
        ('soundCachePropertyShutdownThunk', 0x3000fb19, 'e962827800', 1),
        ('soundCachePropertyShutdownBody', 0x30797d80, 'b9909bad30ff25dcdbaf30', 2),
        ('collisionMeshCachePropertyShutdownThunk', 0x3000ed86, 'e9e58f7800', 1),
        ('collisionMeshCachePropertyShutdownBody', 0x30797d70, 'b99c9bad30ff25dcdbaf30', 2),
        ('animationCachePropertyShutdownThunk', 0x30029546, 'e915e87600', 1),
        ('animationCachePropertyShutdownBody', 0x30797d60, 'b9a89bad30ff25dcdbaf30', 2),
        ('iteratorAdminPropertyShutdownThunk', 0x30017b5c, 'e9ef017800', 1),
        ('iteratorAdminPropertyShutdownBody', 0x30797d50, 'b9b49bad30ff25dcdbaf30', 2),
        ('inpAdminPropertyShutdownThunk', 0x3000e45d, 'e9de987800', 1),
        ('inpAdminPropertyShutdownBody', 0x30797d40, 'b9c09bad30ff25dcdbaf30', 2),
        ('dllInfoCtrlPropertyShutdownThunk', 0x3002007c, 'e9af7c7700', 1),
        ('dllInfoCtrlPropertyShutdownBody', 0x30797d30, 'b9cc9bad30ff25dcdbaf30', 2),
        ('wndPropertyShutdownThunk', 0x3000f538, 'e9e3877800', 1),
        ('wndPropertyShutdownBody', 0x30797d20, 'b9d89bad30ff25dcdbaf30', 2),
        ('physicsScenePropertyShutdownThunk', 0x300119cd, 'e93e637800', 1),
        ('physicsScenePropertyShutdownBody', 0x30797d10, 'b9e49bad30ff25dcdbaf30', 2),
        ('animationAdminPropertyShutdownThunk', 0x3000fba5, 'e956817800', 1),
        ('animationAdminPropertyShutdownBody', 0x30797d00, 'b9f09bad30ff25dcdbaf30', 2),
        ('performanceAdminPropertyShutdownThunk', 0x300346e4, 'e907367600', 1),
        ('performanceAdminPropertyShutdownBody', 0x30797cf0, 'b9fc9bad30ff25dcdbaf30', 2),
        ('vegetationAdminPropertyShutdownThunk', 0x30031129, 'e9b26b7600', 1),
        ('vegetationAdminPropertyShutdownBody', 0x30797ce0, 'b9089cad30ff25dcdbaf30', 2),
        ('shaderMaterialAdminPropertyShutdownThunk', 0x30020289, 'e9427a7700', 1),
        ('shaderMaterialAdminPropertyShutdownBody', 0x30797cd0, 'b9149cad30ff25dcdbaf30', 2),
        ('postProcessingAdminPropertyShutdownThunk', 0x30033230, 'e98b4a7600', 1),
        ('postProcessingAdminPropertyShutdownBody', 0x30797cc0, 'b9209cad30ff25dcdbaf30', 2),
        ('shapeGroupContainerPropertyShutdownThunk', 0x30043027, 'e9044c7500', 1),
        ('shapeGroupContainerPropertyShutdownBody', 0x30797c30, 'b98c9cad30ff25dcdbaf30', 2),
        ('shapeMaterialContainerPropertyShutdownThunk', 0x3000432c, 'e9ef387900', 1),
        ('shapeMaterialContainerPropertyShutdownBody', 0x30797c20, 'b9989cad30ff25dcdbaf30', 2),
        ('collisionGroupContainerPropertyShutdownThunk', 0x3003a684, 'e987d57500', 1),
        ('collisionGroupContainerPropertyShutdownBody', 0x30797c10, 'b9a49cad30ff25dcdbaf30', 2),
        ('springAndDamperEffectorTemplatePropertyShutdownThunk', 0x30012e5e, 'e99d4d7800', 1),
        ('springAndDamperEffectorTemplatePropertyShutdownBody', 0x30797c00, 'b9b09cad30ff25dcdbaf30', 2),
        ('audioModulePropertyShutdownThunk', 0x3001d8a9, 'e942a37700', 1),
        ('audioModulePropertyShutdownBody', 0x30797bf0, 'b9bc9cad30ff25dcdbaf30', 2),
        ('animationResourceStringPropertyShutdownThunk', 0x30003e40, 'e9fb3d7900', 1),
        ('animationResourceStringPropertyShutdownBody', 0x30797c40, 'b9809cad30ff25dcdbaf30', 2),
        ('visualAnimationPsPropertyShutdownThunk', 0x3003849c, 'e9aff77500', 1),
        ('visualAnimationPsPropertyShutdownBody', 0x30797c50, 'b9749cad30ff25dcdbaf30', 2),
        ('springAndDamperEffectorPropertyShutdownThunk', 0x30047749, 'e912057500', 1),
        ('springAndDamperEffectorPropertyShutdownBody', 0x30797c60, 'b9689cad30ff25dcdbaf30', 2),
        ('entityProxyPropertyShutdownThunk', 0x30001b2c, 'e93f617900', 1),
        ('entityProxyPropertyShutdownBody', 0x30797c70, 'b95c9cad30ff25dcdbaf30', 2),
        ('effectorPropertyShutdownThunk', 0x3002bb11, 'e96ac17600', 1),
        ('effectorPropertyShutdownBody', 0x30797c80, 'b9509cad30ff25dcdbaf30', 2),
        ('sceneAdminClassPropertyShutdownThunk', 0x300184df, 'e9acf77700', 1),
        ('sceneAdminClassPropertyShutdownBody', 0x30797c90, 'b9449cad30ff25dcdbaf30', 2),
        ('triggerBasePsPropertyShutdownThunk', 0x3003e3bf, 'e9dc987500', 1),
        ('triggerBasePsPropertyShutdownBody', 0x30797ca0, 'b9389cad30ff25dcdbaf30', 2),
        ('guiModulePropertyShutdownThunk', 0x30022bfb, 'e9b0507700', 1),
        ('guiModulePropertyShutdownBody', 0x30797cb0, 'b92c9cad30ff25dcdbaf30', 2),
        ('occlusionProcessorPropertyShutdownThunk', 0x30045228, 'e9b32b7500', 1),
        ('occlusionProcessorPropertyShutdownBody', 0x30797de0, 'b9489bad30ff25dcdbaf30', 2),
        ('pvsPrefetcher3PropertyShutdownThunk', 0x3000113b, 'e9b06c7900', 1),
        ('pvsPrefetcher3PropertyShutdownBody', 0x30797df0, 'b93c9bad30ff25dcdbaf30', 2),
        ('geometrySpatialContextPropertyShutdownThunk', 0x3000eb56, 'e9a5927800', 1),
        ('geometrySpatialContextPropertyShutdownBody', 0x30797e00, 'b9309bad30ff25dcdbaf30', 2),
        ('mainCacheTemplatePropertyShutdownThunk', 0x30019029, 'e9e2ed7700', 1),
        ('mainCacheTemplatePropertyShutdownBody', 0x30797e10, 'b9249bad30ff25dcdbaf30', 2),
        ('engineGuidShutdownThunk', 0x300418d0, 'e9cb657500', 1),
        ('engineGuidShutdownBody', 0x30797ea0, 'b9b89aad30ff25dcdbaf30', 2),
        ('engineInputReceiverShutdownThunk', 0x30003e3b, 'e9d0407900', 1),
        ('engineInputReceiverShutdownBody', 0x30797f10, 'b9649aad30ff25dcdbaf30', 2),
        ('engineBoolShutdownThunk', 0x3002ca2f, 'e9ecb47600', 1),
        ('engineBoolShutdownBody', 0x30797f20, 'b9589aad30ff25dcdbaf30', 2),
        ('engineVectorShutdownThunk', 0x30011e3c, 'e90f617800', 1),
        ('engineVectorShutdownBody', 0x30797f50, 'b9349aad30ff25dcdbaf30', 2),
        ('engineVector2ShutdownThunk', 0x300057ae, 'e98d277900', 1),
        ('engineVector2ShutdownBody', 0x30797f40, 'b9409aad30ff25dcdbaf30', 2),
        ('engineRectShutdownThunk', 0x3004214a, 'e9e15d7500', 1),
        ('engineRectShutdownBody', 0x30797f30, 'b94c9aad30ff25dcdbaf30', 2),
        ('engineMatrixShutdownThunk', 0x3000be1f,
         'e93cc17800', 1),
        ('engineMatrixShutdownBody', 0x30797f60,
         'b9289aad30ff25dcdbaf30', 2),
        ('engineObsoleteClassShutdownThunk', 0x30018c5a,
         'e911f37700', 1),
        ('engineObsoleteClassShutdownBody', 0x30797f70,
         'b91c9aad30ff25dcdbaf30', 2),
        ('engineObjectRefBaseShutdownThunk', 0x300098e0,
         'e99be67800', 1),
        ('engineObjectRefBaseShutdownBody', 0x30797f80,
         'b9109aad30ff25dcdbaf30', 2),
        ('engineTypeNameCleanupContinuation', 0x3067db6a,
         '59c745fcfeffffffe80c000000', 3),
        ('engineTypeNameFinally', 0x3067db83,
         '6a0ee82c57000059c3', 4),
    ]:
        raw = bytes.fromhex(encoded)
        if pe.bytes(begin, len(raw)) != raw:
            raise ValueError('Original Engine cleanup encoding differs: ' + label)
        rows = [dict(va=f'{i.address:08x}', rva=f'{i.address-pe.base:x}',
                     fileOffset=pe.offset(i.address, i.size), bytes=i.bytes.hex(),
                     instruction=(i.mnemonic+' '+i.op_str).strip())
                for i in decoder.disasm(raw, begin)]
        if len(rows) != count or b''.join(bytes.fromhex(r['bytes']) for r in rows) != raw:
            raise ValueError('Incomplete Engine cleanup decoding: ' + label)
        source['methods'].append(dict(label=label, entryVA=f'0x{begin:08x}',
            bodyVA=f'0x{begin:08x}', entryChain=[],
            bodyRanges=f'{begin:08x}-{begin+len(raw)-1:08x}', instructions=rows,
            instructionCount=len(rows), bodyByteCount=len(raw),
            bodyInstructionBytesSha256=hashlib.sha256(raw).hexdigest(),
            recoveredFromOriginalPEWithoutAssembly=True,
            decoder=f'capstone {capstone.__version__}'))
    caller = pe.bytes(0x30677284, 27)
    if caller.hex() != '85c07c176a00e8385f000085c059750bff05d070af30e9ac000000':
        raise ValueError('Original Engine initializer caller differs')
    tables = []
    for label, begin, end in [
        ('errorInitializers', 0x30816928, 0x30816c48),
        ('cppInitializers', 0x307bb000, 0x30816824),
    ]:
        raw = pe.bytes(begin, end - begin)
        entries = []
        for offset in range(0, len(raw), 4):
            target = int.from_bytes(raw[offset:offset+4], 'little')
            if target:
                entries.append(dict(slot=f'{begin+offset:08x}', target=f'{target:08x}'))
        tables.append(dict(label=label, begin=f'{begin:08x}', end=f'{end:08x}',
            slots=len(raw)//4, nonzeroEntries=entries, omittedSlotsAreZero=True,
            sha256=hashlib.sha256(raw).hexdigest()))
    fp = pe.bytes(0x30892ac0, 4)
    if int.from_bytes(fp, 'little') != 0x30671672:
        raise ValueError('Original Engine floating-point initializer differs')
    nt = struct.unpack_from('<I', pe.data, 0x3c)[0]
    section_count = struct.unpack_from('<H', pe.data, nt+6)[0]
    optional_size = struct.unpack_from('<H', pe.data, nt+20)[0]
    headers = pe.data[:nt+24+optional_size+section_count*40]
    type_info_size=8
    for offset in range(4096):
        type_info_size+=1
        if pe.bytes(0x30aa2a0c+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original visual animation type info')
    second_type_info_size=8
    for offset in range(4096):
        second_type_info_size+=1
        if pe.bytes(0x30aa29e0+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original second visual animation type info')
    third_type_info_size=8
    for offset in range(4096):
        third_type_info_size+=1
        if pe.bytes(0x30aa29fc+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original third visual animation type info')
    camera_type_info_size=8
    for offset in range(4096):
        camera_type_info_size+=1
        if pe.bytes(0x30aa2a1c+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original camera base object type info')
    object_ref_type_info_size=8
    for offset in range(4096):
        object_ref_type_info_size+=1
        if pe.bytes(0x30aa202c+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original object reference base type info')
    obsolete_class_type_info_size=8
    for offset in range(4096):
        obsolete_class_type_info_size+=1
        if pe.bytes(0x30aa2a3c+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original obsolete class type info')
    matrix_type_info_size=8
    for offset in range(4096):
        matrix_type_info_size+=1
        if pe.bytes(0x30aa2a60+8+offset,1)==b'\0':
            break
    else:
        raise ValueError('Unterminated original matrix type info')
    def property_type_info_size(address):
        for offset in range(4096):
            if pe.bytes(address + 8 + offset, 1) == b'\0':
                return 8 + offset + 1
        raise ValueError('Unterminated original property type info')
    images = []
    for label, address, size in [
        ('floatingPointCallback', 0x30892ac0, 4),
        ('floatConversionPointers', 0x30ad4900, 40),
        ('divideAdjustment', 0x30af70a8, 4),
        ('dynamicTlsCallback', 0x30af7e88, 4),
        ('exitTableBegin', 0x30af7e7c, 4),
        ('exitTableEnd', 0x30af7e80, 4),
        ('streamCount', 0x30af91e0, 4),
        ('streamPointers', 0x30af7e8c, 4),
        ('staticStreams', 0x30ad45a8, 640),
        ('sse2Ready', 0x30af7e58, 4),
        ('sse2Control', 0x30af7e68, 4),
        ('onexitSehScope', 0x30956388, 28),
        ('propertyTypeNameSehScope', 0x30956a38, 28),
        ('undecorationSehScope', 0x30956ec0, 28),
        ('undecorationGlobals', 0x30af7c54, 20),
        ('undecorationParserGlobals', 0x30af7c68, 38),
        ('undecorationBasicTypeCaseMap', 0x3069b72d, 11),
        ('undecorationBasicTypeTargets', 0x3069b715, 24),
        ('undecorationFloatLiteral', 0x30819794, 6),
        ('undecorationIntLiteral', 0x3089f5d0, 4),
        ('undecorationClassLiteral', 0x3089f408, 7),
        ('undecorationEnumUnderlyingTargets', 0x30698051, 32),
        ('undecorationEnumLiteral', 0x3089f410, 6),
        ('undecorationEnumCharLiteral', 0x3089f324, 6),
        ('undecorationEnumShortLiteral', 0x3089f31c, 7),
        ('undecorationEnumIntLiteral', 0x3089f314, 5),
        ('undecorationEnumLongLiteral', 0x3089f30c, 6),
        ('undecorationEnumUnsignedLiteral', 0x3089f300, 10),
        ('undecorationScopeSeparatorLiteral', 0x3088feb4, 3),
        ('undecorationTemplateParameterLiteral', 0x3089f3d4, 19),
        ('undecorationGenericTypeLiteral', 0x3089f3c4, 14),
        ('undecorationFieldVtableEntry', 0x3089f2ac, 4),
        ('undecorationTextVtableEntry', 0x3089f2bc, 12),
        ('undecorationListVtableEntry', 0x3089f29c, 12),
        ('undecorationCharacterVtableEntry', 0x3089f28c, 12),
        ('visualAnimationFloatFlags', 0x30ad9a00, 4),
        ('visualAnimationFloatRoot', 0x30ad9e38, 4),
        ('visualAnimationFloatStorage', 0x30ad99f8, 8),
        ('visualAnimationFloatDefault', 0x30af70ac, 8),
        ('visualAnimationFloatTypeInfo', 0x30aa2a0c, type_info_size),
        ('visualAnimationSecondFlags', 0x30ad99e8, 4),
        ('visualAnimationSecondRoot', 0x30ad9e34, 4),
        ('visualAnimationSecondStorage', 0x30ad99e0, 8),
        ('visualAnimationSecondTypeInfo', 0x30aa29e0, second_type_info_size),
        ('objectRefBaseFlags', 0x30ad9a18, 4),
        ('objectRefBaseRoot', 0x30ad9e28, 4),
        ('objectRefBaseStorage', 0x30ad9a10, 8),
        ('objectRefBaseTypeInfo', 0x30aa202c, object_ref_type_info_size),
        ('obsoleteClassFlags', 0x30ad9a24, 4),
        ('obsoleteClassRoot', 0x30ad9e24, 4),
        ('obsoleteClassStorage', 0x30ad9a1c, 8),
        ('obsoleteClassTypeInfo', 0x30aa2a3c, obsolete_class_type_info_size),
        ('matrixPropertyFlags', 0x30ad9a30, 4),
        ('matrixPropertyRoot', 0x30ad9e20, 4),
        ('matrixPropertyStorage', 0x30ad9a28, 8),
        ('matrixPropertyTypeInfo', 0x30aa2a60, matrix_type_info_size),
        ('vectorPropertyFlags', 0x30ad9a3c, 4),
        ('vectorPropertyRoot', 0x30ad9e1c, 4),
        ('vectorPropertyStorage', 0x30ad9a34, 8),
        ('vectorPropertyTypeInfo', 0x30aa2a7c, property_type_info_size(0x30aa2a7c)),
        ('vector2PropertyFlags', 0x30ad9a48, 4),
        ('vector2PropertyRoot', 0x30ad9e18, 4),
        ('vector2PropertyStorage', 0x30ad9a40, 8),
        ('vector2PropertyTypeInfo', 0x30aa2a98, property_type_info_size(0x30aa2a98)),
        ('rectPropertyFlags', 0x30ad9a54, 4),
        ('rectPropertyRoot', 0x30ad9e14, 4),
        ('rectPropertyStorage', 0x30ad9a4c, 8),
        ('rectPropertyTypeInfo', 0x30aa2ab4, property_type_info_size(0x30aa2ab4)),
        ('engineComponentPropertyFlags', 0x30ad9a78, 4),
        ('engineComponentPropertyRoot', 0x30ad9e08, 4),
        ('engineComponentPropertyStorage', 0x30ad9a70, 8),
        ('engineComponentPropertyTypeInfo', 0x30aa262c, property_type_info_size(0x30aa262c)),
        ('illuminationAdminPropertyFlags', 0x30ad9a84, 4),
        ('illuminationAdminPropertyRoot', 0x30ad9e04, 4),
        ('illuminationAdminPropertyStorage', 0x30ad9a7c, 8),
        ('illuminationAdminPropertyTypeInfo', 0x30aa2ae0, property_type_info_size(0x30aa2ae0)),
        ('materialAdminPropertyFlags', 0x30ad9a90, 4),
        ('materialAdminPropertyRoot', 0x30ad9e00, 4),
        ('materialAdminPropertyStorage', 0x30ad9a88, 8),
        ('materialAdminPropertyTypeInfo', 0x30aa2b08, property_type_info_size(0x30aa2b08)),
        ('guiManagerPropertyFlags', 0x30ad9a9c, 4),
        ('guiManagerPropertyRoot', 0x30ad9dfc, 4),
        ('guiManagerPropertyStorage', 0x30ad9a94, 8),
        ('guiManagerPropertyTypeInfo', 0x30aa2b2c, property_type_info_size(0x30aa2b2c)),
        ('actionMapperPropertyFlags', 0x30ad9aa8, 4),
        ('actionMapperPropertyRoot', 0x30ad9df8, 4),
        ('actionMapperPropertyStorage', 0x30ad9aa0, 8),
        ('actionMapperPropertyTypeInfo', 0x30aa2b4c, property_type_info_size(0x30aa2b4c)),
        ('contextBasePropertyFlags', 0x30ad9ab4, 4),
        ('contextBasePropertyRoot', 0x30ad9df4, 4),
        ('contextBasePropertyStorage', 0x30ad9aac, 8),
        ('contextBasePropertyTypeInfo', 0x30aa2b70, property_type_info_size(0x30aa2b70)),
        ('boxPropertyFlags', 0x30ad9acc, 4),
        ('boxPropertyRoot', 0x30ad9dec, 4),
        ('boxPropertyStorage', 0x30ad9ac4, 8),
        ('boxPropertyTypeInfo', 0x30aa2bb0, property_type_info_size(0x30aa2bb0)),
        ('processibleElementPropertyFlags', 0x30ad9ad8, 4),
        ('processibleElementPropertyRoot', 0x30ad9de8, 4),
        ('processibleElementPropertyStorage', 0x30ad9ad0, 8),
        ('processibleElementPropertyTypeInfo', 0x30aa2bc8, property_type_info_size(0x30aa2bc8)),
        ('entityPropertySetPropertyFlags', 0x30ad9ae4, 4),
        ('entityPropertySetPropertyRoot', 0x30ad9de4, 4),
        ('entityPropertySetPropertyStorage', 0x30ad9adc, 8),
        ('entityPropertySetPropertyTypeInfo', 0x30aa2bf4, property_type_info_size(0x30aa2bf4)),
        ('baseCachePropertyFlags', 0x30ad9af0, 4),
        ('baseCachePropertyRoot', 0x30ad9de0, 4),
        ('baseCachePropertyStorage', 0x30ad9ae8, 8),
        ('baseCachePropertyTypeInfo', 0x30aa2c1c, property_type_info_size(0x30aa2c1c)),
        ('resourceStorageContextPropertyFlags', 0x30ad9afc, 4),
        ('resourceStorageContextPropertyRoot', 0x30ad9ddc, 4),
        ('resourceStorageContextPropertyStorage', 0x30ad9af4, 8),
        ('resourceStorageContextPropertyTypeInfo', 0x30aa2c3c, property_type_info_size(0x30aa2c3c)),
        ('resourceBasePropertyFlags', 0x30ad9b08, 4),
        ('resourceBasePropertyRoot', 0x30ad9dd8, 4),
        ('resourceBasePropertyStorage', 0x30ad9b00, 8),
        ('resourceBasePropertyTypeInfo', 0x30aa2c6c, property_type_info_size(0x30aa2c6c)),
        ('mainCachePropertyFlags', 0x30ad9b14, 4),
        ('mainCachePropertyRoot', 0x30ad9dd4, 4),
        ('mainCachePropertyStorage', 0x30ad9b0c, 8),
        ('mainCachePropertyTypeInfo', 0x30aa2c94, property_type_info_size(0x30aa2c94)),
        ('resourceAdminPropertyFlags', 0x30ad9b20, 4),
        ('resourceAdminPropertyRoot', 0x30ad9dd0, 4),
        ('resourceAdminPropertyStorage', 0x30ad9b18, 8),
        ('resourceAdminPropertyTypeInfo', 0x30aa2cb4, property_type_info_size(0x30aa2cb4)),
        ('mainCacheTemplatePropertyFlags', 0x30ad9b2c, 4),
        ('mainCacheTemplatePropertyRoot', 0x30ad9dcc, 4),
        ('mainCacheTemplatePropertyStorage', 0x30ad9b24, 8),
        ('mainCacheTemplatePropertyTypeInfo', 0x30aa2cd8, property_type_info_size(0x30aa2cd8)),
        ('gfxAdminPropertyFlags', 0x30ad9b5c, 4),
        ('gfxAdminPropertyRoot', 0x30ad9dbc, 4),
        ('gfxAdminPropertyStorage', 0x30ad9b54, 8),
        ('gfxAdminPropertyTypeInfo', 0x30aa2dac, property_type_info_size(0x30aa2dac)),
        ('renderSystemAdminPropertyFlags', 0x30ad9b68, 4),
        ('renderSystemAdminPropertyRoot', 0x30ad9db8, 4),
        ('renderSystemAdminPropertyStorage', 0x30ad9b60, 8),
        ('renderSystemAdminPropertyTypeInfo', 0x30aa2dcc, property_type_info_size(0x30aa2dcc)),
        ('imageCachePropertyFlags', 0x30ad9b74, 4),
        ('imageCachePropertyRoot', 0x30ad9db4, 4),
        ('imageCachePropertyStorage', 0x30ad9b6c, 8),
        ('imageCachePropertyTypeInfo', 0x30aa2df4, property_type_info_size(0x30aa2df4)),
        ('materialCachePropertyFlags', 0x30ad9b80, 4),
        ('materialCachePropertyRoot', 0x30ad9db0, 4),
        ('materialCachePropertyStorage', 0x30ad9b78, 8),
        ('materialCachePropertyTypeInfo', 0x30aa2e14, property_type_info_size(0x30aa2e14)),
        ('meshCachePropertyFlags', 0x30ad9b8c, 4),
        ('meshCachePropertyRoot', 0x30ad9dac, 4),
        ('meshCachePropertyStorage', 0x30ad9b84, 8),
        ('meshCachePropertyTypeInfo', 0x30aa2e38, property_type_info_size(0x30aa2e38)),
        ('soundCachePropertyFlags', 0x30ad9b98, 4),
        ('soundCachePropertyRoot', 0x30ad9da8, 4),
        ('soundCachePropertyStorage', 0x30ad9b90, 8),
        ('soundCachePropertyTypeInfo', 0x30aa2e58, property_type_info_size(0x30aa2e58)),
        ('collisionMeshCachePropertyFlags', 0x30ad9ba4, 4),
        ('collisionMeshCachePropertyRoot', 0x30ad9da4, 4),
        ('collisionMeshCachePropertyStorage', 0x30ad9b9c, 8),
        ('collisionMeshCachePropertyTypeInfo', 0x30aa2e78, property_type_info_size(0x30aa2e78)),
        ('animationCachePropertyFlags', 0x30ad9bb0, 4),
        ('animationCachePropertyRoot', 0x30ad9da0, 4),
        ('animationCachePropertyStorage', 0x30ad9ba8, 8),
        ('animationCachePropertyTypeInfo', 0x30aa2ea4, property_type_info_size(0x30aa2ea4)),
        ('iteratorAdminPropertyFlags', 0x30ad9bbc, 4),
        ('iteratorAdminPropertyRoot', 0x30ad9d9c, 4),
        ('iteratorAdminPropertyStorage', 0x30ad9bb4, 8),
        ('iteratorAdminPropertyTypeInfo', 0x30aa2ecc, property_type_info_size(0x30aa2ecc)),
        ('inpAdminPropertyFlags', 0x30ad9bc8, 4),
        ('inpAdminPropertyRoot', 0x30ad9d98, 4),
        ('inpAdminPropertyStorage', 0x30ad9bc0, 8),
        ('inpAdminPropertyTypeInfo', 0x30aa2ef0, property_type_info_size(0x30aa2ef0)),
        ('dllInfoCtrlPropertyFlags', 0x30ad9bd4, 4),
        ('dllInfoCtrlPropertyRoot', 0x30ad9d94, 4),
        ('dllInfoCtrlPropertyStorage', 0x30ad9bcc, 8),
        ('dllInfoCtrlPropertyTypeInfo', 0x30aa2f10, property_type_info_size(0x30aa2f10)),
        ('wndPropertyFlags', 0x30ad9be0, 4),
        ('wndPropertyRoot', 0x30ad9d90, 4),
        ('wndPropertyStorage', 0x30ad9bd8, 8),
        ('wndPropertyTypeInfo', 0x30aa244c, property_type_info_size(0x30aa244c)),
        ('physicsScenePropertyFlags', 0x30ad9bec, 4),
        ('physicsScenePropertyRoot', 0x30ad9d8c, 4),
        ('physicsScenePropertyStorage', 0x30ad9be4, 8),
        ('physicsScenePropertyTypeInfo', 0x30aa2f34, property_type_info_size(0x30aa2f34)),
        ('animationAdminPropertyFlags', 0x30ad9bf8, 4),
        ('animationAdminPropertyRoot', 0x30ad9d88, 4),
        ('animationAdminPropertyStorage', 0x30ad9bf0, 8),
        ('animationAdminPropertyTypeInfo', 0x30aa2f58, property_type_info_size(0x30aa2f58)),
        ('performanceAdminPropertyFlags', 0x30ad9c04, 4),
        ('performanceAdminPropertyRoot', 0x30ad9d84, 4),
        ('performanceAdminPropertyStorage', 0x30ad9bfc, 8),
        ('performanceAdminPropertyTypeInfo', 0x30aa2f80, property_type_info_size(0x30aa2f80)),
        ('vegetationAdminPropertyFlags', 0x30ad9c10, 4),
        ('vegetationAdminPropertyRoot', 0x30ad9d80, 4),
        ('vegetationAdminPropertyStorage', 0x30ad9c08, 8),
        ('vegetationAdminPropertyTypeInfo', 0x30aa2fa8, property_type_info_size(0x30aa2fa8)),
        ('shaderMaterialAdminPropertyFlags', 0x30ad9c1c, 4),
        ('shaderMaterialAdminPropertyRoot', 0x30ad9d7c, 4),
        ('shaderMaterialAdminPropertyStorage', 0x30ad9c14, 8),
        ('shaderMaterialAdminPropertyTypeInfo', 0x30aa2fd0, property_type_info_size(0x30aa2fd0)),
        ('postProcessingAdminPropertyFlags', 0x30ad9c28, 4),
        ('postProcessingAdminPropertyRoot', 0x30ad9d78, 4),
        ('postProcessingAdminPropertyStorage', 0x30ad9c20, 8),
        ('postProcessingAdminPropertyTypeInfo', 0x30aa2ffc, property_type_info_size(0x30aa2ffc)),
        ('sharedCriticalSectionReferenceCounter', 0x30ad40cc, 4),
        ('sharedCriticalSectionArray', 0x30af6d70, 96),
        ('sharedCriticalSectionReferenceAddress', 0x30af6dd0, 1),
        ('sharedCriticalSectionSecondReferenceAddress', 0x30af6e01, 1),
        ('standardOutputFilebufStorage', 0x30af6e08, 80),
        ('standardStreambufVtable', 0x3088da3c, 4),
        ('standardLocaleGlobalPointer', 0x30af6dd8, 4),
        ('shapeGroupContainerPropertyFlags', 0x30ad9c94, 4),
        ('shapeGroupContainerPropertyRoot', 0x30ad9d54, 4),
        ('shapeGroupContainerPropertyStorage', 0x30ad9c8c, 8),
        ('shapeGroupContainerPropertyTypeInfo', 0x30aa30f0, property_type_info_size(0x30aa30f0)),
        ('shapeMaterialContainerPropertyFlags', 0x30ad9ca0, 4),
        ('shapeMaterialContainerPropertyRoot', 0x30ad9d50, 4),
        ('shapeMaterialContainerPropertyStorage', 0x30ad9c98, 8),
        ('shapeMaterialContainerPropertyTypeInfo', 0x30aa3130, property_type_info_size(0x30aa3130)),
        ('collisionGroupContainerPropertyFlags', 0x30ad9cac, 4),
        ('collisionGroupContainerPropertyRoot', 0x30ad9d4c, 4),
        ('collisionGroupContainerPropertyStorage', 0x30ad9ca4, 8),
        ('collisionGroupContainerPropertyTypeInfo', 0x30aa3174, property_type_info_size(0x30aa3174)),
        ('springAndDamperEffectorTemplatePropertyFlags', 0x30ad9cb8, 4),
        ('springAndDamperEffectorTemplatePropertyRoot', 0x30ad9d48, 4),
        ('springAndDamperEffectorTemplatePropertyStorage', 0x30ad9cb0, 8),
        ('springAndDamperEffectorTemplatePropertyTypeInfo', 0x30aa31b8, property_type_info_size(0x30aa31b8)),
        ('audioModulePropertyFlags', 0x30ad9cc4, 4),
        ('audioModulePropertyRoot', 0x30ad9d44, 4),
        ('audioModulePropertyStorage', 0x30ad9cbc, 8),
        ('audioModulePropertyTypeInfo', 0x30aa2608, property_type_info_size(0x30aa2608)),
        ('animationResourceStringPropertyFlags', 0x30ad9c88, 4),
        ('animationResourceStringPropertyRoot', 0x30ad9d58, 4),
        ('animationResourceStringPropertyStorage', 0x30ad9c80, 8),
        ('animationResourceStringPropertyTypeInfo', 0x30aa30c0, property_type_info_size(0x30aa30c0)),
        ('visualAnimationPsPropertyFlags', 0x30ad9c7c, 4),
        ('visualAnimationPsPropertyRoot', 0x30ad9d5c, 4),
        ('visualAnimationPsPropertyStorage', 0x30ad9c74, 8),
        ('visualAnimationPsPropertyTypeInfo', 0x30aa3094, property_type_info_size(0x30aa3094)),
        ('springAndDamperEffectorPropertyFlags', 0x30ad9c70, 4),
        ('springAndDamperEffectorPropertyRoot', 0x30ad9d60, 4),
        ('springAndDamperEffectorPropertyStorage', 0x30ad9c68, 8),
        ('springAndDamperEffectorPropertyTypeInfo', 0x30aa25d8, property_type_info_size(0x30aa25d8)),
        ('entityProxyPropertyFlags', 0x30ad9c64, 4),
        ('entityProxyPropertyRoot', 0x30ad9d64, 4),
        ('entityProxyPropertyStorage', 0x30ad9c5c, 8),
        ('entityProxyPropertyTypeInfo', 0x30aa3070, property_type_info_size(0x30aa3070)),
        ('effectorPropertyFlags', 0x30ad9c58, 4),
        ('effectorPropertyRoot', 0x30ad9d68, 4),
        ('effectorPropertyStorage', 0x30ad9c50, 8),
        ('effectorPropertyTypeInfo', 0x30aa25b8, property_type_info_size(0x30aa25b8)),
        ('sceneAdminClassPropertyFlags', 0x30ad9c4c, 4),
        ('sceneAdminClassPropertyRoot', 0x30ad9d6c, 4),
        ('sceneAdminClassPropertyStorage', 0x30ad9c44, 8),
        ('sceneAdminClassPropertyTypeInfo', 0x30aa3050, property_type_info_size(0x30aa3050)),
        ('triggerBasePsPropertyFlags', 0x30ad9c40, 4),
        ('triggerBasePsPropertyRoot', 0x30ad9d70, 4),
        ('triggerBasePsPropertyStorage', 0x30ad9c38, 8),
        ('triggerBasePsPropertyTypeInfo', 0x30aa3028, property_type_info_size(0x30aa3028)),
        ('guiModulePropertyFlags', 0x30ad9c34, 4),
        ('guiModulePropertyRoot', 0x30ad9d74, 4),
        ('guiModulePropertyStorage', 0x30ad9c2c, 8),
        ('guiModulePropertyTypeInfo', 0x30aa2944, property_type_info_size(0x30aa2944)),
        ('occlusionProcessorPropertyFlags', 0x30ad9b50, 4),
        ('occlusionProcessorPropertyRoot', 0x30ad9dc0, 4),
        ('occlusionProcessorPropertyStorage', 0x30ad9b48, 8),
        ('occlusionProcessorPropertyTypeInfo', 0x30aa2d80, property_type_info_size(0x30aa2d80)),
        ('pvsPrefetcher3PropertyFlags', 0x30ad9b44, 4),
        ('pvsPrefetcher3PropertyRoot', 0x30ad9dc4, 4),
        ('pvsPrefetcher3PropertyStorage', 0x30ad9b3c, 8),
        ('pvsPrefetcher3PropertyTypeInfo', 0x30aa2d58, property_type_info_size(0x30aa2d58)),
        ('geometrySpatialContextPropertyFlags', 0x30ad9b38, 4),
        ('geometrySpatialContextPropertyRoot', 0x30ad9dc8, 4),
        ('geometrySpatialContextPropertyStorage', 0x30ad9b30, 8),
        ('geometrySpatialContextPropertyTypeInfo', 0x30aa2d28, property_type_info_size(0x30aa2d28)),
        ('guidPropertyFlags', 0x30ad9ac0, 4),
        ('guidPropertyRoot', 0x30ad9df0, 4),
        ('guidPropertyStorage', 0x30ad9ab8, 8),
        ('guidPropertyTypeInfo', 0x30aa2b94, property_type_info_size(0x30aa2b94)),
        ('inputReceiverPropertyFlags', 0x30ad9a6c, 4),
        ('inputReceiverPropertyRoot', 0x30ad9e0c, 4),
        ('inputReceiverPropertyStorage', 0x30ad9a64, 8),
        ('inputReceiverPropertyTypeInfo', 0x30aa2464, property_type_info_size(0x30aa2464)),
        ('boolPropertyFlags', 0x30ad9a60, 4),
        ('boolPropertyRoot', 0x30ad9e10, 4),
        ('boolPropertyStorage', 0x30ad9a58, 8),
        ('boolPropertyTypeInfo', 0x30aa2ad0, property_type_info_size(0x30aa2ad0)),
        ('undecorationBoolLiteral', 0x3087e580, 5),
        ('cameraBaseObjectFlags', 0x30ad9a0c, 4),
        ('cameraBaseObjectRoot', 0x30ad9e2c, 4),
        ('cameraBaseObjectStorage', 0x30ad9a04, 8),
        ('cameraBaseObjectTypeInfo', 0x30aa2a1c, camera_type_info_size),
        ('visualAnimationThirdFlags', 0x30ad99f4, 4),
        ('visualAnimationThirdRoot', 0x30ad9e30, 4),
        ('visualAnimationThirdStorage', 0x30ad99ec, 8),
        ('visualAnimationThirdTypeInfo', 0x30aa29fc, third_type_info_size),
    ]:
        rva = address-pe.base
        section = next(s for s in pe.sections if s[1] <= rva and rva+size <= s[1]+max(s[0],s[2]))
        backed = max(0,min(size,section[1]+section[2]-rva))
        raw = (pe.bytes(address,backed) if backed else b'')+bytes(size-backed)
        images.append(dict(label=label,address=f'{address:08x}',bytes=size,raw=raw.hex(),
            fileBackedBytes=backed,loaderZeroFillBytes=size-backed,sha256=hashlib.sha256(raw).hexdigest()))
    strings = []
    for label,address in [('divideModule',0x30893dbc),('divideExport',0x30893da0)]:
        raw = bytearray()
        for offset in range(256):
            byte = pe.bytes(address+offset,1)
            raw.extend(byte)
            if byte == b'\0':
                break
        else:
            raise ValueError('Unterminated original Engine divide dispatch string')
        strings.append(dict(label=label,address=f'{address:08x}',raw=raw.hex(),
            text=raw[:-1].decode('ascii'),sha256=hashlib.sha256(raw).hexdigest()))
    EXPECTED_INPUTS['SharedBase.dll'] = '5e5f241313f7db1093f68376a0972629eb1d9d2dc5f306aa920966de03a69214'
    shared_unmangle = audit_module(study, 'SharedBase_dll', 'SharedBase.dll', {
        0x100088cd: 'sharedClassNameUnMangle',
        0x100a7430: 'sharedClassNameSpaceSearch',
        0x100a7300: 'sharedClassNameCharacterSearch',
        0x10003ba7: 'sharedClassNameTextConstructor',
        0x10007d65: 'sharedClassNameCStringAllocate',
        0x10002aae: 'sharedClassNameMemoryAdminGetInstance',
        0x10003cd8: 'sharedClassNameMemoryAdminMalloc',
        0x100a7a00: 'sharedClassNameMemcpy',
    })
    shared_pe = PE((study / '00_Original_Runtime/SharedBase.dll').read_bytes())
    space = shared_pe.bytes(0x100e6f44, 2)
    if space.hex() != '2000':
        raise ValueError('Original SharedBase UnMangle space literal differs')
    return dict(schema='gothic3.engine-cinit-source.v1', source=source,
        sharedBaseUnMangleSource=shared_unmangle,
        sharedBaseSpaceLiteral=dict(address='100e6f44', raw=space.hex(),
            sha256=hashlib.sha256(space).hexdigest()),
        caller=dict(resultTest='30677284', failureBranch='30677286',
            failureTarget='3067729f', call='3067728a', target='3067d1c7',
            returnAddress='3067728f', raw=caller.hex(), sha256=hashlib.sha256(caller).hexdigest()),
        floatingPointCallback=dict(slot='30892ac0', target='30671672', raw=fp.hex()),
        initializerTables=tables, images=images, strings=strings,
        originalHeaders=dict(address=f'{pe.base:08x}',bytes=len(headers),raw=headers.hex(),sha256=hashlib.sha256(headers).hexdigest()),
        runtimeConnected=False,
        notes=['Source capture does not establish initializer execution.',
            'Callback table slots are original addresses, not browser memory pointers.',
            'Engine initialization requires its own retained owner and caller authority.',
            'Nonzero C++ callbacks still need their behavior implemented before campaign activation.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--typescript', type=Path)
    parser.add_argument('--capstone-path',type=Path)
    args = parser.parse_args()
    if args.capstone_path:
        sys.path.insert(0,str(args.capstone_path.resolve()))
    receipt = capture(args.study)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(receipt, indent=2) + '\n'
    args.output.write_text(text, encoding='utf-8', newline='\n')
    if args.typescript:
        generated = """/** Generated original Engine CRT initializer source admission. */
import source from '../../assets/gothic3/engine-cinit/research.json';
import sourceText from '../../assets/gothic3/engine-cinit/research.json?raw';
const expectedText = EXPECTED;
function freeze(value:unknown):void {if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(source);
// The admitted receipt is immutable; live image storage is validated separately on every access.
const imagesByLabel = new Map(source.images.map(image => [image.label, image]));
let admitted=false;
export function admitEngineCinitSource():void {if(admitted)return;if(sourceText!==expectedText)throw new Error('Original Engine initializer source differs');admitted=true;}
function indexMethods<Method extends {entryVA:string;bodyVA:string;instructions:readonly {va:string}[];entryChain:readonly {va:string}[]}>(methods:readonly Method[]){
 const byEntry=new Map<string,Method>(),rows=new Map<Method,Map<string,Method['instructions'][number]|Method['entryChain'][number]>>();
 for(const method of methods){for(const entry of [method.entryVA,method.bodyVA])if(!byEntry.has(entry))byEntry.set(entry,method);const instructions=new Map<string,Method['instructions'][number]|Method['entryChain'][number]>();for(const row of [...method.instructions,...method.entryChain])if(!instructions.has(row.va))instructions.set(row.va,row);rows.set(method,instructions);}
 return (entry:string,pc:string)=>{const method=byEntry.get('0x'+entry);return method?rows.get(method)!.get(pc):undefined;};
}
const engineInstruction=indexMethods(source.source.methods),sharedInstruction=indexMethods(source.sharedBaseUnMangleSource.methods);
export function engineCinitInstruction(entry:string,pc:string){admitEngineCinitSource();const row=engineInstruction(entry,pc);if(!row)throw new Error('Original Engine initializer instruction required');return row;}
export function engineCinitUnMangleInstruction(entry:string,pc:string){admitEngineCinitSource();const row=sharedInstruction(entry,pc);if(!row)throw new Error('Original SharedBase UnMangle instruction required');return row;}
export function engineCinitUnMangleLiteral(){admitEngineCinitSource();return source.sharedBaseSpaceLiteral;}
export function engineCinitCaller(){admitEngineCinitSource();return source.caller;}
export function engineCinitImport(iat:string){admitEngineCinitSource();const row=source.source.imports.find(row=>row.iatVA==='0x'+iat);if(!row)throw new Error('Original Engine initializer import required');return row;}
export function engineCinitFloatingPointCallback(){admitEngineCinitSource();return source.floatingPointCallback;}
export function engineCinitHeaders(){admitEngineCinitSource();return source.originalHeaders;}
export function engineCinitImage(label:string){admitEngineCinitSource();const image=imagesByLabel.get(label);if(!image)throw new Error('Original Engine initializer image required');return image;}
export function engineCinitString(label:string){admitEngineCinitSource();const string=source.strings.find(string=>string.label===label);if(!string)throw new Error('Original Engine initializer string required');return string;}
export function engineCinitTable(label:string){admitEngineCinitSource();const table=source.initializerTables.find(table=>table.label===label);if(!table)throw new Error('Original Engine initializer table required');return table;}
export function engineCinitTableTarget(label:string,slot:string):string|null {
 const table=engineCinitTable(label);
 if(!/^[0-9a-f]{8}$/.test(slot))throw new Error('Original Engine initializer slot required');
 const address=parseInt(slot,16),begin=parseInt(table.begin,16),end=parseInt(table.end,16);
 if(address<begin||address>=end||(address-begin)%4!==0)throw new Error('Original Engine initializer slot outside table');
 return table.nonzeroEntries.find(entry=>entry.slot===slot)?.target??null;
}
""".replace('EXPECTED', json.dumps(text))
        args.typescript.write_text(generated, encoding='utf-8', newline='\n')
