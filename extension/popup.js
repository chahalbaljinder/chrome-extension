let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let connection = null;
let deviceMode = null;

const API_BASE_URL = 'http://localhost:8000';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('hostMode').addEventListener('click', () => setupDevice('host'));
    document.getElementById('clientMode').addEventListener('click', () => setupDevice('client'));
    document.getElementById('startRecording').addEventListener('click', startRecording);
    document.getElementById('stopRecording').addEventListener('click', stopRecording);
    document.getElementById('connect').addEventListener('click', connectToHost);
});

async function setupDevice(mode) {
    deviceMode = mode;
    document.getElementById('connectionSetup').style.display = 'none';
    
    if (mode === 'host') {
        const connectionCode = Math.random().toString(36).substring(2, 8);
        await chrome.storage.local.set({ connectionCode });
        showStatus(`Your connection code: ${connectionCode}`);
        initializeWebRTC(true);
    } else {
        document.getElementById('deviceList').style.display = 'block';
    }
}

async function connectToHost() {
    const code = document.getElementById('connectionCode').value;
    if (code) {
        showStatus('Connecting...');
        initializeWebRTC(false, code);
        document.getElementById('controls').style.display = 'block';
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            await processAudioWithLLM(audioBlob);
        };
        
        mediaRecorder.start();
        isRecording = true;
        showStatus('Recording...');
        document.getElementById('startRecording').disabled = true;
        document.getElementById('stopRecording').disabled = false;
    } catch (error) {
        showStatus(`Error: ${error.message}`);
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        showStatus('Processing audio...');
        document.getElementById('startRecording').disabled = false;
        document.getElementById('stopRecording').disabled = true;
    }
}

async function processAudioWithLLM(audioBlob) {
    try {
        // Send audio to STT service
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const sttResponse = await fetch(`${API_BASE_URL}/stt`, {
            method: 'POST',
            body: formData
        });
        
        const { transcription } = await sttResponse.json();
        
        // Process with LLM
        const llmResponse = await fetch(`${API_BASE_URL}/llm`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: transcription })
        });
        
        const { response } = await llmResponse.json();
        
        // Send to connected device
        if (connection) {
            connection.send(JSON.stringify({
                type: 'llm_response',
                data: response
            }));
        }
        
        showResponse(response);
        showStatus('Response sent');
    } catch (error) {
        showStatus(`Error: ${error.message}`);
    }
}

function showStatus(message) {
    document.getElementById('status').textContent = message;
}

function showResponse(message) {
    const responseArea = document.getElementById('responseArea');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    responseArea.appendChild(messageElement);
    responseArea.scrollTop = responseArea.scrollHeight;
}

function initializeWebRTC(isHost, connectionCode = null) {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };
    
    connection = new RTCPeerConnection(configuration);
    
    connection.onicecandidate = event => {
        if (event.candidate) {
            // Send candidate to peer through signaling server
            // Implementation depends on your signaling server
        }
    };
    
    if (isHost) {
        const dataChannel = connection.createDataChannel('messages');
        setupDataChannel(dataChannel);
    } else {
        connection.ondatachannel = event => {
            setupDataChannel(event.channel);
        };
    }
}

function setupDataChannel(channel) {
    channel.onmessage = event => {
        const message = JSON.parse(event.data);
        if (message.type === 'llm_response') {
            showResponse(message.data);
        }
    };
    
    channel.onopen = () => showStatus('Connected');
    channel.onclose = () => showStatus('Disconnected');
}