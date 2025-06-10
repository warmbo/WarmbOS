#!/usr/bin/env python3
"""
WarmbOS - Modular Flask Application
Minimal main file that imports organized modules
"""

from flask import Flask
from flask_cors import CORS
import os
import sys
import argparse

# Import our modular components
from routes.static_routes import setup_static_routes
from routes.api_routes import setup_api_routes
from services.icon_manager import IconManager
from utils.system_utils import create_default_files

def create_app():
    """Application factory pattern"""
    app = Flask(__name__, static_folder='.')
    CORS(app)
    
    # Setup route modules
    setup_static_routes(app)
    setup_api_routes(app)
    
    return app

def init_application():
    """Initialize application data and services"""
    print("Initializing WarmbOS...")
    
    # Create default configuration files
    create_default_files()
    
    # Initialize icon manager and sync if needed
    icon_manager = IconManager()
    status = icon_manager.get_status()
    
    if not status['icons_dir_exists'] or not status['manifest_exists']:
        print("Icons not found, syncing on startup...")
        import threading
        thread = threading.Thread(target=icon_manager.sync_icons)
        thread.daemon = True
        thread.start()

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
    parser = argparse.ArgumentParser(description='WarmbOS - Web Desktop Environment')
    parser.add_argument('--port', type=int, default=5000, help='Port to run on (default: 5000)')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    parser.add_argument('--install-service', action='store_true', help='Install as systemd service (Linux only)')
    
    args = parser.parse_args()
    
    if args.install_service:
        install_systemd_service(args.port)
        sys.exit(0)
    
    print(f"Starting WarmbOS on http://{args.host}:{args.port}")
    
    # Initialize application
    init_application()
    
    # Create and run app
    app = create_app()
    app.run(host=args.host, port=args.port, debug=args.debug)