class PanoramaViewer {
  constructor() {
    this.viewer = null;
    this.container = document.getElementById('pano');
    this.panoC = document.getElementById('pano-c');
  }

  getPhotoUrl(buildingId, floor, roomId) {
    if(['b1','b2','b5','b6'].includes(buildingId)) return '360photos/classroom_1_360.jpg';
    if(buildingId === 'b34' && floor !== 'G') return '360photos/classroom_2_360.jpg';
    if(buildingId === 'b34' && floor === 'G') return '360photos/classroom_3_360.jpg';
    if(['b25','b26','b86','b87'].includes(buildingId) && floor === 'F3') return '360photos/classroom_4_360.jpg';
    
    const fallbacks = ['360photos/classroom_1_360.jpg', '360photos/classroom_2_360.jpg', '360photos/classroom_4_360.jpg'];
    let hash = 0;
    const str = roomId || buildingId || "default";
    for(let i=0; i<str.length; i++) hash += str.charCodeAt(i);
    return fallbacks[hash % fallbacks.length];
  }

  openPano(buildingId, floor, roomId, title, explicitUrl) {
    const url = explicitUrl || this.getPhotoUrl(buildingId, floor, roomId);
    
    // Check container exists
    if (!this.container) {
      this.container = document.getElementById('pano');
    }
    if (!this.panoC) {
      this.panoC = document.getElementById('pano-c');
    }
    if (!this.container || !this.panoC) {
      console.error('Panorama container not found in DOM');
      return;
    }

    this.container.style.display = 'flex';
    document.body.classList.add('split-mode');

    const pill = document.getElementById('pano-pill');
    if (pill) pill.textContent = title || '360° View';

    if (this.viewer) {
      try { this.viewer.destroy(); } catch(e) {}
      this.viewer = null;
    }

    if (window.pannellum) {
      try {
        this.viewer = pannellum.viewer('pano-c', {
          type: 'equirectangular',
          panorama: url,
          autoLoad: true,
          compass: true,
          showZoomCtrl: false,
          mouseZoom: true,
          pitch: 0,
          yaw: 0,
          hfov: 100,
          onError: (err) => {
            console.warn('Pano load failed:', err);
            if (this.viewer) {
              this.viewer.destroy();
              this.viewer = null;
            }
            this.panoC.innerHTML = `
              <div style="color:white;padding:40px;text-align:center;font-family:sans-serif;">
                <h3 style="margin-bottom:10px;font-size:20px;">⚠️ 360° Image Unavailable</h3>
                <p style="color:#aaa;font-size:14px;line-height:1.5;">
                  The panoramic image could not be loaded.<br>
                  If you are viewing this via the <code>file://</code> protocol, your browser's security settings may be blocking it.
                </p>
              </div>`;
          }
        });
      } catch(e) {
        this.panoC.innerHTML = '<div style="color:white;padding:40px;text-align:center">⚠️ Could not load 360° view.<br>Check that image files exist in 360photos/ folder.</div>';
      }
    } else {
      // Pannellum not loaded — inject CDN dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.onload = () => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
        document.head.appendChild(link);
        // Retry after load
        setTimeout(() => this.openPano(buildingId, floor, roomId, title, explicitUrl), 500);
      };
      document.head.appendChild(script);
      this.panoC.innerHTML = '<div style="color:white;padding:40px;text-align:center">Loading 360° viewer...</div>';
    }
  }

  close() {
    this.container.style.display = 'none';
    document.body.classList.remove('split-mode');
    if(this.viewer) {
      this.viewer.destroy();
      this.viewer = null;
    }
  }
}

window.PanoramaViewer = PanoramaViewer;
