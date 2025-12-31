# Honeywell Air Monitor (HTRAM-V1-W) Bluetooth Monitor

![Honeywell HTRAM-V1-W](image.png)

This repository contains a professional Python utility for monitoring and logging data from the Honeywell Air Monitor (Model: HTRAM-V1-W) via Bluetooth Low Energy (BLE).

## Technical Overview

The Honeywell HTRAM device uses a proprietary BLE protocol. While it broadcasts standard GATT services, real-time sensor data is retrieved through a specific Request-Response (Polling) mechanism on a custom service.

### BLE GATT Configuration

*   **Service (Custom):** `fc247940-6e08-11e4-80fc-0002a5d5c51b`
*   **Write Characteristic (Commands):** `3d115840-6e0b-11e4-b24f-0002a5d5c51b`
*   **Notify Characteristic (Data Stream):** `f833d6c0-6e0b-11e4-9136-0002a5d5c51b`

### Protocol Documentation

#### 1. Initialization
The device typically expects an initialization command to set the BLE mode upon connection.
*   **Command:** `7b 41 00 0c 74 58 01 01 00 4e 08 7d`

#### 2. Requesting Data
The device does not stream data automatically by default. To receive updates, the client must poll the device by writing to the **Write Characteristic**.
*   **Real-time Data Request:** `7b 41 00 07 40 44 02 00 fc 3e 7d`

#### 3. Response Format
The device responds via the **Notify Characteristic**. The response packet for real-time data is identified by the header bytes `41 44` at offset 4.

| Offset | Length | Description | Format |
| :--- | :--- | :--- | :--- |
| 4-5 | 2 bytes | Response Signature | `0x4144` |
| 7-8 | 2 bytes | CO2 Concentration | Big-Endian (ppm) |
| 9 | 1 byte | Temperature | Signed Integer (°C) |
| 10 | 1 byte | Humidity | Integer (%) |
| 11 | 1 byte | Battery Level | Index (0=Empty, 4=Full) |
| 12 | 1 byte | Charging Status | Boolean (1=Yes, 0=No) |

## Usage

### 1. Environment Setup
It is highly recommended to use a virtual environment to manage dependencies:
```bash
# Create a virtual environment (if not already exists)
python3 -m venv .venv

# Activate the environment
source .venv/bin/activate

# Install dependencies
pip install bleak
```

### 2. Pairing & Hardware Setup
Before running the script, ensure the device is in pairing mode:
1. **Check Bluetooth Icon:** The Bluetooth symbol on the sensor's screen must be **flashing**.
2. **Enter Pairing Mode:** If the icon is not flashing, **double-press** the physical button on top of the sensor.
3. **System Pairing (First time only):** 
   - When the script attempts to connect for the first time, your OS will prompt for a PIN.
   - A **6-digit code** will appear on the sensor's screen.
   - Enter this code into the system's pairing window on your computer.

### 3. Running the Monitor
If you are using the provided virtual environment, you can run the script directly:

**Option A: Using activated environment (recommended)**
```bash
source .venv/bin/activate
python air_monitor.py
```

**Option B: Direct path (useful for cron/services)**
```bash
./.venv/bin/python air_monitor.py
```

### Command Line Arguments

| Argument | Default | Description |
| :--- | :--- | :--- |
| `--mac` | `None` | Connect to a specific sensor by MAC address (Auto-discovery if omitted). |
| `--interval` | `5` | Set polling frequency in seconds (e.g., `--interval 60` for 1 min). |
| `--dashboard` | `Off` | Enable a visual full-screen dashboard instead of a scrolling log. |


### Examples

*   **Standard logging (One-line per update):**
    `python air_monitor.py`
*   **High-frequency monitoring with dashboard:**
    `python air_monitor.py --interval 1 --dashboard`
*   **Long-term background logging (Once per 5 mins):**
    `python air_monitor.py --interval 300`

### Output Examples

**Log Mode (Default):**
```text
[18:41:59] ID: ABF55D07... | CO2:  750 | T: 23°C | H: 41% | Bat: 4 | Chg: Yes
[18:42:04] ID: ABF55D07... | CO2:  755 | T: 23°C | H: 41% | Bat: 4 | Chg: Yes
```

**Dashboard Mode (`--dashboard`):**
```text
==================================================
 HONEYWELL AIR MONITOR - LIVE DATA (18:36:29)
==================================================
 CO2 Concentration:   750 ppm
 Temperature:          23 °C
 Humidity:             40 %
 Battery Level:      4/4
 Charging Status:    Yes
==================================================
 Logging to: air_monitor_log_...csv
 Press Ctrl+C to exit safely.
```

### Advanced Features

*   **Daily Log Rotation:** Logs are saved as `air_log_[MAC]_[YYYY-MM-DD].csv`. A new file is created automatically at midnight.
*   **Auto-Reconnection:** The script automatically attempts to restore a dropped connection every 10 seconds.
*   **Multi-sensor Support (Smart Home Integration):** For smart home setups, you can run multiple parallel instances of the script (e.g., as separate systemd services or background processes). Use the `--mac` flag for each instance to bind it to a specific sensor. Logs will be automatically separated by the device's MAC address in the file name.

## Legal Disclaimer
This information and the accompanying script are for educational and interoperability purposes only. All product names, logos, and brands are property of their respective owners.
