
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

// MINI MAPS (called after Leaflet loads AND after window.MAPS is set)
function initMiniMaps(){
  if(!document.querySelector('.dest-map'))return; // no maps on this page
  if(typeof L==='undefined'||!window.MAPS){setTimeout(initMiniMaps,200);return;}
  var light='https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  var attr='&copy; OpenStreetMap &copy; CARTO';

  function mkMap(cfg){
    var id=cfg.id,lat=cfg.lat,lng=cfg.lng,zoom=cfg.zoom,spots=cfg.spots;
    var days=cfg.days||[];
    var routes=cfg.routes||null;
    if(!document.getElementById(id))return;
    var m=L.map(id,{scrollWheelZoom:false,zoomControl:true}).setView([lat,lng],zoom);
    L.tileLayer(light,{attribution:attr,maxZoom:19}).addTo(m);

    var markerList=[];
    spots.forEach(function(s){
      var bg=s.hostel?'#c9973a':'#0d1b2a';
      var icon=L.divIcon({className:'',iconSize:[26,26],iconAnchor:[13,13],
        html:'<div title="'+s.name+'" style="width:26px;height:26px;background:'+bg+';color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;font-size:11px;font-weight:700;border:2px solid rgba(255,255,255,.85);box-shadow:0 2px 8px rgba(0,0,0,.3)">'+s.num+'</div>'});
      var mk=L.marker([s.lat,s.lng],{icon:icon}).addTo(m).bindPopup('<strong>'+s.name+'</strong>');
      markerList.push({mk:mk,spot:s});
    });

    // Only add day buttons if days are defined and spots have day assignments
    var hasDays=days.length>0&&spots.some(function(s){return s.day;});
    if(!hasDays)return;

    // Build button bar above the map
    var mapEl=document.getElementById(id);
    var btnBar=document.createElement('div');
    btnBar.className='map-day-btns';
    var todosBtn=document.createElement('button');
    todosBtn.className='map-day-btn active';
    todosBtn.textContent='Todos';
    todosBtn.dataset.day='0';
    btnBar.appendChild(todosBtn);
    days.forEach(function(label,i){
      var btn=document.createElement('button');
      btn.className='map-day-btn';
      btn.textContent=label;
      btn.dataset.day=String(i+1);
      btnBar.appendChild(btn);
    });
    mapEl.parentElement.insertBefore(btnBar,mapEl);

    var activeLines=[];
    function clearLines(){activeLines.forEach(function(l){m.removeLayer(l);});activeLines=[];}
    function drawPolylines(coordsList,opacity){
      coordsList.forEach(function(coords){
        if(coords.length>1){
          activeLines.push(L.polyline(coords,{color:'#c9973a',weight:3,opacity:opacity,dashArray:'10,7'}).addTo(m));
        }
      });
    }

    function showMapDay(day){
      clearLines();
      // Update marker opacity
      markerList.forEach(function(item){
        var dim=day>0&&item.spot.day&&item.spot.day!==day;
        item.mk.setOpacity(dim?0.15:1);
      });

      if(day>0){
        // Draw this day's route
        var coords=[];
        if(routes&&routes[day-1]&&routes[day-1].length>1){
          coords=routes[day-1];
        } else {
          var ds=spots.filter(function(s){return s.day===day&&s.order;});
          ds.sort(function(a,b){return a.order-b.order;});
          coords=ds.map(function(s){return[s.lat,s.lng];});
        }
        if(coords.length>1){
          drawPolylines([coords],0.85);
          m.fitBounds(L.latLngBounds(coords),{padding:[35,35]});
        }
      } else {
        // Todos: draw all routes lightly for overview
        if(routes){
          drawPolylines(routes,0.4);
        } else {
          var allCoords=[];
          for(var d=1;d<=6;d++){
            var ds2=spots.filter(function(s){return s.day===d&&s.order;});
            if(!ds2.length)continue;
            ds2.sort(function(a,b){return a.order-b.order;});
            allCoords.push(ds2.map(function(s){return[s.lat,s.lng];}));
          }
          if(allCoords.length) drawPolylines(allCoords,0.35);
        }
        m.setView([lat,lng],zoom);
      }

      // Update button active state
      btnBar.querySelectorAll('.map-day-btn').forEach(function(btn){
        btn.classList.toggle('active',parseInt(btn.dataset.day)===day);
      });
    }

    btnBar.addEventListener('click',function(e){
      var btn=e.target.closest('.map-day-btn');
      if(btn) showMapDay(parseInt(btn.dataset.day));
    });

    // Draw overview routes on initial load
    showMapDay(0);
  }

  window.MAPS.forEach(function(cfg){mkMap(cfg);});
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
