#!/usr/bin/env python3
"""Prepare the Meshy furniture (A66) for the game: real size, front into the room, origin on the floor, small maps.

  python tools/prepare-meshy-furniture.py --source <dir> [--only id,...]

<dir> is the working folder tools/meshy-furniture/generate.mjs filled (<id>/<id>.glb with its task records). Each piece
in tools/meshy-furniture/plan.json is turned by its quarter `turn`s so its front faces +z, scaled to the plan's size
(its height exactly; width and depth as near as a fifth either way of that scale allows), centred on its footprint and
stood on y = 0. Normals follow the scale. The colour, normal and metal/roughness maps are reduced to the plan's texture
size, half of it and a quarter of it, and wood never shines like varnish: roughness is raised where the surface is not
metal. Geometry, UVs and the maps' content are otherwise Meshy's.

Writes public/models/furniture/<id>.glb, public/models/furniture/manifest.json (sizes, triangles, hashes, provenance)
and src/world/furnitureSizes.ts (the sizes the colliders and layouts use). Requires numpy and Pillow.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import struct
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "tools/meshy-furniture/plan.json"
OUT = ROOT / "public/models/furniture"
SIZES = ROOT / "src/world/furnitureSizes.ts"


def read_glb(path: Path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<III", raw)
    if magic != 0x46546C67 or version != 2 or length != len(raw):
        raise ValueError(f"{path}: not a complete GLB 2 file")
    n = struct.unpack_from("<I", raw, 12)[0]
    doc = json.loads(raw[20:20 + n])
    m = struct.unpack_from("<I", raw, 20 + n)[0]
    return doc, raw[28 + n:28 + n + m]


def accessor(doc, binary, index):
    a = doc["accessors"][index]
    view = doc["bufferViews"][a["bufferView"]]
    comps = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[a["type"]]
    dtype = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}[a["componentType"]]
    start = view.get("byteOffset", 0) + a.get("byteOffset", 0)
    stride = view.get("byteStride", 0)
    item = np.dtype(dtype).itemsize * comps
    if stride and stride != item:
        rows = np.frombuffer(binary, dtype=np.uint8, count=stride * a["count"], offset=start).reshape(a["count"], stride)
        return rows[:, :item].copy().view(dtype).reshape(a["count"], comps)
    return np.frombuffer(binary, dtype=dtype, count=a["count"] * comps, offset=start).reshape(a["count"], comps).copy()


def image(doc, binary, texture_index) -> Image.Image:
    view = doc["bufferViews"][doc["images"][doc["textures"][texture_index]["source"]]["bufferView"]]
    start = view.get("byteOffset", 0)
    return Image.open(io.BytesIO(binary[start:start + view["byteLength"]]))


def jpeg(img: Image.Image, size: int, quality: int) -> bytes:
    out = io.BytesIO()
    img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS).save(out, "JPEG", quality=quality, optimize=True, progressive=False)
    return out.getvalue()


def normal_map(img: Image.Image, size: int) -> bytes:
    """Filtered down, then renormalized, so the reduced map still holds unit normals."""
    small = np.asarray(img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)).astype(np.float32) / 127.5 - 1
    small /= np.maximum(np.linalg.norm(small, axis=2, keepdims=True), 1e-6)
    out = io.BytesIO()
    Image.fromarray(np.clip((small + 1) * 127.5 + 0.5, 0, 255).astype(np.uint8)).save(out, "JPEG", quality=92, optimize=True)
    return out.getvalue()


def metal_rough(img: Image.Image, size: int) -> bytes:
    """glTF metal/roughness: G roughness, B metalness. Non-metal surfaces are kept matte (at least half rough)."""
    arr = np.asarray(img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)).astype(np.float32) / 255
    metal = arr[..., 2]
    rough = arr[..., 1]
    matte = 0.5 + 0.5 * rough
    arr[..., 1] = np.where(metal < 0.5, matte, rough)
    arr[..., 0] = 1
    out = io.BytesIO()
    Image.fromarray(np.clip(arr * 255 + 0.5, 0, 255).astype(np.uint8)).save(out, "JPEG", quality=90, optimize=True)
    return out.getvalue()


def write_glb(path: Path, name: str, positions, normals, uvs, indices, images: list[bytes]) -> None:
    blocks: list[bytes] = []
    views = []
    offset = 0

    def append(data: bytes, target: int | None = None) -> int:
        nonlocal offset
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        padded = data + bytes((-len(data)) % 4)
        blocks.append(padded)
        offset += len(padded)
        return len(views) - 1

    index_type = np.uint16 if len(positions) < 65536 else np.uint32
    accessors = [
        {"bufferView": append(indices.astype(index_type).tobytes(), 34963), "componentType": 5123 if index_type is np.uint16 else 5125, "count": int(indices.size), "type": "SCALAR"},
        {"bufferView": append(positions.astype(np.float32).tobytes(), 34962), "componentType": 5126, "count": len(positions), "type": "VEC3",
         "min": [float(v) for v in positions.min(axis=0)], "max": [float(v) for v in positions.max(axis=0)]},
        {"bufferView": append(normals.astype(np.float32).tobytes(), 34962), "componentType": 5126, "count": len(normals), "type": "VEC3"},
        {"bufferView": append(uvs.astype(np.float32).tobytes(), 34962), "componentType": 5126, "count": len(uvs), "type": "VEC2"},
    ]
    image_views = [append(data) for data in images]
    doc = {
        "asset": {"version": "2.0", "generator": "Tervain prepare-meshy-furniture"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"name": name, "mesh": 0}],
        "meshes": [{"name": name, "primitives": [{"attributes": {"POSITION": 1, "NORMAL": 2, "TEXCOORD_0": 3}, "indices": 0, "material": 0}]}],
        "materials": [{"name": name, "doubleSided": True, "pbrMetallicRoughness": {
            "baseColorTexture": {"index": 0}, "metallicRoughnessTexture": {"index": 1}, "metallicFactor": 1, "roughnessFactor": 1},
            "normalTexture": {"index": 2}}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "images": [{"bufferView": v, "mimeType": "image/jpeg"} for v in image_views],
        "textures": [{"sampler": 0, "source": i} for i in range(len(image_views))],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": offset}],
    }
    data = b"".join(blocks)
    raw = json.dumps(doc, separators=(",", ":")).encode()
    raw += b" " * ((-len(raw)) % 4)
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, 28 + len(raw) + len(data)) + struct.pack("<II", len(raw), 0x4E4F534A) + raw
                     + struct.pack("<II", len(data), 0x004E4942) + data)


def prepare(piece_id: str, spec: dict, source: Path) -> dict:
    folder = source / piece_id
    doc, binary = read_glb(folder / f"{piece_id}.glb")
    primitives = [p for mesh in doc["meshes"] for p in mesh["primitives"]]
    if len(primitives) != 1:
        raise ValueError(f"{piece_id}: expected one primitive, found {len(primitives)}")
    prim = primitives[0]
    positions = accessor(doc, binary, prim["attributes"]["POSITION"]).astype(np.float64)
    normals = accessor(doc, binary, prim["attributes"]["NORMAL"]).astype(np.float64)
    uvs = accessor(doc, binary, prim["attributes"]["TEXCOORD_0"])
    indices = accessor(doc, binary, prim["indices"]).reshape(-1)
    # Front into the room (+z): quarter turns about y.
    for _ in range(spec.get("turn", 0) % 4):
        positions = np.stack([positions[:, 2], positions[:, 1], -positions[:, 0]], axis=1)
        normals = np.stack([normals[:, 2], normals[:, 1], -normals[:, 0]], axis=1)
    lo, hi = positions.min(axis=0), positions.max(axis=0)
    extent = hi - lo
    width, height, depth = spec["size"]
    sy = height / extent[1]
    sx = float(np.clip(width / extent[0], sy * 0.8, sy * 1.2))
    sz = float(np.clip(depth / extent[2], sy * 0.8, sy * 1.2))
    scale = np.array([sx, sy, sz])
    centre = np.array([(lo[0] + hi[0]) / 2, lo[1], (lo[2] + hi[2]) / 2])
    positions = (positions - centre) * scale
    normals = normals / scale
    normals /= np.maximum(np.linalg.norm(normals, axis=1, keepdims=True), 1e-9)
    material = doc["materials"][prim["material"]]
    pbr = material["pbrMetallicRoughness"]
    texture = spec.get("texture", 1024)
    images = [
        jpeg(image(doc, binary, pbr["baseColorTexture"]["index"]), texture, 84),
        metal_rough(image(doc, binary, pbr["metallicRoughnessTexture"]["index"]), max(128, texture // 4)),
        normal_map(image(doc, binary, material["normalTexture"]["index"]), max(256, texture // 2)),
    ]
    OUT.mkdir(parents=True, exist_ok=True)
    out = OUT / f"{piece_id}.glb"
    write_glb(out, piece_id, positions, normals, uvs, indices, images)
    data = out.read_bytes()
    size = positions.max(axis=0) - positions.min(axis=0)
    preview = json.loads((folder / "preview.json").read_text(encoding="utf-8"))
    refine = json.loads((folder / "refine.json").read_text(encoding="utf-8"))
    return {
        "id": piece_id, "file": f"{piece_id}.glb", "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
        "triangles": int(indices.size // 3), "vertices": int(len(positions)), "texture": texture,
        "size": [round(float(v), 4) for v in size],
        "source": {"service": "Meshy text to 3D", "model": preview.get("ai_model") or "latest", "prompt": spec["prompt"],
                   "previewTask": preview["id"], "refineTask": refine["id"],
                   "created": datetime.fromtimestamp(refine["created_at"] / 1000, timezone.utc).strftime("%Y-%m-%d"),
                   "sourceSha256": hashlib.sha256((folder / f"{piece_id}.glb").read_bytes()).hexdigest()},
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--only")
    args = parser.parse_args()
    plan = json.loads(PLAN.read_text(encoding="utf-8"))
    manifest_path = OUT / "manifest.json"
    previous = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {"pieces": []}
    pieces = {p["id"]: p for p in previous["pieces"]}
    wanted = args.only.split(",") if args.only else [p for p in plan["pieces"] if not plan["pieces"][p].get("retired")]
    for piece_id in wanted:
        pieces[piece_id] = prepare(piece_id, plan["pieces"][piece_id], args.source)
        p = pieces[piece_id]
        print(f"{piece_id}: {p['triangles']} triangles, {p['bytes'] // 1024} KiB, {p['size']}")
    for piece_id in list(pieces):
        if piece_id not in plan["pieces"] or plan["pieces"][piece_id].get("retired"):
            del pieces[piece_id]
    ordered = [pieces[k] for k in sorted(pieces)]
    manifest = {"schema": 1, "pieces": ordered}
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n")
    lines = [
        "/** Prepared furniture sizes (width, height, depth; metres, front towards +z). Written by tools/prepare-meshy-furniture.py. */",
        "export const FURNITURE_SIZES = {",
        *[f"  {p['id']}: [{p['size'][0]}, {p['size'][1]}, {p['size'][2]}]," for p in ordered],
        "} as const satisfies Record<string, readonly [number, number, number]>;",
        "",
        "export type FurnitureId = keyof typeof FURNITURE_SIZES;",
        "",
    ]
    SIZES.write_text("\n".join(lines), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    main()
