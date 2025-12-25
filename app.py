from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import openai
import requests
import json
import os
import io
from PIL import Image, ImageDraw, ImageFont
import textwrap
import base64
import random

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-openai-api-key-here')
UNSPLASH_ACCESS_KEY = os.getenv('UNSPLASH_ACCESS_KEY', 'your-unsplash-access-key')

# Initialize OpenAI (if API key is provided)
if OPENAI_API_KEY and OPENAI_API_KEY != 'your-openai-api-key-here':
    openai.api_key = OPENAI_API_KEY

# Knowledge base for fallback responses
KNOWLEDGE_BASE = {
    "greetings": [
        "Hello! I'm your advanced AI assistant. How can I help you today?",
        "Hi there! I'm ready to assist you with any questions or tasks.",
        "Greetings! I'm here to help you with information, images, and more."
    ],
    "capabilities": [
        "I can answer questions on various topics, generate images, provide explanations, and assist with creative tasks.",
        "My capabilities include natural language conversations, image generation based on descriptions, and providing detailed information on countless subjects.",
        "I'm equipped to handle questions about science, technology, history, arts, and much more. I can also create visual content from text descriptions."
    ],
    "fallback": [
        "That's an interesting question. While I process that, let me share some relevant information...",
        "I understand your query. Based on my knowledge, here's what I can tell you...",
        "Great question! Here's my analysis on that topic..."
    ]
}

def generate_ai_response(user_message):
    """Generate response using OpenAI API or fallback to knowledge base"""
    try:
        if OPENAI_API_KEY and OPENAI_API_KEY != 'your-openai-api-key-here':
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an advanced AI assistant that can answer any question on any topic. Provide detailed, helpful, and accurate information."},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=500,
                temperature=0.7
            )
            return response.choices[0].message.content
    except Exception as e:
        print(f"OpenAI API error: {e}")
    
    # Fallback to knowledge-based responses
    user_message_lower = user_message.lower()
    
    if any(greet in user_message_lower for greet in ['hello', 'hi', 'hey', 'greetings']):
        return random.choice(KNOWLEDGE_BASE['greetings'])
    elif any(word in user_message_lower for word in ['can you', 'what can', 'capabilities', 'abilities']):
        return random.choice(KNOWLEDGE_BASE['capabilities'])
    else:
        # Generate a thoughtful fallback response
        return f"{random.choice(KNOWLEDGE_BASE['fallback'])} Your question about '{user_message}' is quite interesting. Based on general knowledge, I'd suggest researching this topic further for the most current information."

def generate_placeholder_image(prompt, style):
    """Generate a placeholder image when API is not available"""
    # Create a simple image with PIL
    width, height = 400, 300
    image = Image.new('RGB', (width, height), color=(30, 30, 30))
    draw = ImageDraw.Draw(image)
    
    # Add some decorative elements based on style
    if style == 'anime':
        # Anime style placeholder
        draw.ellipse([50, 50, 350, 250], outline=(255, 107, 53), width=3)
        draw.ellipse([150, 100, 250, 200], outline=(255, 107, 53), width=2)
    elif style == 'digital-art':
        # Digital art style
        for i in range(0, width, 20):
            draw.line([(i, 0), (i, height)], fill=(50, 50, 50), width=1)
        for i in range(0, height, 20):
            draw.line([(0, i), (width, i)], fill=(50, 50, 50), width=1)
    elif style == 'cartoon':
        # Cartoon style
        draw.rectangle([50, 50, 350, 250], outline=(255, 107, 53), width=4)
        draw.rectangle([100, 100, 300, 200], outline=(255, 107, 53), width=2)
    else:
        # Realistic style
        draw.rectangle([30, 30, 370, 270], outline=(255, 107, 53), width=2)
    
    # Add text
    try:
        font = ImageFont.truetype("arial.ttf", 16)
    except:
        font = ImageFont.load_default()
    
    # Wrap prompt text
    wrapped_text = textwrap.fill(f"Prompt: {prompt[:50]}...", width=40)
    draw.text((20, height - 60), wrapped_text, fill=(255, 255, 255), font=font)
    draw.text((20, height - 30), f"Style: {style}", fill=(255, 107, 53), font=font)
    
    # Convert to base64
    buffered = io.BytesIO()
    image.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def get_image_from_unsplash(prompt, style):
    """Get image from Unsplash API"""
    try:
        if UNSPLASH_ACCESS_KEY and UNSPLASH_ACCESS_KEY != 'your-unsplash-access-key':
            url = "https://api.unsplash.com/search/photos"
            headers = {
                "Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"
            }
            params = {
                "query": prompt,
                "per_page": 1,
                "orientation": "landscape"
            }
            
            response = requests.get(url, headers=headers, params=params)
            data = response.json()
            
            if data.get('results') and len(data['results']) > 0:
                return data['results'][0]['urls']['regular']
    except Exception as e:
        print(f"Unsplash API error: {e}")
    
    return None

@app.route('/chat', methods=['POST'])
def chat():
    """Handle chat messages"""
    try:
        data = request.json
        user_message = data.get('message', '')
        
        if not user_message:
            return jsonify({'error': 'No message provided'}), 400
        
        response = generate_ai_response(user_message)
        
        return jsonify({
            'response': response,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_image', methods=['POST'])
def generate_image():
    """Generate or retrieve an image based on prompt"""
    try:
        data = request.json
        prompt = data.get('prompt', 'AI generated image')
        style = data.get('style', 'realistic')
        
        # Try to get image from Unsplash first
        unsplash_url = get_image_from_unsplash(prompt, style)
        
        if unsplash_url:
            return jsonify({
                'image_url': unsplash_url,
                'source': 'unsplash',
                'prompt': prompt,
                'style': style
            })
        
        # Generate placeholder image
        image_data = generate_placeholder_image(prompt, style)
        
        return jsonify({
            'image_url': image_data,
            'source': 'placeholder',
            'prompt': prompt,
            'style': style,
            'note': 'This is a placeholder image. Add your own API keys for real image generation.'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'Advanced AI Chatbot API',
        'version': '1.0.0'
    })

@app.route('/knowledge', methods=['GET'])
def get_knowledge():
    """Return information about the AI's knowledge base"""
    return jsonify({
        'topics': list(KNOWLEDGE_BASE.keys()),
        'total_responses': sum(len(responses) for responses in KNOWLEDGE_BASE.values()),
        'capabilities': [
            'Natural language conversations',
            'Image generation',
            'Information retrieval',
            'Creative assistance'
        ]
    })

if __name__ == '__main__':
    print("Starting Advanced AI Chatbot Server...")
    print("API Endpoints:")
    print("  POST /chat - Send chat messages")
    print("  POST /generate_image - Generate images")
    print("  GET /health - Health check")
    print("  GET /knowledge - Knowledge base info")
    print("\nNote: Add your API keys in the code for full functionality")
    print("Server running on http://localhost:5000")
    
    app.run(debug=True, port=5000)