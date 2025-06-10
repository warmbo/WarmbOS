"""
System utilities for WarmbOS
Updated for new client folder structure
"""

import json
import os
import platform
import shutil
import socket
import sys
from datetime import datetime
from pathlib import Path
import psutil

def get_system_info():
    """Get comprehensive system information"""
    try:
        # Get disk usage
        total, used, free = shutil.disk_usage('.')
        
        # Get network info
        hostname = socket.gethostname()
        try:
            fqdn = socket.getfqdn()
        except Exception:
            fqdn = hostname
        
        # Get processor info with fallback
        processor = platform.processor()
        if not processor:
            processor = 'Unknown'
        
        return {
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
        }
    except Exception as e:
        raise Exception(f"Failed to gather system info: {str(e)}")

def get_uptime():
    """Get system uptime"""
    try:
        boot_time = datetime.fromtimestamp(psutil.boot_time())
        now = datetime.utcnow()
        uptime = now - boot_time
        return str(uptime).split('.')[0]  # Format like '1 day, 2:34:56'
    except Exception:
        return 'Unknown'

def create_default_files():
    """Create default settings and shortcuts files if they don't exist"""
    
    # Ensure client/config directory exists
    config_dir = Path('client/config')
    config_dir.mkdir(parents=True, exist_ok=True)
    
    # Create default settings.json
    settings_file = config_dir / 'settings.json'
    if not settings_file.exists():
        default_settings = {
            "backgroundImage": "https://w.wallhaven.cc/full/x6/wallhaven-x6mjlo.png",
            "preferences": {
                "theme": "dark",
                "fontSize": 14,
                "language": "en-US"
            }
        }
        with open(settings_file, 'w') as f:
            json.dump(default_settings, f, indent=2)
        print(f"Created default {settings_file}")
    
    # Create default shortcuts.json
    shortcuts_file = config_dir / 'shortcuts.json'
    if not shortcuts_file.exists():
        default_shortcuts = {
            "desktop": [
                {
                    "title": "My Computer",
                    "contentPath": "/apps/computer/index.html",
                    "iconUrl": "https://img.icons8.com/?size=100&id=iCwcOoy8tOGw&format=png&color=000000"
                },
                {
                    "title": "Settings",
                    "contentPath": "/apps/settings/index.html",
                    "iconUrl": "https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000"
                },
                {
                    "title": "My Notes",
                    "iconUrl": "https://img.icons8.com/?size=100&id=JWpT8cAn8G0V&format=png&color=000000",
                    "contentPath": "/apps/notes/index.html"
                }
            ],
            "taskbar": [],
            "startMenu": [
                {
                    "title": "My Computer",
                    "iconUrl": "https://img.icons8.com/?size=100&id=iCwcOoy8tOGw&format=png&color=000000",
                    "contentPath": "/apps/computer/index.html"
                },
                {
                    "title": "Settings",
                    "iconUrl": "https://img.icons8.com/?size=100&id=PUULuXvUfB6u&format=png&color=000000",
                    "contentPath": "/apps/settings/index.html"
                },
                {
                    "title": "My Notes",
                    "iconUrl": "https://img.icons8.com/?size=100&id=JWpT8cAn8G0V&format=png&color=000000",
                    "contentPath": "/apps/notes/index.html"
                }
            ]
        }
        with open(shortcuts_file, 'w') as f:
            json.dump(default_shortcuts, f, indent=2)
        print(f"Created default {shortcuts_file}")

def ensure_directory_structure():
    """Ensure all necessary directories exist"""
    directories = [
        'client/config',
        'client/assets/css',
        'client/assets/js',
        'client/assets/icons',
        'client/components',
        'client/apps',
        'server/routes',
        'server/services',
        'server/utils'
    ]
    
    for directory in directories:
        Path(directory).mkdir(parents=True, exist_ok=True)