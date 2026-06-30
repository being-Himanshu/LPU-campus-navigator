import serial
import json
import requests
import time

# Configuration
COM_PORT = 'COM9'
BAUD_RATE = 115200
SERVER_URL = 'http://localhost:8000/sensor-data'

def start_reader():
    print(f"Starting Serial Reader on {COM_PORT}...")
    
    while True:
        ser = None
        try:
            # Attempt to open serial port
            ser = serial.Serial(COM_PORT, BAUD_RATE, timeout=1)
            print(f"Connected to {COM_PORT} successfully.")
            
            while True:
                try:
                    if ser.in_waiting > 0:
                        line = ser.readline().decode('utf-8', errors='ignore').strip()
                        
                        if line.startswith('{'):
                            # Parse JSON data
                            try:
                                sensor_data = json.loads(line)
                                print(f"ESP32 Data: {sensor_data}")
                                
                                # POST to FastAPI Server
                                try:
                                    response = requests.post(SERVER_URL, json=sensor_data, timeout=2)
                                    print(f"Server Response: {response.status_code}")
                                except requests.exceptions.RequestException:
                                    print("WARNING: FastAPI server unreachable. Check if sensor_server.py is running.")
                            except json.JSONDecodeError:
                                print(f"Error: Could not parse JSON: {line}")
                        elif line:
                            # Print non-JSON lines (debug info from ESP32)
                            print(f"ESP32 Debug: {line}")
                            
                except Exception as e:
                    print(f"Error reading from serial: {e}")
                    break # Break inner loop to retry connection
                    
        except serial.SerialException as e:
            print(f"COM Port Error: Could not open {COM_PORT}. Retrying in 3 seconds... ({e})")
            time.sleep(3)
        except Exception as e:
            print(f"Unexpected error: {e}. Retrying in 3 seconds...")
            time.sleep(3)
        finally:
            if ser and ser.is_open:
                ser.close()

if __name__ == "__main__":
    start_reader()
