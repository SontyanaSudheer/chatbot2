// Global variables
let isVoiceActive = false;
let recognition = null;
let speechSynthesis = window.speechSynthesis;
let currentVoice = null;
let API_ENDPOINT = "http://localhost:5000";

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceToggle = document.getElementById('voiceToggle');
const clearChatBtn = document.getElementById('clearChat');
const themeToggle = document.getElementById('themeToggle');
const imageGenBtn = document.getElementById('imageGenBtn');
const voiceStatus = document.getElementById('voiceStatus');
const imagePanel = document.getElementById('imagePanel');
const closeImagePanel = document.getElementById('closeImagePanel');
const generateImageBtn = document.getElementById('generateImageBtn');
const imagePrompt = document.getElementById('imagePrompt');
const imageDisplay = document.getElementById('imageDisplay');
const voiceSpeed = document.getElementById('voiceSpeed');
const voicePitch = document.getElementById('voicePitch');
const speedValue = document.getElementById('speedValue');
const pitchValue = document.getElementById('pitchValue');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const apiEndpoint = document.getElementById('apiEndpoint');

// Initialize speech synthesis voices
function initializeVoices() {
    const voices = speechSynthesis.getVoices();
    currentVoice = voices.find(voice => voice.lang.includes('en')) || voices[0];
}

speechSynthesis.onvoiceschanged = initializeVoices;

// Initialize Web Speech API
function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            console.log('Voice recognition started');
            voiceStatus.innerHTML = '<i class="fas fa-microphone"></i><span>Listening...</span>';
            voiceStatus.style.color = '#FF6B35';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            userInput.value = transcript;
            sendMessage();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            showBotMessage('Sorry, I had trouble understanding your voice. Please try again.');
            updateVoiceStatus();
        };

        recognition.onend = () => {
            if (isVoiceActive) {
                setTimeout(() => recognition.start(), 500);
            } else {
                updateVoiceStatus();
            }
        };
    } else {
        console.warn('Speech recognition not supported');
        voiceToggle.style.display = 'none';
    }
}

// Update voice status display
function updateVoiceStatus() {
    if (isVoiceActive) {
        voiceStatus.innerHTML = '<i class="fas fa-microphone"></i><span>Voice: On</span>';
        voiceStatus.style.color = '#4CAF50';
    } else {
        voiceStatus.innerHTML = '<i class="fas fa-microphone-slash"></i><span>Voice: Off</span>';
        voiceStatus.style.color = '#FF6B35';
    }
}

// Toggle voice recognition
function toggleVoiceRecognition() {
    if (!recognition) {
        showBotMessage('Voice recognition is not supported in your browser.');
        return;
    }

    isVoiceActive = !isVoiceActive;
    
    if (isVoiceActive) {
        try {
            recognition.start();
        } catch (error) {
            console.error('Error starting recognition:', error);
            isVoiceActive = false;
        }
    } else {
        recognition.stop();
    }
    
    updateVoiceStatus();
    voiceToggle.innerHTML = isVoiceActive ? 
        '<i class="fas fa-microphone-slash"></i>' : 
        '<i class="fas fa-microphone"></i>';
}

// Add message to chat
function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    messageDiv.innerHTML = `
        <div class="avatar">
            <i class="fas fa-${isUser ? 'user' : 'robot'}"></i>
        </div>
        <div class="content">
            <p>${content}</p>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show bot message with typing indicator
function showBotMessage(message) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot';
    typingIndicator.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    setTimeout(() => {
        typingIndicator.remove();
        addMessage(message, false);
        speakText(message);
    }, 1000);
}

// Send message
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessage(message, true);
    userInput.value = '';
    
    // Show typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'message bot';
    typingIndicator.innerHTML = `
        <div class="avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    
    chatMessages.appendChild(typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        const response = await fetch(`${API_ENDPOINT}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message })
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        const data = await response.json();
        typingIndicator.remove();
        
        if (data.error) {
            addMessage(data.error, false);
        } else {
            addMessage(data.response, false);
            speakText(data.response);
        }
    } catch (error) {
        console.error('Error:', error);
        typingIndicator.remove();
        
        // Fallback response if API fails
        const fallbackResponses = [
            "I'm having trouble connecting to my neural network. Let me think... Based on my offline knowledge, I'd say that's an interesting question!",
            "It seems I'm experiencing some connectivity issues. Let me give you a general answer while I work on fixing this.",
            "While I reconnect to my main servers, here's what I think about that..."
        ];
        
        const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        addMessage(fallbackResponse, false);
        speakText(fallbackResponse);
    }
}

// Text-to-speech function
function speakText(text) {
    if (!isVoiceActive && !speechSynthesis.speaking) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = currentVoice;
    utterance.rate = parseFloat(voiceSpeed.value);
    utterance.pitch = parseFloat(voicePitch.value);
    utterance.volume = 1;
    
    speechSynthesis.speak(utterance);
}

// Generate image
async function generateImage() {
    const prompt = imagePrompt.value.trim();
    if (!prompt) {
        alert('Please enter an image description');
        return;
    }
    
    const style = document.getElementById('imageStyle').value;
    
    // Show loading state
    imageDisplay.innerHTML = `
        <div class="placeholder">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Generating image...</p>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_ENDPOINT}/generate_image`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                prompt: prompt,
                style: style
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to generate image');
        }
        
        const data = await response.json();
        
        if (data.error) {
            imageDisplay.innerHTML = `
                <div class="placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>${data.error}</p>
                </div>
            `;
        } else {
            // Display generated image
            const imageDiv = document.createElement('div');
            imageDiv.className = 'generated-image';
            imageDiv.innerHTML = `
                <img src="${data.image_url || 'https://picsum.photos/400/300?random=' + Date.now()}" alt="${prompt}">
                <div class="image-info">
                    <p><strong>Prompt:</strong> ${prompt}</p>
                    <p><strong>Style:</strong> ${style}</p>
                    <p><strong>Generated at:</strong> ${new Date().toLocaleTimeString()}</p>
                </div>
            `;
            
            imageDisplay.innerHTML = '';
            imageDisplay.appendChild(imageDiv);
            
            // Add message about image generation
            showBotMessage(`I've generated an image based on your description: "${prompt}"`);
        }
    } catch (error) {
        console.error('Error generating image:', error);
        
        // Show fallback image
        imageDisplay.innerHTML = `
            <div class="generated-image">
                <img src="https://picsum.photos/400/300?random=${Date.now()}" alt="Fallback Image">
                <div class="image-info">
                    <p><strong>Note:</strong> This is a placeholder image. The image generator is currently offline.</p>
                    <p><strong>Prompt:</strong> ${prompt}</p>
                    <p><strong>Style:</strong> ${style}</p>
                </div>
            </div>
        `;
        
        showBotMessage("I've generated a placeholder image for you. The AI image generator is currently experiencing high demand.");
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeSpeechRecognition();
    initializeVoices();
    
    // Load saved settings
    const savedEndpoint = localStorage.getItem('apiEndpoint');
    if (savedEndpoint) {
        apiEndpoint.value = savedEndpoint;
        API_ENDPOINT = savedEndpoint;
    }
    
    // Send message on Enter key
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Send button click
    sendBtn.addEventListener('click', sendMessage);
    
    // Voice toggle
    voiceToggle.addEventListener('click', toggleVoiceRecognition);
    
    // Clear chat
    clearChatBtn.addEventListener('click', () => {
        chatMessages.innerHTML = `
            <div class="message bot">
                <div class="avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="content">
                    <p>Chat cleared. How can I assist you now?</p>
                </div>
            </div>
        `;
    });
    
    // Theme toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        themeToggle.innerHTML = document.body.classList.contains('light-theme') ? 
            '<i class="fas fa-sun"></i>' : 
            '<i class="fas fa-moon"></i>';
    });
    
    // Image generation
    imageGenBtn.addEventListener('click', () => {
        imagePanel.classList.add('active');
    });
    
    closeImagePanel.addEventListener('click', () => {
        imagePanel.classList.remove('active');
    });
    
    generateImageBtn.addEventListener('click', generateImage);
    
    // Image prompt enter key
    imagePrompt.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateImage();
        }
    });
    
    // Voice settings
    voiceSpeed.addEventListener('input', () => {
        speedValue.textContent = `${voiceSpeed.value}x`;
    });
    
    voicePitch.addEventListener('input', () => {
        pitchValue.textContent = voicePitch.value;
    });
    
    // API endpoint update
    apiEndpoint.addEventListener('change', () => {
        API_ENDPOINT = apiEndpoint.value;
        localStorage.setItem('apiEndpoint', API_ENDPOINT);
    });
    
    // Settings panel
    themeToggle.addEventListener('dblclick', () => {
        settingsPanel.classList.add('active');
    });
    
    closeSettings.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });
    
    // Initialize with a welcome message
    setTimeout(() => {
        speakText("Welcome to Advanced AI Assistant. I'm ready to help you with any questions or tasks you might have.");
    }, 1000);
});