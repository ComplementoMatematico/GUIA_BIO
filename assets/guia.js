// Guía de Biología PAES 2027 · navegación, práctica con corrección y búsqueda.
(() => {
  'use strict';
  const CLAVE = 'paesbio27-v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ── estado guardado en el aparato ──────────────────────────────
  let estado = { r: {}, modo: 'inmediata', corr: {} };
  try { Object.assign(estado, JSON.parse(localStorage.getItem(CLAVE)) || {}); } catch (e) { /* sin almacenamiento */ }
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch (e) { /* sin almacenamiento */ } };

  const preguntas = $$('.preg');
  const porEje = {};
  for (const p of preguntas) (porEje[p.dataset.eje] = porEje[p.dataset.eje] || []).push(p);
  const visible = p => estado.modo === 'inmediata' || !!estado.corr[p.dataset.eje];

  // ── vistas ─────────────────────────────────────────────────────
  const vistas = $$('.vista');
  let vistaActual = null;

  function mostrarVista(v) {
    if (vistaActual === v) return;
    for (const x of vistas) x.hidden = x !== v;
    vistaActual = v;
    $('.barra-vista').textContent = v.id === 'inicio' ? '' : v.dataset.titulo;
    document.title = (v.id === 'inicio' ? '' : v.dataset.titulo + ' · ') + 'Guía de Biología PAES 2027';
    for (const a of $$('.ind-inicio, .ind-parte')) a.classList.toggle('activa', a.dataset.vista === v.id);
    for (const ol of $$('.ind-secs')) ol.classList.toggle('abierta', ol.dataset.de === v.id);
    const activo = $(`.indice [data-vista="${v.id}"]`);
    if (activo && innerWidth > 1100) activo.scrollIntoView({ block: 'nearest' });
  }

  function irA(hash, suave) {
    const id = decodeURIComponent((hash || '').replace(/^#/, '')) || 'inicio';
    const el = document.getElementById(id) || document.getElementById('inicio');
    const v = el.closest('.vista');
    const cambio = vistaActual !== v;
    mostrarVista(v);
    cerrarIndice();
    if (el === v) { scrollTo({ top: 0, behavior: cambio ? 'auto' : 'smooth' }); return; }
    const det = el.closest('details');
    if (det) det.open = true;
    requestAnimationFrame(() => {
      el.scrollIntoView({ block: 'start', behavior: suave && !cambio ? 'smooth' : 'auto' });
      if (el.matches('.caja, .preg, .cuadro, .pauta-item')) {
        el.classList.remove('destello'); void el.offsetWidth; el.classList.add('destello');
      }
    });
  }
  addEventListener('hashchange', () => irA(location.hash, true));

  // ── índice lateral (celular) ───────────────────────────────────
  const btnIndice = $('.btn-indice');
  const velo = $('.velo');
  function cerrarIndice() {
    document.body.classList.remove('indice-abierto');
    velo.hidden = true;
    btnIndice.setAttribute('aria-expanded', 'false');
  }
  btnIndice.addEventListener('click', () => {
    const abrir = !document.body.classList.contains('indice-abierto');
    document.body.classList.toggle('indice-abierto', abrir);
    velo.hidden = !abrir;
    btnIndice.setAttribute('aria-expanded', String(abrir));
  });
  velo.addEventListener('click', cerrarIndice);
  addEventListener('keydown', e => { if (e.key === 'Escape') cerrarIndice(); });

  // ── tema ───────────────────────────────────────────────────────
  $('.btn-tema').addEventListener('click', () => {
    const r = document.documentElement;
    const oscuro = r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    r.dataset.theme = oscuro ? 'light' : 'dark';
    try { localStorage.setItem('paesbio27-tema', r.dataset.theme); } catch (e) { /* sin almacenamiento */ }
  });

  // ── preguntas ──────────────────────────────────────────────────
  function pintar(p) {
    const n = p.dataset.n, ok = p.dataset.ok, r = estado.r[n];
    const alts = $$('.alt', p);
    const retro = $('.retro', p);
    p.classList.remove('acierto', 'error');
    for (const b of alts) {
      b.classList.remove('elegida', 'correcta', 'incorrecta', 'atenuada');
      b.disabled = false;
      b.setAttribute('aria-pressed', String(b.dataset.l === r));
    }
    retro.hidden = true;
    if (!r) return;
    if (!visible(p)) {
      const b = alts.find(x => x.dataset.l === r);
      if (b) b.classList.add('elegida');
      return;
    }
    const bien = r === ok;
    p.classList.add(bien ? 'acierto' : 'error');
    for (const b of alts) {
      b.disabled = true;
      if (b.dataset.l === ok) b.classList.add('correcta');
      else if (b.dataset.l === r) b.classList.add('incorrecta');
      else b.classList.add('atenuada');
    }
    $('.veredicto', p).textContent = bien
      ? `¡Correcto! La respuesta es ${ok}.`
      : `Marcaste ${r}; la respuesta correcta es ${ok}.`;
    retro.hidden = false;
  }

  function marcadores() {
    let globOk = 0;
    for (const eje of Object.keys(porEje)) {
      const ps = porEje[eje];
      let resp = 0, ok = 0;
      for (const p of ps) {
        const r = estado.r[p.dataset.n];
        if (!r) continue;
        resp++;
        if (visible(p) && r === p.dataset.ok) ok++;
      }
      globOk += ok;
      const corregido = estado.modo === 'inmediata' || estado.corr[eje];
      for (const bar of $$(`.practica[data-eje="${eje}"]`)) {
        $('.pm-resp', bar).textContent = resp;
        $('.pm-ok', bar).textContent = corregido ? ok : '–';
        $('.corregir', bar).hidden = estado.modo !== 'ensayo' || !!estado.corr[eje];
      }
      for (const s of $$(`.ind-prog[data-eje="${eje}"]`)) s.textContent = resp ? `${resp}/${ps.length}` : '';
      const t = $(`.eje-tarjeta[data-eje="${eje}"]`);
      if (t) {
        $('.et-barra span', t).style.width = (100 * resp / ps.length) + '%';
        $('.et-prog', t).textContent = resp
          ? `${resp} de ${ps.length} respondidas` + (corregido ? ` · ${ok} correctas` : ' · sin corregir')
          : 'Sin respuestas todavía';
      }
    }
    $('#glob-ok').textContent = globOk;
    const cifra = $('#cifra-ok');
    if (cifra) cifra.textContent = globOk;

    // Tabla de especificaciones: «Mis aciertos» se llena sola
    for (const a of $$('.aciertos')) {
      const nums = a.dataset.preg ? a.dataset.preg.split(',') : [];
      const total = nums.length;
      let resp = 0, ok = 0;
      for (const n of nums) {
        const p = document.getElementById('p-' + n);
        const r = estado.r[n];
        if (!r || !p || !visible(p)) continue;
        resp++;
        if (r === p.dataset.ok) ok++;
      }
      a.classList.remove('bien', 'medio', 'bajo');
      a.firstElementChild.textContent = resp ? ok : '–';
      a.title = resp ? `${resp} de ${total} respondidas` : 'Aún no respondes estas preguntas';
      if (resp === total && total) a.classList.add(ok / total >= .75 ? 'bien' : ok / total >= .5 ? 'medio' : 'bajo');
    }
    // Pauta: marca tus aciertos y errores
    for (const li of $$('.pauta-item')) {
      const n = li.id.slice(2);
      const p = document.getElementById('p-' + n);
      const r = estado.r[n];
      const ver = r && p && visible(p);
      li.classList.toggle('tu-acierto', !!ver && r === p.dataset.ok);
      li.classList.toggle('tu-error', !!ver && r !== p.dataset.ok);
    }
  }

  function pintarTodo() {
    for (const p of preguntas) pintar(p);
    for (const b of $$('.modo button')) b.setAttribute('aria-pressed', String(b.dataset.modo === estado.modo));
    marcadores();
  }

  document.addEventListener('click', e => {
    const alt = e.target.closest('.alt');
    if (alt && !alt.disabled) {
      const p = alt.closest('.preg');
      estado.r[p.dataset.n] = alt.dataset.l;
      guardar();
      pintar(p);
      marcadores();
      return;
    }
    const otra = e.target.closest('.reintentar');
    if (otra) {
      const p = otra.closest('.preg');
      delete estado.r[p.dataset.n];
      guardar();
      pintar(p);
      marcadores();
      $('.alt', p).focus();
      return;
    }
    const modo = e.target.closest('.modo button');
    if (modo) {
      estado.modo = modo.dataset.modo;
      guardar();
      pintarTodo();
      return;
    }
    const corr = e.target.closest('.corregir');
    if (corr) {
      const eje = corr.closest('.practica').dataset.eje;
      const ps = porEje[eje];
      const resp = ps.filter(p => estado.r[p.dataset.n]).length;
      if (resp < ps.length && !confirm(`Respondiste ${resp} de ${ps.length} preguntas. ¿Corregir de todas formas?`)) return;
      estado.corr[eje] = true;
      guardar();
      pintarTodo();
      const ok = ps.filter(p => estado.r[p.dataset.n] === p.dataset.ok).length;
      alert(`Eje ${eje}: ${ok} correctas de ${ps.length}. Revisa la explicación bajo cada pregunta y la tabla de especificaciones en la pauta.`);
      return;
    }
    const rei = e.target.closest('.reiniciar');
    if (rei) {
      const eje = rei.closest('.practica').dataset.eje;
      if (!confirm(`¿Borrar todas tus respuestas del eje ${eje}?`)) return;
      for (const p of porEje[eje]) delete estado.r[p.dataset.n];
      delete estado.corr[eje];
      guardar();
      pintarTodo();
    }
  });

  // ── lupa: tocar una figura la muestra en grande ─────────────────
  const lupa = $('.lupa');
  document.addEventListener('click', e => {
    const img = e.target.closest('img.fig');
    if (img && lupa.showModal) {
      const g = $('img', lupa);
      g.src = img.src;
      g.alt = img.alt;
      lupa.showModal();
    } else if (e.target === lupa || e.target.closest('.lupa-cerrar')) lupa.close();
  });

  // ── búsqueda ───────────────────────────────────────────────────
  const normal = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let indiceBusqueda = null;
  function construirIndice() {
    let k = 0;
    indiceBusqueda = $$('.caja, .preg, .cuadro, .nota, h2.bloque, .pauta-item').map(el => {
      if (!el.id) el.id = 'b' + (++k);
      const texto = el.textContent.replace(/\s+/g, ' ').trim();
      const v = el.closest('.vista');
      let titulo;
      if (el.matches('.preg')) titulo = `Pregunta ${el.dataset.n}`;
      else if (el.matches('.pauta-item')) titulo = `Pauta · pregunta ${el.id.slice(2)}`;
      else if (el.matches('h2')) titulo = texto;
      else { const t = $('.caja-tit', el); titulo = t ? t.textContent : texto.slice(0, 70) + '…'; }
      return { el, texto, n: normal(texto), titulo, vista: v.dataset.titulo };
    });
  }
  const buscar = $('#buscar');
  const resultados = $('.resultados');
  let temporizador;
  buscar.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      const q = normal(buscar.value.trim());
      if (q.length < 3) { resultados.hidden = true; resultados.innerHTML = ''; return; }
      if (!indiceBusqueda) construirIndice();
      const palabras = q.split(/\s+/);
      const hits = indiceBusqueda.filter(x => palabras.every(p => x.n.includes(p))).slice(0, 40);
      resultados.innerHTML = '';
      if (!hits.length) {
        resultados.innerHTML = '<li class="vacio">Sin resultados.</li>';
      }
      for (const h of hits) {
        const i = h.n.indexOf(palabras[0]);
        const ini = Math.max(0, i - 40);
        const frag = h.texto.slice(ini, i + 80);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + h.el.id;
        const t = document.createElement('b');
        t.textContent = h.titulo.length > 80 ? h.titulo.slice(0, 80) + '…' : h.titulo;
        const sm = document.createElement('small');
        sm.textContent = h.vista;
        const p = document.createElement('small');
        const j = i - ini;
        p.append((ini ? '…' : '') + frag.slice(0, j));
        const m = document.createElement('mark');
        m.textContent = frag.slice(j, j + palabras[0].length);
        p.append(m, frag.slice(j + palabras[0].length) + '…');
        a.append(t, sm, p);
        li.append(a);
        resultados.append(li);
      }
      resultados.hidden = false;
    }, 160);
  });

  // ── progreso de lectura y sección actual ───────────────────────
  const barra = $('.barra-progreso span');
  let pendiente = false;
  addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const max = document.documentElement.scrollHeight - innerHeight;
      barra.style.width = max > 0 ? (100 * scrollY / max) + '%' : '0';
      for (const pr of $$('.practica', vistaActual)) pr.classList.toggle('compacta', scrollY > 260);
      const hs = $$('h2.bloque', vistaActual);
      let actual = null;
      for (const h of hs) if (h.getBoundingClientRect().top < 140) actual = h.id;
      for (const a of $$(`.ind-secs[data-de="${vistaActual.id}"] a`)) a.classList.toggle('actual', a.getAttribute('href') === '#' + actual);
    });
  }, { passive: true });

  // ── arranque ───────────────────────────────────────────────────
  pintarTodo();
  irA(location.hash, false);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
