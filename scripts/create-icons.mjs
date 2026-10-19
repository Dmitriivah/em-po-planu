import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";

const outputDirectory = new URL("../public/icons/", import.meta.url);
await mkdir(outputDirectory, { recursive: true });

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  crcTable[n] = value >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(name, data) {
  const type = Buffer.from(name);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}

function roundedRectDistance(x, y, left, top, right, bottom, radius) {
  const centerX = (left + right) / 2;
  const centerY = (top + bottom) / 2;
  const halfWidth = (right - left) / 2;
  const halfHeight = (bottom - top) / 2;
  const qx = Math.abs(x - centerX) - (halfWidth - radius);
  const qy = Math.abs(y - centerY) - (halfHeight - radius);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
}

function ellipseDistance(x, y, centerX, centerY, radiusX, radiusY, angle = 0) {
  const dx = x - centerX;
  const dy = y - centerY;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const localX = dx * cosine + dy * sine;
  const localY = -dx * sine + dy * cosine;
  return (localX * localX) / (radiusX * radiusX) + (localY * localY) / (radiusY * radiusY);
}

function createIcon(size, maskable = false) {
  const pixels = Buffer.alloc((size * 4 + 1) * size);
  const scale = size / 512;
  const colorAt = (x, y) => {
    if (!maskable && roundedRectDistance(x, y, 4 * scale, 4 * scale, 508 * scale, 508 * scale, 112 * scale) > 0) return [0, 0, 0, 0];
    if (ellipseDistance(x, y, 256 * scale, 256 * scale, 175 * scale, 175 * scale) <= 1) {
      if (ellipseDistance(x, y, 227 * scale, 254 * scale, 77 * scale, 34 * scale, -0.62) <= 1) return [49, 93, 67, 255];
      if (ellipseDistance(x, y, 287 * scale, 292 * scale, 74 * scale, 33 * scale, -0.62) <= 1) return [107, 142, 96, 255];
      const stemDistance = Math.abs((y - 303 * scale) - 0.56 * (x - 205 * scale)) / Math.sqrt(1 + 0.56 * 0.56);
      if (x > 205 * scale && x < 310 * scale && stemDistance < 5 * scale) return [96, 128, 83, 255];
      return [255, 255, 249, 255];
    }
    return [49, 93, 67, 255];
  };

  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const color = colorAt(x, y);
      const pixel = row + 1 + x * 4;
      pixels[pixel] = color[0];
      pixels[pixel + 1] = color[1];
      pixels[pixel + 2] = color[2];
      pixels[pixel + 3] = color[3];
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

for (const [name, size, maskable] of [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon.png", 180, true],
]) await writeFile(new URL(name, outputDirectory), createIcon(size, maskable));
