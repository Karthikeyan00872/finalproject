# api_server.py - Flask Server for Gemini Chat and MongoDB Login

import os
import datetime 
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from google import genai
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash

# Load environment variables
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

# Initialize Flask App
app = Flask(__name__)
# Allow cross-origin requests from the frontend
CORS(app) 

# Initialize the Gemini Client
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
    print("Gemini Client initialized successfully")
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    exit()

# Initialize MongoDB Client and Database
try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    mongo_client.admin.command('ping')
    print("Successfully connected to MongoDB.")
    mongo_db = mongo_client[DB_NAME]
    
    # Ensure a unique index on username for the users collection
    mongo_db[USER_COLLECTION].create_index([("username", 1)], unique=True)
    
except ServerSelectionTimeoutError as e:
    print(f"FATAL: Could not connect to MongoDB at {MONGO_URI}. Please ensure MongoDB is running.")
    print(f"Error: {e}")
    exit()
except Exception as e:
    print(f"An unexpected error occurred during MongoDB setup: {e}")
    exit()

# --- Utility Functions ---

def get_user(username):
    """Fetches a user document from MongoDB."""
    user_col = mongo_db[USER_COLLECTION]
    return user_col.find_one({"username": username})

# --- Test Endpoint ---
@app.route('/test', methods=['GET'])
def test():
    """Test endpoint to verify server is running."""
    return jsonify({
        "status": "Server is running",
        "timestamp": datetime.datetime.now().isoformat(),
        "mongo_connected": True,
        "gemini_connected": True
    }), 200

# --- Registration Endpoint ---
@app.route('/register', methods=['POST'])
def register():
    """Handles user registration by hashing the password and storing in MongoDB."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('userType') # student, tutor, admin

    print(f"Registration attempt for user: {username}, type: {user_type}")

    if not all([username, password, user_type]):
        print("Missing registration fields")
        return jsonify({"success": False, "message": "Missing username, password, or user type"}), 400

    if get_user(username):
        print(f"User already exists: {username}")
        return jsonify({"success": False, "message": "User already exists"}), 409

    try:
        # Hash the password before saving
        hashed_password = generate_password_hash(password)
        
        user_col = mongo_db[USER_COLLECTION]
        user_col.insert_one({
            "username": username,
            "password": hashed_password,
            "userType": user_type,
            "createdAt": datetime.datetime.now()
        })

        print(f"User registered successfully: {username}")
        return jsonify({
            "success": True, 
            "message": f"User {username} registered successfully as {user_type}",
            "username": username
        }), 201

    except DuplicateKeyError:
        print(f"Duplicate key error for user: {username}")
        return jsonify({"success": False, "message": "User already exists"}), 409
    except Exception as e:
        print(f"Registration Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500


# --- Login Endpoint ---
@app.route('/login', methods=['POST'])
def login():
    """Handles user login authentication."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    print(f"Login attempt for user: {username}")

    if not all([username, password]):
        print("Missing username or password")
        return jsonify({"success": False, "message": "Missing username or password"}), 400

    user = get_user(username)
    
    if user:
        print(f"User found in database: {username}")
        # Check password against the stored hash
        if check_password_hash(user['password'], password):
            print(f"Password correct for {username}")
            return jsonify({
                "success": True, 
                "username": user['username'],
                "userType": user['userType'],
                "message": "Login successful"
            })
        else:
            print(f"Invalid password for {username}")
            return jsonify({"success": False, "message": "Invalid password"}), 401
    else:
        print(f"User not found: {username}")
        return jsonify({"success": False, "message": "User not found"}), 404

# --- Chat History Endpoint (FIXED) ---
@app.route('/history', methods=['POST'])  # CHANGED to POST
def get_history():
    """Retrieves the chat history for a specific user."""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
    
    print(f"Fetching history for user: {username}")
    
    try:
        chat_col = mongo_db[CHAT_COLLECTION]
        # Find all chat entries, sort by timestamp, and convert to a list
        chat_history = list(chat_col.find({"username": username}).sort("timestamp", 1))
        
        print(f"Found {len(chat_history)} chat entries for {username}")
        
        # Format the history for the frontend
        messages = []
        for entry in chat_history:
            # User's prompt
            messages.append({"text": entry['prompt'], "sender": "user"})
            # AI's response
            messages.append({"text": entry['response'], "sender": "bot"})
            
        return jsonify({"success": True, "history": messages})

    except Exception as e:
        print(f"History Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500

# --- Chat Endpoint (MODIFIED to save history) ---
@app.route('/chat', methods=['POST'])
def chat():
    """Receives a prompt, gets a Gemini response, and saves the interaction."""
    data = request.get_json()
    prompt = data.get('prompt')
    username = data.get('username') 

    print(f"Chat request from user: {username}, prompt length: {len(prompt) if prompt else 0}")

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400
    if not username:
        return jsonify({"error": "Username is required for chat history"}), 400 

    try:
        # Call the Gemini API
        response_obj = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        ai_response_text = response_obj.text
        
        # Save the interaction to the chat history collection
        chat_col = mongo_db[CHAT_COLLECTION]
        chat_entry = {
            "username": username,
            "prompt": prompt,
            "response": ai_response_text,
            "timestamp": datetime.datetime.now()
        }
        chat_col.insert_one(chat_entry)
        
        print(f"Chat saved for {username}, response length: {len(ai_response_text)}")
        return jsonify({"text": ai_response_text})
        
    except Exception as e:
        print(f"Gemini/Chat Server Error: {e}")
        return jsonify({"error": f"An error occurred with the AI service: {e}"}), 500

# --- Test DB Endpoint (ADDED for debugging) ---
@app.route('/test-db', methods=['GET'])
def test_db():
    """Test MongoDB connection and collections."""
    try:
        collections = mongo_db.list_collection_names()
        users_count = mongo_db[USER_COLLECTION].count_documents({})
        chat_count = mongo_db[CHAT_COLLECTION].count_documents({})
        
        return jsonify({
            "success": True,
            "collections": collections,
            "users_count": users_count,
            "chat_count": chat_count,
            "database": DB_NAME
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- Server Run ---
if __name__ == '__main__':
    print("=" * 50)
    print("AI Tutor Server Starting...")
    print(f"Backend URL: http://localhost:5000")
    print(f"MongoDB URI: {MONGO_URI}")
    print(f"Database: {DB_NAME}")
    print("=" * 50)
    
    # Running on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)