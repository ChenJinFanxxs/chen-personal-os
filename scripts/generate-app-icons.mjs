import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
// A compact geometric workspace mark, encoded without image-service dependencies.
function crc32(bytes) { let crc = -1; for (const byte of bytes) { crc ^= byte; for (let i=0;i<8;i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1)); } return (crc ^ -1) >>> 0; }
function chunk(name, data) { const type=Buffer.from(name); const size=Buffer.alloc(4);size.writeUInt32BE(data.length); const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([type,data]))); return Buffer.concat([size,type,data,crc]); }
await mkdir('public/icons', {recursive:true});
for (const size of [192,512]) {
  const pixels=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) { const i=y*(size*4+1)+1+x*4; const nx=x/size,ny=y/size; let color=[250,247,242];
    if(nx>.23&&nx<.38&&ny>.24&&ny<.76)color=[183,96,61];
    if(nx>.43&&nx<.77&&ny>.24&&ny<.47)color=[62,72,67];
    if(nx>.43&&nx<.77&&ny>.53&&ny<.76)color=[126,146,121];
    pixels.set([...color,255],i);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(`public/icons/workspace-${size}.png`,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
