# Honeywell HTRAM-V1-W Hardware Analysis

This document details the internal hardware components and memory structure of the Honeywell Transmission Risk Air Monitor (HTRAM-V1-W), derived from physical tear-down and flash memory analysis.

## 📱 Hardware Specifications

*   **Codename:** StormShadow
*   **Main Board:** `stormshadow main board rev3 b309`
*   **Microcontroller (MCU):** GigaDevice **GD32F150C8T6**
    *   **Architecture:** ARM Cortex-M3
    *   **Frequency:** 72 MHz
    *   **Internal Flash:** 64 KB (Stores the main application code and BLE stack)
    *   **SRAM:** 8 KB
*   **External Flash Memory:** Winbond **25Q32JVS1Q**
    *   **Capacity:** 32 Megabit / 4 Megabyte
    *   **Interface:** SPI
    *   **Purpose:** Storage for display resources (fonts, icons) and long-term measurement logs.
*   **CO2 Sensor:** NDIR (Non-Dispersive Infrared) sensor, likely SenseAir Sunrise or equivalent.
*   **Display:** Monochrome OLED/LCD for real-time readings.

---

## 💾 External Flash Memory Map (4MB)

Analysis of the `backup/backup_htram_v1.bin` dump reveals the following memory organization:

| Address Range | Size | Content Description |
| :--- | :--- | :--- |
| `0x000000 - 0x0FD000` | ~1 MB | **Empty / Reserved** (Filled with `0xFF`) |
| `0x0FD000 - 0x0FD010` | 16 B | **System Info:** Contains the Serial Number (e.g., `RM1221407791`) |
| `0x0FE000` | - | **Status Flags:** Pattern `ZZZZ` found at this boundary. |
| `0x100000 - 0x1FFFFF` | 1 MB | **Display Resources:** Fonts, icons, and UI assets. |
| `0x200000 - 0x2604D0` | ~385 KB | **Measurement Logs:** 90-day history of air quality data. |
| `0x2604D0 - 0x3FFFFF` | ~1.6 MB | **Unused / Reserved** |

---

## 📊 Measurement Log Format

The device logs sensor data every **60 seconds**. There are two observed encoding formats for these logs:

### Format A (Standard/Daily)
Each entry is approximately 8-12 bytes.

*   **Timestamp:** 4 bytes (Big-Endian Unix Timestamp).
*   **CO2 Value:** 2 bytes (Big-Endian, ppm).
*   **Temperature:** 1 byte (typically signed integer).
*   **Humidity:** 1 byte (percentage).

### Format B (Compressed/Incremental)
Used for high-density storage, starting with an `id` marker and using 2-byte offsets for timestamps within a block.

---

## 🔍 Debugging & Extraction

### SWD Interface (MCU Access)
The GD32F150 MCU can be accessed via the Serial Wire Debug (SWD) interface. Look for 4 unpopulated pads on the PCB:
1.  **VCC** (3.3V)
2.  **SWDIO** (Pin 34 / PA13)
3.  **SWCLK** (Pin 37 / PA14)
4.  **GND**

### SPI Flash Access (Winbond)
The Winbond 25Q32 can be read/written using a standard SPI programmer (e.g., CH341A) and a SOP8 test clip without desoldering.
*   **Operating Voltage:** 3.3V (Warning: Do not use 5V logic).
*   **Tools:** `flashrom` or manufacturer software.
