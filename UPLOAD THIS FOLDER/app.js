/* SportGuard Pro - standalone, no npm required */
(function () {
  const SPORTS = ['Football', 'Basketball', 'Running', 'Tennis', 'Golf', 'Cycling', 'Swimming', 'Yoga', 'Other'];
  const COACHES = [
    { id: 'c1', name: 'Marcus Chen', sport: 'Football', rating: 4.9, expert: 'Injury Prevention, Tactical Training', av: '⚽' },
    { id: 'c2', name: 'Sarah Williams', sport: 'Basketball', rating: 4.8, expert: 'Agility, Jump Mechanics', av: '🏀' },
    { id: 'c3', name: 'James Rivera', sport: 'Running', rating: 4.9, expert: 'Marathon Prep, Gait Analysis', av: '🏃' },
    { id: 'c4', name: 'Emma Thompson', sport: 'Tennis', rating: 4.7, expert: 'Serve Technique, Elbow Protection', av: '🎾' },
    { id: 'c5', name: 'David Park', sport: 'Golf', rating: 4.8, expert: 'Swing Form, Back Health', av: '⛳' },
    { id: 'c6', name: 'Lisa Anderson', sport: 'Cycling', rating: 4.9, expert: 'Low Impact, Knee Care', av: '🚴' },
    { id: 'c10', name: 'Chris Wu', sport: 'Other', rating: 4.8, expert: 'General Fitness, Cross Training', av: '🏋️' },
  ];
  const ITEMS = [
    { id: 'bottle', name: 'Water Bottle', pts: 50, img: 'public/items/bottle.svg', em: '🍶' },
    { id: 'towel', name: 'Sport Towel', pts: 50, img: 'public/items/towel.svg', em: '🏖️' },
    { id: 'socks', name: 'Sport Socks', pts: 30, img: 'public/items/socks.svg', em: '🧦' },
    { id: 'backpack', name: 'Backpack', pts: 100, img: 'public/items/backpack.svg', em: '🎒' },
    { id: 'shirt', name: 'Sport Shirt', pts: 120, img: 'public/items/shirt.svg', em: '👕' },
    { id: 'pants', name: 'Sport Pants', pts: 120, img: 'public/items/pants.svg', em: '👖' },
  ];
  const GEAR = [
    { id: 'knee', name: 'Knee Guard', icon: '🦵' },
    { id: 'elbow', name: 'Elbow Guard', icon: '💪' },
    { id: 'head', name: 'Head Guard', icon: '🪖' },
    { id: 'watch', name: 'Smart Watch', icon: '⌚' },
    { id: 'phone', name: 'Phone', icon: '📱' },
  ];
  const RECS = [
    { id: 'cycling', title: 'Switch to Cycling', desc: 'Low impact recovery', sec: 0 },
    { id: 'rest5', title: 'Take 5 Min Rest', desc: 'Brief recovery break', sec: 300 },
    { id: 'stretch10', title: '10 Min Stretching', desc: 'Flexibility routine', sec: 600 },
    { id: 'explore', title: 'Explore More', desc: 'Extra recovery tips', sec: 0 },
  ];

  const EM_FIRST = 30 * 60 * 1000;
  const EM_COOLDOWN = 60 * 60 * 1000;
  const EM_TIMEOUT = 15;

  let state = loadState();
  let simTimer = null;
  let gearTimers = [];
  let emTimer = null;
  let emCountdown = EM_TIMEOUT;
  let activeTimer = null;
  let coachSport = null;

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem('sg_state') || '{}');
      return {
        profile: s.profile || { age: 25, weight: 70, height: 175, level: 'intermediate', sports: ['Running'] },
        premium: !!s.premium,
        protection: false,
        protectionStart: null,
        steps: s.steps || 0,
        distanceKm: s.distanceKm || 0,
        heartRate: 72,
        activityMin: 0,
        gearConnected: {},
        history: s.history || [],
        redeemed: s.redeemed || [],
        coach: s.coach || null,
        chats: s.chats || [],
        emDismiss: s.emDismiss || null,
        showEmergency: false,
      };
    } catch {
      return { profile: { age: 25, weight: 70, height: 175, level: 'intermediate', sports: ['Running'] }, premium: false, protection: false, protectionStart: null, steps: 0, distanceKm: 0, heartRate: 72, activityMin: 0, gearConnected: {}, history: [], redeemed: [], coach: null, chats: [], emDismiss: null, showEmergency: false };
    }
  }

  function save() {
    localStorage.setItem('sg_state', JSON.stringify({
      profile: state.profile, premium: state.premium, steps: state.steps,
      distanceKm: state.distanceKm, history: state.history, redeemed: state.redeemed,
      coach: state.coach, chats: state.chats, emDismiss: state.emDismiss,
    }));
  }

  function points() { return Math.floor(state.distanceKm); }
  function injuryRisk() {
    if (state.heartRate > 165 || state.steps > 12000) return 'high';
    if (state.heartRate > 145 || state.steps > 8000) return 'medium';
    return 'low';
  }
  function riskClass(r) { return r === 'high' ? 'risk-high' : r === 'medium' ? 'risk-med' : 'risk-low'; }
  function bodyRisks() {
    const r = injuryRisk();
    const b = r === 'high' ? 72 : r === 'medium' ? 48 : 22;
    return [
      { part: 'Knee', r, p: b + 8 },
      { part: 'Elbow', r: r === 'high' ? 'medium' : 'low', p: b - 5 },
      { part: 'Head', r: 'low', p: 12 },
      { part: 'Ankle', r, p: b + 3 },
      { part: 'Shoulder', r: r === 'high' ? 'medium' : 'low', p: b - 2 },
    ];
  }

  function startProtection() {
    state.protection = true;
    state.protectionStart = Date.now();
    state.gearConnected = {};
    GEAR.forEach((g, i) => {
      gearTimers.push(setTimeout(() => { state.gearConnected[g.id] = true; render(); }, 800 + i * 600));
    });
    if (simTimer) clearInterval(simTimer);
    simTimer = setInterval(() => {
      state.steps += Math.floor(Math.random() * 8 + 4);
      state.distanceKm = Math.round((state.distanceKm + Math.random() * 0.008 + 0.003) * 1000) / 1000;
      state.heartRate = Math.min(185, Math.max(85, state.heartRate + (Math.random() > 0.5 ? 1 : -1)));
      state.activityMin += 1 / 60;
      checkEmergency();
      render();
    }, 2000);
    render();
  }

  function stopProtection() {
    if (state.steps > 0) {
      const r = injuryRisk();
      state.history.unshift({
        id: Date.now(), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        steps: state.steps, distanceKm: Math.round(state.distanceKm * 100) / 100,
        durationMin: Math.round(state.activityMin),
        injuryPct: r === 'high' ? 78 : r === 'medium' ? 52 : 18,
        posture: Math.floor(70 + Math.random() * 25),
      });
      state.history = state.history.slice(0, 50);
    }
    state.protection = false;
    state.protectionStart = null;
    state.activityMin = 0;
    state.gearConnected = {};
    if (simTimer) { clearInterval(simTimer); simTimer = null; }
    gearTimers.forEach(clearTimeout);
    gearTimers = [];
    save();
    render();
  }

  function checkEmergency() {
    if (!state.protection || state.showEmergency) return;
    const elapsed = Date.now() - state.protectionStart;
    if (elapsed < EM_FIRST) return;
    if (state.emDismiss && Date.now() - state.emDismiss < EM_COOLDOWN) return;
    const r = injuryRisk();
    if (r === 'medium' || r === 'high') showEmergency();
  }

  function showEmergency() {
    state.showEmergency = true;
    emCountdown = EM_TIMEOUT;
    if (emTimer) clearInterval(emTimer);
    emTimer = setInterval(() => {
      emCountdown--;
      const el = document.getElementById('em-count');
      if (el) el.textContent = emCountdown;
      if (emCountdown <= 0) {
        clearInterval(emTimer);
        dismissEmergency(true, true);
        alert('⚠️ No response.\n\nAuto-locating position...\nCalling emergency services (911)...\nContacts notified.');
      }
    }, 1000);
    render();
  }

  function dismissEmergency(safe, auto) {
    state.showEmergency = false;
    state.emDismiss = Date.now();
    if (emTimer) { clearInterval(emTimer); emTimer = null; }
    if (!safe && !auto) alert('🚨 Emergency sent!\nLocation shared. Contacts notified. Ambulance dispatched.');
    save();
    render();
  }

  function coachReply(msg) {
    const t = msg.trim();
    if (/^(hi|hello|hey|yo|sup|hola)\b/i.test(t))
      return `Hello! I'm Coach ${state.coach.name}, your ${state.coach.sport} specialist.\n\nHow can I help you today?`;
    const l = t.toLowerCase();
    if (/knee|patella/i.test(l)) return 'For knee discomfort:\n\n1. Reduce impact 30% this week\n2. Ice 15 min post-session\n3. VMO terminal extensions 3×12\n4. Try cycling for low impact\n\nSee a physio if pain persists 48h+.';
    if (/ankle|sprain/i.test(l)) return 'Ankle protocol:\n\n1. RICE immediately\n2. Single-leg balance 3×30s/side\n3. Calf raises 3×15 eccentric\n4. Return only when hop test is pain-free.';
    if (/injur|pain|hurt|sore/i.test(l)) return 'Injury prevention:\n\n• 8–10 min dynamic warm-up\n• Max 10% weekly load increase\n• 7–9h sleep, 1.6g protein/kg\n• Monitor joint stress via gear sensors\n\nPrioritize recovery today based on your risk level.';
    if (/run|jog|marathon/i.test(l)) return 'Running plan:\n\n1. Cadence 170–180 spm\n2. Easy runs 60–70% max HR\n3. Long run +10% distance/week max\n4. Hip bridges + SL deadlifts 2×/week';
    if (/rest|tired|fatigue|sleep/i.test(l)) return 'Recovery focus:\n\n• Active recovery: 20 min walk\n• 8h sleep tonight\n• Carbs + protein within 30 min post-workout\n• Foam roll quads, calves 60s each';
    if (/stretch|flex|mobility/i.test(l)) return '10 min stretch:\n\n1. Hip flexor lunge 45s/side\n2. Hamstring 45s/side\n3. Pigeon 60s/side\n4. Thoracic rotation ×10\n5. Calf wall 45s/side';
    return `Thank you for your question. As your ${state.coach.sport} coach, I recommend assessing load vs recovery, targeted mobility, and adjusting intensity for 48h. Share which movement triggers symptoms for a precise protocol.`;
  }

  function route() {
    const h = location.hash.slice(1) || '/';
    return h.split('?')[0];
  }

  function nav(path) { location.hash = path; }

  function metric(label, val, unit, extra) {
    return `<div class="glass metric">${extra || ''}<span class="metric-label">${label}</span><div><span class="metric-val">${val}</span>${unit ? `<span class="metric-unit"> ${unit}</span>` : ''}</div></div>`;
  }

  function renderHome() {
    const r = injuryRisk();
    return `
      <div class="header-row"><div><p class="sub" style="margin:0">Welcome back</p><h1 class="title">SportGuard Pro</h1></div>
        <span class="badge">${points()} pts</span></div>
      <p class="sub">Daily Tracking</p>
      <div class="grid2 mb12">
        ${metric('Heart Rate', state.heartRate, 'bpm')}
        ${metric('Activity Time', Math.round(state.activityMin), 'min')}
        ${metric('Injury Risk', r.toUpperCase(), '', `<span class="${riskClass(r)}" style="float:right;font-size:18px">⚠️</span>`)}
        ${metric('Points', points(), 'pts')}
      </div>
      <p class="sub">Auto-Detected Movement</p>
      <div class="grid2 mb16">
        ${metric('Steps', state.steps.toLocaleString(), '')}
        ${metric('Distance', state.distanceKm.toFixed(2), 'km')}
      </div>
      ${state.protection ? '<div class="status-on"><span class="dot"></span>Protection active — sensors monitoring</div>' : ''}
      <button class="btn ${state.protection ? 'btn-danger' : 'btn-primary'} mb16" id="btn-protect">
        ${state.protection ? '🛡️ Stop Protection' : '🛡️ Start My Protection'}
      </button>
      <p class="sub">Features</p>
      <div class="grid2">
        ${featLink('/assessment', '📊', 'Smart Assessment')}
        ${featLink('/gear', '📡', 'Connect Gear')}
        ${featLink('/premium', '👑', 'Premium')}
        ${featLink('/redeem', '🎁', 'Redeem Points')}
        ${featLink('/history', '📈', 'Progress History')}
        ${featLink('/live', '📍', 'Live Tracking')}
        ${featLink('/recommendations', '💡', 'Smart Tips')}
        ${featLink('/coach', '💬', 'Coach Chat')}
      </div>`;
  }

  function featLink(p, icon, label) {
    return `<a class="glass link-card" href="#${p}"><span style="font-size:20px">${icon}</span><span style="font-size:13px;font-weight:500">${label}</span></a>`;
  }

  function renderAssessment() {
    const p = state.profile;
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Smart Assessment</h2>
      <p class="sub">Complete your profile</p>
      <div class="glass input-row" style="padding:16px"><label>Age</label><input type="number" id="p-age" value="${p.age}" min="10" max="100"></div>
      <div class="glass input-row" style="padding:16px"><label>Weight (kg)</label><input type="number" id="p-weight" value="${p.weight}"></div>
      <div class="glass input-row" style="padding:16px"><label>Height (cm)</label><input type="number" id="p-height" value="${p.height}"></div>
      <div class="glass" style="padding:16px;margin-bottom:12px"><label class="metric-label">Fitness Level</label>
        <div class="level-btns">
          ${['beginner','intermediate','advanced'].map(l => `<button class="lvl ${p.level===l?'on':''}" data-lvl="${l}">${l.charAt(0).toUpperCase()+l.slice(1)}</button>`).join('')}
        </div></div>
      <div class="glass" style="padding:16px;margin-bottom:16px"><label class="metric-label">Favorite Sports</label>
        <div class="chips" id="sport-chips">${SPORTS.map(s => `<span class="chip ${p.sports.includes(s)?'on':''}" data-sport="${s}">${s}</span>`).join('')}</div>
      </div>
      <button class="btn btn-primary" id="save-profile">Save Profile</button>`;
  }

  function renderGear() {
    const connected = Object.keys(state.gearConnected).length;
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Connect Gear</h2>
      <div class="grid2 mb12">
        <div class="glass" style="padding:12px;font-size:13px">📶 Bluetooth On</div>
        <div class="glass" style="padding:12px;font-size:13px">📡 WiFi On</div>
      </div>
      ${!state.protection ? '<div class="alert-banner">Start protection on Home to auto-connect all devices.</div>' : ''}
      <p class="sub">${connected}/${GEAR.length} devices connected</p>
      ${GEAR.map(g => {
        const ok = state.gearConnected[g.id];
        return `<div class="glass gear-item ${ok?'ok':''}"><span style="font-size:28px">${g.icon}</span>
          <div style="flex:1"><div style="font-weight:600">${g.name}</div>
          <div style="font-size:12px;color:var(--muted)">${ok ? '✅ Connected successfully' : state.protection ? 'Connecting...' : 'Waiting for signal'}</div></div>
          <span style="font-size:22px">${ok?'✅': state.protection?'⏳':'○'}</span></div>`;
      }).join('')}`;
  }

  const PREMIUM_FEATURES = [
    {
      id: 'analysis', icon: '📊', title: 'Injury Analysis', cls: 'analysis',
      desc: 'AI-powered deep dive into your injury patterns and joint stress over time.',
      unlocks: ['Weekly injury prediction %', 'Posture score breakdown', 'Strava-style activity history', 'Risk trend charts per session'],
      previews: ['78% prediction', 'Posture 85%', 'History log'],
      link: '/history', linkLabel: 'Open Injury Analysis',
    },
    {
      id: 'alerts', icon: '🔔', title: 'Real-time Alerts', cls: 'alerts',
      desc: 'Instant notifications when gear sensors detect elevated injury risk during activity.',
      unlocks: ['30-min smart emergency popup', 'Safe / Emergency one-tap response', 'Auto location & ambulance dispatch', '1-hour alert cooldown after dismiss'],
      previews: ['Live risk alerts', 'Emergency SOS', 'Contact notify'],
      link: null,
    },
    {
      id: 'tracking', icon: '📡', title: 'Full Tracking', cls: 'tracking',
      desc: 'Live monitoring of knee, head & elbow guards with real-time injury risk percentages.',
      unlocks: ['Knee / Head / Elbow risk %', 'Circular gauge per body part', 'Body heat-map visualization', 'Sensor-synced live updates'],
      previews: ['Knee 72%', 'Head 12%', 'Elbow 45%'],
      link: '/live', linkLabel: 'Open Live Tracking',
    },
  ];

  function premiumFeatureCard(f) {
    const unlocked = state.premium;
    const list = f.unlocks.map(u => `<li>${u}</li>`).join('');
    const previews = f.previews.map(p => `<span>${p}</span>`).join('');
    return `
      <div class="premium-card ${unlocked ? 'unlocked' : 'locked-card'}">
        <div class="premium-card-head">
          <div class="premium-card-icon ${f.cls}">${unlocked ? f.icon : '🔒'}</div>
          <div style="flex:1">
            <div class="premium-card-title">${f.title}</div>
            <div class="premium-card-desc">${f.desc}</div>
            <div class="premium-preview">${previews}</div>
          </div>
        </div>
        <div class="premium-unlock-list"><ul style="margin:0;padding:0">${list}</ul></div>
        ${unlocked
          ? (f.link ? `<a href="#${f.link}" class="btn btn-secondary" style="display:block;text-align:center;text-decoration:none;margin-top:12px;padding:10px;font-size:13px">${f.linkLabel}</a>` : '<div style="margin-top:12px;font-size:12px;color:var(--safe);font-weight:600">✓ Active & monitoring</div>')
          : `<div class="premium-lock-strip"><span>🔒 Premium unlocks this</span><span>Subscribe →</span></div>`}
      </div>`;
  }

  function renderPremium() {
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Premium</h2>
      <div class="premium-hero">
        <h3>Full Protection</h3>
        <p style="font-size:13px;color:#cbd5e1;line-height:1.5;max-width:85%">Upgrade to unlock professional injury analysis, instant alerts, and live body-part tracking.</p>
        <span class="premium-tag ${state.premium ? 'active' : 'locked'}">${state.premium ? '✓ Premium Active' : '🔒 Free Plan — Upgrade to unlock'}</span>
      </div>
      <p class="premium-unlock-title">What Premium unlocks</p>
      ${PREMIUM_FEATURES.map(premiumFeatureCard).join('')}
      ${!state.premium ? `
        <button class="btn btn-primary mb12" id="btn-subscribe" style="background:linear-gradient(135deg,#f59e0b,#d97706);box-shadow:0 8px 28px rgba(245,158,11,.35)">👑 Start Free Trial</button>
        <p style="text-align:center;font-size:12px;color:var(--muted)">Cancel anytime · No commitment</p>
      ` : `<div class="glass" style="padding:16px;text-align:center;margin-top:8px;border-color:rgba(20,184,166,.3)">
          <div style="font-size:28px;margin-bottom:6px">✨</div>
          <div style="font-weight:700;color:var(--safe)">All premium features unlocked</div>
          <p style="font-size:12px;color:var(--muted);margin-top:4px">Injury analysis · Alerts · Live tracking</p>
        </div>`}`;
  }

  function renderRedeem() {
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Redeem Points</h2>
      <div class="glass mb16" style="padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div class="metric-label">Available Points</div><div class="metric-val">${points()}</div></div>
          <div style="text-align:right;font-size:12px;color:var(--muted)">
            ${state.steps.toLocaleString()} steps<br>${state.distanceKm.toFixed(2)} km<br><span style="color:var(--brand)">1 km = 1 pt (auto)</span>
          </div></div></div>
      <div class="grid2">${ITEMS.map(it => {
        const owned = state.redeemed.includes(it.id);
        const can = points() >= it.pts;
        return `<div class="glass redeem-card">
          <img src="${it.img}" alt="${it.name}" onerror="this.outerHTML='<span class=emoji>${it.em}</span>'">
          <div style="font-weight:600;font-size:13px">${it.name}</div>
          <div style="color:var(--brand);font-size:12px;margin:4px 0">${it.pts} pts</div>
          ${owned ? '<span style="color:var(--safe);font-size:12px">✅ Redeemed</span>' :
            `<button class="btn btn-primary" style="padding:8px;font-size:12px" data-redeem="${it.id}" data-cost="${it.pts}" ${can?'':'disabled style="opacity:.5"'}>${can?'Redeem':'🔒 Not enough'}</button>`}
        </div>`;
      }).join('')}</div>`;
  }

  function renderHistory() {
    if (!state.premium) return lockPage('Progress History', 'Subscribe to unlock injury analysis and posture tracking.', '/premium');
    const r = injuryRisk();
    const pct = r === 'high' ? 78 : r === 'medium' ? 52 : 18;
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Progress History</h2>
      <div class="grid2 mb16">
        ${metric('Steps', state.steps.toLocaleString(), '')}
        ${metric('Distance', state.distanceKm.toFixed(1), 'km')}
        ${metric('Injury Risk', pct + '%', '')}
      </div>
      <p class="sub">Activity Records</p>
      ${state.history.length === 0 ? '<div class="glass" style="padding:24px;text-align:center;color:var(--muted)">No activities yet. Start protection to auto-record.</div>' :
        state.history.map(h => `
          <div class="glass mb12" style="padding:14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
              <div><div style="font-weight:600">${h.date}</div><div style="font-size:12px;color:var(--muted)">${h.durationMin} min · ${h.steps.toLocaleString()} steps</div></div>
              <span style="color:var(--brand);font-weight:700">${h.distanceKm} km</span></div>
            <div class="grid2" style="gap:8px">
              <div style="background:#0f172a;padding:10px;border-radius:10px">
                <div class="metric-label">Injury Prediction</div>
                <div style="font-size:20px;font-weight:700;color:${h.injuryPct>60?'var(--danger)':h.injuryPct>35?'var(--warn)':'var(--safe)'}">${h.injuryPct}%</div>
                <div class="bar"><div class="bar-fill" style="width:${h.injuryPct}%;background:var(--danger)"></div></div>
              </div>
              <div style="background:#0f172a;padding:10px;border-radius:10px">
                <div class="metric-label">Posture Analysis</div>
                <div style="font-size:20px;font-weight:700">${h.posture}%</div>
                <div class="bar"><div class="bar-fill" style="width:${h.posture}%;background:var(--brand)"></div></div>
              </div>
            </div>
          </div>`).join('')}`;
  }

  function gaugeRing(pct, color) {
    const c = 2 * Math.PI * 24;
    const off = c - (pct / 100) * c;
    return `<svg viewBox="0 0 56 56"><circle cx="28" cy="28" r="24" fill="none" stroke="#1e293b" stroke-width="5"/>
      <circle cx="28" cy="28" r="24" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
  }

  function riskColor(r) {
    return r === 'high' ? '#ef4444' : r === 'medium' ? '#fbbf24' : '#14b8a6';
  }

  function bodyPartGauge(part, icon, pct, risk) {
    const col = riskColor(risk);
    const cls = risk === 'high' ? 'high' : risk === 'medium' ? 'medium' : 'low';
    return `
      <div class="risk-gauge-card ${cls}">
        <div class="risk-gauge-ring">
          ${gaugeRing(pct, col)}
          <div class="risk-gauge-pct ${riskClass(risk)}">${pct}%</div>
        </div>
        <div class="risk-part-info">
          <div class="name">${icon} ${part}</div>
          <div class="status ${riskClass(risk)}">${risk} injury risk</div>
          <div class="risk-gauge-bar-wrap">
            <div class="risk-gauge-bar"><div style="width:${pct}%;background:${col}"></div></div>
          </div>
        </div>
        <div class="risk-big-pct ${riskClass(risk)}">${pct}<span>%</span></div>
      </div>`;
  }

  function renderLive() {
    if (!state.premium) return lockPage('Live Tracking', 'Subscribe to unlock live body-part risk tracking.', '/premium');
    const all = bodyRisks();
    const knee = all.find(b => b.part === 'Knee') || { p: 22, r: 'low' };
    const head = all.find(b => b.part === 'Head') || { p: 12, r: 'low' };
    const elbow = all.find(b => b.part === 'Elbow') || { p: 18, r: 'low' };
    const liveOn = state.protection;
    const overall = Math.round((knee.p + head.p + elbow.p) / 3);

    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Live Tracking</h2>
      ${!liveOn ? '<div class="alert-banner">Start protection on Home to enable live sensors.</div>' : ''}

      <div class="live-hero">
        <div class="live-hero-top">
          <div>
            <div class="metric-label">Body Part Injury Risk</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">Real-time · Knee · Head · Elbow</div>
          </div>
          <span class="live-badge ${liveOn ? 'on' : ''}">${liveOn ? '● LIVE' : 'OFFLINE'}</span>
        </div>
        <div class="body-monitor">
          <div class="body-silhouette">
            <svg viewBox="0 0 120 200" width="100" height="168">
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style="stop-color:#334155"/>
                  <stop offset="100%" style="stop-color:#1e293b"/>
                </linearGradient>
              </defs>
              <ellipse cx="60" cy="22" rx="18" ry="20" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <rect x="42" y="42" width="36" height="48" rx="10" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <rect x="18" y="48" width="22" height="10" rx="5" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <rect x="80" y="48" width="22" height="10" rx="5" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <rect x="46" y="92" width="14" height="52" rx="7" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <rect x="60" y="92" width="14" height="52" rx="7" fill="url(#bodyGrad)" stroke="#475569" stroke-width="1.5"/>
              <circle cx="60" cy="22" r="22" fill="none" stroke="${riskColor(head.r)}" stroke-width="2" opacity=".5" stroke-dasharray="4 3"/>
              <circle cx="88" cy="53" r="14" fill="none" stroke="${riskColor(elbow.r)}" stroke-width="2" opacity=".6"/>
              <ellipse cx="53" cy="130" rx="16" ry="12" fill="none" stroke="${riskColor(knee.r)}" stroke-width="2" opacity=".6"/>
            </svg>
            <span class="body-hotspot head" style="color:${riskColor(head.r)};background:${riskColor(head.r)}"></span>
            <span class="body-hotspot elbow" style="color:${riskColor(elbow.r)};background:${riskColor(elbow.r)}"></span>
            <span class="body-hotspot knee" style="color:${riskColor(knee.r)};background:${riskColor(knee.r)}"></span>
          </div>
          <div style="text-align:center">
            <div class="metric-label">Overall Risk</div>
            <div style="font-size:36px;font-weight:800;color:${riskColor(overall > 55 ? 'high' : overall > 30 ? 'medium' : 'low')}">${overall}%</div>
            <div style="font-size:11px;color:var(--muted)">Combined sensor reading</div>
          </div>
        </div>
      </div>

      <p class="premium-unlock-title" style="margin-top:4px">Live injury risk by body part</p>
      <div class="body-parts-grid">
        ${bodyPartGauge('Knee', '🦵', knee.p, knee.r)}
        ${bodyPartGauge('Head', '🪖', head.p, head.r)}
        ${bodyPartGauge('Elbow', '💪', elbow.p, elbow.r)}
      </div>`;
  }

  function renderRecommendations() {
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Smart Recommendations</h2>
      <p class="sub">Recovery & training tips</p>
      ${RECS.map(r => `
        <button class="glass link-card mb12" style="width:100%;border:none;text-align:left" data-rec="${r.id}" data-sec="${r.sec}" data-title="${r.title}">
          <span style="font-size:24px">${r.id==='cycling'?'🚴':r.id==='rest5'?'⏸️':r.id==='stretch10'?'🧘':'✨'}</span>
          <div><div style="font-weight:600">${r.title}</div><div style="font-size:12px;color:var(--muted)">${r.desc}</div>
          ${r.sec ? `<div style="font-size:11px;color:var(--brand);margin-top:4px">⏱ ${r.sec/60} min timer</div>` : ''}</div>
          <span>›</span>
        </button>`).join('')}`;
  }

  function renderCoach() {
    if (state.coach) {
      return `
        <a class="back" id="coach-back">← Change Coach</a>
        <h2 class="page-title">Coach ${state.coach.name}</h2>
        <p class="sub">${state.coach.sport} · ⭐ ${state.coach.rating}</p>
        <div class="chat-msgs" id="chat-msgs">${state.chats.map(m => `
          <div class="bubble ${m.role}">${esc(m.text)}<div style="font-size:10px;opacity:.6;margin-top:4px">${m.time}</div></div>`).join('')}</div>
        <div class="chat-input-bar"><div class="inner">
          <input id="chat-in" placeholder="Ask your coach..." />
          <button id="chat-send">Send</button>
        </div></div>`;
    }
    return `
      <a class="back" href="#/">← Back</a>
      <h2 class="page-title">Coach Chat</h2>
      <p class="sub">Which sport do you need help with?</p>
      <div class="grid2">${SPORTS.map(s => {
        const icons = { Football:'⚽', Basketball:'🏀', Running:'🏃', Tennis:'🎾', Golf:'⛳', Cycling:'🚴', Swimming:'🏊', Yoga:'🧘', Other:'🏋️' };
        return `<button class="glass link-card coach-sport" data-sport="${s}" style="flex-direction:column;border:none;width:100%">
          <span style="font-size:28px">${icons[s]||'🏋️'}</span><span>${s}</span></button>`;
      }).join('')}</div>
      <div id="coach-modal" class="hidden"></div>`;
  }

  function renderMap() {
    return `
      <h2 class="page-title">Activity Map</h2>
      <p class="sub">Auto-tracked route</p>
      <div class="glass map-box">
        <svg width="100%" height="100%" viewBox="0 0 300 220">
          ${[...Array(8)].map((_,i)=>`<line x1="0" y1="${i*28}" x2="300" y2="${i*28}" stroke="#334155" stroke-width=".5"/>`).join('')}
          ${state.protection ? '<path class="map-route" d="M30 180 Q80 160 120 120 T220 50" /><circle cx="30" cy="180" r="6" fill="#14b8a6"/><circle cx="220" cy="50" r="8" fill="#22d3ee"/>' : ''}
        </svg>
        <div style="position:absolute;bottom:10px;left:10px;font-size:12px;background:rgba(15,23,42,.8);padding:6px 10px;border-radius:8px">
          ${state.protection ? '📍 Tracking active' : 'Start protection to track'}
        </div>
      </div>
      <div class="grid2">
        ${metric('Distance', state.distanceKm.toFixed(2), 'km')}
        ${metric('Steps', state.steps.toLocaleString(), '')}
      </div>`;
  }

  function renderRecord() {
    return `
      <h2 class="page-title">Activity Record</h2>
      <p class="sub">Auto-synced with home</p>
      ${state.protection ? '<div class="status-on"><span class="dot"></span>Recording session...</div>' : ''}
      <div class="grid2 mb16">
        ${metric('Steps', state.steps.toLocaleString(), '')}
        ${metric('Distance', state.distanceKm.toFixed(2), 'km')}
        ${metric('Duration', Math.round(state.activityMin), 'min')}
        ${metric('Points', points(), 'pts')}
      </div>
      <p class="sub">Recent Sessions</p>
      ${state.history.length === 0 ? '<div class="glass" style="padding:20px;text-align:center;color:var(--muted)">No sessions yet.</div>' :
        state.history.slice(0,10).map(h => `
          <div class="glass mb12" style="padding:12px;display:flex;justify-content:space-between">
            <div><div style="font-weight:600;font-size:13px">${h.date}</div><div style="font-size:11px;color:var(--muted)">${h.steps.toLocaleString()} steps · ${h.durationMin} min</div></div>
            <div style="text-align:right"><div style="color:var(--brand);font-weight:700">${h.distanceKm} km</div><div style="font-size:11px;color:var(--warn)">+${Math.floor(h.distanceKm)} pts</div></div>
          </div>`).join('')}`;
  }

  function renderSettings() {
    return `
      <h2 class="page-title">Settings</h2>
      <a href="#/assessment" class="glass link-card mb12">👤 Edit Profile</a>
      <a href="#/gear" class="glass link-card mb12">📡 Gear Settings</a>
      <a href="#/premium" class="glass link-card mb12">👑 Premium Subscription</a>
      <div class="glass" style="padding:14px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:500">Emergency Alerts</div><div style="font-size:11px;color:var(--muted)">First alert after 30 min · 1hr cooldown</div></div>
        <div style="width:44px;height:24px;background:var(--safe);border-radius:12px;position:relative"><div style="position:absolute;right:2px;top:2px;width:20px;height:20px;background:#fff;border-radius:50%"></div></div>
      </div>
      <p style="text-align:center;font-size:11px;color:var(--muted);margin-top:24px">SportGuard Pro v1.0 · ${state.premium?'Premium':'Free'}</p>`;
  }

  function renderProfile() {
    const p = state.profile;
    return `
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--brand),var(--brand2));margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:32px">👤</div>
        <h2 class="page-title">My Profile</h2>
        <span class="badge">${state.premium ? '⭐ Premium' : 'Free Plan'}</span>
      </div>
      <div class="grid2 mb16">
        ${metric('Points', points(), '')}
        ${metric('Steps', (state.steps/1000).toFixed(1)+'k', '')}
        ${metric('Distance', state.distanceKm.toFixed(1), 'km')}
      </div>
      <div class="glass mb16" style="padding:16px">
        ${[['Age',p.age+' years'],['Weight',p.weight+' kg'],['Height',p.height+' cm'],['Fitness',p.level],['Sports',p.sports.join(', ')||'None']].map(([k,v])=>`
          <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
            <span style="color:var(--muted);font-size:13px">${k}</span><span style="font-size:13px;font-weight:500">${v}</span></div>`).join('')}
      </div>
      <a href="#/assessment" class="btn btn-secondary" style="display:block;text-align:center;text-decoration:none">✏️ Edit Profile</a>`;
  }

  function lockPage(title, msg, link) {
    return `
      <a class="back" href="#/">← Back</a>
      <div class="lock-msg">
        <div class="icon">🔒</div>
        <h2 class="page-title">${title}</h2>
        <p class="sub">${msg}</p>
        <a href="#${link}" class="btn btn-primary" style="display:inline-block;width:auto;padding:12px 32px;margin-top:16px;text-decoration:none">Subscribe to Unlock</a>
      </div>`;
  }

  function renderEmergency() {
    if (!state.showEmergency) return '';
    const r = injuryRisk();
    return `
      <div class="modal-bg" id="em-modal">
        <div class="glass modal emergency">
          <h3 style="margin-bottom:8px">⚠️ Injury Risk Detected</h3>
          <p class="sub">Risk: <span class="${riskClass(r)}">${r.toUpperCase()}</span></p>
          <p style="font-size:13px;margin-bottom:12px">Gear sensors detected elevated risk. Are you safe?</p>
          <p style="font-size:12px;color:var(--muted);margin-bottom:16px">Auto dispatch in <strong id="em-count" style="color:var(--danger)">${emCountdown}</strong>s</p>
          <div class="flex-btns">
            <button class="btn btn-safe" id="em-safe">🛡️ I'm Safe</button>
            <button class="btn btn-emergency" id="em-alert">🚨 Emergency</button>
          </div>
        </div>
      </div>`;
  }

  function renderTimer(title, sec) {
    return `
      <div class="modal-bg" id="timer-modal">
        <div class="glass modal emergency" style="text-align:center">
          <h3>${title}</h3>
          <div class="timer-ring">
            <svg width="200" height="200" viewBox="0 0 200 200" style="transform:rotate(-90deg)">
              <circle cx="100" cy="100" r="90" fill="none" stroke="#1e293b" stroke-width="8"/>
              <circle id="timer-arc" cx="100" cy="100" r="90" fill="none" stroke="#06b6d4" stroke-width="8" stroke-linecap="round"
                stroke-dasharray="565" stroke-dashoffset="0"/>
            </svg>
            <div class="timer-text"><span id="timer-display">00:00</span><span style="font-size:12px;color:var(--muted)">remaining</span></div>
          </div>
          <button class="btn btn-secondary" id="timer-close">Close</button>
        </div>
      </div>`;
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function render() {
    const r = route();
    const pages = {
      '/': renderHome, '/assessment': renderAssessment, '/gear': renderGear,
      '/premium': renderPremium, '/redeem': renderRedeem, '/history': renderHistory,
      '/live': renderLive, '/recommendations': renderRecommendations, '/coach': renderCoach,
      '/map': renderMap, '/record': renderRecord, '/settings': renderSettings, '/profile': renderProfile,
    };
    const fn = pages[r] || renderHome;
    document.getElementById('app').innerHTML = fn() + renderEmergency();
    document.querySelectorAll('[data-nav]').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-nav') === r || (r === '/' && a.getAttribute('data-nav') === '/'));
    });
    bindEvents();
    const cm = document.getElementById('chat-msgs');
    if (cm) cm.scrollTop = cm.scrollHeight;
  }

  function bindEvents() {
    const bp = document.getElementById('btn-protect');
    if (bp) bp.onclick = () => state.protection ? stopProtection() : startProtection();

    const sub = document.getElementById('btn-subscribe');
    if (sub) sub.onclick = () => { state.premium = true; save(); render(); };

    document.getElementById('save-profile')?.addEventListener('click', () => {
      state.profile.age = +document.getElementById('p-age').value;
      state.profile.weight = +document.getElementById('p-weight').value;
      state.profile.height = +document.getElementById('p-height').value;
      save(); alert('✅ Profile saved!'); render();
    });
    document.querySelectorAll('.lvl').forEach(b => b.onclick = () => {
      state.profile.level = b.dataset.lvl;
      document.querySelectorAll('.lvl').forEach(x => x.classList.toggle('on', x.dataset.lvl === b.dataset.lvl));
    });
    document.querySelectorAll('#sport-chips .chip').forEach(c => c.onclick = () => {
      const s = c.dataset.sport;
      const i = state.profile.sports.indexOf(s);
      if (i >= 0) state.profile.sports.splice(i, 1); else state.profile.sports.push(s);
      c.classList.toggle('on');
    });

    document.querySelectorAll('[data-redeem]').forEach(b => b.onclick = () => {
      const id = b.dataset.redeem, cost = +b.dataset.cost;
      if (points() >= cost && !state.redeemed.includes(id)) {
        state.redeemed.push(id); save(); render(); alert('🎁 Redeemed successfully!');
      }
    });

    document.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
      const id = b.dataset.rec, sec = +b.dataset.sec, title = b.dataset.title;
      if (id === 'explore') {
        alert('💡 More tips:\n• Hydrate 250ml every 20 min\n• Ice joints 15 min post-workout\n• Foam roll tight muscles\n• Rest day after 3 hard days\n• Check gear battery weekly');
        return;
      }
      if (id === 'cycling') { alert('💡 Switch to cycling for low-impact recovery when knee/ankle stress is high.'); return; }
      if (sec > 0) startTimer(title, sec);
    });

    document.getElementById('em-safe')?.addEventListener('click', () => dismissEmergency(true));
    document.getElementById('em-alert')?.addEventListener('click', () => dismissEmergency(false));

    document.querySelectorAll('.coach-sport').forEach(b => b.onclick = () => showCoachModal(b.dataset.sport));

    document.getElementById('coach-back')?.addEventListener('click', () => {
      state.coach = null; state.chats = []; save(); nav('/coach'); render();
    });
    document.getElementById('chat-send')?.addEventListener('click', sendChat);
    document.getElementById('chat-in')?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  }

  function showCoachModal(sport) {
    coachSport = sport;
    const list = COACHES.filter(c => c.sport === sport || (sport === 'Other' && c.sport === 'Other'));
    const coaches = list.length ? list : COACHES;
    const modal = document.createElement('div');
    modal.className = 'modal-bg';
    modal.id = 'coach-modal';
    modal.innerHTML = `<div class="glass modal" style="border-radius:20px 20px 0 0">
      <div style="display:flex;justify-content:space-between;margin-bottom:12px">
        <div><h3>${sport} Coaches</h3><p class="sub" style="margin:0">Select a coach</p></div>
        <button id="close-coach-modal" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">✕</button>
      </div>
      ${coaches.map(c => `<button class="glass coach-row" data-cid="${c.id}">
        <span style="font-size:32px">${c.av}</span>
        <div><div style="font-weight:600">${c.name} <span style="color:var(--warn)">⭐${c.rating}</span></div>
        <div style="font-size:12px;color:var(--brand)">${c.sport} Coach</div>
        <div style="font-size:11px;color:var(--muted)">Expert: ${c.expert}</div></div>
      </button>`).join('')}
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('#close-coach-modal').onclick = () => modal.remove();
    modal.querySelectorAll('[data-cid]').forEach(btn => {
      btn.onclick = () => {
        const c = coaches.find(x => x.id === btn.dataset.cid);
        state.coach = c;
        state.chats = [{ role: 'coach', text: `Hello! I'm Coach ${c.name}, your ${c.sport} specialist.\n\nHow can I help you today?`, time: now() }];
        save(); modal.remove(); render();
      };
    });
  }

  function sendChat() {
    const inp = document.getElementById('chat-in');
    const t = inp.value.trim();
    if (!t || !state.coach) return;
    state.chats.push({ role: 'user', text: t, time: now() });
    inp.value = '';
    render();
    setTimeout(() => {
      state.chats.push({ role: 'coach', text: coachReply(t), time: now() });
      save(); render();
    }, 600 + Math.random() * 500);
  }

  function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

  function startTimer(title, totalSec) {
    if (activeTimer) clearInterval(activeTimer);
    let left = totalSec;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderTimer(title, totalSec);
    document.body.appendChild(wrap.firstElementChild);
    const display = document.getElementById('timer-display');
    const arc = document.getElementById('timer-arc');
    const circumference = 565;
    function tick() {
      const m = Math.floor(left / 60), s = left % 60;
      display.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
      arc.style.strokeDashoffset = circumference * (1 - (totalSec - left) / totalSec);
      if (left <= 0) { clearInterval(activeTimer); document.getElementById('timer-modal')?.remove(); alert('✅ Timer complete!'); return; }
      left--;
    }
    tick();
    activeTimer = setInterval(tick, 1000);
    document.getElementById('timer-close').onclick = () => {
      clearInterval(activeTimer);
      document.getElementById('timer-modal')?.remove();
    };
  }

  window.addEventListener('hashchange', render);
  render();
})();
