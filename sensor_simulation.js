class SensorSimulation {
  constructor(roomData, buildings) {
    this.roomData = roomData;
    this.buildings = buildings;
    this.initCounts();
    this.startSimulation();
    
    // Listen for custom pulse events to animate dots
    document.addEventListener('sensorPulse', this.handlePulseEvent.bind(this));
  }

  initCounts() {
    this.buildings.forEach(b => {
      if(!b.peopleCount) b.peopleCount = Math.floor(Math.random() * 251) + 150;
    });
    for(let id in this.roomData) {
      if(this.roomData[id].people < 20 || this.roomData[id].people > 60) {
        this.roomData[id].people = Math.floor(Math.random() * 41) + 20;
      }
    }
  }

  startSimulation() {
    // Existing simulation interval (Random movements)
    setInterval(() => {
      this.simulateEvent();
    }, Math.random() * 3000 + 2000);

    // NEW FIX: Second interval for fetching REAL ESP32 data from the server
    setInterval(() => {
      this.syncWithRealSensor();
    }, 3000);
  }

  async syncWithRealSensor() {
    try {
      // Fetch data from FastAPI backend
      const response = await fetch('http://localhost:8000/sensor-data');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      
      // 1. Update building b25 peopleCount with buildingCount from ESP32
      const b25 = this.buildings.find(b => b.id === 'b25');
      if (b25 && data.buildingCount !== undefined) {
        b25.peopleCount = data.buildingCount;
      }

      // 2. Update roomData ECE-101 people: roomOccupied=true → 1, false → 0
      if (this.roomData['ECE-101'] && data.roomOccupied !== undefined) {
        this.roomData['ECE-101'].people = data.roomOccupied ? 1 : 0;
      }

      // 3. Update ALL rooms temp with temperature value
      if (data.temperature !== undefined) {
        for (let id in this.roomData) {
          this.roomData[id].temp = data.temperature;
        }
      }

      // 4. Store full response in window.latestSensorData
      window.latestSensorData = data;

      // 5. Trigger UI update
      this.updateUI();
      
    } catch (error) {
      console.warn('Sensor Server Sync Failed: ESP32 data not available. Running in simulation mode.');
    }
  }

  simulateEvent() {
    // Random simulation logic (Fallback when real sensors aren't active)
    if(Math.random() > 0.5 && Object.keys(this.roomData).length > 0) {
      const roomIds = Object.keys(this.roomData);
      const roomId = roomIds[Math.floor(Math.random() * roomIds.length)];
      const room = this.roomData[roomId];
      const isEntry = Math.random() > 0.5;
      
      if(isEntry && room.people < room.cap) room.people++;
      else if(!isEntry && room.people > 0) room.people--;
      
      this.triggerRedDotPulse('room-' + roomId);
      this.updateUI();
    } else {
      const b = this.buildings[Math.floor(Math.random() * this.buildings.length)];
      const isEntry = Math.random() > 0.5;
      
      if(isEntry) b.peopleCount++;
      else if(!isEntry && b.peopleCount > 0) b.peopleCount--;
      
      this.triggerRedDotPulse('bldg-' + b.id);
      this.updateUI();
    }
  }

  triggerRedDotPulse(elementId) {
    const event = new CustomEvent('sensorPulse', { detail: { id: elementId } });
    document.dispatchEvent(event);
  }

  handlePulseEvent(e) {
    const id = e.detail.id;
    const dot = document.getElementById('door-dot-' + id);
    if(dot) {
      const newDot = dot.cloneNode(true);
      dot.parentNode.replaceChild(newDot, dot);
      newDot.classList.add('door-pulse');
      setTimeout(() => newDot.classList.remove('door-pulse'), 1500);
    }
  }

  updateUI() {
    if(typeof window.glassUI !== 'undefined') window.glassUI.updateLiveCount();
    
    // Update SVG text if in indoor view
    if(document.getElementById('indoor') && document.getElementById('indoor').classList.contains('active')) {
      for(let id in this.roomData) {
        const textEl = document.getElementById('rcount-' + id);
        if(textEl) {
           textEl.textContent = this.roomData[id].people + 'p';
        }
      }
    }
  }
}

window.SensorSimulation = SensorSimulation;
