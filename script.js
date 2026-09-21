let map;
let markers = [];
let currentThreshold = 60;
let sortDescending = true;

const zones = [
  {name:"Keonjhar North Block", state:"Odisha", score:92, lat:22.02, lng:85.42, geology:"BIF / metasedimentary", satellite:"Strong iron-oxide response"},
  {name:"Sundargarh Prospect", state:"Odisha", score:87, lat:21.91, lng:84.86, geology:"Metamorphic belt", satellite:"Elevated spectral anomaly"},
  {name:"Bonai Corridor", state:"Odisha", score:81, lat:21.35, lng:85.10, geology:"Banded iron formation", satellite:"Moderate anomaly"},
  {name:"Balaghat Demo Zone", state:"Madhya Pradesh", score:78, lat:21.83, lng:80.19, geology:"Manganiferous formation", satellite:"Terrain + spectral match"},
  {name:"Nagpur Demo Zone", state:"Maharashtra", score:69, lat:21.15, lng:79.10, geology:"Metasedimentary", satellite:"Low–moderate signal"},
  {name:"Singhbhum Demo Zone", state:"Jharkhand", score:61, lat:22.55, lng:85.42, geology:"Iron-rich belt", satellite:"Terrain correlation"}
];

function initMap(){
  const center = {lat: 21.65, lng: 84.2};
  map = new google.maps.Map(document.getElementById("map"), {
    center, zoom: 6,
    mapTypeId: "terrain",
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [
      {elementType:"geometry",stylers:[{color:"#173025"}]},
      {elementType:"labels.text.fill",stylers:[{color:"#9ab6a5"}]},
      {elementType:"labels.text.stroke",stylers:[{color:"#07110c"}]},
      {featureType:"water",elementType:"geometry",stylers:[{color:"#0b2530"}]},
      {featureType:"road",elementType:"geometry",stylers:[{color:"#294436"}]},
      {featureType:"poi",stylers:[{visibility:"off"}]}
    ]
  });
  renderMarkers();
}

window.initMap = initMap;

function renderMarkers(){
  markers.forEach(m => m.setMap(null));
  markers = [];
  const showProspect = document.getElementById("prospectLayer").checked;
  const threshold = currentThreshold;
  if(!showProspect) return;

  zones.filter(z => z.score >= threshold).forEach(z => {
    const color = z.score >= 80 ? "#ff6f3c" : z.score >= 60 ? "#ffb34d" : "#6d897b";
    const marker = new google.maps.Marker({
      position:{lat:z.lat,lng:z.lng}, map,
      title:z.name,
      icon:{
        path:google.maps.SymbolPath.CIRCLE,
        scale: z.score >= 80 ? 10 : 8,
        fillColor:color, fillOpacity:.95,
        strokeColor:"#ffffff", strokeWeight:1.5
      }
    });
    const info = new google.maps.InfoWindow({
      content:`<div style="font-family:Arial;padding:5px;color:#142019">
        <b>${z.name}</b><br><small>${z.state} • ${z.geology}</small>
        <div style="margin-top:6px"><b>AI prospectivity: ${z.score}%</b></div>
        <small>${z.satellite}</small>
      </div>`
    });
    marker.addListener("click",()=>info.open({map,anchor:marker}));
    markers.push(marker);
  });
  document.getElementById("zoneCount").textContent = String(zones.filter(z=>z.score>=threshold).length).padStart(2,"0");
}

function renderList(){
  const list = document.getElementById("zoneList");
  const visible = zones.filter(z=>z.score>=currentThreshold)
    .sort((a,b)=>sortDescending ? b.score-a.score : a.score-b.score);
  list.innerHTML = visible.map(z=>{
    const cls = z.score>=80 ? "high-score" : z.score>=60 ? "med-score" : "low-score";
    return `<div class="zone">
      <div><strong>${z.name}</strong><small>${z.state} • ${z.geology}</small>
      <div class="mini-bar"><i style="width:${z.score}%"></i></div></div>
      <span style="color:#718d7d;font-size:9px">${z.satellite}</span>
      <div class="score ${cls}">${z.score}%</div>
    </div>`;
  }).join("");
}

document.addEventListener("DOMContentLoaded",()=>{
  const range=document.getElementById("scoreRange");
  range.addEventListener("input",()=>{
    currentThreshold=+range.value;
    document.getElementById("scoreValue").textContent=currentThreshold+"%";
    renderList();
    if(map) renderMarkers();
  });
  document.getElementById("sortBtn").onclick=()=>{
    sortDescending=!sortDescending; renderList();
  };
  ["prospectLayer"].forEach(id=>document.getElementById(id).addEventListener("change",renderMarkers));
  document.getElementById("satelliteLayer").addEventListener("change",e=>{
    if(map) map.setMapTypeId(e.target.checked ? "hybrid" : "terrain");
  });
  document.getElementById("geologyLayer").addEventListener("change",()=>alert("Geological layer: connect your official geological GIS/GeoJSON dataset here."));
  document.getElementById("infraLayer").addEventListener("change",()=>alert("Infrastructure layer: connect roads, railways, mines and processing-plant datasets here."));
  document.getElementById("analyzeBtn").onclick=()=>{
    const n=zones.filter(z=>z.score>=currentThreshold).length;
    document.getElementById("resultZones").textContent=n;
    document.getElementById("analysisText").textContent=`The prototype model selected ${n} zone(s) above the ${currentThreshold}% prospectivity threshold. In a production system, this score would be generated from trained ML models using verified geological, geochemical, DEM and satellite-derived features.`;
    document.getElementById("modal").classList.remove("hidden");
  };
  document.getElementById("closeModal").onclick=()=>document.getElementById("modal").classList.add("hidden");
  document.getElementById("locateBtn").onclick=()=>{
    if(map) { map.setCenter({lat:21.65,lng:84.2}); map.setZoom(6); }
  };
  document.getElementById("zoomIn").onclick=()=>map && map.setZoom(map.getZoom()+1);
  document.getElementById("zoomOut").onclick=()=>map && map.setZoom(map.getZoom()-1);
  renderList();
});
