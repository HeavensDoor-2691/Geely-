/** 环境贴图优化：PNG → WebP，降到 1024，用于 PBR 反射（体积大幅减小） */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const faces = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
const srcDir = 'src/textures';
const outDir = 'src/textures_opt';
fs.mkdirSync(outDir, { recursive: true });

for (const f of faces) {
  const src = path.join(srcDir, f + '.png');
  const out = path.join(outDir, f + '.webp');
  const meta = await sharp(src).metadata();
  await sharp(src)
    .resize(1024, 1024, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(out);
  const size = (await sharp(src).metadata().then(() => fs.statSync(src).size));
  const osize = fs.statSync(out).size;
  console.log(`${f}: ${meta.width}x${meta.height} png=${(size / 1024).toFixed(0)}KB -> webp=${(osize / 1024).toFixed(0)}KB`);
}
console.log('done ->', outDir);
