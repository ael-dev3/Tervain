/** Resolve original model bytes locally, or from the exact commit used by a hosted production build. */
export function modelAssetUrl(
  file: string,
  base = import.meta.env.BASE_URL,
  page = document.baseURI,
  modelBase = typeof __MODEL_ASSET_BASE__ === 'undefined' ? '' : __MODEL_ASSET_BASE__,
): URL {
  // Manifest paths must stay inside the model directory on either host.
  const segments = file.split('/');
  if (!file || /[\\?#]/.test(file) || segments.some((part) => {
    try {
      const decoded = decodeURIComponent(part);
      return !decoded || decoded === '.' || decoded === '..' || /[\\/:]/.test(decoded);
    } catch {
      return true;
    }
  })) throw new Error(`Invalid model asset path: ${file}`);
  if (modelBase) {
    if (!/^https:\/\/raw\.githubusercontent\.com\/ael-dev3\/Tervain\/[0-9a-f]{40}\/public\/models\/$/.test(modelBase)) {
      throw new Error('Hosted model delivery requires the exact production commit.');
    }
    return new URL(file, modelBase);
  }
  return new URL(`${base}models/${file}`, page);
}
