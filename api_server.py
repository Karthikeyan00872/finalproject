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


# --- Login Endpoint (FIXED with user type validation) ---
@app.route('/login', methods=['POST'])
def login():
    """Handles user login authentication with user type validation."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    requested_user_type = data.get('userType')  # The type the user is trying to log in as
    
    print(f"Login attempt for user: {username}, requested type: {requested_user_type}")

    if not all([username, password, requested_user_type]):
        print("Missing username, password, or user type")
        return jsonify({"success": False, "message": "Missing username, password, or user type"}), 400

    user = get_user(username)
    
    if user:
        print(f"User found in database: {username}, actual type: {user['userType']}")
        
        # Check password against the stored hash
        if check_password_hash(user['password'], password):
            # Verify the user is logging in with the correct user type
            if user['userType'] != requested_user_type:
                print(f"User type mismatch: {username} is a {user['userType']}, not {requested_user_type}")
                return jsonify({
                    "success": False, 
                    "message": f"You are registered as a {user['userType']}. Please use the {user['userType']} login."
                }), 403
            
            print(f"Login successful for {username} as {user['userType']}")
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

# --- Chat History Endpoint ---
@app.route('/history', methods=['POST'])
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

# --- Chat Endpoint ---
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

# --- Test DB Endpoint ---
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

# --- Admin Endpoints ---

@app.route('/admin/users', methods=['GET'])
def get_all_users():
    """Admin endpoint to get all users (requires admin authentication)."""
    try:
        # In production, you should add authentication/authorization here
        # For now, we'll assume it's called from admin dashboard
        
        user_col = mongo_db[USER_COLLECTION]
        # Exclude passwords for security
        users = list(user_col.find({}, {'password': 0}))
        
        # Convert ObjectId to string for JSON serialization
        for user in users:
            user['_id'] = str(user['_id'])
            if 'createdAt' in user:
                user['createdAt'] = user['createdAt'].isoformat()
        
        return jsonify({
            "success": True,
            "users": users,
            "count": len(users)
        })
    except Exception as e:
        print(f"Admin users error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/users/<username>', methods=['DELETE'])
def delete_user(username):
    """Admin endpoint to delete a user."""
    try:
        # In production, add admin authentication here
        
        user_col = mongo_db[USER_COLLECTION]
        result = user_col.delete_one({"username": username})
        
        if result.deleted_count > 0:
            # Also delete user's chat history
            chat_col = mongo_db[CHAT_COLLECTION]
            chat_deleted = chat_col.delete_many({"username": username})
            
            print(f"Deleted user {username} and {chat_deleted.deleted_count} chat messages")
            
            return jsonify({
                "success": True,
                "message": f"User {username} deleted successfully",
                "chats_deleted": chat_deleted.deleted_count
            })
        else:
            return jsonify({"success": False, "message": "User not found"}), 404
    except Exception as e:
        print(f"Delete user error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/chats/count', methods=['GET'])
def get_chat_count():
    """Get total number of chat sessions."""
    try:
        chat_col = mongo_db[CHAT_COLLECTION]
        count = chat_col.count_documents({})
        
        return jsonify({
            "success": True,
            "count": count
        })
    except Exception as e:
        print(f"Chat count error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    """Get comprehensive admin statistics."""
    try:
        user_col = mongo_db[USER_COLLECTION]
        chat_col = mongo_db[CHAT_COLLECTION]
        
        # User counts by type
        total_users = user_col.count_documents({})
        students = user_col.count_documents({"userType": "student"})
        tutors = user_col.count_documents({"userType": "tutor"})
        admins = user_col.count_documents({"userType": "admin"})
        
        # Chat stats
        total_chats = chat_col.count_documents({})
        
        # Recent activity (last 5 users)
        recent_users = list(user_col.find(
            {}, 
            {'password': 0}
        ).sort("createdAt", -1).limit(5))
        
        # Convert ObjectId to string for JSON serialization
        for user in recent_users:
            user['_id'] = str(user['_id'])
            if 'createdAt' in user:
                user['createdAt'] = user['createdAt'].isoformat()
        
        return jsonify({
            "success": True,
            "stats": {
                "total_users": total_users,
                "students": students,
                "tutors": tutors,
                "admins": admins,
                "total_chats": total_chats,
                "recent_users": recent_users
            }
        })
    except Exception as e:
        print(f"Admin stats error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/chats', methods=['GET'])
def get_all_chats():
    """Get all chat sessions (for admin viewing)."""
    try:
        chat_col = mongo_db[CHAT_COLLECTION]
        # Get last 100 chats
        chats = list(chat_col.find().sort("timestamp", -1).limit(100))
        
        # Convert ObjectId and datetime for JSON serialization
        for chat in chats:
            chat['_id'] = str(chat['_id'])
            if 'timestamp' in chat:
                chat['timestamp'] = chat['timestamp'].isoformat()
        
        return jsonify({
            "success": True,
            "chats": chats,
            "count": len(chats)
        })
    except Exception as e:
        print(f"Get all chats error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Create Default Admin User Endpoint (for setup) ---
@app.route('/admin/create-default', methods=['POST'])
def create_default_admin():
    """Create a default admin user for initial setup."""
    try:
        # Check if admin already exists
        user_col = mongo_db[USER_COLLECTION]
        existing_admin = user_col.find_one({"username": "admin"})
        
        if existing_admin:
            return jsonify({
                "success": False,
                "message": "Admin user already exists"
            }), 409
        
        # Create default admin
        hashed_password = generate_password_hash("admin123")
        user_col.insert_one({
            "username": "admin",
            "password": hashed_password,
            "userType": "admin",
            "createdAt": datetime.datetime.now()
        })
        
        return jsonify({
            "success": True,
            "message": "Default admin created successfully. Username: admin, Password: admin123"
        }), 201
        
    except Exception as e:
        print(f"Create default admin error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Server Run ---
if __name__ == '__main__':
    print("=" * 50)
    print("AI Tutor Server Starting...")
    print(f"Backend URL: http://localhost:5000")
    print(f"MongoDB URI: {MONGO_URI}")
    print(f"Database: {DB_NAME}")
    print("=" * 50)
    
    # Create default admin if needed (uncomment if needed)
    # try:
    #     user_col = mongo_db[USER_COLLECTION]
    #     if not user_col.find_one({"username": "admin"}):
    #         hashed_password = generate_password_hash("admin123")
    #         user_col.insert_one({
    #             "username": "admin",
    #             "password": hashed_password,
    #             "userType": "admin",
    #             "createdAt": datetime.datetime.now()
    #         })
    #         print("Default admin user created: admin / admin123")
    # except Exception as e:
    #     print(f"Failed to create default admin: {e}")
    
    # Running on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)