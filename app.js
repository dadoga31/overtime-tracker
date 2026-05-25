// src/js/app.js
// ─────────────────────────────────────────────
// Main application logic
// ─────────────────────────────────────────────

// ── Globals ──────────────────────────────────
let entries = [];
let currentUser = null;
let unsubscribeEntries = null;
let currentLocation = 'madrid';
let currentFilter = 'all';
let deleteId = null;
let hourlyRate = parseFloat(localStorage.getItem('ot-rate') || '13.99');

const MONTHS_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const MONTHS_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

// ── Wait for Firebase to be ready ─────────────
function waitForFB() {
  return new Promise(resolve => {
    const check = () => window._fb ? resolve(window._fb) : setTimeout(check, 30);
    check();
  });
}

// ── Boot ──────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const fb = await waitForFB();

  // Init UI
  document.getElementById('f-date').valueAsDate = new Date();
  document.getElementById('rate-input').value = hourlyRate;

  const now = new Date();
  document.getElementById('pdf-month').value =
    `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  document.getElementById('rate-input').addEventListener('input', function() {
    hourlyRate = parseFloat(this.value) || 0;
    localStorage.setItem('ot-rate', hourlyRate);
    updateKPIs();
    renderEntries();
  });

  document.getElementById('clear-month').addEventListener('click', () => {
    document.getElementById('pdf-month').value = '';
  });

  document.getElementById('btn-export').addEventListener('click', exportPDF);
  document.getElementById('delete-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Auth state
  fb.onAuthStateChanged(fb.auth, user => {
    if (user) {
      currentUser = user;
      showApp(user);
      subscribeEntries();
    } else {
      currentUser = null;
      showLogin();
      if (unsubscribeEntries) { unsubscribeEntries(); unsubscribeEntries = null; }
    }
  });

  // Login button
  document.getElementById('btn-google-login').addEventListener('click', async () => {
    const provider = new fb.GoogleAuthProvider();
    try {
      await fb.signInWithPopup(fb.auth, provider);
    } catch (e) {
      showToast('⚠️ Error al iniciar sesión', 'error');
    }
  });

  // Logout button
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await fb.signOut(fb.auth);
    entries = [];
    showToast('Sesión cerrada', '');
  });
});

// ── Screens ───────────────────────────────────
function showLogin() {
  document.getElementById('screen-login').classList.add('active');
  document.getElementById('screen-app').classList.remove('active');
}

function showApp(user) {
  document.getElementById('screen-login').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  const avatar = document.getElementById('user-avatar');
  avatar.src = user.photoURL || '';
  avatar.style.display = user.photoURL ? 'block' : 'none';

  const displayName = user.displayName || user.email || 'Usuario';
  document.getElementById('user-name').textContent = displayName.split(' ')[0];
}

// ── Firestore real-time listener ──────────────
function subscribeEntries() {
  const fb = window._fb;
  document.getElementById('loading-state').style.display = 'block';

  const q = fb.query(
    fb.collection(fb.db, 'entries'),
    fb.where('uid', '==', currentUser.uid),
    fb.orderBy('date', 'desc'),
    fb.orderBy('createdAt', 'desc')
  );

  unsubscribeEntries = fb.onSnapshot(q, snapshot => {
    document.getElementById('loading-state').style.display = 'none';
    entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
  }, err => {
    document.getElementById('loading-state').style.display = 'none';
    console.error(err);
    showToast('⚠️ Error al cargar datos', 'error');
  });
}

// ── Location toggle ───────────────────────────
window.setLocation = function(loc) {
  currentLocation = loc;
  document.getElementById('btn-madrid').className =
    'toggle-btn' + (loc === 'madrid' ? ' active-madrid' : '');
  document.getElementById('btn-travel').className =
    'toggle-btn' + (loc === 'travel' ? ' active-travel' : '');
};

// ── Add entry ─────────────────────────────────
window.addEntry = async function() {
  const date   = document.getElementById('f-date').value;
  const hours  = parseFloat(document.getElementById('f-hours').value);
  const client = document.getElementById('f-client').value.trim();
  const notes  = document.getElementById('f-notes').value.trim();

  if (!date)          return showToast('⚠️ Selecciona una fecha', 'error');
  if (!hours || hours <= 0) return showToast('⚠️ Introduce las horas', 'error');
  if (!client)        return showToast('⚠️ Introduce el cliente', 'error');
  if (!currentUser)   return showToast('⚠️ No estás autenticado', 'error');

  const fb = window._fb;
  const btn = document.getElementById('btn-add');
  btn.classList.add('loading');
  btn.textContent = 'Guardando…';

  try {
    await fb.addDoc(fb.collection(fb.db, 'entries'), {
      uid: currentUser.uid,
      date,
      hours,
      client,
      location: currentLocation,
      notes,
      createdAt: fb.serverTimestamp()
    });

    // Reset form
    document.getElementById('f-hours').value  = '';
    document.getElementById('f-client').value = '';
    document.getElementById('f-notes').value  = '';
    document.getElementById('f-date').valueAsDate = new Date();

    showToast('✓ Horas registradas correctamente', 'success');
  } catch (e) {
    console.error(e);
    showToast('⚠️ Error al guardar. Revisa Firestore.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.textContent = '+ Registrar Horas Extras';
  }
};

// ── Delete ────────────────────────────────────
window.confirmDelete = function(id) {
  deleteId = id;
  document.getElementById('delete-modal').classList.add('open');
  document.getElementById('btn-confirm-delete').onclick = async () => {
    const fb = window._fb;
    try {
      await fb.deleteDoc(fb.doc(fb.db, 'entries', deleteId));
      showToast('Registro eliminado', 'success');
    } catch (e) {
      showToast('⚠️ Error al eliminar', 'error');
    }
    closeModal();
  };
};

window.closeModal = function() {
  document.getElementById('delete-modal').classList.remove('open');
  deleteId = null;
};

// ── Filter ────────────────────────────────────
window.setFilter = function(f) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.filter === f)
  );
  renderEntries();
};

function getFiltered() {
  if (currentFilter === 'all') return entries;
  return entries.filter(e => e.location === currentFilter);
}

// ── Render ────────────────────────────────────
function render() {
  updateKPIs();
  renderEntries();
  updateClientsList();
  document.getElementById('btn-export').disabled = entries.length === 0;
}

function updateKPIs() {
  const totalMins   = entries.reduce((s, e) => s + Math.round(e.hours * 60), 0);
  const travelMins  = entries.filter(e => e.location === 'travel').reduce((s, e) => s + Math.round(e.hours * 60), 0);
  const totalHrsNum = entries.reduce((s, e) => s + e.hours, 0);
  const travelCount = entries.filter(e => e.location === 'travel').length;

  document.getElementById('kpi-hours').textContent       = fmtHHMM(totalMins);
  document.getElementById('kpi-count').textContent       = `${entries.length} registro${entries.length !== 1 ? 's' : ''}`;
  document.getElementById('kpi-travel').textContent      = fmtHHMM(travelMins);
  document.getElementById('kpi-travel-count').textContent= `${travelCount} registro${travelCount !== 1 ? 's' : ''}`;
  document.getElementById('kpi-money').textContent       = fmtMoney(totalHrsNum * hourlyRate);
  document.getElementById('kpi-rate-display').textContent= `@ ${fmtMoney(hourlyRate)}/h`;
}

function renderEntries() {
  const filtered = getFiltered();
  const wrap = document.getElementById('entries-wrap');
  document.getElementById('filter-count').textContent =
    `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    wrap.innerHTML = `<div class="empty-state">
      <div class="empty-icon">⏱</div>
      <p>${entries.length === 0
        ? 'Sin registros aún. Añade tus primeras horas extras.'
        : 'Sin registros para este filtro.'}</p>
    </div>`;
    return;
  }

  wrap.innerHTML = filtered.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    const day   = String(d.getDate()).padStart(2, '0');
    const month = MONTHS_ES[d.getMonth()].toUpperCase();
    const mins  = Math.round(e.hours * 60);

    return `<div class="entry-card">
      <div class="entry-date-col">
        <div class="entry-day">${day}</div>
        <div class="entry-month">${month}</div>
      </div>
      <div class="entry-info">
        <div class="entry-main">
          <span class="entry-hours">${fmtHHMM(mins)}</span>
          <span class="entry-client">${esc(e.client)}</span>
          <span class="location-badge ${e.location === 'madrid' ? 'badge-madrid' : 'badge-travel'}">
            ${e.location === 'madrid' ? '🏙 Madrid' : '✈ Viaje'}
          </span>
        </div>
        ${e.notes ? `<div class="entry-notes">${esc(e.notes)}</div>` : ''}
      </div>
      <div class="entry-actions">
        <span class="entry-money">${fmtMoney(e.hours * hourlyRate)}</span>
        <button class="btn-delete" onclick="confirmDelete('${e.id}')" title="Eliminar">✕</button>
      </div>
    </div>`;
  }).join('');
}

function updateClientsList() {
  const clients = [...new Set(entries.map(e => e.client))].sort();
  document.getElementById('clients-list').innerHTML =
    clients.map(c => `<option value="${esc(c)}">`).join('');
}

// ── PDF Export ────────────────────────────────
function exportPDF() {
  const { jsPDF } = window.jspdf;

  const monthFilter = document.getElementById('pdf-month').value;
  let rows = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  if (monthFilter) rows = rows.filter(e => e.date.startsWith(monthFilter));

  if (rows.length === 0) {
    showToast('⚠️ No hay registros para exportar', 'error');
    return;
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, mg = 18, cw = W - mg * 2;

  // ── COLORS (light theme) ──
  const C = {
    navy:       [15,  30,  70],
    navyLight:  [28,  52, 110],
    blue:       [41,  98, 255],
    blueLight:  [219, 234, 254],
    slate:      [71,  85, 105],
    slateLight: [148,163,184],
    white:      [255,255,255],
    offwhite:   [248,250,252],
    border:     [226,232,240],
    amber:      [180,110,  0],
    amberLight: [255,243,205],
    green:      [21, 128,  61],
    greenLight: [220,252,231],
    text:       [30,  41,  59],
    textMuted:  [100,116,139],
  };

  // ── HEADER BAND ──
  doc.setFillColor(...C.navy);
  doc.rect(0, 0, W, 42, 'F');

  // Accent stripe
  doc.setFillColor(...C.blue);
  doc.rect(0, 0, 5, 42, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...C.white);
  doc.text('REGISTRO DE HORAS EXTRAS', mg + 2, 17);

  // Subtitle line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...C.slateLight);

  let periodLabel = 'Historial completo';
  if (monthFilter) {
    const [y, m] = monthFilter.split('-');
    const mn = MONTHS_FULL[parseInt(m)-1];
    periodLabel = `${mn.charAt(0).toUpperCase() + mn.slice(1)} ${y}`;
  }

  const today = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' });
  doc.text(`Período: ${periodLabel}`, mg + 2, 27);
  doc.text(`Emitido: ${today}`, mg + 2, 34);

  // User info top-right
  if (currentUser) {
    const uname = currentUser.displayName || currentUser.email || '';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.blueLight);
    doc.text(uname, W - mg, 24, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...C.slateLight);
    doc.text(currentUser.email || '', W - mg, 30, { align: 'right' });
  }

  // ── TABLE ──
  const tableData = rows.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('es-ES', { day:'2-digit', month:'2-digit', year:'numeric' });
    const mins = Math.round(e.hours * 60);
    const hh = Math.floor(mins / 60);
    const mm = mins % 60;
    const hoursStr = mm > 0 ? `${hh}h ${mm}m` : `${hh}h`;
    const locStr = e.location === 'madrid' ? 'Madrid' : 'Desplazamiento';
    return [dateStr, e.client, hoursStr, locStr, e.notes || '—'];
  });

  doc.autoTable({
    startY: 48,
    head: [['Fecha', 'Cliente / Proyecto', 'Horas', 'Ubicación', 'Descripción']],
    body: tableData,
    margin: { left: mg, right: mg },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 5.5, bottom: 5.5, left: 5, right: 5 },
      textColor: C.text,
      lineColor: C.border,
      lineWidth: 0.25,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: C.navyLight,
      textColor: C.white,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
    },
    alternateRowStyles: {
      fillColor: C.offwhite,
    },
    bodyStyles: {
      fillColor: C.white,
    },
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 50 },
      2: { cellWidth: 20, halign: 'center', fontStyle: 'bold', textColor: C.navy },
      3: { cellWidth: 34, halign: 'center' },
      4: { cellWidth: 'auto', textColor: C.textMuted, fontSize: 8.5 },
    },
    didParseCell(data) {
      // Color location badge
      if (data.section === 'body' && data.column.index === 3) {
        const val = data.cell.raw;
        if (val === 'Madrid') {
          data.cell.styles.textColor = C.blue;
        } else {
          data.cell.styles.textColor = C.amber;
        }
      }
    },
    willDrawCell(data) {
      // Highlight hours column lightly
      if (data.section === 'body' && data.column.index === 2) {
        doc.setFillColor(...C.blueLight);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, 'F');
      }
    }
  });

  // ── SUMMARY BLOCK ──
  let finalY = doc.lastAutoTable.finalY + 12;

  // Totals
  const totalMins  = rows.reduce((s, e) => s + Math.round(e.hours * 60), 0);
  const madridMins = rows.filter(e => e.location === 'madrid').reduce((s, e) => s + Math.round(e.hours * 60), 0);
  const travelMins = rows.filter(e => e.location === 'travel').reduce((s, e) => s + Math.round(e.hours * 60), 0);

  const fHH = m => {
    const h = Math.floor(m / 60), mm = m % 60;
    return mm > 0 ? `${h}h ${mm}m` : `${h}h`;
  };

  // Summary box background
  doc.setFillColor(...C.navy);
  doc.roundedRect(mg, finalY, cw, 38, 3, 3, 'F');

  // Left accent stripe inside box
  doc.setFillColor(...C.blue);
  doc.roundedRect(mg, finalY, 4, 38, 2, 2, 'F');

  // "RESUMEN" label
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...C.slateLight);
  doc.text('RESUMEN DEL PERÍODO', mg + 10, finalY + 8);

  // Total hours — large
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...C.white);
  doc.text(fHH(totalMins), mg + 10, finalY + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slateLight);
  doc.text('TOTAL HORAS EXTRAS', mg + 10, finalY + 33);

  // Divider
  doc.setDrawColor(...C.navyLight);
  doc.setLineWidth(0.4);
  doc.line(mg + 68, finalY + 8, mg + 68, finalY + 32);

  // Madrid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.blueLight);
  doc.text(fHH(madridMins), mg + 75, finalY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slateLight);
  doc.text('Madrid', mg + 75, finalY + 30);

  // Divider
  doc.line(mg + 110, finalY + 8, mg + 110, finalY + 32);

  // Travel
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 200, 80);
  doc.text(fHH(travelMins), mg + 117, finalY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slateLight);
  doc.text('Desplazamiento', mg + 117, finalY + 30);

  // Divider
  doc.line(mg + 155, finalY + 8, mg + 155, finalY + 32);

  // Count
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...C.white);
  doc.text(`${rows.length}`, mg + 162, finalY + 22);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.slateLight);
  doc.text('Registros', mg + 162, finalY + 30);

  // ── SIGNATURE AREA ──
  const sigY = finalY + 52;
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.4);

  // Left: employee
  doc.line(mg, sigY, mg + 76, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.textMuted);
  doc.text('Firma del trabajador', mg, sigY + 5);

  // Right: company
  doc.line(W - mg - 76, sigY, W - mg, sigY);
  doc.text('Sello y firma de la empresa', W - mg - 76, sigY + 5);

  // Date line center
  doc.text(`Fecha: ______________________`, mg + cw/2, sigY + 5, { align: 'center' });

  // ── FOOTER ──
  const pH = 297;
  doc.setFillColor(...C.navy);
  doc.rect(0, pH - 14, W, 14, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...C.slateLight);
  doc.text('Documento generado con HorasExtra Tracker', mg, pH - 5.5);
  doc.text(`Página 1 de 1`, W - mg, pH - 5.5, { align: 'right' });

  const filename = monthFilter
    ? `horas-extras-${monthFilter}.pdf`
    : `horas-extras-historial.pdf`;

  doc.save(filename);
  showToast('✓ PDF exportado correctamente', 'success');
}

// ── Helpers ───────────────────────────────────
function fmtHHMM(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fmtMoney(amount) {
  return amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
window.showToast = function(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
};
