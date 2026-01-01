const SERVICE_UUID = "fc247940-6e08-11e4-80fc-0002a5d5c51b";
const WRITE_CHAR_UUID = "3d115840-6e0b-11e4-b24f-0002a5d5c51b";
const NOTIFY_CHAR_UUID = "f833d6c0-6e0b-11e4-9136-0002a5d5c51b";

const CMD_GET_REALTIME = new Uint8Array([0x7b, 0x41, 0x00, 0x07, 0x40, 0x44, 0x02, 0x00, 0xfc, 0x3e, 0x7d]);
const CMD_CHANGE_BLE_MODE = new Uint8Array([0x7b, 0x41, 0x00, 0x0c, 0x74, 0x58, 0x01, 0x01, 0x00, 0x4e, 0x08, 0x7d]);

let bleDevice = null;
let writeCharacteristic = null;
let pollInterval = null;

const connectBtn = document.getElementById('connectBtn');
const welcomeScreen = document.getElementById('welcome');
const dashboard = document.getElementById('dashboard');

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

async function connectDevice() {
    console.log("Requesting Bluetooth Device...");
    bleDevice = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'HTRAM' }],
        optionalServices: [SERVICE_UUID]
    });

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

    // Update UI
    connectBtn.textContent = "Disconnect";
    welcomeScreen.style.display = "none";
    dashboard.style.display = "block";
    document.getElementById('statusLabel').textContent = "Connected: " + bleDevice.name;

    // Start polling
    startPolling();
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);

    // First poll immediate
    pollData();

    pollInterval = setInterval(pollData, 5000);
}

async function pollData() {
    if (writeCharacteristic) {
        try {
            await writeCharacteristic.writeValue(CMD_GET_REALTIME);
        } catch (e) {
            console.error("Polling write failed", e);
        }
    }
}

function handleNotifications(event) {
    const data = new Uint8Array(event.target.value.buffer);

    if (data.length < 13) return;

    // Check for 41 44 signature
    if (data[4] === 0x41 && data[5] === 0x44) {
        const co2 = (data[7] << 8) | data[8];
        const tempRaw = data[9];
        const temp = tempRaw <= 128 ? tempRaw : tempRaw - 256;
        const hum = data[10];
        const bat = data[11];
        const charging = data[12] === 1;

        updateUI({ co2, temp, hum, bat, charging });
    }
}

function updateUI(data) {
    const co2El = document.getElementById('co2Value');
    const co2Card = document.querySelector('.sensor-card.co2');
    const co2Status = document.getElementById('co2Status');

    co2El.textContent = data.co2;

    // CO2 Quality thresholds
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

    // Battery
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

    // Timestamp
    document.getElementById('timestamp').textContent = "Last sync: " + new Date().toLocaleTimeString();
}

async function disconnectDevice() {
    if (bleDevice && bleDevice.gatt.connected) {
        bleDevice.gatt.disconnect();
    }
}

function onDisconnected() {
    console.log("Device Disconnected");
    if (pollInterval) clearInterval(pollInterval);

    connectBtn.textContent = "Connect Device";
    welcomeScreen.style.display = "block";
    dashboard.style.display = "none";
    document.getElementById('statusLabel').textContent = "Disconnected";
}
