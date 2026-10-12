/** Source bytes passed to a texture call. Null pixels allocate storage; they do not upload source pixels. */
export function textureUploadBytes(name, args) {
  // TexImageSource overloads end with the source; sized overloads put it after format/type.
  const sourceIndex = name === 'texImage2D' ? (args.length === 6 ? 5 : 8)
    : name === 'texSubImage2D' ? (args.length === 7 ? 6 : 8)
    : name === 'texImage3D' ? 9 : name === 'texSubImage3D' ? 10
    : name === 'compressedTexImage2D' ? 6 : 7;
  const source = args[sourceIndex];
  // Numeric sources are pixel-unpack-buffer offsets, not byte counts; this counter cannot infer their extent.
  if (source == null || typeof source === 'number') return 0;
  if (source.byteLength !== undefined) {
    const offset = args[sourceIndex + 1] ?? 0;
    const length = args[sourceIndex + 2];
    const elementBytes = source.BYTES_PER_ELEMENT ?? 1;
    return length !== undefined && length > 0 ? length * elementBytes : Math.max(0, source.byteLength - offset * elementBytes);
  }
  return (source.videoWidth ?? source.width ?? 0) * (source.videoHeight ?? source.height ?? 0) * 4;
}
