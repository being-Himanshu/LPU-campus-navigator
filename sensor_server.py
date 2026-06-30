from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SensorData(BaseModel):
    # New fields from ESP32
    buildingCount: int = 0
    roomOccupied: bool = False
    temperature: float = 0.0
    humidity: float = 0.0
    
    # Backward compatibility fields
    room1: bool = False
    room2: bool = False
    room3: bool = False

# Global variable to store latest data
latest_sensor_data = SensorData()

@app.post("/sensor-data")
async def update_sensor_data(data: SensorData):
    global latest_sensor_data
    latest_sensor_data = data
    
    # Print received values as requested
    print("--- Received New Sensor Data ---")
    print(f"Building Count: {data.buildingCount}")
    print(f"Room Occupied:  {data.roomOccupied}")
    print(f"Temperature:    {data.temperature} C")
    print(f"Humidity:       {data.humidity} %")
    print("--------------------------------")
    
    return {"status": "success", "data": latest_sensor_data}

@app.get("/sensor-data")
async def get_sensor_data():
    return latest_sensor_data

if __name__ == "__main__":
    # Start FastAPI server
    uvicorn.run(app, host="0.0.0.0", port=8000)
