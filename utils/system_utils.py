"""
System utilities for WarmbOS
Handles system information gathering and default file creation
"""

import json
import os
import platform
import shutil
import socket
import sys
from datetime import datetime
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