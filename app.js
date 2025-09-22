/* js/app.js - single-file app logic for localStorage demo */
(function(){
  function getEntries(){ try{ return JSON.parse(localStorage.getItem('plantationEntries')||'[]'); } catch(e){ return []; } }
  function saveEntries(arr){ localStorage.setItem('plantationEntries', JSON.stringify(arr)); }
  function addEntry(entry){ const arr=getEntries(); arr.unshift(entry); saveEntries(arr); }
  function updateEntry(id, data){ const arr=getEntries(); const i=arr.findIndex(x=>x.id===id); if(i>-1){ arr[i]=Object.assign({},arr[i],data); saveEntries(arr); } }
  function deleteEntry(id){ let arr=getEntries(); arr = arr.filter(x=>x.id!==id); saveEntries(arr); }

  function getUser(){ try{ return JSON.parse(localStorage.getItem('user')||'null'); }catch(e){return null;} }
  function loginUser(username){ const u={name:username||'demo', loggedAt:Date.now()}; localStorage.setItem('user', JSON.stringify(u)); }
  function logoutUser(){ localStorage.removeItem('user'); window.location.href='login.html'; }
  function requireAuth(){ if(!getUser()){ window.location.href='login.html'; } }

  function $(id){ return document.getElementById(id); }
  function readFileAsDataURL(file){ return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(fr.result); fr.onerror=rej; fr.readAsDataURL(file); }); }
  function formatDate(ts){ const d=new Date(ts); return d.toISOString().slice(0,10); }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  function initDashboard(){
    const cards = document.getElementById('dashboardCards');
    const arr = getEntries();
    const totalEntries = arr.length;
    const totalQty = arr.reduce((s,x)=> s + (Number(x.quantity)||0), 0);
    const totalArea = arr.reduce((s,x)=> s + (Number(x.area)||0), 0);
    cards.innerHTML = `
      <div class="col-md-4">
        <div class="card card-quick p-3">
          <h6>Total entries</h6><h3>${totalEntries}</h3>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card card-quick p-3">
          <h6>Total quantity</h6><h3>${totalQty}</h3>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card card-quick p-3">
          <h6>Total area (ha)</h6><h3>${totalArea.toFixed(2)}</h3>
        </div>
      </div>
    `;
  }

  async function initPlantation(){
    requireAuth();
    const form = $('plantationForm');
    const photoInput = $('photoInput');
    const photoPreview = $('photoPreview');
    const latInput = $('lat');
    const lngInput = $('lng');
    const title = $('formTitle');

    const map = L.map('map').setView([11.0,78.0], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '' }).addTo(map);
    let marker;

    map.on('click', (e)=>{ if(marker) marker.setLatLng(e.latlng); else marker = L.marker(e.latlng).addTo(map); latInput.value = e.latlng.lat.toFixed(6); lngInput.value = e.latlng.lng.toFixed(6); });

    $('locBtn').addEventListener('click', ()=>{
      if(navigator.geolocation){ navigator.geolocation.getCurrentPosition(pos=>{ const p=pos.coords; map.setView([p.latitude, p.longitude], 13); if(marker) marker.setLatLng([p.latitude,p.longitude]); else marker=L.marker([p.latitude,p.longitude]).addTo(map); latInput.value=p.latitude.toFixed(6); lngInput.value=p.longitude.toFixed(6); }); }
    });

    photoInput.addEventListener('change', async ()=>{
      const f = photoInput.files[0];
      if(f){ const data = await readFileAsDataURL(f); photoPreview.src = data; photoPreview.classList.remove('d-none'); photoPreview.dataset.base64 = data; }
      else { photoPreview.src=''; photoPreview.classList.add('d-none'); photoPreview.dataset.base64=''; }
    });

    const editId = sessionStorage.getItem('editEntryId');
    if(editId){
      const arr = getEntries(); const e = arr.find(x=>x.id===editId);
      if(e){ title.innerText = 'Edit Entry'; $('plantType').value=e.plantType||''; $('variety').value=e.variety||''; $('quantity').value=e.quantity||1; $('area').value=e.area||''; $('plantedAt').value=e.plantedAt||''; $('notes').value=e.notes||''; $('lat').value=e.lat||''; $('lng').value=e.lng||''; if(e.image){ photoPreview.src = e.image; photoPreview.classList.remove('d-none'); photoPreview.dataset.base64 = e.image; } if(e.lat && e.lng){ const latlng = [Number(e.lat), Number(e.lng)]; marker = L.marker(latlng).addTo(map); map.setView(latlng, 12); } }
    }

    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      form.classList.add('was-validated');
      if(!form.checkValidity()) return;

      const entry = {
        id: editId || uid(),
        plantType: $('plantType').value,
        variety: $('variety').value,
        quantity: Number($('quantity').value)||0,
        area: Number($('area').value)||0,
        plantedAt: $('plantedAt').value || formatDate(Date.now()),
        notes: $('notes').value,
        lat: $('lat').value || '',
        lng: $('lng').value || '',
        image: photoPreview.dataset.base64 || '',
        createdBy: (getUser()||{}).name || 'unknown',
        createdAt: Date.now()
      };

      if(editId){ updateEntry(entry.id, entry); sessionStorage.removeItem('editEntryId'); }
      else { addEntry(entry); }

      window.location.href = 'reports.html';
    });
  }

  function initReports(){
    requireAuth();
    const tableBody = document.querySelector('#entriesTable tbody');
    const search = $('search');
    const exportBtn = $('exportBtn');

    function render(){
      const q = search.value.trim().toLowerCase();
      const arr = getEntries().filter(e => !q || (e.plantType||'').toLowerCase().includes(q) || (e.notes||'').toLowerCase().includes(q));
      tableBody.innerHTML = arr.map(e => `
        <tr>
          <td>${e.plantedAt}</td>
          <td>${e.plantType}<br><small class="text-muted">${e.variety||''}</small></td>
          <td>${e.quantity}</td>
          <td>${e.area||''}</td>
          <td>${e.image?`<img class="preview" src="${e.image}">` : ''}</td>
          <td>
            <button class="btn btn-sm btn-primary me-1" data-action="edit" data-id="${e.id}">Edit</button>
            <button class="btn btn-sm btn-danger" data-action="delete" data-id="${e.id}">Delete</button>
          </td>
        </tr>
      `).join('');

      tableBody.querySelectorAll('button[data-action="edit"]').forEach(b=> b.addEventListener('click', ()=>{ const id=b.dataset.id; sessionStorage.setItem('editEntryId', id); window.location.href='plantation.html'; }));
      tableBody.querySelectorAll('button[data-action="delete"]').forEach(b=> b.addEventListener('click', ()=>{ const id=b.dataset.id; if(confirm('Delete this entry?')){ deleteEntry(id); render(); initChart(); } }));

      initChart();
    }

    search.addEventListener('input', render);

    exportBtn.addEventListener('click', ()=>{
      const arr = getEntries();
      const rows = arr.map(e => ({ id:e.id, plantedAt:e.plantedAt, plantType:e.plantType, variety:e.variety, quantity:e.quantity, area:e.area, lat:e.lat, lng:e.lng, notes:e.notes, createdBy:e.createdBy }));
      const header = Object.keys(rows[0]||{});
      const csv = [header.join(',')].concat(rows.map(r => header.map(h=>`"${String(r[h]||'').replace(/"/g,'""')}"`).join(','))).join('\n');
      const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
      const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'plantation_export.csv'; document.body.appendChild(link); link.click(); link.remove();
    });

    function initChart(){
      const arr = getEntries();
      const agg = {};
      arr.forEach(e => { const k = e.plantType || 'Unknown'; agg[k] = (agg[k]||0) + (Number(e.quantity)||0); });
      const labels = Object.keys(agg);
      const data = labels.map(l => agg[l]);
      const ctx = document.getElementById('chartCanvas').getContext('2d');
      if(window._chart) window._chart.destroy();
      window._chart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Quantity', data }] }, options:{ responsive:true, maintainAspectRatio:false } });
    }

    render();
  }

  function initLogin(){
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', (e)=>{ e.preventDefault(); const u = document.getElementById('username').value; loginUser(u); window.location.href='index.html'; });
  }

  function setupNav(){
    const user = getUser();
    const loginLink = document.getElementById('loginLink');
    const logoutNav = document.getElementById('logoutNav');
    if(user){ if(loginLink) loginLink.classList.add('d-none'); if(logoutNav) logoutNav.classList.remove('d-none'); }
    if(document.getElementById('logoutBtn')) document.getElementById('logoutBtn').addEventListener('click', logoutUser);
  }

  document.addEventListener('DOMContentLoaded', ()=>{ setupNav(); const page = document.body.dataset.page; if(page==='dashboard') initDashboard(); if(page==='plantation') initPlantation(); if(page==='reports') initReports(); if(page==='login') initLogin(); });
})();
