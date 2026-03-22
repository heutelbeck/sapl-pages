(function() {
  var sdToggle = document.getElementById('sdToggle');
  if (!sdToggle) return;

  var events = [
    { method: 'POST',   path: '/api/payments',     status: 200, ms: 45, user: 'alice@acme.com',   ip: '203.0.113.42' },
    { method: 'GET',    path: '/api/invoices',      status: 200, ms: 12, user: 'bob@globex.net',   ip: '198.51.100.7' },
    { method: 'PUT',    path: '/api/profile',       status: 403, ms: 8,  user: 'carol@initech.io', ip: '192.0.2.15' },
    { method: 'GET',    path: '/api/dashboard',     status: 200, ms: 23, user: 'alice@acme.com',   ip: '203.0.113.42' },
    { method: 'POST',   path: '/api/export',        status: 200, ms: 89, user: 'diana@stark.dev',  ip: '10.0.1.5' },
    { method: 'DELETE', path: '/api/sessions/42',   status: 204, ms: 5,  user: 'bob@globex.net',   ip: '198.51.100.7' },
    { method: 'GET',    path: '/api/users',         status: 200, ms: 15, user: 'carol@initech.io', ip: '192.0.2.15' },
    { method: 'PATCH',  path: '/api/settings',      status: 200, ms: 31, user: 'diana@stark.dev',  ip: '10.0.1.5' },
    { method: 'POST',   path: '/api/notifications', status: 201, ms: 18, user: 'alice@acme.com',   ip: '203.0.113.42' },
    { method: 'GET',    path: '/api/audit-log',     status: 200, ms: 67, user: 'bob@globex.net',   ip: '198.51.100.7' },
  ];
  var MAX_ROWS = 6;
  var state = 'low';
  var dataInterval = null;
  var eventIndex = 0;

  var btns = sdToggle.querySelectorAll('.sd-btn');
  var badge = document.getElementById('sdBadge');
  var decision = document.getElementById('sdDecision');
  var sub = document.getElementById('sdSub');
  var overlay = document.getElementById('sdAccessOverlay');
  var log = document.getElementById('sdLog');
  var body = document.getElementById('sdBody');
  var arrow1 = document.getElementById('sdArrow1');
  var arrow2 = document.getElementById('sdArrow2');
  var pulse1 = document.getElementById('sdPulse1');
  var pulse2 = document.getElementById('sdPulse2');

  function blacken(s) { return '*'.repeat(s.length); }
  function blackenL1(s) { return s[0] + '*'.repeat(s.length - 1); }
  function now() {
    var d = new Date();
    return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)+':'+('0'+d.getSeconds()).slice(-2);
  }

  function addRow() {
    var e = events[eventIndex % events.length];
    var r = state === 'low';
    var tr = document.createElement('tr');
    var u = r ? '<span class="sd-redacted">'+blackenL1(e.user)+'</span>' : e.user;
    var ip = r ? '<span class="sd-redacted">'+blacken(e.ip)+'</span>' : e.ip;
    tr.innerHTML =
      '<td class="sd-dim">'+now()+'</td>'+
      '<td><span class="sd-m-'+e.method.toLowerCase()+'">'+e.method+'</span> '+e.path+'</td>'+
      '<td><span class="'+(e.status<400?'sd-s-ok':'sd-s-err')+'">'+e.status+'</span></td>'+
      '<td>'+u+'</td><td>'+ip+'</td>';
    body.insertBefore(tr, body.firstChild);
    while (body.children.length > MAX_ROWS) body.removeChild(body.lastChild);
    eventIndex++;
  }

  function addLog(type) {
    var el = document.createElement('div');
    el.className = 'sd-log-entry ' + type;
    if (type === 'data') {
      var e = events[(eventIndex-1) % events.length];
      var r = state === 'low';
      var u = r ? blackenL1(e.user) : e.user;
      var ip = r ? blacken(e.ip) : e.ip;
      var uc = r ? 'lr' : 'ls'; var ic = r ? 'lr' : 'ls';
      el.innerHTML = '<span class="lp">data: </span>{'+
        '<span class="lk">"method"</span>:<span class="ls">"'+e.method+'"</span>,'+
        '<span class="lk">"path"</span>:<span class="ls">"'+e.path+'"</span>,'+
        '<span class="lk">"status"</span>:<span class="ln">'+e.status+'</span>,'+
        '<span class="lk">"user"</span>:<span class="'+uc+'">"'+u+'"</span>,'+
        '<span class="lk">"ip"</span>:<span class="'+ic+'">"'+ip+'"</span>}';
    } else if (type === 'sd-suspend') {
      el.innerHTML = '<span class="lp">data: </span>{"type":"ACCESS_SUSPENDED","message":"Critical threat - access denied"}';
    } else if (type === 'sd-restore') {
      el.innerHTML = '<span class="lp">data: </span>{"type":"ACCESS_RESTORED","message":"Threat level changed - access restored"}';
    }
    log.insertBefore(el, log.firstChild);
    while (log.children.length > 50) log.removeChild(log.lastChild);
  }

  function tick() { addRow(); addLog('data'); }
  function startStream() { if (dataInterval) return; tick(); dataInterval = setInterval(tick, 1200); }
  function stopStream() { if (dataInterval) { clearInterval(dataInterval); dataInterval = null; } }

  function setConn(s) {
    var c = s === 'critical' ? 'sd-arrow-deny' : s === 'low' ? 'sd-arrow-warn' : '';
    var p = s === 'critical' ? 'sd-pulse-deny' : s === 'low' ? 'sd-pulse-warn' : '';
    arrow1.className = 'sd-arrow ' + c;
    arrow2.className = 'sd-arrow ' + c;
    pulse1.className = 'sd-pulse ' + p;
    pulse2.className = 'sd-pulse ' + p;
  }

  function setToggle(s) {
    sdToggle.className = 'sd-toggle sd-toggle-' + s;
    btns.forEach(function(b) { b.className = 'sd-btn' + (b.dataset.state === s ? ' sd-btn-active-' + s : ''); });
  }

  function setDecision(s) {
    if (s === 'critical') {
      badge.className = 'sd-badge sd-badge-deny'; decision.textContent = 'DENY'; sub.className = 'sd-badge-sub';
    } else if (s === 'low') {
      badge.className = 'sd-badge sd-badge-warn'; decision.textContent = 'PERMIT'; sub.className = 'sd-badge-sub sd-badge-sub-visible';
    } else {
      badge.className = 'sd-badge sd-badge-permit'; decision.textContent = 'PERMIT'; sub.className = 'sd-badge-sub';
    }
  }

  function setState(ns) {
    if (ns === state) return;
    var os = state; state = ns;
    setToggle(ns);
    setTimeout(function() { setDecision(ns); setConn(ns); }, 200);
    var wp = os !== 'critical'; var ip = ns !== 'critical';
    setTimeout(function() {
      if (wp && !ip) { stopStream(); overlay.classList.add('active'); addLog('sd-suspend'); }
      else if (!wp && ip) { addLog('sd-restore'); overlay.classList.remove('active'); body.innerHTML = ''; startStream(); }
    }, 400);
  }

  btns.forEach(function(b) { b.addEventListener('click', function() { setState(this.dataset.state); }); });

  document.getElementById('sdStartBtn').addEventListener('click', function() {
    document.getElementById('sdOverlay').classList.add('hidden');
    startStream();
  });
})();
