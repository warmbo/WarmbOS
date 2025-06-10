"""
Static file and configuration routes for WarmbOS
Handles serving files, settings, and shortcuts
"""

from flask import send_from_directory, jsonify, request
import json
import os
import tempfile
import shutil

def setup_static_routes(app):
    """Register all static file and configuration routes"""
    
    @app.route('/')
    def index():
        """Serve main desktop page"""
        return send_from_directory('.', 'desktop.html')

    @app.route('/shortcuts.json')
    def get_shortcuts():
        """Get shortcuts configuration"""
        return send_from_directory('.', 'shortcuts.json')

    @app.route('/shortcuts.json', methods=['POST'])
    def save_shortcuts():
        """Save shortcuts configuration"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Validate shortcuts structure
            if not isinstance(data, dict):
                return jsonify({"error": "Shortcuts must be an object"}), 400
            
            # Atomic write with cross-platform handling
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', dir='.', delete=False) as temp_file:
                json.dump(data, temp_file, indent=2)
                temp_name = temp_file.name
            
            # Replace original file
            if os.path.exists('shortcuts.json'):
                os.remove('shortcuts.json')
            shutil.move(temp_name, 'shortcuts.json')
            
            return jsonify({"success": True})
        except Exception as e:
            print(f"Shortcuts save error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route('/settings.json')
    def get_settings():
        """Get application settings"""
        return send_from_directory('.', 'settings.json')

    @app.route('/settings.json', methods=['POST'])
    def save_settings():
        """Save application settings"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Validate settings structure
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
            
            # Atomic write with cross-platform handling
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', dir='.', delete=False) as temp_file:
                json.dump(data, temp_file, indent=2)
                temp_name = temp_file.name
            
            # Replace original file
            if os.path.exists('settings.json'):
                os.remove('settings.json')
            shutil.move(temp_name, 'settings.json')
            
            return jsonify({"success": True})
        except Exception as e:
            print(f"Settings save error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route('/<path:filename>')
    def serve_file(filename):
        """Serve any other static file"""
        return send_from_directory('.', filename)