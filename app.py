#!/usr/bin/env python3
"""
Minimal Flask backend for warmbos-dev web desktop.
"""

from flask import Flask, send_from_directory, jsonify, request
import json
import os

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
        print(f"Received settings data: {data}")  # Debug print
        with open('settings.json', 'w') as f:
            json.dump(data, f, indent=2)
        print("Settings saved successfully")  # Debug print
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error saving settings: {e}")  # Debug print
        return jsonify({"error": str(e)}), 500

@app.route('/<path:filename>')
def serve_file(filename):
    return send_from_directory('.', filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)