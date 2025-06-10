"""
Icon Management Service for WarmbOS
Handles icon library synchronization and manifest generation
"""

import json
import os
import re
import shutil
import tempfile
import threading
import urllib.request
import zipfile
from datetime import datetime
from pathlib import Path

class IconManager:
    """Manages icon library synchronization and manifest generation"""
    
    ICONS_REPO_URL = "https://github.com/selfhst/icons/archive/refs/heads/main.zip"
    ICONS_DIR = Path("icons")
    MANIFEST_FILE = Path("js/icon-manifest.json")
    
    def __init__(self):
        self.sync_lock = threading.Lock()
        self.sync_status = {"status": "idle", "progress": 0, "message": ""}
    
    def get_status(self):
        """Get current icon library status"""
        status = {
            "icons_dir_exists": self.ICONS_DIR.exists(),
            "manifest_exists": self.MANIFEST_FILE.exists(),
            "icon_count": 0,
            "last_sync": None,
            "sync_status": self.sync_status.copy()
        }
        
        if status["manifest_exists"]:
            try:
                with open(self.MANIFEST_FILE, 'r') as f:
                    manifest = json.load(f)
                    status["icon_count"] = manifest.get("total_count", 0)
            except Exception:
                pass
        
        if status["icons_dir_exists"]:
            try:
                stat = self.ICONS_DIR.stat()
                status["last_sync"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            except Exception:
                pass
        
        return status
    
    def sync_icons(self):
        """Download and sync icons from selfhst/icons repository"""
        with self.sync_lock:
            try:
                self._update_status("downloading", 10, "Downloading icons...")
                
                # Create temp directory and download
                with tempfile.TemporaryDirectory() as temp_dir:
                    zip_path = Path(temp_dir) / "icons.zip"
                    
                    self._update_status("downloading", 20, "Downloading repository...")
                    urllib.request.urlretrieve(self.ICONS_REPO_URL, zip_path)
                    
                    self._update_status("extracting", 40, "Extracting files...")
                    
                    # Extract zip file
                    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                        zip_ref.extractall(temp_dir)
                    
                    # Find the extracted directory
                    extracted_dir = self._find_extracted_dir(temp_dir)
                    if not extracted_dir:
                        raise Exception("Could not find extracted icons directory")
                    
                    self._update_status("installing", 60, "Installing icons...")
                    
                    # Replace old icons directory
                    if self.ICONS_DIR.exists():
                        shutil.rmtree(self.ICONS_DIR)
                    shutil.move(str(extracted_dir), str(self.ICONS_DIR))
                    
                    self._update_status("generating", 80, "Generating manifest...")
                    self.generate_manifest()
                    
                    self._update_status("complete", 100, "Icons synchronized successfully!")
                    return True
                    
            except Exception as e:
                self._update_status("error", 0, f"Sync failed: {str(e)}")
                return False
    
    def generate_manifest(self):
        """Generate icon manifest for the web interface"""
        manifest = {
            "categories": {},
            "icons": [],
            "total_count": 0
        }
        
        # Icon categorization patterns
        categories = self._get_categorization_patterns()
        
        print(f"Scanning icons in: {self.ICONS_DIR}")
        
        # Scan for SVG and PNG icons
        for icon_type, pattern in [("svg", "*.svg"), ("png", "*.png")]:
            for icon_path in self.ICONS_DIR.rglob(pattern):
                if icon_path.is_file():
                    try:
                        icon_data = self._process_icon(icon_path, icon_type, categories)
                        if icon_data:
                            manifest["icons"].append(icon_data)
                            self._add_to_category(manifest["categories"], icon_data)
                    except Exception as e:
                        print(f"Error processing icon {icon_path}: {e}")
                        continue
        
        # Finalize manifest
        manifest["total_count"] = len(manifest["icons"])
        self._sort_manifest(manifest)
        self._write_manifest(manifest)
        
        print(f"Generated manifest with {manifest['total_count']} icons")
    
    def _update_status(self, status, progress, message):
        """Update sync status"""
        self.sync_status = {"status": status, "progress": progress, "message": message}
    
    def _find_extracted_dir(self, temp_dir):
        """Find the extracted icons directory"""
        for item in Path(temp_dir).iterdir():
            if item.is_dir() and item.name.startswith('icons-'):
                return item
        return None
    
    def _get_categorization_patterns(self):
        """Get icon categorization patterns"""
        return {
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
    
    def _categorize_icon(self, filename, categories):
        """Categorize icon based on filename"""
        name_lower = filename.lower()
        for category, keywords in categories.items():
            if any(keyword in name_lower for keyword in keywords):
                return category
        return "misc"
    
    def _process_icon(self, icon_path, icon_type, categories):
        """Process a single icon file"""
        relative_path = icon_path.relative_to(self.ICONS_DIR)
        relative_path_str = str(relative_path).replace(os.sep, '/')
        
        filename = icon_path.stem
        category = self._categorize_icon(filename, categories)
        
        # Clean up the name for display
        display_name = re.sub(r'[-_]', ' ', filename).title()
        
        # Ensure the path starts with /icons/
        clean_path = f"/icons/{relative_path_str}"
        
        return {
            "name": display_name,
            "filename": filename,
            "path": clean_path,
            "category": category,
            "type": icon_type
        }
    
    def _add_to_category(self, categories, icon_data):
        """Add icon to its category"""
        category = icon_data["category"]
        if category not in categories:
            categories[category] = []
        categories[category].append(icon_data)
    
    def _sort_manifest(self, manifest):
        """Sort manifest data"""
        # Sort icons by name within each category
        for category in manifest["categories"]:
            manifest["categories"][category].sort(key=lambda x: x["name"])
        
        # Sort main icons list
        manifest["icons"].sort(key=lambda x: x["name"])
    
    def _write_manifest(self, manifest):
        """Write manifest to file"""
        # Ensure js directory exists
        self.MANIFEST_FILE.parent.mkdir(exist_ok=True)
        
        # Write manifest with proper encoding
        with open(self.MANIFEST_FILE, "w", encoding='utf-8') as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        
        # Debug: Print sample paths
        if manifest["icons"]:
            print("Sample icon paths:")
            for icon in manifest["icons"][:5]:
                print(f"  {icon['name']}: {icon['path']}")