#!/usr/bin/env python3
"""
Minimal Flask backend for warmbos-dev web desktop.
"""

from flask import Flask, send_from_directory, jsonify, request
import json
import os
from pathlib import Path

app = Flask(__name__, static_folder='.')

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
        # Validate structure
        allowed_keys = {'backgroundImage', 'preferences'}
        if not all(key in allowed_keys for key in data.keys()):
            return jsonify({"error": "Invalid settings structure"}), 400
        # Validate URL format for backgroundImage
        if 'backgroundImage' in data:
            url = data['backgroundImage']
            if url and not (url.startswith('http://') or url.startswith('https://')):
                return jsonify({"error": "Invalid background image URL"}), 400
        # Atomic write
        temp_file = Path('settings.json.tmp')
        with temp_file.open('w') as f:
            json.dump(data, f, indent=2)
        temp_file.rename('settings.json')
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)