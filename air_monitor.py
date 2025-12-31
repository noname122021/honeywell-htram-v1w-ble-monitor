import asyncio
import sys
import csv
import argparse
import os
from datetime import datetime
from bleak import BleakScanner, BleakClient

# Configuration
WRITE_CHAR_UUID = "3d115840-6e0b-11e4-b24f-0002a5d5c51b"
NOTIFY_CHAR_UUID = "f833d6c0-6e0b-11e4-9136-0002a5d5c51b"

# Commands
CMD_GET_REALTIME = bytearray([0x7b, 0x41, 0x00, 0x07, 0x40, 0x44, 0x02, 0x00, 0xfc, 0x3e, 0x7d])
CMD_CHANGE_BLE_MODE = bytearray([0x7b, 0x41, 0x00, 0x0c, 0x74, 0x58, 0x01, 0x01, 0x00, 0x4e, 0x08, 0x7d])

class HoneywellMonitor:
    def __init__(self, mac_address, dashboard_mode=False):
        self.mac = mac_address.replace(":", "").replace("-", "").upper()
        self.raw_mac = mac_address
        self.dashboard_mode = dashboard_mode

    def get_current_log_filename(self):
        date_str = datetime.now().strftime("%Y-%m-%d")
        return f"air_log_{self.mac}_{date_str}.csv"

    def log_to_csv(self, data):
        filename = self.get_current_log_filename()
        file_exists = os.path.isfile(filename)
        
        with open(filename, mode='a', newline='') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Timestamp", "CO2_ppm", "Temp_C", "Humidity_pct", "Battery_Level", "Charging"])
            
            writer.writerow([
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                data['co2'], data['temp'], data['hum'], data['bat'], data['charging']
            ])

    def parse_notification(self, sender, data):
        if len(data) < 13 or not (data[4] == 0x41 and data[5] == 0x44):
            return

        res = {
            'co2': (data[7] << 8) | data[8],
            'temp': data[9] if data[9] <= 128 else data[9] - 256,
            'hum': data[10],
            'bat': data[11],
            'charging': "Yes" if data[12] == 1 else "No"
        }
        
        self.log_to_csv(res)
        
        timestamp = datetime.now().strftime('%H:%M:%S')
        
        if self.dashboard_mode:
            # Clear screen
            os.system('clear' if os.name == 'posix' else 'cls')
            print("="*55)
            print(f" HONEYWELL AIR MONITOR | ID: {self.mac} | {timestamp}")
            print("="*55)
            print(f" CO2 Concentration:  {res['co2']:4} ppm")
            print(f" Temperature:        {res['temp']:4} °C")
            print(f" Humidity:           {res['hum']:4} %")
            print(f" Battery Level:      {res['bat']}/4")
            print(f" Charging Status:    {res['charging']}")
            print("-" * 55)
            print(f" Logging to: {self.get_current_log_filename()}")
            print(" [Press Ctrl+C to stop]")
        else:
            # One-line log format
            print(f"[{timestamp}] ID: {self.mac} | CO2: {res['co2']:4} | T: {res['temp']:2}°C | H: {res['hum']}% | Bat: {res['bat']} | Chg: {res['charging']}")

async def run_monitor(target_mac=None, dashboard_mode=False, interval=5):
    if not target_mac:
        print("Scanning for Honeywell HTRAM...")
        devices = await BleakScanner.discover(timeout=5.0)
        htrams = [d for d in devices if d.name and "HTRAM" in d.name]
        
        if not htrams:
            print("No HTRAM devices found.")
            return
        
        if len(htrams) > 1:
            print("\nMultiple HTRAM devices found. Use --mac to specify:")
            for d in htrams:
                print(f"  {d.address} - {d.name}")
            return
        
        target_mac = htrams[0].address

    monitor = HoneywellMonitor(target_mac, dashboard_mode)
    print(f"Connecting to {target_mac} (Interval: {interval}s)...")

    while True:
        try:
            async with BleakClient(target_mac) as client:
                print(f"Connected to {target_mac}")
                await client.start_notify(NOTIFY_CHAR_UUID, monitor.parse_notification)
                await client.write_gatt_char(WRITE_CHAR_UUID, CMD_CHANGE_BLE_MODE)
                
                while client.is_connected:
                    await client.write_gatt_char(WRITE_CHAR_UUID, CMD_GET_REALTIME)
                    await asyncio.sleep(interval)
        except Exception as e:
            print(f"Connection error: {e}. Retrying in 10s...")
            await asyncio.sleep(10)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Honeywell HTRAM Bluetooth Monitor")
    parser.add_argument("--mac", help="Specific MAC address of the sensor")
    parser.add_argument("--dashboard", action="store_true", help="Enable clear-screen dashboard view")
    parser.add_argument("--interval", type=int, default=5, help="Polling interval in seconds (default: 5)")
    args = parser.parse_args()

    try:
        asyncio.run(run_monitor(args.mac, args.dashboard, args.interval))
    except KeyboardInterrupt:
        print("\nExiting...")
