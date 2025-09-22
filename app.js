// Simple client-side plantation data app
const STORAGE_KEY = 'plantation_data_v1';
let data = [];
let currentUser = null;

// Sample initial data
const sample = [
  {id:1,name:'Neem A',species:'Neem',plantedOn:'2024-06-10',location:'North Field',height:2.5},
  {id:2,name:'Mango B',species:'Mango',plantedOn:'2023-11-05',location:'East Orchard',height:3.2},
  {id:3,name:'Teak C',species:'Teak',plantedOn:'2022-04-21',location:'West Ridge',height:5.1}
];

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderTable();
  updateChart();
  populateFilters();
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw) data = JSON.parse(raw);
  else { data = sample; save(); }
}

function $(sel){return document.querySelector(sel)}
function $a(sel){return document.querySelectorAll(sel)}

function renderTable(){
  const tbody = $('#dataTable tbody');
  tbody.innerHTML = '';
  const q = $('#searchInput').value.toLowerCase();
  const sp = $('#filterSpecies').value;
  const from = $('#dateFrom').value;
  const to = $('#dateTo').value;
  const rows = data.filter(r=>{
    if(q){
      const hay = (r.name + ' ' + r.location + ' ' + r.species).toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(sp && r.species !== sp) return false;
    if(from && r.plantedOn < from) return false;
    if(to && r.plantedOn > to) return false;
    return true;
  });
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.id}</td>
      <td>${r.name}</td>
      <td>${r.species}</td>
      <td>${r.plantedOn}</td>
      <td>${r.location}</td>
      <td>${r.height}</td>
      <td>
        <button class="edit" data-id="${r.id}">Edit</button>
        <button class="delete btn-delete" data-id="${r.id}">Delete</button>
      </td>`;
    tbody.appendChild(tr);
  });
}

function populateFilters(){
  const sel = $('#filterSpecies');
  const species = Array.from(new Set(data.map(d=>d.species))).sort();
  sel.innerHTML = '<option value="">All species</option>';
  species.forEach(s=>{
    const o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o);
  });
}

function openModal(editItem){
  $('#modalTitle').textContent = editItem ? 'Edit Entry' : 'Add Entry';
  $('#modal').classList.remove('hidden');
  const form = $('#entryForm');
  form.id.value = editItem ? editItem.id : '';
  form.name.value = editItem ? editItem.name : '';
  form.species.value = editItem ? editItem.species : '';
  form.plantedOn.value = editItem ? editItem.plantedOn : '';
  form.location.value = editItem ? editItem.location : '';
  form.height.value = editItem ? editItem.height : '';
}

function closeModal(){ $('#modal').classList.add('hidden'); }

function addOrUpdateEntry(obj){
  if(obj.id){
    const idx = data.findIndex(d=>d.id==obj.id);
    if(idx!==-1) data[idx] = obj;
  } else {
    obj.id = (data.reduce((m,r)=>Math.max(m,r.id),0) || 0) + 1;
    data.push(obj);
  }
  save();
}

function deleteEntry(id){
  if(!confirm('Delete entry id '+id+'?')) return;
  data = data.filter(d=>d.id!=id);
  save();
}

// Chart
let speciesChart = null;
function updateChart(){
  const counts = {};
  data.forEach(d=>counts[d.species] = (counts[d.species]||0)+1);
  const labels = Object.keys(counts);
  const values = labels.map(l=>counts[l]);
  const ctx = document.getElementById('speciesChart').getContext('2d');
  if(speciesChart) speciesChart.destroy();
  speciesChart = new Chart(ctx, {
    type: 'bar',
    data: {labels, datasets:[{label:'Count', data:values}]},
    options: {responsive:true, maintainAspectRatio:false}
  });
}

// Export CSV
function exportCSV(){
  const rows = [['ID','Name','Species','Planted On','Location','Height']];
  data.forEach(r=>rows.push([r.id,r.name,r.species,r.plantedOn,r.location,r.height]));
  const csv = rows.map(r=>r.map(c=>String(c).replace(/"/g,'""')).map(c=>`"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'plantation_data.csv'; a.click(); URL.revokeObjectURL(url);
}

// Export Excel via SheetJS
function exportXLSX(){
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantation');
  XLSX.writeFile(wb, 'plantation_data.xlsx');
}

// Export PDF via jsPDF
function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text('Plantation Data', 14, 20);
  let y = 30;
  doc.setFontSize(10);
  const header = ['ID','Name','Species','Planted On','Location','Height'];
  doc.text(header.join(' | '), 14, y); y+=6;
  data.forEach(r=>{
    const line = [r.id,r.name,r.species,r.plantedOn,r.location,r.height].join(' | ');
    doc.text(line,14,y); y+=6;
    if(y>270){ doc.addPage(); y=20; }
  });
  doc.save('plantation_data.pdf');
}

// Simple auth (client-side demo)
function requireLogin(action){
  if(!currentUser){ alert('Please login first. Click Login button at top-right.'); return false; }
  return true;
}

document.addEventListener('click', e=>{
  if(e.target.id === 'addBtn') {
    openModal(null);
  } else if(e.target.classList.contains('edit')){
    const id = e.target.dataset.id;
    const item = data.find(d=>d.id==id*1);
    openModal(item);
  } else if(e.target.classList.contains('delete')){
    const id = e.target.dataset.id;
    deleteEntry(id*1);
  } else if(e.target.id === 'loginBtn'){
    $('#loginModal').classList.remove('hidden');
  }
});

document.getElementById('entryForm').addEventListener('submit', ev=>{
  ev.preventDefault();
  const f = ev.target;
  const obj = {
    id: f.id.value ? Number(f.id.value) : null,
    name: f.name.value.trim(),
    species: f.species.value.trim(),
    plantedOn: f.plantedOn.value,
    location: f.location.value.trim(),
    height: Number(f.height.value)
  };
  addOrUpdateEntry(obj);
  closeModal();
});

$('#cancelBtn').addEventListener('click', closeModal);
$('#searchInput').addEventListener('input', renderTable);
$('#filterSpecies').addEventListener('change', renderTable);
$('#dateFrom').addEventListener('change', renderTable);
$('#dateTo').addEventListener('change', renderTable);
$('#exportCsv').addEventListener('click', exportCSV);
$('#exportXlsx').addEventListener('click', exportXLSX);
$('#exportPdf').addEventListener('click', exportPDF);

$('#loginForm').addEventListener('submit', ev=>{
  ev.preventDefault();
  const u = ev.target.username.value;
  const p = ev.target.password.value;
  // demo credentials: admin / password
  if(u==='admin' && p==='password'){
    currentUser = {username:'admin'};
    alert('Logged in as admin');
    $('#loginModal').classList.add('hidden');
  } else {
    alert('Invalid credentials. (demo: admin / password)');
  }
});
$('#loginCancel').addEventListener('click', ()=>$('#loginModal').classList.add('hidden'));

// Initialize
load();
renderTable();
populateFilters();
updateChart();
