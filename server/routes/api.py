"""
API routes for WarmbOS
Updated for new folder structure
"""

from flask import jsonify, send_from_directory, request
from pathlib import Path
import threading

from server.services.icon_manager import IconManager
from server.utils.helpers import get_system_info

# Initialize icon manager
icon_manager = IconManager()

def setup_api_routes(app):
    """Register all API routes"""
    
    @app.route('/api/system')
    def system_info():
        """Get comprehensive system information"""
        try:
            return jsonify(get_system_info())
        except Exception as e:
            print(f"System info error: {e}")
            return jsonify({'error': str(e)}), 500

    # Legacy endpoint for compatibility
    @app.route('/api/system-info')
    def get_system_info_legacy():
        """Legacy system info endpoint"""
        return system_info()

    @app.route('/icons/<path:filename>')
    def serve_icon(filename):
        """Serve icons from the client icons directory"""
        icons_dir = Path("client/assets/icons")
        if icons_dir.exists():
            try:
                return send_from_directory(str(icons_dir), filename)
            except FileNotFoundError:
                print(f"Icon not found: {filename}")
                return jsonify({"error": f"Icon not found: {filename}"}), 404
        else:
            return jsonify({"error": "Icons directory not found. Sync icons first."}), 404

    @app.route('/assets/js/icon-manifest.json')
    def serve_icon_manifest():
        """Serve icon manifest"""
        manifest_file = Path("client/assets/js/icon-manifest.json")
        if manifest_file.exists():
            return send_from_directory(str(manifest_file.parent), manifest_file.name)
        else:
            # Return empty manifest if not found
            return jsonify({"icons": [], "categories": {}, "total_count": 0})

    # Legacy manifest route for compatibility
    @app.route('/js/icon-manifest.json')
    def serve_icon_manifest_legacy():
        """Legacy icon manifest endpoint"""
        return serve_icon_manifest()

    @app.route('/api/icons/status')
    def icons_status():
        """Get icon repository status"""
        return jsonify(icon_manager.get_status())

    @app.route('/api/icons/sync', methods=['POST'])
    def sync_icons():
        """Trigger icon synchronization in background"""
        def sync_in_background():
            icon_manager.sync_icons()
        
        # Start sync in background thread
        thread = threading.Thread(target=sync_in_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({"success": True, "message": "Icon sync started"})