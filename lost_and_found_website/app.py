from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import mysql.connector
from mysql.connector import Error
import os
from datetime import datetime
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Database configuration
DATABASE_CONFIG = {
    'host': 'localhost',
    'database': 'lost_found_db',
    'user': 'root',
    'password': 'balaji@9704403064'  # Your MySQL password
}

# Allowed file extensions for image uploads
# Fixed allowed_file function
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    """Check if file has allowed extension"""
    if not filename or '.' not in filename:
        return False
    
    # Get file extension (everything after the last dot)
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in ALLOWED_EXTENSIONS


def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(**DATABASE_CONFIG)
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def create_tables():
    """Create database tables if they don't exist"""
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor()
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(15),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Categories table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                category_id INT AUTO_INCREMENT PRIMARY KEY,
                category_name VARCHAR(50) NOT NULL,
                description TEXT
            )
        ''')
        
        # Items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS items (
                item_id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                category_id INT NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT NOT NULL,
                item_type ENUM('lost', 'found') NOT NULL,
                location_lost_found VARCHAR(255) NOT NULL,
                date_lost_found DATE NOT NULL,
                contact_info VARCHAR(255),
                reward_amount DECIMAL(10,2) DEFAULT 0.00,
                status ENUM('active', 'claimed', 'expired') DEFAULT 'active',
                views INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (category_id) REFERENCES categories(category_id)
            )
        ''')
        
        # Item images table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS item_images (
                image_id INT AUTO_INCREMENT PRIMARY KEY,
                item_id INT NOT NULL,
                image_path VARCHAR(255) NOT NULL,
                original_name VARCHAR(255) NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE
            )
        ''')
        
        # Insert default categories
        cursor.execute('''
            INSERT IGNORE INTO categories (category_id, category_name, description) VALUES
            (1, 'Electronics', 'Phones, laptops, tablets, etc.'),
            (2, 'Documents', 'ID cards, passports, certificates'),
            (3, 'Keys', 'House keys, car keys, keychains'),
            (4, 'Personal Items', 'Wallets, bags, jewelry'),
            (5, 'Other', 'Miscellaneous items')
        ''')
        
        connection.commit()
        cursor.close()
        connection.close()
        print("Database tables created successfully!")

# Routes
@app.route('/')
def index():
    """Homepage - Display recent items"""
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get recent items with images
        cursor.execute('''
            SELECT i.*, u.username, c.category_name, 
                   img.image_path, img.is_primary
            FROM items i
            JOIN users u ON i.user_id = u.user_id
            JOIN categories c ON i.category_id = c.category_id
            LEFT JOIN item_images img ON i.item_id = img.item_id AND img.is_primary = TRUE
            WHERE i.status = 'active'
            ORDER BY i.created_at DESC
            LIMIT 12
        ''')
        items = cursor.fetchall()
        
        # Get statistics
        cursor.execute('SELECT COUNT(*) as total_items FROM items WHERE status = "active"')
        total_items = cursor.fetchone()['total_items']
        
        cursor.execute('SELECT COUNT(*) as found_items FROM items WHERE item_type = "found" AND status = "active"')
        found_items = cursor.fetchone()['found_items']
        
        cursor.execute('SELECT COUNT(*) as total_users FROM users')
        total_users = cursor.fetchone()['total_users']
        
        cursor.close()
        connection.close()
        
        stats = {
            'total_items': total_items,
            'found_items': found_items,
            'total_users': total_users
        }
        
        return render_template('index.html', items=items, stats=stats)
    
    return render_template('index.html', items=[], stats={})

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']
        full_name = request.form['full_name']
        phone = request.form.get('phone', '')
        
        # Validate input
        if len(username) < 3:
            flash('Username must be at least 3 characters long', 'error')
            return render_template('register.html')
        
        if len(password) < 6:
            flash('Password must be at least 6 characters long', 'error')
            return render_template('register.html')
        
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Check if user already exists
            cursor.execute('SELECT user_id FROM users WHERE username = %s OR email = %s', (username, email))
            if cursor.fetchone():
                flash('Username or email already exists', 'error')
                cursor.close()
                connection.close()
                return render_template('register.html')
            
            # Create new user
            password_hash = generate_password_hash(password)
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, phone)
                VALUES (%s, %s, %s, %s, %s)
            ''', (username, email, password_hash, full_name, phone))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Registration successful! Please log in.', 'success')
            return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor(dictionary=True)
            
            cursor.execute('SELECT * FROM users WHERE username = %s OR email = %s', (username, username))
            user = cursor.fetchone()
            
            if user and check_password_hash(user['password_hash'], password):
                session['user_id'] = user['user_id']
                session['username'] = user['username']
                session['logged_in'] = True
                
                flash('Login successful!', 'success')
                return redirect(url_for('index'))
            else:
                flash('Invalid username or password', 'error')
            
            cursor.close()
            connection.close()
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """User logout"""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

@app.route('/post-item', methods=['GET', 'POST'])
def post_item():
    """Post a new item"""
    if 'logged_in' not in session:
        flash('Please log in to post an item', 'error')
        return redirect(url_for('login'))
    
    if request.method == 'POST':
        title = request.form['title']
        description = request.form['description']
        category_id = int(request.form['category_id'])
        item_type = request.form['item_type']
        location = request.form['location']
        date_lost_found = request.form['date_lost_found']
        contact_info = request.form.get('contact_info', '')
        reward_amount = float(request.form.get('reward_amount', 0))
        
        connection = get_db_connection()
        if connection:
            cursor = connection.cursor()
            
            # Insert item
            cursor.execute('''
                INSERT INTO items (user_id, category_id, title, description, item_type, 
                                 location_lost_found, date_lost_found, contact_info, reward_amount)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ''', (session['user_id'], category_id, title, description, item_type,
                  location, date_lost_found, contact_info, reward_amount))
            
            item_id = cursor.lastrowid
            
            # Handle file uploads
            uploaded_files = request.files.getlist('images')
            for i, file in enumerate(uploaded_files):
                if file and file.filename and allowed_file(file.filename):
                    # Generate unique filename
                    file_extension = file.filename.rsplit('.', 1)[1].lower()
                    unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    
                    # Create upload directory if it doesn't exist
                    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Save image info to database
                    relative_path = f"uploads/{unique_filename}"
                    is_primary = (i == 0)  # First image is primary
                    
                    cursor.execute('''
                        INSERT INTO item_images (item_id, image_path, original_name, is_primary)
                        VALUES (%s, %s, %s, %s)
                    ''', (item_id, relative_path, file.filename, is_primary))
            
            connection.commit()
            cursor.close()
            connection.close()
            
            flash('Item posted successfully!', 'success')
            return redirect(url_for('my_items'))
    
    # Get categories for the form
    connection = get_db_connection()
    categories = []
    if connection:
        cursor = connection.cursor(dictionary=True)
        cursor.execute('SELECT * FROM categories ORDER BY category_name')
        categories = cursor.fetchall()
        cursor.close()
        connection.close()
    
    return render_template('post_item.html', categories=categories)

@app.route('/search')
def search():
    """Search items"""
    search_query = request.args.get('q', '')
    category_id = request.args.get('category', '')
    item_type = request.args.get('type', '')
    location = request.args.get('location', '')
    
    connection = get_db_connection()
    items = []
    categories = []
    
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get categories for filter
        cursor.execute('SELECT * FROM categories ORDER BY category_name')
        categories = cursor.fetchall()
        
        # Build search query
        sql = '''
            SELECT i.*, u.username, c.category_name, 
                   img.image_path, img.is_primary
            FROM items i
            JOIN users u ON i.user_id = u.user_id
            JOIN categories c ON i.category_id = c.category_id
            LEFT JOIN item_images img ON i.item_id = img.item_id AND img.is_primary = TRUE
            WHERE i.status = 'active'
        '''
        params = []
        
        if search_query:
            sql += ' AND (i.title LIKE %s OR i.description LIKE %s)'
            params.extend([f'%{search_query}%', f'%{search_query}%'])
        
        if category_id:
            sql += ' AND i.category_id = %s'
            params.append(category_id)
        
        if item_type:
            sql += ' AND i.item_type = %s'
            params.append(item_type)
        
        if location:
            sql += ' AND i.location_lost_found LIKE %s'
            params.append(f'%{location}%')
        
        sql += ' ORDER BY i.created_at DESC'
        
        cursor.execute(sql, params)
        items = cursor.fetchall()
        
        cursor.close()
        connection.close()
    
    return render_template('search.html', items=items, categories=categories,
                         search_query=search_query, selected_category=category_id,
                         selected_type=item_type, location=location)

@app.route('/item/<int:item_id>')
def item_detail(item_id):
    """Show item details"""
    connection = get_db_connection()
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        # Get item details
        cursor.execute('''
            SELECT i.*, u.username, u.full_name, c.category_name
            FROM items i
            JOIN users u ON i.user_id = u.user_id
            JOIN categories c ON i.category_id = c.category_id
            WHERE i.item_id = %s AND i.status = 'active'
        ''', (item_id,))
        item = cursor.fetchone()
        
        if not item:
            flash('Item not found', 'error')
            return redirect(url_for('index'))
        
        # Get all images for this item
        cursor.execute('''
            SELECT * FROM item_images 
            WHERE item_id = %s 
            ORDER BY is_primary DESC, upload_date ASC
        ''', (item_id,))
        images = cursor.fetchall()
        
        # Update view count
        cursor.execute('UPDATE items SET views = views + 1 WHERE item_id = %s', (item_id,))
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return render_template('item_detail.html', item=item, images=images)
    
    flash('Error loading item', 'error')
    return redirect(url_for('index'))

@app.route('/my-items')
def my_items():
    """Show user's items"""
    if 'logged_in' not in session:
        flash('Please log in to view your items', 'error')
        return redirect(url_for('login'))
    
    connection = get_db_connection()
    items = []
    
    if connection:
        cursor = connection.cursor(dictionary=True)
        
        cursor.execute('''
            SELECT i.*, c.category_name, img.image_path, img.is_primary
            FROM items i
            JOIN categories c ON i.category_id = c.category_id
            LEFT JOIN item_images img ON i.item_id = img.item_id AND img.is_primary = TRUE
            WHERE i.user_id = %s
            ORDER BY i.created_at DESC
        ''', (session['user_id'],))
        items = cursor.fetchall()
        
        cursor.close()
        connection.close()
    
    return render_template('my_items.html', items=items)

if __name__ == '__main__':
    create_tables()
    app.run(debug=True)
