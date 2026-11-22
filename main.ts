import{readFileSync,readdirSync,mkdirSync,writeFileSync}from'node:fs'
const I=process.env.MAKEFUN_INPUT_DIR??'/input',O=process.env.MAKEFUN_OUTPUT_DIR??'/output'
const T='$5e(*./3########-------)---)---#---#############DHHD$###########),##############((%('
const F=[(a,b)=>(a+b)|0,(a,b)=>(a-b)|0,Math.imul,(a,b)=>(a/b)|0,(a,b)=>b+1?a%b|0:0,(a,b)=>((a>>>0)/(b>>>0))|0,(a,b)=>((a>>>0)%(b>>>0))|0,0,(a,b)=>a&b,(a,b)=>a|b,(a,b)=>a^b,0,(a,b)=>a<<(b&31),(a,b)=>a>>(b&31),(a,b)=>(a>>>(b&31))|0,0,(a,b)=>a==b?1:0,(a,b)=>a<b?1:0,(a,b)=>(a>>>0)<(b>>>0)?1:0]
for(const d of readdirSync(I).sort()){
const P=readFileSync(I+'/'+d+'/program.bin'),B=readFileSync(I+'/'+d+'/input.bin'),n=P.length,D=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),U=new Uint8Array(65536)
let s=0,c=0,p=0,t=0,q=0,o=0,e=0
for(;;){
if(t==1e6){e=10;break}
if(p<0||p>=n){e=9;break}
const y=P[p],k=T.charCodeAt(y)-35
if(!(k>0)){e=5;break}
const j=k-1,i=j>>4,g=(j>>2)&3,h=j&3
if(p+i>=n){e=9;break}
t++
const x=p+1+i
if(s<g){e=2;break}
if(s-g+h>256){e=3;break}
p=x
if(!y){e=0;break}
else if(y==1)D[s++]=(P[x-1]<<24)>>24
else if(y==2)D[s++]=P[x-4]|P[x-3]<<8|P[x-2]<<16|P[x-1]<<24
else if(y==3)s--
else if(y==4){D[s]=D[s-1];s++}
else if(y==5){const z=D[s-1];D[s-1]=D[s-2];D[s-2]=z}
else if(y==6){D[s]=D[s-2];s++}
else if(y==7){const z=D[s-3];D[s-3]=D[s-2];D[s-2]=D[s-1];D[s-1]=z}
else if(y==23||y==27)D[s-1]=y==23?-D[s-1]|0:~D[s-1]
else if(y>15&&y<35){const b=D[s-1],a=D[s-2];if(y>18&&y<23&&!b){e=4;break}s-=2;D[s++]=F[y-16](a,b)}
else if(y>47&&y<52){
if(y==51){if(c==64){e=7;break}C[c++]=x;p=P[x-2]|P[x-1]<<8}
else{const r=(P[x-2]|P[x-1]<<8)<<16>>16;let v=1;if(y!=48){const w=D[--s];v=y==49?w==0:w!=0}if(v)p=x+r}}
else if(y==52){if(!c){e=8;break}p=C[--c]}
else if(y==64){const a=D[s-1];if(a<0||a>255){e=6;break}D[s-1]=M[a]}
else if(y==65){const a=D[s-1],v=D[s-2];if(a<0||a>255){e=6;break}s-=2;M[a]=v}
else if(y==80){const z=''+D[s-1];if(o+z.length>65536){e=11;break}s--;U.set(Buffer.from(z),o);o+=z.length}
else if(y==81){if(o+1>65536){e=11;break}U[o++]=D[--s]&255}
else if(y==82)D[s++]=q<B.length?B[q++]:-1
else{e=D[--s]&255;break}
}
mkdirSync(O+'/'+d,{recursive:true})
writeFileSync(O+'/'+d+'/stdout.bin',U.subarray(0,o))
writeFileSync(O+'/'+d+'/exit.txt',e+'\n')
}
