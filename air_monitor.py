import asyncio
import sys
import csv
import argparse
import os
import struct
from bleak import BleakScanner, BleakClient
from datetime import datetime, timezone

# Configuration
SERVICE_UUID = "fc247940-6e08-11e4-80fc-0002a5d5c51b"
WRITE_CHAR_UUID = "3d115840-6e0b-11e4-b24f-0002a5d5c51b"
NOTIFY_CHAR_UUID = "f833d6c0-6e0b-11e4-9136-0002a5d5c51b"

# CRC16 Table with polynomial 0x8005 (Standard for Honeywell HTRAM)
CRC16_TABLE = [
    0x0000, 0x8005, 0x800F, 0x000A, 0x801B, 0x001E, 0x0014, 0x8011,
    0x8033, 0x0036, 0x003C, 0x8039, 0x0028, 0x802D, 0x8027, 0x0022,
    0x8063, 0x0066, 0x006C, 0x8069, 0x0078, 0x807D, 0x8077, 0x0072,
    0x0050, 0x8055, 0x805F, 0x005A, 0x804B, 0x004E, 0x0044, 0x8041,
    0x80C3, 0x00C6, 0x00CC, 0x80C9, 0x00D8, 0x80DD, 0x80D7, 0x00D2,
    0x00F0, 0x80F5, 0x80FF, 0x00FA, 0x80EB, 0x00EE, 0x00E4, 0x80E1,
    0x00A0, 0x80A5, 0x80AF, 0x00AA, 0x80BB, 0x00BE, 0x00B4, 0x80B1,
    0x8093, 0x0096, 0x009C, 0x8099, 0x0088, 0x808D, 0x8087, 0x0082,
    0x8183, 0x0186, 0x018C, 0x8189, 0x0178, 0x817D, 0x8177, 0x0172,
    0x01B0, 0x81B5, 0x81BF, 0x01BA, 0x81AB, 0x01AE, 0x01A4, 0x81A1,
    0x01E0, 0x81E5, 0x81EF, 0x01EA, 0x81FB, 0x01FE, 0x01F4, 0x81F1,
    0x81D3, 0x01D6, 0x01DC, 0x81D9, 0x01C8, 0x81CD, 0x81C7, 0x01C2,
    0x0140, 0x8145, 0x814F, 0x014A, 0x815B, 0x015E, 0x0154, 0x8151,
    0x8173, 0x0176, 0x017C, 0x8179, 0x0168, 0x816D, 0x8167, 0x0162,
    0x8123, 0x0126, 0x012C, 0x8129, 0x0138, 0x813D, 0x8137, 0x0132,
    0x0110, 0x8115, 0x811F, 0x011A, 0x810B, 0x010E, 0x0104, 0x8101,
    0x8303, 0x0306, 0x030C, 0x8309, 0x0318, 0x831D, 0x8317, 0x0312,
    0x0330, 0x8335, 0x833F, 0x033A, 0x832B, 0x032E, 0x0324, 0x8321,
    0x0360, 0x8365, 0x836F, 0x036A, 0x837B, 0x037E, 0x0374, 0x8371,
    0x8353, 0x0356, 0x035C, 0x8359, 0x0348, 0x834D, 0x8347, 0x0342,
    0x03C0, 0x83C5, 0x83CF, 0x03CA, 0x83DB, 0x03DE, 0x03D4, 0x83D1,
    0x83F3, 0x03F6, 0x03FC, 0x83F9, 0x03E8, 0x83ED, 0x83E7, 0x03E2,
    0x83A3, 0x03A6, 0x03AC, 0x83A9, 0x03B8, 0x83BD, 0x83B7, 0x03B2,
    0x0390, 0x8395, 0x839F, 0x039A, 0x838B, 0x038E, 0x0384, 0x8381,
    0x0280, 0x8285, 0x828F, 0x028A, 0x829B, 0x029E, 0x0294, 0x8291,
    0x82B3, 0x02B6, 0x02BC, 0x82B9, 0x02A8, 0x82AD, 0x82A7, 0x02A2,
    0x82E3, 0x02E6, 0x02EC, 0x82E9, 0x02F8, 0x82FD, 0x82F7, 0x02F2,
    0x02D0, 0x82D5, 0x82DF, 0x02DA, 0x82CB, 0x02CE, 0x02C4, 0x82C1,
    0x8243, 0x0246, 0x024C, 0x8249, 0x0258, 0x825D, 0x8257, 0x0252,
    0x0270, 0x8275, 0x827F, 0x027A, 0x826B, 0x026E, 0x0264, 0x8261,
    0x0220, 0x8225, 0x822F, 0x022A, 0x823B, 0x023E, 0x0234, 0x8231,
    0x8213, 0x0216, 0x021C, 0x8219, 0x0208, 0x820D, 0x8207, 0x0202
]

# Protocol Helpers
def calculate_crc16(data: bytes):
    crc = 0
    for byte in data:
        idx = ((crc >> 8) ^ byte) & 0xFF
        crc = ((crc << 8) ^ CRC16_TABLE[idx]) & 0xFFFF
    return crc.to_bytes(2, byteorder="big")

def build_packet(cmd_id: bytes, body: bytes = b""):
    # Format: 7B 41 00 <Length> <CmdID> <Body> <CRC> 7D
    # Length = CmdID (2) + Body + CRC (2) + End (1)
    length = 2 + len(body) + 3
    packet_pre_crc = bytes([0x7B, 0x41, 0x00, length]) + cmd_id + body
    crc = calculate_crc16(packet_pre_crc)
    return packet_pre_crc + crc + b"\x7D"

# Commands
CMD_GET_REALTIME = build_packet(b"\x40\x44", b"\x02\x00")
CMD_CHANGE_BLE_MODE = build_packet(b"\x74\x58", b"\x01\x01\x00")

def get_sync_time_command():
    now = datetime.now(timezone.utc)
    body = bytes([
        0x01, # Header for sync command
        int(now.strftime("%y")),
        int(now.strftime("%m")),
        int(now.strftime("%d")),
        int(now.strftime("%H")),
        int(now.strftime("%M")),
        int(now.strftime("%S"))
    ])
    return build_packet(b"\x22\x42", body)

def get_fetch_history_command(address=b"\xff\xff\xff\xff"):
    return build_packet(b"\x20\x93", b"\x01" + address)

class HoneywellMonitor:
    def __init__(self, mac_address, dashboard_mode=False):
        self.mac = mac_address.replace(":", "").replace("-", "").upper()
        self.raw_mac = mac_address
        self.dashboard_mode = dashboard_mode
        self.history_records = []
        self.history_finished = asyncio.Event()
        self.next_history_address = None

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
        if len(data) < 6: return

        cmd_id = data[4:6].hex()
        
        # Real-time data response
        if cmd_id == "4144" and len(data) >= 13:
            res = {
                'co2': (data[7] << 8) | data[8],
                'temp': data[9] if data[9] <= 128 else data[9] - 256,
                'hum': data[10],
                'bat': data[11],
                'charging': "Yes" if data[12] == 1 else "No"
            }
            self.log_to_csv(res)
            self.update_display(res)
        
        # History data response
        elif cmd_id == "2193" and len(data) >= 14:
            next_addr = data[7:11]
            if next_addr == b'\xff\xff\xff\xff':
                self.history_finished.set()
            else:
                self.next_history_address = next_addr
                payload = data[11:-3]
                for i in range(0, len(payload), 8):
                    record = payload[i:i+8]
                    if len(record) == 8:
                        ts, co2, temp, hum = struct.unpack(">IHBb", record)
                        # We use UTC for historical records as the device stores them in UTC
                        dt = datetime.fromtimestamp(ts, tz=timezone.utc)
                        self.history_records.append({
                            'time': dt,
                            'co2': co2, 'temp': temp, 'hum': hum
                        })
        
        # Time Sync acknowledgment
        elif cmd_id == "2342":
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Time synchronization confirmed by device.")

    def update_display(self, res):
        timestamp = datetime.now().strftime('%H:%M:%S')
        if self.dashboard_mode:
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
            print(f"[{timestamp}] ID: {self.mac} | CO2: {res['co2']:4} | T: {res['temp']:2}°C | H: {res['hum']}% | Bat: {res['bat']} | Chg: {res['charging']}")

async def run_monitor(target_mac=None, dashboard_mode=False, interval=5, fetch_history=False):
    if not target_mac:
        print("Scanning for Honeywell HTRAM...")
        # BleakScanner.find_device_by_filter is more reliable on some systems
        device = await BleakScanner.find_device_by_filter(lambda d, ad: d.name and d.name.startswith("HTRAM"))
        if not device:
            print("No HTRAM devices found.")
            return
        target_mac = device.address

    monitor = HoneywellMonitor(target_mac, dashboard_mode)
    
    while True:
        try:
            async with BleakClient(target_mac) as client:
                print(f"Connected to {target_mac}")
                await client.start_notify(NOTIFY_CHAR_UUID, monitor.parse_notification)
                
                # Initial handshake
                await client.write_gatt_char(WRITE_CHAR_UUID, CMD_CHANGE_BLE_MODE)
                await asyncio.sleep(1)
                
                # 1. Sync Time (Crucial for correct future history timestamps)
                sync_cmd = get_sync_time_command()
                print(f"Syncing time with device: {sync_cmd.hex()}")
                await client.write_gatt_char(WRITE_CHAR_UUID, sync_cmd)
                await asyncio.sleep(1)

                # 2. History Fetching (if requested)
                if fetch_history:
                    print("Fetching historical data log from device memory...")
                    addr = b'\xff\xff\xff\xff'
                    while not monitor.history_finished.is_set():
                        print(f"  Downloading block at {addr.hex()}...", end='\r', flush=True)
                        await client.write_gatt_char(WRITE_CHAR_UUID, get_fetch_history_command(addr))
                        
                        start_wait = asyncio.get_event_loop().time()
                        while asyncio.get_event_loop().time() - start_wait < 3:
                            if monitor.next_history_address:
                                addr = monitor.next_history_address
                                monitor.next_history_address = None
                                break
                            await asyncio.sleep(0.1)
                        else:
                            break
                    
                    print(f"\nDownload complete. Records found: {len(monitor.history_records)}")
                    if monitor.history_records:
                        history_file = f"history_{monitor.mac}.csv"
                        with open(history_file, 'w', newline='') as f:
                            writer = csv.writer(f)
                            writer.writerow(["Timestamp_UTC", "CO2_ppm", "Temp_C", "Humidity_pct"])
                            for r in monitor.history_records:
                                writer.writerow([r['time'].strftime("%Y-%m-%d %H:%M:%S"), r['co2'], r['temp'], r['hum']])
                        print(f"Saved historical log to {history_file}")
                    
                    if not dashboard_mode:
                        return # Exit after history fetch if not monitoring

                # 3. Real-time Monitoring
                print(f"Starting real-time monitoring (Interval: {interval}s)...")
                while client.is_connected:
                    await client.write_gatt_char(WRITE_CHAR_UUID, CMD_GET_REALTIME)
                    await asyncio.sleep(interval)
        except Exception as e:
            if fetch_history and not dashboard_mode:
                print(f"Error: {e}")
                return
            print(f"Connection lost: {e}. Reconnecting in 10s...")
            await asyncio.sleep(10)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Honeywell HTRAM Bluetooth Monitor")
    parser.add_argument("--mac", help="Specific MAC address of the sensor")
    parser.add_argument("--dashboard", action="store_true", help="Enable clear-screen dashboard view")
    parser.add_argument("--interval", type=int, default=5, help="Polling interval in seconds (default: 5)")
    parser.add_argument("--history", action="store_true", help="Download all historical data from the device")
    args = parser.parse_args()

    try:
        asyncio.run(run_monitor(args.mac, args.dashboard, args.interval, args.history))
    except KeyboardInterrupt:
        print("\nExiting...")
