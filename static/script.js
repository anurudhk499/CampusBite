/* CampusBite: vanilla JavaScript prototype. Data is stored in localStorage (browser only). */
(function () {
  'use strict';

  /* ---------- Menu data (edit here) ---------- */
  var CATEGORIES = ['South Indian', 'Snacks', 'Rice & Noodles', 'Beverages'];
  function item(id, name, cat, price, desc, icon, available) {
    return { id: id, name: name, cat: cat, price: price, desc: desc, icon: icon, available: available !== false };
  }
  var MENU = [
    item('idli', 'Idli', 'South Indian', 30, 'Two soft steamed idlis with sambar and chutney.', '🍥'),
    item('vada', 'Vada', 'South Indian', 30, 'Crisp medu vada with sambar and chutney.', '🍩'),
    item('palav', 'Palav', 'South Indian', 50, 'Fragrant rice cooked with vegetables and mild spices.', '🍛'),
    item('rice-bath', 'Rice Bath', 'South Indian', 40, 'Soft Karnataka-style rice bath with vegetables.', '🍚'),
    item('set-dosa', 'Set Dosa', 'South Indian', 45, 'Three soft, spongy dosas with chutney and sagu.', '🥞'),
    item('masala-dosa', 'Masala Dosa', 'South Indian', 50, 'Crisp dosa filled with spiced potato masala.', '🌯'),
    item('mysore-masala-dosa', 'Mysore Masala Dosa', 'South Indian', 60, 'Dosa with red chutney spread and potato masala.', '🌯'),
    item('paneer-masala-dosa', 'Paneer Masala Dosa', 'South Indian', 80, 'Dosa stuffed with spiced paneer and potato.', '🧀'),
    item('schezwan-masala-dosa', 'Schezwan Masala Dosa', 'South Indian', 70, 'Indo-Chinese twist with schezwan sauce and vegetables.', '🌶️'),
    item('pav-bhaji', 'Pav Bhaji', 'Snacks', 60, 'Buttery mashed vegetable bhaji with toasted pav.', '🍞'),
    item('gobi-manchurian', 'Gobi Manchurian', 'Snacks', 70, 'Crispy cauliflower in a tangy manchurian sauce.', '🥦'),
    item('french-fries', 'French Fries', 'Snacks', 50, 'Golden salted fries with ketchup.', '🍟'),
    item('peri-peri-fries', 'Peri-Peri Fries', 'Snacks', 60, 'Fries dusted with spicy peri-peri seasoning.', '🍟', false),
    item('veg-fried-rice', 'Veg Fried Rice', 'Rice & Noodles', 70, 'Wok-tossed rice with fresh vegetables.', '🍚'),
    item('veg-noodles', 'Veg Noodles', 'Rice & Noodles', 70, 'Stir-fried noodles with crunchy vegetables.', '🍜'),
    item('schezwan-noodles', 'Schezwan Noodles', 'Rice & Noodles', 80, 'Spicy schezwan noodles with vegetables.', '🍜'),
    item('regular-tea', 'Regular Tea', 'Beverages', 12, 'Classic milk tea.', '☕'),
    item('lemon-tea', 'Lemon Tea', 'Beverages', 15, 'Light tea with a squeeze of lemon.', '🍋'),
    item('filter-coffee', 'Filter Coffee', 'Beverages', 15, 'Strong South Indian filter coffee with milk.', '☕'),
    item('cold-coffee', 'Cold Coffee', 'Beverages', 40, 'Chilled blended coffee with milk.', '🥤')
  ];
  var STATUSES = ['Confirmed', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
  var NEXT = { 'Confirmed': ['Preparing', 'Start preparing'], 'Preparing': ['Ready for Pickup', 'Mark ready'], 'Ready for Pickup': ['Completed', 'Mark collected'] };

  /* ---------- Helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var inr = function (n) { return '₹' + Number(n).toLocaleString('en-IN'); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var dateStr = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  var toMin = function (t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); };
  var fmtTime = function (t) { var p = t.split(':'), h = Number(p[0]); return (h % 12 || 12) + ':' + p[1] + ' ' + (h < 12 ? 'AM' : 'PM'); };
  var slotDate = function (d, t) { var a = d.split('-'), b = t.split(':'); return new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]), Number(b[0]), Number(b[1])); };
  var labelDate = function (d) {
    var now = new Date(), tm = new Date(); tm.setDate(tm.getDate() + 1);
    if (d === dateStr(now)) return 'Today';
    if (d === dateStr(tm)) return 'Tomorrow';
    return slotDate(d, '00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  /* ---------- Storage (falls back to memory if localStorage is blocked) ---------- */
  var KEY = 'campusbite-lite-v1', CART_KEY = 'campusbite-lite-cart', DEV_KEY = 'campusbite-lite-device';
  var mem = {};
  function sget(k) { try { return window.localStorage.getItem(k); } catch (e) { return mem[k] || null; } }
  function sset(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { mem[k] = v; } }
  function defaults() {
    return { menu: JSON.parse(JSON.stringify(MENU)), orders: [], counter: 100,
      settings: { capacity: 6, slotMinutes: 15, open: '09:30', close: '16:30', cutoff: 15, daysAhead: 2 } };
  }
  function load() {
    var d = defaults();
    try {
      var s = JSON.parse(sget(KEY));
      if (s && Array.isArray(s.menu) && Array.isArray(s.orders)) {
        d.menu = s.menu; d.orders = s.orders; d.counter = Number(s.counter) || 100;
        for (var k in s.settings) d.settings[k] = s.settings[k];
      }
    } catch (e) { /* corrupt data: use defaults */ }
    return d;
  }
  function save() { sset(KEY, JSON.stringify(db)); }
  function loadCart() { try { var c = JSON.parse(sget(CART_KEY)); return c && typeof c === 'object' ? c : {}; } catch (e) { return {}; } }
  function saveCart() { sset(CART_KEY, JSON.stringify(cart)); }
  var device = sget(DEV_KEY) || Math.random().toString(36).slice(2);
  sset(DEV_KEY, device);

  var db = load(), cart = loadCart();
  var view = 'home', cat = 'All', query = '', selDate = dateStr(new Date()), selSlot = '';
  var trackToken = '', justPlaced = '', staffTab = 'orders';
  var remoteSlotUsage = {}, remoteSlotDate = '', slotUsageBusy = false;

  /* ---------- Slot logic ---------- */
  function genSlots() {
    var s = db.settings, out = [], step = Math.max(5, Number(s.slotMinutes) || 15);
    for (var m = toMin(s.open); m <= toMin(s.close); m += step) out.push(pad(Math.floor(m / 60)) + ':' + pad(m % 60));
    return out;
  }
  function slotInfo(date, t) {
    var used = remoteSlotDate === date ? Number(remoteSlotUsage[t] || 0) : db.orders.filter(function (o) { return o.date === date && o.slot === t && o.status !== 'Cancelled'; }).length;
    var cap = Number(db.settings.capacity);
    var closed = Date.now() >= slotDate(date, t).getTime() - Number(db.settings.cutoff) * 60000;
    return { used: used, cap: cap, left: Math.max(0, cap - used), full: used >= cap, closed: closed, disabled: closed || used >= cap };
  }
  function dayList() { var out = []; for (var i = 0; i <= Number(db.settings.daysAhead); i++) { var d = new Date(); d.setDate(d.getDate() + i); out.push(dateStr(d)); } return out; }

  /* ---------- Cart helpers ---------- */
  function lines() {
    return Object.keys(cart).map(function (id) { return { id: id, qty: cart[id], item: db.menu.filter(function (m) { return m.id === id; })[0] }; })
      .filter(function (l) { return l.item && l.qty > 0; });
  }
  function totals() { var l = lines(); return { count: l.reduce(function (a, x) { return a + x.qty; }, 0), total: l.reduce(function (a, x) { return a + x.qty * x.item.price; }, 0) }; }

  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- Rendering ---------- */
  function qtyHtml(id, q) {
    return '<div class="qty" role="group" aria-label="Quantity"><button data-act="dec" data-id="' + id + '" aria-label="Decrease quantity">−</button><span>' + q + '</span><button data-act="inc" data-id="' + id + '" aria-label="Increase quantity">+</button></div>';
  }
  var FOOD_IMAGES = {
    'idli':'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=900&q=85',
    'vada':'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=85',
    'palav':'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=85',
    'rice-bath':'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85',
    'set-dosa':'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=85',
    'masala-dosa':'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=85',
    'mysore-masala-dosa':'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=85',
    'paneer-masala-dosa':'https://images.unsplash.com/photo-1630383249896-424e482df921?auto=format&fit=crop&w=900&q=85',
    'schezwan-masala-dosa':'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=900&q=85',
    'pav-bhaji':'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=85',
    'gobi-manchurian':'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=85',
    'french-fries':'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
    'peri-peri-fries':'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=85',
    'veg-fried-rice':'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=85',
    'veg-noodles':'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85',
    'schezwan-noodles':'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=900&q=85',
    'regular-tea':'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?auto=format&fit=crop&w=900&q=85',
    'lemon-tea':'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85',
    'filter-coffee':'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=85',
    'cold-coffee':'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=85'
  };
  function foodCard(i) {
    var q = cart[i.id] || 0;
    var action = !i.available ? '<span class="muted">Unavailable</span>' : q ? qtyHtml(i.id, q) : '<button class="btn sm" data-act="inc" data-id="' + i.id + '">Add <span aria-hidden="true">＋</span></button>';
    var image = FOOD_IMAGES[i.id] || '';
    return '<article class="card food' + (i.available ? '' : ' off') + '"><div class="food-img">' +
      '<img src="' + image + '" alt="' + esc(i.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">' +
      '<span class="food-fallback" style="display:none">' + i.icon + '</span>' + (i.available ? '' : '<em class="sold">Sold out</em>') +
      '<span class="image-tag">VEG · FRESH</span></div>' +
      '<div class="food-body"><div class="food-h"><span class="veg" title="Vegetarian"><i></i></span><h3>' + esc(i.name) + '</h3></div><p>' + esc(i.desc) + '</p>' +
      '<div class="food-f"><strong>' + inr(i.price) + '</strong>' + action + '</div></div></article>';
  }
  function renderCartBar() {
    var t = totals(), bar = $('#cartBar'), nav = $('#navCount');
    nav.hidden = t.count === 0; nav.textContent = t.count;
    bar.hidden = t.count === 0 || view === 'cart' || view === 'staff';
    bar.innerHTML = '<span>' + t.count + ' item' + (t.count === 1 ? '' : 's') + ' · ' + inr(t.total) + '</span><b>View cart and pick a slot</b>';
  }
  function renderHome() {
    var days = dayList(), day = days[0], slots = genSlots(), shown = [];
    for (var d = 0; d < days.length && !shown.length; d++) {
      day = days[d];
      shown = slots.map(function (t) { return { t: t, i: slotInfo(day, t) }; }).filter(function (s) { return !s.i.closed; }).slice(0, 4);
    }
    $('#boardTitle').textContent = 'Next pickup slots · ' + labelDate(day);
    $('#board').innerHTML = shown.length ? shown.map(function (s) {
      return '<a class="slotrow" href="#menu"><b>' + fmtTime(s.t) + '</b><span class="meter"><i style="width:' + Math.min(100, s.i.used / s.i.cap * 100) + '%"></i></span><small>' + (s.i.full ? 'Full' : s.i.left + ' left') + '</small></a>';
    }).join('') : '<p class="muted">No open slots right now. Check the staff settings.</p>';
    $('#popular').innerHTML = db.menu.filter(function (m) { return m.available; }).slice(4, 8).map(foodCard).join('');
  }
  function renderCats() {
    var cats = ['All'].concat(CATEGORIES.concat(db.menu.map(function (m) { return m.cat; })).filter(function (c, i, a) { return a.indexOf(c) === i && db.menu.some(function (m) { return m.cat === c; }); }));
    $('#cats').innerHTML = cats.map(function (c) { return '<button class="fchip' + (c === cat ? ' on' : '') + '" role="tab" aria-selected="' + (c === cat) + '" data-act="cat" data-id="' + esc(c) + '">' + esc(c) + '</button>'; }).join('');
  }
  function renderMenu() {
    renderCats();
    var q = query.toLowerCase();
    var list = db.menu.filter(function (m) { return (cat === 'All' || m.cat === cat) && (m.name + ' ' + m.desc).toLowerCase().indexOf(q) > -1; });
    $('#foodGrid').innerHTML = list.length ? list.map(foodCard).join('') : '<p class="empty" style="grid-column:1/-1">No items match “' + esc(query) + '”. Try another word or category.</p>';
  }
  function renderSlots() {
    $('#dateChips').innerHTML = dayList().map(function (d) { return '<button class="fchip' + (d === selDate ? ' on' : '') + '" data-act="date" data-id="' + d + '">' + labelDate(d) + '</button>'; }).join('');
    var any = false;
    $('#slotGrid').innerHTML = genSlots().map(function (t) {
      var s = slotInfo(selDate, t);
      if (s.disabled && selSlot === t) selSlot = '';
      if (!s.disabled) any = true;
      return '<button class="slot' + (selSlot === t ? ' on' : '') + '" data-act="slot" data-id="' + t + '"' + (s.disabled ? ' disabled' : '') + ' aria-pressed="' + (selSlot === t) + '"><b>' + fmtTime(t) + '</b><small>' + (s.closed ? 'Closed' : s.full ? 'Fully booked' : s.left + ' of ' + s.cap + ' left') + '</small></button>';
    }).join('');
    $('#cutNote').textContent = any ? 'Orders close ' + db.settings.cutoff + ' minutes before each slot. You can cancel until the kitchen starts preparing.' : 'No slots left on this day. Try another date.';
    $('#sumPick').textContent = selSlot ? labelDate(selDate) + ', ' + fmtTime(selSlot) : 'Not selected';
  }
  function renderCart() {
    var l = lines(), t = totals();
    $('#cartEmpty').hidden = l.length > 0; $('#cartFull').hidden = l.length === 0;
    if (!l.length) return;
    $('#cartLines').innerHTML = l.map(function (x) {
      return '<div class="line"><div><b>' + esc(x.item.name) + '</b>' + (x.item.available ? '' : ' <span class="warn">Sold out. Remove to continue.</span>') + '<small>' + inr(x.item.price) + ' each</small></div>' + qtyHtml(x.id, x.qty) +
        '<strong class="amt">' + inr(x.item.price * x.qty) + '</strong><button class="x" data-act="remove" data-id="' + x.id + '" aria-label="Remove ' + esc(x.item.name) + '">×</button></div>';
    }).join('') + '<div class="line total"><b>Total</b><strong>' + inr(t.total) + '</strong></div>';
    $('#sumTotal').textContent = inr(t.total);
    renderSlots();
  }
  function stepper(status) {
    var steps = STATUSES.slice(0, 4), at = steps.indexOf(status);
    return '<ol class="stepper">' + steps.map(function (s, i) { return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '"><span>' + (i < at ? '✓' : i + 1) + '</span>' + s + '</li>'; }).join('') + '</ol>';
  }
  var chip = function (s) { return '<span class="chip st-' + s.split(' ')[0].toLowerCase() + '">' + s + '</span>'; };
  function renderTrack() {
    var o = db.orders.filter(function (x) { return x.token === trackToken; })[0], box = $('#trackDetail');
    if (!o) { box.innerHTML = ''; }
    else {
      var cancelled = o.status === 'Cancelled';
      box.innerHTML = '<div class="card pad ticket"><div class="tick' + (cancelled ? ' bad' : '') + '" aria-hidden="true">' + (cancelled ? '×' : '✓') + '</div>' +
        '<h2>' + (cancelled ? 'Order cancelled' : justPlaced === o.token ? 'Order confirmed' : 'Order status') + '</h2>' +
        '<p class="muted">' + (cancelled ? 'This order will not be prepared.' : 'Show this token at the pickup counter') + '</p><div class="token">' + o.token + '</div>' +
        '<div class="pick"><b>' + labelDate(o.date) + ', ' + fmtTime(o.slot) + '</b><span>Pickup time</span></div>' +
        (cancelled ? '' : stepper(o.status)) +
        '<div class="card list flat">' + o.items.map(function (i) { return '<div class="line"><span>' + esc(i.name) + ' × ' + i.qty + '</span><strong>' + inr(i.price * i.qty) + '</strong></div>'; }).join('') +
        '<div class="line total"><b>Total (pay at counter)</b><strong>' + inr(o.total) + '</strong></div></div>' +
        '<p class="muted">Ordered by ' + esc(o.name) + (o.usn ? ' (' + esc(o.usn) + ')' : '') + '</p>' +
        (o.status === 'Confirmed' ? '<button class="btn danger" data-act="cancel" data-id="' + o.id + '">Cancel order</button><p class="hint">You can cancel until the kitchen starts preparing.</p>' :
          o.status === 'Preparing' ? '<p class="hint">Preparation has started, so this order can no longer be cancelled.</p>' : '') +
        '<p class="hint">Status updates here automatically when staff change it.</p></div>';
    }
    var mine = db.orders.filter(function (x) { return x.device === device; });
    $('#myOrders').innerHTML = mine.length ? mine.map(function (x) {
      return '<button class="card pad orow" data-act="open" data-id="' + x.token + '"><span><b>' + x.token + '</b><small>' + labelDate(x.date) + ', ' + fmtTime(x.slot) + ' · ' + inr(x.total) + '</small></span>' + chip(x.status) + '</button>';
    }).join('') : '<p class="empty">No orders on this device yet. <a href="#menu">Place your first pre-order.</a></p>';
  }
  function renderStaff() {
    var date = $('#staffDate').value || dateStr(new Date()), body = $('#staffBody');
    $$('[data-act="tab"]').forEach(function (b) { b.classList.toggle('on', b.dataset.id === staffTab); });
    if (staffTab === 'orders') {
      var os = db.orders.filter(function (o) { return o.date === date; }), live = os.filter(function (o) { return o.status !== 'Cancelled'; });
      var by = function (s) { return os.filter(function (o) { return o.status === s; }).length; };
      var slots = os.map(function (o) { return o.slot; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).sort();
      var html = '<div class="grid4"><div class="card pad stat"><span>Orders</span><b>' + live.length + '</b></div><div class="card pad stat"><span>Expected revenue</span><b>' + inr(live.reduce(function (a, o) { return a + o.total; }, 0)) + '</b></div>' +
        '<div class="card pad stat"><span>Waiting or preparing</span><b>' + (by('Confirmed') + by('Preparing')) + '</b></div><div class="card pad stat"><span>Ready / done / cancelled</span><b>' + by('Ready for Pickup') + ' / ' + by('Completed') + ' / ' + by('Cancelled') + '</b></div></div>';
      html += slots.length ? slots.map(function (t) {
        var si = slotInfo(date, t);
        return '<section class="slotgroup"><h3>' + fmtTime(t) + ' <span class="chip">' + si.used + '/' + si.cap + ' booked</span></h3><div class="grid-orders">' +
          os.filter(function (o) { return o.slot === t; }).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }).map(function (o) {
            var n = NEXT[o.status];
            return '<article class="card pad ord"><div class="ord-h"><b>' + o.token + '</b>' + chip(o.status) + '</div><small>' + esc(o.name) + (o.usn ? ' · ' + esc(o.usn) : '') + '</small><ul>' +
              o.items.map(function (i) { return '<li>' + i.qty + ' × ' + esc(i.name) + '</li>'; }).join('') + '</ul><div class="ord-f"><strong>' + inr(o.total) + '</strong><span class="row">' +
              (n ? '<button class="btn sm" data-act="status" data-id="' + o.id + '" data-to="' + n[0] + '">' + n[1] + '</button><button class="btn sm danger" data-act="staffcancel" data-id="' + o.id + '">Cancel</button>' : '') + '</span></div></article>';
          }).join('') + '</div></section>';
      }).join('') : '<p class="empty">No orders for ' + labelDate(date) + ' yet. New orders appear here automatically.</p>';
      body.innerHTML = html;
    } else if (staffTab === 'menu') {
      body.innerHTML = '<div class="tablewrap"><table><thead><tr><th>Item</th><th>Category</th><th>Price (₹)</th><th>Availability</th></tr></thead><tbody>' + db.menu.map(function (m) {
        return '<tr><td><span class="veg"><i></i></span> ' + esc(m.name) + '</td><td>' + esc(m.cat) + '</td><td><input class="input price" type="number" min="0" value="' + m.price + '" data-act="price" data-id="' + m.id + '" aria-label="Price of ' + esc(m.name) + '"></td>' +
          '<td><button class="toggle' + (m.available ? ' on' : '') + '" data-act="avail" data-id="' + m.id + '">' + (m.available ? 'Available' : 'Sold out') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    } else {
      var s = db.settings;
      body.innerHTML = '<div class="card pad formgrid"><div><label>Orders per slot<input class="input" type="number" min="1" value="' + s.capacity + '" data-act="setting" data-id="capacity"></label></div>' +
        '<div><label>Slot length (minutes)<input class="input" type="number" min="5" step="5" value="' + s.slotMinutes + '" data-act="setting" data-id="slotMinutes"></label></div>' +
        '<div><label>First slot<input class="input" type="time" value="' + s.open + '" data-act="setting" data-id="open"></label></div>' +
        '<div><label>Last slot<input class="input" type="time" value="' + s.close + '" data-act="setting" data-id="close"></label></div>' +
        '<div><label>Order cutoff (minutes before slot)<input class="input" type="number" min="0" value="' + s.cutoff + '" data-act="setting" data-id="cutoff"></label></div>' +
        '<div><label>Days students can book ahead<input class="input" type="number" min="0" max="7" value="' + s.daysAhead + '" data-act="setting" data-id="daysAhead"></label></div></div>' +
        '<h3>Demo data</h3><button class="btn danger" data-act="reset">Reset all demo data</button>';
    }
  }
  function render() {
    renderCartBar();
    if (view === 'home') renderHome();
    else if (view === 'menu') renderMenu();
    else if (view === 'cart') renderCart();
    else if (view === 'track') renderTrack();
    else if (view === 'staff') renderStaff();
  }

  /* ---------- Navigation ---------- */
  var VIEWS = ['home', 'menu', 'cart', 'track', 'staff'];
  function route() {
    var v = (location.hash || '#home').slice(1);
    if (v === 'staff') { window.location.href = '/staff/login'; return; }
    view = VIEWS.indexOf(v) > -1 ? v : 'home';
    $$('.view').forEach(function (s) { s.classList.toggle('active', s.id === 'v-' + view); });
    $$('[data-nav]').forEach(function (a) { a.classList.toggle('active', a.dataset.nav === view); });
    render(); window.scrollTo(0, 0);
    if (view === 'track' && trackToken) refreshTrackedOrder(false);
  }
  function go(v) { if (location.hash === '#' + v) route(); else location.hash = v; }

  /* ---------- Actions ---------- */
  function sync() { db = load(); }
 
async function placeOrder() {
  sync();

  var err = $('#formErr');
  var name = $('#custName').value.trim();
  var usn = $('#custUsn').value.trim();
  var l = lines();

  err.textContent = '';

  if (!l.length) {
    err.textContent = 'Your cart is empty.';
    return;
  }

  var gone = l.filter(function (x) {
    return !x.item.available;
  })[0];

  if (gone) {
    err.textContent = gone.item.name + ' is sold out. Remove it to continue.';
    renderCart();
    return;
  }

  if (name.length < 2) {
    err.textContent = 'Enter your name (at least 2 letters).';
    $('#custName').focus();
    return;
  }

  if (!selSlot) {
    err.textContent = 'Choose a pickup time slot.';
    return;
  }

  var si = slotInfo(selDate, selSlot);

  if (si.closed) {
    err.textContent = 'That slot is now closed. Pick a later one.';
    renderSlots();
    return;
  }

  if (si.full) {
    err.textContent = 'That slot just filled up. Pick another.';
    renderSlots();
    return;
  }

  var orderButton = document.querySelector('[data-act="place"]');

  if (orderButton) orderButton.disabled = true;

  try {
    var response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        usn: usn,
        date: selDate,
        slot: selSlot,
        device: device,
        items: l.map(function (x) {
          return {
            id: x.id,
            name: x.item.name,
            price: x.item.price,
            qty: x.qty
          };
        })
      })
    });

    var result = await response.json();

    if (!response.ok) {
      err.textContent = result.error || 'Could not place your order.';
      return;
    }

    var order = {
      id: result.token,
      token: result.token,
      device: device,
      name: name,
      usn: usn,
      date: selDate,
      slot: selSlot,
      status: result.status,
      createdAt: new Date().toISOString(),
      items: l.map(function (x) {
        return {
          id: x.id,
          name: x.item.name,
          price: x.item.price,
          qty: x.qty
        };
      }),
      total: result.total
    };

    db.orders.unshift(order);
    save();

    cart = {};
    saveCart();
    selSlot = '';
    trackToken = order.token;
    justPlaced = order.token;

    toast('Order confirmed. Your token is ' + order.token);
    go('track');

  } catch (error) {
    err.textContent = 'Cannot connect to the server. Please try again.';
  } finally {
    if (orderButton) orderButton.disabled = false;
  }
}

async function loadStaffOrders() {
  try {
    const response = await fetch('/api/staff/orders');

    if (response.status === 401) {
      window.location.href = '/staff/login';
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      console.error(data.error || 'Unable to load orders.');
      return;
    }

    console.table(data.orders);

    // Save database orders for the existing staff rendering code.
    db.orders = data.orders.map(function (order) {
      return {
        id: order.token,
        token: order.token,
        name: order.name,
        usn: order.usn,
        date: order.date,
        slot: order.slot,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items,
        total: order.total
      };
    });

    save();
  } catch (error) {
    console.error('Could not load staff orders:', error);
  }
}

  function setStatus(id, status) {
    // The real staff dashboard is served by Flask and updates the database.
    toast('Use the authenticated staff portal to update order status.');
  }
  async function cancel(id, staff) {
    sync();
    var o = db.orders.filter(function (x) { return x.id === id || x.token === id; })[0];
    if (!o) return;
    if (staff) { toast('Staff status changes are managed in the staff portal.'); return; }
    if (o.status !== 'Confirmed') { toast('Preparation has started, so this order cannot be cancelled.'); render(); return; }
    try {
      var response = await fetch('/api/orders/' + encodeURIComponent(o.token) + '/cancel', { method: 'POST' });
      var result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not cancel this order.');
      o.status = result.status;
      save();
      toast(o.token + ' cancelled');
      renderTrack();
    } catch (error) { toast(error.message || 'Could not connect to the server.'); }
  }

  async function refreshTrackedOrder(showError) {
    if (!trackToken || view !== 'track') return;
    try {
      var response = await fetch('/api/orders/' + encodeURIComponent(trackToken), { cache: 'no-store', headers: { 'Accept': 'application/json' } });
      var result = await response.json();
      if (!response.ok) {
        if (showError) $('#findErr').textContent = result.error || 'Order not found.';
        return;
      }
      var existing = db.orders.filter(function (x) { return x.token === result.token; })[0] || {};
      var updated = {
        id: result.token, token: result.token, device: existing.device || '',
        name: result.name, usn: result.usn, date: result.date, slot: result.slot,
        status: result.status, createdAt: result.createdAt,
        items: Array.isArray(result.items) ? result.items : [], total: Number(result.total || 0)
      };
      var index = db.orders.findIndex(function (x) { return x.token === result.token; });
      if (index >= 0) db.orders[index] = Object.assign({}, db.orders[index], updated);
      else db.orders.unshift(updated);
      save();
      renderTrack();
    } catch (error) {
      // Keep the last known order view visible when the network is temporarily unavailable.
    }
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-act]'); if (!t || t.tagName === 'INPUT') return;
    var a = t.dataset.act, id = t.dataset.id;
    if (a === 'inc') { var it = db.menu.filter(function (m) { return m.id === id; })[0]; if (it && it.available) { cart[id] = (cart[id] || 0) + 1; saveCart(); render(); } }
    else if (a === 'dec') { if ((cart[id] || 0) <= 1) delete cart[id]; else cart[id]--; saveCart(); render(); }
    else if (a === 'remove') { delete cart[id]; saveCart(); render(); }
    else if (a === 'cat') { cat = id; renderMenu(); }
    else if (a === 'date') { selDate = id; selSlot = ''; renderSlots(); refreshSlotUsage(); }
    else if (a === 'slot') { selSlot = id; $('#formErr').textContent = ''; renderSlots(); }
    else if (a === 'place') placeOrder();
    else if (a === 'open') { trackToken = id; justPlaced = ''; renderTrack(); refreshTrackedOrder(false); window.scrollTo(0, 0); }
    else if (a === 'cancel') cancel(id, false);
    else if (a === 'staffcancel') { if (window.confirm('Cancel this order?')) cancel(id, true); }
    else if (a === 'status') setStatus(id, t.dataset.to);
    else if (a === 'tab') { staffTab = id; renderStaff(); }
    else if (a === 'avail') { sync(); var m = db.menu.filter(function (x) { return x.id === id; })[0]; if (m) { m.available = !m.available; save(); toast(m.name + (m.available ? ' is available' : ' marked sold out')); renderStaff(); } }
    else if (a === 'reset') { if (window.confirm('Delete all orders and restore the default menu and settings?')) { db = defaults(); save(); cart = {}; saveCart(); trackToken = ''; toast('Demo data reset'); render(); } }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, a = t.dataset && t.dataset.act; if (!a) return;
    sync();
    if (a === 'price') { var m = db.menu.filter(function (x) { return x.id === t.dataset.id; })[0]; var v = Number(t.value); if (m && v >= 0 && t.value !== '') { m.price = v; save(); toast('Price updated for ' + m.name); } else { toast('Enter a valid price.'); } renderStaff(); }
    else if (a === 'setting') {
      var k = t.dataset.id, val = (k === 'open' || k === 'close') ? t.value : Number(t.value);
      if (val === '' || (typeof val === 'number' && (isNaN(val) || val < (k === 'capacity' ? 1 : k === 'slotMinutes' ? 5 : 0)))) { toast('Enter a valid value.'); }
      else if ((k === 'open' && toMin(val) > toMin(db.settings.close)) || (k === 'close' && toMin(val) < toMin(db.settings.open))) { toast('Last slot must be after the first slot.'); }
      else { db.settings[k] = val; save(); toast('Setting saved'); }
      renderStaff();
    }
  });
  $('#search').addEventListener('input', function (e) { query = e.target.value; renderMenu(); });
  $('#staffDate').addEventListener('change', renderStaff);
  $('#findForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var tok = $('#findTok').value.trim().toUpperCase(), err = $('#findErr');
    err.textContent = '';
    if (!tok) { err.textContent = 'Enter your token number.'; return; }
    trackToken = tok; justPlaced = ''; renderTrack();
    await refreshTrackedOrder(true);
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('storage', function (e) { if (e.key === KEY || e.key === CART_KEY) { db = load(); cart = loadCart(); render(); } });
  setInterval(function () {
    if (view === 'track' && trackToken) refreshTrackedOrder(false);
    else { sync(); if (view === 'cart') renderSlots(); else if (view !== 'menu' && view !== 'staff') render(); }
  }, 5000);

  /* ---------- Shared menu/settings from Flask + SQLite ---------- */
  var sharedRefreshBusy = false;
  async function refreshSlotUsage() {
    if (slotUsageBusy) return;
    slotUsageBusy = true;
    try {
      var targetDate = selDate;
      var response = await fetch('/api/slot-usage?date=' + encodeURIComponent(targetDate), {cache:'no-store'});
      if (response.ok) {
        var payload = await response.json();
        if (targetDate === selDate) {
          remoteSlotDate = targetDate; remoteSlotUsage = payload.used || {};
          if (view === 'cart') renderCart(); else if (view === 'home') renderHome();
        }
      }
    } catch (_) { /* Use local order counts if the server is unavailable. */ }
    finally { slotUsageBusy = false; }
  }
  async function refreshSharedData() {
    if (sharedRefreshBusy) return;
    sharedRefreshBusy = true;
    try {
      var responses = await Promise.all([fetch('/api/menu', {cache:'no-store'}), fetch('/api/settings', {cache:'no-store'})]);
      if (responses[0].ok) {
        var menuPayload = await responses[0].json();
        if (Array.isArray(menuPayload.items) && menuPayload.items.length) {
          db.menu = menuPayload.items.map(function (m) { return { id:m.id, name:m.name, cat:m.category, price:Number(m.price), desc:m.description || '', icon:m.icon || '🍽', available:!!m.available, image:m.image || '' }; });
        }
      }
      if (responses[1].ok) {
        var remoteSettings = await responses[1].json();
        db.settings = Object.assign({}, db.settings, {
          open:remoteSettings.openingTime || db.settings.open,
          close:remoteSettings.closingTime || db.settings.close,
          slotMinutes:Number(remoteSettings.slotInterval || db.settings.slotMinutes),
          capacity:Number(remoteSettings.slotCapacity || db.settings.capacity),
          daysAhead:Number(remoteSettings.advanceDays ?? db.settings.daysAhead),
          cutoff:Number(remoteSettings.cutoffMinutes ?? db.settings.cutoff),
          orderingOpen:remoteSettings.orderingOpen !== false,
          advanceBooking:remoteSettings.advanceBooking !== false
        });
      }
      save();
      if (view === 'home') renderHome();
      else if (view === 'menu') renderMenu();
      else if (view === 'cart') renderCart();
      else renderCartBar();
    } catch (_) { /* Keep the last available menu when offline. */ }
    finally { sharedRefreshBusy = false; }
    refreshSlotUsage();
  }

  /* ---------- Start ---------- */
  var logo = $('#logo');
  logo.addEventListener('error', function () { var s = document.createElement('span'); s.className = 'logo-ph'; s.textContent = 'LOGO'; logo.replaceWith(s); });
  $('#staffDate').value = dateStr(new Date());
  route();
  refreshSharedData();
  refreshSlotUsage();
  setInterval(function(){ refreshSharedData(); refreshSlotUsage(); }, 15000);
})();
