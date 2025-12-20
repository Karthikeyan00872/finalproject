import os
import datetime 
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from google import genai
from flask_cors import CORS
from pymongo import MongoClient
from pymongo.errors import ServerSelectionTimeoutError, DuplicateKeyError
from werkzeug.security import generate_password_hash, check_password_hash
import base64
import mimetypes
from bson import ObjectId
import json
import re

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
COURSE_COLLECTION = "courses"
QUESTION_COLLECTION = "questions"
PENDING_TUTOR_COLLECTION = "pending_tutors"
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
    
    # Create indexes for courses and questions
    mongo_db[COURSE_COLLECTION].create_index([("tutor_username", 1)])
    mongo_db[COURSE_COLLECTION].create_index([("grade", 1)])
    mongo_db[COURSE_COLLECTION].create_index([("subject", 1)])
    
    mongo_db[QUESTION_COLLECTION].create_index([("tutor_username", 1)])
    mongo_db[QUESTION_COLLECTION].create_index([("grade", 1)])
    mongo_db[QUESTION_COLLECTION].create_index([("subject", 1)])
    
    # Create index for pending tutors
    mongo_db[PENDING_TUTOR_COLLECTION].create_index([("username", 1)], unique=True)
    
    print("Database indexes created successfully")
    
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

def get_pending_tutor(username):
    """Fetches a pending tutor document."""
    pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
    return pending_col.find_one({"username": username})

def validate_tutor(username):
    """Validate if user is an approved tutor."""
    user = get_user(username)
    if not user:
        return False
    
    # Check if user is a tutor and approved
    if user['userType'] == 'tutor':
        # Check approval status
        if 'approval_status' not in user or user['approval_status'] == 'approved':
            return True
        elif user.get('approval_status') == 'pending':
            return False  # Pending tutors cannot access tutor features
    return False

def validate_email(email):
    """Validate email format."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

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

# --- Registration Endpoint (UPDATED for tutor approval system) ---
@app.route('/register', methods=['POST'])
def register():
    """Handles user registration with tutor approval system."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    user_type = data.get('userType')  # student, tutor
    
    print(f"Registration attempt for user: {username}, type: {user_type}")

    if not all([username, password, user_type]):
        print("Missing registration fields")
        return jsonify({"success": False, "message": "Missing username, password, or user type"}), 400

    # Check if user already exists
    if get_user(username):
        print(f"User already exists: {username}")
        return jsonify({"success": False, "message": "User already exists"}), 409

    # Check if user is in pending tutors
    if get_pending_tutor(username):
        print(f"User already has pending tutor application: {username}")
        return jsonify({"success": False, "message": "You already have a pending tutor application"}), 409

    try:
        # Hash the password
        hashed_password = generate_password_hash(password)
        
        if user_type == 'student':
            # For students, create account immediately
            user_col = mongo_db[USER_COLLECTION]
            user_col.insert_one({
                "username": username,
                "password": hashed_password,
                "userType": user_type,
                "createdAt": datetime.datetime.now(),
                "approval_status": "approved"  # Students are auto-approved
            })
            
            print(f"Student registered successfully: {username}")
            return jsonify({
                "success": True, 
                "message": f"Student {username} registered successfully",
                "username": username
            }), 201
            
        elif user_type == 'tutor':
            # For tutors, collect additional information and put in pending queue
            full_name = data.get('fullName', '')
            email = data.get('email', '')
            qualification = data.get('qualification', '')
            experience = data.get('experience', '')
            years_of_experience = data.get('yearsOfExperience', '')
            
            # Validate tutor-specific fields
            if not full_name or not email or not qualification or not years_of_experience:
                return jsonify({"success": False, "message": "Missing required tutor information"}), 400
            
            if not validate_email(email):
                return jsonify({"success": False, "message": "Invalid email format"}), 400
            
            # Store in pending tutors collection
            pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
            pending_col.insert_one({
                "username": username,
                "password": hashed_password,
                "full_name": full_name,
                "email": email,
                "qualification": qualification,
                "experience": experience,
                "years_of_experience": years_of_experience,
                "applied_at": datetime.datetime.now(),
                "status": "pending",
                "reviewed_by": None,
                "reviewed_at": None,
                "rejection_reason": None
            })
            
            print(f"Tutor application submitted for review: {username}")
            return jsonify({
                "success": True, 
                "message": "Tutor application submitted successfully. Please wait for admin approval.",
                "username": username,
                "requires_approval": True
            }), 201
            
        else:
            return jsonify({"success": False, "message": "Invalid user type"}), 400

    except DuplicateKeyError:
        print(f"Duplicate key error for user: {username}")
        return jsonify({"success": False, "message": "User already exists"}), 409
    except Exception as e:
        print(f"Registration Server Error: {e}")
        return jsonify({"success": False, "message": f"Server error: {e}"}), 500

# --- Login Endpoint (UPDATED for tutor approval system) ---
@app.route('/login', methods=['POST'])
def login():
    """Handles user login authentication with tutor approval checks."""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    requested_user_type = data.get('userType')
    
    print(f"Login attempt for user: {username}, requested type: {requested_user_type}")

    if not all([username, password, requested_user_type]):
        print("Missing username, password, or user type")
        return jsonify({"success": False, "message": "Missing username, password, or user type"}), 400

    # First check if user exists in main users collection
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
            
            # For tutors, check approval status
            if user['userType'] == 'tutor':
                approval_status = user.get('approval_status', 'pending')
                
                if approval_status == 'pending':
                    return jsonify({
                        "success": False,
                        "message": "Your tutor application is still pending admin approval. Please wait for approval email.",
                        "approval_status": "pending"
                    }), 403
                elif approval_status == 'rejected':
                    rejection_reason = user.get('rejection_reason', 'No reason provided')
                    return jsonify({
                        "success": False,
                        "message": f"Your tutor application has been rejected. Reason: {rejection_reason}",
                        "approval_status": "rejected"
                    }), 403
            
            print(f"Login successful for {username} as {user['userType']}")
            return jsonify({
                "success": True, 
                "username": user['username'],
                "userType": user['userType'],
                "approval_status": user.get('approval_status', 'approved'),
                "message": "Login successful"
            })
        else:
            print(f"Invalid password for {username}")
            return jsonify({"success": False, "message": "Invalid password"}), 401
    else:
        # Check if user is in pending tutors
        pending_tutor = get_pending_tutor(username)
        if pending_tutor:
            # Check password
            if check_password_hash(pending_tutor['password'], password):
                # User is a pending tutor
                return jsonify({
                    "success": False,
                    "message": "Your tutor application is still pending admin approval. Please wait for approval email.",
                    "approval_status": "pending"
                }), 403
            else:
                return jsonify({"success": False, "message": "Invalid password"}), 401
        else:
            print(f"User not found: {username}")
            return jsonify({"success": False, "message": "User not found"}), 404

# --- Admin Endpoints for Tutor Management ---

@app.route('/admin/pending-tutors', methods=['GET'])
def get_pending_tutors():
    """Get all pending tutor applications (admin only)."""
    try:
        pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
        pending_tutors = list(pending_col.find({"status": "pending"}).sort("applied_at", 1))
        
        # Convert ObjectId and datetime for JSON serialization
        for tutor in pending_tutors:
            tutor['_id'] = str(tutor['_id'])
            tutor['applied_at'] = tutor['applied_at'].isoformat()
            if 'reviewed_at' in tutor and tutor['reviewed_at']:
                tutor['reviewed_at'] = tutor['reviewed_at'].isoformat()
            # Remove password for security
            if 'password' in tutor:
                del tutor['password']
        
        return jsonify({
            "success": True,
            "pending_tutors": pending_tutors,
            "count": len(pending_tutors)
        })
    except Exception as e:
        print(f"Get pending tutors error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/approve-tutor', methods=['POST'])
def approve_tutor():
    """Approve a pending tutor application (admin only)."""
    data = request.get_json()
    username = data.get('username')
    admin_username = data.get('admin_username')
    
    if not username or not admin_username:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    try:
        pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
        user_col = mongo_db[USER_COLLECTION]
        
        # Find the pending tutor
        pending_tutor = pending_col.find_one({"username": username, "status": "pending"})
        if not pending_tutor:
            return jsonify({"success": False, "message": "Pending tutor not found"}), 404
        
        # Create user account from pending tutor data
        user_data = {
            "username": pending_tutor['username'],
            "password": pending_tutor['password'],
            "userType": "tutor",
            "full_name": pending_tutor['full_name'],
            "email": pending_tutor['email'],
            "qualification": pending_tutor['qualification'],
            "experience": pending_tutor.get('experience', ''),
            "years_of_experience": pending_tutor.get('years_of_experience', ''),
            "createdAt": datetime.datetime.now(),
            "approval_status": "approved",
            "approved_by": admin_username,
            "approved_at": datetime.datetime.now()
        }
        
        # Insert into users collection
        user_col.insert_one(user_data)
        
        # Update pending tutor status
        pending_col.update_one(
            {"username": username},
            {
                "$set": {
                    "status": "approved",
                    "reviewed_by": admin_username,
                    "reviewed_at": datetime.datetime.now()
                }
            }
        )
        
        print(f"Tutor {username} approved by {admin_username}")
        return jsonify({
            "success": True,
            "message": f"Tutor {username} approved successfully"
        })
        
    except Exception as e:
        print(f"Approve tutor error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/reject-tutor', methods=['POST'])
def reject_tutor():
    """Reject a pending tutor application (admin only)."""
    data = request.get_json()
    username = data.get('username')
    admin_username = data.get('admin_username')
    rejection_reason = data.get('rejection_reason', 'Application rejected by admin')
    
    if not username or not admin_username:
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    try:
        pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
        user_col = mongo_db[USER_COLLECTION]
        
        # Find the pending tutor
        pending_tutor = pending_col.find_one({"username": username, "status": "pending"})
        if not pending_tutor:
            return jsonify({"success": False, "message": "Pending tutor not found"}), 404
        
        # Create user account with rejected status (for tracking)
        user_data = {
            "username": pending_tutor['username'],
            "password": pending_tutor['password'],
            "userType": "tutor",
            "full_name": pending_tutor['full_name'],
            "email": pending_tutor['email'],
            "qualification": pending_tutor['qualification'],
            "experience": pending_tutor.get('experience', ''),
            "createdAt": datetime.datetime.now(),
            "approval_status": "rejected",
            "rejected_by": admin_username,
            "rejected_at": datetime.datetime.now(),
            "rejection_reason": rejection_reason
        }
        
        # Insert into users collection
        user_col.insert_one(user_data)
        
        # Update pending tutor status
        pending_col.update_one(
            {"username": username},
            {
                "$set": {
                    "status": "rejected",
                    "reviewed_by": admin_username,
                    "reviewed_at": datetime.datetime.now(),
                    "rejection_reason": rejection_reason
                }
            }
        )
        
        print(f"Tutor {username} rejected by {admin_username}. Reason: {rejection_reason}")
        return jsonify({
            "success": True,
            "message": f"Tutor {username} rejected successfully"
        })
        
    except Exception as e:
        print(f"Reject tutor error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/approved-tutors', methods=['GET'])
def get_approved_tutors():
    """Get all approved tutors (admin only)."""
    try:
        user_col = mongo_db[USER_COLLECTION]
        approved_tutors = list(user_col.find({
            "userType": "tutor",
            "approval_status": "approved"
        }).sort("approved_at", -1))
        
        # Convert ObjectId and datetime for JSON serialization
        for tutor in approved_tutors:
            tutor['_id'] = str(tutor['_id'])
            if 'createdAt' in tutor:
                tutor['createdAt'] = tutor['createdAt'].isoformat()
            if 'approved_at' in tutor:
                tutor['approved_at'] = tutor['approved_at'].isoformat()
            # Remove password for security
            if 'password' in tutor:
                del tutor['password']
        
        return jsonify({
            "success": True,
            "approved_tutors": approved_tutors,
            "count": len(approved_tutors)
        })
    except Exception as e:
        print(f"Get approved tutors error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/admin/rejected-tutors', methods=['GET'])
def get_rejected_tutors():
    """Get all rejected tutors (admin only)."""
    try:
        user_col = mongo_db[USER_COLLECTION]
        rejected_tutors = list(user_col.find({
            "userType": "tutor",
            "approval_status": "rejected"
        }).sort("rejected_at", -1))
        
        # Convert ObjectId and datetime for JSON serialization
        for tutor in rejected_tutors:
            tutor['_id'] = str(tutor['_id'])
            if 'createdAt' in tutor:
                tutor['createdAt'] = tutor['createdAt'].isoformat()
            if 'rejected_at' in tutor:
                tutor['rejected_at'] = tutor['rejected_at'].isoformat()
            # Remove password for security
            if 'password' in tutor:
                del tutor['password']
        
        return jsonify({
            "success": True,
            "rejected_tutors": rejected_tutors,
            "count": len(rejected_tutors)
        })
    except Exception as e:
        print(f"Get rejected tutors error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Get Tutor Status Endpoint ---
@app.route('/tutor/status/<username>', methods=['GET'])
def get_tutor_status(username):
    """Get tutor approval status."""
    try:
        user = get_user(username)
        if user and user['userType'] == 'tutor':
            return jsonify({
                "success": True,
                "username": username,
                "approval_status": user.get('approval_status', 'pending'),
                "full_name": user.get('full_name', ''),
                "email": user.get('email', ''),
                "qualification": user.get('qualification', '')
            })
        else:
            # Check pending tutors
            pending_tutor = get_pending_tutor(username)
            if pending_tutor:
                return jsonify({
                    "success": True,
                    "username": username,
                    "approval_status": "pending",
                    "full_name": pending_tutor.get('full_name', ''),
                    "email": pending_tutor.get('email', ''),
                    "qualification": pending_tutor.get('qualification', '')
                })
            else:
                return jsonify({
                    "success": False,
                    "message": "User not found"
                }), 404
    except Exception as e:
        print(f"Get tutor status error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

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
        courses_count = mongo_db[COURSE_COLLECTION].count_documents({})
        questions_count = mongo_db[QUESTION_COLLECTION].count_documents({})
        pending_tutors_count = mongo_db[PENDING_TUTOR_COLLECTION].count_documents({})
        
        return jsonify({
            "success": True,
            "collections": collections,
            "users_count": users_count,
            "chat_count": chat_count,
            "courses_count": courses_count,
            "questions_count": questions_count,
            "pending_tutors_count": pending_tutors_count,
            "database": DB_NAME
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# --- Course Management Endpoints ---

@app.route('/tutor/courses', methods=['POST'])
def add_course():
    """Tutor adds a new course with videos."""
    data = request.get_json()
    username = data.get('username')
    title = data.get('title')
    subject = data.get('subject')
    grade = data.get('grade')
    description = data.get('description', '')
    chapters = data.get('chapters', [])  # Array of chapters with videos
    
    print(f"Course add attempt by tutor: {username}")
    
    if not all([username, title, subject, grade]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    # Verify user is an approved tutor
    if not validate_tutor(username):
        return jsonify({"success": False, "message": "Only approved tutors can add courses"}), 403
    
    # Validate chapters
    if not chapters or len(chapters) == 0:
        return jsonify({"success": False, "message": "At least one chapter is required"}), 400
    
    for chapter in chapters:
        if not chapter.get('title') or not chapter.get('videos'):
            return jsonify({"success": False, "message": "Each chapter must have a title and at least one video"}), 400
    
    try:
        courses_col = mongo_db[COURSE_COLLECTION]
        course_data = {
            "tutor_username": username,
            "title": title,
            "subject": subject,
            "grade": grade,
            "description": description,
            "chapters": chapters,
            "created_at": datetime.datetime.now(),
            "ratings": [],  # Store student ratings
            "enrollments": []  # Store enrolled students
        }
        
        result = courses_col.insert_one(course_data)
        course_id = str(result.inserted_id)
        
        print(f"Course added successfully by {username}, ID: {course_id}")
        return jsonify({
            "success": True,
            "message": "Course added successfully",
            "course_id": course_id
        }), 201
        
    except Exception as e:
        print(f"Add course error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/tutor/courses/<course_id>', methods=['DELETE'])
def delete_course(course_id):
    """Tutor deletes their own course."""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400
    
    try:
        courses_col = mongo_db[COURSE_COLLECTION]
        
        # Verify course exists and belongs to this tutor
        course = courses_col.find_one({"_id": ObjectId(course_id)})
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        if course['tutor_username'] != username:
            return jsonify({"success": False, "message": "You can only delete your own courses"}), 403
        
        result = courses_col.delete_one({"_id": ObjectId(course_id)})
        
        if result.deleted_count > 0:
            print(f"Course deleted: {course_id} by {username}")
            return jsonify({"success": True, "message": "Course deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to delete course"}), 500
            
    except Exception as e:
        print(f"Delete course error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/courses', methods=['GET'])
def get_all_courses():
    """Get all courses for display."""
    try:
        courses_col = mongo_db[COURSE_COLLECTION]
        courses = list(courses_col.find().sort("created_at", -1))
        
        # Convert ObjectId and datetime for JSON
        for course in courses:
            course['_id'] = str(course['_id'])
            course['created_at'] = course['created_at'].isoformat()
            
            # Calculate average rating per chapter
            ratings = course.get('ratings', [])
            chapter_ratings = {}
            for rating in ratings:
                chapter = rating.get('chapter', 0)
                if chapter not in chapter_ratings:
                    chapter_ratings[chapter] = []
                chapter_ratings[chapter].append(rating['rating'])
            
            # Calculate chapter-wise average ratings
            course['chapter_ratings'] = {}
            for chapter_idx in range(len(course.get('chapters', []))):
                if chapter_idx in chapter_ratings:
                    course['chapter_ratings'][chapter_idx] = sum(chapter_ratings[chapter_idx]) / len(chapter_ratings[chapter_idx])
                else:
                    course['chapter_ratings'][chapter_idx] = 0
            
            # Calculate overall average rating
            if ratings:
                course['avg_rating'] = sum(r['rating'] for r in ratings) / len(ratings)
            else:
                course['avg_rating'] = 0
                
            # Count total videos
            total_videos = 0
            for chapter in course.get('chapters', []):
                total_videos += len(chapter.get('videos', []))
            course['total_videos'] = total_videos
            
            # Count enrollments
            course['enrollment_count'] = len(course.get('enrollments', []))
        
        return jsonify({
            "success": True,
            "courses": courses,
            "count": len(courses)
        })
        
    except Exception as e:
        print(f"Get courses error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/courses/enroll', methods=['POST'])
def enroll_in_course():
    """Student enrolls in a course."""
    data = request.get_json()
    username = data.get('username')
    course_id = data.get('course_id')
    
    if not all([username, course_id]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    try:
        courses_col = mongo_db[COURSE_COLLECTION]
        
        # Check if already enrolled
        course = courses_col.find_one({"_id": ObjectId(course_id)})
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        enrollments = course.get('enrollments', [])
        if username in enrollments:
            return jsonify({"success": False, "message": "Already enrolled in this course"}), 409
        
        # Add to enrollments
        courses_col.update_one(
            {"_id": ObjectId(course_id)},
            {"$push": {"enrollments": username}}
        )
        
        print(f"Student {username} enrolled in course {course_id}")
        return jsonify({
            "success": True,
            "message": "Successfully enrolled in course"
        })
        
    except Exception as e:
        print(f"Enrollment error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- FIXED: Rate Course Endpoint ---
@app.route('/courses/rate', methods=['POST'])
def rate_course():
    """Student rates a course chapter."""
    data = request.get_json()
    
    # Debug log
    print(f"Rating data received: {data}")
    
    username = data.get('username')
    course_id = data.get('course_id')
    rating_value = data.get('rating')
    chapter_index = data.get('chapter')  # Which chapter is being rated
    
    # Check all required fields
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
    if not course_id:
        return jsonify({"success": False, "message": "Course ID is required"}), 400
    if rating_value is None:
        return jsonify({"success": False, "message": "Rating value is required"}), 400
    if chapter_index is None:
        return jsonify({"success": False, "message": "Chapter index is required"}), 400
    
    try:
        rating = float(rating_value)
        if rating < 1 or rating > 5:
            return jsonify({"success": False, "message": "Rating must be between 1-5"}), 400
        
        chapter = int(chapter_index)
        
        courses_col = mongo_db[COURSE_COLLECTION]
        
        # Check if course exists
        try:
            course = courses_col.find_one({"_id": ObjectId(course_id)})
        except:
            return jsonify({"success": False, "message": "Invalid course ID format"}), 400
            
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
        
        # Check if chapter exists
        if chapter >= len(course.get('chapters', [])):
            return jsonify({"success": False, "message": "Invalid chapter number"}), 400
        
        # Remove previous rating by this student for this chapter
        courses_col.update_one(
            {"_id": ObjectId(course_id)},
            {"$pull": {"ratings": {"student": username, "chapter": chapter}}}
        )
        
        # Add new rating
        result = courses_col.update_one(
            {"_id": ObjectId(course_id)},
            {"$push": {"ratings": {
                "student": username,
                "chapter": chapter,
                "rating": rating,
                "rated_at": datetime.datetime.now()
            }}}
        )
        
        print(f"Rating added: {username} rated {course_id} chapter {chapter}: {rating} stars")
        return jsonify({
            "success": True, 
            "message": "Rating submitted successfully",
            "rating": rating,
            "chapter": chapter
        })
        
    except ValueError as e:
        print(f"Rating value error: {e}")
        return jsonify({"success": False, "message": "Invalid rating value"}), 400
    except Exception as e:
        print(f"Rating error: {e}")
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

# --- Question Management Endpoints ---

@app.route('/tutor/questions', methods=['POST'])
def add_question():
    """Tutor adds a new question with optional file."""
    data = request.get_json()
    username = data.get('username')
    question_text = data.get('question')
    subject = data.get('subject')
    grade = data.get('grade')
    difficulty = data.get('difficulty', 'medium')
    file_data = data.get('file_data')  # Base64 encoded file
    file_name = data.get('file_name')
    file_type = data.get('file_type')
    
    print(f"Question add attempt by tutor: {username}")
    
    if not all([username, question_text, subject, grade]):
        return jsonify({"success": False, "message": "Missing required fields"}), 400
    
    # Verify user is an approved tutor
    if not validate_tutor(username):
        return jsonify({"success": False, "message": "Only approved tutors can add questions"}), 403
    
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        question_data = {
            "tutor_username": username,
            "question": question_text,
            "subject": subject,
            "grade": grade,
            "difficulty": difficulty,
            "created_at": datetime.datetime.now(),
            "downloads": 0
        }
        
        # Handle file upload if provided
        if file_data and file_name:
            # Store as base64 in database (for demo purposes)
            # In production, save to file system or cloud storage
            question_data['file_data'] = file_data
            question_data['file_name'] = file_name
            question_data['file_type'] = file_type
        
        result = questions_col.insert_one(question_data)
        question_id = str(result.inserted_id)
        
        print(f"Question added successfully by {username}, ID: {question_id}")
        return jsonify({
            "success": True,
            "message": "Question added successfully",
            "question_id": question_id
        }), 201
        
    except Exception as e:
        print(f"Add question error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/tutor/questions/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Tutor deletes their own question."""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400
    
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        
        # Verify question exists and belongs to this tutor
        question = questions_col.find_one({"_id": ObjectId(question_id)})
        if not question:
            return jsonify({"success": False, "message": "Question not found"}), 404
        
        if question['tutor_username'] != username:
            return jsonify({"success": False, "message": "You can only delete your own questions"}), 403
        
        result = questions_col.delete_one({"_id": ObjectId(question_id)})
        
        if result.deleted_count > 0:
            print(f"Question deleted: {question_id} by {username}")
            return jsonify({"success": True, "message": "Question deleted successfully"})
        else:
            return jsonify({"success": False, "message": "Failed to delete question"}), 500
            
    except Exception as e:
        print(f"Delete question error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/questions', methods=['GET'])
def get_all_questions():
    """Get all questions for display."""
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        questions = list(questions_col.find().sort("created_at", -1))
        
        # Convert ObjectId and datetime for JSON
        for question in questions:
            question['_id'] = str(question['_id'])
            question['created_at'] = question['created_at'].isoformat()
            
            # Remove file data from list view to reduce payload
            if 'file_data' in question:
                question['has_file'] = True
                del question['file_data']
            else:
                question['has_file'] = False
        
        return jsonify({
            "success": True,
            "questions": questions,
            "count": len(questions)
        })
        
    except Exception as e:
        print(f"Get questions error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/questions/download/<question_id>', methods=['GET'])
def download_question_file(question_id):
    """Download question file."""
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        question = questions_col.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            return jsonify({"success": False, "message": "Question not found"}), 404
        
        # Increment download count
        questions_col.update_one(
            {"_id": ObjectId(question_id)},
            {"$inc": {"downloads": 1}}
        )
        
        if 'file_data' in question:
            return jsonify({
                "success": True,
                "file_data": question['file_data'],
                "file_name": question.get('file_name', 'question_file'),
                "file_type": question.get('file_type', 'application/octet-stream')
            })
        else:
            # Return question text as file
            return jsonify({
                "success": True,
                "text_content": question['question'],
                "file_name": f"question_{question_id}.txt",
                "file_type": "text/plain"
            })
        
    except Exception as e:
        print(f"Download error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/questions/<question_id>', methods=['GET'])
def get_question_by_id(question_id):
    """Get specific question by ID."""
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        question = questions_col.find_one({"_id": ObjectId(question_id)})
        
        if not question:
            return jsonify({"success": False, "message": "Question not found"}), 404
        
        question['_id'] = str(question['_id'])
        question['created_at'] = question['created_at'].isoformat()
        
        return jsonify({
            "success": True,
            "question": question
        })
        
    except Exception as e:
        print(f"Get question error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Tutor Dashboard Endpoints ---

@app.route('/tutor/dashboard/<username>', methods=['GET'])
def tutor_dashboard(username):
    """Get tutor dashboard statistics."""
    try:
        if not validate_tutor(username):
            return jsonify({"success": False, "message": "User is not an approved tutor"}), 403
        
        courses_col = mongo_db[COURSE_COLLECTION]
        questions_col = mongo_db[QUESTION_COLLECTION]
        
        # Get tutor's courses
        tutor_courses = list(courses_col.find({"tutor_username": username}))
        
        # Get tutor's questions
        tutor_questions = list(questions_col.find({"tutor_username": username}))
        
        # Calculate statistics
        total_courses = len(tutor_courses)
        total_questions = len(tutor_questions)
        
        total_enrollments = sum(len(course.get('enrollments', [])) for course in tutor_courses)
        total_downloads = sum(question.get('downloads', 0) for question in tutor_questions)
        
        # Calculate total ratings
        all_ratings = []
        for course in tutor_courses:
            all_ratings.extend([r['rating'] for r in course.get('ratings', [])])
        
        avg_rating = sum(all_ratings) / len(all_ratings) if all_ratings else 0
        
        # Recent activities
        recent_courses = sorted(tutor_courses, key=lambda x: x['created_at'], reverse=True)[:5]
        recent_questions = sorted(tutor_questions, key=lambda x: x['created_at'], reverse=True)[:5]
        
        # Convert ObjectId and datetime for JSON
        for course in recent_courses:
            course['_id'] = str(course['_id'])
            course['created_at'] = course['created_at'].isoformat()
        
        for question in recent_questions:
            question['_id'] = str(question['_id'])
            question['created_at'] = question['created_at'].isoformat()
        
        return jsonify({
            "success": True,
            "stats": {
                "total_courses": total_courses,
                "total_questions": total_questions,
                "total_enrollments": total_enrollments,
                "total_downloads": total_downloads,
                "avg_rating": round(avg_rating, 2)
            },
            "recent_courses": recent_courses,
            "recent_questions": recent_questions
        })
        
    except Exception as e:
        print(f"Tutor dashboard error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

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
            # Also delete user's chat history, courses, and questions
            chat_col = mongo_db[CHAT_COLLECTION]
            chat_deleted = chat_col.delete_many({"username": username})
            
            courses_col = mongo_db[COURSE_COLLECTION]
            courses_deleted = courses_col.delete_many({"tutor_username": username})
            
            questions_col = mongo_db[QUESTION_COLLECTION]
            questions_deleted = questions_col.delete_many({"tutor_username": username})
            
            # Delete from pending tutors if exists
            pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
            pending_deleted = pending_col.delete_many({"username": username})
            
            print(f"Deleted user {username}: {chat_deleted.deleted_count} chats, {courses_deleted.deleted_count} courses, {questions_deleted.deleted_count} questions, {pending_deleted.deleted_count} pending applications")
            
            return jsonify({
                "success": True,
                "message": f"User {username} deleted successfully",
                "chats_deleted": chat_deleted.deleted_count,
                "courses_deleted": courses_deleted.deleted_count,
                "questions_deleted": questions_deleted.deleted_count
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
        courses_col = mongo_db[COURSE_COLLECTION]
        questions_col = mongo_db[QUESTION_COLLECTION]
        pending_col = mongo_db[PENDING_TUTOR_COLLECTION]
        
        # User counts by type
        total_users = user_col.count_documents({})
        students = user_col.count_documents({"userType": "student"})
        tutors = user_col.count_documents({"userType": "tutor", "approval_status": "approved"})
        admins = user_col.count_documents({"userType": "admin"})
        pending_tutors = pending_col.count_documents({"status": "pending"})
        rejected_tutors = user_col.count_documents({"userType": "tutor", "approval_status": "rejected"})
        
        # Chat stats
        total_chats = chat_col.count_documents({})
        
        # Course stats
        total_courses = courses_col.count_documents({})
        total_enrollments = sum(len(course.get('enrollments', [])) for course in courses_col.find())
        
        # Question stats
        total_questions = questions_col.count_documents({})
        total_downloads = sum(question.get('downloads', 0) for question in questions_col.find())
        
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
                "pending_tutors": pending_tutors,
                "rejected_tutors": rejected_tutors,
                "total_chats": total_chats,
                "total_courses": total_courses,
                "total_enrollments": total_enrollments,
                "total_questions": total_questions,
                "total_downloads": total_downloads,
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
            "createdAt": datetime.datetime.now(),
            "approval_status": "approved"
        })
        
        return jsonify({
            "success": True,
            "message": "Default admin created successfully. Username: admin, Password: admin123"
        }), 201
        
    except Exception as e:
        print(f"Create default admin error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


# --- Update Endpoints ---

@app.route('/tutor/courses/<course_id>', methods=['PUT'])
def update_course(course_id):
    """Update an existing course."""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
        
    try:
        courses_col = mongo_db[COURSE_COLLECTION]
        
        # Verify ownership
        course = courses_col.find_one({"_id": ObjectId(course_id)})
        if not course:
            return jsonify({"success": False, "message": "Course not found"}), 404
            
        if course['tutor_username'] != username:
            return jsonify({"success": False, "message": "Unauthorized: You can only edit your own courses"}), 403
            
        # Fields to update
        update_fields = {}
        if 'title' in data: update_fields['title'] = data['title']
        if 'description' in data: update_fields['description'] = data['description']
        if 'subject' in data: update_fields['subject'] = data['subject']
        if 'grade' in data: update_fields['grade'] = data['grade']
        if 'difficulty' in data: update_fields['difficulty'] = data['difficulty']
        
        # Update timestamp
        update_fields['updated_at'] = datetime.datetime.now()
        
        courses_col.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": update_fields}
        )
        
        return jsonify({"success": True, "message": "Course updated successfully"})
        
    except Exception as e:
        print(f"Update course error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/tutor/questions/<question_id>', methods=['PUT'])
def update_question(question_id):
    """Update an existing question."""
    data = request.get_json()
    username = data.get('username')
    
    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400
        
    try:
        questions_col = mongo_db[QUESTION_COLLECTION]
        
        # Verify ownership
        question = questions_col.find_one({"_id": ObjectId(question_id)})
        if not question:
            return jsonify({"success": False, "message": "Question not found"}), 404
            
        if question['tutor_username'] != username:
            return jsonify({"success": False, "message": "Unauthorized: You can only edit your own questions"}), 403
            
        # Fields to update
        update_fields = {}
        if 'title' in data: update_fields['title'] = data['title']
        if 'question' in data: update_fields['question'] = data['question']
        if 'subject' in data: update_fields['subject'] = data['subject']
        if 'grade' in data: update_fields['grade'] = data['grade']
        if 'difficulty' in data: update_fields['difficulty'] = data['difficulty']
        if 'chapter' in data: update_fields['chapter'] = data['chapter']
        
        # Handle file update if provided
        if 'file_data' in data and data['file_data']:
            update_fields['file_data'] = data['file_data']
            update_fields['file_name'] = data.get('file_name', 'updated_file')
            update_fields['file_type'] = data.get('file_type', 'application/octet-stream')
            update_fields['has_file'] = True
        elif data.get('remove_file'):
            update_fields['file_data'] = None
            update_fields['file_name'] = None
            update_fields['file_type'] = None
            update_fields['has_file'] = False
            
        questions_col.update_one(
            {"_id": ObjectId(question_id)},
            {"$set": update_fields}
        )
        
        return jsonify({"success": True, "message": "Question updated successfully"})
        
    except Exception as e:
        print(f"Update question error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Search Endpoints ---

@app.route('/courses/search', methods=['GET'])
def search_courses():
    """Search courses by keyword, subject, or grade."""
    try:
        keyword = request.args.get('q', '')
        subject = request.args.get('subject', '')
        grade = request.args.get('grade', '')
        
        query = {}
        
        if keyword:
            query['$or'] = [
                {'title': {'$regex': keyword, '$options': 'i'}},
                {'description': {'$regex': keyword, '$options': 'i'}},
                {'tutor_username': {'$regex': keyword, '$options': 'i'}}
            ]
        
        if subject:
            query['subject'] = subject
        
        if grade:
            query['grade'] = grade
        
        courses_col = mongo_db[COURSE_COLLECTION]
        courses = list(courses_col.find(query).sort("created_at", -1))
        
        # Convert ObjectId and datetime for JSON
        for course in courses:
            course['_id'] = str(course['_id'])
            course['created_at'] = course['created_at'].isoformat()
        
        return jsonify({
            "success": True,
            "courses": courses,
            "count": len(courses)
        })
        
    except Exception as e:
        print(f"Search courses error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/questions/search', methods=['GET'])
def search_questions():
    """Search questions by keyword, subject, or grade."""
    try:
        keyword = request.args.get('q', '')
        subject = request.args.get('subject', '')
        grade = request.args.get('grade', '')
        
        query = {}
        
        if keyword:
            query['$or'] = [
                {'question': {'$regex': keyword, '$options': 'i'}},
                {'tutor_username': {'$regex': keyword, '$options': 'i'}}
            ]
        
        if subject:
            query['subject'] = subject
        
        if grade:
            query['grade'] = grade
        
        questions_col = mongo_db[QUESTION_COLLECTION]
        questions = list(questions_col.find(query).sort("created_at", -1))
        
        # Convert ObjectId and datetime for JSON
        for question in questions:
            question['_id'] = str(question['_id'])
            question['created_at'] = question['created_at'].isoformat()
            
            if 'file_data' in question:
                question['has_file'] = True
                del question['file_data']
            else:
                question['has_file'] = False
        
        return jsonify({
            "success": True,
            "questions": questions,
            "count": len(questions)
        })
        
    except Exception as e:
        print(f"Search questions error: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

# --- Server Run ---
if __name__ == '__main__':
    print("=" * 50)
    print("AI Tutor Server Starting...")
    print(f"Backend URL: http://localhost:5000")
    print(f"MongoDB URI: {MONGO_URI}")
    print(f"Database: {DB_NAME}")
    print("=" * 50)
    
    # Create default admin if needed
    try:
        user_col = mongo_db[USER_COLLECTION]
        if not user_col.find_one({"username": "admin"}):
            hashed_password = generate_password_hash("admin123")
            user_col.insert_one({
                "username": "admin",
                "password": hashed_password,
                "userType": "admin",
                "createdAt": datetime.datetime.now(),
                "approval_status": "approved"
            })
            print("Default admin user created: admin / admin123")
    except Exception as e:
        print(f"Failed to create default admin: {e}")
    
    # Running on port 5000
    app.run(debug=True, host='0.0.0.0', port=5000)
