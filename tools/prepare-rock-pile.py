"""Prepare the owner-supplied rock pile without changing its geometry or UVs.

Requires Pillow. Source images are re-encoded for a desktop game; normals are
renormalized after filtering and roughness remains textured but never glossy.
The original file is read only. The provenance receipt records byte-level
geometry fidelity and distinguishes source count from texture optimization.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import io
import json
import math
from pathlib import Path
import struct

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "public/models/scenery/weathered-rock-pile-under-20k.glb")
    parser.add_argument("--receipt", type=Path, default=ROOT / "docs/engineering/rock-pile-assets.json")
    args = parser.parse_args()
    raw = args.source.read_bytes()
    magic, version, length = struct.unpack_from("<III", raw)
    if magic != 0x46546C67 or version != 2 or length != len(raw):
        raise ValueError("Source must be a complete GLB 2 file")
    json_size = struct.unpack_from("<I", raw, 12)[0]
    source = json.loads(raw[20:20 + json_size])
    binary = raw[28 + json_size:]
    if any(p.get("mode", 4) != 4 for m in source["meshes"] for p in m["primitives"]):
        raise ValueError("Only source triangle-list meshes are supported")
    triangles = sum(source["accessors"][p.get("indices", p["attributes"]["POSITION"])]["count"] // 3
                    for m in source["meshes"] for p in m["primitives"])
    if triangles >= 20_000:
        raise ValueError(f"The unchanged source has {triangles} triangles; decimation must be reviewed separately")
    packed = copy.deepcopy(source)
    blocks: list[bytes] = []
    views: list[dict] = []
    offset = 0

    def append(data: bytes, original: dict | None = None) -> int:
        nonlocal offset
        view = {**(original or {}), "buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        views.append(view)
        padded = data + bytes((-len(data)) % 4)
        blocks.append(padded)
        offset += len(padded)
        return len(views) - 1

    remap = {}
    geometry_hashes = []
    for accessor in packed["accessors"]:
        original_index = accessor["bufferView"]
        if original_index not in remap:
            view = source["bufferViews"][original_index]
            data = binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]
            remap[original_index] = append(data, view)
            geometry_hashes.append({"sourceBufferView": original_index, "runtimeBufferView": remap[original_index],
                                    "bytes": len(data), "sha256": digest(data)})
        accessor["bufferView"] = remap[original_index]

    def image(index: int) -> Image.Image:
        view = source["bufferViews"][source["images"][index]["bufferView"]]
        return Image.open(io.BytesIO(binary[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]))

    source_material = source["materials"][0]
    old_textures = source["textures"]
    base_index = old_textures[source_material["pbrMetallicRoughness"]["baseColorTexture"]["index"]]["source"]
    normal_index = old_textures[source_material["normalTexture"]["index"]]["source"]
    orm_index = old_textures[source_material["pbrMetallicRoughness"]["metallicRoughnessTexture"]["index"]]["source"]
    base = image(base_index).convert("RGB")
    base.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
    normal = image(normal_index).convert("RGB").resize((1024, 1024), Image.Resampling.LANCZOS)
    pixels = bytearray(normal.tobytes())
    for start in range(0, len(pixels), 3):
        x, y, z = (pixels[start + channel] / 127.5 - 1 for channel in range(3))
        size = math.sqrt(x * x + y * y + z * z)
        if size < 1e-8:
            x, y, z, size = 0, 0, 1, 1
        for channel, value in enumerate((x, y, z)):
            pixels[start + channel] = round((value / size + 1) * 127.5)
    normal = Image.frombytes("RGB", normal.size, bytes(pixels))
    orm = image(orm_index).convert("RGB").resize((512, 512), Image.Resampling.LANCZOS)
    # glTF uses G for roughness and B for metallic. Preserve the source's roughness
    # variation in an explicitly dry-stone range; R is unused neutral occlusion.
    roughness = orm.getchannel("G").point(lambda value: round(255 * (0.82 + 0.16 * value / 255)))
    orm = Image.merge("RGB", (Image.new("L", orm.size, 255), roughness, Image.new("L", orm.size, 0)))
    images = []
    image_records = []
    for name, bitmap, kind in [("Source rock albedo", base, "JPEG"), ("Filtered source rock normals", normal, "PNG"), ("Rough nonmetallic source stone", orm, "PNG")]:
        output = io.BytesIO()
        bitmap.save(output, format=kind, **({"quality": 94, "subsampling": 0, "optimize": True} if kind == "JPEG" else {"optimize": True}))
        data = output.getvalue()
        images.append({"name": name, "bufferView": append(data), "mimeType": "image/jpeg" if kind == "JPEG" else "image/png"})
        image_records.append({"role": name, "size": list(bitmap.size), "bytes": len(data), "sha256": digest(data)})

    packed["images"] = images
    packed["textures"] = [{"source": i, "sampler": 0} for i in range(3)]
    packed["materials"] = [{"name": "Weathered rock pile - rough nonmetallic stone", "doubleSided": True,
        "normalTexture": {"index": 1, "scale": 0.8},
        "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "metallicRoughnessTexture": {"index": 2},
                                 "metallicFactor": 0, "roughnessFactor": 1}}]
    packed["bufferViews"] = views
    packed["buffers"] = [{"byteLength": offset}]
    packed["asset"] = {**packed["asset"], "generator": "Tervain original rock-pile texture preparation; source geometry unchanged"}
    encoded = json.dumps(packed, separators=(",", ":")).encode()
    encoded += b" " * ((-len(encoded)) % 4)
    payload = b"".join(blocks)
    final = struct.pack("<III", 0x46546C67, 2, 28 + len(encoded) + len(payload))
    final += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
    final += struct.pack("<II", len(payload), 0x004E4942) + payload
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(final)
    receipt = {"name": "Weathered Rock Pile", "source": {"filename": args.source.name, "sha256": digest(raw),
               "bytes": len(raw), "triangles": triangles, "authorization": "Owner supplied the GLB and requested this game integration; no general open-content license asserted."},
        "runtime": {"path": str(args.output.relative_to(ROOT)), "sha256": digest(final), "bytes": len(final), "triangles": triangles,
                    "vertices": sum(a["count"] for a in packed["accessors"] if a["type"] == "VEC3" and "min" in a),
                    "geometry": "Original position, normal, UV and index buffer bytes retained exactly; no decimation or geometric deformation.",
                    "textureChanges": "2048px JPEG albedo; normalized 1024px source normal; 512px source roughness in dry-stone range; black unused emissive removed; metallic zero.",
                    "images": image_records, "geometryBufferFidelity": geometry_hashes},
        "reproduce": "python3 tools/prepare-rock-pile.py --source /path/to/Meshy_AI_Rock_Pile_1004134927_texture.glb",
        "verification": "Binary and rendered placement acceptance is recorded separately by the coordinating release review."}
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"sourceTriangles": triangles, "runtimeTriangles": triangles, "sourceBytes": len(raw), "runtimeBytes": len(final), "output": str(args.output)}))


if __name__ == "__main__":
    main()
