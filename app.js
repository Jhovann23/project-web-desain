'use strict';
/* =========================================================
   Sinar Harapan Alumunium – Sistem Pengelola Barang
   3 aktor: Admin, Gudang, Kasir
   Teknologi: JavaScript murni + manipulasi DOM + localStorage
   ========================================================= */

/* ---------- Utilitas ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rp = n => 'Rp ' + Math.round(Number(n) || 0).toLocaleString('id-ID');
const num = n => (Number(n) || 0).toLocaleString('id-ID');
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const dayKey = d => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDT = iso => new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const shortRp = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + ' jt' : n >= 1e3 ? Math.round(n / 1e3) + ' rb' : String(n);
const sum = (arr, fn) => arr.reduce((a, x) => a + fn(x), 0);

/* ---------- Penyimpanan (localStorage) ---------- */
const Store = {
  get(k, d) {
    try { const v = localStorage.getItem('spb_' + k); return v === null ? d : JSON.parse(v); }
    catch { return d; }
  },
  set(k, v) { localStorage.setItem('spb_' + k, JSON.stringify(v)); },
  del(k) { localStorage.removeItem('spb_' + k); },
  reset() { Object.keys(localStorage).filter(k => k.startsWith('spb_')).forEach(k => localStorage.removeItem(k)); }
};

function invoiceNo(sales, dt = new Date()) {
  const k = dayKey(dt);
  const n = sales.filter(s => dayKey(s.date) === k).length + 1;
  return 'INV-' + k.replace(/-/g, '') + '-' + String(n).padStart(3, '0');
}

function seed() {
  if (Store.get('seeded')) return;
  Store.set('users', [
    { id: 'u1', name: 'Administrator', username: 'admin', password: 'admin123', role: 'admin', active: true },
    { id: 'u2', name: 'Petugas Gudang', username: 'gudang', password: 'gudang123', role: 'gudang', active: true },
    { id: 'u3', name: 'Kasir Toko', username: 'kasir', password: 'kasir123', role: 'kasir', active: true }
  ]);
  Store.set('suppliers', [
    { id: 'sp1', name: 'PT Sumber Pangan Makmur', phone: '022-555-0101', address: 'Jl. Industri Raya No. 12, Bandung' },
    { id: 'sp2', name: 'CV Maju Bersama', phone: '022-555-0202', address: 'Jl. Soekarno-Hatta No. 88, Bandung' },
    { id: 'sp3', name: 'UD Segar Jaya', phone: '0812-3456-7890', address: 'Pasar Induk Gedebage, Bandung' }
  ]);
  const P = (sku, name, category, unit, buy, sell, stock, min) => ({ id: uid('p'), sku, name, category, unit, buy, sell, stock, min });
  // const products = [
  //   P('BRS-001', 'Beras Premium 5 kg', 'Sembako', 'karung', 62000, 69000, 40, 10),
  //   P('MYK-001', 'Minyak Goreng 1 L', 'Sembako', 'botol', 15500, 18000, 60, 15),
  //   P('GLA-001', 'Gula Pasir 1 kg', 'Sembako', 'kg', 14000, 16500, 8, 10),
  //   P('TLR-001', 'Telur Ayam 1 kg', 'Sembako', 'kg', 26000, 29500, 25, 8),
  //   P('TPG-001', 'Tepung Terigu 1 kg', 'Sembako', 'kg', 10500, 12500, 30, 10),
  //   P('MIE-001', 'Mie Instan Goreng', 'Makanan', 'bungkus', 2800, 3500, 120, 40),
  //   P('KPI-001', 'Kopi Sachet', 'Minuman', 'sachet', 1300, 2000, 0, 50),
  //   P('TEH-001', 'Teh Celup isi 25', 'Minuman', 'kotak', 5500, 7500, 35, 10),
  //   P('SSU-001', 'Susu UHT 1 L', 'Minuman', 'kotak', 16000, 19000, 18, 12),
  //   P('AIR-001', 'Air Mineral 600 ml', 'Minuman', 'botol', 2200, 3500, 96, 48),
  //   P('SBN-001', 'Sabun Mandi Batang', 'Kebersihan', 'pcs', 2800, 4000, 6, 15),
  //   P('DTR-001', 'Deterjen Bubuk 800 g', 'Kebersihan', 'bungkus', 14500, 17500, 22, 8)
  // ];
  Store.set('products', products);

  // contoh transaksi 7 hari terakhir agar dashboard terisi
  const sales = [];
  const now = new Date();
  for (let d = 6; d >= 0; d--) {
    const n = 2 + (d % 3);
    for (let k = 0; k < n; k++) {
      const dt = new Date(); dt.setDate(dt.getDate() - d); dt.setHours(9 + k * 2 + (d % 2), 10 + k * 7, 0, 0);
      if (dt > now) continue;
      const items = [0, 1].map(j => {
        const p = products[(d * 2 + k * 3 + j * 5) % products.length];
        return { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty: 1 + ((d + k + j) % 3), price: p.sell, cost: p.buy };
      });
      const total = sum(items, i => i.qty * i.price);
      const paid = Math.ceil(total / 10000) * 10000;
      sales.push({ id: uid('s'), no: invoiceNo(sales, dt), date: dt.toISOString(), cashierId: 'u3', cashier: 'Kasir Toko', items, total, paid, change: paid - total, method: 'Tunai' });
    }
  }
  sales.sort((a, b) => b.date.localeCompare(a.date));
  Store.set('sales', sales);

  const mv = [];
  [[3, 0, 24, 'PT Sumber Pangan Makmur'], [2, 1, 48, 'PT Sumber Pangan Makmur'], [2, 5, 100, 'CV Maju Bersama'], [1, 9, 72, 'UD Segar Jaya']].forEach(([ago, idx, qty, ref]) => {
    const dt = new Date(); dt.setDate(dt.getDate() - ago); dt.setHours(8, 30, 0, 0);
    const p = products[idx];
    mv.push({ id: uid('m'), date: dt.toISOString(), type: 'in', productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty, ref, note: 'Pengiriman rutin', by: 'Petugas Gudang', after: p.stock });
  });
  mv.sort((a, b) => b.date.localeCompare(a.date));
  Store.set('movements', mv);
  Store.set('logs', []);
  Store.set('seeded', true);
}

/* ---------- State aplikasi ---------- */
const state = { user: null, page: null, cart: [], preselect: null };
const ROLE_LABEL = { admin: 'Admin', gudang: 'Gudang', kasir: 'Kasir' };
const REASONS = ['Rusak', 'Kadaluarsa', 'Hilang', 'Retur ke supplier', 'Pemakaian internal', 'Lainnya'];

const MENUS = {
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'produk', label: 'Data Produk', icon: 'box' },
    { id: 'supplier', label: 'Supplier', icon: 'truck' },
    { id: 'pengguna', label: 'Pengguna', icon: 'users' },
    { id: 'laporan', label: 'Laporan', icon: 'chart' },
    { id: 'log', label: 'Log Aktivitas', icon: 'list' }
  ],
  gudang: [
    { id: 'dashboard', label: 'Dashboard Gudang', icon: 'home' },
    { id: 'stok', label: 'Stok Barang', icon: 'box' },
    { id: 'masuk', label: 'Barang Masuk', icon: 'download' },
    { id: 'keluar', label: 'Barang Keluar', icon: 'upload' }
  ],
  kasir: [
    { id: 'kasir', label: 'Kasir (Penjualan)', icon: 'cart' },
    { id: 'riwayat', label: 'Riwayat Transaksi', icon: 'receipt' }
  ]
};

function addLog(action, detail = '') {
  const logs = Store.get('logs', []);
  logs.unshift({ id: uid('l'), date: new Date().toISOString(), user: state.user ? state.user.name : '-', role: state.user ? state.user.role : '-', action, detail });
  Store.set('logs', logs.slice(0, 300));
}

/* ---------- Ikon & logo ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  truck: '<rect x="1" y="6" width="13" height="10"/><path d="M14 9h4l4 4v3h-8z"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>',
  upload: '<path d="M12 17V5m0 0-4 4m4-4 4 4M4 21h16"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 12h11l2-8H6"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  logout: '<path d="M9 21H4V3h5M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v5M12 18h.01"/>',
  wallet: '<path d="M3 7h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 7V5a2 2 0 0 1 2-2h12M16 14h.01"/>',
  print: '<path d="M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z"/>'
};
const icon = (n, s = 18) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const LOGO = (s = 40) => `<span class="logo-badge"><img src="/assets/img/Sinar Harapan Alumunium Logo.png" width="${s}" height="${Math.round(s * 0.97)}" alt="Logo Sinar Harapan Alumunium"></span>`;

/* ---------- Komponen UI ---------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div');
  t.className = 'toast ' + (type === 'err' ? 'err' : '');
  t.textContent = msg;
  $('#toast-wrap').appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

function openModal({ title, body, submitText = 'Simpan', onSubmit, wide = false, hideFooter = false, danger = false }) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="overlay"><div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><h3>${esc(title)}</h3><button type="button" class="icon-btn" data-close aria-label="Tutup">✕</button></div>
    <form class="modal-body">${body}${hideFooter ? '' : `<div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Batal</button><button type="submit" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(submitText)}</button></div>`}</form>
  </div></div>`;
  const overlay = $('.overlay', root), form = $('form', root);
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeModal(); });
  overlay.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!onSubmit) return;
    const r = onSubmit(Object.fromEntries(new FormData(form)), form);
    if (r !== false) closeModal();
  });
  const first = $('input:not([readonly]), select, textarea', form);
  if (first) first.focus();
}
const closeModal = () => { $('#modal-root').innerHTML = ''; };
const confirmDialog = (msg, onYes, yesText = 'Hapus') =>
  openModal({ title: 'Konfirmasi', body: `<p>${msg}</p>`, submitText: yesText, danger: true, onSubmit: () => { onYes(); } });

const field = (label, name, o = {}) => `<label class="fld ${o.full ? 'full' : ''}"><span>${label}</span><input name="${name}" type="${o.type || 'text'}" value="${esc(o.value ?? '')}" ${o.req ? 'required' : ''} ${o.attrs || ''}></label>`;
const selectField = (label, name, options, value, o = {}) => `<label class="fld ${o.full ? 'full' : ''}"><span>${label}</span><select name="${name}" ${o.req ? 'required' : ''}>${options.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
const tbl = (heads, rows, empty = 'Belum ada data') =>
  `<div class="table-wrap"><table><thead><tr>${heads.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length ? rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${heads.length}" class="empty">${empty}</td></tr>`}</tbody></table></div>`;
const stat = (label, value, sub, tone, ic) => `<div class="stat ${tone}"><div class="stat-ic">${icon(ic, 22)}</div><div><span class="stat-l">${label}</span><strong>${value}</strong><small>${sub || '&nbsp;'}</small></div></div>`;
const stockBadge = p => p.stock <= 0 ? '<span class="badge b-red">Habis</span>' : p.stock <= p.min ? '<span class="badge b-warn">Menipis</span>' : '<span class="badge b-ok">Aman</span>';
const meter = p => { const pct = Math.min(100, Math.round(p.stock / Math.max(p.min * 3, 1) * 100)); const c = p.stock <= 0 ? 'red' : p.stock <= p.min ? 'warn' : ''; return `<div class="meter"><i class="${c}" style="width:${pct}%"></i></div>`; };

function downloadCSV(name, heads, rows) {
  const q = c => `"${String(c ?? '').replace(/"/g, '""')}"`;
  const csv = '\uFEFF' + [heads, ...rows].map(r => r.map(q).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

/* ---------- Struk ---------- */
function showReceipt(s) {
  openModal({
    title: 'Struk Transaksi', hideFooter: true,
    body: `<div class="receipt receipt-print">
      <h4>SINAR HARAPAN ALUMUNIUM</h4><div class="c">Struk Penjualan</div><hr>
      <div class="ln"><span>No</span><span>${esc(s.no)}</span></div>
      <div class="ln"><span>Waktu</span><span>${fmtDT(s.date)}</span></div>
      <div class="ln"><span>Kasir</span><span>${esc(s.cashier)}</span></div><hr>
      ${s.items.map(i => `<div class="it"><div>${esc(i.name)}</div><div class="ln"><span>${i.qty} ${esc(i.unit || '')} × ${num(i.price)}</span><span>${num(i.qty * i.price)}</span></div></div>`).join('')}<hr>
      <div class="ln big"><span>TOTAL</span><span>${rp(s.total)}</span></div>
      <div class="ln"><span>${esc(s.method)}</span><span>${rp(s.paid)}</span></div>
      <div class="ln"><span>Kembali</span><span>${rp(s.change)}</span></div><hr>
      <div class="c">Terima kasih atas kunjungan Anda</div></div>
      <div class="modal-foot"><button type="button" class="btn btn-ghost" data-close>Tutup</button><button type="button" class="btn btn-primary" id="printBtn">${icon('print')} Cetak</button></div>`
  });
  $('#printBtn').onclick = () => window.print();
}
const SALE_HEADS = ['No. Invoice', 'Waktu', 'Kasir', 'Jumlah', 'Metode', 'Total', ''];
const saleRows = list => list.map(s => [`<b>${esc(s.no)}</b>`, fmtDT(s.date), esc(s.cashier), `${sum(s.items, i => i.qty)} item`, esc(s.method), `<b>${rp(s.total)}</b>`, `<button class="btn btn-sm btn-ghost" data-sale="${s.id}">Detail</button>`]);
function bindSaleDetail(el) {
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-sale]'); if (!b) return;
    const s = Store.get('sales', []).find(x => x.id === b.dataset.sale);
    if (s) showReceipt(s);
  });
}

/* =========================================================
   AUTENTIKASI & KERANGKA HALAMAN
   ========================================================= */
function renderLogin() {
  $('#app').innerHTML = `<div class="login">
    <section class="login-art">
      ${LOGO(64)}
      <h1>Sistem Pengelola Barang<br><small style="font-size:.55em;font-weight:600;opacity:.85">Sinar Harapan Alumunium</small></h1>
      <p>Solusi tepat untuk kebutuhan kusen, pintu, jendela, dan interior bangunan Anda dengan sentuhan profesional dan material premium.</p> 
    </section>
    <section class="login-card">
      <h2>Masuk</h2><p class="muted">Pilih akun demo atau isi username dan password.</p>
      <form id="loginForm">
        <label class="fld"><span>Username</span><input name="username" autocomplete="username" required></label>
        <label class="fld"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
        <div class="login-err" id="loginErr"></div>
        <button class="btn btn-red lg" type="submit">Masuk</button>
      </form>
    </section></div>`;
  const form = $('#loginForm');
  $$('.role-pick button').forEach(b => b.addEventListener('click', () => {
    $$('.role-pick button').forEach(x => x.classList.remove('on')); b.classList.add('on');
    form.username.value = b.dataset.u; form.password.value = b.dataset.p;
  }));
  form.addEventListener('submit', e => {
    e.preventDefault();
    const u = Store.get('users', []).find(x => x.username === form.username.value.trim() && x.password === form.password.value);
    const err = $('#loginErr');
    if (!u) { err.textContent = 'Username atau password salah.'; err.classList.add('show'); return; }
    if (!u.active) { err.textContent = 'Akun ini dinonaktifkan. Hubungi admin.'; err.classList.add('show'); return; }
    state.user = u; state.cart = [];
    state.page = MENUS[u.role][0].id;
    Store.set('session', u.id); Store.set('page', state.page);
    addLog('Login');
    renderApp();
  });
}

function logout() {
  addLog('Logout');
  Store.del('session'); Store.del('page');
  state.user = null; state.cart = [];
  document.body.classList.remove('side-open');
  renderApp();
}
function goTo(page) { state.page = page; Store.set('page', page); renderApp(); }

function renderApp() {
  closeModal();
  if (!state.user) return renderLogin();
  const u = state.user, menus = MENUS[u.role];
  if (!menus.some(m => m.id === state.page)) state.page = menus[0].id;
  const cur = menus.find(m => m.id === state.page);
  $('#app').innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand">${LOGO(34)}<div><strong>Sinar Harapan</strong><span>Alumunium · Pengelola Barang</span></div></div>
      <nav class="nav">${menus.map(m => `<button class="nav-item ${m.id === state.page ? 'active' : ''}" data-page="${m.id}">${icon(m.icon)}<span>${m.label}</span></button>`).join('')}</nav>
      <div class="side-foot">
        <div class="who"><div class="avatar">${esc(u.name.charAt(0).toUpperCase())}</div><div><b>${esc(u.name)}</b><span class="role-tag">${ROLE_LABEL[u.role]}</span></div></div>
        <button class="btn btn-ghost-light block" id="logoutBtn">${icon('logout')} Keluar</button>
      </div>
    </aside>
    <div class="scrim" id="scrim"></div>
    <div class="main">
      <header class="topbar"><button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">☰</button><h1>${esc(cur.label)}</h1><div class="top-right" id="clock"></div></header>
      <main class="view" id="view"></main>
    </div></div>`;
  $$('.nav-item').forEach(b => b.addEventListener('click', () => { document.body.classList.remove('side-open'); goTo(b.dataset.page); }));
  $('#logoutBtn').addEventListener('click', logout);
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('side-open'));
  $('#scrim').addEventListener('click', () => document.body.classList.remove('side-open'));
  tickClock();
  PAGES[u.role][state.page]($('#view'));
}
function tickClock() {
  const c = $('#clock');
  if (c) c.textContent = new Date().toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* =========================================================
   HALAMAN ADMIN
   ========================================================= */
function pgAdminDash(v) {
  const products = Store.get('products', []), sales = Store.get('sales', []);
  const today = dayKey(new Date());
  const todaySales = sales.filter(s => dayKey(s.date) === today);
  const low = products.filter(p => p.stock <= p.min);
  const series = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: d.toLocaleDateString('id-ID', { weekday: 'short' }), total: sum(sales.filter(s => dayKey(s.date) === dayKey(d)), s => s.total), today: i === 6 };
  });
  const max = Math.max(...series.map(s => s.total), 1);
  v.innerHTML = `
    <div class="stats">
      ${stat('Total Produk', num(products.length), `${num(sum(products, p => p.stock))} unit tersimpan`, 'blue', 'box')}
      ${stat('Nilai Stok', rp(sum(products, p => p.stock * p.buy)), 'berdasarkan harga beli', 'blue', 'wallet')}
      ${stat('Penjualan Hari Ini', rp(sum(todaySales, s => s.total)), `${todaySales.length} transaksi`, 'red', 'cart')}
      ${stat('Stok Menipis', num(low.length), `${products.filter(p => p.stock <= 0).length} produk habis`, low.length ? 'warn' : 'ok', 'alert')}
    </div>
    <div class="grid-2">
      <div class="card"><h3 class="card-title">Penjualan 7 Hari Terakhir</h3>
        <div class="bars">${series.map(s => `<div class="bar-col"><span class="bar-val">${s.total ? shortRp(s.total) : '-'}</span><div class="bar-wrap"><div class="bar ${s.today ? 'today' : ''}" style="height:${Math.max(s.total / max * 100, 3)}%"></div></div><span>${s.label}</span></div>`).join('')}</div>
      </div>
      <div class="card"><h3 class="card-title">Perlu Restok</h3>
        ${tbl(['Produk', 'Stok', 'Status'], low.slice(0, 6).map(p => [esc(p.name), `${p.stock} / min ${p.min}`, stockBadge(p)]), 'Semua stok aman 🎉')}
      </div>
    </div>
    <div class="card mt"><h3 class="card-title">Transaksi Terbaru</h3><div id="recent">${tbl(SALE_HEADS, saleRows(sales.slice(0, 6)))}</div></div>`;
  bindSaleDetail($('#recent'));
}

function pgProduk(v) {
  const cats = [...new Set(Store.get('products', []).map(p => p.category))].sort();
  v.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input id="q" placeholder="Cari nama atau SKU…"></div>
      <select id="cat"><option value="">Semua kategori</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select>
      <button class="btn btn-primary push" id="add">${icon('plus')} Tambah Produk</button>
    </div><div class="card" id="tbl"></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase(), c = $('#cat').value;
    const list = Store.get('products', []).filter(p => (!c || p.category === c) && (!q || (p.name + ' ' + p.sku).toLowerCase().includes(q)));
    $('#tbl').innerHTML = tbl(['SKU', 'Produk', 'Kategori', 'Harga Beli', 'Harga Jual', 'Stok', 'Status', ''],
      list.map(p => [esc(p.sku), `<b>${esc(p.name)}</b>`, esc(p.category), `<span class="num">${rp(p.buy)}</span>`, `<span class="num">${rp(p.sell)}</span>`, `${num(p.stock)} ${esc(p.unit)}`, stockBadge(p),
      `<div class="acts"><button class="btn btn-sm btn-ghost" data-edit="${p.id}">${icon('edit', 15)}</button><button class="btn btn-sm btn-ghost" data-del="${p.id}">${icon('trash', 15)}</button></div>`]),
      'Produk tidak ditemukan');
  };
  $('#q').addEventListener('input', draw); $('#cat').addEventListener('change', draw);
  $('#add').addEventListener('click', () => productModal(null, () => pgProduk(v)));
  $('#tbl').addEventListener('click', e => {
    const b = e.target.closest('[data-edit],[data-del]'); if (!b) return;
    const list = Store.get('products', []);
    if (b.dataset.edit) return productModal(list.find(p => p.id === b.dataset.edit), () => pgProduk(v));
    const p = list.find(x => x.id === b.dataset.del);
    confirmDialog(`Hapus produk <b>${esc(p.name)}</b>? Riwayat transaksi tetap tersimpan.`, () => {
      Store.set('products', list.filter(x => x.id !== p.id));
      addLog('Hapus produk', p.name); toast('Produk dihapus'); pgProduk(v);
    });
  });
  draw();
}

function productModal(p, done) {
  const edit = !!p; p = p || {};
  const cats = [...new Set(Store.get('products', []).map(x => x.category))];
  openModal({
    title: edit ? 'Edit Produk' : 'Tambah Produk', wide: true,
    body: `<div class="fgrid">
      ${field('SKU / Kode', 'sku', { value: p.sku, req: 1 })}
      ${field('Nama Produk', 'name', { value: p.name, req: 1 })}
      ${field('Kategori', 'category', { value: p.category, req: 1, attrs: 'list="catlist"' })}
      <datalist id="catlist">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      ${field('Satuan', 'unit', { value: p.unit || 'pcs', req: 1 })}
      ${field('Harga Beli (Rp)', 'buy', { type: 'number', value: p.buy ?? '', req: 1, attrs: 'min="0" step="1"' })}
      ${field('Harga Jual (Rp)', 'sell', { type: 'number', value: p.sell ?? '', req: 1, attrs: 'min="0" step="1"' })}
      ${field(edit ? 'Stok Saat Ini' : 'Stok Awal', 'stock', { type: 'number', value: p.stock ?? 0, req: 1, attrs: edit ? 'readonly' : 'min="0" step="1"' })}
      ${field('Stok Minimum', 'min', { type: 'number', value: p.min ?? 5, req: 1, attrs: 'min="0" step="1"' })}
    </div>${edit ? '<p class="hint">Stok diubah melalui halaman Gudang (barang masuk / keluar).</p>' : ''}`,
    onSubmit: d => {
      const list = Store.get('products', []);
      const sku = d.sku.trim().toUpperCase();
      if (list.some(x => x.sku === sku && x.id !== p.id)) { toast('SKU sudah dipakai produk lain', 'err'); return false; }
      const data = { sku, name: d.name.trim(), category: d.category.trim(), unit: d.unit.trim(), buy: +d.buy, sell: +d.sell, min: +d.min };
      if (edit) Object.assign(list.find(x => x.id === p.id), data);
      else list.push({ id: uid('p'), ...data, stock: Math.max(0, Math.floor(+d.stock)) });
      Store.set('products', list);
      addLog(edit ? 'Edit produk' : 'Tambah produk', data.name);
      toast(edit ? 'Produk diperbarui' : 'Produk ditambahkan'); done();
    }
  });
}

function pgSupplier(v) {
  v.innerHTML = `<div class="toolbar"><div class="search">${icon('search')}<input id="q" placeholder="Cari supplier…"></div><button class="btn btn-primary push" id="add">${icon('plus')} Tambah Supplier</button></div><div class="card" id="tbl"></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = Store.get('suppliers', []).filter(s => !q || (s.name + s.phone + s.address).toLowerCase().includes(q));
    $('#tbl').innerHTML = tbl(['Nama', 'Telepon', 'Alamat', ''], list.map(s => [`<b>${esc(s.name)}</b>`, esc(s.phone), esc(s.address),
    `<div class="acts"><button class="btn btn-sm btn-ghost" data-edit="${s.id}">${icon('edit', 15)}</button><button class="btn btn-sm btn-ghost" data-del="${s.id}">${icon('trash', 15)}</button></div>`]), 'Supplier tidak ditemukan');
  };
  const modal = s => {
    const edit = !!s; s = s || {};
    openModal({
      title: edit ? 'Edit Supplier' : 'Tambah Supplier',
      body: `<div class="fgrid one">${field('Nama Supplier', 'name', { value: s.name, req: 1 })}${field('Telepon', 'phone', { value: s.phone, req: 1 })}${field('Alamat', 'address', { value: s.address })}</div>`,
      onSubmit: d => {
        const list = Store.get('suppliers', []);
        const data = { name: d.name.trim(), phone: d.phone.trim(), address: d.address.trim() };
        if (edit) Object.assign(list.find(x => x.id === s.id), data); else list.push({ id: uid('sp'), ...data });
        Store.set('suppliers', list); addLog(edit ? 'Edit supplier' : 'Tambah supplier', data.name);
        toast('Supplier tersimpan'); pgSupplier(v);
      }
    });
  };
  $('#q').addEventListener('input', draw);
  $('#add').addEventListener('click', () => modal());
  $('#tbl').addEventListener('click', e => {
    const b = e.target.closest('[data-edit],[data-del]'); if (!b) return;
    const list = Store.get('suppliers', []);
    if (b.dataset.edit) return modal(list.find(s => s.id === b.dataset.edit));
    const s = list.find(x => x.id === b.dataset.del);
    confirmDialog(`Hapus supplier <b>${esc(s.name)}</b>?`, () => { Store.set('suppliers', list.filter(x => x.id !== s.id)); addLog('Hapus supplier', s.name); toast('Supplier dihapus'); pgSupplier(v); });
  });
  draw();
}

function pgUsers(v) {
  v.innerHTML = `<div class="toolbar"><div class="search">${icon('search')}<input id="q" placeholder="Cari pengguna…"></div><button class="btn btn-primary push" id="add">${icon('plus')} Tambah Pengguna</button></div><div class="card" id="tbl"></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase();
    const list = Store.get('users', []).filter(u => !q || (u.name + u.username).toLowerCase().includes(q));
    $('#tbl').innerHTML = tbl(['Nama', 'Username', 'Peran', 'Status', ''], list.map(u => [`<b>${esc(u.name)}</b>`, esc(u.username), `<span class="role-tag role-${u.role}">${ROLE_LABEL[u.role]}</span>`,
      u.active ? '<span class="badge b-ok">Aktif</span>' : '<span class="badge b-red">Nonaktif</span>',
    `<div class="acts"><button class="btn btn-sm btn-ghost" data-edit="${u.id}">${icon('edit', 15)}</button>${u.id === state.user.id ? '' : `<button class="btn btn-sm btn-ghost" data-del="${u.id}">${icon('trash', 15)}</button>`}</div>`]));
  };
  const modal = u => {
    const edit = !!u; u = u || { role: 'kasir', active: true };
    const self = edit && u.id === state.user.id;
    openModal({
      title: edit ? 'Edit Pengguna' : 'Tambah Pengguna',
      body: `<div class="fgrid">
        ${field('Nama Lengkap', 'name', { value: u.name, req: 1 })}
        ${field('Username', 'username', { value: u.username, req: 1, attrs: 'autocomplete="off"' })}
        ${field(edit ? 'Password Baru (kosongkan jika tetap)' : 'Password', 'password', { type: 'password', req: !edit, attrs: 'autocomplete="new-password" minlength="4"' })}
        ${selectField('Peran', 'role', [['admin', 'Admin'], ['gudang', 'Gudang'], ['kasir', 'Kasir']], u.role, { req: 1 })}
        ${selectField('Status', 'active', [['1', 'Aktif'], ['0', 'Nonaktif']], u.active ? '1' : '0')}
      </div>${self ? '<p class="hint">Peran dan status akun yang sedang dipakai tidak dapat diubah.</p>' : ''}`,
      onSubmit: d => {
        const list = Store.get('users', []);
        const username = d.username.trim();
        if (list.some(x => x.username === username && x.id !== u.id)) { toast('Username sudah dipakai', 'err'); return false; }
        const data = { name: d.name.trim(), username, role: self ? u.role : d.role, active: self ? true : d.active === '1' };
        if (edit) { const t = list.find(x => x.id === u.id); Object.assign(t, data); if (d.password) t.password = d.password; if (self) state.user = t; }
        else list.push({ id: uid('u'), ...data, password: d.password });
        Store.set('users', list); addLog(edit ? 'Edit pengguna' : 'Tambah pengguna', username);
        toast('Pengguna tersimpan'); pgUsers(v);
      }
    });
  };
  $('#q').addEventListener('input', draw);
  $('#add').addEventListener('click', () => modal());
  $('#tbl').addEventListener('click', e => {
    const b = e.target.closest('[data-edit],[data-del]'); if (!b) return;
    const list = Store.get('users', []);
    if (b.dataset.edit) return modal(list.find(x => x.id === b.dataset.edit));
    const u = list.find(x => x.id === b.dataset.del);
    confirmDialog(`Hapus pengguna <b>${esc(u.username)}</b>?`, () => { Store.set('users', list.filter(x => x.id !== u.id)); addLog('Hapus pengguna', u.username); toast('Pengguna dihapus'); pgUsers(v); });
  });
  draw();
}

function pgLaporan(v) {
  let tab = 'sales';
  const from = new Date(); from.setDate(from.getDate() - 30);
  v.innerHTML = `
    <div class="toolbar">
      <div class="tabs" id="tabs"><button data-t="sales" class="active">Penjualan</button><button data-t="in">Barang Masuk</button><button data-t="out">Barang Keluar</button></div>
      <label class="inline">Dari <input type="date" id="from" value="${dayKey(from)}"></label>
      <label class="inline">Sampai <input type="date" id="to" value="${dayKey(new Date())}"></label>
      <button class="btn btn-ghost push" id="csv">Ekspor CSV</button>
    </div>
    <div class="stats" id="sum"></div><div class="card" id="tbl"></div>`;
  let report = { heads: [], rows: [] };
  const draw = () => {
    const f = $('#from').value, t = $('#to').value;
    const inRange = d => { const k = dayKey(d); return (!f || k >= f) && (!t || k <= t); };
    if (tab === 'sales') {
      const list = Store.get('sales', []).filter(s => inRange(s.date));
      const omzet = sum(list, s => s.total), laba = sum(list, s => sum(s.items, i => i.qty * (i.price - i.cost)));
      $('#sum').innerHTML = stat('Transaksi', num(list.length), 'pada periode ini', 'blue', 'receipt') + stat('Omzet', rp(omzet), 'total penjualan', 'red', 'cart') + stat('Laba Kotor', rp(laba), 'omzet − harga beli', 'ok', 'chart');
      report = { heads: ['No. Invoice', 'Waktu', 'Kasir', 'Metode', 'Item', 'Total', 'Laba'], rows: list.map(s => [s.no, fmtDT(s.date), s.cashier, s.method, sum(s.items, i => i.qty), s.total, sum(s.items, i => i.qty * (i.price - i.cost))]) };
      $('#tbl').innerHTML = tbl([...report.heads, ''], list.map((s, i) => [`<b>${esc(s.no)}</b>`, fmtDT(s.date), esc(s.cashier), esc(s.method), num(report.rows[i][4]), rp(s.total), rp(report.rows[i][6]), `<button class="btn btn-sm btn-ghost" data-sale="${s.id}">Detail</button>`]), 'Tidak ada transaksi pada periode ini');
    } else {
      const list = Store.get('movements', []).filter(m => m.type === tab && inRange(m.date));
      $('#sum').innerHTML = stat(tab === 'in' ? 'Jumlah Penerimaan' : 'Jumlah Pengeluaran', num(list.length), 'catatan', 'blue', tab === 'in' ? 'download' : 'upload') + stat('Total Unit', num(sum(list, m => m.qty)), 'unit barang', 'red', 'box');
      report = { heads: ['Waktu', 'SKU', 'Produk', 'Jumlah', tab === 'in' ? 'Supplier' : 'Alasan', 'Catatan', 'Petugas'], rows: list.map(m => [fmtDT(m.date), m.sku, m.name, `${m.qty} ${m.unit}`, m.ref, m.note, m.by]) };
      $('#tbl').innerHTML = tbl(report.heads, report.rows.map(r => r.map(esc)), 'Tidak ada data pada periode ini');
    }
  };
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; tab = b.dataset.t; $$('#tabs button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
  $('#from').addEventListener('change', draw); $('#to').addEventListener('change', draw);
  $('#csv').addEventListener('click', () => { downloadCSV(`laporan-${tab}-${dayKey(new Date())}.csv`, report.heads, report.rows); addLog('Ekspor laporan', tab); });
  bindSaleDetail($('#tbl'));
  draw();
}

function pgLog(v) {
  const logs = Store.get('logs', []);
  v.innerHTML = `<div class="toolbar"><span class="muted">${logs.length} aktivitas terakhir</span>
    <button class="btn btn-ghost push" id="clr">Bersihkan Log</button><button class="btn btn-red" id="rst">Reset Data Demo</button></div>
    <div class="card">${tbl(['Waktu', 'Pengguna', 'Peran', 'Aktivitas', 'Detail'], logs.map(l => [fmtDT(l.date), esc(l.user), `<span class="role-tag role-${l.role}">${ROLE_LABEL[l.role] || '-'}</span>`, `<b>${esc(l.action)}</b>`, esc(l.detail)]), 'Belum ada aktivitas')}</div>`;
  $('#clr').addEventListener('click', () => confirmDialog('Hapus seluruh log aktivitas?', () => { Store.set('logs', []); toast('Log dibersihkan'); pgLog(v); }, 'Bersihkan'));
  $('#rst').addEventListener('click', () => confirmDialog('Semua data (produk, transaksi, pengguna) akan dikembalikan ke data demo awal. Lanjutkan?', () => {
    Store.reset(); seed(); state.user = null; state.cart = []; renderApp(); toast('Data demo dipulihkan');
  }, 'Reset Data'));
}

/* =========================================================
   HALAMAN GUDANG
   ========================================================= */
function pgGudangDash(v) {
  const products = Store.get('products', []), mv = Store.get('movements', []);
  const low = products.filter(p => p.stock > 0 && p.stock <= p.min), empty = products.filter(p => p.stock <= 0);
  const today = dayKey(new Date());
  const inToday = sum(mv.filter(m => m.type === 'in' && dayKey(m.date) === today), m => m.qty);
  const outToday = sum(mv.filter(m => m.type === 'out' && dayKey(m.date) === today), m => m.qty);
  v.innerHTML = `
    <div class="stats">
      ${stat('Jenis Barang', num(products.length), 'terdaftar di sistem', 'blue', 'box')}
      ${stat('Total Unit Stok', num(sum(products, p => p.stock)), 'semua produk', 'blue', 'home')}
      ${stat('Stok Menipis', num(low.length), 'di bawah batas minimum', 'warn', 'alert')}
      ${stat('Stok Habis', num(empty.length), 'perlu segera restok', empty.length ? 'red' : 'ok', 'alert')}
      ${stat('Masuk Hari Ini', num(inToday), 'unit', 'ok', 'download')}
      ${stat('Keluar Hari Ini', num(outToday), 'unit (di luar penjualan)', 'red', 'upload')}
    </div>
    <div class="grid-2">
      <div class="card"><h3 class="card-title">Perlu Restok</h3>${tbl(['Produk', 'Stok', 'Minimum', 'Status'], [...empty, ...low].map(p => [`<b>${esc(p.name)}</b>`, `${p.stock} ${esc(p.unit)}`, p.min, stockBadge(p)]), 'Semua stok aman 🎉')}</div>
      <div class="card"><h3 class="card-title">Aktivitas Gudang Terbaru</h3>${tbl(['Waktu', 'Produk', 'Jumlah'], mv.slice(0, 7).map(m => [fmtDT(m.date), esc(m.name), `<span class="badge ${m.type === 'in' ? 'b-ok' : 'b-red'}">${m.type === 'in' ? '+' : '−'}${m.qty}</span>`]), 'Belum ada aktivitas')}</div>
    </div>`;
}

function pgStok(v) {
  v.innerHTML = `<div class="toolbar">
    <div class="search">${icon('search')}<input id="q" placeholder="Cari nama atau SKU…"></div>
    <select id="flt"><option value="">Semua status</option><option value="low">Menipis</option><option value="zero">Habis</option><option value="ok">Aman</option></select></div>
    <div class="card" id="tbl"></div>`;
  const draw = () => {
    const q = $('#q').value.trim().toLowerCase(), f = $('#flt').value;
    const list = Store.get('products', []).filter(p => (!q || (p.name + ' ' + p.sku).toLowerCase().includes(q)) &&
      (!f || (f === 'zero' ? p.stock <= 0 : f === 'low' ? p.stock > 0 && p.stock <= p.min : p.stock > p.min)));
    $('#tbl').innerHTML = tbl(['SKU', 'Produk', 'Kategori', 'Stok', 'Minimum', 'Status', ''],
      list.map(p => [esc(p.sku), `<b>${esc(p.name)}</b>`, esc(p.category), `<b>${num(p.stock)}</b> ${esc(p.unit)}${meter(p)}`, p.min, stockBadge(p), `<button class="btn btn-sm btn-ghost" data-in="${p.id}">${icon('download', 15)} Tambah stok</button>`]), 'Barang tidak ditemukan');
  };
  $('#q').addEventListener('input', draw); $('#flt').addEventListener('change', draw);
  $('#tbl').addEventListener('click', e => { const b = e.target.closest('[data-in]'); if (b) { state.preselect = b.dataset.in; goTo('masuk'); } });
  draw();
}

function moveStock(type, { productId, qty, ref, note }) {
  qty = Math.floor(+qty);
  if (!(qty > 0)) return 'Jumlah harus lebih dari 0';
  const products = Store.get('products', []);
  const p = products.find(x => x.id === productId);
  if (!p) return 'Pilih produk terlebih dahulu';
  if (type === 'out' && qty > p.stock) return `Stok tidak cukup (tersedia ${p.stock} ${p.unit})`;
  p.stock += type === 'in' ? qty : -qty;
  Store.set('products', products);
  const mv = Store.get('movements', []);
  mv.unshift({ id: uid('m'), date: new Date().toISOString(), type, productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty, ref: ref || '', note: (note || '').trim(), by: state.user.name, after: p.stock });
  Store.set('movements', mv);
  addLog(type === 'in' ? 'Barang masuk' : 'Barang keluar', `${p.name} × ${qty}${ref ? ' (' + ref + ')' : ''}`);
  return null;
}

function pgMove(v, type) {
  const isIn = type === 'in';
  const products = Store.get('products', []), sup = Store.get('suppliers', []);
  const pre = state.preselect; state.preselect = null;
  const hist = Store.get('movements', []).filter(m => m.type === type).slice(0, 30);
  v.innerHTML = `<div class="split">
    <div class="card"><h3 class="card-title">${isIn ? 'Catat Barang Masuk' : 'Catat Barang Keluar'}</h3>
      <form id="mf" class="fgrid one">
        ${selectField('Produk', 'productId', [['', '— Pilih produk —'], ...products.map(p => [p.id, `${p.name} (stok ${p.stock} ${p.unit})`])], pre || '', { req: 1 })}
        ${field('Jumlah', 'qty', { type: 'number', req: 1, attrs: 'min="1" step="1" placeholder="0"' })}
        ${isIn ? selectField('Supplier', 'ref', [['', '— Tanpa supplier —'], ...sup.map(s => [s.name, s.name])], '') : selectField('Alasan', 'ref', REASONS.map(r => [r, r]), 'Rusak', { req: 1 })}
        ${field('Catatan', 'note', { attrs: 'placeholder="Opsional, mis. nomor surat jalan"' })}
        <button class="btn ${isIn ? 'btn-primary' : 'btn-red'} lg" type="submit">${icon(isIn ? 'download' : 'upload')} ${isIn ? 'Simpan Barang Masuk' : 'Simpan Barang Keluar'}</button>
      </form></div>
    <div class="card"><h3 class="card-title">Riwayat ${isIn ? 'Barang Masuk' : 'Barang Keluar'}</h3>
      ${tbl(['Waktu', 'Produk', 'Jumlah', isIn ? 'Supplier' : 'Alasan', 'Catatan', 'Stok Akhir'], hist.map(m => [fmtDT(m.date), `<b>${esc(m.name)}</b><span class="sub">${esc(m.by)}</span>`, `<span class="badge ${isIn ? 'b-ok' : 'b-red'}">${isIn ? '+' : '−'}${m.qty} ${esc(m.unit)}</span>`, esc(m.ref || '-'), esc(m.note || '-'), num(m.after)]), 'Belum ada riwayat')}
    </div></div>`;
  $('#mf').addEventListener('submit', e => {
    e.preventDefault();
    const err = moveStock(type, Object.fromEntries(new FormData(e.target)));
    if (err) return toast(err, 'err');
    toast(isIn ? 'Barang masuk tercatat, stok bertambah' : 'Barang keluar tercatat, stok berkurang');
    pgMove(v, type);
  });
}

/* =========================================================
   HALAMAN KASIR
   ========================================================= */
function pgPOS(v) {
  const cart = state.cart;
  const cats = [...new Set(Store.get('products', []).map(p => p.category))].sort();
  v.innerHTML = `<div class="pos">
    <section>
      <div class="toolbar"><div class="search">${icon('search')}<input id="q" placeholder="Cari produk / ketik SKU lalu Enter…" autocomplete="off"></div>
        <select id="cat"><option value="">Semua kategori</option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="pgrid" id="pgrid"></div>
    </section>
    <aside class="pos-cart card">
      <div class="cart-head"><h3>Keranjang</h3><button class="link-btn" id="clear">Kosongkan</button></div>
      <div class="cart-items" id="items"></div>
      <div class="cart-sum">
        <div class="row"><span>Total</span><strong id="total">Rp 0</strong></div>
        <label class="fld"><span>Metode Pembayaran</span><select id="method"><option>Tunai</option><option>QRIS</option><option>Transfer</option></select></label>
        <label class="fld"><span>Uang Diterima</span><input id="paid" type="number" min="0" placeholder="0"></label>
        <div class="quick" id="quick"></div>
        <div class="row"><span>Kembalian</span><strong id="change">Rp 0</strong></div>
        <button class="btn btn-red block lg" id="pay">${icon('receipt')} Bayar &amp; Cetak Struk</button>
      </div>
    </aside></div>`;

  const prod = id => Store.get('products', []).find(p => p.id === id);
  const total = () => sum(cart, l => { const p = prod(l.id); return p ? l.qty * p.sell : 0; });

  const drawGrid = () => {
    const q = $('#q').value.trim().toLowerCase(), c = $('#cat').value;
    const list = Store.get('products', []).filter(p => (!c || p.category === c) && (!q || (p.name + ' ' + p.sku).toLowerCase().includes(q)));
    $('#pgrid').innerHTML = list.length ? list.map(p => `<button class="pcard" data-id="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>
      <span class="pname">${esc(p.name)}</span><span class="psku">${esc(p.sku)} · ${esc(p.category)}</span><span class="pprice">${rp(p.sell)}</span>
      <span class="pstock ${p.stock <= 0 ? 'zero' : p.stock <= p.min ? 'low' : ''}">${p.stock <= 0 ? 'Stok habis' : `Stok ${num(p.stock)} ${esc(p.unit)}`}</span></button>`).join('') : '<p class="muted">Produk tidak ditemukan.</p>';
  };
  const updateChange = () => {
    const t = total(), isCash = $('#method').value === 'Tunai';
    if (!isCash) $('#paid').value = t || '';
    const paid = +$('#paid').value || 0, ch = paid - t, el = $('#change');
    el.textContent = ch >= 0 ? rp(ch) : 'Kurang ' + rp(-ch);
    el.classList.toggle('neg', ch < 0 && t > 0);
  };
  const drawCart = () => {
    $('#items').innerHTML = cart.length ? cart.map(l => {
      const p = prod(l.id); if (!p) return '';
      return `<div class="cline"><b>${esc(p.name)}</b><b>${rp(l.qty * p.sell)}</b>
        <small>${rp(p.sell)} / ${esc(p.unit)}</small>
        <div style="display:flex;gap:10px;align-items:center;justify-content:flex-end"><div class="qty"><button data-dec="${l.id}">−</button><span>${l.qty}</span><button data-inc="${l.id}">+</button></div><button class="del" data-rm="${l.id}">Hapus</button></div></div>`;
    }).join('') : '<div class="cart-empty">Keranjang kosong.<br>Klik produk untuk menambahkan.</div>';
    $('#total').textContent = rp(total());
    $('#quick').innerHTML = $('#method').value === 'Tunai' && total() > 0 ? `<button data-cash="${total()}">Uang pas</button>${[20000, 50000, 100000].map(n => `<button data-cash="${n}">${num(n)}</button>`).join('')}` : '';
    updateChange();
  };
  const addToCart = id => {
    const p = prod(id); if (!p) return;
    const line = cart.find(l => l.id === id);
    if ((line ? line.qty : 0) + 1 > p.stock) return toast(`Stok ${p.name} tidak mencukupi`, 'err');
    if (line) line.qty++; else cart.push({ id, qty: 1 });
    drawCart();
  };

  $('#q').addEventListener('input', drawGrid);
  $('#cat').addEventListener('change', drawGrid);
  $('#q').addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const list = Store.get('products', []);
    const m = list.find(p => p.sku.toLowerCase() === q) || (list.filter(p => (p.name + p.sku).toLowerCase().includes(q)).length === 1 ? list.find(p => (p.name + p.sku).toLowerCase().includes(q)) : null);
    if (m && m.stock > 0) { addToCart(m.id); e.target.value = ''; drawGrid(); }
  });
  $('#pgrid').addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) addToCart(b.dataset.id); });
  $('#items').addEventListener('click', e => {
    const b = e.target.closest('[data-inc],[data-dec],[data-rm]'); if (!b) return;
    const id = b.dataset.inc || b.dataset.dec || b.dataset.rm, i = cart.findIndex(l => l.id === id);
    if (i < 0) return;
    if (b.dataset.inc) return addToCart(id);
    if (b.dataset.dec && --cart[i].qty > 0) return drawCart();
    cart.splice(i, 1); drawCart();
  });
  $('#quick').addEventListener('click', e => { const b = e.target.closest('[data-cash]'); if (b) { $('#paid').value = b.dataset.cash; updateChange(); } });
  $('#paid').addEventListener('input', updateChange);
  $('#method').addEventListener('change', () => { const cash = $('#method').value === 'Tunai'; $('#paid').disabled = !cash; if (cash) $('#paid').value = ''; drawCart(); });
  $('#clear').addEventListener('click', () => { cart.length = 0; drawCart(); });

  $('#pay').addEventListener('click', () => {
    if (!cart.length) return toast('Keranjang masih kosong', 'err');
    const method = $('#method').value, t = total();
    const paid = method === 'Tunai' ? (+$('#paid').value || 0) : t;
    if (paid < t) return toast('Uang diterima kurang dari total', 'err');
    const products = Store.get('products', []);
    for (const l of cart) {
      const p = products.find(x => x.id === l.id);
      if (!p || p.stock < l.qty) return toast(`Stok ${p ? p.name : 'produk'} tidak mencukupi`, 'err');
    }
    const items = cart.map(l => { const p = products.find(x => x.id === l.id); p.stock -= l.qty; return { productId: p.id, name: p.name, sku: p.sku, unit: p.unit, qty: l.qty, price: p.sell, cost: p.buy }; });
    Store.set('products', products);
    const sales = Store.get('sales', []);
    const sale = { id: uid('s'), no: invoiceNo(sales), date: new Date().toISOString(), cashierId: state.user.id, cashier: state.user.name, items, total: t, paid, change: paid - t, method };
    sales.unshift(sale); Store.set('sales', sales);
    addLog('Transaksi', `${sale.no} • ${rp(t)}`);
    state.cart = [];
    pgPOS(v); showReceipt(sale); toast('Transaksi berhasil disimpan');
  });
  drawGrid(); drawCart();
}

function pgRiwayat(v) {
  v.innerHTML = `<div class="stats" id="sum"></div>
    <div class="toolbar"><label class="inline">Tanggal <input type="date" id="d" value="${dayKey(new Date())}"></label>
      <button class="btn btn-ghost" id="all">Semua tanggal</button>
      <div class="search">${icon('search')}<input id="q" placeholder="Cari no. invoice"></div></div>
    <div class="card" id="tbl"></div>`;
  const draw = () => {
    const d = $('#d').value, q = $('#q').value.trim().toLowerCase();
    const list = Store.get('sales', []).filter(s => s.cashierId === state.user.id && (!d || dayKey(s.date) === d) && (!q || s.no.toLowerCase().includes(q)));
    $('#sum').innerHTML = stat('Transaksi', num(list.length), d ? 'pada tanggal dipilih' : 'semua tanggal', 'blue', 'receipt') + stat('Total Penjualan', rp(sum(list, s => s.total)), 'omzet Anda', 'red', 'cart') + stat('Barang Terjual', num(sum(list, s => sum(s.items, i => i.qty))), 'unit', 'ok', 'box');
    $('#tbl').innerHTML = tbl(SALE_HEADS, saleRows(list), 'Belum ada transaksi');
  };
  $('#d').addEventListener('change', draw); $('#q').addEventListener('input', draw);
  $('#all').addEventListener('click', () => { $('#d').value = ''; draw(); });
  bindSaleDetail($('#tbl'));
  draw();
}

/* ---------- Peta halaman per peran ---------- */
const PAGES = {
  admin: { dashboard: pgAdminDash, produk: pgProduk, supplier: pgSupplier, pengguna: pgUsers, laporan: pgLaporan, log: pgLog },
  gudang: { dashboard: pgGudangDash, stok: pgStok, masuk: v => pgMove(v, 'in'), keluar: v => pgMove(v, 'out') },
  kasir: { kasir: pgPOS, riwayat: pgRiwayat }
};

/* ---------- Mulai ---------- */
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
setInterval(tickClock, 30000);
seed();
(function init() {
  const sid = Store.get('session');
  const u = sid && Store.get('users', []).find(x => x.id === sid && x.active);
  if (u) { state.user = u; state.page = Store.get('page', MENUS[u.role][0].id); }
  renderApp();
})();