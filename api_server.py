# api_server.py - Flask Server for Gemini Chat and MongoDB Login (Plain-text fix included)

import os
import datetime 
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from google import genai
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import OperationFailure, ServerSelectionTimeoutError
from werkzeug.security import generate_password_hash, check_password_hash

# Load environment variables (like the API key) from a .env file
load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") 

if not GEMINI_API_KEY:
    print("FATAL: GEMINI_API_KEY not found. Please create a .env file and add your key.")
    exit()

# --- MongoDB Database Configuration ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/") 
DB_NAME = os.getenv("DB_NAME", "aitutor")
USER_COLLECTION = "users"
CHAT_COLLECTION = "chat_history"
# ------------------------------------

# Initialize the Gemini Client
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    exit()

# Initialize MongoDB Client and Database
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    mongo_client.admin.command('ping')
    print("Successfully connected to MongoDB.")
    mongo_db = mongo_client[DB_NAME]
except ServerSelectionTimeoutError as e:
    print(f"FATAL: Could not connect to MongoDB. Check if the server is running and MONGO_URI is correct. Details: {e}")
    exit()
except Exception as e:
    print(f"FATAL: An error occurred during MongoDB setup: {e}")
    exit()

# Initialize Flask App
app = Flask(__name__)
CORS(app) 

# --- Registration Endpoint ---
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('user_type', 'student') 
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    try:
        users_col = mongo_db[USER_COLLECTION]
        
        if users_col.find_one({"username": username}):
            return jsonify({"success": False, "message": "User already exists."}), 409
            
        # HASH THE PASSWORD before saving (Recommended for new users)
        hashed_password = generate_password_hash(password)
        
        user_data = {
            "username": username,
            "password": hashed_password,
            "user_type": user_type
        }
        
        users_col.insert_one(user_data)
        
        return jsonify({"success": True, "message": f"{user_type.capitalize()} registration successful."})

    except Exception as e:
        print(f"Registration Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error during registration: {e}"}), 500

# --- Login Endpoint (MODIFIED to handle plain-text or hashed passwords) ---
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    try:
        users_col = mongo_db[USER_COLLECTION]
        user = users_col.find_one({"username": username})
        
        is_authenticated = False
        
        if user:
            db_password = user.get('password')
            
            # 1. Attempt to check against HASHED password (SECURE METHOD)
            if db_password and db_password.startswith(('pbkdf2:sha256', 'sha256', 'bcrypt')):
                if check_password_hash(db_password, password):
                    is_authenticated = True
            
            # 2. Check against PLAIN TEXT password (INSECURE - FOR YOUR CURRENT DB USER)
            if not is_authenticated:
                 if db_password == password:
                    print(f"!!! SECURITY ALERT: User '{username}' logged in with PLAIN TEXT password from DB. Please use the /register endpoint for new users. !!!")
                    is_authenticated = True
                    
        if is_authenticated:
            print(f"User logged in: {username} ({user.get('user_type')})")
            return jsonify({
                "success": True, 
                "message": "Login successful", 
                "username": user.get('username'), 
                "user_type": user.get('user_type') 
            })
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401

    except OperationFailure as err:
        print(f"MongoDB Operation Error: {err}")
        return jsonify({"success": False, "message": f"Database error: {err}"}), 500
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500
        
# --- New History Endpoint (FOR INDIVIDUAL CHAT HISTORY) ---
@app.route('/history', methods=['POST'])
def get_history():
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
        
    try:
        chat_col = mongo_db[CHAT_COLLECTION]
        
        history = chat_col.find(
            {"username": username}, 
            {"_id": 0, "prompt": 1, "response": 1}
        ).sort("timestamp", 1) 
        
        messages = []
        for entry in history:
            messages.append({"text": entry['prompt'], "sender": "user"})
            messages.append({"text": entry['response'], "sender": "bot"})
            
        return jsonify({"success": True, "history": messages})

    except Exception as e:
        print(f"History Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500

# --- Chat Endpoint (MODIFIED to save history) ---
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt = data.get('prompt')
    username = data.get('username') 

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400
    if not username:
        return jsonify({"error": "Username is required for chat history"}), 400 

    try:
        response_obj = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        ai_response_text = response_obj.text
        
        chat_col = mongo_db[CHAT_COLLECTION]
        chat_entry = {
            "username": username,
            "prompt": prompt,
            "response": ai_response_text,
            "timestamp": datetime.datetime.now()
        }
        chat_col.insert_one(chat_entry)
        
        return jsonify({"text": ai_response_text})
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return jsonify({
            "error": "Failed to generate content from Gemini API.", 
            "details": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)