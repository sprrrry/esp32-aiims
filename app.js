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
const notificationArea = document.getElementById('notificationArea');

const masterStart = document.getElementById('masterStart');
const masterStop  = document.getElementById('masterStop');

// Connect to the BLE device when the connect button is clicked.
connectButton.addEventListener('click', async () => {
  try {
    logNotification('Requesting BLE device...');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });
    
    bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

    logNotification('Connecting to GATT Server...');
    bleServer = await bleDevice.gatt.connect();

    logNotification('Getting service...');
    bleService = await bleServer.getPrimaryService(SERVICE_UUID);

    logNotification('Getting characteristic...');
    bleCharacteristic = await bleService.getCharacteristic(CHARACTERISTIC_UUID);

    connectionStatus.textContent = 'Connected';
    logNotification('Connected to device!');
  } catch (error) {
    console.error('Error:', error);
    logNotification('Connection failed: ' + error);
  }
});

// Handle disconnection
function onDisconnected() {
  connectionStatus.textContent = 'Disconnected';
  logNotification('Device disconnected.');
}

// Helper function to log notifications
function logNotification(message) {
  notificationArea.textContent = message;
  console.log(message);
}

// Send command over BLE
async function sendCommand(command) {
  if (!bleCharacteristic) {
    logNotification('Not connected to a BLE device.');
    return;
  }
  try {
    console.log('Sending command:', command);
    const encoder = new TextEncoder();
    const commandArray = encoder.encode(command);
    await bleCharacteristic.writeValue(commandArray);
    logNotification('Command sent: ' + command);
  } catch (error) {
    console.error('Error sending command:', error);
    logNotification('Error sending command: ' + error);
  }
}

// Event listeners for individual motor Start/Stop buttons
document.querySelectorAll('.motorStart').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    // Example command: "MOTOR_1_START"
    sendCommand(`MOTOR_${motorId}_START`);
  });
});

document.querySelectorAll('.motorStop').forEach(button => {
  button.addEventListener('click', () => {
    const motorId = button.getAttribute('data-motor');
    // Example command: "MOTOR_1_STOP"
    sendCommand(`MOTOR_${motorId}_STOP`);
  });
});

// Event listeners for the speed sliders
document.querySelectorAll('.speedSlider').forEach(slider => {
  slider.addEventListener('input', (event) => {
    const motorId = event.target.getAttribute('data-motor');
    const value = event.target.value;
    // Update the displayed speed value
    document.querySelector(`.speedValue[data-motor="${motorId}"]`).textContent = `${value}%`;
    // Send speed command (assumes motor is running or that the firmware accepts speed changes while stopped)
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
  // Example command: "ALL_START" (firmware should start all motors)
  sendCommand('ALL_START');
});

masterStop.addEventListener('click', () => {
  // Example command: "ALL_STOP" (firmware should stop all motors)
  sendCommand('ALL_STOP');
});
