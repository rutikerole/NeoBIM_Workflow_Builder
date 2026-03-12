/**
 * Three.js Floor Plan 3D Builder — High-Quality Edition
 *
 * Self-contained HTML with embedded Three.js scene.
 * Rooms use absolute x,y positions (meters from building top-left).
 * Walls are computed from shared edges — not per-room boxes.
 * Features: 512x512 procedural floor textures, plaster walls, door openings,
 * frosted-glass labels with color-coded borders (toggle-able), area watermarks,
 * smooth 800ms camera transitions, click-to-focus, grid helper,
 * furniture with rugs, BuildFlow-themed UI.
 */

import type { FloorPlanGeometry } from "@/types/floor-plan";

export function buildFloorPlan3D(data: FloorPlanGeometry, sourceImage?: string): string {
  const jsonData = JSON.stringify(data);
  const totalArea = data.rooms
    .reduce((s, r) => s + (r.area ?? r.width * r.depth), 0)
    .toFixed(1);
  const roomCount = data.rooms.length;
  const dimStr = `${data.footprint.width.toFixed(1)}m \u00d7 ${data.footprint.depth.toFixed(1)}m`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BuildFlow \u2014 3D Floor Plan</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#060610;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#E0E0E0}
canvas{display:block}
#tip{position:fixed;background:rgba(8,10,18,.92);border:1px solid rgba(79,138,255,.25);padding:10px 16px;border-radius:10px;font-size:12px;pointer-events:none;display:none;backdrop-filter:blur(12px);z-index:30;max-width:240px;box-shadow:0 4px 20px rgba(0,0,0,.5)}
#tip .tn{color:#6EA0FF;font-weight:600;font-size:13px}#tip .td{color:#A0A0B8;margin-top:3px;line-height:1.4}
</style>
</head>
<body>
<div id="bf-dbg" style="position:fixed;top:4px;left:4px;z-index:9999;background:rgba(79,138,255,0.85);color:#fff;padding:3px 8px;font-size:9px;border-radius:4px;pointer-events:none;font-family:monospace;letter-spacing:.5px">BUILDER v3.1</div>
<div id="tip"><div class="tn" id="tN"></div><div class="td" id="tD"></div></div>
<script>
// Early message queue — captures commands while Three.js CDN loads
var __cmdQueue=[];
var __sceneReady=false;
window.addEventListener("message",function(ev){
  if(!ev.data||!ev.data.type)return;
  if(!__sceneReady){__cmdQueue.push(ev.data);return;}
});
<\/script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js" onerror="document.title='CDN_FAIL';console.error('[IFRAME] Three.js CDN failed to load')"><\/script>
<script>
"use strict";
var D=${jsonData};
var WH=D.wallHeight||2.8,BW=D.footprint.width,BD=D.footprint.depth;
var isNonRect=D.buildingOutline&&D.buildingOutline.length>=3&&D.buildingShape&&D.buildingShape!=='rectangular';
var IMG_SRC="${sourceImage ?? ''}";
var HAS_IMG=IMG_SRC.length>10;
var HAS_SVG_WALLS=D.walls&&D.walls.length>4;
var CX=BW/2,CZ=BD/2,MXD=Math.max(BW,BD);

// ─── Inline OrbitControls ─────────────────────────────────────────────────────
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
var tDist=0,tState=0;
el.addEventListener("touchstart",function(e){if(!self.enabled)return;getS();if(e.touches.length===1){tState=1;sx=e.touches[0].clientX;sy=e.touches[0].clientY}else if(e.touches.length===2){tState=3;tDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)}},{passive:true});
el.addEventListener("touchmove",function(e){if(!self.enabled||!tState)return;if(tState===1&&e.touches.length===1){var dx=e.touches[0].clientX-sx,dy=e.touches[0].clientY-sy;sx=e.touches[0].clientX;sy=e.touches[0].clientY;sph.theta-=dx*.005;sph.phi=Math.max(.1,Math.min(Math.PI-.1,sph.phi+dy*.005));apply()}else if(tState===3&&e.touches.length===2){var d2=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);sph.r*=tDist/d2;sph.r=Math.max(self.minDist,Math.min(self.maxDist,sph.r));tDist=d2;apply()}},{passive:true});
el.addEventListener("touchend",function(){tState=0},{passive:true});
this.update=function(){};this.dispose=function(){};getS();
};
THREE.OrbitControls=OC;
})();

// ─── Scene ────────────────────────────────────────────────────────────────────
var scene=new THREE.Scene();

// Gradient sky background (dark navy → deep blue → horizon glow)
(function(){
  var skyC=document.createElement("canvas");skyC.width=2;skyC.height=256;
  var skyG=skyC.getContext("2d");
  var grad=skyG.createLinearGradient(0,0,0,256);
  grad.addColorStop(0,"#060610");
  grad.addColorStop(0.3,"#0A0E1E");
  grad.addColorStop(0.6,"#101828");
  grad.addColorStop(0.85,"#1A2540");
  grad.addColorStop(1.0,"#2A3555");
  skyG.fillStyle=grad;skyG.fillRect(0,0,2,256);
  var skyTex=new THREE.CanvasTexture(skyC);
  skyTex.magFilter=THREE.LinearFilter;
  scene.background=skyTex;
})();
scene.fog=new THREE.FogExp2(0x0A0A18,0.012);

var camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,500);
var SP=new THREE.Vector3(CX+MXD*.8,MXD*.7,CZ+MXD*.9);
// Default to top-down view for floor plans
camera.position.set(CX,MXD*1.4,CZ+.01);
camera.lookAt(CX,0,CZ);
var renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.4;
renderer.outputEncoding=THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);
var controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.target.set(CX,0,CZ);

// ─── Lights (warm key + cool fill + sky hemisphere) ──────────────────────────
scene.add(new THREE.AmbientLight(0xFFF5E8,.55));
var sun=new THREE.DirectionalLight(0xFFECCC,1.5);
sun.position.set(BW+6,22,-4);sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
var sc=sun.shadow.camera;sc.left=-35;sc.right=35;sc.top=35;sc.bottom=-35;sc.near=1;sc.far=70;
sun.shadow.bias=-.0002;sun.shadow.normalBias=.02;scene.add(sun);
var fill=new THREE.DirectionalLight(0xC0D8F0,.45);
fill.position.set(-10,15,BD+6);scene.add(fill);
var rim=new THREE.DirectionalLight(0xE0C8F0,.15);
rim.position.set(CX,-2,CZ-MXD);scene.add(rim);
scene.add(new THREE.HemisphereLight(0xC0D8F0,0x8A7A60,.5));

// ─── Texture Generators (512x512 floor, 256x256 plaster) ────────────────────
function makeFloorTex(type,hex){
  var S=512,c=document.createElement("canvas");c.width=S;c.height=S;
  var g=c.getContext("2d");
  var R=(hex>>16)&0xff,G=(hex>>8)&0xff,B=hex&0xff;
  g.fillStyle="rgb("+R+","+G+","+B+")";g.fillRect(0,0,S,S);
  if(type==="wood"){
    // Plank rows
    for(var y=0;y<S;y+=40){
      var v=Math.random()*20-10;
      g.fillStyle="rgba("+(v>0?200:60)+","+(v>0?160:40)+","+(v>0?100:20)+","+(Math.abs(v)/200)+")";
      g.fillRect(0,y,S,38);
      // Plank gap
      g.fillStyle="rgba(30,15,5,0.25)";g.fillRect(0,y,S,1.5);
      // Fine grain lines
      for(var gi=0;gi<14;gi++){
        var gy=y+2+Math.random()*36;
        var gAlpha=0.02+Math.random()*0.06;
        g.fillStyle="rgba(60,35,12,"+gAlpha+")";
        g.fillRect(0,gy,S,0.8);
      }
      // Subtle knot (rare)
      if(Math.random()<0.15){
        var kx=40+Math.random()*(S-80),ky=y+10+Math.random()*18;
        g.beginPath();g.arc(kx,ky,3+Math.random()*4,0,Math.PI*2);
        g.fillStyle="rgba(50,28,8,0.2)";g.fill();
      }
    }
    // Vertical stagger lines (plank ends)
    for(var vl=0;vl<4;vl++){
      var vlx=S*.2+Math.random()*S*.6;
      for(var vly=0;vly<S;vly+=80){
        g.fillStyle="rgba(30,15,5,0.18)";g.fillRect(vlx,vly+Math.random()*20,1.5,40);
      }
    }
  }else if(type==="tile"){
    var ts=42;g.strokeStyle="rgba(0,0,0,0.14)";g.lineWidth=1.5;
    for(var tx=0;tx<S;tx+=ts)for(var ty=0;ty<S;ty+=ts){
      var tv=Math.random()*12-6;
      g.fillStyle="rgb("+Math.max(0,Math.min(255,R+tv))+","+Math.max(0,Math.min(255,G+tv))+","+Math.max(0,Math.min(255,B+tv))+")";
      g.fillRect(tx+1,ty+1,ts-2,ts-2);
      g.strokeRect(tx,ty,ts,ts);
    }
  }else if(type==="mosaic"){
    var ms=16;for(var mx=0;mx<S;mx+=ms)for(var my=0;my<S;my+=ms){
      var mv=Math.random()*30-15;
      g.fillStyle="rgb("+Math.max(0,Math.min(255,R+mv))+","+Math.max(0,Math.min(255,G+mv))+","+Math.max(0,Math.min(255,B+mv))+")";
      g.fillRect(mx,my,ms-1,ms-1);
    }
  }else if(type==="stone"){
    for(var si=0;si<20;si++){
      var sx2=Math.random()*(S-60),sy2=Math.random()*(S-50),sw=30+Math.random()*50,sh=25+Math.random()*35;
      var sv=Math.random()*25-12;
      g.fillStyle="rgb("+Math.max(0,Math.min(255,R+sv))+","+Math.max(0,Math.min(255,G+sv))+","+Math.max(0,Math.min(255,B+sv))+")";
      g.fillRect(sx2,sy2,sw,sh);
      g.strokeStyle="rgba(0,0,0,0.1)";g.strokeRect(sx2,sy2,sw,sh);
    }
  }else{
    for(var nx=0;nx<S;nx+=6)for(var ny=0;ny<S;ny+=6){g.fillStyle="rgba(0,0,0,"+(Math.random()*.035)+")";g.fillRect(nx,ny,6,6)}
  }
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}
function makePlasterTex(){
  var c=document.createElement("canvas");c.width=256;c.height=256;
  var g=c.getContext("2d");g.fillStyle="#E8E0D4";g.fillRect(0,0,256,256);
  for(var i=0;i<800;i++){g.fillStyle="rgba(0,0,0,"+(Math.random()*.04)+")";g.fillRect(Math.random()*256,Math.random()*256,2+Math.random()*3,1+Math.random()*2)}
  var t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

// ─── Color / texture maps ────────────────────────────────────────────────────
var TT={living:"wood",dining:"wood",bedroom:"wood",office:"wood",studio:"wood",kitchen:"tile",bathroom:"mosaic",veranda:"stone",balcony:"stone",patio:"stone",hallway:"concrete",entrance:"concrete",passage:"concrete",staircase:"concrete",utility:"concrete",storage:"concrete",closet:"concrete",other:"concrete"};
var FC={living:0x8B6F4E,dining:0x7A5C3A,kitchen:0xBCB5A8,bedroom:0x9B7E5E,bathroom:0x5A7080,veranda:0x5A6E50,balcony:0x5A6E50,patio:0x5A6E50,hallway:0x7A7068,entrance:0x7A7068,passage:0x7A7068,staircase:0x605850,utility:0x585050,storage:0x585050,closet:0x585050,office:0x9B7E5E,studio:0x8A7A58,other:0x8A7A68};
var LC={living:"#4F8AFF",dining:"#4F8AFF",studio:"#4F8AFF",bedroom:"#8B5CF6",office:"#8B5CF6",kitchen:"#10B981",bathroom:"#3B82F6",veranda:"#10B981",balcony:"#10B981",patio:"#10B981",hallway:"#F59E0B",entrance:"#F59E0B",passage:"#F59E0B",staircase:"#F59E0B",utility:"#707080",storage:"#707080",closet:"#707080",other:"#8888A0"};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function box(w,h,d,mat){var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.castShadow=true;m.receiveShadow=true;return m}
function addAt(m,x,y,z){m.position.set(x,y,z);scene.add(m);return m}
function addGrp(g,x,y,z){g.position.set(x,y,z);scene.add(g);return g}
function cyl(rt,rb,h,seg,mat){var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg||12),mat);m.castShadow=true;return m}

// ─── Shared Materials ────────────────────────────────────────────────────────
var MAT={
  oak:new THREE.MeshStandardMaterial({color:0x5D4037,roughness:.5,metalness:.02}),
  walnut:new THREE.MeshStandardMaterial({color:0x4A2C0A,roughness:.55,metalness:.02}),
  darkWood:new THREE.MeshStandardMaterial({color:0x2A1A0E,roughness:.5,metalness:.03}),
  fabric:new THREE.MeshStandardMaterial({color:0x2C3E50,roughness:.92,metalness:0}),
  linen:new THREE.MeshStandardMaterial({color:0xECF0F1,roughness:.95,metalness:0}),
  pillow:new THREE.MeshStandardMaterial({color:0xF5F5F0,roughness:.9,metalness:0}),
  ceramic:new THREE.MeshStandardMaterial({color:0xFAFAFA,roughness:.1,metalness:.02}),
  chrome:new THREE.MeshStandardMaterial({color:0xD0D0D0,roughness:.06,metalness:.88}),
  marble:new THREE.MeshStandardMaterial({color:0xE8E0D0,roughness:.12,metalness:.05}),
  cabinet:new THREE.MeshStandardMaterial({color:0x1A2332,roughness:.6,metalness:.02}),
  leather:new THREE.MeshStandardMaterial({color:0x3E2723,roughness:.75,metalness:.02}),
  steel:new THREE.MeshStandardMaterial({color:0xB8B8C0,roughness:.18,metalness:.55}),
  mirror:new THREE.MeshStandardMaterial({color:0xB0C4DE,roughness:.02,metalness:.8}),
  glass:new THREE.MeshStandardMaterial({color:0xD8E8F0,roughness:.05,metalness:.1,transparent:true,opacity:.3}),
  accentRed:new THREE.MeshStandardMaterial({color:0xC0392B,roughness:.88,metalness:0}),
  accentBlue:new THREE.MeshStandardMaterial({color:0x2980B9,roughness:.88,metalness:0}),
  plantGreen:new THREE.MeshStandardMaterial({color:0x27AE60,roughness:.8,metalness:0}),
  potBrown:new THREE.MeshStandardMaterial({color:0x6B4226,roughness:.7,metalness:.02}),
};

// ─── Furniture Creators ──────────────────────────────────────────────────────
function createSofa(sw,sd){
  var g=new THREE.Group();
  var seatH=.2,seatY=.32,armW=.12,backH=.38;
  // Seat cushion
  var seat=box(sw,seatH,sd*.55,MAT.fabric);seat.position.set(0,seatY,sd*.05);g.add(seat);
  // Back cushion
  var back=box(sw-.06,backH,.12,MAT.fabric);back.position.set(0,seatY+seatH/2+backH/2-0.02,-sd*.2);g.add(back);
  // Left arm
  var arm=box(armW,.22,sd*.55,MAT.fabric);arm.position.set(-sw/2+armW/2,seatY+.02,sd*.05);g.add(arm);
  // Right arm
  var arm2=arm.clone();arm2.position.x=sw/2-armW/2;g.add(arm2);
  // Throw pillows (bold accent colors)
  var tp=box(.28,.14,.08,MAT.accentRed);tp.position.set(-sw*.3,seatY+seatH/2+.08,-sd*.12);tp.rotation.x=-.15;g.add(tp);
  var tp2=box(.28,.14,.08,MAT.accentBlue);tp2.position.set(sw*.3,seatY+seatH/2+.08,-sd*.12);tp2.rotation.x=-.15;g.add(tp2);
  // Wooden legs (tapered)
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.025,.018,.14,8,MAT.walnut);
    leg.position.set(p[0]*(sw/2-.08),.07,p[1]*(sd*.2)+sd*.05);g.add(leg);
  });
  return g;
}

function createCoffeeTable(tw,td){
  var g=new THREE.Group();
  // Table top (rounded edges effect via slightly smaller bottom)
  var top=box(tw,.035,td,MAT.oak);top.position.set(0,.42,0);g.add(top);
  // Shelf below
  var shelf=box(tw-.08,.02,td-.08,MAT.oak);shelf.position.set(0,.15,0);shelf.receiveShadow=true;g.add(shelf);
  // Hairpin legs (4 metal legs)
  var legM=MAT.steel;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.012,.012,.4,6,legM);
    leg.position.set(p[0]*(tw/2-.06),.21,p[1]*(td/2-.06));g.add(leg);
  });
  return g;
}

function createBed(bw,bd){
  var g=new THREE.Group();
  // Frame base
  var frame=box(bw+.06,.08,bd+.06,MAT.oak);frame.position.set(0,.22,0);g.add(frame);
  // Mattress
  var matt=box(bw,.2,bd,MAT.linen);matt.position.set(0,.36,0);g.add(matt);
  // Headboard (paneled)
  var hb=box(bw+.08,.7,.05,MAT.oak);hb.position.set(0,.6,-bd/2+.025);g.add(hb);
  // Headboard panel inset
  var panel=box(bw-.12,.5,.02,new THREE.MeshStandardMaterial({color:0x9A7E58,roughness:.45}));
  panel.position.set(0,.58,-bd/2+.06);g.add(panel);
  // Pillows (2 fluffy)
  var pw=bw*.33,ph=.1,pd=.28;
  var p1=box(pw,ph,pd,MAT.pillow);p1.position.set(-bw*.2,.5,-bd/2+pd/2+.08);p1.rotation.x=-.08;g.add(p1);
  var p2=p1.clone();p2.position.x=bw*.2;g.add(p2);
  // Duvet fold line (thin strip across the bed)
  var duvet=box(bw-.04,.03,bd*.55,new THREE.MeshStandardMaterial({color:0xE8E4DC,roughness:.9}));
  duvet.position.set(0,.47,bd*.1);g.add(duvet);
  // Legs
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.03,.03,.18,8,MAT.oak);
    leg.position.set(p[0]*(bw/2),.09,p[1]*(bd/2));g.add(leg);
  });
  return g;
}

function createNightstand(){
  var g=new THREE.Group();
  var body=box(.38,.35,.32,MAT.oak);body.position.set(0,.295,0);g.add(body);
  // Drawer face
  var drawer=box(.32,.12,.01,new THREE.MeshStandardMaterial({color:0x7A6040,roughness:.45}));
  drawer.position.set(0,.3,.165);g.add(drawer);
  // Handle
  var handle=cyl(.008,.008,.08,6,MAT.chrome);handle.rotation.z=Math.PI/2;
  handle.position.set(0,.3,.18);g.add(handle);
  // Legs
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.015,.015,.12,6,MAT.oak);
    leg.position.set(p[0]*.15,.06,p[1]*.12);g.add(leg);
  });
  return g;
}

function createDiningTable(tw,td){
  var g=new THREE.Group();
  var top=box(tw,.04,td,MAT.walnut);top.position.set(0,.74,0);g.add(top);
  // Tapered legs
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.025,.02,.7,8,MAT.walnut);
    leg.position.set(p[0]*(tw/2-.08),.35,p[1]*(td/2-.08));g.add(leg);
  });
  return g;
}

function createChair(rot){
  var g=new THREE.Group();
  var seat=box(.38,.03,.38,MAT.walnut);seat.position.set(0,.44,0);g.add(seat);
  var back=box(.38,.38,.03,MAT.walnut);back.position.set(0,.66,-.17);g.add(back);
  // Spindles in the back (3 vertical rods)
  [-1,0,1].forEach(function(i){
    var rod=cyl(.01,.01,.3,6,MAT.walnut);rod.position.set(i*.1,.6,-.17);g.add(rod);
  });
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function(p){
    var leg=cyl(.015,.012,.44,6,MAT.walnut);
    leg.position.set(p[0]*.14,.22,p[1]*.14);g.add(leg);
  });
  if(rot)g.rotation.y=rot;
  return g;
}

function createToilet(){
  var g=new THREE.Group();
  // Bowl (rounded cylinder)
  var bowl=cyl(.17,.15,.32,16,MAT.ceramic);bowl.position.set(0,.16,.08);g.add(bowl);
  // Seat rim
  var rim=new THREE.Mesh(new THREE.TorusGeometry(.15,.025,8,16),MAT.ceramic);
  rim.rotation.x=-Math.PI/2;rim.position.set(0,.33,.08);g.add(rim);
  // Tank
  var tank=box(.34,.32,.14,MAT.ceramic);tank.position.set(0,.38,-.14);g.add(tank);
  // Tank lid
  var lid=box(.36,.03,.16,MAT.ceramic);lid.position.set(0,.555,-.14);g.add(lid);
  // Flush handle
  var handle=cyl(.008,.008,.06,6,MAT.chrome);handle.rotation.z=Math.PI/2;
  handle.position.set(.16,.52,-.14);g.add(handle);
  return g;
}

function createVanity(vw){
  var g=new THREE.Group();
  // Cabinet body
  var cab=box(vw,.48,.38,MAT.cabinet);cab.position.set(0,.24,0);g.add(cab);
  // Countertop
  var top=box(vw+.02,.03,.4,MAT.marble);top.position.set(0,.495,0);g.add(top);
  // Sink basin (recessed)
  var basin=cyl(.12,.14,.04,16,MAT.ceramic);basin.position.set(0,.48,.02);g.add(basin);
  // Faucet stem
  var stem=cyl(.01,.01,.18,6,MAT.chrome);stem.position.set(0,.58,-.12);g.add(stem);
  // Faucet spout
  var spout=cyl(.008,.008,.1,6,MAT.chrome);spout.rotation.z=Math.PI/2.5;
  spout.position.set(0,.66,-.06);g.add(spout);
  // Handles
  var hL=cyl(.006,.006,.04,6,MAT.chrome);hL.rotation.z=Math.PI/2;hL.position.set(-.06,.6,-.12);g.add(hL);
  var hR=hL.clone();hR.position.x=.06;g.add(hR);
  return g;
}

function createKitchenCounter(kw,kd){
  var g=new THREE.Group();
  // Base cabinet (with door lines)
  var base=box(kw,.82,kd,MAT.cabinet);base.position.set(0,.41,0);g.add(base);
  // Door line accents (vertical grooves)
  var doorW=kw/Math.max(2,Math.floor(kw/.5));
  for(var di=0;di<Math.floor(kw/doorW);di++){
    var line=box(.01,.72,.01,new THREE.MeshStandardMaterial({color:0x1A1A28,roughness:.5}));
    line.position.set(-kw/2+doorW*(di+1),.41,kd/2+.005);g.add(line);
  }
  // Marble countertop
  var top=box(kw+.04,.04,kd+.02,MAT.marble);top.position.set(0,.86,0);g.add(top);
  // Backsplash
  var splash=box(kw,.2,.02,new THREE.MeshStandardMaterial({color:0xD8D0C4,roughness:.2}));
  splash.position.set(0,.94,-kd/2+.01);g.add(splash);
  // Sink
  var sinkBowl=box(.4,.02,.3,new THREE.MeshStandardMaterial({color:0xB0B0B8,roughness:.1,metalness:.4}));
  sinkBowl.position.set(kw*.15,.85,0);g.add(sinkBowl);
  // Stove burners (2)
  var brnM=new THREE.MeshStandardMaterial({color:0x1A1A1A,roughness:.25,metalness:.5});
  var brn1=cyl(.06,.06,.015,12,brnM);brn1.position.set(-kw*.2,.875,0);g.add(brn1);
  var brn2=cyl(.06,.06,.015,12,brnM);brn2.position.set(-kw*.2+.2,.875,0);g.add(brn2);
  // Handles on cabinet doors
  for(var hi=0;hi<Math.min(3,Math.floor(kw/.6));hi++){
    var hdl=cyl(.006,.006,.06,6,MAT.chrome);hdl.rotation.z=Math.PI/2;
    hdl.position.set(-kw/2+.3+hi*(kw/3),.55,kd/2+.01);g.add(hdl);
  }
  return g;
}

function createFridge(){
  var g=new THREE.Group();
  // Body
  var body=box(.6,1.7,.55,MAT.steel);body.position.set(0,.85,0);g.add(body);
  // Door split line
  var split=box(.58,.01,.01,new THREE.MeshStandardMaterial({color:0x888890,roughness:.3}));
  split.position.set(0,.58,.28);g.add(split);
  // Handles
  var hdl=cyl(.01,.01,.25,6,MAT.chrome);hdl.position.set(.22,1.2,.3);g.add(hdl);
  var hdl2=cyl(.01,.01,.18,6,MAT.chrome);hdl2.position.set(.22,.38,.3);g.add(hdl2);
  return g;
}

function createOfficeDesk(dw,dd){
  var g=new THREE.Group();
  var top=box(dw,.035,dd,MAT.oak);top.position.set(0,.73,0);g.add(top);
  // Metal frame legs (L-shape sides)
  var legM=MAT.steel;
  var legV=box(.04,.7,.04,legM);
  addLeg(-dw/2+.04);addLeg(dw/2-.04);
  function addLeg(x){
    var v=legV.clone();v.position.set(x,.35,dd/2-.04);g.add(v);
    var v2=legV.clone();v2.position.set(x,.35,-dd/2+.04);g.add(v2);
    var h=box(.04,.04,dd-.04,legM);h.position.set(x,.04,0);g.add(h);
  }
  return g;
}

function createOfficeChair(){
  var g=new THREE.Group();
  // Seat
  var seat=box(.42,.06,.4,MAT.leather);seat.position.set(0,.46,0);g.add(seat);
  // Back (curved via angled box)
  var back=box(.4,.4,.04,MAT.leather);back.position.set(0,.72,-.18);back.rotation.x=.08;g.add(back);
  // Center pole
  var pole=cyl(.025,.025,.22,8,MAT.chrome);pole.position.set(0,.32,0);g.add(pole);
  // Star base (5 arms)
  for(var ai=0;ai<5;ai++){
    var ang=ai*(Math.PI*2/5);
    var arm=box(.22,.02,.03,MAT.chrome);
    arm.position.set(Math.sin(ang)*.12,.04,Math.cos(ang)*.12);
    arm.rotation.y=ang;g.add(arm);
    // Caster wheel
    var wh=cyl(.015,.015,.02,8,new THREE.MeshStandardMaterial({color:0x333333,roughness:.7}));
    wh.position.set(Math.sin(ang)*.22,.015,Math.cos(ang)*.22);g.add(wh);
  }
  return g;
}

function createRug(rw,rd,pattern){
  var rc=document.createElement("canvas");rc.width=128;rc.height=128;
  var rg=rc.getContext("2d");
  if(pattern==="persian"){
    rg.fillStyle="#5C3D2E";rg.fillRect(0,0,128,128);
    rg.strokeStyle="#8B6C4B";rg.lineWidth=8;rg.strokeRect(8,8,112,112);
    rg.strokeStyle="#A08050";rg.lineWidth=3;rg.strokeRect(16,16,96,96);
    rg.strokeStyle="#C09860";rg.lineWidth=1.5;rg.strokeRect(24,24,80,80);
    // Diamond center
    rg.strokeStyle="#B89060";rg.lineWidth=2;
    rg.beginPath();rg.moveTo(64,32);rg.lineTo(96,64);rg.lineTo(64,96);rg.lineTo(32,64);rg.closePath();rg.stroke();
  }else{
    rg.fillStyle="#D8D0C0";rg.fillRect(0,0,128,128);
    for(var ri=0;ri<128;ri+=8){rg.fillStyle="rgba(0,0,0,"+(Math.random()*.04)+")";rg.fillRect(0,ri,128,4)}
  }
  var rTex=new THREE.CanvasTexture(rc);
  var rug=new THREE.Mesh(new THREE.PlaneGeometry(rw,rd),new THREE.MeshStandardMaterial({map:rTex,roughness:.92}));
  rug.rotation.x=-Math.PI/2;rug.receiveShadow=true;
  return rug;
}

// ─── Derive x,y for each room (backward compat) ─────────────────────────────
D.rooms.forEach(function(r){
  if(r.x===undefined)r.x=r.center[0]-r.width/2;
  if(r.y===undefined)r.y=r.center[1]-r.depth/2;
});

// ─── Ground plane (dark with subtle sheen) ──────────────────────────────────
var gndC=document.createElement("canvas");gndC.width=512;gndC.height=512;
var gndG=gndC.getContext("2d");
var gndGrad=gndG.createRadialGradient(256,256,0,256,256,360);
gndGrad.addColorStop(0,"#1A1A28");gndGrad.addColorStop(1,"#0E0E18");
gndG.fillStyle=gndGrad;gndG.fillRect(0,0,512,512);
for(var gi2=0;gi2<600;gi2++){gndG.fillStyle="rgba(255,255,255,"+(Math.random()*.012)+")";gndG.fillRect(Math.random()*512,Math.random()*512,2+Math.random()*3,1+Math.random()*2)}
var gndTex=new THREE.CanvasTexture(gndC);gndTex.wrapS=gndTex.wrapT=THREE.RepeatWrapping;gndTex.repeat.set(3,3);
var gnd=new THREE.Mesh(new THREE.PlaneGeometry(BW+20,BD+20),new THREE.MeshStandardMaterial({map:gndTex,color:0x14141E,roughness:.92,metalness:.02}));
gnd.rotation.x=-Math.PI/2;gnd.position.set(CX,-.16,CZ);gnd.receiveShadow=true;scene.add(gnd);

// ─── Subtle grid helper ──────────────────────────────────────────────────────
var gridSize=Math.ceil(Math.max(BW,BD)/2)*2+8;
var grid=new THREE.GridHelper(gridSize,gridSize,0x1E1E30,0x1E1E30);
grid.position.set(CX,-.14,CZ);grid.material.opacity=0.25;grid.material.transparent=true;scene.add(grid);

// ─── Building floor / image texture ─────────────────────────────────────────
if(HAS_IMG){
var imgLoader=new THREE.TextureLoader();imgLoader.load(IMG_SRC,function(tex){tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;
var imgFloor=new THREE.Mesh(new THREE.PlaneGeometry(BW,BD),new THREE.MeshStandardMaterial({map:tex,roughness:.5}));
imgFloor.rotation.x=-Math.PI/2;imgFloor.position.set(CX,.01,CZ);imgFloor.receiveShadow=true;scene.add(imgFloor);});
var slab=box(BW+.2,.12,BD+.2,new THREE.MeshStandardMaterial({color:0x303040,roughness:.7,metalness:.05}));
slab.position.set(CX,-.06,CZ);slab.receiveShadow=true;scene.add(slab);
// Slab edge bevel strip
var slabEdge=box(BW+.3,.02,BD+.3,new THREE.MeshStandardMaterial({color:0x404050,roughness:.4,metalness:.1}));
slabEdge.position.set(CX,.005,CZ);scene.add(slabEdge);
} else if(isNonRect){
var slabShape=new THREE.Shape();
var ol=D.buildingOutline;
slabShape.moveTo(ol[0][0],-ol[0][1]);
for(var si=1;si<ol.length;si++) slabShape.lineTo(ol[si][0],-ol[si][1]);
slabShape.closePath();
var slabGeo=new THREE.ShapeGeometry(slabShape);
var slabM=new THREE.Mesh(slabGeo,new THREE.MeshStandardMaterial({color:0x2A2A35,roughness:.9}));
slabM.rotation.x=-Math.PI/2;slabM.position.y=-.075;slabM.receiveShadow=true;scene.add(slabM);
} else {
var slab=box(BW+.2,.15,BD+.2,new THREE.MeshStandardMaterial({color:0x303040,roughness:.7,metalness:.05}));
slab.position.set(CX,-.075,CZ);slab.receiveShadow=true;scene.add(slab);
var slabEdge2=box(BW+.3,.02,BD+.3,new THREE.MeshStandardMaterial({color:0x404050,roughness:.4,metalness:.1}));
slabEdge2.position.set(CX,.005,CZ);scene.add(slabEdge2);
}

// ─── Floor plan image overlay (subtle ghost of original plan) ────────────────
if(HAS_IMG){
  var tl=new THREE.TextureLoader();
  tl.load(IMG_SRC,function(tex){
    tex.minFilter=THREE.LinearFilter;
    var og=new THREE.PlaneGeometry(BW,BD);
    var om=new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:0.08,depthWrite:false,side:THREE.DoubleSide});
    var ov=new THREE.Mesh(og,om);
    ov.rotation.x=-Math.PI/2;ov.position.set(CX,0.02,CZ);
    scene.add(ov);
  });
}

// ─── Room floors, labels, furniture ──────────────────────────────────────────
var rmM=[]; // room floor meshes for raycasting
var labels=[]; // label sprites for toggle
var pTex=makePlasterTex();

D.rooms.forEach(function(r){
  var rx=r.x,ry=r.y,w=r.width,d=r.depth;
  var cx=rx+w/2,cz=ry+d/2;
  var area=r.area||(w*d);
  var floorHex=FC[r.type]||0xA89888;
  console.log("[IFRAME] Floor:",r.name,"type:",r.type,"color:#"+floorHex.toString(16));

  // Room floor: polygon (SVG) → THREE.Shape, image → invisible target, else → textured rect
  var fl;
  if(r.polygon&&r.polygon.length>=3){
    var roomShape=new THREE.Shape();
    roomShape.moveTo(r.polygon[0][0],-r.polygon[0][1]);
    for(var pi=1;pi<r.polygon.length;pi++) roomShape.lineTo(r.polygon[pi][0],-r.polygon[pi][1]);
    roomShape.closePath();
    var fTex=makeFloorTex(TT[r.type]||"concrete",FC[r.type]||0xC0B8A8);
    fTex.repeat.set(w/3,d/3);
    fl=new THREE.Mesh(new THREE.ShapeGeometry(roomShape),new THREE.MeshStandardMaterial({map:fTex,roughness:.7,side:THREE.DoubleSide}));
    fl.rotation.x=-Math.PI/2;fl.position.y=.005;fl.receiveShadow=true;
  }else if(HAS_IMG){
    fl=new THREE.Mesh(new THREE.PlaneGeometry(w-.04,d-.04),new THREE.MeshBasicMaterial({transparent:true,opacity:0,side:THREE.DoubleSide}));
    fl.rotation.x=-Math.PI/2;fl.position.set(cx,.005,cz);fl.receiveShadow=true;
  }else{
    var fTex2=makeFloorTex(TT[r.type]||"concrete",FC[r.type]||0xC0B8A8);
    fTex2.repeat.set(w/3,d/3);
    fl=new THREE.Mesh(new THREE.PlaneGeometry(w-.04,d-.04),new THREE.MeshStandardMaterial({map:fTex2,roughness:.7}));
    fl.rotation.x=-Math.PI/2;fl.position.set(cx,.005,cz);fl.receiveShadow=true;
  }
  fl.userData={room:r,area:area,cx:cx,cz:cz};rmM.push(fl);scene.add(fl);

  if(!HAS_IMG){
  // Area watermark on floor
  var ac=document.createElement("canvas");ac.width=256;ac.height=128;
  var ag=ac.getContext("2d");
  ag.font="bold 48px -apple-system,sans-serif";ag.textAlign="center";
  ag.fillStyle="rgba(255,255,255,0.06)";
  ag.fillText(area.toFixed(1)+" m\\u00b2",128,75);
  var aS=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(ac),transparent:true,depthTest:false}));
  aS.position.set(cx,.02,cz);aS.scale.set(w*.7,d*.35,1);scene.add(aS);
  }

  // Frosted-glass label — scaled to room size, rounded corners, accent glow
  var labelScale=Math.min(1,Math.min(w,d)/2.5);
  var lc=document.createElement("canvas");lc.width=360;lc.height=110;
  var lg=lc.getContext("2d");
  var bc=LC[r.type]||"#8888A0";
  // Rounded rect background with frosted glass
  var lRad=14;
  lg.beginPath();
  lg.moveTo(lRad,0);lg.lineTo(360-lRad,0);lg.quadraticCurveTo(360,0,360,lRad);
  lg.lineTo(360,110-lRad);lg.quadraticCurveTo(360,110,360-lRad,110);
  lg.lineTo(lRad,110);lg.quadraticCurveTo(0,110,0,110-lRad);
  lg.lineTo(0,lRad);lg.quadraticCurveTo(0,0,lRad,0);
  lg.closePath();
  lg.fillStyle="rgba(10,12,20,0.82)";lg.fill();
  // Subtle border
  lg.strokeStyle="rgba(255,255,255,0.1)";lg.lineWidth=1.5;lg.stroke();
  // Accent bar (left side, rounded)
  lg.fillStyle=bc;
  lg.beginPath();lg.moveTo(0,lRad);lg.lineTo(0,110-lRad);lg.quadraticCurveTo(0,110,lRad,110);
  lg.lineTo(5,110);lg.lineTo(5,0);lg.lineTo(lRad,0);lg.quadraticCurveTo(0,0,0,lRad);
  lg.closePath();lg.fill();
  // Top glow accent
  var glowGrad=lg.createLinearGradient(0,0,360,0);
  glowGrad.addColorStop(0,bc+"30");glowGrad.addColorStop(.5,bc+"08");glowGrad.addColorStop(1,"transparent");
  lg.fillStyle=glowGrad;lg.fillRect(0,0,360,2);
  // Truncate long names
  var dispName=r.name.length>18?r.name.substring(0,16)+"..":r.name;
  lg.font="bold 21px -apple-system,BlinkMacSystemFont,sans-serif";lg.fillStyle="#F0F0F5";lg.fillText(dispName,16,32);
  lg.font="13px -apple-system,sans-serif";lg.fillStyle="#9898B0";
  lg.fillText(w.toFixed(1)+"m \\u00d7 "+d.toFixed(1)+"m \\u00b7 "+area.toFixed(1)+" m\\u00b2",16,56);
  lg.font="600 12px -apple-system,sans-serif";lg.fillStyle=bc;
  var typeIcon={living:"\\u25CB",bedroom:"\\u263E",kitchen:"\\u25A3",bathroom:"\\u25C9",dining:"\\u25CB",hallway:"\\u25B7",entrance:"\\u25B7",staircase:"\\u25B2",office:"\\u25A1",veranda:"\\u2606",balcony:"\\u2606",patio:"\\u2606"};
  var tIc=typeIcon[r.type]||"\\u25CB";
  lg.fillText(tIc+" "+r.type.charAt(0).toUpperCase()+r.type.slice(1),16,80);
  var lS=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(lc),transparent:true,depthTest:false}));
  lS.position.set(cx,WH+.35+labelScale*.3,cz);
  lS.scale.set(3.4*labelScale,1.04*labelScale,1);
  scene.add(lS);labels.push(lS);

  // ─── Furniture ─────────────────────────────────────────────────────────────
  if(Math.min(w,d)<1.6)return;

  if(r.type==="living"||r.type==="studio"){
    // Sofa (facing center)
    var sofaW=Math.min(1.8,w*.45);
    var sofa=createSofa(sofaW,.7);
    addGrp(sofa,cx,0,cz-d*.22);
    // Coffee table (hairpin legs)
    var ct=createCoffeeTable(Math.min(.7,w*.25),Math.min(.45,d*.15));
    addGrp(ct,cx,0,cz+.15);
    // TV console (low dark box)
    addAt(box(Math.min(w*.4,1.2),.3,.28,MAT.darkWood),cx,.15,cz+d*.3);
    // Rug under seating area
    var rugW=Math.min(w*.55,2.0),rugD=Math.min(d*.35,1.4);
    var rug=createRug(rugW,rugD,"persian");
    rug.position.set(cx,.007,cz);scene.add(rug);
    // Plant in corner
    if(w>2.2){
      var pot=cyl(.1,.08,.18,8,MAT.potBrown);pot.position.set(cx+w*.35,.09,cz-d*.35);scene.add(pot);
      var leaves=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),MAT.plantGreen);
      leaves.position.set(cx+w*.35,.32,cz-d*.35);leaves.castShadow=true;scene.add(leaves);
    }
  }
  if(r.type==="bedroom"){
    // Bed with headboard and pillows
    var bedW=Math.min(1.5,w*.45),bedD=Math.min(1.9,d*.5);
    var bed=createBed(bedW,bedD);
    addGrp(bed,cx,0,cz);
    // Nightstand(s)
    if(w>2.5){
      var ns=createNightstand();addGrp(ns,cx+bedW/2+.3,0,cz-bedD/2+.25);
    }
    if(w>3.2){
      var ns2=createNightstand();addGrp(ns2,cx-bedW/2-.3,0,cz-bedD/2+.25);
    }
    // Bedroom rug
    var bRug=createRug(Math.min(w*.5,1.8),Math.min(d*.3,1.0),"minimal");
    bRug.position.set(cx,.007,cz+bedD/2+.2);scene.add(bRug);
    // Wall art (picture frame above bed)
    var artFrame=box(.5,.4,.02,new THREE.MeshStandardMaterial({color:0x1A1A1A,roughness:.3}));
    artFrame.position.set(cx,1.6,cz-bedD/2+.02);scene.add(artFrame);
    var artCanvas=box(.44,.34,.01,new THREE.MeshStandardMaterial({color:0x3498DB,roughness:.85}));
    artCanvas.position.set(cx,1.6,cz-bedD/2+.035);scene.add(artCanvas);
  }
  if(r.type==="dining"){
    // Dining table with legs
    var tW2=Math.min(1.2,w*.4),tD2=Math.min(.8,d*.3);
    var table=createDiningTable(tW2,tD2);
    addGrp(table,cx,0,cz);
    // 4 chairs around table
    var chairOff=.45;
    var c1=createChair(0);addGrp(c1,cx-tW2*.35,0,cz-tD2/2-chairOff);
    var c2=createChair(0);addGrp(c2,cx+tW2*.35,0,cz-tD2/2-chairOff);
    var c3=createChair(Math.PI);addGrp(c3,cx-tW2*.35,0,cz+tD2/2+chairOff);
    var c4=createChair(Math.PI);addGrp(c4,cx+tW2*.35,0,cz+tD2/2+chairOff);
  }
  if(r.type==="kitchen"){
    // Counter with marble top, backsplash, sink, burners, handles
    var kW=Math.min(w*.6,2.2),kD=.52;
    var counter=createKitchenCounter(kW,kD);
    addGrp(counter,cx,0,cz-d*.3);
    // Fridge (tall stainless steel)
    if(w>2.2){
      var fridge=createFridge();
      addGrp(fridge,cx+kW/2+.5,0,cz-d*.3);
    }
  }
  if(r.type==="bathroom"){
    // Toilet with tank, seat rim, flush handle
    var toilet=createToilet();
    addGrp(toilet,cx+w*.2,0,cz-d*.25);
    // Vanity with sink, faucet, mirror
    var vanity=createVanity(Math.min(.55,w*.3));
    addGrp(vanity,cx-w*.15,0,cz+d*.2);
    // Mirror
    if(d>1.8){
      addAt(box(Math.min(.55,w*.3),.45,.02,MAT.mirror),cx-w*.15,1.35,cz+d*.35);
    }
  }
  if(r.type==="veranda"||r.type==="balcony"||r.type==="patio"){
    // Railing with posts and top rail
    var rlM=MAT.steel;
    var nP=Math.min(8,Math.max(2,Math.floor(w/.4)));
    for(var pi=0;pi<nP;pi++){
      var post=cyl(.015,.015,.9,6,rlM);
      post.position.set(cx-w*.4+pi*(w*.8/Math.max(1,nP-1)),.45,cz+d*.38);scene.add(post);
    }
    addAt(box(w*.82,.025,.025,rlM),cx,.9,cz+d*.38);
    // Second rail at mid-height
    addAt(box(w*.82,.02,.02,rlM),cx,.45,cz+d*.38);
  }
  if(r.type==="office"){
    // Desk with metal frame
    var desk=createOfficeDesk(Math.min(1.2,w*.45),Math.min(.6,d*.25));
    addGrp(desk,cx,0,cz-.1);
    // Office chair
    var oChair=createOfficeChair();
    addGrp(oChair,cx,0,cz+d*.15);
    // Monitor
    if(w>2.2){
      addAt(box(.5,.3,.02,new THREE.MeshStandardMaterial({color:0x0A0A12,roughness:.3})),cx,.95,cz-.28);
      // Monitor stand
      addAt(box(.08,.12,.08,MAT.steel),cx,.78,cz-.26);
    }
  }
  if(r.type==="staircase"){
    var nSteps=Math.min(10,Math.floor(d/.25));
    var stepW=Math.min(w*.8,1.2),stepD=d/nSteps;
    var stpM=MAT.oak;
    for(var si2=0;si2<nSteps;si2++){
      var sh2=(si2+1)*WH/nSteps;
      addAt(box(stepW,sh2,stepD-.02,stpM),cx,sh2/2,cz-d/2+stepD*si2+stepD/2);
    }
    // Stair railing
    addAt(box(.03,WH,.03,MAT.steel),cx-stepW/2-.05,WH/2,cz-d/2);
    addAt(box(.03,WH,.03,MAT.steel),cx-stepW/2-.05,WH/2,cz+d/2);
    addAt(box(.03,.03,d,MAT.oak),cx-stepW/2-.05,WH-.03,cz);
  }
});

// ─── WALLS ──────────────────────────────────────────────────────────────────
if(HAS_SVG_WALLS){
// Render wall segments from SVG parsing
var svgWallMat=new THREE.MeshStandardMaterial({map:makePlasterTex(),color:0xE8E0D4,roughness:.85,metalness:.01});
var svgIntMat=new THREE.MeshStandardMaterial({map:makePlasterTex(),color:0xEDE6DA,roughness:.88,metalness:.01});
for(var wi=0;wi<D.walls.length;wi++){
  var ww=D.walls[wi];
  if(!ww.start||!ww.end) continue;
  if(isNaN(ww.start[0])||isNaN(ww.start[1])||isNaN(ww.end[0])||isNaN(ww.end[1])) continue;
  var wdx=ww.end[0]-ww.start[0],wdz=ww.end[1]-ww.start[1];
  var wLen=Math.sqrt(wdx*wdx+wdz*wdz);
  if(wLen<0.3||isNaN(wLen)) continue; // skip fragments shorter than 0.3m
  var wAng=Math.atan2(wdx,wdz);
  var wThk=Math.max(0.08,ww.thickness||0.15);
  var wMat2=ww.type==='exterior'?svgWallMat:svgIntMat;
  var wm4=box(wThk,WH,wLen,wMat2);
  wm4.position.set((ww.start[0]+ww.end[0])/2,WH/2,(ww.start[1]+ww.end[1])/2);
  wm4.rotation.y=wAng;
  scene.add(wm4);
}
} else if(HAS_IMG){
var wallImg2=new Image();wallImg2.onload=function(){
var cv=document.createElement("canvas");var sc2=200/Math.max(wallImg2.width,wallImg2.height);
cv.width=Math.floor(wallImg2.width*sc2);cv.height=Math.floor(wallImg2.height*sc2);
var ctx=cv.getContext("2d");ctx.drawImage(wallImg2,0,0,cv.width,cv.height);
var imgD=ctx.getImageData(0,0,cv.width,cv.height);var px=imgD.data;
var cW=BW/cv.width,cD=BD/cv.height;
var wMat=new THREE.MeshStandardMaterial({color:0xE8E0D4,roughness:.85,metalness:.01});
for(var wy=0;wy<cv.height;wy++){var rs=-1;
for(var wx=0;wx<=cv.width;wx++){var iw=false;
if(wx<cv.width){var idx=(wy*cv.width+wx)*4;iw=(px[idx]+px[idx+1]+px[idx+2])/3<80;}
if(iw&&rs===-1){rs=wx;}else if(!iw&&rs!==-1){var rl=wx-rs;
if(rl>=2){var wm2=box(rl*cW,WH,cD*1.5,wMat);wm2.position.set((rs+rl/2)*cW,WH/2,wy*cD);scene.add(wm2);}
rs=-1;}}}
for(var wx2=0;wx2<cv.width;wx2++){var rs2=-1;
for(var wy2=0;wy2<=cv.height;wy2++){var iw2=false;
if(wy2<cv.height){var idx2=(wy2*cv.width+wx2)*4;iw2=(px[idx2]+px[idx2+1]+px[idx2+2])/3<80;}
if(iw2&&rs2===-1){rs2=wy2;}else if(!iw2&&rs2!==-1){var rl2=wy2-rs2;
if(rl2>=2){var wm3=box(cW*1.5,WH,rl2*cD,wMat);wm3.position.set(wx2*cW,WH/2,(rs2+rl2/2)*cD);scene.add(wm3);}
rs2=-1;}}}
};wallImg2.src=IMG_SRC;
} else {
var extMat=new THREE.MeshStandardMaterial({map:pTex,color:0xE8E0D4,roughness:.85,metalness:.01});
var intMat=new THREE.MeshStandardMaterial({map:pTex,color:0xEDE6DA,roughness:.88,metalness:.01});
var EWT=0.18,IWT=0.1,DGap=0.85,DHt=2.1;

function addWall(x,y2,z,w,h,d,mat){var m=box(w,h,d,mat);m.position.set(x,y2,z);scene.add(m)}

// Exterior: perimeter walls (polygon outline or 4 rectangular walls)
if(isNonRect){
var ol=D.buildingOutline;
for(var ei=0;ei<ol.length;ei++){
  var p1=ol[ei],p2=ol[(ei+1)%ol.length];
  var dx=p2[0]-p1[0],dz=p2[1]-p1[1];
  var segLen=Math.sqrt(dx*dx+dz*dz);
  if(segLen<0.01) continue;
  var ang=Math.atan2(dx,dz);
  var mx=(p1[0]+p2[0])/2,mz=(p1[1]+p2[1])/2;
  var wm=box(EWT,WH,segLen,extMat);
  wm.position.set(mx,WH/2,mz);
  wm.rotation.y=ang;
  scene.add(wm);
}
} else {
addWall(CX,WH/2,0,BW+EWT,WH,EWT,extMat);
addWall(CX,WH/2,BD,BW+EWT,WH,EWT,extMat);
addWall(0,WH/2,CZ,EWT,WH,BD,extMat);
addWall(BW,WH/2,CZ,EWT,WH,BD,extMat);
}

// Interior: walls between rooms that share an edge
var processed={};
for(var i=0;i<D.rooms.length;i++){
  for(var j=i+1;j<D.rooms.length;j++){
    var a=D.rooms[i],b=D.rooms[j];
    var ax=a.x,ay=a.y,aw=a.width,ad=a.depth;
    var bx=b.x,by=b.y,bw=b.width,bd=b.depth;
    var hasDoor=(a.adjacentRooms&&a.adjacentRooms.indexOf(b.name)>=0)||(b.adjacentRooms&&b.adjacentRooms.indexOf(a.name)>=0);

    var edges=[
      {wallX:ax+aw, check:Math.abs(ax+aw-bx)},
      {wallX:bx+bw, check:Math.abs(bx+bw-ax)}
    ];
    for(var ei=0;ei<edges.length;ei++){
      if(edges[ei].check<0.4){
        var wallX=edges[ei].wallX;
        var oTop=Math.max(ay,by),oBot=Math.min(ay+ad,by+bd);
        if(oBot>oTop+0.1){
          var key="v"+wallX.toFixed(1)+"_"+oTop.toFixed(1)+"_"+oBot.toFixed(1);
          if(!processed[key]){
            processed[key]=true;
            var wLen=oBot-oTop,wMid=(oTop+oBot)/2;
            if(hasDoor&&wLen>1.2){
              var halfLen=(wLen-DGap)/2;
              if(halfLen>0.1){
                addWall(wallX,WH/2,oTop+halfLen/2,IWT,WH,halfLen,intMat);
                addWall(wallX,WH/2,oBot-halfLen/2,IWT,WH,halfLen,intMat);
                var linH=WH-DHt;
                if(linH>0.05)addWall(wallX,DHt+linH/2,wMid,IWT,linH,DGap,intMat);
              }
            }else{
              addWall(wallX,WH/2,wMid,IWT,WH,wLen,intMat);
            }
          }
        }
      }
    }

    var hedges=[
      {wallZ:ay+ad, check:Math.abs(ay+ad-by)},
      {wallZ:by+bd, check:Math.abs(by+bd-ay)}
    ];
    for(var hi=0;hi<hedges.length;hi++){
      if(hedges[hi].check<0.4){
        var wallZ=hedges[hi].wallZ;
        var oLeft=Math.max(ax,bx),oRight=Math.min(ax+aw,bx+bw);
        if(oRight>oLeft+0.1){
          var key2="h"+wallZ.toFixed(1)+"_"+oLeft.toFixed(1)+"_"+oRight.toFixed(1);
          if(!processed[key2]){
            processed[key2]=true;
            var wLen2=oRight-oLeft,wMid2=(oLeft+oRight)/2;
            if(hasDoor&&wLen2>1.2){
              var halfLen2=(wLen2-DGap)/2;
              if(halfLen2>0.1){
                addWall(oLeft+halfLen2/2,WH/2,wallZ,halfLen2,WH,IWT,intMat);
                addWall(oRight-halfLen2/2,WH/2,wallZ,halfLen2,WH,IWT,intMat);
                var linH2=WH-DHt;
                if(linH2>0.05)addWall(wMid2,DHt+linH2/2,wallZ,DGap,linH2,IWT,intMat);
              }
            }else{
              addWall(wMid2,WH/2,wallZ,wLen2,WH,IWT,intMat);
            }
          }
        }
      }
    }
  }
}
}

// ─── Baseboards (subtle dark strip at wall base) ─────────────────────────────
var bbMat=new THREE.MeshStandardMaterial({color:0x4A4038,roughness:.6,metalness:.03});
var bbH=0.06,bbD=0.02;
if(HAS_SVG_WALLS){
for(var bi=0;bi<D.walls.length;bi++){
  var bw2=D.walls[bi];
  if(!bw2.start||!bw2.end)continue;
  var bdx=bw2.end[0]-bw2.start[0],bdz=bw2.end[1]-bw2.start[1];
  var bLen=Math.sqrt(bdx*bdx+bdz*bdz);
  if(bLen<0.3||isNaN(bLen))continue;
  var bAng=Math.atan2(bdx,bdz);
  var bb=box(bbD,bbH,bLen,bbMat);
  bb.position.set((bw2.start[0]+bw2.end[0])/2,bbH/2,(bw2.start[1]+bw2.end[1])/2);
  bb.rotation.y=bAng;scene.add(bb);
}
}else if(!HAS_IMG){
  // Baseboards on exterior perimeter
  if(!isNonRect){
    addAt(box(BW,bbH,bbD,bbMat),CX,bbH/2,0);
    addAt(box(BW,bbH,bbD,bbMat),CX,bbH/2,BD);
    addAt(box(bbD,bbH,BD,bbMat),0,bbH/2,CZ);
    addAt(box(bbD,bbH,BD,bbMat),BW,bbH/2,CZ);
  }
}

// ─── Crown Molding (thin dark strip at wall tops) ────────────────────────────
var cmMat=new THREE.MeshStandardMaterial({color:0x3A3430,roughness:.4,metalness:.06});
var cmH=0.04,cmD=0.03;
if(HAS_SVG_WALLS){
for(var ci=0;ci<D.walls.length;ci++){
  var cw=D.walls[ci];
  if(!cw.start||!cw.end)continue;
  var cdx=cw.end[0]-cw.start[0],cdz2=cw.end[1]-cw.start[1];
  var cLen=Math.sqrt(cdx*cdx+cdz2*cdz2);
  if(cLen<0.3||isNaN(cLen))continue;
  var cAng=Math.atan2(cdx,cdz2);
  var cm=box(cmD,cmH,cLen,cmMat);
  cm.position.set((cw.start[0]+cw.end[0])/2,WH-cmH/2,(cw.start[1]+cw.end[1])/2);
  cm.rotation.y=cAng;scene.add(cm);
}
}else if(!HAS_IMG){
  if(isNonRect){
    var ol2=D.buildingOutline;
    for(var ci2=0;ci2<ol2.length;ci2++){
      var cp1=ol2[ci2],cp2=ol2[(ci2+1)%ol2.length];
      var cdx2=cp2[0]-cp1[0],cdz3=cp2[1]-cp1[1];
      var csLen=Math.sqrt(cdx2*cdx2+cdz3*cdz3);
      if(csLen<0.01)continue;
      var csAng=Math.atan2(cdx2,cdz3);
      var csm=box(cmD+.01,cmH,csLen,cmMat);
      csm.position.set((cp1[0]+cp2[0])/2,WH-cmH/2,(cp1[1]+cp2[1])/2);
      csm.rotation.y=csAng;scene.add(csm);
    }
  }else{
    addAt(box(BW+EWT,cmH,cmD,cmMat),CX,WH-cmH/2,0);
    addAt(box(BW+EWT,cmH,cmD,cmMat),CX,WH-cmH/2,BD);
    addAt(box(cmD,cmH,BD,cmMat),0,WH-cmH/2,CZ);
    addAt(box(cmD,cmH,BD,cmMat),BW,WH-cmH/2,CZ);
  }
}

// ─── Window Glass Panes (on exterior walls) ──────────────────────────────────
var winMat=new THREE.MeshStandardMaterial({color:0xA0C8E8,roughness:.02,metalness:.1,transparent:true,opacity:.25,side:THREE.DoubleSide});
var winFrameMat=new THREE.MeshStandardMaterial({color:0x2A2A2A,roughness:.4,metalness:.3});
var winH=0.9,winBottom=1.0,winW=0.7;

function addWindow(wx,wz,rot){
  // Glass pane
  var glass=new THREE.Mesh(new THREE.PlaneGeometry(winW,winH),winMat);
  glass.position.set(wx,winBottom+winH/2,wz);
  glass.rotation.y=rot;scene.add(glass);
  // Frame (4 thin bars)
  var fT=0.02;
  var fTop=box(winW+fT*2,fT,fT,winFrameMat);fTop.position.set(wx,winBottom+winH,wz);fTop.rotation.y=rot;scene.add(fTop);
  var fBot=box(winW+fT*2,fT,fT,winFrameMat);fBot.position.set(wx,winBottom,wz);fBot.rotation.y=rot;scene.add(fBot);
  // Sill (slightly protruding ledge)
  var sill=box(winW+.08,.025,.06,winFrameMat);sill.position.set(wx,winBottom-.01,wz);sill.rotation.y=rot;scene.add(sill);
}

if(!HAS_SVG_WALLS&&!HAS_IMG&&!isNonRect){
  // Place windows on exterior walls — skip near corners
  var winSpacing=Math.max(winW+.8,2.0);
  // Front wall (z=0)
  for(var wx1=winSpacing/2;wx1<BW-winSpacing/2;wx1+=winSpacing){
    addWindow(wx1,-.09,0);
  }
  // Back wall (z=BD)
  for(var wx2=winSpacing/2;wx2<BW-winSpacing/2;wx2+=winSpacing){
    addWindow(wx2,BD+.09,0);
  }
  // Left wall (x=0)
  for(var wz1=winSpacing/2;wz1<BD-winSpacing/2;wz1+=winSpacing){
    addWindow(-.09,wz1,Math.PI/2);
  }
  // Right wall (x=BW)
  for(var wz2=winSpacing/2;wz2<BD-winSpacing/2;wz2+=winSpacing){
    addWindow(BW+.09,wz2,Math.PI/2);
  }
}

// ─── Camera Animation (800ms smooth transitions) ────────────────────────────
var cAnim=null;
function animTo(pos,tgt,dur){
  cAnim={sp:camera.position.clone(),ep:pos.clone(),st:controls.target.clone(),et:tgt.clone(),d:dur||800,t0:Date.now()};
}
function easeOut(t){return 1-Math.pow(1-t,3)}

// ─── Modes ───────────────────────────────────────────────────────────────────
var mode="top";
controls.enabled=false;
function setMode(m){
  mode=m;
  if(m==="top"){
    controls.enabled=false;
    animTo(new THREE.Vector3(CX,MXD*1.4,CZ+.01),new THREE.Vector3(CX,0,CZ),800);
  }else{
    controls.enabled=true;
    animTo(SP.clone(),new THREE.Vector3(CX,0,CZ),800);
  }
}
function resetCam(){
  mode="orbit";controls.enabled=true;
  animTo(SP.clone(),new THREE.Vector3(CX,0,CZ),800);
}

// ─── Label Toggle ────────────────────────────────────────────────────────────
var labelsOn=true;
function toggleLabels(){
  labelsOn=!labelsOn;
  for(var li=0;li<labels.length;li++){labels[li].visible=labelsOn}
}

// ─── PostMessage API (parent controls this iframe) ──────────────────────────
function handleCmd(d){
  switch(d.type){
    case "setTopView": setMode("top"); break;
    case "setPerspective": setMode("orbit"); break;
    case "setFrontView":
      controls.enabled=false;
      animTo(new THREE.Vector3(CX,WH*.5,BD+MXD*.7),new THREE.Vector3(CX,WH*.4,CZ),800);
      break;
    case "toggleLabels": toggleLabels(); break;
    case "reset": resetCam(); break;
    case "screenshot":
      renderer.render(scene,camera);
      var a=document.createElement("a");a.download="buildflow-3d.png";
      a.href=renderer.domElement.toDataURL("image/png");a.click();
      break;
    case "focusRoom":
      var fx=d.x!=null?d.x:CX,fz=d.z!=null?d.z:CZ,fs=d.distance||d.size||5;
      var fd=Math.max(fs,3)*1.2+2;
      controls.enabled=true;mode="orbit";
      animTo(new THREE.Vector3(fx+fd*.6,fd*.8,fz+fd*.6),new THREE.Vector3(fx,.5,fz),800);
      break;
  }
}
// Replace early queue listener with the real handler
window.addEventListener("message",function(ev){
  if(!ev.data||!ev.data.type)return;
  handleCmd(ev.data);
});
// Replay any commands queued while Three.js was loading
__sceneReady=true;
for(var qi=0;qi<__cmdQueue.length;qi++){handleCmd(__cmdQueue[qi])}
__cmdQueue=[];
try{parent.postMessage({type:'buildflow-ready'},'*')}catch(e){}

// ─── Global Controls API (fallback for cross-origin iframe issues) ───────────
window.buildflowControls={
  topView:function(){setMode("top")},
  perspective:function(){setMode("orbit")},
  frontView:function(){
    controls.enabled=false;
    animTo(new THREE.Vector3(CX,WH*.5,BD+MXD*.7),new THREE.Vector3(CX,WH*.4,CZ),800);
  },
  toggleLabels:function(){toggleLabels()},
  reset:function(){resetCam()},
  screenshot:function(){
    renderer.render(scene,camera);
    var a2=document.createElement("a");a2.download="buildflow-3d.png";
    a2.href=renderer.domElement.toDataURL("image/png");a2.click();
  },
  focusRoom:function(x,z,size){
    var fd=Math.max(size||5,3)*1.2+2;
    controls.enabled=true;mode="orbit";
    animTo(new THREE.Vector3(x+fd*.6,fd*.8,z+fd*.6),new THREE.Vector3(x,.5,z),800);
  }
};
console.log("[IFRAME] buildflowControls registered on window");

// ─── Raycaster / Interaction ─────────────────────────────────────────────────
var rc=new THREE.Raycaster(),mv=new THREE.Vector2();
var tip=document.getElementById("tip"),tN=document.getElementById("tN"),tD=document.getElementById("tD");
var hov=null,isDrag=false,dS={x:0,y:0},dDist=0;

renderer.domElement.addEventListener("mousedown",function(e){isDrag=true;dS.x=e.clientX;dS.y=e.clientY;dDist=0});
renderer.domElement.addEventListener("mousemove",function(e){
  if(isDrag)dDist=Math.hypot(e.clientX-dS.x,e.clientY-dS.y);
  mv.x=(e.clientX/innerWidth)*2-1;mv.y=-(e.clientY/innerHeight)*2+1;
  rc.setFromCamera(mv,camera);
  var hits=rc.intersectObjects(rmM);
  if(hits.length){
    var rm=hits[0].object;
    if(hov&&hov!==rm){hov.material.emissive.setHex(0);hov.material.emissiveIntensity=0}
    hov=rm;rm.material.emissive.setHex(0x1a2a4a);rm.material.emissiveIntensity=.25;
    var r=rm.userData.room,a2=rm.userData.area;
    tN.textContent=r.name;
    tD.innerHTML=r.type+" \\u2014 "+(r.dimensions||(r.width.toFixed(1)+"m \\u00d7 "+r.depth.toFixed(1)+"m"))+"<br>"+a2.toFixed(1)+" m\\u00b2";
    tip.style.display="block";tip.style.left=(e.clientX+14)+"px";tip.style.top=(e.clientY+14)+"px";
  }else{
    if(hov){hov.material.emissive.setHex(0);hov.material.emissiveIntensity=0;hov=null}
    tip.style.display="none";
  }
});
window.addEventListener("mouseup",function(){isDrag=false});

// Click to focus on room
renderer.domElement.addEventListener("click",function(){
  if(dDist>4)return;
  rc.setFromCamera(mv,camera);
  var hits=rc.intersectObjects(rmM);
  if(hits.length){
    var ud=hits[0].object.userData;
    var ccx=ud.cx,ccz=ud.cz;
    var r2=ud.room;
    var vd=Math.max(r2.width,r2.depth)*1.2+2;
    controls.enabled=true;mode="orbit";
    animTo(new THREE.Vector3(ccx+vd*.6,vd*.8,ccz+vd*.6),new THREE.Vector3(ccx,.5,ccz),800);
  }
});

// ─── Animate ─────────────────────────────────────────────────────────────────
function animate(){
  requestAnimationFrame(animate);
  if(cAnim){
    var t=Math.min(1,(Date.now()-cAnim.t0)/cAnim.d);
    var e2=easeOut(t);
    camera.position.lerpVectors(cAnim.sp,cAnim.ep,e2);
    controls.target.lerpVectors(cAnim.st,cAnim.et,e2);
    camera.lookAt(controls.target);
    if(t>=1){cAnim=null;controls.update()}
  }
  renderer.render(scene,camera);
}
console.log("[IFRAME] Three.js scene initialized. Rooms:",D.rooms.length,"Labels:",labels.length);
animate();
addEventListener("resize",function(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
<\/script>
</body>
</html>`;
}
