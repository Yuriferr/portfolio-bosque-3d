
setTimeout(()=>{
'use strict';
let trip=null,manualAllowed=false;
const root=document.getElementById('oregon-real'),view=root.querySelector('.or-scene'),loading=root.querySelector('.or-loading'),walk=root.querySelector('[data-walk]'),lightSelect=root.querySelector('[data-light]'),status=root.querySelector('[data-status]');
try{
if(!window.THREE)throw Error('Não foi possível carregar o motor 3D. Reabra o cenário com acesso à internet.');
window.dispatchEvent(new CustomEvent('forest-progress',{detail:25}));
const T=window.THREE,scene=new T.Scene(),camera=new T.PerspectiveCamera(65,1,.08,155);
const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,innerWidth<700?1:1.35));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;view.appendChild(renderer.domElement);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t,smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
let seed=7498;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296},rng=(a,b)=>lerp(a,b,rnd());
function hash(x,y){const f=Math.sin(x*127.1+y*311.7)*43758.5453;return f-Math.floor(f)}
function noise(x,y){const a=Math.floor(x),b=Math.floor(y),u=x-a,v=y-b,s=u*u*(3-2*u),t=v*v*(3-2*v);return lerp(lerp(hash(a,b),hash(a+1,b),s),lerp(hash(a,b+1),hash(a+1,b+1),s),t)}
const fbm=(x,y)=>noise(x,y)*.55+noise(x*2.03,y*2.03)*.27+noise(x*4.01,y*4.01)*.12+noise(x*8.07,y*8.07)*.06;
const pathX=z=>Math.sin(z*.047)*2.9+Math.sin(z*.1)*.42;
const riverX=z=>9+Math.sin(z*.056)*2.5;
const cabins=[{x:-6.8,z:-8,w:5.2,d:4.8,a:.12},{x:-13.5,z:-23,w:4.6,d:4.4,a:.32},{x:1.4,z:-33,w:4.8,d:4.7,a:-.16}];
const cabinLocal=(c,x,z)=>{const dx=x-c.x,dz=z-c.z;return {x:Math.cos(c.a)*dx-Math.sin(c.a)*dz,z:Math.sin(c.a)*dx+Math.cos(c.a)*dz};};
const campClear=(x,z,pad=0)=>cabins.some(c=>{const p=cabinLocal(c,x,z);return Math.abs(p.x)<c.w/2+pad&&p.z>-c.d/2-pad&&p.z<c.d/2+2+pad;});
const branchPaths=cabins.map(c=>{const z=c.z+c.d/2+4;return {x1:c.x+Math.sin(c.a)*(c.d/2+3),z1:c.z+Math.cos(c.a)*(c.d/2+3),x2:pathX(z),z2:z};});
function accessDistance(x,z){let nearest=100;for(const p of branchPaths){const dx=p.x2-p.x1,dz=p.z2-p.z1,t=clamp(((x-p.x1)*dx+(z-p.z1)*dz)/(dx*dx+dz*dz),0,1);nearest=Math.min(nearest,Math.hypot(x-p.x1-t*dx,z-p.z1-t*dz));}return nearest;}
const baseHeight=(x,z)=>.27*Math.sin(x*.18+z*.085)+.17*Math.cos(z*.18)+.075*Math.sin(x*.6-z*.11);
function height(x,z){const bed=1-smooth(.6,2.15,Math.abs(x-riverX(z)));return baseHeight(x,z)+.09*(noise(x*1.8,z*1.8)-.5)-bed*.65;}
const obj=new T.Object3D(),col=new T.Color(),up=new T.Vector3(0,1,0),vA=new T.Vector3(),vB=new T.Vector3();
const maxAniso=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
function canvasTexture(c,srgb=true){const t=new T.CanvasTexture(c);t.colorSpace=srgb?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=maxAniso;return t;}
function canvas(size){const c=document.createElement('canvas');c.width=c.height=size;return c;}
// Spatially varying, high-resolution albedo and height fields, with needles and leaf litter.
function surface(kind){const size=kind==='bark'?1024:768,c=canvas(size),ctx=c.getContext('2d'),im=ctx.createImageData(size,size),b=canvas(size),bc=b.getContext('2d'),bi=bc.createImageData(size,size);
for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size;let r,g,bl,h;
if(kind==='bark'){const warp=noise(u*9,v*5)*.8+noise(u*23,v*13)*.14;const phase=u*46+warp;const groove=Math.pow(Math.abs(Math.sin(phase*Math.PI)),.3);const small=noise(u*180,v*38),patch=fbm(u*28,v*19);h=groove*.62+small*.17+patch*.21;const fissure=smooth(.15,.5,groove);r=(48+h*82)*(.55+.45*fissure);g=(41+h*68)*(.55+.45*fissure);bl=(31+h*51)*(.55+.45*fissure);const moss=smooth(.6,.83,noise(u*8,v*7))*smooth(.5,.1,v);r=lerp(r,63,moss*.6);g=lerp(g,77,moss*.6);bl=lerp(bl,35,moss*.6);
}else{const macro=fbm(u*15,v*15),fine=noise(u*310,v*310),grain=rnd();h=macro*.4+fine*.36+grain*.24;const moss=smooth(.49,.7,macro);r=lerp(58+h*57,54+h*33,moss);g=lerp(44+h*46,65+h*42,moss);bl=lerp(28+h*33,32+h*21,moss);}
const i=(y*size+x)*4;im.data[i]=r;im.data[i+1]=g;im.data[i+2]=bl;im.data[i+3]=255;bi.data[i]=bi.data[i+1]=bi.data[i+2]=h*255;bi.data[i+3]=255;}
ctx.putImageData(im,0,0);bc.putImageData(bi,0,0);
if(kind==='ground'){for(let i=0;i<7500;i++){const x=rnd()*size,y=rnd()*size,a=rnd()*6.28,l=rng(2,12);ctx.strokeStyle=`rgba(${Math.floor(rng(70,145))},${Math.floor(rng(48,94))},${Math.floor(rng(27,52))},.65)`;ctx.lineWidth=rng(.5,1.1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ctx.stroke();}for(let i=0;i<2500;i++){ctx.fillStyle=`rgba(25,24,15,${rng(.1,.3)})`;ctx.beginPath();ctx.ellipse(rnd()*size,rnd()*size,rng(.5,2),rng(.5,1.6),rnd()*6,0,6.28);ctx.fill();}}
const map=canvasTexture(c),bump=canvasTexture(b,false);map.wrapS=map.wrapT=bump.wrapS=bump.wrapT=T.RepeatWrapping;return {map,bump};}
window.dispatchEvent(new CustomEvent('forest-progress',{detail:38}));
const groundTex=surface('ground'),barkTex=surface('bark');
groundTex.map.repeat.set(52,64);groundTex.bump.repeat.copy(groundTex.map.repeat);barkTex.map.repeat.set(2.5,6);barkTex.bump.repeat.copy(barkTex.map.repeat);
const groundGeo=new T.PlaneGeometry(130,165,240,290);groundGeo.rotateX(-Math.PI/2);groundGeo.translate(0,0,-40);const gp=groundGeo.attributes.position,gc=[];
for(let i=0;i<gp.count;i++){const x=gp.getX(i),z=gp.getZ(i),d=Math.min(Math.abs(x-pathX(z)),accessDistance(x,z)),n=noise(x*.65,z*.65);gp.setY(i,height(x,z));const trail=campClear(x,z,.7)?1:1-smooth(.55,1.6+n*.5,d);col.set(0x6a7550).lerp(new T.Color(0xc1ab89),trail);col.multiplyScalar(.8+.35*noise(x*.32,z*.32));gc.push(col.r,col.g,col.b);}
groundGeo.setAttribute('color',new T.Float32BufferAttribute(gc,3));groundGeo.computeVertexNormals();
const groundMat=new T.MeshStandardMaterial({map:groundTex.map,bumpMap:groundTex.bump,bumpScale:.09,vertexColors:true,roughness:.96});
groundMat.onBeforeCompile=s=>{s.vertexShader='varying vec3 groundPoint;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ngroundPoint=position;');s.fragmentShader='varying vec3 groundPoint;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
float pathCenter=sin(groundPoint.z*.047)*2.9+sin(groundPoint.z*.1)*.42;
float worn=1.-smoothstep(.5,1.65,abs(groundPoint.x-pathCenter));
float earth=dot(diffuseColor.rgb,vec3(.33,.45,.22));
diffuseColor.rgb=mix(diffuseColor.rgb,earth*vec3(1.2,.87,.57),worn*.9);
`);};
const ground=new T.Mesh(groundGeo,groundMat);ground.receiveShadow=true;scene.add(ground);
const hemi=new T.HemisphereLight(0xc1d9ed,0x343323,1.4);scene.add(hemi);
const sun=new T.DirectionalLight(0xffdfac,3.25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-31,right:31,top:34,bottom:-34,near:.5,far:130});sun.shadow.bias=-.00012;sun.shadow.normalBias=.028;sun.shadow.radius=2.2;scene.add(sun,sun.target);
const bounce=new T.DirectionalLight(0x9ead8c,.26);bounce.position.set(5,3,12);scene.add(bounce);
// The sky also supplies a broad, soft reflection source for damp soil and water.
const skyCanvas=canvas(256),skyCtx=skyCanvas.getContext('2d'),skyGradient=skyCtx.createLinearGradient(0,0,0,256);skyGradient.addColorStop(0,'#799cac');skyGradient.addColorStop(.45,'#c1cbbb');skyGradient.addColorStop(.52,'#576750');skyGradient.addColorStop(1,'#282a1a');skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,256,256);const skyTexture=canvasTexture(skyCanvas);skyTexture.mapping=T.EquirectangularReflectionMapping;const pmrem=new T.PMREMGenerator(renderer);const env=pmrem.fromEquirectangular(skyTexture);scene.environment=env.texture;pmrem.dispose();skyTexture.dispose();
const barkMat=new T.MeshStandardMaterial({map:barkTex.map,bumpMap:barkTex.bump,bumpScale:.14,roughness:.96,envMapIntensity:.12});
const trunkGeo=new T.CylinderGeometry(.15,1,1,24,20);trunkGeo.translate(0,.5,0);const tp=trunkGeo.attributes.position;
for(let i=0;i<tp.count;i++){let x=tp.getX(i),y=tp.getY(i),z=tp.getZ(i);const a=Math.atan2(z,x),ridge=1+.065*Math.sin(a*11)+.035*Math.sin(a*19+y*18);const flare=1+.4*Math.exp(-y*28);x=x*ridge*flare+.14*Math.sin(y*4)*y;z=z*ridge*flare+.07*Math.sin(y*8)*y;tp.setXYZ(i,x,y,z);}trunkGeo.computeVertexNormals();
// An alpha-tested conifer spray: woody rachis, twigs and hundreds of individual needles.
const needleCanvas=canvas(512),nc=needleCanvas.getContext('2d');
function line(ctx,x,y,xx,yy,c,w){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();}
line(nc,252,499,256,22,'#6c6850',4);
for(let k=0;k<22;k++){const yy=465-k*19,spread=(1-k/23)*183+13;for(const side of [-1,1]){const ex=256+side*spread,ey=yy-rng(35,71);line(nc,254,yy,ex,ey,'#6a704d',1.8);for(let j=0;j<34;j++){const t=j/34,x=lerp(254,ex,t),y=lerp(yy,ey,t);for(const s of [-1,1]){const len=rng(9,22)*(1-t*.42),a=side*.6+s*.86;const green=Math.floor(rng(80,148));line(nc,x,y,x+Math.sin(a)*len,y-Math.cos(a)*len,`rgb(${Math.floor(green*.67)},${green},${Math.floor(green*.53)})`,rng(1.1,2.1));}}}}
const needleTex=canvasTexture(needleCanvas);const needleMat=new T.MeshStandardMaterial({map:needleTex,alphaTest:.34,side:T.DoubleSide,roughness:.87,envMapIntensity:.25});
const cardGeo=new T.PlaneGeometry(1,1);cardGeo.rotateX(-Math.PI/2);cardGeo.translate(0,0,-.48);
window.dispatchEvent(new CustomEvent('forest-progress',{detail:53}));
const trees=[];for(let i=0;i<230;i++){const x=rng(-56,56),z=rng(-113,35);if(Math.abs(x-pathX(z))<3.2||Math.abs(x-riverX(z))<2.8||Math.hypot(x-pathX(15),z-15)<7||campClear(x,z,3.5)||accessDistance(x,z)<2){i--;continue;}if(trees.some(t=>Math.hypot(t.x-x,t.z-z)<2.4)){i--;continue;}trees.push({x,z,h:rng(20,35),r:rng(.34,.68),rot:rnd()*6.28});}
trees.push({x:-4.1,z:9,h:33,r:.82,rot:.8},{x:5.5,z:3,h:31,r:.73,rot:2},{x:-17,z:-8,h:34,r:.94,rot:1});
const trunks=new T.InstancedMesh(trunkGeo,barkMat,trees.length);trunks.castShadow=trunks.receiveShadow=true;
const crownLayers=12,boughsPerLayer=7,spraysPerBough=8;
const branchGeo=new T.CylinderGeometry(.018,.075,1,5);branchGeo.translate(0,.5,0);const branches=new T.InstancedMesh(branchGeo,barkMat,trees.length*(crownLayers*boughsPerLayer*3+3));branches.castShadow=branches.receiveShadow=true;
const foliage=new T.InstancedMesh(cardGeo,needleMat,trees.length*crownLayers*boughsPerLayer*spraysPerBough);foliage.castShadow=foliage.receiveShadow=true;foliage.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:needleTex,alphaTest:.34,side:T.DoubleSide});
let bi=0,fi=0;
function branch(a,b,r=1){vA.copy(b).sub(a);obj.position.copy(a);obj.quaternion.setFromUnitVectors(up,vA.clone().normalize());obj.scale.set(r,vA.length(),r);obj.updateMatrix();branches.setMatrixAt(bi++,obj.matrix);}
trees.forEach((t,i)=>{const y=height(t.x,t.z);obj.position.set(t.x,y-.05,t.z);obj.rotation.set(0,t.rot,0);obj.scale.set(t.r,t.h,t.r);obj.updateMatrix();trunks.setMatrixAt(i,obj.matrix);trunks.setColorAt(i,col.setHSL(.085,rng(.06,.15),rng(.61,.82)));
for(let k=0;k<crownLayers;k++){const f=k/crownLayers,level=t.h*(.25+f*.7)+rng(-.45,.45),radius=(1-f)*rng(3.5,4.9)+.5;for(let j=0;j<boughsPerLayer;j++){const a=j*Math.PI*2/boughsPerLayer+k*2.41+t.rot+rng(-.12,.12),cs=Math.cos(a),sn=Math.sin(a),len=radius*rng(.8,1.17),start=new T.Vector3(t.x,y+level+rng(-.25,.25),t.z),end=new T.Vector3(t.x+cs*len,y+level-.45+f*.65,t.z+sn*len);branch(start,end,(1-f)*.9+.15);
// Lateral forks support overlapping sprays and give each bough real volume.
const forks=[];
for(const side of [-1,1]){const base=start.clone().lerp(end,rng(.4,.58)),angle=a+side*rng(.48,.8),reach=len*rng(.36,.52),tip=base.clone().add(new T.Vector3(Math.cos(angle)*reach,rng(-.18,.24),Math.sin(angle)*reach));branch(base,tip,(1-f)*.42+.08);forks.push({base,tip,angle});}
for(let q=0;q<spraysPerBough;q++){const fork=q>=4?forks[q%2]:null,u=fork?(q<6?.45:.9):(q+.6)/4,angle=fork?fork.angle:a;obj.position.copy(fork?fork.base:start).lerp(fork?fork.tip:end,u);obj.position.y+=rng(-.2,.28);obj.rotation.set(rng(-.4,.4),-angle-Math.PI/2+rng(-.3,.3),rng(-.42,.42));const s=(1-f*.55)*rng(1.12,1.62);obj.scale.set(s*1.25,s,s*1.8);obj.updateMatrix();foliage.setMatrixAt(fi,obj.matrix);foliage.setColorAt(fi++,col.setHSL(rng(.23,.3),rng(.06,.2),rng(.65,.88)));}
}}
// Broken lower limbs leave the forest open at walking height.
for(let j=0;j<3;j++){const a=rnd()*6.28,level=rng(2.8,6);branch(new T.Vector3(t.x,y+level,t.z),new T.Vector3(t.x+Math.cos(a)*rng(.4,1.2),y+level+.13,t.z+Math.sin(a)*rng(.4,1.2)),.65);}
});branches.count=bi;foliage.count=fi;scene.add(trunks,branches,foliage);
// Buttress roots sit in the soil rather than ending in a straight cylinder.
const roots=new T.InstancedMesh(new T.CylinderGeometry(.02,.17,1,7),barkMat,trees.length*4);let ri=0;
for(const t of trees)for(let j=0;j<4;j++){const a=j*Math.PI/2+t.rot;vA.set(t.x+Math.cos(a)*t.r*.3,height(t.x,t.z)+.42,t.z+Math.sin(a)*t.r*.3);vB.set(t.x+Math.cos(a)*t.r*2.4,height(t.x+Math.cos(a)*t.r*2.4,t.z+Math.sin(a)*t.r*2.4)-.07,t.z+Math.sin(a)*t.r*2.4);obj.position.copy(vA).add(vB).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(up,vA.clone().sub(vB).normalize());obj.scale.set(t.r*1.8,vA.distanceTo(vB),t.r*1.8);obj.updateMatrix();roots.setMatrixAt(ri++,obj.matrix);}roots.castShadow=roots.receiveShadow=true;scene.add(roots);
// Curved grass blades have actual thickness in their silhouette and a dark base.
function grassGeometry(){const p=[],c=[],idx=[];for(let j=0;j<10;j++){const a=j*2.4,xx=Math.cos(a)*rng(.015,.17),zz=Math.sin(a)*rng(.015,.17),h=rng(.09,.3),bend=rng(.04,.17),w=rng(.012,.022),ca=Math.cos(a),sa=Math.sin(a),base=p.length/3;for(let k=0;k<=3;k++){const t=k/3,width=w*(1-t)*.5;for(const side of [-1,1]){p.push(xx+ca*bend*t*t+sa*width*side,h*t,zz+sa*bend*t*t-ca*width*side);col.set(0x324323).lerp(new T.Color(0x98a962),t*.84);c.push(col.r,col.g,col.b);}if(k<3){const b=base+k*2;idx.push(b,b+1,b+2,b+1,b+3,b+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.setIndex(idx);g.computeVertexNormals();return g;}
const windUniform={value:0};
function plantMaterial(options){const m=new T.MeshStandardMaterial({...options,side:T.DoubleSide,roughness:.92,envMapIntensity:.24});m.onBeforeCompile=s=>{s.uniforms.forestTime=windUniform;s.vertexShader='uniform float forestTime;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
vec3 origin=vec3(0.0);
#ifdef USE_INSTANCING
origin=instanceMatrix[3].xyz;
#endif
float sway=sin(forestTime*1.3+origin.x*.8+origin.z*.4)*.014+sin(forestTime*.7+origin.z)*.009;
transformed.x+=sway*position.y*position.y;
`);};return m;}
window.dispatchEvent(new CustomEvent('forest-progress',{detail:68}));
const grass=new T.InstancedMesh(grassGeometry(),plantMaterial({vertexColors:true}),44000);grass.receiveShadow=true;
let gi=0;for(let i=0;i<76000&&gi<44000;i++){const z=rng(-99,30),x=i%4!==0?pathX(z)+(rnd()<.5?-1:1)*rng(1.15,6.8):rng(-29,29),d=Math.abs(x-pathX(z));if(d<.92||Math.abs(x-riverX(z))<1.75)continue;if(d<1.55&&rnd()<.7)continue;if(noise(x*.27,z*.27)<.26)continue;obj.position.set(x,height(x,z)-.015,z);obj.rotation.set(rng(-.05,.05),rnd()*6.28,rng(-.05,.05));const scale=rng(.5,1.3);obj.scale.set(scale,rng(.55,1.25),scale);obj.updateMatrix();grass.setMatrixAt(gi,obj.matrix);grass.setColorAt(gi++,col.setHSL(rng(.16,.23),rng(.12,.24),rng(.65,.88)));}grass.count=gi;scene.add(grass);
// Fine leaflets bend away from the central stem instead of forming rigid triangles.
function fernGeometry(){const p=[],c=[];const triangle=(a,b,d,t)=>{p.push(...a,...b,...d);col.set(0x284520).lerp(new T.Color(0x779942),t);for(let i=0;i<3;i++)c.push(col.r,col.g,col.b);};for(let fr=0;fr<8;fr++){const angle=fr*.7854+rng(-.16,.16),ca=Math.cos(angle),sa=Math.sin(angle),length=rng(.62,1.0),lift=rng(.48,.8);const point=(t,s)=>[ca*t*length-sa*s,Math.sin(t*2.25)*lift-Math.abs(s)*.35,sa*t*length+ca*s];for(let k=1;k<22;k++){const t=k/23,w=.115*Math.pow(Math.sin(t*Math.PI),.8);for(const sign of [-1,1]){const a=point(t-.018,0),b=point(t+.03,w*sign*.55),tip=point(t+.073,w*sign),d=point(t+.049,w*sign*.57),e=point(t+.022,0);triangle(a,b,d,t*.5);triangle(b,tip,d,t*.7);triangle(a,d,e,t*.5);}triangle(point(t-.042,-.004),point(t+.012,0),point(t-.042,.004),.3);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('color',new T.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;}
const ferns=new T.InstancedMesh(fernGeometry(),plantMaterial({vertexColors:true}),800);ferns.receiveShadow=true;ferns.castShadow=true;let fni=0;
for(let i=0;i<1600&&fni<800;i++){const z=rng(-102,26),x=i%2===0?pathX(z)+(rnd()<.5?-1:1)*rng(1.8,7):rng(-32,32);if(Math.abs(x-riverX(z))<1.9||Math.abs(x-pathX(z))<1.6)continue;obj.position.set(x,height(x,z),z);obj.rotation.set(0,rnd()*6.28,0);const s=rng(.45,1.2);obj.scale.set(s,s,s);obj.updateMatrix();ferns.setMatrixAt(fni,obj.matrix);ferns.setColorAt(fni++,col.setHSL(.19,rng(.08,.2),rng(.62,.88)));}ferns.count=fni;scene.add(ferns);
const rockG=new T.IcosahedronGeometry(1,2),rp=rockG.attributes.position;for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),s=.82+.24*noise(x*3+z*2,y*4);rp.setXYZ(i,x*s,y*s,z*s);}rockG.computeVertexNormals();
const rockTex=groundTex.map.clone();rockTex.repeat.set(1.5,1.5);const rockBump=groundTex.bump.clone();rockBump.repeat.set(1.5,1.5);const rockM=new T.MeshStandardMaterial({map:rockTex,bumpMap:rockBump,bumpScale:.12,color:0xaeb4a7,roughness:.91});
const rocks=new T.InstancedMesh(rockG,rockM,420);rocks.castShadow=rocks.receiveShadow=true;const colliders=trees.map(t=>({x:t.x,z:t.z,r:t.r*1.22+.25}));
for(let i=0;i<420;i++){const z=rng(-110,29),x=i<290?riverX(z)+(rnd()<.5?-1:1)*rng(1.15,2.4):rng(-28,28),s=i<290?rng(.12,.65):rng(.07,.4);obj.position.set(x,height(x,z)-.03,z);obj.rotation.set(rnd()*3,rnd()*6.28,rnd()*3);obj.scale.set(s*1.4,s*.68,s);obj.updateMatrix();rocks.setMatrixAt(i,obj.matrix);rocks.setColorAt(i,col.setHSL(.15,.08,rng(.53,.8)));if(s>.45)colliders.push({x,z,r:s*.7+.2});}scene.add(rocks);
// Tiny leaf litter remains visible near the path without becoming a repeating carpet.
const leafGeo=new T.PlaneGeometry(.045,.115,2,4);leafGeo.rotateX(-Math.PI/2);const lp=leafGeo.attributes.position;for(let i=0;i<lp.count;i++){const x=lp.getX(i),z=lp.getZ(i),t=clamp(Math.abs(z)/.0575,0,1);lp.setX(i,x*Math.pow(1-t,.65));lp.setY(i,.009*Math.cos(z*40)+Math.abs(x)*.22);}leafGeo.computeVertexNormals();
const litter=new T.InstancedMesh(leafGeo,new T.MeshStandardMaterial({color:0x7b6040,side:T.DoubleSide,roughness:1}),2800);litter.receiveShadow=true;for(let i=0;i<2800;i++){const z=rng(-99,29),x=pathX(z)+rng(-4,4);obj.position.set(x,height(x,z)+.014,z);obj.rotation.set(0,rnd()*6.28,0);const s=rng(.5,1.3);obj.scale.set(s,s,s);obj.updateMatrix();litter.setMatrixAt(i,obj.matrix);litter.setColorAt(i,col.setHSL(.07,.25,rng(.4,.73)));}scene.add(litter);
// Moss-covered fallen wood and visible end grain.
const endCanvas=canvas(256),ec=endCanvas.getContext('2d');ec.fillStyle='#a58c64';ec.fillRect(0,0,256,256);for(let r=4;r<126;r+=rng(2,5)){ec.strokeStyle=`rgba(63,42,21,${rng(.1,.4)})`;ec.lineWidth=rng(.7,1.5);ec.beginPath();ec.ellipse(123,130,r,r*rng(.93,1.03),0,0,6.28);ec.stroke();}const endMat=new T.MeshStandardMaterial({map:canvasTexture(endCanvas),roughness:1});
function log(x,z,len,angle){const group=new T.Group(),body=new T.Mesh(new T.CylinderGeometry(.3,.39,len,20,8),barkMat);body.rotation.z=Math.PI/2;body.castShadow=body.receiveShadow=true;group.add(body);const cap=new T.Mesh(new T.CircleGeometry(.292,24),endMat);cap.rotation.y=Math.PI/2;cap.position.x=len/2+.006;group.add(cap);const moss=new T.Mesh(new T.CylinderGeometry(.31,.4,len*.89,18,5,true,0,Math.PI*.87),new T.MeshStandardMaterial({map:rockTex,bumpMap:rockBump,bumpScale:.055,color:0x687b39,roughness:1}));moss.rotation.z=Math.PI/2;moss.rotation.x=Math.PI*.07;moss.position.y=.015;moss.receiveShadow=true;group.add(moss);group.position.set(x,height(x,z)+.3,z);group.rotation.y=angle;scene.add(group);for(let t=-len/2;t<=len/2;t+=.4)colliders.push({x:x+Math.cos(angle)*t,z:z-Math.sin(angle)*t,r:.45});}
log(-16,2,5,-.5);log(13,-29,6,.65);log(-8,-40,7,.9);
// Clear cabin foundations, porches and connecting footpaths without changing the forest elsewhere.
for(const mesh of [grass,ferns,rocks]){const matrix=new T.Matrix4(),point=new T.Vector3();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);point.setFromMatrixPosition(matrix);if(campClear(point.x,point.z,.5)||accessDistance(point.x,point.z)<.95){matrix.scale(new T.Vector3(0,0,0));mesh.setMatrixAt(i,matrix);}}mesh.instanceMatrix.needsUpdate=true;}
for(let i=colliders.length-1;i>=0;i--)if(campClear(colliders[i].x,colliders[i].z,.6)||accessDistance(colliders[i].x,colliders[i].z)<1)colliders.splice(i,1);
// Cedar siding: continuous wood grain, small knots and a restrained weathered finish.
const cedarCanvas=canvas(512),cc=cedarCanvas.getContext('2d'),cedarImage=cc.createImageData(512,512);
for(let y=0;y<512;y++)for(let x=0;x<512;x++){const u=x/512,v=y/512,warp=noise(u*6,v*7)*1.5,grain=Math.sin((v*140+warp)*6.28)*.08,shade=fbm(u*7,v*18)*.35+grain+rnd()*.07;const i=(y*512+x)*4;cedarImage.data[i]=112+shade*90;cedarImage.data[i+1]=76+shade*70;cedarImage.data[i+2]=43+shade*48;cedarImage.data[i+3]=255;}cc.putImageData(cedarImage,0,0);
for(let i=0;i<14;i++){const x=rng(15,497),y=rng(15,497);for(let r=2;r<15;r+=2){cc.strokeStyle='rgba(63,38,19,.2)';cc.lineWidth=.7;cc.beginPath();cc.ellipse(x,y,r*2.3,r,0,0,6.28);cc.stroke();}}
const cedar=canvasTexture(cedarCanvas);cedar.wrapS=cedar.wrapT=T.RepeatWrapping;const cedarBump=canvasTexture(cedarCanvas,false);cedarBump.wrapS=cedarBump.wrapT=T.RepeatWrapping;
const timberMat=new T.MeshStandardMaterial({map:cedar,bumpMap:cedarBump,bumpScale:.026,roughness:.88,envMapIntensity:.2});
const trimMat=new T.MeshStandardMaterial({map:cedar,color:0x6b4930,bumpMap:cedarBump,bumpScale:.02,roughness:.9});
const roofMat=new T.MeshStandardMaterial({map:cedar,color:0x536052,bumpMap:cedarBump,bumpScale:.05,roughness:.98});
const ironMat=new T.MeshStandardMaterial({color:0x292c29,metalness:.65,roughness:.63});
const glassMat=new T.MeshStandardMaterial({color:0xe3b771,emissive:0xffbc68,emissiveIntensity:.7,roughness:.32,metalness:.05});
const bulbMat=new T.MeshStandardMaterial({color:0xffe1a3,emissive:0xffb957,emissiveIntensity:2.3,roughness:.4});
const campBatches=new Map(),unitBox=new T.BoxGeometry(1,1,1),unitLog=new T.CylinderGeometry(1,1,1,12),unitBall=new T.SphereGeometry(1,10,7),campRects=[],campLights=[];
const campObject=new T.Object3D(),campMatrix=new T.Matrix4();
function piece(parent,name,geo,material,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0,tint=null){let b=campBatches.get(name);if(!b){b={geo,material,matrices:[],colors:[]};campBatches.set(name,b);}campObject.position.set(x,y,z);campObject.rotation.set(rx,ry,rz);campObject.scale.set(sx,sy,sz);campObject.updateMatrix();campMatrix.multiplyMatrices(parent,campObject.matrix);b.matrices.push(campMatrix.clone());b.colors.push(new T.Color(tint||0xffffff));}
function localWorld(c,x,z){return {x:c.x+Math.cos(c.a)*x+Math.sin(c.a)*z,z:c.z-Math.sin(c.a)*x+Math.cos(c.a)*z};}
function addRect(c,x,z,hw,hd){const p=localWorld(c,x,z);campRects.push({x:p.x,z:p.z,a:c.a,hw,hd});}
function lamp(parent,x,y,z){piece(parent,'iron',unitBox,ironMat,x,y+.2,z,.25,.055,.25);piece(parent,'iron',unitBox,ironMat,x,y-.2,z,.2,.045,.2);piece(parent,'bulbs',unitBall,bulbMat,x,y,z,.064,.14,.064);for(const a of [-1,1])for(const b of [-1,1])piece(parent,'iron',unitBox,ironMat,x+a*.085,y,z+b*.085,.018,.4,.018);const p=new T.Vector3(x,y,z).applyMatrix4(parent);const l=new T.PointLight(0xffbf7b,7,4.4,2);l.position.copy(p);scene.add(l);campLights.push(l);}
for(const [index,c] of cabins.entries()){
 const cornerYs=[];for(const x of [-c.w/2,c.w/2])for(const z of [-c.d/2,c.d/2+2]){const p=localWorld(c,x,z);cornerYs.push(height(p.x,p.z));}c.floor=Math.max(...cornerYs)+.22;
 const transform=new T.Matrix4().compose(new T.Vector3(c.x,c.floor,c.z),new T.Quaternion().setFromAxisAngle(up,c.a),new T.Vector3(1,1,1)),box=(name,mat,x,y,z,w,h,d,rx=0,ry=0,rz=0,tint=null)=>piece(transform,name,unitBox,mat,x,y,z,w,h,d,rx,ry,rz,tint);
 const front=c.d/2,eave=2.8,rise=1.48,half=c.w/2+.4,roofSlope=Math.atan(rise/half),roofLen=Math.hypot(half,rise);
 // Stone piers and separate deck boards avoid a floating, monolithic foundation.
 for(const x of [-c.w/2+.3,c.w/2-.3])for(const z of [-front+.3,front+1.45])box('piers',rockM,x,-.3,z,.47,.72,.47);
 for(let z=-front;z<front+1.8;z+=.2)box('wood',timberMat,0,-.055,z,c.w+.3,.11,.19,0,0,0,0xc9b18e);
 for(let row=0;row<13;row++){const y=.18+row*.207,shade=new T.Color().setHSL(.075,.23,.64+(row%4)*.045);
  for(const z of [-front,front])piece(transform,'logs',unitLog,timberMat,0,y,z,.128,c.w+.28,.128,0,0,Math.PI/2,shade);
  for(const x of [-c.w/2,c.w/2])piece(transform,'logs',unitLog,timberMat,x,y,0,.128,c.d+.34,.128,Math.PI/2,0,0,shade);
 }
 for(const z of [-front,front])for(let row=0;row<8;row++){const yy=row*.19,width=c.w*(1-yy/rise);box('wood',timberMat,0,eave+yy,z,Math.max(.08,width),.18,.12);}
 // Individual cedar shakes follow both roof pitches, with staggered joints.
 for(const side of [-1,1]){box('roof',roofMat,side*half*.5,eave+rise*.5,0,roofLen,.1,c.d+.95,0,0,-side*roofSlope);
  for(let row=0;row<8;row++){const t=(row+.5)/8;for(let j=0;j<18;j++){const zz=-(c.d+.85)/2+(j+.5)*(c.d+.85)/18;box('roof',roofMat,side*half*t,eave+rise*(1-t)+.065,zz,roofLen/8+.05,.055,(c.d+.85)/18-.008,0,0,-side*roofSlope,new T.Color().setHSL(.13,.05,rng(.55,.87)));}}
  for(const zz of [-front-.49,front+.49])box('trim',trimMat,side*half*.5,eave+rise*.5,zz,roofLen+.08,.16,.12,0,0,-side*roofSlope);
 }
 box('trim',trimMat,0,eave+rise+.09,0,.15,.14,c.d+1.05);
 // Covered veranda, upright posts, rails and an open central approach.
 const porchZ=front+1;box('roof',roofMat,0,2.62,porchZ,c.w+.7,.13,2.3,.13);
 for(const x of [-c.w/2+.05,c.w/2-.05]){box('trim',trimMat,x,1.27,front+1.72,.14,2.65,.14);box('trim',trimMat,x,.87,porchZ,.095,.1,1.7);for(let z=front+.25;z<front+1.72;z+=.32)box('trim',trimMat,x,.46,z,.05,.78,.05);addRect(c,x,porchZ,.09,.95);}
 box('trim',trimMat,0,2.5,front+1.74,c.w+.22,.17,.16);
 for(let s=0;s<3;s++)box('wood',timberMat,0,-.11-s*.1,front+1.96+s*.25,1.6,.1,.3);
 // Closed plank door, metal handle, and warm divided-light windows.
 for(let j=0;j<6;j++)box('trim',trimMat,-.69+(j-2.5)*.17,1.04,front+.15,.16,2.04,.075);
 box('wood',timberMat,-.69,2.12,front+.2,1.15,.12,.11);for(const x of [-1.25,-.13])box('wood',timberMat,x,1.06,front+.2,.1,2.2,.12);
 box('iron',ironMat,-.34,1.02,front+.23,.035,.17,.045);
 function windowUnit(x,y,z,rotation=0){const wm=new T.Matrix4().multiplyMatrices(transform,new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromAxisAngle(up,rotation),new T.Vector3(1,1,1)));piece(wm,'glass',unitBox,glassMat,0,0,0,1.03,.93,.035);for(const xx of [-.57,.57])piece(wm,'trim',unitBox,trimMat,xx,0,.035,.09,1.12,.12);for(const yy of [-.52,.52])piece(wm,'trim',unitBox,trimMat,0,yy,.035,1.23,.09,.12);piece(wm,'trim',unitBox,trimMat,0,0,.065,.045,.98,.09);piece(wm,'trim',unitBox,trimMat,0,0,.065,1.1,.045,.09);piece(wm,'wood',unitBox,timberMat,0,-.57,.08,1.3,.085,.25);}
 windowUnit(1.13,1.55,front+.15);windowUnit(c.w/2+.15,1.55,-.45,Math.PI/2);windowUnit(-c.w/2-.15,1.55,-.45,-Math.PI/2);
 lamp(transform,-1.63,1.95,front+.42);
 // Chimney, stacked firewood and a small bench on the porch.
 box('piers',rockM,-1.15,3.73,-.7,.57,1.45,.62);box('iron',ironMat,-1.15,4.49,-.7,.7,.08,.76);
 box('wood',timberMat,1.13,.45,front+.92,1.3,.09,.42);for(const x of [.65,1.61])box('trim',trimMat,x,.2,front+.92,.09,.45,.3);addRect(c,1.13,front+.92,.76,.3);
 for(let row=0;row<3;row++)for(let j=0;j<5-row;j++)piece(transform,'logs',unitLog,timberMat,-c.w/2-.35,.13+row*.21,-1+j*.23,.095,.65,.095,0,0,Math.PI/2);
 addRect(c,0,0,c.w/2+.23,c.d/2+.23);
}
// Shared picnic tables and a simple timber sign make the cabins read as one campground.
function picnic(x,z,a){const c={x,z,a},matrix=new T.Matrix4().compose(new T.Vector3(x,height(x,z),z),new T.Quaternion().setFromAxisAngle(up,a),new T.Vector3(1,1,1));for(let j=0;j<5;j++)piece(matrix,'wood',unitBox,timberMat,0,.78,(j-2)*.16,2.1,.09,.15);for(const side of [-1,1]){piece(matrix,'wood',unitBox,timberMat,0,.42,side*.7,2.25,.085,.29);for(const xx of [-.75,.75]){piece(matrix,'trim',unitBox,trimMat,xx,.38,side*.31,.11,.84,.11,side*.42);piece(matrix,'trim',unitBox,trimMat,xx,.25,side*.7,.09,.44,.09);}}addRect(c,0,0,1.28,.98);}
picnic(-7.2,-17,.2);picnic(-12,1,-.2);
const signRoot=new T.Matrix4().makeTranslation(-2.6,height(-2.6,1),1);piece(signRoot,'trim',unitBox,trimMat,0,.8,0,.12,1.6,.12);piece(signRoot,'wood',unitBox,timberMat,0,1.45,0,1.8,.52,.11);
const signCanvas=document.createElement('canvas');signCanvas.width=512;signCanvas.height=160;const sc=signCanvas.getContext('2d');sc.fillStyle='#cdbb93';sc.font='500 35px Georgia';sc.textAlign='center';sc.fillText('YURI FERNANDES',256,67);sc.font='24px Georgia';sc.fillText('IDEIAS EM MOVIMENTO',256,110);const signMesh=new T.Mesh(new T.PlaneGeometry(1.65,.48),new T.MeshStandardMaterial({map:canvasTexture(signCanvas),transparent:true,roughness:1,depthWrite:false}));signMesh.position.set(-2.6,height(-2.6,1)+1.45,1.065);scene.add(signMesh);colliders.push({x:-2.6,z:1,r:.3});
for(const batch of campBatches.values()){const mesh=new T.InstancedMesh(batch.geo,batch.material,batch.matrices.length);batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);mesh.setColorAt(i,batch.colors[i]);});mesh.castShadow=batch.material!==glassMat&&batch.material!==bulbMat;mesh.receiveShadow=true;scene.add(mesh);}
function walkingHeight(x,z){let y=height(x,z);for(const c of cabins){const p=cabinLocal(c,x,z);if(Math.abs(p.x)<c.w/2+.13&&p.z>c.d/2+.23&&p.z<c.d/2+1.85)y=Math.max(y,c.floor);if(Math.abs(p.x)<.8&&p.z>=c.d/2+1.85&&p.z<c.d/2+2.6){const step=Math.floor((p.z-c.d/2-1.85)/.25);y=Math.max(y,c.floor-.06-step*.1);}}return y;}
// A shallow, reflective stream follows the lowered riverbed.
const wp=[],wi=[],wu=[];for(let i=0;i<=260;i++){const z=32-i*.59,x=riverX(z),y=baseHeight(x,z)-.25;wp.push(x-1.23,y,z,x+1.23,y,z);wu.push(0,i*.22,1,i*.22);if(i<260){const a=i*2;wi.push(a,a+2,a+1,a+1,a+2,a+3);}}const waterG=new T.BufferGeometry();waterG.setAttribute('position',new T.Float32BufferAttribute(wp,3));waterG.setAttribute('uv',new T.Float32BufferAttribute(wu,2));waterG.setIndex(wi);waterG.computeVertexNormals();
const rippleC=canvas(256),rc=rippleC.getContext('2d'),rip=rc.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const v=(Math.sin(y*.35+Math.sin(x*.08)*2)+Math.sin(y*.14+x*.13))*.22+.5,i=(y*256+x)*4;rip.data[i]=rip.data[i+1]=rip.data[i+2]=v*255;rip.data[i+3]=255;}rc.putImageData(rip,0,0);const ripple=canvasTexture(rippleC,false);ripple.wrapS=ripple.wrapT=T.RepeatWrapping;ripple.repeat.set(2,3);
const waterMat=new T.MeshStandardMaterial({color:0x8dada2,roughness:.23,metalness:.22,envMapIntensity:.85,bumpMap:ripple,bumpScale:.026,transparent:true,opacity:.87});const water=new T.Mesh(waterG,waterMat);water.receiveShadow=true;scene.add(water);
// Screen-space volumetric sunlight is integrated against the actual canopy shadow map.
window.dispatchEvent(new CustomEvent('forest-progress',{detail:88}));
const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:4,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});target.depthTexture=new T.DepthTexture(1,1);target.depthTexture.type=T.UnsignedIntType;
const postScene=new T.Scene(),postCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),uniforms={image:{value:target.texture},depth:{value:target.depthTexture},shadowTex:{value:null},invProjection:{value:new T.Matrix4()},camWorld:{value:camera.matrixWorld},shadowMatrix:{value:sun.shadow.matrix},eye:{value:camera.position},sunDir:{value:new T.Vector3()},sunTint:{value:new T.Color(1,.78,.46)},strength:{value:.018},resolution:{value:new T.Vector2(1,1)}};
const postMat=new T.ShaderMaterial({uniforms,depthTest:false,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`
precision highp float;
varying vec2 vUv;uniform sampler2D image,depth,shadowTex;uniform mat4 invProjection,camWorld,shadowMatrix;uniform vec3 eye,sunDir,sunTint;uniform float strength;uniform vec2 resolution;
float unpackDepth(vec4 v){return dot(v,vec4(.0000000593718141,.0000151991844,.00389105058,.99609375));}
float shadowAt(vec3 p){vec4 s=shadowMatrix*vec4(p,1.);vec3 q=s.xyz/s.w;if(q.x<0.||q.x>1.||q.y<0.||q.y>1.||q.z>1.)return 0.;return step(q.z-.00015,unpackDepth(texture2D(shadowTex,q.xy)));}
void main(){vec3 base=texture2D(image,vUv).rgb;float d=texture2D(depth,vUv).x;vec4 vp=invProjection*vec4(vUv*2.-1.,d*2.-1.,1.);vp/=vp.w;vec3 world=(camWorld*vp).xyz;vec3 ray=world-eye;float dist=min(length(ray),65.);ray=normalize(ray);float jitter=fract(sin(dot(floor(vUv*resolution),vec2(12.9898,78.233)))*43758.5453);float stepLen=dist/24.;float scattering=0.;for(int i=0;i<24;i++){float t=(float(i)+jitter)*stepLen;vec3 p=eye+ray*t;float haze=exp(-max(p.y,0.)*.07);scattering+=shadowAt(p)*haze*exp(-t*.027)*stepLen;}float phase=.45+.55*pow(max(dot(ray,sunDir),0.),4.);vec3 result=(base+sunTint*scattering*strength*phase)*1.25;vec2 q=vUv-.5;result*=1.-dot(q,q)*.17;result=clamp((result*(2.51*result+.03))/(result*(2.43*result+.59)+.14),0.,1.);result=mix(result*12.92,1.055*pow(result,vec3(1./2.4))-.055,step(vec3(.0031308),result));gl_FragColor=vec4(result,1.);}`});postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),postMat));
let mode='gold',px=pathX(3),pz=3,yaw=.35,pitch=.015,active=false,drag=null,frame=0,lastTime=0,clockTime=0,dirty=true,shadowX=999,shadowZ=999,walkPhase=0,lastDraw=0,visible=true;
const keys=new Set(),reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
function shadowFollow(force=false){if(!force&&Math.hypot(px-shadowX,pz-shadowZ)<9)return;shadowX=px;shadowZ=pz;const gold=mode==='gold';sun.target.position.set(px,0,pz-13);sun.position.set(px-27,gold?26:42,pz-39);uniforms.sunDir.value.copy(sun.position).sub(sun.target.position).normalize();renderer.shadowMap.needsUpdate=true;}
function palette(){const gold=mode==='gold';scene.background=new T.Color(gold?0xa9b9b5:0x9fbbc4);scene.fog=new T.FogExp2(gold?0xabbdb7:0xabc2c6,gold?.012:.024);sun.color.set(gold?0xffdfb3:0xfff1d9);sun.intensity=gold?3.3:2.75;hemi.intensity=gold?1.4:1.65;uniforms.sunTint.value.set(gold?0xffdfad:0xe8ede4);uniforms.strength.value=gold?.017:.012;renderer.toneMappingExposure=matchMedia('(prefers-color-scheme: dark)').matches?1.04:1.08;shadowFollow(true);dirty=true;}
function save(){}
function restore(){palette();}
function blocked(x,z){if(Math.abs(x)>33||z<-94||z>29)return true;for(const c of colliders)if((x-c.x)**2+(z-c.z)**2<c.r*c.r)return true;for(const c of campRects){const p=cabinLocal(c,x,z);if(Math.abs(p.x)<c.hw+.2&&Math.abs(p.z)<c.hd+.2)return true;}return false;}
function move(dx,dz){const parts=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));for(let i=0;i<parts;i++){const nx=px+dx/parts,nz=pz+dz/parts;if(!blocked(nx,pz))px=nx;if(!blocked(px,nz))pz=nz;}dirty=true;}
function setActive(on){active=on;keys.clear();walk.setAttribute('aria-pressed',String(on));walk.textContent=on?'Caminhada ativa · Esc':'Ativar caminhada';status.textContent=on?'Controles ativos. Use WASD ou setas para andar; Q e E para girar.':'Caminhada pausada.';if(on){visible=true;walk.focus({preventScroll:true});}else save();dirty=true;}
function draw(){const walking=keys.size>0&&active;const bob=walking&&!reduceMotion?Math.sin(walkPhase)*.012:0;camera.position.set(px,walkingHeight(px,pz)+1.7+bob,pz);camera.rotation.order='YXZ';camera.rotation.set(pitch,yaw,0);camera.updateMatrixWorld();shadowFollow();renderer.setRenderTarget(target);renderer.render(scene,camera);uniforms.shadowTex.value=sun.shadow.map.texture;uniforms.invProjection.value.copy(camera.projectionMatrixInverse);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);root.dataset.position=JSON.stringify({x:+px.toFixed(4),z:+pz.toFixed(4),yaw:+yaw.toFixed(4),y:+camera.position.y.toFixed(4)});}
function tick(t){frame=requestAnimationFrame(tick);if(trip){advanceTrip(t);draw();lastTime=t;return;}if((!visible&&!active&&!dirty)||document.hidden){lastTime=t;return;}const dt=Math.min((t-(lastTime||t))/1000,.045);lastTime=t;clockTime+=dt;let moving=false;if(active){const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),turn=(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0);if(turn){yaw-=turn*dt*1.15;dirty=true;}if(forward||side){const norm=Math.hypot(forward,side),speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.3:2.05)*dt/norm;move((side*Math.cos(yaw)-forward*Math.sin(yaw))*speed,(-forward*Math.cos(yaw)-side*Math.sin(yaw))*speed);walkPhase+=dt*9;moving=true;}}
if(!reduceMotion){windUniform.value=clockTime;ripple.offset.y=clockTime*.009;}
if(dirty||moving||(!reduceMotion&&t-lastDraw>65)){draw();dirty=false;lastDraw=t;}}

const destinations={
 about:{x:-5.6,z:-1.9,lookX:-6.8,lookZ:-8},
 experience:{x:-11.7,z:-16.3,lookX:-13.5,lookZ:-23},
 projects:{x:.2,z:-26.2,lookX:1.4,lookZ:-33},
 skills:{x:4.3,z:-13,lookX:9,lookZ:-18},
 education:{x:-10.2,z:-31,lookX:-9,lookZ:-40},
 contact:{x:-6.5,z:-13.6,lookX:-7.2,lookZ:-17}
};
function nearestFree(x,z){if(!blocked(x,z))return {x,z};for(let r=.6;r<7;r+=.6)for(let a=0;a<6.28;a+=.4){const p={x:x+Math.cos(a)*r,z:z+Math.sin(a)*r};if(!blocked(p.x,p.z))return p;}return {x:px,z:pz};}
function clearSegment(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.15);for(let i=0;i<=n;i++){const t=n?i/n:0;if(blocked(lerp(a.x,b.x,t),lerp(a.z,b.z,t)))return false;}return true;}
function routeTo(target){const step=.65,minX=-33,minZ=-94,width=103,depth=190,id=(x,z)=>z*width+x,cell=p=>({x:clamp(Math.round((p.x-minX)/step),0,width-1),z:clamp(Math.round((p.z-minZ)/step),0,depth-1)}),point=c=>({x:minX+c.x*step,z:minZ+c.z*step});const start=cell({x:px,z:pz}),goal=cell(target),startId=id(start.x,start.z),goalId=id(goal.x,goal.z);const heap=[],records=new Map(),closed=new Set();
function push(node){heap.push(node);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(heap[p].f<=node.f)break;heap[i]=heap[p];i=p;}heap[i]=node;}
function pop(){const first=heap[0],tail=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1].f<heap[j].f)j++;if(heap[j].f>=tail.f)break;heap[i]=heap[j];i=j;}heap[i]=tail;}return first;}
const heuristic=(x,z)=>Math.hypot(goal.x-x,goal.z-z);const initial={x:start.x,z:start.z,g:0,f:heuristic(start.x,start.z),prev:null};records.set(startId,initial);push(initial);let final=null;
for(let loops=0;heap.length&&loops<18000;loops++){const current=pop(),key=id(current.x,current.z);if(closed.has(key))continue;closed.add(key);if(key===goalId||Math.hypot(point(current).x-target.x,point(current).z-target.z)<.75&&clearSegment(point(current),target)){final=current;break;}for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const x=current.x+dx,z=current.z+dz;if(x<0||z<0||x>=width||z>=depth)continue;const nextId=id(x,z);if(closed.has(nextId))continue;const p=point({x,z});if(blocked(p.x,p.z)||!clearSegment(point(current),p))continue;const g=current.g+Math.hypot(dx,dz),old=records.get(nextId);if(old&&old.g<=g)continue;const next={x,z,g,f:g+heuristic(x,z),prev:current};records.set(nextId,next);push(next);}}
if(!final)return null;const points=[target];for(let n=final;n;n=n.prev)points.push(point(n));points.push({x:px,z:pz});points.reverse();const compact=[points[0]];let i=0;while(i<points.length-1){let j=points.length-1;while(j>i+1&&!clearSegment(points[i],points[j]))j--;compact.push(points[j]);i=j;}return compact;}
const angleMix=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function advanceTrip(t){const tr=trip;if(!tr)return;const u=clamp((t-tr.started)/tr.duration,0,1),ease=u*u*(3-2*u),d=ease*tr.length;let i=0;while(i<tr.lengths.length-1&&d>tr.lengths[i+1])i++;const a=tr.points[i],b=tr.points[Math.min(i+1,tr.points.length-1)],part=(d-tr.lengths[i])/Math.max(.0001,tr.lengths[Math.min(i+1,tr.lengths.length-1)]-tr.lengths[i]);px=lerp(a.x,b.x,clamp(part,0,1));pz=lerp(a.z,b.z,clamp(part,0,1));const heading=Math.atan2(-(b.x-a.x),-(b.z-a.z)),endAngle=Math.atan2(-(tr.lookX-px),-(tr.lookZ-pz));yaw=angleMix(yaw,u>.67?endAngle:heading,u>.67?.12:.08);pitch=lerp(pitch,.025,.08);dirty=true;window.dispatchEvent(new CustomEvent('forest-travel',{detail:{id:tr.id,progress:u}}));if(u>=1){yaw=endAngle;trip=null;window.dispatchEvent(new CustomEvent('forest-arrive',{detail:{id:tr.id}}));}}
window.Forest={
 go(id){const dest=destinations[id];if(!dest)return false;keys.clear();active=false;const targetPoint=nearestFree(dest.x,dest.z),points=routeTo(targetPoint);if(!points){window.dispatchEvent(new CustomEvent('forest-arrive',{detail:{id,skipped:true}}));return false;}const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z));trip={id,points,lengths,length:lengths.at(-1),lookX:dest.lookX,lookZ:dest.lookZ,started:performance.now(),duration:reduceMotion?0:clamp(1800+lengths.at(-1)*48,2100,4200)};visible=true;manualAllowed=false;return true;},
 allowManual(on){manualAllowed=on;keys.clear();if(!on)setActive(false);},
 skip(){if(trip){trip.started=performance.now()-trip.duration-1;advanceTrip(performance.now());draw();}},
 cancel(){trip=null;keys.clear();dirty=true;},
 getState(){return {x:px,z:pz,yaw,traveling:!!trip,ready:root.dataset.ready==='true'};},
 setLight(value){mode=value==='mist'?'mist':'gold';palette();},
 routeInfo(id){const d=destinations[id],p=routeTo(nearestFree(d.x,d.z));return p?{reachable:true,points:p.length,clear:p.every((v,i)=>i===0||clearSegment(p[i-1],v))}:{reachable:false};}
};
const movementCodes=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight']);
walk.addEventListener('click',()=>setActive(!active));
document.addEventListener('keydown',e=>{if(e.code==='Escape'&&active){e.preventDefault();setActive(false);return;}if(!manualAllowed||!active||trip||/^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(movementCodes.has(e.code)){e.preventDefault();keys.add(e.code);}});
document.addEventListener('keyup',e=>{if(keys.delete(e.code)){dirty=true;save();}});
window.addEventListener('blur',()=>{keys.clear();if(active)setActive(false);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(active)setActive(false);}});
lightSelect.addEventListener('focus',()=>{keys.clear();});lightSelect.addEventListener('change',()=>{mode=lightSelect.value;palette();save();});
view.addEventListener('pointerdown',e=>{if(!manualAllowed||trip)return;if(!active)setActive(true);else walk.focus({preventScroll:true});drag={id:e.pointerId,x:e.clientX,y:e.clientY};view.setPointerCapture(e.pointerId);});
view.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.0034;pitch=clamp(pitch-(e.clientY-drag.y)*.0034,-1.12,1.25);drag.x=e.clientX;drag.y=e.clientY;dirty=true;});
view.addEventListener('pointerup',()=>{drag=null;save();});view.addEventListener('pointercancel',()=>{drag=null;});
view.addEventListener('wheel',e=>{if(!manualAllowed||trip)return;e.preventDefault();const d=clamp(e.deltaY*.009,-1,1);move(-Math.sin(yaw)*d,-Math.cos(yaw)*d);save();},{passive:false});
for(const button of document.querySelectorAll('[data-move]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(!active)setActive(true);button.setPointerCapture(e.pointerId);keys.add(button.dataset.move);});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>{keys.delete(button.dataset.move);save();});}
const resize=new ResizeObserver(()=>{const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);uniforms.resolution.value.copy(size);dirty=true;});resize.observe(view);
const intersection=new IntersectionObserver(e=>{visible=e[0].isIntersecting;root.dataset.visible=String(visible);if(!visible)keys.clear();},{threshold:0});intersection.observe(view);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>palette());
restore();const w=view.clientWidth,h=view.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();const size=renderer.getDrawingBufferSize(new T.Vector2());target.setSize(size.x,size.y);uniforms.resolution.value.copy(size);draw();loading.remove();root.dataset.ready='true';window.dispatchEvent(new Event('forest-ready'));frame=requestAnimationFrame(tick);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(frame);keys.clear();status.textContent='O dispositivo interrompeu a renderização. Reabra o cenário para continuar.';});
}catch(e){window.dispatchEvent(new CustomEvent('forest-error',{detail:e.message}));loading.textContent=e.message||'Não foi possível iniciar o cenário 3D.';loading.setAttribute('role','alert');console.error(e);}
},60);
