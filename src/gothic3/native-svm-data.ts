/** Source SVM manager input, read before native death speech requests.
 * Prepared from the installed Strings.p00 override and its declared GENOMFLE
 * string table. The unused trailing bytes are retained as evidence, never
 * promoted to native indexed strings or inferred dialogue subtitles.
 */
import sourceText from '../../assets/gothic3/speech/svm-admin.json?raw';

interface SvmDocument {
  schema: string;
  source: { archive: string; path: string; sha256: string; bytes: number };
  wrapper: { stringCount: number; trailingBytes: number };
  manager: { version: number; voices: { voice: string; categories: string[] }[];
    categories: { category: string; entries: { label: string; text: string }[] }[] };
  language: { audio: string; text: string; source: { sha256: string; section: string; audioKey: string } };
  audit: { voiceCount: number; categoryCount: number; pairCount: number };
}
const document = JSON.parse(sourceText) as SvmDocument;
if (document.schema !== 'gothic3-svm-admin-v1' || document.source.archive !== 'Strings.p00' ||
    document.source.sha256 !== '018295b8a7ae06e45dcb8ce9816b1fe65f672aeecbc93de5308a3af3aa884943' ||
    document.source.bytes !== 28188 || document.wrapper.stringCount !== 648 || document.wrapper.trailingBytes !== 31 ||
    document.manager.version !== 1 || document.manager.voices.length !== 54 || document.manager.categories.length !== 15 ||
    document.manager.categories.reduce((count, value) => count + value.entries.length, 0) !== 581 ||
    document.audit.voiceCount !== 54 || document.audit.categoryCount !== 15 || document.audit.pairCount !== 581 ||
    document.language.source.sha256 !== 'e92011e2a083e33cfa4b1433679f5b26911bbe6b1cdd125f85f4971598b104bb' ||
    document.language.source.section !== 'Language' || document.language.source.audioKey !== 'Audio' ||
    document.language.audio !== 'English') throw new Error('Installed SVM manager data or selected audio language differs.');

export class NativeSvmManagerData {
  /** Browser representation of the successfully read native map contents.
   * Registration/lifetime uses the containing browser runtime's module owner;
   * no native atexit callback or heap pointer is executed in JavaScript. */
  readonly voices = structuredClone(document.manager.voices);
  readonly categories = structuredClone(document.manager.categories);
  readonly audioLanguage = document.language.audio;

  /** Game203aca80 uses SVM_%s_%s, then '_' + current audio language.
   * Script10030d80 appends .wav when requesting StartOutput. No map contents
   * are used as spoken text by this formatting function. */
  sampleName(voice: string, label: string): string {
    if (!voice || !label || voice.includes('\0') || label.includes('\0')) {
      throw new Error('SVM sample formatting requires bounded native CString inputs.');
    }
    return `SVM_${voice}_${label}_${this.audioLanguage}.wav`;
  }
}
