class GlassUI {
  constructor() {
    this.sheet = document.getElementById('bottom-sheet');
    this.handle = document.querySelector('.sheet-handle');
    this.state = 'hidden'; 
    this.startY = 0;
    this.currentContext = null;
    
    this.initStyle();
    this.bindEvents();
  }

  initStyle() {
    this.sheet.classList.add('glass-panel');
    
    // Inject animation styles if not present
    if (!document.getElementById('glass-ui-styles')) {
      const style = document.createElement('style');
      style.id = 'glass-ui-styles';
      style.innerHTML = `
        .fade-in-stagger { opacity: 0; transform: translateY(10px); animation: staggerFade 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .d-1 { animation-delay: 0.05s; }
        .d-2 { animation-delay: 0.1s; }
        .d-3 { animation-delay: 0.15s; }
        @keyframes staggerFade { to { opacity: 1; transform: translateY(0); } }
      `;
      document.head.appendChild(style);
    }
  }

  bindEvents() {
    this.handle.addEventListener('touchstart', this.onDragStart.bind(this), {passive: true});
    this.handle.addEventListener('mousedown', this.onDragStart.bind(this));
    
    document.addEventListener('touchmove', this.onDragMove.bind(this), {passive: false});
    document.addEventListener('mousemove', this.onDragMove.bind(this));
    
    document.addEventListener('touchend', this.onDragEnd.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
  }

  onDragStart(e) {
    this.isDragging = true;
    this.startY = e.touches ? e.touches[0].clientY : e.clientY;
    this.sheet.style.transition = 'none';
  }

  onDragMove(e) {
    if(!this.isDragging) return;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const deltaY = y - this.startY;
    
    if (this.state === 'expanded') {
      if (deltaY > 0) this.sheet.style.transform = `translateY(${deltaY}px)`;
    } else if (this.state === 'minimized') {
      if (deltaY < 0) this.sheet.style.transform = `translateY(${this.calcMinimizedOffset() + deltaY}px)`;
    }
  }

  onDragEnd(e) {
    if(!this.isDragging) return;
    this.isDragging = false;
    this.sheet.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    
    const y = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = y - this.startY;
    
    if (this.state === 'expanded' && deltaY > 50) {
      this.minimize();
    } else if (this.state === 'minimized' && deltaY < -50) {
      this.expand();
    } else {
      if (this.state === 'expanded') this.expand();
      if (this.state === 'minimized') this.minimize();
    }
  }

  showBuilding(b) {
    this.currentContext = { type: 'building', data: b };
    this.render();
    this.expand();
  }

  showRoom(r) {
    this.currentContext = { type: 'room', data: r };
    this.render();
    this.expand();
  }

  render() {
    if(!this.currentContext) return;
    
    const ctx = this.currentContext;
    let html = '';
    
    if(ctx.type === 'building') {
      const b = ctx.data;
      const avg = b.peopleCount || 0;
      html = `
        <div class="glass-content">
          <div class="glass-header fade-in-stagger d-1">
            <h2 style="font-size:22px;margin-bottom:4px;font-weight:600">${b.name}</h2>
            <p style="font-size:14px;color:var(--text2)">${b.floors} floors · ${b.rooms} rooms</p>
          </div>
          <div class="glass-stats fade-in-stagger d-2">
            <div class="g-stat">
              <span class="g-icon">🚶</span>
              <span class="g-val" id="glass-live-count">${avg}</span> people inside
            </div>
            <div class="g-stat">
              <span class="g-icon">🌡️</span>
              <span class="g-val">
                ${window.latestSensorData ? window.latestSensorData.temperature + '°C' : '--'}
              </span>
              <span class="g-icon">💧</span>
              <span class="g-val">
                ${window.latestSensorData ? window.latestSensorData.humidity + '%' : '--'}
              </span>
            </div>
          </div>
          <div class="glass-actions fade-in-stagger d-3">
            <button class="g-btn primary" onclick="navToBuilding('${b.id}')">Navigate</button>
            ${b.hasIndoor ? `<button class="g-btn" onclick="enterBuilding('${b.id}')">Enter</button>` : ''}
            <button class="g-btn" onclick="window.panoViewer.openPano('${b.id}', 'G', null, '${b.name}')">360° View</button>
          </div>
        </div>
      `;
    } else if(ctx.type === 'room') {
      const r = ctx.data;
      html = `
        <div class="glass-content">
          <div class="glass-header fade-in-stagger d-1">
            <h2 style="font-size:22px;margin-bottom:4px;font-weight:600">Room ${r.label}</h2>
            <p style="font-size:14px;color:var(--text2)">Floor ${r.floor}</p>
          </div>
          <div class="glass-stats fade-in-stagger d-2">
            <div class="g-stat">
              <span class="g-icon">
                ${window.latestSensorData && window.latestSensorData.roomOccupied ? '🔴' : '🟢'}
              </span>
              <span class="g-val">
                ${window.latestSensorData && window.latestSensorData.roomOccupied ? 'Occupied' : 'Empty'}
              </span>
            </div>
            <div class="g-stat">
              <span class="g-icon">🌡️</span>
              <span class="g-val" id="glass-live-count">
                ${r.temp || (window.latestSensorData ? window.latestSensorData.temperature : '--')}°C
              </span>
              <span class="g-icon">💧</span>
              <span class="g-val">
                ${window.latestSensorData ? window.latestSensorData.humidity + '%' : '--'}
              </span>
            </div>
          </div>
          <div class="glass-actions fade-in-stagger d-3">
            <button class="g-btn primary" onclick="window.panoViewer.openPano(window.currentBuildingId, '${r.floor}', '${r.id}', 'Room ${r.label}')">360° View</button>
          </div>
        </div>
      `;
    }
    
    document.getElementById('sheet-body').innerHTML = html;
  }

  updateLiveCount() {
    if(!this.currentContext) return;
    const el = document.getElementById('glass-live-count');
    if(!el) return;
    
    if(this.currentContext.type === 'building') {
      el.textContent = this.currentContext.data.peopleCount || 0;
    } else {
      el.textContent = this.currentContext.data.people || 0;
    }
    
    el.classList.remove('pulse-text');
    void el.offsetWidth;
    el.classList.add('pulse-text');
  }

  expand() {
    this.state = 'expanded';
    this.sheet.classList.add('show');
    this.sheet.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    this.sheet.style.transform = 'translateY(0)';
  }

  minimize() {
    this.state = 'minimized';
    this.sheet.style.transform = `translateY(${this.calcMinimizedOffset()}px)`;
  }

  hide() {
    this.state = 'hidden';
    this.sheet.classList.remove('show');
    this.sheet.style.transform = 'translateY(100%)';
  }
  
  calcMinimizedOffset() {
    const rect = this.sheet.getBoundingClientRect();
    return rect.height - 100;
  }
}

window.GlassUI = GlassUI;
