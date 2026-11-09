import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {useLocale,useTheme} from '../../../app/providers/preferences-context';
type Theme='light'|'dark';type Language='ar'|'en';
// Original supplied logo images are contained at their native aspect ratio.
function screenTexture(image:HTMLImageElement,mobile:boolean,dark:boolean){
 const canvas=document.createElement('canvas');canvas.width=mobile?723:1356;canvas.height=mobile?1584:783;
 const ctx=canvas.getContext('2d')!;const w=canvas.width,h=canvas.height;
 ctx.fillStyle=dark?'#102733':'#f6f4ee';ctx.fillRect(0,0,w,h);
 ctx.strokeStyle=dark?'#29434c':'#dce5df';ctx.lineWidth=2;
 const round=(x:number,y:number,width:number,height:number,radius:number,fill:string)=>{ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,width,height,radius);ctx.fill();};
 const mint=dark?'#8fc6bc':'#0b625d',line=dark?'#304c54':'#d7e2dc';
 if(!mobile){round(50,38,26,8,4,mint);round(92,38,26,8,4,line);round(134,38,26,8,4,line);ctx.beginPath();ctx.moveTo(48,80);ctx.lineTo(w-48,80);ctx.stroke();}
 const maxWidth=w*(mobile?.76:.64),maxHeight=h*.2,scale=Math.min(maxWidth/image.naturalWidth,maxHeight/image.naturalHeight);
 const logoWidth=image.naturalWidth*scale,logoHeight=image.naturalHeight*scale;
 ctx.drawImage(image,(w-logoWidth)/2,h*(mobile?.28:.23),logoWidth,logoHeight);
 const start=h*(mobile?.48:.53);round(w*.15,start,w*.7,8,4,line);round(w*.23,start+26,w*.54,8,4,line);
 round(w*(mobile?.26:.37),start+65,w*(mobile?.48:.26),mobile?65:47,10,mint);
 const y=h*(mobile?.68:.79),gap=mobile?18:24,columns=mobile?1:3;
 for(let index=0;index<3;index++){const width=(w*.8-gap*(columns-1))/columns,x=w*.1+(index%columns)*(width+gap),top=y+Math.floor(index/columns)*(mobile?100:0);round(x,top,width,mobile?78:105,12,dark?'#193943':'#e7ede7');round(x+20,top+23,width*.45,7,3,mint);round(x+20,top+45,width*.7,6,3,line);}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function roundedPlane(width:number,height:number,radius:number){
 const shape=new THREE.Shape(),x=-width/2,y=-height/2;
 shape.moveTo(x+radius,y);shape.lineTo(x+width-radius,y);shape.quadraticCurveTo(x+width,y,x+width,y+radius);shape.lineTo(x+width,y+height-radius);shape.quadraticCurveTo(x+width,y+height,x+width-radius,y+height);shape.lineTo(x+radius,y+height);shape.quadraticCurveTo(x,y+height,x,y+height-radius);shape.lineTo(x,y+radius);shape.quadraticCurveTo(x,y,x+radius,y);
 const geometry=new THREE.ShapeGeometry(shape,10),positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
 for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)+width/2)/width,(positions.getY(i)+height/2)/height);
 return geometry;
}
export function ProductScene({onReady}:{onReady:(ready:boolean)=>void}){
 const host=useRef<HTMLDivElement>(null),controller=useRef<{update:(language:Language,theme:Theme)=>void}|null>(null),{language}=useLocale(),{theme}=useTheme();
 const preferences=useRef({language,theme});
 useEffect(()=>{preferences.current={language,theme};controller.current?.update(language,theme);},[language,theme]);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  const canvas=document.createElement('canvas');let renderer:THREE.WebGLRenderer|undefined,dispose=()=>{};
  try{
   const gl=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});if(!gl){onReady(false);return;}
   renderer=new THREE.WebGLRenderer({canvas,context:gl,alpha:true,antialias:true,powerPreference:'low-power'});
   const engine=renderer;engine.setClearColor(0x000000,0);engine.outputColorSpace=THREE.SRGBColorSpace;engine.toneMapping=THREE.ACESFilmicToneMapping;engine.toneMappingExposure=1.05;
   engine.setPixelRatio(Math.min(devicePixelRatio,innerWidth<640?1:1.5));engine.shadowMap.enabled=false;
   element.appendChild(canvas);canvas.dataset.background='transparent';canvas.dataset.devices='monitor smartphone';
   const scene=new THREE.Scene();scene.background=null;
   const camera=new THREE.PerspectiveCamera(30,1,.1,60),rig=new THREE.Group();scene.add(rig);
   const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
   const own=<T extends THREE.Material>(material:T)=>{materials.add(material);return material;};
   const metal=own(new THREE.MeshStandardMaterial({color:0xa6b6b9,metalness:.92,roughness:.24}));
   const frame=own(new THREE.MeshStandardMaterial({color:0x25363b,metalness:.78,roughness:.24}));
   const black=own(new THREE.MeshStandardMaterial({color:0x070d11,metalness:.28,roughness:.23}));
   const glass=own(new THREE.MeshPhysicalMaterial({color:0xe1f5f4,metalness:.08,roughness:.13,clearcoat:1,clearcoatRoughness:.08,transparent:true,opacity:.045,depthWrite:false}));
   const lens=own(new THREE.MeshPhysicalMaterial({color:0x142c40,metalness:.8,roughness:.08,clearcoat:1}));
   const box=(parent:THREE.Object3D,w:number,h:number,d:number,material:THREE.Material,x=0,y=0,z=0,r=.04)=>{const geometry=new RoundedBoxGeometry(w,h,d,3,Math.min(r,w/2,h/2,d/2));geometries.add(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
   const monitor=new THREE.Group();monitor.position.set(.48,.15,-.15);monitor.rotation.y=.12;rig.add(monitor);
   box(monitor,4.8,2.94,.16,metal,0,.35,0,.075);box(monitor,4.72,2.86,.035,black,0,.35,.094,.07);
   const screenPairs:{base:THREE.MeshBasicMaterial;overlay:THREE.MeshBasicMaterial;mobile:boolean}[]=[];
   const screen=(parent:THREE.Object3D,w:number,h:number,x:number,y:number,z:number,mobile:boolean,radius:number)=>{
    const geometry=roundedPlane(w,h,radius);geometries.add(geometry);
    const base=own(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false})),overlay=own(new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false,transparent:true,opacity:preferences.current.theme==='dark'?1:0,depthWrite:false}));
    const face=new THREE.Mesh(geometry,base);face.position.set(x,y,z);parent.add(face);const darkFace=new THREE.Mesh(geometry,overlay);darkFace.position.set(x,y,z+.002);darkFace.renderOrder=2;parent.add(darkFace);
    const cover=new THREE.Mesh(geometry,glass);cover.position.set(x,y,z+.004);cover.renderOrder=3;parent.add(cover);screenPairs.push({base,overlay,mobile});
   };
   screen(monitor,4.52,2.61,0,.42,.119,false,.035);
   box(monitor,.46,.065,.018,metal,0,-1.038,.12,.02);
   box(monitor,.48,.95,.21,metal,0,-1.51,-.09,.065).rotation.x=-.16;
   box(monitor,1.9,.09,1.05,metal,0,-1.98,.03,.04);
   // Rear housing and ventilation are modeled, not painted into a photograph.
   box(monitor,3.3,1.8,.07,frame,0,.4,-.12,.03);
   for(let i=0;i<9;i++)box(monitor,.22,.025,.018,black,-1.25+i*.31,-.38,-.166,.009);
   const phone=new THREE.Group();phone.position.set(-1.72,-.56,1.05);phone.rotation.set(-.035,-.17,-.075);rig.add(phone);
   box(phone,1.35,2.82,.18,metal,0,0,0,.087);box(phone,1.285,2.755,.036,black,0,0,.102,.017);box(phone,1.285,2.755,.036,frame,0,0,-.103,.017);
   screen(phone,1.205,2.64,0,0,.125,true,.135);
   box(phone,.355,.071,.008,black,0,1.166,.137,.004);
   const cameraGeometry=new THREE.CylinderGeometry(.026,.026,.008,20);geometries.add(cameraGeometry);const selfie=new THREE.Mesh(cameraGeometry,lens);selfie.rotation.x=Math.PI/2;selfie.position.set(.12,1.166,.143);phone.add(selfie);
   box(phone,.3,.024,.008,metal,0,-1.24,.14,.003);
   box(phone,.025,.34,.075,metal,.684,.37,0,.01);box(phone,.025,.23,.075,metal,-.684,.56,0,.01);box(phone,.025,.23,.075,metal,-.684,.24,0,.01);
   box(phone,.58,.65,.07,frame,-.27,.95,-.148,.03);
   for(const [x,y]of [[-.4,1.1],[-.14,1.1],[-.4,.83]]){const geo=new THREE.CylinderGeometry(.106,.106,.05,24);geometries.add(geo);const barrel=new THREE.Mesh(geo,metal);barrel.rotation.x=Math.PI/2;barrel.position.set(x!,y!,-.205);phone.add(barrel);const optic=new THREE.Mesh(new THREE.CircleGeometry(.073,24),lens);geometries.add(optic.geometry);optic.rotation.y=Math.PI;optic.position.set(x!,y!,-.232);phone.add(optic);}
   // Soft contact shadows have transparent edges and require no recurring shadow pass.
   const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
   const shadowContext=shadowCanvas.getContext('2d')!,gradient=shadowContext.createRadialGradient(64,64,5,64,64,63);gradient.addColorStop(0,'rgba(0,0,0,.65)');gradient.addColorStop(.35,'rgba(0,0,0,.32)');gradient.addColorStop(1,'rgba(0,0,0,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
   const shadowTexture=new THREE.CanvasTexture(shadowCanvas);textures.add(shadowTexture);
   const shadow=own(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,opacity:.32,depthWrite:false,toneMapped:false}));
   for(const [x,z,width,depth]of [[.48,0,3.6,2.1],[-1.72,1.05,1.8,1.3]]){const geometry=new THREE.PlaneGeometry(width!,depth!);geometries.add(geometry);const contact=new THREE.Mesh(geometry,shadow);contact.rotation.x=-Math.PI/2;contact.position.set(x!,-2.04,z!);rig.add(contact);}

   const ambient=new THREE.HemisphereLight(0xf6f4ee,0x29545b,2.2);scene.add(ambient);
   const key=new THREE.DirectionalLight(0xffffff,3.5);key.position.set(-3,6,7);key.castShadow=false;key.shadow.mapSize.set(innerWidth<640?512:1024,innerWidth<640?512:1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.03;key.shadow.bias=-.0004;scene.add(key);
   const rim=new THREE.DirectionalLight(0x8fc6bc,2.6);rim.position.set(4,3,-4);scene.add(rim);
   const fill=new THREE.DirectionalLight(0xd5e6ff,1.1);fill.position.set(3,1,5);scene.add(fill);
   const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(engine),environment=pmrem.fromScene(room,.04);scene.environment=environment.texture;room.dispose();pmrem.dispose();
   let alive=true,visible=true,ready=false,assetsReady=false,frameId=0,last=performance.now(),intro=0,blend=preferences.current.theme==='dark'?1:0,targetBlend=blend,targetX=0,targetY=-.14,currentX=0,currentY=-.14,loadedLanguage='',loadVersion=0;
   const lightMetal=new THREE.Color(0xa6b6b9),darkMetal=new THREE.Color(0x667e87),lightFrame=new THREE.Color(0x25363b),darkFrame=new THREE.Color(0x17333d),direction=new THREE.Vector3(.26,.15,1).normalize();
   const render=(time:number)=>{
    frameId=0;if(!alive||!visible||document.hidden||!assetsReady)return;
    const dt=Math.min(.06,Math.max(.001,(time-last)/1000));last=time;const damping=1-Math.exp(-8*dt);
    intro=Math.min(1,intro+dt/1.05);blend=THREE.MathUtils.lerp(blend,targetBlend,damping);currentX=THREE.MathUtils.lerp(currentX,targetX,damping);currentY=THREE.MathUtils.lerp(currentY,targetY,damping);
    rig.rotation.set(currentX,currentY,0);rig.position.y=-.22*Math.pow(1-intro,3);
    metal.color.copy(lightMetal).lerp(darkMetal,blend);frame.color.copy(lightFrame).lerp(darkFrame,blend);ambient.intensity=THREE.MathUtils.lerp(2.2,1.35,blend);key.intensity=THREE.MathUtils.lerp(3.5,2.5,blend);rim.intensity=THREE.MathUtils.lerp(2.6,4.8,blend);fill.intensity=THREE.MathUtils.lerp(1.1,2.1,blend);scene.environmentIntensity=THREE.MathUtils.lerp(.8,1.2,blend);shadow.opacity=THREE.MathUtils.lerp(.42,.65,blend);
    for(const pair of screenPairs)pair.overlay.opacity=blend;
    try{engine.render(scene,camera);if(!ready){ready=true;onReady(true);}}
    catch{onReady(false);return;}
    if(intro<1||Math.abs(blend-targetBlend)>.002||Math.abs(currentX-targetX)>.0003||Math.abs(currentY-targetY)>.0003)frameId=requestAnimationFrame(render);
   };
   const invalidate=()=>{if(!frameId&&alive&&visible&&!document.hidden){last=performance.now();frameId=requestAnimationFrame(render);}};
   const resize=()=>{const {width,height}=element.getBoundingClientRect();if(!width||!height)return;engine.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();rig.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(rig),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);const distance=Math.max(size.y/(2*Math.tan(vertical/2)),size.x/(2*Math.tan(horizontal/2)))*1.17+size.z*.45;camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);invalidate();};
   const loadImage=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('brand_asset_unavailable'));image.src=url;});
   const update=async(language:Language,theme:Theme)=>{
    targetBlend=theme==='dark'?1:0;canvas.dataset.theme=theme;canvas.dataset.language=language;invalidate();if(loadedLanguage===language)return;
    loadedLanguage=language;const version=++loadVersion;
    try{const paths=theme==='dark'?['ivory','colour']:['colour','ivory'];const images=await Promise.all(paths.map(variant=>loadImage(`/brand/logo-horizontal${language==='en'?'-en':''}-${variant}.${language==='en'?'png':'svg'}`)));if(!alive||version!==loadVersion)return;
     const byVariant=Object.fromEntries(paths.map((variant,index)=>[variant,images[index]!])) as Record<string,HTMLImageElement>;
     const old=[...textures].filter(texture=>texture!==shadowTexture);for(const oldTexture of old)textures.delete(oldTexture);for(const pair of screenPairs){const light=screenTexture(byVariant.colour!,pair.mobile,false),dark=screenTexture(byVariant.ivory!,pair.mobile,true);textures.add(light);textures.add(dark);pair.base.map=light;pair.overlay.map=dark;pair.base.needsUpdate=true;pair.overlay.needsUpdate=true;}old.forEach(texture=>texture.dispose());assetsReady=true;canvas.dataset.logoAsset=`logo-horizontal${language==='en'?'-en':''}`;resize();invalidate();
    }catch{if(alive&&version===loadVersion)onReady(false);}
   };
   controller.current={update:(language,theme)=>{void update(language,theme);}};
   const observer=new ResizeObserver(resize);observer.observe(element);
   const intersection=new IntersectionObserver(([entry])=>{visible=!!entry?.isIntersecting;if(visible)invalidate();else{cancelAnimationFrame(frameId);frameId=0;}});intersection.observe(element);
   const pointer=(event:PointerEvent)=>{const box=element.getBoundingClientRect();targetY=-.14+((event.clientX-box.left)/box.width-.5)*.18;targetX=((event.clientY-box.top)/box.height-.5)*.065;invalidate();};
   const leave=()=>{targetX=0;targetY=-.14;invalidate();};const visibility=()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else invalidate();};const lost=(event:Event)=>{event.preventDefault();onReady(false);};
   element.addEventListener('pointermove',pointer);element.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',visibility);canvas.addEventListener('webglcontextlost',lost);
   resize();void update(preferences.current.language,preferences.current.theme);
   dispose=()=>{alive=false;controller.current=null;cancelAnimationFrame(frameId);observer.disconnect();intersection.disconnect();element.removeEventListener('pointermove',pointer);element.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',lost);geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());environment.dispose();key.shadow.dispose();engine.dispose();engine.forceContextLoss();canvas.remove();};
  }catch{dispose();renderer?.dispose();canvas.remove();onReady(false);}
  return()=>dispose();
 },[onReady]);
 return <div className="product-scene" ref={host} aria-hidden="true"/>;
}
