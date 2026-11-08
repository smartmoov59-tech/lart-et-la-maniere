/* ==========================================================================
   Réservation 100 % statique — aucun back-end, aucun abonnement.
   La demande se transforme en SMS pré-rempli (sms:), message Instagram,
   appel (tel:) ou fichier agenda (.ics). Lauriane confirme ensuite.
   ========================================================================== */
(() => {
  'use strict';

  const PHONE_INTL = '+33766265873';
  const ADDRESS = '420 Petit Chemin de Saint-Estève, 13120 Gardanne';
  const LAST_SLOT = '17:00';
  const DAYS_AHEAD = 24;

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const form = $('#bookForm');
  if (!form) return;

  const panes = $$('[data-pane]', form);
  const dots = $$('[data-dot]', form);
  const btnNext = $('#bookNext');
  const btnPrev = $('#bookPrev');
  const chipsBox = $('#serviceChips');
  const dayStrip = $('#dayStrip');
  const timeGrid = $('#timeGrid');
  const fName = $('#fName');
  const fNote = $('#fNote');
  const fMsg = $('#fMsg');
  const flex = $('#flex');
  const sendSms = $('#sendSms');
  const sendIg = $('#sendIg');
  const note = $('#sendNote');
  let step = 1;

  /* ---------- Prestations (lues depuis les cartes de la page) ---------- */
  const services = $$('.svc-card[data-service]').map(c => c.dataset.service);
  services.push('Je ne sais pas encore, conseillez-moi');
  services.forEach((name, i) => {
    const l = document.createElement('label');
    l.className = 'chip';
    l.innerHTML = '<input type="checkbox" name="service" value=""><span></span>';
    $('input', l).value = name;
    $('span', l).textContent = name;
    chipsBox.appendChild(l);
  });

  /* ---------- Jours (hors dimanche) ---------- */
  const fWd = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' });
  const fMo = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
  const fLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const clean = s => s.replace('.', '');

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let added = 0, offset = 1;
  while (added < DAYS_AHEAD) {
    const d = new Date(start);
    d.setDate(start.getDate() + offset++);
    if (d.getDay() === 0) continue; // dimanche : fermé
    const l = document.createElement('label');
    l.className = 'day';
    l.innerHTML = '<input type="radio" name="day" value=""><span><small></small><b></b><em></em></span>';
    $('input', l).value = iso(d);
    $('small', l).textContent = clean(fWd.format(d));
    $('b', l).textContent = d.getDate();
    $('em', l).textContent = clean(fMo.format(d));
    l.setAttribute('aria-label', fLong.format(d));
    dayStrip.appendChild(l);
    added++;
  }

  /* ---------- Heures ---------- */
  for (let h = 9; h <= 17; h++) {
    for (const m of [0, 30]) {
      const v = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      if (v > LAST_SLOT) continue;
      const l = document.createElement('label');
      l.className = 'time';
      l.innerHTML = '<input type="radio" name="time" value=""><span></span>';
      $('input', l).value = v;
      $('span', l).textContent = `${h}h${m ? '30' : '00'}`;
      timeGrid.appendChild(l);
    }
  }

  /* ---------- Étapes ---------- */
  const show = (err, on) => { const e = $('#err' + err); if (e) e.hidden = !on; };
  const selectedServices = () => $$('input[name="service"]:checked', form).map(i => i.value);
  const selectedDay = () => { const i = $('input[name="day"]:checked', form); return i ? i.value : ''; };
  const selectedTime = () => { const i = $('input[name="time"]:checked', form); return i ? i.value : ''; };
  const niceTime = v => { const [h, m] = v.split(':'); return `${+h}h${m === '00' ? '' : m}`; };

  function validate(n) {
    if (n === 1) { const ok = selectedServices().length > 0; show(1, !ok); return ok; }
    if (n === 2) { const ok = !!selectedDay() && !!selectedTime(); show(2, !ok); return ok; }
    if (n === 3) { const ok = fName.value.trim().length >= 2; show(3, !ok); if (!ok) fName.focus(); return ok; }
    return true;
  }

  function buildMessage() {
    const name = fName.value.trim();
    const svc = selectedServices().join(', ');
    const d = new Date(selectedDay() + 'T00:00');
    const slot = `${fLong.format(d)} à ${niceTime(selectedTime())}`;
    const idea = fNote.value.trim();
    return [
      `Bonjour Lauriane, c'est ${name} 😊`,
      `Je souhaite réserver : ${svc}.`,
      `Créneau souhaité : ${slot}${flex.checked ? " (je suis flexible sur l'horaire)" : ''}.`,
      idea ? `Mon idée : ${idea}` : '',
      'Peux-tu me confirmer si c\'est possible ? Merci !',
      '(Demande envoyée depuis ton site)'
    ].filter(Boolean).join('\n');
  }

  function refreshLinks() {
    sendSms.href = `sms:${PHONE_INTL}?&body=${encodeURIComponent(fMsg.value)}`;
  }

  function go(n) {
    step = n;
    panes.forEach(p => p.classList.toggle('is-on', +p.dataset.pane === n));
    dots.forEach(d => {
      const k = +d.dataset.dot;
      d.classList.toggle('is-on', k === n);
      d.classList.toggle('is-done', k < n);
    });
    btnPrev.hidden = n === 1;
    btnNext.hidden = n === 4;
    $('span', btnNext).textContent = n === 3 ? 'Voir mon message' : 'Continuer';
    if (n === 4) { fMsg.value = buildMessage(); refreshLinks(); note.textContent = "Ta demande n'est pas confirmée tant que Lauriane ne t'a pas répondu."; }
    const legend = $('[data-pane="' + n + '"] legend', form);
    if (legend) { legend.setAttribute('tabindex', '-1'); legend.focus({ preventScroll: true }); }
    const r = form.getBoundingClientRect();
    if (r.top < 70 || r.top > innerHeight * 0.5) {
      const y = scrollY + r.top - 90;
      if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }

  btnNext.addEventListener('click', () => { if (validate(step)) go(step + 1); });
  btnPrev.addEventListener('click', () => go(Math.max(1, step - 1)));
  form.addEventListener('submit', e => e.preventDefault());
  form.addEventListener('change', () => { show(1, false); show(2, false); });
  fName.addEventListener('input', () => show(3, false));
  fMsg.addEventListener('input', refreshLinks);
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'A' && e.target.tagName !== 'BUTTON' && step < 4) {
      e.preventDefault();
      if (validate(step)) go(step + 1);
    }
  });

  /* ---------- Actions finales ---------- */
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch (_) { /* repli ci-dessous */ }
    try { fMsg.focus(); fMsg.select(); const ok = document.execCommand('copy'); fMsg.setSelectionRange(0, 0); return ok; }
    catch (_) { return false; }
  }

  sendSms.addEventListener('click', async () => {
    refreshLinks();
    const ok = await copy(fMsg.value);
    note.textContent = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      ? "Ton application SMS s'ouvre avec le message prêt à envoyer. Lauriane te confirmera ton créneau."
      : `Sur ordinateur, le SMS ne s'ouvre pas toujours : ${ok ? 'ton message est copié, ' : ''}envoie-le au 07 66 26 58 73 ou colle-le dans un message Instagram.`;
  });

  sendIg.addEventListener('click', async () => {
    const ok = await copy(fMsg.value);
    note.textContent = ok
      ? 'Message copié ! Colle-le dans la conversation Instagram qui vient de s\'ouvrir.'
      : 'Copie le message ci-dessus et colle-le dans la conversation Instagram.';
  });

  $('#copyMsg').addEventListener('click', async () => {
    const ok = await copy(fMsg.value);
    note.textContent = ok ? 'Message copié dans le presse-papiers ✔' : 'Sélectionne le texte du message pour le copier.';
  });

  const esc = s => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const stamp = (day, time, plusMin = 0) => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(day + 'T00:00');
    d.setHours(h, m + plusMin, 0, 0);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  };

  $('#dlIcs').addEventListener('click', () => {
    const now = new Date();
    const z = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}T${String(now.getUTCHours()).padStart(2, '0')}${String(now.getUTCMinutes()).padStart(2, '0')}00Z`;
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//L\'Art et la Maniere//Reservation//FR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@lart-et-la-maniere`,
      `DTSTAMP:${z}`,
      `DTSTART:${stamp(selectedDay(), selectedTime())}`,
      `DTEND:${stamp(selectedDay(), selectedTime(), 90)}`,
      `SUMMARY:${esc("RDV L'Art et la Manière (à confirmer)")}`,
      `LOCATION:${esc(ADDRESS)}`,
      `DESCRIPTION:${esc('Prestation(s) : ' + selectedServices().join(', ') + '\nDemande à confirmer avec Lauriane au 07 66 26 58 73.')}`,
      'STATUS:TENTATIVE',
      'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Rendez-vous L\'Art et la Manière', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rdv-lart-et-la-maniere.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    note.textContent = 'Fichier agenda téléchargé : le rendez-vous y est marqué « à confirmer ».';
  });

  /* ---------- Pré-sélection depuis les cartes « Réserver » ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    const name = b.dataset.book;
    $$('input[name="service"]', form).forEach(i => { i.checked = (i.value === name); });
    show(1, false);
    go(1);
    const target = document.getElementById('reserver');
    if (window.__lenis) window.__lenis.scrollTo(target, { duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });

  go(1);
})();
