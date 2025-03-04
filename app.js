// Global Variables for BLE connection
let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristic = null;

// Replace these UUIDs with your ESP32's custom BLE service and characteristic UUIDs.
const SERVICE_UUID = '0000abcd-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00001234-0000-1000-8000-00805f9b34fb';

// Replace with your deployed Google Apps Script WebApp URL
const GOOGLE_SHEET_URL = 'https://script.google.com/macros/s/AKfycbznroOzyhN3eLb9ZDtKSG4dMLoyJfnty5iAVLWqMWZlk75aiIgoKIByFoLVDbKLpL8dqg/exec';

// DOM Elements
const connectButton = document.getElementById('connectButton');
const connectionStatus = document.getElementById('connectionStatus');
const logNotificationElem = document.getElementById('logNotification');
const deviceIdElem = document.getElementById('deviceId');
const masterStart = document.getElementById('masterStart');
const masterStop  = document.getElementById('masterStop');
const masterSlider = document.getElementById('masterSlider');
const masterSpeedValue = document.getElementById('masterSpeedValue');
const masterAdjustMinus = document.getElementById('masterAdjustMinus');
const masterAdjustPlus = document.getElementById('masterAdjustPlus');

// Preset form
const savePresetBtn = document.getElementById('savePresetBtn');
const presetNameInput = document.getElementById('presetName');
const loadPresetsBtn = document.getElementById('loadPresetsBtn');
const presetList = document.getElementById('presetList');

// === Helper Functions for Buttons with Loading Spinners ===
function showLoading(buttonElem, loadingText) {
  buttonElem.disabled = true;
  buttonElem.innerHTML = `
    ${loadingText}
    <span class="spinner-border spinner-border-sm ms-2" role="status" aria-hidden="true"></span>
  `;
}

function hideLoading(buttonElem, originalText) {
  buttonElem.disabled = false;
  buttonElem.textContent = originalText;
}

// === 1) Update Master Sliders (UI Only) & Send Global Command ===
function updateAllMotors(globalValue) {
  document.querySelectorAll('.speedSlider').forEach(slider => {
    slider.value = globalValue;
    const motorId = slider.getAttribute('data-motor');
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${globalValue}%`;
  });
  // Send only the master slider command
  sendCommand(`A_S:${globalValue}`);
}

// === 2) BLE Connect/Disconnect ===
connectButton.addEventListener('click', async () => {
  if (bleDevice && bleDevice.gatt.connected) {
    updateLog('Disconnecting from device...');
    bleDevice.gatt.disconnect();
    return;
  }
  try {
    updateLog('Requesting BLE device...');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });
    
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
    
    updateLog('Connecting to GATT Server...');
    bleServer = await bleDevice.gatt.connect();
    
    updateLog('Getting service...');
    bleService = await bleServer.getPrimaryService(SERVICE_UUID);
    
    updateLog('Getting characteristic...');
    bleCharacteristic = await bleService.getCharacteristic(CHARACTERISTIC_UUID);
    
    // Display device ID
    deviceIdElem.textContent = 'DeviceID: ' + (bleDevice.id || 'Unknown');
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger');
    connectionStatus.classList.add('bg-success');
    connectButton.textContent = 'Disconnect';
    updateLog('Connected to device!');
  } catch (error) {
    console.error('Error:', error);
    updateLog('Connection failed: ' + error);
  }
});

function onDisconnected() {
  connectionStatus.textContent = 'Disconnected';
  connectionStatus.classList.remove('bg-success');
  connectionStatus.classList.add('bg-danger');
  connectButton.textContent = 'Connect';
  deviceIdElem.textContent = 'DeviceID: --';
  updateLog('Device disconnected.');
}

// === 3) Logging Helper ===
function updateLog(message) {
  logNotificationElem.textContent = 'Log: ' + message;
  console.log(message);
}

// === 4) Send BLE Command ===
async function sendCommand(command) {
  if (!bleCharacteristic) {
    updateLog('Not connected to a BLE device.');
    return;
  }
  try {
    console.log('Sending command:', command);
    const encoder = new TextEncoder();
    const commandArray = encoder.encode(command);
    await bleCharacteristic.writeValue(commandArray);
    updateLog('Command sent: ' + command);
  } catch (error) {
    console.error('Error sending command:', error);
    updateLog('Error sending command: ' + error);
  }
}

// === 5) Individual Motor Sliders & Adjust Buttons ===
document.querySelectorAll('.speedSlider').forEach(slider => {
  slider.addEventListener('input', (event) => {
    const motorId = event.target.getAttribute('data-motor');
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${event.target.value}%`;
  });
  slider.addEventListener('change', (event) => {
    const motorId = event.target.getAttribute('data-motor');
    sendCommand(`M${motorId}_S:${event.target.value}`);
  });
});

document.querySelectorAll('.adjustSpeed').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    const adjustValue = parseInt(button.getAttribute('data-adjust'), 10);
    const slider = document.querySelector(`.speedSlider[data-motor="${motorId}"]`);
    let currentValue = parseInt(slider.value, 10);
    let newValue = currentValue + adjustValue;
    newValue = Math.max(0, Math.min(100, newValue));
    slider.value = newValue;
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${newValue}%`;
    sendCommand(`M${motorId}_S:${newValue}`);
  });
});

// === 6) Master Slider with Debounce ===
let masterSliderTimeout;
masterSlider.addEventListener('input', (event) => {
  masterSpeedValue.textContent = `${event.target.value}%`;
  clearTimeout(masterSliderTimeout);
  masterSliderTimeout = setTimeout(() => {
    updateAllMotors(event.target.value);
  }, 200);
});

masterAdjustMinus.addEventListener('click', () => {
  let currentValue = parseInt(masterSlider.value, 10);
  let newValue = Math.max(0, currentValue - 5);
  masterSlider.value = newValue;
  masterSpeedValue.textContent = `${newValue}%`;
  updateAllMotors(newValue);
});
masterAdjustPlus.addEventListener('click', () => {
  let currentValue = parseInt(masterSlider.value, 10);
  let newValue = Math.min(100, currentValue + 5);
  masterSlider.value = newValue;
  masterSpeedValue.textContent = `${newValue}%`;
  updateAllMotors(newValue);
});

// === 7) Individual Motor Start/Stop ===
document.querySelectorAll('.motorStart').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    sendCommand(`M${motorId}_START`);
  });
});
document.querySelectorAll('.motorStop').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    sendCommand(`M${motorId}_STOP`);
  });
});

// === 8) Master Start/Stop ===
masterStart.addEventListener('click', () => {
  sendCommand('A_START');
});
masterStop.addEventListener('click', () => {
  sendCommand('A_STOP');
});

// === 9) Save Preset (with loading spinner) ===
savePresetBtn.addEventListener('click', async () => {
  showLoading(savePresetBtn, 'Saving...');
  const presetName = presetNameInput.value.trim() || 'Untitled';
  const deviceIdString = (bleDevice && bleDevice.id) ? bleDevice.id : 'NoDevice';
  
  const speeds = {};
  document.querySelectorAll('.speedSlider').forEach(slider => {
    const motorId = slider.getAttribute('data-motor');
    speeds[motorId] = slider.value;
  });
  
  await savePresetToGoogleSheets(deviceIdString, presetName, speeds);
  hideLoading(savePresetBtn, 'Save Preset');
});

async function savePresetToGoogleSheets(deviceIdString, presetName, speeds) {
  if (!GOOGLE_SHEET_URL) {
    updateLog('No Google Sheet URL configured.');
    return;
  }
  
  const data = {
    deviceId: deviceIdString,
    presetName: presetName,
    speeds: speeds
  };
  
  try {
    const response = await fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();
    console.log('Google Sheets response:', result);
    
    if (result.status === 'Success') {
      updateLog('Preset saved successfully to Google Sheets.');
    } else {
      updateLog(`Error saving preset: ${result.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error saving preset to Google Sheets:', error);
    updateLog('Error saving preset to Google Sheets: ' + error);
  }
}

// === 10) Load Presets (with loading spinner) ===
loadPresetsBtn.addEventListener('click', async () => {
  showLoading(loadPresetsBtn, 'Loading...');
  await loadPresets();
  hideLoading(loadPresetsBtn, 'Load Presets');
});

async function loadPresets() {
  if (!GOOGLE_SHEET_URL) {
    updateLog('No Google Sheet URL configured.');
    return;
  }
  try {
    const response = await fetch(GOOGLE_SHEET_URL);
    const presets = await response.json();
    console.log('Loaded presets:', presets);
    displayPresetList(presets);
    updateLog('Presets loaded.');
  } catch (error) {
    console.error('Error loading presets:', error);
    updateLog('Error loading presets: ' + error);
  }
}

function displayPresetList(presets) {
  presetList.innerHTML = '';
  if (!Array.isArray(presets) || presets.length === 0) {
    presetList.innerHTML = '<div class="list-group-item">No presets found.</div>';
    return;
  }
  presets.forEach(preset => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action';
    
    // Show preset name, timestamp, and motor speeds
    const m1 = preset.Motor1 || '0';
    const m2 = preset.Motor2 || '0';
    const m3 = preset.Motor3 || '0';
    const m4 = preset.Motor4 || '0';

    item.innerHTML = `
      <strong>${preset.PresetName}</strong>
      <small class="text-muted ms-2">(${preset.Timestamp})</small>
      <br>
      M1: ${m1}, M2: ${m2}, M3: ${m3}, M4: ${m4}
    `;

    // When clicked, load this preset
    item.addEventListener('click', () => {
      loadPreset(preset);
    });
    presetList.appendChild(item);
  });
}

function loadPreset(preset) {
  // Update sliders with the loaded preset speeds
  ['1','2','3','4'].forEach(motorId => {
    const speed = preset[`Motor${motorId}`] || 50;
    const slider = document.querySelector(`.speedSlider[data-motor="${motorId}"]`);
    const speedDisplay = document.querySelector(`.speedValue[data-motor="${motorId}"]`);
    slider.value = speed;
    speedDisplay.textContent = `${speed}%`;
  });
  updateLog(`Loaded preset "${preset.PresetName}"`);
}
