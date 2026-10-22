/* =========================================================
   SIGESAPOL · Módulo de Hemodiálisis (Nefrología)
   Lógica del prototipo (JavaScript sin dependencias)
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
  const pad = (n) => String(n).padStart(2, '0');
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  /* ---------- Utilidades comunes ---------- */
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('visible');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('visible'), 3200);
  }

  function parseFecha(txt) {               // dd/mm/aaaa -> Date
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((txt || '').trim());
    if (!m) return null;
    const d = new Date(+m[3], +m[2] - 1, +m[1]);
    return d.getMonth() === +m[2] - 1 ? d : null;
  }
  const fmtFecha = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

  // Marca la página activa en la barra del prototipo
  const actual = location.pathname.split('/').pop() || 'index.html';
  $$('.proto-nav a').forEach((a) => { if (a.getAttribute('href') === actual) a.classList.add('activo'); });

  // Controles segmentados (botones tipo interruptor)
  $$('.segmentado').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      seg.dispatchEvent(new CustomEvent('cambio', { detail: b.dataset.valor, bubbles: true }));
    });
  });

  // Pestañas
  $$('[role="tablist"]').forEach((lista) => {
    lista.addEventListener('click', (e) => {
      const tab = e.target.closest('[role="tab"]');
      if (!tab) return;
      $$('[role="tab"]', lista).forEach((t) => {
        const sel = t === tab;
        t.setAttribute('aria-selected', sel ? 'true' : 'false');
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
    });
  });

  // "Ninguna" excluye al resto de casillas del mismo grupo
  $$('[data-grupo-excluyente]').forEach((grupo) => {
    grupo.addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox' || !e.target.checked) return;
      const ninguna = $('[data-ninguna]', grupo);
      if (e.target === ninguna) $$('input[type=checkbox]', grupo).forEach((c) => { if (c !== ninguna) c.checked = false; });
      else if (ninguna) ninguna.checked = false;
    });
  });

  /* ======================================================
     1. BANDEJA DE PROCEDIMIENTOS PROGRAMADOS
     ====================================================== */
  const formBandeja = $('#form-bandeja');
  if (formBandeja) {
    const filas = $$('#tabla-bandeja tbody tr');
    formBandeja.addEventListener('submit', (e) => {
      e.preventDefault();
      const etapa = $('#f-etapa').value;
      const doc = $('#f-doc').value.trim();
      const nom = $('#f-nom').value.trim().toUpperCase();
      let visibles = 0;
      filas.forEach((tr) => {
        const ok = (etapa === 'TODAS' || tr.dataset.etapa === etapa)
          && (!doc || (tr.dataset.doc || '').includes(doc))
          && (!nom || tr.textContent.toUpperCase().includes(nom));
        tr.hidden = !ok;
        if (ok) visibles++;
      });
      $('#contador-bandeja').textContent = `Mostrando ${visibles} de ${filas.length} registros`;
    });
  }

  /* ======================================================
     2. FICHA HC INICIAL DEL PROGRAMA DE HEMODIÁLISIS
     ====================================================== */
  const formFicha = $('#form-ficha');
  if (formFicha) {
    // IMC automático
    const calcIMC = () => {
      const p = num($('#d-peso').value), t = num($('#d-talla').value);
      $('#d-imc').value = p && t ? (p / Math.pow(t / 100, 2)).toFixed(1) : '';
    };
    $('#d-peso').addEventListener('input', calcIMC);
    $('#d-talla').addEventListener('input', calcIMC);

    // Establecimiento de referencia solo si es referido
    const proc = $('#a-procedencia'), ref = $('#a-referencia');
    const syncRef = () => { ref.disabled = proc.value !== 'REFERIDO'; if (ref.disabled) ref.value = ''; };
    proc.addEventListener('change', syncRef); syncRef();

    // Agregar medicamento
    $('#btn-agregar-med').addEventListener('click', () => {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td><input class="inp sm" aria-label="Medicamento"></td><td><input class="inp sm" aria-label="Dosis"></td>'
        + '<td><input class="inp sm" aria-label="Vía"></td><td><input class="inp sm" aria-label="Frecuencia"></td>'
        + '<td><span class="origen-manual">MANUAL</span></td>';
      $('#tabla-meds tbody').appendChild(tr);
      $('input', tr).focus();
    });

    const validar = () => {
      let ok = true;
      $$('[data-requerido]', formFicha).forEach((el) => {
        const vacio = !el.value || el.value === '';
        el.classList.toggle('error', vacio);
        if (vacio) ok = false;
      });
      return ok;
    };

    $('#btn-borrador').addEventListener('click', () => toast('Borrador guardado. Puede continuar luego desde la bandeja.'));
    formFicha.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validar()) {
        toast('Complete los campos obligatorios marcados en rojo (etiología, acceso vascular, serologías y prescripción).');
        const primero = $('.error', formFicha); if (primero) primero.focus();
        return;
      }
      // Pasa datos clave a la programación (en el sistema real lo haría el backend)
      try {
        sessionStorage.setItem('hd_prescripcion', JSON.stringify({
          frecuencia: $('#p-frecuencia').value,
          duracion: $('#p-duracion').value,
          sesiones: $('#p-programa').value,
          hbsag: $('#l-hbsag').value
        }));
      } catch (err) { /* sin almacenamiento disponible */ }
      location.href = 'programacion.html';
    });
  }

  /* ======================================================
     3. PROGRAMACIÓN DE SESIONES
     ====================================================== */
  const formProg = $('#form-programacion');
  if (formProg) {
    const estado = { esquema: 'LMV', turno: 'MANANA' };
    const HORAS = { MANANA: '07:00', TARDE: '12:00', NOCHE: '17:00' };
    const NOMBRE_TURNO = { MANANA: 'Mañana', TARDE: 'Tarde', NOCHE: 'Noche' };
    const ESQUEMAS = { LMV: [1, 3, 5], MJS: [2, 4, 6] };
    // Feriados de ejemplo (en producción vendrían de una tabla del sistema)
    const FERIADOS = ['01/11/2026', '08/12/2026', '25/12/2026'];

    // Si viene de la ficha, toma la serología para sugerir la sala
    try {
      const pres = JSON.parse(sessionStorage.getItem('hd_prescripcion') || 'null');
      if (pres && pres.hbsag === 'REACTIVO') $('#q-sala').value = 'AISLADA';
    } catch (err) { /* nada */ }

    $('#seg-esquema').addEventListener('cambio', (e) => { estado.esquema = e.detail; generar(); });
    $('#seg-turno').addEventListener('cambio', (e) => { estado.turno = e.detail; $('#q-hora').value = HORAS[e.detail]; generar(); });
    ['#q-inicio', '#q-sesiones', '#q-puesto', '#q-hora'].forEach((s) => $(s).addEventListener('change', generar));

    function calcularFechas() {
      const inicio = parseFecha($('#q-inicio').value);
      const total = parseInt($('#q-sesiones').value, 10) || 12;
      if (!inicio) return null;
      const dias = ESQUEMAS[estado.esquema];
      const fechas = [];
      const d = new Date(inicio);
      let guard = 0;
      while (fechas.length < total && guard++ < 400) {
        if (dias.includes(d.getDay()) && !FERIADOS.includes(fmtFecha(d))) fechas.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
      return fechas;
    }

    function generar() {
      const fechas = calcularFechas();
      const cal = $('#calendario'), lista = $('#tabla-citas tbody');
      $('#q-inicio').classList.toggle('error', !fechas);
      if (!fechas) { cal.innerHTML = ''; lista.innerHTML = ''; return; }

      const hora = $('#q-hora').value || HORAS[estado.turno];
      const puesto = $('#q-puesto').value;
      const mapa = new Map(fechas.map((f, i) => [fmtFecha(f), i + 1]));

      // Calendario desde el lunes de la semana de inicio hasta el domingo de la última sesión
      const desde = new Date(fechas[0]); desde.setDate(desde.getDate() - ((desde.getDay() + 6) % 7));
      const hasta = new Date(fechas[fechas.length - 1]); hasta.setDate(hasta.getDate() + (7 - hasta.getDay()) % 7);
      let html = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d) => `<div class="dow">${d}</div>`).join('');
      for (const d = new Date(desde); d <= hasta; d.setDate(d.getDate() + 1)) {
        const k = fmtFecha(d), n = mapa.get(k);
        const mes = d.getDate() === 1 ? ` <span class="mes">${MESES[d.getMonth()]}</span>` : '';
        if (n) html += `<div class="dia sesion"><span>${d.getDate()}${mes}</span><small>S${n} · ${hora}</small></div>`;
        else if (FERIADOS.includes(k)) html += `<div class="dia" style="border:2px dashed var(--rojo)"><span>${d.getDate()}${mes}</span><small style="color:var(--rojo-osc)">Feriado</small></div>`;
        else html += `<div class="dia"><span>${d.getDate()}${mes}</span></div>`;
      }
      cal.innerHTML = html;

      lista.innerHTML = fechas.map((f, i) => `<tr><td><b>${i + 1} / ${fechas.length}</b></td><td>${DIAS[f.getDay()]} ${fmtFecha(f)}</td>`
        + `<td>${NOMBRE_TURNO[estado.turno]} ${hora}</td><td>${puesto}</td><td style="color:var(--azul);font-weight:700">Por generar</td></tr>`).join('');

      const ultimo = fechas[fechas.length - 1];
      $('#resumen-prog').textContent = `${fechas.length} sesiones · del ${fmtFecha(fechas[0])} al ${fmtFecha(ultimo)}`;
      $('#txt-total-citas').textContent = fechas.length;
    }

    formProg.addEventListener('submit', (e) => {
      e.preventDefault();
      const fechas = calcularFechas();
      if (!fechas) { toast('Ingrese una fecha de inicio válida (dd/mm/aaaa).'); return; }
      $$('#tabla-citas tbody td:last-child').forEach((td, i) => {
        td.textContent = `Cita Nº ${1000 + i}`; td.style.color = 'var(--verde-osc)';
      });
      toast(`Se generaron ${fechas.length} citas en el Módulo de Procedimientos Programados.`);
    });

    generar();
  }

  /* ======================================================
     4. REGISTRO DE SESIÓN DE HEMODIÁLISIS
     ====================================================== */
  const formSesion = $('#form-sesion');
  if (formSesion) {
    const pesoAnterior = num(formSesion.dataset.pesoPostAnterior);
    const pesoSeco = num(formSesion.dataset.pesoSeco);

    const recalcular = () => {
      const pre = num($('#s-peso-pre').value), post = num($('#s-peso-post').value);
      $('#kpi-ganancia').textContent = pre && pesoAnterior ? `${(pre - pesoAnterior).toFixed(1)} kg` : '—';
      $('#s-uf-prog').value = pre && pesoSeco ? Math.max(0, Math.round((pre - pesoSeco) * 1000)) : '';
      $('#t-uf').value = pre && post ? Math.round((pre - post) * 1000) : '';
    };
    ['#s-peso-pre', '#s-peso-post'].forEach((s) => $(s).addEventListener('input', recalcular));

    // Asistencia: si no asistió o se suspendió, se bloquea el registro clínico
    $$('input[name=asistencia]').forEach((r) => r.addEventListener('change', () => {
      const asistio = $('input[name=asistencia]:checked').value === 'ASISTIO';
      $$('[data-clinico] .inp, [data-clinico] input').forEach((el) => { el.disabled = !asistio; });
      $('#motivo-inasistencia').hidden = asistio;
    }));

    // Agregar fila de monitoreo intradiálisis
    $('#btn-agregar-control').addEventListener('click', () => {
      const tbody = $('#tabla-monitoreo tbody');
      const ahora = new Date();
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><input class="inp sm" value="${pad(ahora.getHours())}:${pad(ahora.getMinutes())}" aria-label="Hora"></td>`
        + ['PA', 'FC', 'Qb', 'Presión venosa', 'PTM', 'UF acumulada', 'Observación']
          .map((l) => `<td><input class="inp sm" aria-label="${l}"></td>`).join('')
        + '<td class="nota">[Usuario en sesión]</td>';
      tbody.appendChild(tr);
      $('input:nth-child(1)', tr.children[1]).focus();
    });

    // Alerta de hipotensión en el monitoreo
    $('#tabla-monitoreo').addEventListener('change', (e) => {
      if (e.target.getAttribute('aria-label') !== 'PA') return;
      const sis = num(e.target.value.split('/')[0]);
      const alerta = sis !== null && sis < 90;
      e.target.classList.toggle('error', alerta);
      if (alerta) { $('#inc-hipotension').checked = true; $('#inc-ninguna').checked = false; toast('PA sistólica < 90 mmHg: se marcó «Hipotensión» en incidencias.'); }
    });

    $('#btn-avance').addEventListener('click', () => toast('Avance guardado.'));
    formSesion.addEventListener('submit', (e) => {
      e.preventDefault();
      const asistio = $('input[name=asistencia]:checked').value === 'ASISTIO';
      if (asistio && (!$('#s-peso-pre').value || !$('#s-peso-post').value || !$('#t-hora').value)) {
        toast('Para cerrar la sesión registre peso pre, peso post y hora de término.');
        return;
      }
      if (asistio && !$$('#incidencias input:checked').length) {
        toast('Marque al menos una opción en incidencias (o «Ninguna»).');
        return;
      }
      toast('Sesión cerrada. Se actualizó el seguimiento del paciente.');
    });
  }

  /* ======================================================
     5. SEGUIMIENTO DEL PACIENTE
     ====================================================== */
  const linea = $('#linea-sesiones');
  if (linea) {
    // En producción este arreglo vendría del backend
    const sesiones = [
      ['26/10', 'realizada'], ['28/10', 'realizada'], ['30/10', 'realizada'], ['02/11', 'realizada'],
      ['04/11', 'hoy'], ['06/11', 'programada'], ['09/11', 'programada'], ['11/11', 'programada'],
      ['13/11', 'programada'], ['16/11', 'programada'], ['18/11', 'programada'], ['20/11', 'programada']
    ];
    const ETQ = { realizada: 'Realizada', hoy: 'Hoy', programada: 'Programada', falta: 'No asistió' };
    linea.innerHTML = sesiones.map(([f, e], i) =>
      `<a class="sesion-card ${e}" href="sesion.html"><b>S${i + 1}</b><span>${f}</span><em>${ETQ[e]}</em></a>`).join('');

    const hechas = sesiones.filter((s) => s[1] === 'realizada').length;
    $('#kpi-realizadas').textContent = `${hechas} / ${sesiones.length}`;
    $('#kpi-faltas').textContent = sesiones.filter((s) => s[1] === 'falta').length;

    // La reevaluación se habilita a partir de la penúltima sesión
    const habilitada = hechas >= sesiones.length - 2;
    $$('#reevaluacion .btn').forEach((b) => { if (!habilitada) b.setAttribute('aria-disabled', 'true'); });
    $('#reevaluacion').addEventListener('click', (e) => {
      const b = e.target.closest('.btn');
      if (b && b.getAttribute('aria-disabled') === 'true') {
        e.preventDefault();
        toast(`La reevaluación se habilita en la sesión ${sesiones.length - 1} de ${sesiones.length}.`);
      }
    });
  }
})();
