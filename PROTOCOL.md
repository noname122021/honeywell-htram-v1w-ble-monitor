# Honeywell HTRAM-V1-W Advanced Protocol & Command Reference

This document contains advanced technical details extracted from the decompiled application source code. It covers the **Firmware Update Protocol** and **Extended Command Sets** for various hardware configurations (WiFi, Zigbee, NB-IoT), which are not typically documented.

> **⚠️ Warning:** These commands are derived from static analysis of the Android app (`MicroRAECmdClass.smali`). Sending incorrect commands to your device may cause instability. Use at your own risk.

## 🔄 Firmware Update Protocol

The device uses a dedicated **Request-Response** state machine for Over-the-Air (OTA) firmware updates via BLE. The process involves four distinct stages: Check, Data Transfer, Verification, and Installation.

### 🆔 Device Models & Hardware
The application code and PCB markings reveal the following technical details:

*   **Codename:** The project and firmware are internally referred to as **"StormShadow"**, which is also etched on the device PCB.
*   **SKUs:**
    *   **SKU 1617 (MOV1):** Associated with the "BLE Device" preference. Likely the standard HTRAM-V1.
    *   **SKU 1619 (MOV2):** Associated with the "WiFi Device" preference. Likely an advanced version with native WiFi capabilities.
*   **Hardware Components:** The device is built around a **GD32F150** MCU and a **Winbond 25Q32** SPI Flash.

For a deep dive into the physical components and memory map, see [**HARDWARE.md**](HARDWARE.md).


### Command Class: `0x22`

| Stage | Command | Hex Bytes | Payload / Description |
| :--- | :--- | :--- | :--- |
| **1. Check** | `FIRMWARE_CHECK` | `22 A1` | Sends the firmware header to the device to validate compatibility. <br> **Payload:** `Header_Length (2 bytes)` + `Header_Data` |
| **2. Transfer** | `FIRMWARE_DOWNLOAD` | `22 A2` | Stream the binary file in chunks (default chunk size: 512 bytes). <br> **Payload:** `Chunk_Size (2 bytes)` + `Offset (4 bytes)` + `Binary_Data` |
| **3. Verify** | `FIRMWARE_VERIFY` | `22 A3` | Initiates the checksum/integrity verification process after transfer completes. |
| **4. Poll Result** | `FIRMWARE_GET_VERIFY` | `22 A4` | Polls the device for the result of the verification. |
| **5. Install** | `FIRMWARE_INSTALL` | `22 A6` | Triggers the final installation and device reboot. <br> **Payload:** `0x01` |

### 📦 Firmware File Format & Source
**Source:**
The application checks for updates by querying:
`POST https://airmonitoring.stg.honeywell.com/api/air/ota/getLatestDeviceFwInfo`

The API responds with a JSON object containing the `downloadUrl`, `version`, and `hashcode`.

**File Structure:**
The downloaded firmware file is a proprietary container (RFP format). It is **not** a raw binary. It contains a 41-byte header followed by one or more embedded files (typically the firmware binary and a signature).

**Header Structure (41 bytes):**
*   `0x00` (16 bytes): Header Info String
*   `0x10`: Version (1 byte)
*   `0x11`: Revision (1 byte)
*   `0x12`: Build Time (4 bytes, timestamp)
*   `0x16`: Author String
*   `0x19`: MD5 Hash String
*   `0x19`: MD5 Hash String
*   `0x29`: Header Size

The app parses this container, extracts the actual firmware binary chunk, and sends *only* the binary data to the device via BLE.

> **🕵️ Discovery:** The application internally saves the downloaded firmware with the filename **`StormShadow.RFP`**. This suggests "StormShadow" is the internal project codename. Searching for this filename online might yield results.

---

## 🛠 Advanced Command Set

The application code (`MicroRAECmdClass`) includes support for multiple hardware variants (Bluetooth-only, WiFi, Zigbee/Mesh, NB-IoT). Even if your device is Bluetooth-only, these commands exist in the firmware definition.

### 🧪 Sensor Maintenance (All Models)
These commands relate to the gas sensors and calibration.

| Command Name | Hex Bytes | Description |
| :--- | :--- | :--- |
| `SENSOR_BUMP_INTERVAL_GET` | `26 23` | Read the interval for bump testing. |
| `SENSOR_BUMP_DATA_GET` | `40 57` | Retrieve data from the last bump test. |
| `SENSOR_CALIBRATION_GET` | `40 55` | Read calibration data/status. |
| `SENSOR_MULTI_CALIBRATION_SET`| `22 68` | Perform multi-point calibration. |
| `SENSOR_PARA_GET` | `40 43` | Read internal sensor parameters. |
| `SENSOR_PARA_SET` | `42 43` | Write internal sensor parameters. |

### 📡 Wireless / Zigbee (Mesh Models)
These commands likely apply to the **HTRAM-V1-W** or similar "Premium" models with internal mesh networking capabilities (Zigbee/Thread).

| Command Name | Hex Bytes | Description |
| :--- | :--- | :--- |
| `WIRELESS_PAN_ID_GET` | `27 08` | Read the Personal Area Network (PAN) ID. |
| `WIRELESS_PAN_ID_SET` | `27 09` | Set the PAN ID. |
| `WIRELESS_CHANNEL_GET` | `27 0A` | Read the operating wireless channel. |
| `WIRELESS_CHANNEL_SET` | `27 0B` | Set the wireless channel. |
| `WIRELESS_REGION` | `27 17` | Read/Set the region configuration. |

### 📶 WiFi Configuration (WiFi Models)
For devices that support direct WiFi connectivity.

| Command Name | Hex Bytes | Description |
| :--- | :--- | :--- |
| `WIFI_CFG_GET` | `74 61` | Read current WiFi SSID/Password configuration. |
| `WIFI_CFG_SET` | `74 60` | Provision WiFi credentials. |
| `SAFETY_NEX_WIFI_CFG_GET` | `74 65` | Read Safety/Nexus specific WiFi config. |
| `MSG_COMMAND_GET` | `74 63` | Retrieve queued messages (WiFi/Cloud). |

### 🌐 NB-IoT (Cellular Models)
For industrial models with built-in cellular backhaul.

| Command Name | Hex Bytes | Description |
| :--- | :--- | :--- |
| `NBIOT_BASIC_INFO_GET` | `20 A3` | Read IMEI/IMSI/Signal Strength. |
| `NBIOT_CONFIG_INFO_SET` | `22 A8` | Configure APN and cellular settings. |

### ⚙️ System Settings
| Command Name | Hex Bytes | Description |
| :--- | :--- | :--- |
| `DC_MODE` | `40 A3` | Duty Cycle / Power Mode (?) |
| `TIME_OUT_SETTING_GET` | `40 A4` | Read screen/device timeout settings. |
| `TIME_OUT_SETTING_SET` | `40 89` | Set screen/device timeout settings. |
