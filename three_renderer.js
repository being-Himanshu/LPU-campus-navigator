class ThreeRenderer {
  constructor(buildings, mapCenter) {
    this.buildings = buildings;
    this.mapCenter = mapCenter;
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.isActive = false;
    this.animId = null;
    
    // Animation targets for smooth easing
    this.targetScales = new Map();
    this.targetColors = new Map();
    this.baseColors = new Map();
    this.hoveredBuilding = null;
    this.bouncing = new Map();
    
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.id = 'three-container';
    this.container.style.position = 'fixed';
    this.container.style.inset = '0';
    this.container.style.zIndex = '15'; 
    this.container.style.display = 'none';
    this.container.style.background = 'transparent';
    document.body.appendChild(this.container);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#f2f2f7'); // Apple system light background
    this.scene.fog = new THREE.FogExp2('#f2f2f7', 0.0015);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 1, 3000);
    this.camera.position.set(0, 300, 400);

    // High quality renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio); // Retina support
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    this.container.appendChild(this.renderer.domElement);

    // Modern lighting (ambient + directional for soft shadows)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 200, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(100, 250, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -400;
    dirLight.shadow.camera.right = 400;
    dirLight.shadow.camera.top = 400;
    dirLight.shadow.camera.bottom = -400;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    // Ground
    const groundGeo = new THREE.PlaneGeometry(3000, 3000);
    const groundMat = new THREE.MeshPhongMaterial({ color: '#e5e5ea', depthWrite: true });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    if(window.THREE.OrbitControls) {
      this.controls = new window.THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.maxPolarAngle = Math.PI / 2.2; 
      this.controls.minDistance = 50;
      this.controls.maxDistance = 800;
      this.controls.autoRotate = true; // Subtle auto-rotate
      this.controls.autoRotateSpeed = 0.5;
    }

    this.buildCampus();

    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    // Interactions
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this), {passive: true});
    this.container.addEventListener('click', this.onClick.bind(this));
    // For touch devices
    this.container.addEventListener('touchstart', (e) => {
        if(e.touches.length > 0) {
           this.mouse.x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
           this.mouse.y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;
           this.checkHover();
        }
    }, {passive: true});
  }

  latLngToXY(lat, lng) {
    const dx = (lng - this.mapCenter[1]) * 100000; 
    const dy = (lat - this.mapCenter[0]) * 100000;
    return { x: dx, y: -dy }; 
  }

  buildCampus() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0); // Origin at bottom for correct scaling
    
    this.buildings.forEach(b => {
      const pos = this.latLngToXY(b.lat, b.lng);
      const floors = b.floors || 1;
      const height = floors * 4 * 1.5; 
      const width = 18 + Math.random() * 12;
      const depth = 18 + Math.random() * 12;
      
      const color = b.color || '#007AFF'; // Modern blue default
      const mat = new THREE.MeshStandardMaterial({ 
        color: color,
        roughness: 0.4,
        metalness: 0.1,
      });
      
      const mesh = new THREE.Mesh(geometry, mat);
      
      mesh.position.set(pos.x, 0, pos.y);
      mesh.scale.set(width, height, depth);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      mesh.userData = { id: b.id, name: b.name, baseHeight: height, baseColor: new THREE.Color(color) };
      this.scene.add(mesh);
      
      this.targetScales.set(mesh.uuid, 1.0);
      this.baseColors.set(mesh.uuid, new THREE.Color(color));
      this.targetColors.set(mesh.uuid, new THREE.Color(color));
    });
  }

  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    // Find first building
    let found = null;
    for(let i=0; i<intersects.length; i++) {
        if(intersects[i].object.userData.id) {
            found = intersects[i].object;
            break;
        }
    }
    
    if(this.hoveredBuilding !== found) {
        if(this.hoveredBuilding) {
            // Reset old hover
            this.targetScales.set(this.hoveredBuilding.uuid, 1.0);
            this.targetColors.set(this.hoveredBuilding.uuid, this.baseColors.get(this.hoveredBuilding.uuid));
            document.body.style.cursor = 'default';
        }
        
        this.hoveredBuilding = found;
        
        if(this.hoveredBuilding) {
            // Set new hover
            this.targetScales.set(this.hoveredBuilding.uuid, 1.08);
            const brighter = this.baseColors.get(this.hoveredBuilding.uuid).clone().lerp(new THREE.Color('#ffffff'), 0.2);
            this.targetColors.set(this.hoveredBuilding.uuid, brighter);
            document.body.style.cursor = 'pointer';
        }
    }
  }

  onMouseMove(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.checkHover();
  }

  onClick(e) {
    if(this.controls) this.controls.autoRotate = false; // stop auto-rotate on interact
    
    if(this.hoveredBuilding) {
      // Trigger bounce
      this.bouncing.set(this.hoveredBuilding.uuid, { time: 0, active: true });
      
      const b = this.buildings.find(x => x.id === this.hoveredBuilding.userData.id);
      if(b && typeof window.glassUI !== 'undefined') {
          // Smoothly move camera towards it
          const targetPos = this.hoveredBuilding.position;
          // We won't strictly lock the camera, just let user see info
          window.glassUI.showBuilding(b);
      }
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    if(!this.isActive) return;
    this.animId = requestAnimationFrame(this.animate.bind(this));
    
    if(this.controls) this.controls.update(); // for damping
    
    // Interpolate scales and colors for smooth animations
    this.scene.children.forEach(child => {
        if(child.userData && child.userData.id) {
            const uuid = child.uuid;
            let targetS = this.targetScales.get(uuid) || 1.0;
            
            // Apply bounce if active
            const bounce = this.bouncing.get(uuid);
            if(bounce && bounce.active) {
                bounce.time += 0.1;
                // Damped sine wave
                const offset = Math.sin(bounce.time * 5) * Math.exp(-bounce.time) * 0.3;
                targetS += offset;
                if(bounce.time > Math.PI) bounce.active = false;
            }
            
            // Lerp scale (Y axis scales height, X/Z scales width)
            const curScaleX = child.scale.x;
            const baseW = child.scale.x; // We actually need original width, but this is a simplified uniform scale
            // Instead of uniform scale, we scale the whole mesh wrapper
            // But we already set scale.y to height. We will use a userData scale multiplier
            if(!child.userData.curMult) child.userData.curMult = 1.0;
            
            child.userData.curMult += (targetS - child.userData.curMult) * 0.15;
            
            const bHeight = child.userData.baseHeight;
            const aspectX = child.scale.x / child.userData.curMult;
            const aspectZ = child.scale.z / child.userData.curMult;
            
            child.scale.set(aspectX * child.userData.curMult, bHeight * child.userData.curMult, aspectZ * child.userData.curMult);
            
            // Lerp color
            const targetC = this.targetColors.get(uuid);
            if(targetC) {
                child.material.color.lerp(targetC, 0.1);
            }
        }
    });

    this.renderer.render(this.scene, this.camera);
  }

  toggle() {
    this.isActive = !this.isActive;
    if(this.isActive) {
      document.getElementById('outdoor').style.display = 'none';
      this.container.style.display = 'block';
      this.animate();
      // Optional: Add a subtle fade-in
      this.container.style.opacity = 0;
      this.container.style.transition = 'opacity 0.6s ease';
      setTimeout(() => this.container.style.opacity = 1, 10);
    } else {
      document.getElementById('outdoor').style.display = 'block';
      this.container.style.transition = 'opacity 0.4s ease';
      this.container.style.opacity = 0;
      setTimeout(() => {
          this.container.style.display = 'none';
          if(this.animId) cancelAnimationFrame(this.animId);
      }, 400);
    }
  }
}

window.ThreeRenderer = ThreeRenderer;
