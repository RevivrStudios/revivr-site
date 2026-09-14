import fs from 'node:fs';
import { FloatType } from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
const source=fs.readFileSync('public/openspace/assets/retreat/cloud-sky-4k.hdr');
const hdr=new RGBELoader().setDataType(FloatType).parse(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength));
const width=1024,height=512,stepX=hdr.width/width,stepY=hdr.height/height;
const chunks=[Buffer.from(`#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y ${height} +X ${width}\n`)];
for(let y=0;y<height;y++) {
  const row=Buffer.alloc(width*4);
  for(let x=0;x<width;x++) {
    const rgb=[0,0,0];
    for(let dy=0;dy<stepY;dy++)for(let dx=0;dx<stepX;dx++) {
      const offset=((y*stepY+dy)*hdr.width+x*stepX+dx)*4;
      for(let c=0;c<3;c++)rgb[c]+=hdr.data[offset+c]/(stepX*stepY);
    }
    const peak=Math.max(...rgb),exponent=peak>1e-32?Math.floor(Math.log2(peak))+1:0;
    for(let c=0;c<3;c++)row[c*width+x]=peak>1e-32?Math.min(255,Math.floor(rgb[c]*2**(8-exponent))):0;
    row[3*width+x]=peak>1e-32?exponent+128:0;
  }
  chunks.push(Buffer.from([2,2,width>>8,width&255]));
  for(let c=0;c<4;c++)for(let x=0;x<width;x+=128)chunks.push(Buffer.from([128]),row.subarray(c*width+x,c*width+x+128));
}
const result=Buffer.concat(chunks);
const check=new RGBELoader().setDataType(FloatType).parse(result.buffer.slice(result.byteOffset,result.byteOffset+result.byteLength));
if(check.width!==width||check.height!==height||!check.data.every(Number.isFinite))throw Error('Invalid resized panorama');
fs.writeFileSync('public/lookandsay/assets/cloud-sky-1k.hdr',result);
console.log(`Sky: ${(source.length/1e6).toFixed(2)} MB → ${(result.length/1e6).toFixed(2)} MB`);
