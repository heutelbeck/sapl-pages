(function() {
  // --- Theme application ---
  function applyTheme() {
    var s = getComputedStyle(document.documentElement);
    var v = function(n) { return s.getPropertyValue(n).trim(); };
    var svg = document.getElementById('obl-svg');
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
  }
  requestAnimationFrame(applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // --- Speed ---
  var speedSlider = document.getElementById('obl-speed-slider');
  var speedLabel = document.getElementById('obl-speed-label');
  var speed = 1;
  if (speedSlider) {
    speedSlider.value = '1'; speedLabel.textContent = '1x';
    speedSlider.addEventListener('input', function() {
      speed = parseFloat(speedSlider.value);
      speedLabel.textContent = speed + 'x';
    });
  }
  function od(ms) { return ms / speed; }

  // --- Elements ---
  var narration = document.getElementById('obl-narration');
  var pepState = document.getElementById('obl-pep-state');
  var stateBgEl = document.getElementById('obl-state-bg');
  var handlerGroup = document.getElementById('obl-handler-group');
  var handlerLabel = document.getElementById('obl-handler-label');
  var oblJsonEls = [];
  for (var i = 1; i <= 6; i++) oblJsonEls.push(document.getElementById('obl-json-' + i));
  var sevText = document.getElementById('obl-sev-text');
  var sevBg = document.getElementById('obl-sev-bg');
  var tk = document.getElementById('obl-token');
  var tkGlow = document.getElementById('obl-token-glow');
  var tkLabel = document.getElementById('obl-token-label');
  var tkPill = document.getElementById('obl-token-pill');
  var counter = document.getElementById('obl-step-counter');

  var lines = {
    clientPep: document.getElementById('obl-line-client-pep'),
    pepSource: document.getElementById('obl-line-pep-source'),
    pepPdp:    document.getElementById('obl-line-pep-pdp'),
    pipPdp:    document.getElementById('obl-line-pip-pdp'),
  };
  var glows = {
    clientPep: document.getElementById('obl-glow-client-pep'),
    pepSource: document.getElementById('obl-glow-pep-source'),
    pepPdp:    document.getElementById('obl-glow-pep-pdp'),
    pipPdp:    document.getElementById('obl-glow-pip-pdp'),
  };
  var labels = {
    clientPep: document.getElementById('obl-lbl-client-pep'),
    pepSource: document.getElementById('obl-lbl-pep-source'),
    pepPdp:    document.getElementById('obl-lbl-pep-pdp'),
    pipPdp:    document.getElementById('obl-lbl-pip-pdp'),
  };

  var sLines = [];
  for (var j = 1; j <= 9; j++) sLines.push(document.getElementById('obl-s' + j));
  var sCount = 0;

  var pts = {
    clientR:  { x: 200, y: 250 },
    pepL:     { x: 380, y: 250 },
    pepR:     { x: 530, y: 250 },
    pepB:     { x: 455, y: 285 },
    sourceL:  { x: 600, y: 250 },
    pdpT:     { x: 455, y: 390 },
    pdpL:     { x: 405, y: 418 },
    pipR:     { x: 200, y: 418 },
    handlerIn:  { x: 270, y: 230 },
    handlerOut: { x: 270, y: 175 },
  };

  function getC() {
    var s = getComputedStyle(document.documentElement);
    return {
      permit: s.getPropertyValue('--d-permit').trim(),
      deny: s.getPropertyValue('--d-deny').trim(),
      stateInitial: s.getPropertyValue('--d-state-initial').trim(),
      lineActive: s.getPropertyValue('--d-line-active').trim(),
      line: s.getPropertyValue('--d-line').trim(),
      textMuted: s.getPropertyValue('--d-text-muted').trim(),
      token: s.getPropertyValue('--d-token').trim(),
    };
  }

  function setState(state) {
    var c = getC();
    pepState.textContent = state;
    var color = state === 'PERMITTED' ? c.permit : state === 'DENIED' ? c.deny : c.stateInitial;
    pepState.setAttribute('fill', color);
    stateBgEl.setAttribute('stroke', color);
    pepState.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }],
      { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
    stateBgEl.animate([{ strokeWidth: '1' }, { strokeWidth: '2.5' }, { strokeWidth: '1' }],
      { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function setSeverity(level) {
    var c = getC();
    sevText.textContent = level;
    var color = level === 'CRITICAL' ? c.deny : level === 'ROUTINE' ? c.permit : c.stateInitial;
    sevText.setAttribute('fill', color);
    sevBg.setAttribute('stroke', color);
  }

  function setOblJson(arr) {
    oblJsonEls.forEach(function(el, idx) { el.textContent = arr[idx] || ''; });
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

  function moveHandler(toPos, duration) {
    return new Promise(function(resolve) {
      var current = handlerGroup.transform.baseVal.getItem(0);
      var fromX = current.matrix.e, fromY = current.matrix.f;
      var start = performance.now();
      function tick(now) {
        var t = Math.min((now - start) / duration, 1);
        var ease = 1 - Math.pow(1 - t, 3);
        var x = fromX + (toPos.x - fromX) * ease;
        var y = fromY + (toPos.y - fromY) * ease;
        handlerGroup.setAttribute('transform', 'translate(' + x + ',' + y + ')');
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
  function pause(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

  // --- Steps ---
  var steps = [
    async function() {
      narration.textContent = 'Client subscribes to patient record stream';
      await animateToken(pts.clientR, pts.pepL, 'subscribe', od(800));
      setLine('clientPep', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PEP subscribes to PDP for authorization decisions';
      await animateToken(pts.pepB, pts.pdpT, 'subscribe', od(800));
      setLine('pepPdp', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PDP subscribes to patient severity PIP';
      await animateToken(pts.pdpL, pts.pipR, 'subscribe', od(800));
      setLine('pipPdp', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'PIP emits current severity: ROUTINE';
      setSeverity('ROUTINE');
      await animateToken(pts.pipR, pts.pdpL, 'routine', od(800));
    },
    async function() {
      narration.textContent = 'PDP emits PERMIT with obligation: blacken address and phone';
      setOblJson([
        'obligations: [{',
        '"type": "filterJsonContent",',
        '"actions": [',
        '{ "type": "blacken", "path": "$.addr" },',
        '{ "type": "blacken", "path": "$.phone" }',
        ']}]',
      ]);
      await animateToken(pts.pdpT, pts.pepB, 'PERMIT', od(800));
      setState('PERMITTED');
    },
    async function() {
      narration.textContent = 'Constraint handler slides into the data path';
      handlerLabel.textContent = 'addr, phone';
      labels.clientPep.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 300, easing: 'ease-out', fill: 'forwards' });
      await moveHandler(pts.handlerIn, od(500));
    },
    async function() {
      narration.textContent = 'PEP subscribes to data source';
      await animateToken(pts.pepR, pts.sourceL, 'subscribe', od(800));
      setLine('pepSource', true, 'subscribed');
    },
    async function() {
      narration.textContent = 'Record arrives. Handler blackens address and phone.';
      await animateToken(pts.sourceL, pts.pepR, 'record', od(700));
      await animateToken(pts.pepL, pts.clientR, 'filtered', od(700));
      pushStream('Doe, Jane  Addr:XXX  Ph:XXX', getC().permit);
    },
    async function() {
      narration.textContent = 'Another record. Same handler applied.';
      await animateToken(pts.sourceL, pts.pepR, 'record', od(700));
      await animateToken(pts.pepL, pts.clientR, 'filtered', od(700));
      pushStream('Smith, John  Addr:XXX  Ph:XXX', getC().permit);
    },
    async function() {
      narration.textContent = 'Emergency: patient severity escalates to CRITICAL';
      setSeverity('CRITICAL');
    },
    async function() {
      narration.textContent = 'PIP emits new severity to PDP';
      await animateToken(pts.pipR, pts.pdpL, 'critical', od(800));
    },
    async function() {
      narration.textContent = 'PDP emits new PERMIT with no obligations. Full access.';
      setOblJson(['obligations: []']);
      await animateToken(pts.pdpT, pts.pepB, 'PERMIT', od(800));
      setState('PERMITTED');
    },
    async function() {
      narration.textContent = 'Handler slides out. Data flows unfiltered.';
      handlerLabel.textContent = '';
      labels.clientPep.animate([{ opacity: 0 }, { opacity: 1 }],
        { duration: 500, easing: 'ease-out', fill: 'forwards' });
      await moveHandler(pts.handlerOut, od(500));
    },
    async function() {
      narration.textContent = 'Record arrives unfiltered. Address and phone visible.';
      await animateToken(pts.sourceL, pts.pepR, 'record', od(700));
      await animateToken(pts.pepL, pts.clientR, 'record', od(700));
      pushStream('Doe, Jane  142 Oak St  555-0142', getC().permit);
    },
    async function() {
      narration.textContent = 'Nurse can now dispatch to the patient address.';
      await animateToken(pts.sourceL, pts.pepR, 'record', od(700));
      await animateToken(pts.pepL, pts.clientR, 'record', od(700));
      pushStream('Smith, John  89 Elm Ave  555-0189', getC().permit);
    },
    async function() {
      narration.textContent = 'Situation stabilizes. Severity returns to ROUTINE.';
      setSeverity('ROUTINE');
    },
    async function() {
      narration.textContent = 'PIP emits new severity to PDP';
      await animateToken(pts.pipR, pts.pdpL, 'routine', od(800));
    },
    async function() {
      narration.textContent = 'PDP emits PERMIT with filter obligation restored.';
      setOblJson([
        'obligations: [{',
        '"type": "filterJsonContent",',
        '"actions": [',
        '{ "type": "blacken", "path": "$.addr" },',
        '{ "type": "blacken", "path": "$.phone" }',
        ']}]',
      ]);
      await animateToken(pts.pdpT, pts.pepB, 'PERMIT', od(800));
    },
    async function() {
      narration.textContent = 'Handler slides back into the path.';
      handlerLabel.textContent = 'addr, phone';
      labels.clientPep.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 300, easing: 'ease-out', fill: 'forwards' });
      await moveHandler(pts.handlerIn, od(500));
    },
    async function() {
      narration.textContent = 'Records blackened again. No reconnection needed.';
      await animateToken(pts.sourceL, pts.pepR, 'record', od(700));
      await animateToken(pts.pepL, pts.clientR, 'filtered', od(700));
      pushStream('Doe, Jane  Addr:XXX  Ph:XXX', getC().permit);
    },
    async function() {
      narration.textContent = 'Same PERMIT. Different obligations. The data adapted.';
    },
    async function() {
      narration.textContent = 'Client unsubscribes.';
      await animateToken(pts.clientR, pts.pepL, 'unsubscribe', od(700));
      setLine('clientPep', false, '');
    },
    async function() {
      narration.textContent = 'PEP tears down all subscriptions.';
      handlerLabel.textContent = '';
      await moveHandler(pts.handlerOut, od(400));
      await animateToken(pts.pepR, pts.sourceL, 'unsub', od(600));
      setLine('pepSource', false, '', false);
      await animateToken(pts.pepB, pts.pdpT, 'unsub', od(600));
      setLine('pepPdp', false, '', false);
      await animateToken(pts.pdpL, pts.pipR, 'unsub', od(600));
      setLine('pipPdp', false, '', false);
      setState('PENDING');
      setSeverity('');
      setOblJson([]);
    },
  ];

  // --- Controls ---
  var step = 0, playing = false;
  var btnPlay = document.getElementById('obl-btn-play');
  var btnStep = document.getElementById('obl-btn-step');
  var btnReset = document.getElementById('obl-btn-reset');

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
    setSeverity('');
    narration.textContent = '';
    setOblJson([]);
    handlerLabel.textContent = '';
    handlerGroup.setAttribute('transform', 'translate(' + pts.handlerOut.x + ',' + pts.handlerOut.y + ')');
    tk.setAttribute('opacity','0'); tkGlow.setAttribute('opacity','0');
    tkLabel.setAttribute('opacity','0'); tkPill.setAttribute('opacity','0');
    ['clientPep','pepSource','pepPdp','pipPdp'].forEach(function(k) { setLine(k, false, '', true); });
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
      if (step < steps.length && playing) await pause(od(600));
    }
    playing = false; updateButtons();
  }

  btnPlay.addEventListener('click', function() {
    if (playing) { playing = false; updateButtons(); return; }
    playAll();
  });
  btnStep.addEventListener('click', function() { if (!playing) runStep(); });
  btnReset.addEventListener('click', reset);
  updateCounter();
})();
