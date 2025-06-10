"""
Static file and configuration routes for WarmbOS
Updated for new client folder structure
"""

from flask import send_from_directory, jsonify, request
import json
import os
import tempfile
import shutil
from pathlib import Path

def setup_static_routes(app):
    """Register all static file and configuration routes"""
    
    @app.route('/')
    def index():
        """Serve main desktop page"""
        return send_from_directory('client', 'index.html')

    @app.route('/apps/<path:filename>')
    def serve_app_files(filename):
        """Serve application files from client/apps directory"""
        try:
            return send_from_directory('client/apps', filename)
        except FileNotFoundError:
            return jsonify({"error": f"App file not found: {filename}"}), 404

    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        """Serve asset files from client/assets directory"""
        try:
            return send_from_directory('client/assets', filename)
        except FileNotFoundError:
            return jsonify({"error": f"Asset not found: {filename}"}), 404

    @app.route('/components/<path:filename>')
    def serve_components(filename):
        """Serve component files from client/components directory"""
        try:
            return send_from_directory('client/components', filename)
        except FileNotFoundError:
            return jsonify({"error": f"Component not found: {filename}"}), 404

    @app.route('/config/shortcuts.json')
    def get_shortcuts():
        """Get shortcuts configuration"""
        return send_from_directory('client/config', 'shortcuts.json')

    @app.route('/config/shortcuts.json', methods=['POST'])
    def save_shortcuts():
        """Save shortcuts configuration"""
        try:
            data = request.get_json()
            if not data:
                return jsonify({"error": "No data provided"}), 400
            
            # Validate shortcuts structure
            if not isinstance(data, dict):
                return jsonify({"error": "Shortcuts must be an object"}), 400
            
            config_dir = Path('client/config')
            config_dir.mkdir(exist_ok=True)
            
            # Atomic write with cross-platform handling
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', dir=str(config_dir), delete=False) as temp_file:
                json.dump(data, temp_file, indent=2)
                temp_name = temp_file.name
            
            shortcuts_file = config_dir / 'shortcuts.json'
            # Replace original file
            if shortcuts_file.exists():
                shortcuts_file.unlink()
            shutil.move(temp_name, str(shortcuts_file))
            
            return jsonify({"success": True})
        except Exception as e:
            print(f"Shortcuts save error: {e}")
            return jsonify({"error": str(e)}), 500

    @app.route('/config/settings.json')
    def get_settings():
        """Get application settings"""
        return send_from_directory('client/config', 'settings.json')

    @app.route('/config/settings.json', methods=['POST'])
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
            
            config_dir = Path('client/config')
            config_dir.mkdir(exist_ok=True)
            
            # Atomic write with cross-platform handling
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', dir=str(config_dir), delete=False) as temp_file:
                json.dump(data, temp_file, indent=2)
                temp_name = temp_file.name
            
            settings_file = config_dir / 'settings.json'
            # Replace original file
            if settings_file.exists():
                settings_file.unlink()
            shutil.move(temp_name, str(settings_file))
            
            return jsonify({"success": True})
        except Exception as e:
            print(f"Settings save error: {e}")
            return jsonify({"error": str(e)}), 500

    # Legacy routes for backward compatibility during transition
    @app.route('/shortcuts.json')
    def get_shortcuts_legacy():
        """Legacy shortcuts endpoint - redirect to new location"""
        return get_shortcuts()

    @app.route('/shortcuts.json', methods=['POST'])
    def save_shortcuts_legacy():
        """Legacy shortcuts endpoint - redirect to new location"""
        return save_shortcuts()

    @app.route('/settings.json')
    def get_settings_legacy():
        """Legacy settings endpoint - redirect to new location"""
        return get_settings()

    @app.route('/settings.json', methods=['POST'])
    def save_settings_legacy():
        """Legacy settings endpoint - redirect to new location"""
        return save_settings()

    @app.route('/client/<path:filename>')
    def serve_client_file(filename):
        """Serve client files"""
        return send_from_directory('client', filename)

    @app.route('/<path:filename>')
    def serve_file(filename):
        """Serve any other static file - fallback for compatibility"""
        # Try client directory first
        client_path = Path('client') / filename
        if client_path.exists():
            return send_from_directory('client', filename)
        
        # Fall back to root directory
        return send_from_directory('.', filename)