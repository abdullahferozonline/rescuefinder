const $ = id => document.getElementById(id);
let currentFix = null, mapData = null, mapTitle = "";
const FIX_KEY = "rescuefinder.lastFix.v1", MAP_KEY = "rescuefinder.geojson.v1", MAP_TITLE_KEY = "rescuefinder.mapTitle.v1";

function status(msg, bad=false){$("gpsStatus").innerHTML = `<span class="dot" style="background:${bad?'#ff8585':'#6ee7b7'}"></span>${escapeHtml(msg)}`;}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function fmt(n){return Number(n).toFixed(6);}
function renderFix(f){
  currentFix=f;$("lat").textContent=fmt(f.latitude);$("lon").textContent=fmt(f.longitude);
  $("accuracy").textContent=Number.isFinite(f.accuracy)?`±${Math.round(f.accuracy)} m`:"Unavailable";
  $("updated").textContent=new Date(f.timestamp||Date.now()).toLocaleString();
  $("emergencyMessage").value=`EMERGENCY: I may need help. My ${f.saved?'last known':'current'} coordinates are ${fmt(f.latitude)}, ${fmt(f.longitude)}. Accuracy: ${Number.isFinite(f.accuracy)?'about '+Math.round(f.accuracy)+' metres':'unknown'}. Time: ${new Date(f.timestamp||Date.now()).toISOString()}.`;
}
function saveFix(f){try{localStorage.setItem(FIX_KEY,JSON.stringify(f));}catch(e){}}
function loadFix(){try{const f=JSON.parse(localStorage.getItem(FIX_KEY));if(f&&Number.isFinite(f.latitude)&&Number.isFinite(f.longitude)){f.saved=true;renderFix(f);$("lastFix").textContent=`${fmt(f.latitude)}, ${fmt(f.longitude)} · ${new Date(f.timestamp).toLocaleString()}`;status("Showing last saved fix");}}catch(e){}}
function onLocation(p){const c=p.coords;const f={latitude:c.latitude,longitude:c.longitude,accuracy:c.accuracy,altitude:c.altitude,heading:c.heading,timestamp:p.timestamp||Date.now(),saved:false};renderFix(f);saveFix(f);$("lastFix").textContent=`${fmt(f.latitude)}, ${fmt(f.longitude)} · ${new Date(f.timestamp).toLocaleString()}`;status("GPS fix received");drawMap();}
function locate(){
 status("Requesting device location…");
 if(window.AndroidBridge && typeof AndroidBridge.getLocation==="function"){AndroidBridge.getLocation();return;}
 if(!navigator.geolocation){status("Location API unavailable. Use the Android APK or a supported browser.",true);return;}
 navigator.geolocation.getCurrentPosition(onLocation,e=>status(({1:"Location permission denied.",2:"Position unavailable. Try outdoors with a clear sky.",3:"Location request timed out."}[e.code]||e.message),true),{enableHighAccuracy:true,timeout:30000,maximumAge:0});
}
window.rescueLocationSuccess = (lat,lon,accuracy,altitude,heading,time) => onLocation({coords:{latitude:Number(lat),longitude:Number(lon),accuracy:Number(accuracy),altitude:Number(altitude),heading:Number(heading)},timestamp:Number(time)||Date.now()});
window.rescueLocationError = msg => status(String(msg||"Unable to get location"),true);
$("locateBtn").addEventListener("click",locate);
$("copyBtn").addEventListener("click",async()=>{if(!currentFix){status("Get a location first",true);return;}const s=`${fmt(currentFix.latitude)}, ${fmt(currentFix.longitude)}`;try{await navigator.clipboard.writeText(s);status("Coordinates copied");}catch(e){$("emergencyMessage").value=s;$("emergencyMessage").select();status("Select and copy the coordinates");}});
$("prepareBtn").addEventListener("click",()=>{if(!currentFix){status("No current or saved fix yet",true);return;} $("emergencyMessage").focus();$("emergencyMessage").select();status("Message prepared. Choose a communication method to send it.");});
$("saveBtn").addEventListener("click",()=>{if(!currentFix){status("Get a location first",true);return;}saveFix({...currentFix,saved:true});$("lastFix").textContent=`${fmt(currentFix.latitude)}, ${fmt(currentFix.longitude)} · ${new Date(currentFix.timestamp).toLocaleString()}`;status("Location saved on this device");});
$("clearFix").addEventListener("click",()=>{localStorage.removeItem(FIX_KEY);currentFix=null;$("lat").textContent=$("lon").textContent=$("accuracy").textContent=$("updated").textContent="—";$("lastFix").textContent="No saved location yet.";status("Saved location deleted");});
function validGeoJSON(d){return d&&d.type==="FeatureCollection"&&Array.isArray(d.features);}
function saveMap(d,title){if(!validGeoJSON(d))throw Error("Expected a GeoJSON FeatureCollection.");mapData=d;mapTitle=title||"Offline map";try{localStorage.setItem(MAP_KEY,JSON.stringify(d));localStorage.setItem(MAP_TITLE_KEY,mapTitle);}catch(e){throw Error("Map is too large for local storage. Use a smaller GeoJSON package.");}$("mapName").textContent=mapTitle;$("mapInfo").textContent=`${d.features.length} features saved locally. Map view works offline.`;drawMap();}
$("mapFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{saveMap(JSON.parse(await f.text()),f.name);}catch(err){$("mapInfo").textContent=err.message;}e.target.value="";});
$("downloadSample").addEventListener("click",()=>{const d={type:"FeatureCollection",name:"Illustrative demo map",features:[{type:"Feature",properties:{name:"Demo route"},geometry:{type:"LineString",coordinates:[[85.12,25.58],[85.14,25.59],[85.16,25.61]]}},{type:"Feature",properties:{name:"Demo point"},geometry:{type:"Point",coordinates:[85.14,25.59]}}]};try{saveMap(d,"Illustrative demo map");}catch(e){$("mapInfo").textContent=e.message;}});
$("downloadMapUrl").addEventListener("click",async()=>{const raw=$("mapUrl").value.trim();if(!raw){$("mapInfo").textContent="Enter a trusted GeoJSON URL first.";return;}try{const u=new URL(raw);if(u.protocol!=="https:")throw Error("Use an HTTPS map URL.");$("mapInfo").textContent="Downloading map package…";const r=await fetch(u.href);if(!r.ok)throw Error(`Download failed: HTTP ${r.status}`);const d=await r.json();saveMap(d,u.pathname.split("/").pop()||"Downloaded offline map");$("mapInfo").textContent=`Downloaded and saved ${d.features.length} features. This package is now available offline.`;}catch(e){$("mapInfo").textContent=`Could not download map: ${e.message}. The server must allow cross-origin requests (CORS); alternatively download the file in your browser and use Import GeoJSON.`;}});
$("clearMap").addEventListener("click",()=>{localStorage.removeItem(MAP_KEY);localStorage.removeItem(MAP_TITLE_KEY);mapData=null;mapTitle="";$("mapName").textContent="No map package loaded";$("mapInfo").textContent="No map loaded.";drawMap();});
$("exportMap").addEventListener("click",()=>{if(!mapData){$("mapInfo").textContent="No map to export.";return;}const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(mapData)],{type:"application/geo+json"}));a.download=(mapTitle||"offline-map").replace(/[^a-z0-9_-]/gi,"_")+".geojson";a.click();URL.revokeObjectURL(a.href);});
function coordsOf(g,out){if(!g)return;const walk=x=>{if(Array.isArray(x)&&typeof x[0]==="number"&&typeof x[1]==="number")out.push(x);else if(Array.isArray(x))x.forEach(walk);};walk(g.coordinates);if(g.geometries)g.geometries.forEach(x=>coordsOf(x,out));}
function drawMap(){
 const c=$("mapCanvas"),ctx=c.getContext("2d"),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.fillStyle="#0a1423";ctx.fillRect(0,0,w,h);
 ctx.strokeStyle="#172a43";ctx.lineWidth=1;for(let x=0;x<w;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 if(!mapData){ctx.fillStyle="#a7b5cb";ctx.font="22px system-ui";ctx.textAlign="center";ctx.fillText("Import an offline GeoJSON map",w/2,h/2);return;}
 const all=[];mapData.features.forEach(f=>coordsOf(f.geometry,all));if(!all.length){ctx.fillStyle="#a7b5cb";ctx.font="18px system-ui";ctx.textAlign="center";ctx.fillText("No mappable coordinates in this package",w/2,h/2);return;}
 let xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);if(minX===maxX){minX-=.001;maxX+=.001;}if(minY===maxY){minY-=.001;maxY+=.001;}
 const pad=35,px=x=>pad+(x-minX)/(maxX-minX)*(w-2*pad),py=y=>h-pad-(y-minY)/(maxY-minY)*(h-2*pad);
 const geom=g=>{if(!g)return;const line=arr=>{if(!arr.length)return;ctx.beginPath();arr.forEach((p,i)=>i?ctx.lineTo(px(p[0]),py(p[1])):ctx.moveTo(px(p[0]),py(p[1])));if(g.type==="Polygon"||g.type==="MultiPolygon")ctx.closePath();ctx.stroke();if(g.type==="Polygon"||g.type==="MultiPolygon"){ctx.globalAlpha=.15;ctx.fill();ctx.globalAlpha=1;}};const lines=x=>{if(Array.isArray(x)&&typeof x[0]?.[0]==="number")line(x);else if(Array.isArray(x))x.forEach(lines);};ctx.strokeStyle="#6ee7b7";ctx.fillStyle="#6ee7b7";ctx.lineWidth=3;if(g.type==="Point"){ctx.beginPath();ctx.arc(px(g.coordinates[0]),py(g.coordinates[1]),6,0,Math.PI*2);ctx.fill();}else if(g.type==="GeometryCollection")g.geometries.forEach(geom);else lines(g.coordinates);};
 mapData.features.forEach(f=>geom(f.geometry));
 if(currentFix&&currentFix.longitude>=minX&&currentFix.longitude<=maxX&&currentFix.latitude>=minY&&currentFix.latitude<=maxY){ctx.fillStyle="#7cb8ff";ctx.beginPath();ctx.arc(px(currentFix.longitude),py(currentFix.latitude),8,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();}
 ctx.fillStyle="#a7b5cb";ctx.font="14px system-ui";ctx.textAlign="left";ctx.fillText(`${minY.toFixed(4)} to ${maxY.toFixed(4)} lat`,12,20);ctx.textAlign="right";ctx.fillText(`${minX.toFixed(4)} to ${maxX.toFixed(4)} lon`,w-12,20);
}
$("netStatus").textContent=navigator.onLine?"Online":"Offline";window.addEventListener("online",()=>$("netStatus").textContent="Online");window.addEventListener("offline",()=>$("netStatus").textContent="Offline");
try{const d=JSON.parse(localStorage.getItem(MAP_KEY));if(validGeoJSON(d))saveMap(d,localStorage.getItem(MAP_TITLE_KEY)||"Saved offline map");}catch(e){}
loadFix();drawMap();
if("serviceWorker" in navigator && location.protocol!=="file:")navigator.serviceWorker.register("./sw.js").catch(()=>{});
