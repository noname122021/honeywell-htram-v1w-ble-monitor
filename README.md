# Honeywell Air Monitor (HTRAM-V1-W) Bluetooth Monitor

![Python 3.7+](https://img.shields.io/badge/Python-3.7+-3776AB?style=flat-square&logo=python&logoColor=white)
![Web Bluetooth](https://img.shields.io/badge/Web_Bluetooth-Supported-blue?style=flat-square&logo=bluetooth&logoColor=white)
![Platform: Windows](https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows&logoColor=white)
![Platform: macOS](https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple&logoColor=white)
![Platform: Android](https://img.shields.io/badge/Android-3DDC84?style=flat-square&logo=android&logoColor=white)
![Platform: iOS](https://img.shields.io/badge/iOS_(Bluefy)-000000?style=flat-square&logo=apple&logoColor=white)

<p align="center">
  <img src="image.png" height="300">
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="web_dashboard.png" height="300">
</p>

## 🚀 [**Launch Web Dashboard (Try it Online)**](https://noname122021.github.io/honeywell-htram-v1w-ble-monitor/web/)

This repository contains a professional suite of tools for monitoring and logging data from the **Honeywell Air Monitor (Model: HTRAM-V1-W)** via Bluetooth Low Energy (BLE). It includes both a robust **Python backend** and a modern **Web Bluetooth Dashboard**.

---

## 🚀 Choose Your Monitor

| Method | Best For | Status |
| :--- | :--- | :--- |
| **[Web Dashboard](#-web-bluetooth-dashboard)** | Quick check, zero installation, beautiful UI | **Recommended** |
| **[Python Script](#-python-monitoring-utility)** | Long-term logging, smart home integration, automation | **Production** |

---

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

#### 3. Response Format (Header: `0x4144`)
| Offset | Length | Description | Format |
| :--- | :--- | :--- | :--- |
| 7-8 | 2 bytes | CO2 Concentration | Big-Endian (ppm) |
| 9 | 1 byte | Temperature | Signed Integer (°C) |
| 10 | 1 byte | Humidity | Integer (%) |
| 11 | 1 byte | Battery Level | Index (0=Empty, 4=Full) |
| 12 | 1 byte | Charging Status | Boolean (1=Yes, 0=No) |

---

## 🌐 Web Bluetooth Dashboard

For a zero-installation experience, use the modern Web UI inspired by the ATC1441 projects.

### Browser Compatibility
*   **Desktop:** Chrome, Edge, Opera (macOS, Windows, Linux).
*   **Android:** Chrome for Android.
*   **iOS (iPhone/iPad):** Not supported in Safari. Use the [**Bluefy Web Ble Browser**](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822232) from the App Store.

### How to use:
1. **Open Online:** [**Launch Web Dashboard**](https://noname122021.github.io/honeywell-htram-v1w-ble-monitor/web/)
2. **On iPhone:** Use the link inside the **Bluefy** browser.
3. Ensure your sensor is in pairing mode (Bluetooth icon flashing).
4. Click **Connect Device** and select your sensor.

---

## 🐍 Python Monitoring Utility

Ideal for 24/7 logging, home automation, and running as a background service.

### 1. Environment Setup
```bash
# Create and activate environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install bleak
```

### 2. Pairing & Hardware Setup
1. **Bluetooth Icon:** Must be **flashing** on the sensor screen.
2. **Double-press** the top button if it's not flashing.
3. **PIN Entry:** Enter the **6-digit code** from the sensor into your OS pairing prompt when running for the first time.

### 3. Usage & Arguments
```bash
python air_monitor.py [arguments]
```

| Argument | Description |
| :--- | :--- |
| `--mac [ADDRESS]` | Bind to a specific sensor (Auto-discovery if omitted). |
| `--interval [SEC]` | Polling frequency (Default: `5`). |
| `--dashboard` | Enable visual console dashboard. |

### Output Examples

**Log Mode (Default):**
`[18:41:59] ID: ABF55D... | CO2: 750 | T: 23°C | H: 41% | Bat: 4 | Chg: Yes`

**Dashboard Mode:**
Full-screen terminal interface with auto-clearing and high visibility.

---

## 🛠 Advanced Features

*   **Daily Log Rotation:** CSV files are rotated daily: `air_log_[MAC]_[YYYY-MM-DD].csv`.
*   **Auto-Reconnection:** Automatically attempts to restore dropped connections every 10 seconds.
*   **Multi-sensor Support:** Run multiple parallel instances for different rooms, each bound to a specific MAC.

---

## Legal Disclaimer
This information and the accompanying scripts are for educational and interoperability purposes only. All product names, logos, and brands are property of their respective owners.
