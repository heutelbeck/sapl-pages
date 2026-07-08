(function() {
  // --- Theme application ---
  function applyTheme() {
    var s = getComputedStyle(document.documentElement);
    var v = function(n) { return s.getPropertyValue(n).trim(); };
    var svg = document.getElementById('geo-svg');
    if (!svg) return;
    svg.querySelectorAll('.svg-bg').forEach(function(el) { el.setAttribute('fill', v('--d-bg')); });
    svg.querySelectorAll('.svg-node-fill').forEach(function(el) { el.setAttribute('fill', v('--d-node-fill')); el.setAttribute('stroke', v('--d-node-stroke')); });
    svg.querySelectorAll('.svg-line').forEach(function(el) { el.setAttribute('stroke', el.dataset.active === '1' ? v('--d-line-active') : v('--d-line')); });
    svg.querySelectorAll('.svg-line-glow').forEach(function(el) { el.setAttribute('stroke', v('--d-line-active')); });
    svg.querySelectorAll('.svg-text').forEach(function(el) { el.setAttribute('fill', v('--d-text')); });
    svg.querySelectorAll('.svg-text-secondary').forEach(function(el) { el.setAttribute('fill', v('--d-text-secondary')); });
    svg.querySelectorAll('.svg-text-muted').forEach(function(el) { el.setAttribute('fill', v('--d-text-muted')); });
    svg.querySelectorAll('.svg-narration').forEach(function(el) { el.setAttribute('fill', v('--d-narration')); });
    svg.querySelectorAll('.svg-token-fill').forEach(function(el) { el.setAttribute('fill', v('--d-token')); });
    svg.querySelectorAll('.svg-container-fill').forEach(function(el) { el.setAttribute('fill', v('--d-container-fill')); el.setAttribute('stroke', v('--d-container-stroke')); });
    svg.querySelectorAll('.svg-container-stroke').forEach(function(el) { el.setAttribute('stroke', v('--d-container-stroke')); });
    svg.querySelectorAll('.svg-container-label').forEach(function(el) { el.setAttribute('fill', v('--d-container-label')); });
    svg.querySelectorAll('.svg-state-bg').forEach(function(el) { el.setAttribute('fill', v('--d-state-bg')); if (!el.getAttribute('stroke')) el.setAttribute('stroke', v('--d-state-initial')); });
    svg.querySelectorAll('.svg-state-initial').forEach(function(el) { el.setAttribute('fill', v('--d-state-initial')); });
    svg.querySelectorAll('.svg-drop-text').forEach(function(el) { el.setAttribute('fill', v('--d-drop-color')); });
    svg.querySelectorAll('.svg-token-pill').forEach(function(el) { el.setAttribute('fill', v('--d-surface')); el.setAttribute('stroke', v('--d-line')); });
    refreshDynamic();
  }
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // --- Speed ---
  var speedSlider = document.getElementById('geo-speed-slider');
  var speedLabel = document.getElementById('geo-speed-label');
  var speed = 1;
  if (speedSlider) {
    speedSlider.value = '1'; speedLabel.textContent = '1x';
    speedSlider.addEventListener('input', function() {
      speed = parseFloat(speedSlider.value);
      speedLabel.textContent = speed + 'x';
    });
  }
  function gd(ms) { return ms / speed; }

  // --- Elements ---
  var narration = document.getElementById('geo-narration');
  var pepState = document.getElementById('geo-pep-state');
  var stateBgEl = document.getElementById('geo-state-bg');
  var dot = document.getElementById('geo-dot');
  var dotLabel = document.getElementById('geo-dot-label');
  var tk = document.getElementById('geo-token');
  var tkGlow = document.getElementById('geo-token-glow');
  var tkLabel = document.getElementById('geo-token-label');
  var tkPill = document.getElementById('geo-token-pill');
  var dropEl = document.getElementById('geo-drop');
  var counter = document.getElementById('geo-step-counter');
  var clockTime = document.getElementById('geo-clock-time');
  var clockMarker = document.getElementById('geo-clock-marker');
  var clockEmit = document.getElementById('geo-clock-emit');
  var clockEmitBg = document.getElementById('geo-clock-emit-bg');
  var polActive = document.getElementById('geo-pol-active');
  var polVerbs = [null];
  var polConds = [null];
  for (var i = 1; i <= 3; i++) {
    polVerbs.push(document.getElementById('geo-pol-verb-' + i));
    polConds.push(document.getElementById('geo-pol-cond-' + i));
  }

  var lines = {
    clientPep: document.getElementById('geo-line-client-pep'),
    pepSource: document.getElementById('geo-line-pep-source'),
    pepPdp:    document.getElementById('geo-line-pep-pdp'),
    pipPdp:    document.getElementById('geo-line-pip-pdp'),
    clockPdp:  document.getElementById('geo-line-clock-pdp'),
  };
  var glows = {
    clientPep: document.getElementById('geo-glow-client-pep'),
    pepSource: document.getElementById('geo-glow-pep-source'),
    pepPdp:    document.getElementById('geo-glow-pep-pdp'),
    pipPdp:    document.getElementById('geo-glow-pip-pdp'),
    clockPdp:  document.getElementById('geo-glow-clock-pdp'),
  };
  var labels = {
    clientPep: document.getElementById('geo-lbl-client-pep'),
    pepSource: document.getElementById('geo-lbl-pep-source'),
    pepPdp:    document.getElementById('geo-lbl-pep-pdp'),
    pipPdp:    document.getElementById('geo-lbl-pip-pdp'),
    clockPdp:  document.getElementById('geo-lbl-clock-pdp'),
  };

  var sLines = [];
  for (var j = 1; j <= 7; j++) sLines.push(document.getElementById('geo-s' + j));
  var sCount = 0;

  var pts = {
    clientR:  { x: 200, y: 250 },
    pepL:     { x: 310, y: 250 },
    pepR:     { x: 460, y: 250 },
    pepB:     { x: 385, y: 285 },
    sourceL:  { x: 570, y: 250 },
    pdpT:     { x: 385, y: 370 },
    pdpL:     { x: 335, y: 400 },
    pdpR:     { x: 435, y: 400 },
    pipR:     { x: 200, y: 400 },
    clockL:   { x: 600, y: 400 },
  };

  function getC() {
    var s = getComputedStyle(document.documentElement);
    return {
      permit: s.getPropertyValue('--d-permit').trim(),
      deny: s.getPropertyValue('--d-deny').trim(),
      suspend: s.getPropertyValue('--d-suspend').trim(),
      stateInitial: s.getPropertyValue('--d-state-initial').trim(),
      lineActive: s.getPropertyValue('--d-line-active').trim(),
      line: s.getPropertyValue('--d-line').trim(),
      text: s.getPropertyValue('--d-text').trim(),
      textMuted: s.getPropertyValue('--d-text-muted').trim(),
    };
  }

  // --- Clock PIP ---
  var clockValue = '08:02';
  var emittedValue = null;

  function setClock(hhmm) {
    clockValue = hhmm;
    var c = getC();
    var p = hhmm.split(':');
    var min = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    var inWindow = min >= 480 && min < 1080;
    var frac = inWindow ? (min - 480) / 600 : 1.05;
    clockTime.textContent = hhmm;
    clockMarker.setAttribute('cx', String(615 + frac * 150));
    clockMarker.setAttribute('fill', inWindow ? c.permit : c.deny);
  }

  function setEmitted(val) {
    emittedValue = val;
    if (val === null) {
      clockEmit.setAttribute('opacity', '0');
      clockEmitBg.setAttribute('opacity', '0');
      return;
    }
    var c = getC();
    var color = val ? c.permit : c.deny;
    clockEmit.textContent = val ? 'true' : 'false';
    clockEmit.setAttribute('fill', color);
    clockEmit.setAttribute('opacity', '1');
    clockEmitBg.setAttribute('stroke', color);
    clockEmitBg.setAttribute('opacity', '1');
  }

  // --- Policy table ---
  var activeRow = 0;
  var rowY = [0, 457, 477, 497];

  function setPolicyRow(n) {
    activeRow = n;
    var c = getC();
    var rowColors = [null, c.deny, c.permit, c.suspend];
    for (var i = 1; i <= 3; i++) {
      var active = i === n;
      polVerbs[i].setAttribute('fill', active ? rowColors[i] : c.textMuted);
      polConds[i].setAttribute('fill', active ? c.text : c.textMuted);
      polVerbs[i].setAttribute('opacity', active || n === 0 ? '1' : '0.55');
      polConds[i].setAttribute('opacity', active || n === 0 ? '1' : '0.55');
    }
    if (n === 0) { polActive.setAttribute('opacity', '0'); return; }
    polActive.setAttribute('y', String(rowY[n]));
    polActive.setAttribute('stroke', rowColors[n]);
    polActive.setAttribute('opacity', '1');
  }

  // --- PEP state ---
  var currentState = 'PENDING';

  function setState(state) {
    currentState = state;
    var c = getC();
    pepState.textContent = state;
    var color = state === 'PERMITTING' ? c.permit
              : state === 'SUSPENDED' ? c.suspend
              : state === 'TERMINATED' ? c.deny
              : c.stateInitial;
    pepState.setAttribute('fill', color);
    stateBgEl.setAttribute('stroke', color);
    pepState.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }],
      { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    stateBgEl.animate([{ strokeWidth: '1' }, { strokeWidth: '2.5' }, { strokeWidth: '1' }],
      { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function refreshDynamic() {
    setClock(clockValue);
    setEmitted(emittedValue);
    setPolicyRow(activeRow);
    setState(currentState);
  }

  function setLine(key, active, text, quiet) {
    var c = getC();
    var el = lines[key], gl = glows[key], lb = labels[key];
    el.dataset.active = active ? '1' : '0';
    el.setAttribute('stroke', active ? c.lineActive : c.line);
    el.setAttribute('stroke-width', active ? '2.5' : '1.5');
    if (gl && !quiet) {
      gl.setAttribute('stroke', active ? c.lineActive : c.deny);
      gl.animate([{ opacity: 0 }, { opacity: active ? 0.35 : 0.5 }, { opacity: 0 }],
        { duration: 800, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
      gl.setAttribute('opacity', '0');
    }
    if (gl && quiet) gl.setAttribute('opacity', '0');
    lb.textContent = text || '';
    lb.setAttribute('opacity', text ? '1' : '0');
    lb.setAttribute('fill', active ? c.lineActive : c.textMuted);
  }

  function animateToken(from, to, label, duration) {
    return new Promise(function(resolve) {
      tk.setAttribute('opacity', '1');
      tkGlow.setAttribute('opacity', '1');
      tkLabel.setAttribute('opacity', '1');
      tkLabel.textContent = label || '';
      var bbox = tkLabel.getBBox();
      var pw = bbox.width + 12;
      tkPill.setAttribute('width', pw);
      tkPill.setAttribute('opacity', label ? '0.9' : '0');
      var start = performance.now();
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        var x = from.x + (to.x - from.x) * ease;
        var y = from.y + (to.y - from.y) * ease;
        tk.setAttribute('cx', x); tk.setAttribute('cy', y);
        tkGlow.setAttribute('cx', x); tkGlow.setAttribute('cy', y);
        tkLabel.setAttribute('x', x); tkLabel.setAttribute('y', y - 14);
        tkPill.setAttribute('x', x - pw / 2); tkPill.setAttribute('y', y - 23);
        if (t < 1) requestAnimationFrame(tick);
        else { tk.setAttribute('opacity','0'); tkGlow.setAttribute('opacity','0');
               tkLabel.setAttribute('opacity','0'); tkPill.setAttribute('opacity','0'); resolve(); }
      }
      requestAnimationFrame(tick);
    });
  }

  function moveDot(toX, toY, duration) {
    return new Promise(function(resolve) {
      var fx = parseFloat(dot.getAttribute('cx')), fy = parseFloat(dot.getAttribute('cy'));
      var start = performance.now();
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        var x = fx + (toX - fx) * ease, y = fy + (toY - fy) * ease;
        dot.setAttribute('cx', x); dot.setAttribute('cy', y);
        dotLabel.setAttribute('x', x); dotLabel.setAttribute('y', y - 10);
        if (t < 1) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function pushStream(text, color) {
    var idx = Math.min(sCount, sLines.length - 1);
    if (sCount >= sLines.length) {
      for (var i = 0; i < sLines.length - 1; i++) {
        sLines[i].textContent = sLines[i + 1].textContent;
        sLines[i].setAttribute('fill', sLines[i + 1].getAttribute('fill'));
        sLines[i].setAttribute('opacity', '1');
      }
    }
    sLines[idx].textContent = text;
    sLines[idx].setAttribute('fill', color || getC().permit);
    sLines[idx].setAttribute('opacity', '1');
    sCount++;
  }

  function clearStream() { sCount = 0; sLines.forEach(function(l) { l.setAttribute('opacity','0'); l.textContent=''; }); }

  function flashDrop() {
    return new Promise(function(resolve) {
      dropEl.setAttribute('opacity', '1');
      var start = performance.now();
      function tick(now) {
        var t = Math.min((now - start) / gd(400), 1);
        dropEl.setAttribute('opacity', String(1 - t));
        if (t < 1) requestAnimationFrame(tick); else resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function pause(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  // --- Steps ---
  var steps = [
    async function() {
      setClock('08:02');
      narration.textContent = 'Client subscribes to the market data stream';
      await animateToken(pts.clientR, pts.pepL, 'subscribe', gd(800));
      setLine('clientPep', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PEP subscribes to the PDP for authorization decisions';
      await animateToken(pts.pepB, pts.pdpT, 'subscribe', gd(800));
      setLine('pepPdp', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PDP subscribes to the geolocation PIP';
      await animateToken(pts.pdpL, pts.pipR, 'subscribe', gd(800));
      setLine('pipPdp', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PDP subscribes to the clock PIP';
      await animateToken(pts.pdpR, pts.clockL, 'subscribe', gd(800));
      setLine('clockPdp', true, 'subscribed');
    },
    async function() {
      setClock('08:03');
      narration.textContent = 'Traccar PIP emits initial coordinates to the PDP';
      await animateToken(pts.pipR, pts.pdpL, '{lat, lon}', gd(800));
    },
    async function() {
      narration.textContent = 'Clock PIP emits its initial value: true. It stays silent until that changes.';
      setEmitted(true);
      await animateToken(pts.clockL, pts.pdpR, 'true', gd(800));
    },
    async function() {
      narration.textContent = 'First match wins. Deny does not apply, permit does. PDP emits PERMIT.';
      setPolicyRow(2);
      await animateToken(pts.pdpT, pts.pepB, 'PERMIT', gd(800));
      setState('PERMITTING');
    },
    async function() {
      setClock('08:04');
      narration.textContent = 'PEP subscribes to the market feed';
      await animateToken(pts.pepR, pts.sourceL, 'subscribe', gd(800));
      setLine('pepSource', true, 'subscribed');
    },
    async function() {
      setClock('08:05');
      narration.textContent = 'Market data flows through the PEP to the client';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('AAPL 189.42 +0.8%', getC().permit);
    },
    async function() {
      setClock('09:12');
      narration.textContent = 'The clock advances. The PIP stays silent. Data keeps flowing.';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('MSFT 425.10 -0.3%', getC().permit);
    },
    async function() {
      setClock('10:15');
      narration.textContent = 'Trader A moves across the floor. PIP emits new coordinates.';
      await moveDot(130, 390, gd(800));
      await animateToken(pts.pipR, pts.pdpL, '{lat, lon}', gd(700));
    },
    async function() {
      setClock('10:16');
      narration.textContent = 'geo.within still true. No new decision. Data keeps flowing.';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('TSLA 242.88 +2.1%', getC().permit);
    },
    async function() {
      setClock('11:30');
      narration.textContent = 'Trader A leaves the trading floor';
      await moveDot(165, 430, gd(1200));
    },
    async function() {
      narration.textContent = 'Traccar PIP emits new coordinates to the PDP';
      await animateToken(pts.pipR, pts.pdpL, '{lat, lon}', gd(800));
    },
    async function() {
      narration.textContent = 'Permit no longer applies. Evaluation falls through. PDP emits SUSPEND.';
      setPolicyRow(3);
      await animateToken(pts.pdpT, pts.pepB, 'SUSPEND', gd(800));
      setState('SUSPENDED');
    },
    async function() {
      setClock('11:31');
      narration.textContent = 'PEP signals the client: stream suspended';
      await animateToken(pts.pepL, pts.clientR, 'suspended', gd(800));
      pushStream('-- stream suspended --', getC().suspend);
    },
    async function() {
      setClock('11:33');
      narration.textContent = 'The market feed keeps emitting. The PEP silently drops the data.';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await flashDrop();
    },
    async function() {
      setClock('11:40');
      narration.textContent = 'Trader A returns to the trading floor';
      await moveDot(110, 400, gd(1200));
    },
    async function() {
      narration.textContent = 'Traccar PIP emits new coordinates to the PDP';
      await animateToken(pts.pipR, pts.pdpL, '{lat, lon}', gd(800));
    },
    async function() {
      narration.textContent = 'Permit applies again. PDP emits PERMIT.';
      setPolicyRow(2);
      await animateToken(pts.pdpT, pts.pepB, 'PERMIT', gd(800));
      setState('PERMITTING');
    },
    async function() {
      setClock('11:41');
      narration.textContent = 'PEP signals the client: access granted. Same connection, no reconnect.';
      await animateToken(pts.pepL, pts.clientR, 'granted', gd(800));
      pushStream('-- access granted --', getC().permit);
    },
    async function() {
      setClock('13:05');
      narration.textContent = 'The stream resumes where it left off';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('GOOGL 178.55 +1.2%', getC().permit);
    },
    async function() {
      setClock('15:30');
      narration.textContent = 'The afternoon passes. The clock advances, the PIP stays silent.';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('NVDA 131.26 +0.9%', getC().permit);
    },
    async function() {
      setClock('17:59');
      narration.textContent = 'One minute before the trading window closes';
      await animateToken(pts.sourceL, pts.pepR, 'tick', gd(700));
      await animateToken(pts.pepL, pts.clientR, 'tick', gd(700));
      pushStream('AMD 164.03 -0.5%', getC().permit);
    },
    async function() {
      setClock('18:01');
      narration.textContent = 'The clock crosses 18:00. The clock PIP emits its first change: false.';
      setEmitted(false);
      await animateToken(pts.clockL, pts.pdpR, 'false', gd(800));
    },
    async function() {
      narration.textContent = 'Now the deny policy applies. First match wins. PDP emits DENY.';
      setPolicyRow(1);
      await animateToken(pts.pdpT, pts.pepB, 'DENY', gd(800));
      setState('TERMINATED');
    },
    async function() {
      narration.textContent = 'DENY is terminal. The PEP signals the client and closes the stream.';
      await animateToken(pts.pepL, pts.clientR, 'error', gd(800));
      pushStream('-- access denied --', getC().deny);
      setLine('clientPep', false, '');
    },
    async function() {
      narration.textContent = 'The PEP releases the market feed and the PDP subscription';
      await animateToken(pts.pepR, pts.sourceL, 'unsub', gd(600));
      setLine('pepSource', false, '');
      await animateToken(pts.pepB, pts.pdpT, 'unsub', gd(600));
      setLine('pepPdp', false, '');
    },
    async function() {
      setClock('18:02');
      narration.textContent = 'The PDP releases both PIPs';
      await animateToken(pts.pdpL, pts.pipR, 'unsub', gd(600));
      setLine('pipPdp', false, '');
      await animateToken(pts.pdpR, pts.clockL, 'unsub', gd(600));
      setLine('clockPdp', false, '');
    },
    async function() {
      narration.textContent = 'DENY ended the stream. SUSPEND only paused it. Tomorrow is a new subscription.';
    },
  ];

  // --- Controls ---
  var step = 0, playing = false;
  var btnPlay = document.getElementById('geo-btn-play');
  var btnStep = document.getElementById('geo-btn-step');
  var btnReset = document.getElementById('geo-btn-reset');

  function updateCounter() { counter.textContent = step + ' / ' + steps.length; }
  function updateButtons() {
    btnPlay.innerHTML = playing
      ? '<span class="btn-icon">&#9646;&#9646;</span><span class="btn-label">Pause</span>'
      : '<span class="btn-icon">&#9654;</span><span class="btn-label">Play</span>';
    btnStep.disabled = playing;
    btnStep.style.opacity = playing ? '0.4' : '1';
  }

  function reset() {
    step = 0; playing = false;
    setState('PENDING');
    narration.textContent = '';
    tk.setAttribute('opacity','0'); tkGlow.setAttribute('opacity','0');
    tkLabel.setAttribute('opacity','0'); tkPill.setAttribute('opacity','0');
    dropEl.setAttribute('opacity','0');
    dot.setAttribute('cx','110'); dot.setAttribute('cy','395');
    dotLabel.setAttribute('x','110'); dotLabel.setAttribute('y','383');
    setClock('08:02');
    setEmitted(null);
    setPolicyRow(0);
    ['clientPep','pepSource','pepPdp','pipPdp','clockPdp'].forEach(function(k) { setLine(k, false, '', true); });
    clearStream();
    updateCounter(); updateButtons();
  }

  async function runStep() {
    if (step >= steps.length) return;
    await steps[step](); step++; updateCounter();
  }

  async function playAll() {
    if (playing) return;
    if (step >= steps.length) reset();
    playing = true; updateButtons();
    while (step < steps.length && playing) {
      await runStep();
      if (step < steps.length && playing) await pause(gd(600));
    }
    playing = false; updateButtons();
  }

  btnPlay.addEventListener('click', function() {
    if (playing) { playing = false; updateButtons(); return; }
    playAll();
  });
  btnStep.addEventListener('click', function() { if (!playing) runStep(); });
  btnReset.addEventListener('click', reset);

  requestAnimationFrame(function() { applyTheme(); reset(); });
})();
