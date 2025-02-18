// Global Variables for BLE connection
let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristic = null;

// Replace these UUIDs with your ESP32's custom BLE service and characteristic UUIDs.
const SERVICE_UUID = '0000abcd-0000-1000-8000-00805f9b34fb';
const CHARACTERISTIC_UUID = '00001234-0000-1000-8000-00805f9b34fb';

// DOM Elements
const connectButton = document.getElementById('connectButton');
const connectionStatus = document.getElementById('connectionStatus');
const logNotificationElem = document.getElementById('logNotification');
const masterStart = document.getElementById('masterStart');
const masterStop  = document.getElementById('masterStop');
const masterSlider = document.getElementById('masterSlider');
const masterSpeedValue = document.getElementById('masterSpeedValue');
const masterAdjustMinus = document.getElementById('masterAdjustMinus');
const masterAdjustPlus = document.getElementById('masterAdjustPlus');

// Function to update all individual motor sliders in the UI and send a single global command.
function updateAllMotors(globalValue) {
  document.querySelectorAll('.speedSlider').forEach(slider => {
    slider.value = globalValue;
    const motorId = slider.getAttribute('data-motor');
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${globalValue}%`;
    // Do not send individual motor commands here.
  });
  // Send only the global master slider command.
  sendCommand(`A_S:${globalValue}`);
}

// Toggle connection: if connected, disconnect; if disconnected, connect.
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

// Handle disconnection
function onDisconnected() {
  connectionStatus.textContent = 'Disconnected';
  connectionStatus.classList.remove('bg-success');
  connectionStatus.classList.add('bg-danger');
  connectButton.textContent = 'Connect';
  updateLog('Device disconnected.');
}

// Update the log notification in the header
function updateLog(message) {
  logNotificationElem.textContent = 'Log: ' + message;
  console.log(message);
}

// Send command over BLE with optimized commands.
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

// For individual motor sliders: update display on input; send command on change.
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

// Adjust speed buttons for individual motors.
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

// Global Master Slider with debounce for smooth sliding.
let masterSliderTimeout;
masterSlider.addEventListener('input', (event) => {
  masterSpeedValue.textContent = `${event.target.value}%`;
  clearTimeout(masterSliderTimeout);
  masterSliderTimeout = setTimeout(() => {
    updateAllMotors(event.target.value);
  }, 200);
});

// ±5% buttons for Master Speed.
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

// Event listeners for individual motor Start/Stop buttons.
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

// Event listeners for the master start/stop buttons.
masterStart.addEventListener('click', () => {
  sendCommand('A_START');
});
masterStop.addEventListener('click', () => {
  sendCommand('A_STOP');
});
