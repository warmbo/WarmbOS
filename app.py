#!/usr/bin/env python3
"""
Minimal Flask backend for warmbos-dev web desktop with integrated icon management.
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import json
import os
import re
from pathlib import Path
import platform
import shutil
import socket
import sys
from datetime import datetime
import psutil
import subprocess
import threading
import tempfile
import urllib.request

app = Flask(__name__, static_folder='.')

# Enable CORS for all routes
CORS(app)

# Icon management configuration
ICONS_REPO_URL = "https://github.com/selfhst/icons/archive/refs/heads/main.zip"
ICONS_DIR = Path("icons")
ICON_MANIFEST_FILE = Path("js/icon-manifest.json")

class IconManager:
    """Manages icon library synchronization and manifest generation"""
    
    def __init__(self):
        self.sync_lock = threading.Lock()
        self.sync_status = {"status": "idle", "progress": 0, "message": ""}
    
    def get_status(self):
        """Get current icon library status"""
        status = {
            "icons_dir_exists": ICONS_DIR.exists(),
            "manifest_exists": ICON_MANIFEST_FILE.exists(),
            "icon_count": 0,
            "last_sync": None,
            "sync_status": self.sync_status.copy()
        }
        
        if status["manifest_exists"]:
            try:
                with open(ICON_MANIFEST_FILE, 'r') as f:
                    manifest = json.load(f)
                    status["icon_count"] = manifest.get("total_count", 0)
            except:
                pass
        
        if status["icons_dir_exists"]:
            try:
                stat = ICONS_DIR.stat()
                status["last_sync"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except:
                pass
        
        return status
    
    def sync_icons(self):
        """Download and sync icons from selfhst/icons repository"""
        with self.sync_lock:
            try:
                self.sync_status = {"status": "downloading", "progress": 10, "message": "Downloading icons..."}
                
                # Create temp directory
                with tempfile.TemporaryDirectory() as temp_dir:
                    zip_path = Path(temp_dir) / "icons.zip"
                    
                    # Download the repository
                    self.sync_status["message"] = "Downloading repository..."
                    urllib.request.urlretrieve(ICONS_REPO_URL, zip_path)
                    
                    self.sync_status = {"status": "extracting", "progress": 30, "message": "Extracting files..."}
                    
                    # Extract zip file
                    import zipfile
                    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(temp_dir)
                    
                    # Find the extracted directory (should be icons-main)
                    extracted_dir = None
                    for item in Path(temp_dir).iterdir():
                        if item.is_dir() and item.name.startswith('icons-'):
                            extracted_dir = item
                            break
                    
                    if not extracted_dir:
                        raise Exception("Could not find extracted icons directory")
                    
                    self.sync_status = {"status": "installing", "progress": 50, "message": "Installing icons..."}
                    
                    # Remove old icons directory if it exists
                    if ICONS_DIR.exists():
                        shutil.rmtree(ICONS_DIR)
                    
                    # Move extracted directory to icons
                    shutil.move(str(extracted_dir), str(ICONS_DIR))
                    
                    self.sync_status = {"status": "generating", "progress": 70, "message": "Generating manifest..."}
                    
                    # Generate manifest
                    self.generate_manifest()
                    
                    self.sync_status = {"status": "complete", "progress": 100, "message": "Icons synchronized successfully!"}
                    
                    return True
                    
            except Exception as e:
                self.sync_status = {"status": "error", "progress": 0, "message": f"Sync failed: {str(e)}"}
                return False
    
    def generate_manifest(self):
        """Generate icon manifest for the web interface"""
        manifest = {
            "categories": {},
            "icons": [],
            "total_count": 0
        }
        
        # Icon categorization patterns
        categories = {
            "applications": ["app", "application", "software", "program"],
            "system": ["system", "settings", "config", "admin", "gear", "wrench"],
            "network": ["network", "wifi", "internet", "web", "cloud", "server"],
            "media": ["media", "music", "video", "audio", "play", "sound"],
            "files": ["file", "folder", "document", "doc", "pdf", "text"],
            "communication": ["mail", "email", "chat", "message", "phone", "call"],
            "games": ["game", "gaming", "controller", "play"],
            "graphics": ["image", "photo", "picture", "graphics", "design"],
            "office": ["office", "word", "excel", "powerpoint", "calc", "writer"],
            "development": ["code", "dev", "programming", "terminal", "git"],
            "security": ["security", "lock", "key", "shield", "firewall"],
            "utilities": ["utility", "tool", "calculator", "archive", "zip"]
        }
        
        def categorize_icon(filename):
            """Categorize icon based on filename"""
            name_lower = filename.lower()
            for category, keywords in categories.items():
                if any(keyword in name_lower for keyword in keywords):
                    return category
            return "misc"
        
        print(f"Scanning icons in: {ICONS_DIR}")
        
        # Scan for icons
        for icon_path in ICONS_DIR.rglob("*.svg"):
            if icon_path.is_file():
                try:
                    # Get relative path from icons directory
                    relative_path = icon_path.relative_to(ICONS_DIR)
                    
                    # Convert to string with forward slashes (cross-platform)
                    relative_path_str = str(relative_path).replace(os.sep, '/')
                    
                    filename = icon_path.stem
                    category = categorize_icon(filename)
                    
                    # Clean up the name for display
                    display_name = re.sub(r'[-_]', ' ', filename).title()
                    
                    # Ensure the path starts with /icons/ and uses forward slashes
                    clean_path = f"/icons/{relative_path_str}"
                    
                    print(f"Processing: {icon_path} -> {clean_path}")  # Debug
                    
                    icon_data = {
                        "name": display_name,
                        "filename": filename,
                        "path": clean_path,
                        "category": category,
                        "type": "svg"
                    }
                    
                    manifest["icons"].append(icon_data)
                    
                    if category not in manifest["categories"]:
                        manifest["categories"][category] = []
                    manifest["categories"][category].append(icon_data)
                    
                except Exception as e:
                    print(f"Error processing icon {icon_path}: {e}")
                    continue
        
        # Also scan for PNG icons
        for icon_path in ICONS_DIR.rglob("*.png"):
            if icon_path.is_file():
                try:
                    relative_path = icon_path.relative_to(ICONS_DIR)
                    relative_path_str = str(relative_path).replace(os.sep, '/')
                    filename = icon_path.stem
                    category = categorize_icon(filename)
                    
                    display_name = re.sub(r'[-_]', ' ', filename).title()
                    clean_path = f"/icons/{relative_path_str}"
                    
                    icon_data = {
                        "name": display_name,
                        "filename": filename,
                        "path": clean_path,
                        "category": category,
                        "type": "png"
                    }
                    
                    manifest["icons"].append(icon_data)
                    
                    if category not in manifest["categories"]:
                        manifest["categories"][category] = []
                    manifest["categories"][category].append(icon_data)
                    
                except Exception as e:
                    print(f"Error processing icon {icon_path}: {e}")
                    continue
        
        manifest["total_count"] = len(manifest["icons"])
        
        # Sort icons by name within each category
        for category in manifest["categories"]:
            manifest["categories"][category].sort(key=lambda x: x["name"])
        
        # Sort main icons list
        manifest["icons"].sort(key=lambda x: x["name"])
        
        # Ensure js directory exists
        ICON_MANIFEST_FILE.parent.mkdir(exist_ok=True)
        
        # Write manifest with proper encoding
        with open(ICON_MANIFEST_FILE, "w", encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        print(f"Generated manifest with {manifest['total_count']} icons")
        
        # Debug: Print a few sample paths
        if manifest["icons"]:
            print("Sample icon paths:")
            for icon in manifest["icons"][:5]:
                print(f"  {icon['name']}: {icon['path']}")


# Initialize icon manager
icon_manager = IconManager()

@app.route('/')
def index():
    return send_from_directory('.', 'desktop.html')

@app.route('/shortcuts.json')
def get_shortcuts():
    return send_from_directory('.', 'shortcuts.json')

@app.route('/shortcuts.json', methods=['POST'])
def save_shortcuts():
    try:
        data = request.get_json()
        with open('shortcuts.json', 'w') as f:
            json.dump(data, f, indent=2)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/settings.json')
def get_settings():
    return send_from_directory('.', 'settings.json')

@app.route('/settings.json', methods=['POST'])
def save_settings():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # More flexible validation
        allowed_keys = {'backgroundImage', 'preferences'}
        if not any(key in allowed_keys for key in data.keys()):
            return jsonify({"error": "Invalid settings structure"}), 400
        
        # Validate URL format for backgroundImage if present and not empty
        if 'backgroundImage' in data and data['backgroundImage']:
            url = data['backgroundImage'].strip()
            if url and not (url.startswith('http://') or url.startswith('https://') or url.startswith('/')):
                return jsonify({"error": "Invalid background image URL"}), 400
        
        # Ensure preferences structure if present
        if 'preferences' in data and data['preferences']:
            prefs = data['preferences']
            if not isinstance(prefs, dict):
                return jsonify({"error": "Preferences must be an object"}), 400
        
        # Atomic write with Windows-compatible handling
        import tempfile
        import shutil
        
        # Create temp file in same directory
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', dir='.', delete=False) as temp_file:
            json.dump(data, temp_file, indent=2)
            temp_name = temp_file.name
        
        # Replace original file
        if os.path.exists('settings.json'):
            os.remove('settings.json')
        shutil.move(temp_name, 'settings.json')
        
        return jsonify({"success": True})
    except Exception as e:
        print(f"Settings save error: {e}")  # Debug logging
        return jsonify({"error": str(e)}), 500

@app.route('/icons/<path:filename>')
def serve_icon(filename):
    """Serve icons from the icons directory"""
    if ICONS_DIR.exists():
        return send_from_directory(str(ICONS_DIR), filename)
    else:
        return jsonify({"error": "Icons directory not found. Sync icons first."}), 404

@app.route('/js/icon-manifest.json')
def serve_icon_manifest():
    """Serve icon manifest"""
    if ICON_MANIFEST_FILE.exists():
        return send_from_directory(str(ICON_MANIFEST_FILE.parent), ICON_MANIFEST_FILE.name)
    else:
        # Return empty manifest if not found
        return jsonify({"icons": [], "categories": {}, "total_count": 0})

@app.route('/api/icons/status')
def icons_status():
    """Check icon repository status"""
    return jsonify(icon_manager.get_status())

@app.route('/api/icons/sync', methods=['POST'])
def sync_icons():
    """API endpoint to trigger icon synchronization"""
    def sync_in_background():
        icon_manager.sync_icons()
    
    # Start sync in background thread
    thread = threading.Thread(target=sync_in_background)
    thread.daemon = True
    thread.start()
    
    return jsonify({"success": True, "message": "Icon sync started"})

def get_uptime():
    boot_time = datetime.fromtimestamp(psutil.boot_time())
    now = datetime.utcnow()
    uptime = now - boot_time
    return str(uptime).split('.')[0]  # Format like '1 day, 2:34:56'

@app.route('/api/system')
def system_info():
    """System information endpoint with comprehensive metrics"""
    try:
        # Get disk usage
        total, used, free = shutil.disk_usage('.')
        
        # Get network info
        hostname = socket.gethostname()
        try:
            fqdn = socket.getfqdn()
        except:
            fqdn = hostname
        
        # Get processor info with fallback
        processor = platform.processor()
        if not processor:
            processor = 'Unknown'
        
        return jsonify({
            'os': {
                'system': platform.system(),
                'release': platform.release(),
                'version': platform.version(),
                'machine': platform.machine(),
                'processor': processor
            },
            'python': {
                'version': platform.python_version(),
                'implementation': platform.python_implementation(),
                'executable': sys.executable
            },
            'disk': {
                'total_gb': round(total / (1024**3), 1),
                'used_gb': round(used / (1024**3), 1),
                'free_gb': round(free / (1024**3), 1),
                'percent': round((used / total) * 100, 1)
            },
            'network': {
                'hostname': hostname,
                'fqdn': fqdn
            },
            'warmbos': {
                'version': '1.0.0-dev',
                'server_time': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
                'uptime': get_uptime()
            }
        })
    except Exception as e:
        print(f"System info error: {e}")
        return jsonify({'error': str(e)}), 500

# Legacy endpoint for compatibility
@app.route('/api/system-info')
def get_system_info():
    return system_info()

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

# Auto-sync icons on startup if they don't exist
def init_icons():
    """Initialize icons on startup if they don't exist"""
    if not ICONS_DIR.exists() or not ICON_MANIFEST_FILE.exists():
        print("Icons not found, syncing on startup...")
        thread = threading.Thread(target=icon_manager.sync_icons)
        thread.daemon = True
        thread.start()

def create_default_files():
    """Create default settings and shortcuts if they don't exist"""
    
    # Create default settings.json
    if not os.path.exists('settings.json'):
        default_settings = {
            "backgroundImage": "https://w.wallhaven.cc/full/x6/wallhaven-x6mjlo.png",
            "preferences": {
                "theme": "dark",
                "fontSize": 14,
                "language": "en-US"
            }
        }
        with open('settings.json', 'w') as f:
            json.dump(default_settings, f, indent=2)
        print("Created default settings.json")
    
    # Create default shortcuts.json
    if not os.path.exists('shortcuts.json'):
        default_shortcuts = {
            "desktop": [
                {
                    "title": "My Computer",
                    "contentPath": "/apps/computer.html",
                    "iconUrl": "https://img.icons8.com/?size=100&id=iCwcOoy8tOGw&format=png&color=000000"
                },
                {
                    "title": "Settings",
                    "contentPath": "/apps/settings.html",
                    "iconUrl": "https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000"
                },
                {
                    "title": "My Notes",
                    "iconUrl": "https://img.icons8.com/?size=100&id=JWpT8cAn8G0V&format=png&color=000000",
                    "contentPath": "/apps/notes.html"
                }
            ],
            "taskbar": [],
            "startMenu": [
                {
                    "title": "My Computer",
                    "iconUrl": "https://img.icons8.com/?size=100&id=iCwcOoy8tOGw&format=png&color=000000",
                    "contentPath": "/apps/computer.html"
                },
                {
                    "title": "Settings",
                    "iconUrl": "https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000",
                    "contentPath": "/apps/settings.html"
                },
                {
                    "title": "My Notes",
                    "iconUrl": "https://img.icons8.com/?size=100&id=JWpT8cAn8G0V&format=png&color=000000",
                    "contentPath": "/apps/notes.html"
                }
            ]
        }
        with open('shortcuts.json', 'w') as f:
            json.dump(default_shortcuts, f, indent=2)
        print("Created default shortcuts.json")

def install_systemd_service(port=5000):
    """Install WarmbOS as a systemd service (Linux only)"""
    import getpass
    import subprocess
    
    try:
        current_user = getpass.getuser()
        working_dir = os.getcwd()
        python_path = sys.executable
        
        service_content = f"""[Unit]
Description=WarmbOS - Web Desktop Environment
After=network.target
Wants=network.target

[Service]
Type=exec
User={current_user}
Group={current_user}
WorkingDirectory={working_dir}
Environment=PATH={os.path.dirname(python_path)}
Environment=PORT={port}
ExecStart={python_path} {os.path.join(working_dir, 'app.py')} --port {port}
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
"""
        
        service_file = '/etc/systemd/system/warmbos.service'
        
        # Write service file (requires sudo)
        print("Installing systemd service...")
        print("This requires sudo privileges.")
        
        process = subprocess.run(['sudo', 'tee', service_file], 
                               input=service_content, text=True, 
                               capture_output=True)
        
        if process.returncode != 0:
            print(f"Failed to create service file: {process.stderr}")
            return
        
        # Reload systemd and enable service
        subprocess.run(['sudo', 'systemctl', 'daemon-reload'])
        subprocess.run(['sudo', 'systemctl', 'enable', 'warmbos'])
        subprocess.run(['sudo', 'systemctl', 'start', 'warmbos'])
        
        print("✓ WarmbOS service installed and started!")
        print(f"✓ Access at: http://localhost:{port}")
        print("✓ Service will start automatically on boot")
        print()
        print("Service commands:")
        print("  sudo systemctl status warmbos   # Check status")
        print("  sudo systemctl stop warmbos     # Stop service")
        print("  sudo systemctl start warmbos    # Start service")
        print("  sudo systemctl restart warmbos  # Restart service")
        
    except Exception as e:
        print(f"Failed to install service: {e}")
        print("You can still run WarmbOS manually with: python app.py")

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='WarmbOS - Web Desktop Environment')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on (default: 5000)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    parser.add_argument('--install-service', action='store_true', help='Install as systemd service (Linux only)')
    
    args = parser.parse_args()
    
    if args.install_service:
        install_systemd_service(args.port)
        exit(0)
    
    print(f"Starting WarmbOS on http://{args.host}:{args.port}")
    print("Features:")
    print("  ✓ Integrated icon library (1000+ icons)")
    print("  ✓ Visual icon picker in settings")
    print("  ✓ Automatic icon sync on startup")
    print("  ✓ Web-based desktop environment")
    print()
    print("Access your desktop at the URL above!")
    
    # Ensure default files exist
    create_default_files()
    
    # Initialize icons
    init_icons()
    
    app.run(host=args.host, port=args.port, debug=args.debug)