import { generateTerrainTextureData } from './terrainTextures';

// This worker owns CPU arrays only. Scene objects and GPU uploads remain with WorldScene.
self.onmessage = async (event: MessageEvent<{ size: number }>) => {
  try {
    const data = await generateTerrainTextureData(event.data.size, undefined, {
      onProgress: (completed, total, layer) => self.postMessage({ type: 'progress', completed, total, layer }),
    });
    self.postMessage({ type: 'complete', ...data }, { transfer: [data.albedo.buffer, data.normal.buffer] });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'Ground materials could not be generated.' });
  }
};
