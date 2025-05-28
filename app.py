#!/usr/bin/env python3
"""
Minimal Flask backend for warmbos-dev web desktop.
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
import json
import os
from pathlib import Path
import platform
import shutil
import socket
import sys
from datetime import datetime
import psutil
import datetime

app = Flask(__name__, static_folder='.')

# Enable CORS for all routes
CORS(app)

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

def get_uptime():
    boot_time = datetime.datetime.fromtimestamp(psutil.boot_time())
    now = datetime.datetime.utcnow()
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
                'server_time': datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC'),
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting WarmbOS Dev server on port {port}")
    print(f"Access at: http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)