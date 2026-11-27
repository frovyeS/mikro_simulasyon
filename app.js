(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const COLORS = ['#69a7ff', '#f6c453', '#ee86bd', '#8be0b0', '#a995ff', '#ff9278'];
  const PRESETS = {
    'Orbit': [
      { id: 1, x: 0, y: 0, vx: 0, vy: 0, m: 1800, r: 18, color: '#f6c453' },
      { id: 2, x: 145, y: 0, vx: 0, vy: 3.5, m: 12, r: 8, color: '#69a7ff' }
    ],
    'Three body': [
      { id: 1, x: -90, y: 0, vx: 0, vy: -1.6, m: 500, r: 12, color: '#f6c453' },
      { id: 2, x: 90, y: 0, vx: 0, vy: 1.6, m: 500, r: 12, color: '#69a7ff' },
      { id: 3, x: 0, y: 120, vx: 2.3, vy: 0, m: 8, r: 7, color: '#ee86bd' }
    ],
    'Free fall': [
      { id: 1, x: 0, y: 0, vx: 1, vy: 0, m: 1, r: 10, color: '#69a7ff' }
    ]
  };

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const safeNumber = (value, fallback, min, max) => {
    const number = Number(value);
    return Number.isFinite(number) ? clamp(number, min, max) : fallback;
  };
  const readSaved = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem('mikro-saves') || '[]');
      return Array.isArray(parsed) ? parsed.slice(-20) : [];
    } catch (_) {
      return [];
    }
  };

  let bodies = clone(PRESETS.Orbit);
  let running = false;
  let gravity = 0.8;
  let timeStep = 0.016;
  let speed = 1;
  let simulationTime = 0;
  let trailsEnabled = true;
  let gridEnabled = true;
  let theme = 'dark';
  let saved = readSaved();
  let animationFrame = 0;
  let lastFrameTime = 0;
  let trailMap = Object.create(null);
  let zoom = 1;
  let pan = { x: 0, y: 0 };
  let dragging = false;
  let lastPointer = { x: 0, y: 0 };
  let canvasWidth = 0;
  let canvasHeight = 0;

  const canvas = $('simulationCanvas');
  const ctx = canvas.getContext('2d');

  function calculateStep(currentBodies, dt, g) {
    const next = currentBodies.map((body) => ({ ...body }));
    for (let i = 0; i < next.length; i += 1) {
      let ax = 0;
      let ay = 0;
      for (let j = 0; j < next.length; j += 1) {
        if (i === j) continue;
        const dx = next[j].x - next[i].x;
        const dy = next[j].y - next[i].y;
        const d2 = dx * dx + dy * dy + 16;
        const d = Math.sqrt(d2);
        const force = g * next[j].m / (d2 * d);
        ax += dx * force;
        ay += dy * force;
      }
      next[i].vx += ax * dt;
      next[i].vy += ay * dt;
    }
    next.forEach((body) => {
      body.x += body.vx * dt;
      body.y += body.vy * dt;
    });
    return next;
  }

  function setBodies(nextBodies) {
    bodies = nextBodies;
    renderBodyList();
    renderAnalysis();
  }

  function clearTrails() {
    trailMap = Object.create(null);
  }

  function setRunning(value) {
    running = value;
    $('playText').textContent = running ? 'Duraklat' : 'Başlat';
    $('playIcon').textContent = running ? 'Ⅱ' : '▶';
    $('statusPill').classList.toggle('running', running);
    $('statusPill').innerHTML = `<i></i>${running ? 'Çalışıyor' : 'Duraklatıldı'}`;
    if (running && !animationFrame) {
      lastFrameTime = 0;
      animationFrame = requestAnimationFrame(tick);
    }
  }

  function tick(timestamp) {
    if (!running) {
      animationFrame = 0;
      return;
    }
    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsed = Math.min(timestamp - lastFrameTime, 80);
    const steps = Math.min(5, Math.max(1, Math.floor(elapsed / 16) + 1));
    lastFrameTime = timestamp;
    for (let i = 0; i < steps; i += 1) {
      bodies = calculateStep(bodies, timeStep * speed, gravity);
      simulationTime += timeStep * speed;
    }
    renderBodyList();
    renderAnalysis();
    animationFrame = requestAnimationFrame(tick);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawScene() {
    resizeCanvas();
    const w = canvasWidth;
    const h = canvasHeight;
    const isDark = theme === 'dark';
    ctx.fillStyle = isDark ? '#0a111a' : '#f5f7fb';
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(w / 2 + pan.x, h / 2 + pan.y);
    ctx.scale(zoom, zoom);

    if (gridEnabled) {
      ctx.strokeStyle = isDark ? '#1b2836' : '#e2e7ef';
      ctx.lineWidth = 1 / zoom;
      const spanX = Math.ceil(w / (40 * zoom)) * 40 + 80;
      const spanY = Math.ceil(h / (40 * zoom)) * 40 + 80;
      for (let x = -spanX; x <= spanX; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, -spanY); ctx.lineTo(x, spanY); ctx.stroke();
      }
      for (let y = -spanY; y <= spanY; y += 40) {
        ctx.beginPath(); ctx.moveTo(-spanX, y); ctx.lineTo(spanX, y); ctx.stroke();
      }
      ctx.strokeStyle = isDark ? '#33465b' : '#c7d1de';
      ctx.lineWidth = 1.2 / zoom;
      ctx.beginPath(); ctx.moveTo(-spanX, 0); ctx.lineTo(spanX, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -spanY); ctx.lineTo(0, spanY); ctx.stroke();
    }

    bodies.forEach((body) => {
      if (!trailsEnabled) return;
      const points = trailMap[body.id] || (trailMap[body.id] = []);
      const previous = points[points.length - 1];
      if (!previous || Math.hypot(previous[0] - body.x, previous[1] - body.y) > 1.5) {
        points.push([body.x, body.y]);
      }
      if (points.length > 520) points.splice(0, points.length - 520);
      if (points.length > 1) {
        ctx.beginPath();
        points.forEach((point, index) => index ? ctx.lineTo(point[0], point[1]) : ctx.moveTo(point[0], point[1]));
        ctx.strokeStyle = `${body.color}88`;
        ctx.lineWidth = 1.5 / zoom;
        ctx.stroke();
      }
    });

    bodies.forEach((body) => {
      ctx.beginPath();
      ctx.fillStyle = body.color;
      ctx.shadowColor = body.color;
      ctx.shadowBlur = 15 / zoom;
      ctx.arc(body.x, body.y, body.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(body.x - body.r * 0.28, body.y - body.r * 0.28, Math.max(1.5, body.r * 0.16), 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff88';
      ctx.fill();
      ctx.fillStyle = isDark ? '#dce7f5' : '#26384f';
      ctx.font = `${Math.max(8, 10 / zoom)}px system-ui, sans-serif`;
      ctx.fillText(`m=${body.m}`, body.x + body.r + 6, body.y - 5);
    });

    ctx.restore();
  }

  function renderBodyList() {
    $('bodyList').innerHTML = bodies.map((body, index) => `
      <div class="body-item">
        <span class="body-dot" style="background:${body.color};color:${body.color}"></span>
        <div class="body-meta">Cisim ${index + 1}<small>m = ${formatNumber(body.m, 2)}</small></div>
        <button class="delete-button" type="button" data-remove="${String(body.id)}" aria-label="Cisim ${index + 1} sil" title="Cismi sil">×</button>
      </div>`).join('') || '<p class="empty-state">Sahnede henüz cisim yok.</p>';
  }

  function formatNumber(value, digits = 2) {
    return Number(value).toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  }

  function renderBars(targetId, values, formatter) {
    const max = Math.max(0.0001, ...values.map((entry) => entry.value));
    $(targetId).innerHTML = values.map((entry, index) => `
      <div class="bar-row"><span>Cisim ${index + 1}</span><div class="bar-track"><i style="width:${clamp(entry.value / max * 100, 3, 100)}%;background:${entry.color}"></i></div><b>${formatter(entry.value)}</b></div>`).join('') || '<p class="empty-state">Gösterilecek veri yok.</p>';
  }

  function renderAnalysis() {
    const kineticEnergy = bodies.reduce((sum, body) => sum + 0.5 * body.m * (body.vx * body.vx + body.vy * body.vy), 0);
    const momentumMagnitudeSum = bodies.reduce((sum, body) => sum + body.m * Math.hypot(body.vx, body.vy), 0);
    $('timeValue').textContent = formatNumber(simulationTime, 2);
    $('metricTime').textContent = formatNumber(simulationTime, 2);
    $('metricBodies').textContent = String(bodies.length);
    $('metricEnergy').textContent = formatNumber(kineticEnergy, 2);
    $('metricMomentum').textContent = formatNumber(momentumMagnitudeSum, 2);
    $('timelineFill').style.width = `${(simulationTime % 60) / 60 * 100}%`;
    renderBars('velocityBars', bodies.map((body) => ({ value: Math.hypot(body.vx, body.vy), color: body.color })), (v) => formatNumber(v, 2));
    renderBars('positionBars', bodies.map((body) => ({ value: Math.hypot(body.x, body.y), color: body.color })), (v) => formatNumber(v, 0));
  }

  function renderSaved() {
    $('savedCount').textContent = String(saved.length);
    if (!saved.length) {
      $('savedList').innerHTML = '<p class="empty-state">Henüz kaydedilmiş deney yok.</p>';
      return;
    }
    $('savedList').innerHTML = saved.slice().reverse().map((item, reverseIndex) => {
      const index = saved.length - 1 - reverseIndex;
      return `<button class="saved-item" type="button" data-load-save="${index}"><strong>${escapeHtml(item.name || `Deney ${index + 1}`)}</strong><small>${escapeHtml(item.date || '')} · ${Array.isArray(item.bodies) ? item.bodies.length : 0} cisim</small></button>`;
    }).join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function applyPreset(name) {
    if (!PRESETS[name]) return;
    $('presetSelect').value = name;
    setRunning(false);
    setBodies(clone(PRESETS[name]));
    simulationTime = 0;
    clearTrails();
    renderAnalysis();
  }

  function resetExperiment() {
    setRunning(false);
    const name = $('presetSelect').value;
    setBodies(clone(PRESETS[name] || PRESETS.Orbit));
    simulationTime = 0;
    clearTrails();
    renderAnalysis();
  }

  function addBody() {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const index = bodies.length;
    const next = [...bodies, {
      id, x: (index % 4 - 1.5) * 65, y: 85 + Math.floor(index / 4) * 25,
      vx: 0, vy: 0, m: 10, r: 8, color: COLORS[index % COLORS.length]
    }];
    setBodies(next);
    clearTrails();
  }

  function saveExperiment() {
    const item = {
      name: `Deney ${saved.length + 1}`,
      date: new Date().toLocaleString('tr-TR'),
      preset: $('presetSelect').value,
      bodies: clone(bodies),
      time: simulationTime,
      gravity,
      timeStep,
      speed
    };
    saved.push(item);
    saved = saved.slice(-20);
    try { localStorage.setItem('mikro-saves', JSON.stringify(saved)); } catch (_) { /* Tarayıcı depolaması kapalı olabilir. */ }
    renderSaved();
    $('saveButton').innerHTML = '✓ <span>Kaydedildi</span>';
    window.setTimeout(() => { $('saveButton').innerHTML = '▣ <span>Deneyi kaydet</span>'; }, 1300);
  }

  function loadSaved(index) {
    const item = saved[index];
    if (!item || !Array.isArray(item.bodies)) return;
    setRunning(false);
    const safeBodies = item.bodies.slice(0, 100).map((body, i) => ({
      id: Number(body.id) || i + 1,
      x: safeNumber(body.x, 0, -100000, 100000), y: safeNumber(body.y, 0, -100000, 100000),
      vx: safeNumber(body.vx, 0, -10000, 10000), vy: safeNumber(body.vy, 0, -10000, 10000),
      m: safeNumber(body.m, 1, 0.01, 1000000), r: safeNumber(body.r, 8, 3, 40),
      color: typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : COLORS[i % COLORS.length]
    }));
    setBodies(safeBodies);
    simulationTime = safeNumber(item.time, 0, 0, 1e12);
    gravity = safeNumber(item.gravity, gravity, 0, 2);
    timeStep = safeNumber(item.timeStep, timeStep, 0.002, 0.04);
    speed = safeNumber(item.speed, speed, 0.2, 4);
    $('gravityRange').value = String(gravity); $('gravityValue').textContent = formatNumber(gravity, 2);
    $('stepRange').value = String(timeStep); $('stepValue').textContent = formatNumber(timeStep, 3);
    $('speedRange').value = String(speed); $('speedValue').textContent = `${formatNumber(speed, 1)}×`;
    if (PRESETS[item.preset]) $('presetSelect').value = item.preset;
    clearTrails();
    renderAnalysis();
  }

  function exportJson() {
    const data = {
      schemaVersion: 1, simulation: 'gravity', preset: $('presetSelect').value,
      bodies, time: simulationTime, gravity, timeStep, speed
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mikro-deney.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data || !Array.isArray(data.bodies) || data.bodies.length > 100) throw new Error('Geçersiz veri');
        const imported = data.bodies.map((body, index) => ({
          id: Number(body.id) || index + 1,
          x: safeNumber(body.x, 0, -100000, 100000), y: safeNumber(body.y, 0, -100000, 100000),
          vx: safeNumber(body.vx, 0, -10000, 10000), vy: safeNumber(body.vy, 0, -10000, 10000),
          m: safeNumber(body.m, 1, 0.01, 1000000), r: safeNumber(body.r, 8, 3, 40),
          color: typeof body.color === 'string' && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : COLORS[index % COLORS.length]
        }));
        setRunning(false);
        setBodies(imported);
        simulationTime = safeNumber(data.time, 0, 0, 1e12);
        gravity = safeNumber(data.gravity, gravity, 0, 2);
        timeStep = safeNumber(data.timeStep, timeStep, 0.002, 0.04);
        speed = safeNumber(data.speed, speed, 0.2, 4);
        if (PRESETS[data.preset]) $('presetSelect').value = data.preset;
        $('gravityRange').value = String(gravity); $('gravityValue').textContent = formatNumber(gravity, 2);
        $('stepRange').value = String(timeStep); $('stepValue').textContent = formatNumber(timeStep, 3);
        $('speedRange').value = String(speed); $('speedValue').textContent = `${formatNumber(speed, 1)}×`;
        clearTrails();
        renderAnalysis();
      } catch (_) {
        window.alert('Dosya okunamadı. Lütfen Mikro Simülasyon tarafından dışa aktarılan geçerli bir JSON dosyası seç.');
      }
      $('importInput').value = '';
    };
    reader.onerror = () => window.alert('Dosya okunurken bir hata oluştu.');
    reader.readAsText(file);
  }

  $('themeToggle').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    $('app').classList.toggle('light', theme === 'light');
    $('app').classList.toggle('dark', theme === 'dark');
    $('themeToggle').textContent = theme === 'dark' ? '☼' : '☾';
    drawScene();
  });
  $('playButton').addEventListener('click', () => setRunning(!running));
  $('stepButton').addEventListener('click', () => {
    setRunning(false);
    setBodies(calculateStep(bodies, timeStep * speed, gravity));
    simulationTime += timeStep * speed;
    renderAnalysis();
  });
  $('resetButton').addEventListener('click', resetExperiment);
  $('presetSelect').addEventListener('change', (event) => applyPreset(event.target.value));
  $('gravityRange').addEventListener('input', (event) => { gravity = Number(event.target.value); $('gravityValue').textContent = formatNumber(gravity, 2); });
  $('stepRange').addEventListener('input', (event) => { timeStep = Number(event.target.value); $('stepValue').textContent = formatNumber(timeStep, 3); });
  $('speedRange').addEventListener('input', (event) => { speed = Number(event.target.value); $('speedValue').textContent = `${formatNumber(speed, 1)}×`; });
  $('trailsToggle').addEventListener('change', (event) => { trailsEnabled = event.target.checked; if (!trailsEnabled) clearTrails(); });
  $('gridToggle').addEventListener('change', (event) => { gridEnabled = event.target.checked; });
  $('addBody').addEventListener('click', addBody);
  $('bodyList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove]');
    if (!button) return;
    const id = Number(button.dataset.remove);
    setBodies(bodies.filter((body) => body.id !== id));
    delete trailMap[id];
  });
  $('saveButton').addEventListener('click', saveExperiment);
  $('exportButton').addEventListener('click', exportJson);
  $('importInput').addEventListener('change', (event) => importJson(event.target.files && event.target.files[0]));
  $('savedList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-load-save]');
    if (button) loadSaved(Number(button.dataset.loadSave));
  });
  $('viewReset').addEventListener('click', () => { zoom = 1; pan = { x: 0, y: 0 }; });
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    pan.x += event.clientX - lastPointer.x;
    pan.y += event.clientY - lastPointer.y;
    lastPointer = { x: event.clientX, y: event.clientY };
  });
  const stopDragging = () => { dragging = false; };
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    zoom = clamp(zoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.25, 5);
  }, { passive: false });

  function renderLoop() {
    drawScene();
    requestAnimationFrame(renderLoop);
  }

  renderBodyList();
  renderAnalysis();
  renderSaved();
  renderLoop();
  window.addEventListener('resize', drawScene);
})();
