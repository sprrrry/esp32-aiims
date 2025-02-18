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

// Connect to the BLE device when the connect button is clicked.
connectButton.addEventListener('click', async () => {
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
    
    // Update connection status badge
    connectionStatus.textContent = 'Connected';
    connectionStatus.classList.remove('bg-danger');
    connectionStatus.classList.add('bg-success');
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
  updateLog('Device disconnected.');
}

// Update the log notification in the header
function updateLog(message) {
  logNotificationElem.textContent = 'Log: ' + message;
  console.log(message);
}

// Send command over BLE
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

// Event listeners for individual motor Start/Stop buttons
document.querySelectorAll('.motorStart').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    sendCommand(`MOTOR_${motorId}_START`);
  });
});

document.querySelectorAll('.motorStop').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    sendCommand(`MOTOR_${motorId}_STOP`);
  });
});

// Event listeners for the speed sliders
document.querySelectorAll('.speedSlider').forEach(slider => {
  slider.addEventListener('input', (event) => {
    const motorId = event.target.getAttribute('data-motor');
    const value = event.target.value;
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${value}%`;
    sendCommand(`MOTOR_${motorId}_SPEED:${value}`);
  });
});

// Event listeners for the adjust speed buttons (+/- 5%)
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
    sendCommand(`MOTOR_${motorId}_SPEED:${newValue}`);
  });
});

// Event listeners for the master start/stop buttons
masterStart.addEventListener('click', () => {
  sendCommand('ALL_START');
});

masterStop.addEventListener('click', () => {
  sendCommand('ALL_STOP');
});
