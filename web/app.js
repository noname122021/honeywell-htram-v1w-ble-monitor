const SERVICE_UUID = "fc247940-6e08-11e4-80fc-0002a5d5c51b";
const WRITE_CHAR_UUID = "3d115840-6e0b-11e4-b24f-0002a5d5c51b";
const NOTIFY_CHAR_UUID = "f833d6c0-6e0b-11e4-9136-0002a5d5c51b";

// CRC16 Table with polynomial 0x8005
const CRC16_TABLE = [
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
];

function calculateCRC16(data) {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
        const idx = ((crc >> 8) ^ data[i]) & 0xFF;
        crc = ((crc << 8) ^ CRC16_TABLE[idx]) & 0xFFFF;
    }
    return new Uint8Array([crc >> 8, crc & 0xFF]);
}

function buildPacket(cmdId, body = []) {
    const length = 2 + body.length + 3;
    const packetPreCrc = new Uint8Array([0x7B, 0x41, 0x00, length, ...cmdId, ...body]);
    const crc = calculateCRC16(packetPreCrc);
    const packet = new Uint8Array([...packetPreCrc, ...crc, 0x7D]);
    return packet;
}

const CMD_GET_REALTIME = buildPacket([0x40, 0x44], [0x02, 0x00]);
const CMD_CHANGE_BLE_MODE = buildPacket([0x74, 0x58], [0x01, 0x01, 0x00]);

let bleDevice = null;
let writeCharacteristic = null;
let pollInterval = null;
let isFetchingHistory = false;
let historyChart = null;
let historyDataPoints = [];
let historyTimeout = null;
let lastHistoryResponse = null;
let deviceHistory = [];

const connectBtn = document.getElementById('connectBtn');
const historyBtn = document.getElementById('historyBtn');
const welcomeScreen = document.getElementById('welcome');
const dashboard = document.getElementById('dashboard');
const historySection = document.getElementById('historySection');
const historyStatus = document.getElementById('historyStatus');

// Load device history from localStorage
function loadDeviceHistory() {
    if (!window.isSecureContext) {
        console.warn("Web Bluetooth requires HTTPS (Secure Context) to work on mobile devices.");
        const helpText = document.createElement('p');
        helpText.style.color = '#ff4b4b';
        helpText.style.fontSize = '0.8rem';
        helpText.style.marginTop = '15px';
        helpText.innerHTML = '⚠️ <b>HTTPS Required:</b> Chrome on Android requires HTTPS to use Bluetooth. Testing over a local IP (HTTP) will not work.';
        welcomeScreen.querySelector('.hero-content').appendChild(helpText);
    }

    try {
        const saved = localStorage.getItem('htram_device_history');
        if (saved) {
            deviceHistory = JSON.parse(saved);
            updateDeviceHistoryUI();
        }
    } catch (e) {
        console.error('Failed to load device history', e);
    }
}

// Save device to history
function saveDeviceToHistory(device) {
    const deviceInfo = {
        id: device.id,
        name: device.name || 'Unknown Device',
        lastConnected: new Date().toISOString()
    };

    // Remove if already exists
    deviceHistory = deviceHistory.filter(d => d.id !== device.id);

    // Add to beginning
    deviceHistory.unshift(deviceInfo);

    // Keep only last 5 devices
    deviceHistory = deviceHistory.slice(0, 5);

    // Save to localStorage
    try {
        localStorage.setItem('htram_device_history', JSON.stringify(deviceHistory));
        updateDeviceHistoryUI();
    } catch (e) {
        console.error('Failed to save device history', e);
    }
}

// Update device history UI
function updateDeviceHistoryUI() {
    const container = document.getElementById('deviceHistoryList');
    if (!container) return;

    if (deviceHistory.length === 0) {
        container.innerHTML = '<p style="color: #888; font-size: 0.9rem;">No previous connections</p>';
        return;
    }

    container.innerHTML = deviceHistory.map(device => `
        <div class="history-device-item" data-device-id="${device.id}">
            <div class="history-device-info">
                <strong>${device.name}</strong>
                <small>Last: ${new Date(device.lastConnected).toLocaleDateString()}</small>
            </div>
            <button class="reconnect-btn" onclick="reconnectToDevice('${device.id}')">
                Reconnect
            </button>
        </div>
    `).join('');
}

// Reconnect to saved device
async function reconnectToDevice(deviceId) {
    if (!window.isSecureContext) {
        alert("Web Bluetooth requires HTTPS to function on mobile devices. Please use a secure connection (GitHub Pages) or test on localhost.");
        return;
    }

    try {
        console.log('Attempting to reconnect to:', deviceId);

        // 1. Попытка "тихого" подключения к уже разрешенным устройствам
        if (navigator.bluetooth.getDevices) {
            const devices = await navigator.bluetooth.getDevices();
            const existing = devices.find(d => d.id === deviceId);
            if (existing) {
                console.log('Device found in permitted list. Connecting...');
                try {
                    await connectToDevice(existing);
                    return;
                } catch (e) {
                    console.warn('Direct connection failed, showing dialog...', e);
                }
            }
        }

        // 2. Если тихое не сработало — вызываем окно с надежным фильтром по префиксу
        console.log('Showing device picker with HTRAM filter...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'HTRAM' }],
            optionalServices: [SERVICE_UUID]
        });

        await connectToDevice(bleDevice);

    } catch (error) {
        console.error('Reconnection error:', error);
        if (error.name !== 'NotFoundError' && error.name !== 'AbortError') {
            alert('Error: ' + error.message);
        }
    }
}

connectBtn.addEventListener('click', async () => {
    try {
        if (bleDevice && bleDevice.gatt.connected) {
            await disconnectDevice();
            return;
        }
        await connectDevice();
    } catch (error) {
        console.error("Bluetooth Error:", error);
        alert("Connection failed: " + error.message);
    }
});

historyBtn.addEventListener('click', async () => {
    if (isFetchingHistory) return;
    await startHistoryFetch();
});

async function connectDevice() {
    console.log("Requesting Bluetooth Device...");
    bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'HTRAM' }],
        optionalServices: [SERVICE_UUID]
    });

    await connectToDevice(bleDevice);
}

async function connectToDevice(device) {
    bleDevice = device;
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    console.log("Connecting to GATT Server...");
    const server = await bleDevice.gatt.connect();

    console.log("Getting Service...");
    const service = await server.getPrimaryService(SERVICE_UUID);

    console.log("Getting Characteristics...");
    writeCharacteristic = await service.getCharacteristic(WRITE_CHAR_UUID);
    const notifyChar = await service.getCharacteristic(NOTIFY_CHAR_UUID);

    await notifyChar.startNotifications();
    notifyChar.addEventListener('characteristicvaluechanged', handleNotifications);

    console.log("Initializing device mode...");
    await writeCharacteristic.writeValue(CMD_CHANGE_BLE_MODE);

    await new Promise(r => setTimeout(r, 1000));

    console.log("Syncing time...");
    await syncTime();

    // Save device to history
    saveDeviceToHistory(bleDevice);

    // Update UI
    connectBtn.textContent = "Disconnect";
    welcomeScreen.style.display = "none";
    dashboard.style.display = "block";
    document.getElementById('statusLabel').textContent = "Connected: " + bleDevice.name;

    // Start polling
    startPolling();
}

async function syncTime() {
    const now = new Date();
    const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const body = [
        0x01,
        parseInt(utcDate.getFullYear().toString().slice(-2)),
        utcDate.getMonth() + 1,
        utcDate.getDate(),
        utcDate.getHours(),
        utcDate.getMinutes(),
        utcDate.getSeconds()
    ];
    const packet = buildPacket([0x22, 0x42], body);
    await writeCharacteristic.writeValue(packet);
}

async function startHistoryFetch() {
    if (isFetchingHistory) return;

    isFetchingHistory = true;
    historyBtn.disabled = true;
    historySection.style.display = "block";
    historyDataPoints = [];
    historyStatus.textContent = "Starting history download...";

    // Pause real-time polling during history fetch
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    if (historyChart) historyChart.destroy();
    initChart();

    await fetchHistoryBlock([0xFF, 0xFF, 0xFF, 0xFF]);
}

async function fetchHistoryBlock(address) {
    if (!writeCharacteristic || !isFetchingHistory) return;

    // Clear any existing timeout
    if (historyTimeout) {
        clearTimeout(historyTimeout);
    }

    // Set timeout for this block (8 seconds)
    historyTimeout = setTimeout(() => {
        if (isFetchingHistory) {
            console.log("History fetch timeout - completing download");
            isFetchingHistory = false;
            historyBtn.disabled = false;
            historyStatus.textContent = `Download complete (timeout). ${historyDataPoints.length} records found.`;
            startPolling();
        }
    }, 8000);

    const packet = buildPacket([0x20, 0x93], [0x01, ...address]);
    try {
        await writeCharacteristic.writeValue(packet);
        historyStatus.textContent = `Fetching block at ${address.map(b => b.toString(16).padStart(2, '0')).join('')}...`;
    } catch (e) {
        console.error("History fetch failed", e);
        if (historyTimeout) clearTimeout(historyTimeout);
        isFetchingHistory = false;
        historyBtn.disabled = false;
        historyStatus.textContent = `Download failed: ${e.message}`;
        startPolling();
    }
}

function handleNotifications(event) {
    const data = new Uint8Array(event.target.value.buffer);
    if (data.length < 6) return;

    const cmdId = Array.from(data.slice(4, 6)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (cmdId === "4144") { // Real-time data
        const co2 = (data[7] << 8) | data[8];
        const tempRaw = data[9];
        const temp = tempRaw <= 128 ? tempRaw : tempRaw - 256;
        const hum = data[10];
        const bat = data[11];
        const charging = data[12] === 1;
        updateUI({ co2, temp, hum, bat, charging });
    } else if (cmdId === "2193") { // History response
        // Clear timeout since we got a response
        if (historyTimeout) {
            clearTimeout(historyTimeout);
            historyTimeout = null;
        }

        const nextAddr = Array.from(data.slice(7, 11));
        const payload = data.slice(11, -3);

        for (let i = 0; i < payload.length; i += 8) {
            const record = payload.slice(i, i + 8);
            if (record.length === 8) {
                const ts = (record[0] << 24) | (record[1] << 16) | (record[2] << 8) | record[3];
                const co2 = (record[4] << 8) | record[5];
                const tempRaw = record[6];
                const temp = tempRaw <= 128 ? tempRaw : tempRaw - 256;
                const hum = record[7];

                historyDataPoints.push({
                    x: new Date(ts * 1000),
                    y: co2
                });
            }
        }

        updateChart();

        if (nextAddr.every(b => b === 0xFF)) {
            isFetchingHistory = false;
            historyBtn.disabled = false;
            historyStatus.textContent = `Download complete. ${historyDataPoints.length} records found.`;

            // Resume real-time polling
            startPolling();
        } else {
            // Fetch next block with longer delay to avoid overwhelming the device
            setTimeout(() => fetchHistoryBlock(nextAddr), 500);
        }
    }
}

function initChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'CO2 level (ppm)',
                data: [],
                borderColor: '#00e676',
                backgroundColor: 'rgba(0, 230, 118, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'day' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' }
                },
                y: {
                    beginAtZero: false,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888' }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function updateChart() {
    if (!historyChart) return;
    // Sort data points by time
    historyDataPoints.sort((a, b) => a.x - b.x);
    historyChart.data.datasets[0].data = historyDataPoints;
    historyChart.update('none'); // Update without animation for speed
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollData();
    pollInterval = setInterval(pollData, 5000);
}

async function pollData() {
    if (writeCharacteristic && !isFetchingHistory) {
        try {
            await writeCharacteristic.writeValue(CMD_GET_REALTIME);
        } catch (e) {
            console.error("Polling write failed", e);
        }
    }
}

function updateUI(data) {
    const co2El = document.getElementById('co2Value');
    const co2Card = document.querySelector('.sensor-card.co2');
    const co2Status = document.getElementById('co2Status');

    co2El.textContent = data.co2;

    if (data.co2 < 800) {
        co2Card.className = "sensor-card co2 success";
        co2Status.textContent = "Excellent Air Quality";
    } else if (data.co2 < 1200) {
        co2Card.className = "sensor-card co2 warning";
        co2Status.textContent = "Moderate Air Quality";
    } else {
        co2Card.className = "sensor-card co2 danger";
        co2Status.textContent = "Poor Air Quality - Ventilate!";
    }

    document.getElementById('tempValue').textContent = data.temp;
    document.getElementById('humValue').textContent = data.hum;

    const batText = document.getElementById('batteryText');
    const batFill = document.getElementById('batteryLevel');
    const chargeTag = document.getElementById('chargingIndicator');

    const pct = (data.bat / 4) * 100;
    batFill.style.width = pct + "%";
    batText.textContent = data.bat + "/4";

    if (data.bat <= 1) batFill.style.backgroundColor = "#ff5252";
    else if (data.bat <= 2) batFill.style.backgroundColor = "#ffea00";
    else batFill.style.backgroundColor = "#00e676";

    chargeTag.style.visibility = data.charging ? 'visible' : 'hidden';
    document.getElementById('timestamp').textContent = "Last sync: " + new Date().toLocaleTimeString();
}

async function disconnectDevice() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    console.log("Device Disconnected");

    // Clean up polling
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }

    // Clean up history fetch state
    if (historyTimeout) {
        clearTimeout(historyTimeout);
        historyTimeout = null;
    }

    if (isFetchingHistory) {
        isFetchingHistory = false;
        historyBtn.disabled = false;
        if (historyDataPoints.length > 0) {
            historyStatus.textContent = `Download interrupted. ${historyDataPoints.length} records saved.`;
        }
    }

    // Reset UI
    connectBtn.textContent = "Connect Device";
    welcomeScreen.style.display = "block";
    dashboard.style.display = "none";
    document.getElementById('statusLabel').textContent = "Disconnected";
}
loadDeviceHistory();
