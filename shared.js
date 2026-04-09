
// MODAL
const modal=document.getElementById('modal');
const mImg=document.getElementById('mImg');
const mTitle=document.getElementById('mTitle');
function openModal(src,title){if(!src)return;mImg.src=src;mTitle.textContent=title;modal.classList.add('active');document.body.style.overflow='hidden';}
function closeModal(){modal.classList.remove('active');document.body.style.overflow='';}
if(document.getElementById('mClose')) document.getElementById('mClose').onclick=closeModal;
if(modal) modal.onclick=e=>{if(e.target===modal)closeModal();};
document.onkeydown=e=>{if(e.key==='Escape')closeModal();};
document.querySelectorAll('.activity-tag[data-img]').forEach(t=>{if(t.dataset.img)t.onclick=()=>openModal(t.dataset.img,t.textContent.trim());});

// DAY TABS
function showDay(mapId,idx){
  document.querySelectorAll('[id^="panel-'+mapId+'-"]').forEach((p,i)=>p.classList.toggle('active',i===idx));
  document.querySelectorAll('[id^="panel-'+mapId+'-"]').forEach(p=>{
    var c=p.closest('.day-plans');
    if(c) c.querySelectorAll('.day-tab').forEach((t,i)=>t.classList.toggle('active',i===idx));
  });
}

// MINI MAPS (called after Leaflet loads)
function initMiniMaps(){
  if(typeof L==='undefined'){setTimeout(initMiniMaps,200);return;}
  var light='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  var attr='&copy; OpenStreetMap &copy; CARTO';
  function mkMap(id,lat,lng,zoom,spots){
    if(!document.getElementById(id)) return;
    var m=L.map(id,{scrollWheelZoom:false,zoomControl:true}).setView([lat,lng],zoom);
    L.tileLayer(light,{attribution:attr,maxZoom:19}).addTo(m);
    spots.forEach(function(s){
      var bg=s.hostel?'#c9973a':'#0d1b2a';
      var icon=L.divIcon({className:'',iconSize:[26,26],iconAnchor:[13,13],
        html:'<div title="'+s.name+'" style="width:26px;height:26px;background:'+bg+';color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.3)">'+s.num+'</div>'});
      L.marker([s.lat,s.lng],{icon:icon}).addTo(m).bindPopup('<strong>'+s.name+'</strong>');
    });
  }
  if(window.MAPS) window.MAPS.forEach(function(cfg){mkMap(cfg.id,cfg.lat,cfg.lng,cfg.zoom,cfg.spots);});
}
initMiniMaps();

// ACTIVE NAV
var navLinks=document.querySelectorAll('.nav-inner a[href]');
function setActive(){
  var path=window.location.pathname.split('/').pop()||'index.html';
  navLinks.forEach(a=>{
    var href=a.getAttribute('href').split('/').pop();
    a.classList.toggle('active',href===path);
  });
}
setActive();

// SCROLL NAV (for same-page anchors)
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{
  if(e.isIntersecting){
    var id=e.target.id;
    navLinks.forEach(a=>{ if(a.getAttribute('href')==='#'+id) a.classList.add('active'); });
  }
}),{rootMargin:'-120px 0px -55% 0px',threshold:0});
document.querySelectorAll('[id]').forEach(s=>obs.observe(s));

// Service Worker
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(function(){});}
