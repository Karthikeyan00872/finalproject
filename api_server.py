# api_server.py - Flask Server for Gemini Chat and MySQL Login

import os
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from google import genai
from flask_cors import CORS
import mysql.connector # Added MySQL connector

# Load environment variables (like the API key) from a .env file
load_dotenv()

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("FATAL: GEMINI_API_KEY not found. Please create a .env file and add your key.")
    exit()

# --- MySQL Database Configuration ---
# *** IMPORTANT: CHANGE THESE VALUES TO MATCH YOUR MYSQL SETUP ***
DB_CONFIG = {
    'user': 'root',        
    'password': 'xx',  
    'host': '127.0.0.1',                
    'database': 'aitutor'  
}
# ------------------------------------


# Initialize the Gemini Client
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception as e:
    print(f"Error initializing Gemini Client: {e}")
    exit()

# Initialize Flask App
app = Flask(__name__)
# Enable CORS to allow your index.html (running locally) to access this server
CORS(app) 

# --- New Login Endpoint ---
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    db_connection = None
    try:
        # Establish connection
        db_connection = mysql.connector.connect(**DB_CONFIG)
        cursor = db_connection.cursor(dictionary=True) 

        # Query the database (In a real app, use hashed passwords and prepared statements)
        query = "SELECT username, user_type FROM users WHERE username = %s AND password = %s"
        cursor.execute(query, (username, password))
        
        user = cursor.fetchone()
        
        if user:
            print(f"User logged in: {username}")
            # user_type is retrieved from the database
            return jsonify({"success": True, "message": "Login successful", "user_type": user.get('user_type', 'student')})
        else:
            return jsonify({"success": False, "message": "Invalid credentials"}), 401

    except mysql.connector.Error as err:
        print(f"Database Error: {err}")
        return jsonify({"success": False, "message": f"Database error: {err}"}), 500
    except Exception as e:
        print(f"Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500
    finally:
        # Close connection
        if db_connection and db_connection.is_connected():
            cursor.close()
            db_connection.close()
            print("MySQL connection closed.")


# --- Existing Chat Endpoint ---
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt = data.get('prompt')

    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    print(f"--- Asking the AI: {prompt} ---")
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash', 
            contents=prompt
        )
        
        return jsonify({"text": response.text})
        
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return jsonify({
            "error": "Failed to generate content from Gemini API.", 
            "details": str(e)
        }), 500

if __name__ == '__main__':
    # Run the server on port 5000 in debug mode
    app.run(debug=True, port=5000)