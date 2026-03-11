/**
 * Three.js Floor Plan 3D Builder
 *
 * Generates a self-contained HTML file with an embedded Three.js scene
 * that renders an interactive 3D model from FloorPlanGeometry data.
 *
 * Features:
 * - Walls with door/window openings (actual gaps, not overlays)
 * - Room-specific floor materials (wood, tile, stone)
 * - Basic furniture per room type
 * - Room name labels (sprite-based)
 * - OrbitControls (inline, no CDN dependency)
 * - Walk mode (WASD + mouse look)
 * - Top-down view toggle
 * - Room hover highlighting with tooltip
 * - BuildFlow dark theme (#07070D background, #4F8AFF accents)
 */

import type { FloorPlanGeometry } from "@/types/floor-plan";

export function buildFloorPlan3D(data: FloorPlanGeometry): string {
  const jsonData = JSON.stringify(data);
  const cx = (data.footprint.width / 2).toFixed(2);
  const cz = (data.footprint.depth / 2).toFixed(2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BuildFlow — Interactive 3D Floor Plan</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#07070D;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E0E0E0}
canvas{display:block}
.ui{position:fixed;z-index:10}
.top-bar{top:16px;right:16px;display:flex;gap:8px}
.btn{background:rgba(79,138,255,.12);border:1px solid rgba(79,138,255,.4);color:#E0E0E0;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;transition:all .2s;backdrop-filter:blur(8px);user-select:none}
.btn:hover{background:rgba(79,138,255,.25);border-color:#4F8AFF}
.btn.active{background:rgba(79,138,255,.35);border-color:#4F8AFF;color:#fff}
#tooltip{position:fixed;background:rgba(15,15,25,.92);border:1px solid rgba(79,138,255,.3);padding:8px 14px;border-radius:6px;font-size:12px;pointer-events:none;display:none;backdrop-filter:blur(4px)}
#tooltip .rn{color:#4F8AFF;font-weight:600;font-size:13px}
#tooltip .rd{color:#999;margin-top:2px}
.info{bottom:16px;left:16px;color:rgba(255,255,255,.25);font-size:11px;line-height:1.6}
#walkOverlay{top:0;left:0;width:100%;height:100%;display:none;align-items:center;justify-content:center}
#walkOverlay .card{background:rgba(15,15,25,.88);border:1px solid rgba(79,138,255,.3);padding:20px 28px;border-radius:12px;text-align:center;font-size:14px;line-height:1.8;backdrop-filter:blur(8px)}
#walkOverlay .card kbd{background:rgba(79,138,255,.15);border:1px solid rgba(79,138,255,.3);padding:2px 8px;border-radius:4px;font-family:inherit;font-size:12px}
</style>
</head>
<body>
<div class="ui top-bar">
<button class="btn" id="btnOrbit" onclick="setMode('orbit')">Orbit</button>
<button class="btn" id="btnTop" onclick="setMode('top')">Top View</button>
<button class="btn" id="btnWalk" onclick="setMode('walk')">Walk Mode</button>
<button class="btn" onclick="resetCamera()">Reset</button>
</div>
<div id="tooltip"><div class="rn" id="ttN"></div><div class="rd" id="ttD"></div></div>
<div class="ui info" id="infoHint">Left drag: Orbit &middot; Right drag: Pan &middot; Scroll: Zoom</div>
<div class="ui" id="walkOverlay"><div class="card"><b>Walk Mode</b><br><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> to move &middot; Mouse to look<br>Press <kbd>Esc</kbd> or click <b>Orbit</b> to exit</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
"use strict";

// ─── Data ──────────────────────────────────────────────────────────────────
var D=${jsonData};
var WH=D.wallHeight||3;

// ─── Inline OrbitControls ──────────────────────────────────────────────────
(function(){
  var OC=function(cam,el){
    this.camera=cam;this.domElement=el;this.target=new THREE.Vector3();
    this.enabled=true;this.minDist=1;this.maxDist=200;
    var self=this,sph={r:20,phi:Math.PI/3.5,theta:Math.PI/4},state=0,sx=0,sy=0;
    function getS(){var o=cam.position.clone().sub(self.target);sph.r=o.length();sph.theta=Math.atan2(o.x,o.z);sph.phi=Math.acos(Math.max(-1,Math.min(1,o.y/sph.r)))}
    function apply(){cam.position.set(self.target.x+sph.r*Math.sin(sph.phi)*Math.sin(sph.theta),self.target.y+sph.r*Math.cos(sph.phi),self.target.z+sph.r*Math.sin(sph.phi)*Math.cos(sph.theta));cam.lookAt(self.target)}
    el.addEventListener("mousedown",function(e){if(!self.enabled)return;getS();state=e.button===2?2:1;sx=e.clientX;sy=e.clientY;e.preventDefault()});
    el.addEventListener("mousemove",function(e){if(!self.enabled||!state)return;var dx=e.clientX-sx,dy=e.clientY-sy;sx=e.clientX;sy=e.clientY;if(state===1){sph.theta-=dx*.005;sph.phi=Math.max(.1,Math.min(Math.PI-.1,sph.phi+dy*.005));apply()}else if(state===2){var r=new THREE.Vector3(),u=new THREE.Vector3();r.setFromMatrixColumn(cam.matrix,0);u.setFromMatrixColumn(cam.matrix,1);var f=sph.r*.002;self.target.add(r.multiplyScalar(-dx*f));self.target.add(u.multiplyScalar(dy*f));apply()}});
    window.addEventListener("mouseup",function(){state=0});
    el.addEventListener("wheel",function(e){if(!self.enabled)return;getS();sph.r*=e.deltaY>0?1.1:.9;sph.r=Math.max(self.minDist,Math.min(self.maxDist,sph.r));apply();e.preventDefault()},{passive:false});
    el.addEventListener("contextmenu",function(e){e.preventDefault()});
    // Touch support
    var tDist=0,tState=0;
    el.addEventListener("touchstart",function(e){if(!self.enabled)return;getS();if(e.touches.length===1){tState=1;sx=e.touches[0].clientX;sy=e.touches[0].clientY}else if(e.touches.length===2){tState=3;tDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}},{passive:true});
    el.addEventListener("touchmove",function(e){if(!self.enabled||!tState)return;if(tState===1&&e.touches.length===1){var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;sx=e.touches[0].clientX;sy=e.touches[0].clientY;sph.theta-=dx*.005;sph.phi=Math.max(.1,Math.min(Math.PI-.1,sph.phi+dy*.005));apply()}else if(tState===3&&e.touches.length===2){var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);sph.r*=tDist/d;sph.r=Math.max(self.minDist,Math.min(self.maxDist,sph.r));tDist=d;apply()}},{passive:true});
    el.addEventListener("touchend",function(){tState=0},{passive:true});
    this.update=function(){};this.dispose=function(){};getS();
  };
  THREE.OrbitControls=OC;
})();

// ─── Scene ─────────────────────────────────────────────────────────────────
var scene=new THREE.Scene();
scene.background=new THREE.Color(0x07070D);
scene.fog=new THREE.FogExp2(0x07070D,.012);

var camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,300);
camera.position.set(${cx}*1+12,14,${cz}*1+12);

var renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.1;
document.body.appendChild(renderer.domElement);

var controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(${cx},1.5,${cz});
controls.update();

// ─── Lighting ──────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff,.45));
scene.add(new THREE.HemisphereLight(0xddeeff,0x0d0d1a,.3));
var sun=new THREE.DirectionalLight(0xfff5e0,.85);
sun.position.set(15,25,10);
sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-30;sun.shadow.camera.right=30;
sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;
sun.shadow.camera.near=1;sun.shadow.camera.far=60;
sun.shadow.bias=-.0005;
scene.add(sun);

// ─── Materials ─────────────────────────────────────────────────────────────
var M={
  wallExt:new THREE.MeshStandardMaterial({color:0xF0EDE8,roughness:.88}),
  wallInt:new THREE.MeshStandardMaterial({color:0xFAF8F5,roughness:.92}),
  glass:new THREE.MeshPhysicalMaterial({color:0x88CCFF,transparent:true,opacity:.25,roughness:.05,metalness:.1,transmission:.6}),
  ceiling:new THREE.MeshStandardMaterial({color:0xFFFFFF,transparent:true,opacity:.35,side:THREE.DoubleSide}),
  ground:new THREE.MeshStandardMaterial({color:0x12121F,roughness:1}),
  door:new THREE.MeshStandardMaterial({color:0x6B4E2E,roughness:.75}),
  floorMats:{
    living:new THREE.MeshStandardMaterial({color:0xB08050,roughness:.65}),
    bedroom:new THREE.MeshStandardMaterial({color:0x9B7B55,roughness:.7}),
    kitchen:new THREE.MeshStandardMaterial({color:0xCCCCCC,roughness:.25}),
    bathroom:new THREE.MeshStandardMaterial({color:0xBBBBCC,roughness:.2}),
    dining:new THREE.MeshStandardMaterial({color:0xB08050,roughness:.65}),
    veranda:new THREE.MeshStandardMaterial({color:0x999999,roughness:.8}),
    hallway:new THREE.MeshStandardMaterial({color:0xAA9A80,roughness:.6}),
    storage:new THREE.MeshStandardMaterial({color:0x888888,roughness:.7}),
    office:new THREE.MeshStandardMaterial({color:0xA09070,roughness:.6}),
    other:new THREE.MeshStandardMaterial({color:0xBBBBBB,roughness:.6})
  },
  furniture:{
    sofa:new THREE.MeshStandardMaterial({color:0x556677,roughness:.8}),
    table:new THREE.MeshStandardMaterial({color:0x8B6D3C,roughness:.6}),
    bed:new THREE.MeshStandardMaterial({color:0xDDCCBB,roughness:.85}),
    counter:new THREE.MeshStandardMaterial({color:0xE8E0D8,roughness:.3}),
    fixture:new THREE.MeshStandardMaterial({color:0xEEEEEE,roughness:.2})
  }
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function box(w,h,d,mat){var g=new THREE.BoxGeometry(w,h,d);var m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;return m}
function addAt(mesh,x,y,z){mesh.position.set(x,y,z);scene.add(mesh);return mesh}

// ─── Ground ────────────────────────────────────────────────────────────────
var gnd=new THREE.Mesh(new THREE.PlaneGeometry(120,120),M.ground);
gnd.rotation.x=-Math.PI/2;gnd.position.y=-.01;gnd.receiveShadow=true;scene.add(gnd);
// Grid
var grid=new THREE.GridHelper(120,120,0x1a1a3a,0x15152a);grid.position.y=-.005;scene.add(grid);

// ─── Room Floors ───────────────────────────────────────────────────────────
var roomMeshes=[];
D.rooms.forEach(function(r){
  var mat=(M.floorMats[r.type]||M.floorMats.other).clone();
  var fl=new THREE.Mesh(new THREE.PlaneGeometry(r.width,r.depth),mat);
  fl.rotation.x=-Math.PI/2;fl.position.set(r.center[0],.005,r.center[1]);
  fl.receiveShadow=true;fl.userData={room:r,origColor:mat.color.getHex()};
  roomMeshes.push(fl);scene.add(fl);
});

// ─── Walls (with door/window openings) ─────────────────────────────────────
function wallLen(w){var dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1];return Math.sqrt(dx*dx+dz*dz)}
function wallAngle(w){return Math.atan2(w.end[0]-w.start[0],w.end[1]-w.start[1])}
function lerp2(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]}
function projOnWall(px,pz,w){var dx=w.end[0]-w.start[0],dz=w.end[1]-w.start[1],L=dx*dx+dz*dz;if(L<.001)return 0;return((px-w.start[0])*dx+(pz-w.start[1])*dz)/L}
function distToWall(px,pz,w){var t=Math.max(0,Math.min(1,projOnWall(px,pz,w)));var cp=lerp2(w.start,w.end,t);return Math.hypot(px-cp[0],pz-cp[1])}

function addWallSeg(x1,z1,x2,z2,thick,h,yBot,mat){
  var dx=x2-x1,dz=z2-z1,len=Math.sqrt(dx*dx+dz*dz);
  if(len<.02)return;
  var a=Math.atan2(dx,dz);
  var m=box(thick,h,len,mat);
  m.position.set((x1+x2)/2,yBot+h/2,(z1+z2)/2);
  m.rotation.y=a;scene.add(m);
}

D.walls.forEach(function(wall,idx){
  var mat=wall.type==="exterior"?M.wallExt:M.wallInt;
  var L=wallLen(wall),ang=wallAngle(wall),th=wall.thickness;

  // Collect openings on this wall
  var openings=[];
  D.doors.forEach(function(d){
    if(d.wallId===idx){
      var t=projOnWall(d.position[0],d.position[1],wall);
      var halfW=d.width/(2*L);
      openings.push({tStart:Math.max(0,t-halfW),tEnd:Math.min(1,t+halfW),type:"door",data:d});
    }
  });
  D.windows.forEach(function(w){
    if(distToWall(w.position[0],w.position[1],wall)<.5){
      var t=projOnWall(w.position[0],w.position[1],wall);
      var halfW=w.width/(2*L);
      openings.push({tStart:Math.max(0,t-halfW),tEnd:Math.min(1,t+halfW),type:"window",data:w});
    }
  });
  openings.sort(function(a,b){return a.tStart-b.tStart});

  // Merge overlapping
  var merged=[];
  openings.forEach(function(o){
    if(merged.length&&o.tStart<merged[merged.length-1].tEnd+.01){
      merged[merged.length-1].tEnd=Math.max(merged[merged.length-1].tEnd,o.tEnd);
      if(o.type==="door")merged[merged.length-1].type="door";
      if(!merged[merged.length-1].data)merged[merged.length-1].data=o.data;
    }else merged.push({tStart:o.tStart,tEnd:o.tEnd,type:o.type,data:o.data});
  });

  if(!merged.length){
    // Solid wall
    addWallSeg(wall.start[0],wall.start[1],wall.end[0],wall.end[1],th,WH,0,mat);
  }else{
    var cursor=0;
    merged.forEach(function(op){
      // Solid segment before opening
      if(op.tStart>cursor+.01){
        var p1=lerp2(wall.start,wall.end,cursor);
        var p2=lerp2(wall.start,wall.end,op.tStart);
        addWallSeg(p1[0],p1[1],p2[0],p2[1],th,WH,0,mat);
      }
      var oP1=lerp2(wall.start,wall.end,op.tStart);
      var oP2=lerp2(wall.start,wall.end,op.tEnd);
      if(op.type==="door"){
        // Lintel above door (2.1m to wallHeight)
        var doorH=2.1;
        if(WH>doorH+.1) addWallSeg(oP1[0],oP1[1],oP2[0],oP2[1],th,WH-doorH,doorH,mat);
      }else{
        // Window: wall below sill + wall above window + glass pane
        var wd=op.data||{sillHeight:.9,height:1.2};
        var sH=wd.sillHeight||.9,wH=wd.height||1.2;
        if(sH>.05) addWallSeg(oP1[0],oP1[1],oP2[0],oP2[1],th,sH,0,mat);
        var topY=sH+wH;
        if(WH>topY+.05) addWallSeg(oP1[0],oP1[1],oP2[0],oP2[1],th,WH-topY,topY,mat);
        // Glass pane
        var gLen=Math.hypot(oP2[0]-oP1[0],oP2[1]-oP1[1]);
        if(gLen>.05){
          var gMesh=box(.02,wH,gLen,M.glass);
          gMesh.position.set((oP1[0]+oP2[0])/2,sH+wH/2,(oP1[1]+oP2[1])/2);
          gMesh.rotation.y=ang;scene.add(gMesh);
        }
      }
      cursor=op.tEnd;
    });
    // Remaining wall after last opening
    if(cursor<.99){
      var p1=lerp2(wall.start,wall.end,cursor);
      addWallSeg(p1[0],p1[1],wall.end[0],wall.end[1],th,WH,0,mat);
    }
  }
});

// ─── Ceiling ───────────────────────────────────────────────────────────────
var ceil=new THREE.Mesh(new THREE.PlaneGeometry(D.footprint.width,D.footprint.depth),M.ceiling);
ceil.rotation.x=Math.PI/2;ceil.position.set(D.footprint.width/2,WH,D.footprint.depth/2);
scene.add(ceil);

// ─── Furniture ─────────────────────────────────────────────────────────────
D.rooms.forEach(function(r){
  var cx=r.center[0],cz=r.center[1];
  switch(r.type){
    case"living":
      addAt(box(1.8,.7,.8,M.furniture.sofa),cx-.3,.35,cz+r.depth*.2);
      addAt(box(.6,.4,.6,M.furniture.table),cx-.3,.2,cz-.2);
      break;
    case"bedroom":
      addAt(box(1.6,.5,2,M.furniture.bed),cx,.25,cz);
      addAt(box(.4,.5,.4,M.furniture.table),cx+1,.25,cz-.6);
      break;
    case"kitchen":
      addAt(box(r.width*.7,.9,.55,M.furniture.counter),cx,.45,cz-r.depth*.3);
      break;
    case"dining":
      addAt(box(1.2,.75,1.8,M.furniture.table),cx,.375,cz);
      for(var ci=0;ci<4;ci++){
        var ca=ci*Math.PI/2,cd=.8;
        addAt(box(.4,.8,.4,M.furniture.sofa),cx+Math.cos(ca)*cd,.4,cz+Math.sin(ca)*cd);
      }
      break;
    case"bathroom":
      addAt(box(.6,.8,.5,M.furniture.fixture),cx-r.width*.25,.4,cz-r.depth*.3);
      addAt(box(r.width*.5,.2,.45,M.furniture.fixture),cx+r.width*.15,.7,cz+r.depth*.25);
      break;
    case"office":
      addAt(box(1.2,.75,.6,M.furniture.table),cx,.375,cz);
      addAt(box(.5,.9,.5,M.furniture.sofa),cx,.45,cz+.6);
      break;
  }
});

// ─── Room Labels (Sprites) ─────────────────────────────────────────────────
function makeLabel(text,size){
  var c=document.createElement("canvas");c.width=512;c.height=128;
  var ctx=c.getContext("2d");
  ctx.fillStyle="rgba(0,0,0,0)";ctx.fillRect(0,0,512,128);
  ctx.font="bold 42px -apple-system,BlinkMacSystemFont,sans-serif";
  ctx.textAlign="center";ctx.fillStyle="rgba(79,138,255,.8)";
  ctx.fillText(text,256,70);
  var tex=new THREE.CanvasTexture(c);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));
  sp.scale.set(size,size*.25,1);return sp;
}
D.rooms.forEach(function(r){
  var sp=makeLabel(r.name,Math.max(r.width,r.depth)*1.1);
  sp.position.set(r.center[0],WH+.6,r.center[1]);
  scene.add(sp);
});

// ─── Interaction: Raycaster for room hover ─────────────────────────────────
var raycaster=new THREE.Raycaster();
var mouse=new THREE.Vector2();
var tooltipEl=document.getElementById("tooltip");
var ttN=document.getElementById("ttN");
var ttD=document.getElementById("ttD");
var hoveredRoom=null;

renderer.domElement.addEventListener("mousemove",function(e){
  mouse.x=(e.clientX/innerWidth)*2-1;
  mouse.y=-(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouse,camera);
  var hits=raycaster.intersectObjects(roomMeshes);
  if(hits.length){
    var rm=hits[0].object;
    if(hoveredRoom&&hoveredRoom!==rm){hoveredRoom.material.emissive.setHex(0);hoveredRoom.material.emissiveIntensity=0}
    hoveredRoom=rm;
    rm.material.emissive.setHex(0x4F8AFF);rm.material.emissiveIntensity=.3;
    var r=rm.userData.room;
    ttN.textContent=r.name;ttD.textContent=r.width.toFixed(1)+"m × "+r.depth.toFixed(1)+"m";
    tooltipEl.style.display="block";tooltipEl.style.left=(e.clientX+14)+"px";tooltipEl.style.top=(e.clientY+14)+"px";
  }else{
    if(hoveredRoom){hoveredRoom.material.emissive.setHex(0);hoveredRoom.material.emissiveIntensity=0;hoveredRoom=null}
    tooltipEl.style.display="none";
  }
});

// ─── Camera Modes ──────────────────────────────────────────────────────────
var mode="orbit";
var walkDir=new THREE.Vector3();
var walkRight=new THREE.Vector3();
var keys={};
var walkYaw=Math.PI/4,walkPitch=-.2;
var walkMouseDown=false,walkSX=0,walkSY=0;

window.addEventListener("keydown",function(e){keys[e.code]=true;if(e.code==="Escape"&&mode==="walk")setMode("orbit")});
window.addEventListener("keyup",function(e){keys[e.code]=false});

function setMode(m){
  mode=m;
  document.getElementById("btnOrbit").classList.toggle("active",m==="orbit");
  document.getElementById("btnTop").classList.toggle("active",m==="top");
  document.getElementById("btnWalk").classList.toggle("active",m==="walk");
  document.getElementById("walkOverlay").style.display=m==="walk"?"flex":"none";
  document.getElementById("infoHint").textContent=m==="walk"?"WASD: Move · Mouse: Look · Esc: Exit":"Left drag: Orbit · Right drag: Pan · Scroll: Zoom";
  controls.enabled=(m==="orbit");

  if(m==="top"){
    controls.enabled=false;
    camera.position.set(D.footprint.width/2,Math.max(D.footprint.width,D.footprint.depth)*1.2,D.footprint.depth/2);
    camera.lookAt(D.footprint.width/2,0,D.footprint.depth/2);
  }else if(m==="walk"){
    // Place at building center, eye height
    camera.position.set(D.footprint.width/2,1.6,D.footprint.depth/2);
    walkYaw=Math.PI;walkPitch=0;
    setTimeout(function(){document.getElementById("walkOverlay").style.display="none"},2000);
  }else if(m==="orbit"){
    controls.target.set(${cx},1.5,${cz});
  }
}

// Walk mode mouse look
renderer.domElement.addEventListener("mousedown",function(e){if(mode==="walk"){walkMouseDown=true;walkSX=e.clientX;walkSY=e.clientY}});
renderer.domElement.addEventListener("mousemove",function(e){
  if(mode==="walk"&&walkMouseDown){
    walkYaw-=(e.clientX-walkSX)*.003;
    walkPitch=Math.max(-.8,Math.min(.8,walkPitch+(e.clientY-walkSY)*.003));
    walkSX=e.clientX;walkSY=e.clientY;
  }
});
window.addEventListener("mouseup",function(){walkMouseDown=false});

function updateWalk(){
  var speed=.08;
  walkDir.set(-Math.sin(walkYaw),0,-Math.cos(walkYaw)).normalize();
  walkRight.set(-Math.sin(walkYaw-Math.PI/2),0,-Math.cos(walkYaw-Math.PI/2)).normalize();
  if(keys.KeyW||keys.ArrowUp)camera.position.add(walkDir.clone().multiplyScalar(speed));
  if(keys.KeyS||keys.ArrowDown)camera.position.add(walkDir.clone().multiplyScalar(-speed));
  if(keys.KeyA||keys.ArrowLeft)camera.position.add(walkRight.clone().multiplyScalar(-speed));
  if(keys.KeyD||keys.ArrowRight)camera.position.add(walkRight.clone().multiplyScalar(speed));
  camera.position.y=1.6;
  var lookAt=camera.position.clone().add(new THREE.Vector3(-Math.sin(walkYaw)*Math.cos(walkPitch),Math.sin(walkPitch),-Math.cos(walkYaw)*Math.cos(walkPitch)));
  camera.lookAt(lookAt);
}

function resetCamera(){
  setMode("orbit");
  camera.position.set(${cx}*1+12,14,${cz}*1+12);
  controls.target.set(${cx},1.5,${cz});controls.update();
}

setMode("orbit");

// ─── Animation Loop ────────────────────────────────────────────────────────
function animate(){
  requestAnimationFrame(animate);
  if(mode==="walk")updateWalk();
  renderer.render(scene,camera);
}
animate();

// ─── Resize ────────────────────────────────────────────────────────────────
addEventListener("resize",function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
<\/script>
</body>
</html>`;
}
