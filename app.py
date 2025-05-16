import os
import psutil
import json
import platform
import socket
import datetime
import threading
import subprocess
import cpuinfo
from flask import Flask, jsonify, request, render_template, url_for, redirect

# URL prefix configuration
URL_PREFIX = "/os"

app = Flask(__name__, static_url_path=f'{URL_PREFIX}/static')

CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json')

@app.after_request
def add_security_headers(response):
    response.headers['Content-Security-Policy'] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src * data:; "
        "media-src *; "
        "frame-src *; "
        "connect-src *;"
    )
    return response

@app.context_processor
def inject_url_prefix():
    return dict(URL_PREFIX=URL_PREFIX)

@app.route(f'{URL_PREFIX}/')
def desktop():
    return render_template('index.html')

@app.route(f'{URL_PREFIX}/templates/pages/editor.html')
def editor():
    return render_template('editor.html')

@app.route(f'{URL_PREFIX}/templates/pages/system.html')
def system():
    return render_template('system.html')

@app.route(f'{URL_PREFIX}/templates/pages/about.html')
def about():
    return render_template('about.html')

@app.route(f'{URL_PREFIX}/api/config', methods=['GET'])
def get_config():
    default_config = {
        "taskbar": [],
        "main_menu": [],
        "taskbar_unique": []
    }

    if not os.path.exists(CONFIG_PATH):
        return jsonify(default_config)

    with open(CONFIG_PATH) as f:
        saved = json.load(f)

    return jsonify({**default_config, **saved})

@app.route(f'{URL_PREFIX}/api/save', methods=['POST'])
def save_config():
    # Check if the data is sent as JSON or form data
    if request.is_json:
        data = request.get_json()
    else:
        return jsonify({'error': 'Invalid content type. Expected JSON.'}), 400

    if not isinstance(data, dict):
        return jsonify({'error': 'Invalid config format'}), 400

    # Validate and save configuration
    config_to_save = {
        "taskbar": data.get("taskbar", []),
        "main_menu": data.get("main_menu", []),
        "taskbar_unique": data.get("taskbar_unique", [])
    }

    try:
        with open(CONFIG_PATH, 'w') as f:
            json.dump(config_to_save, f, indent=2)
    except Exception as e:
        return jsonify({'error': f'Error saving config: {str(e)}'}), 500

    return '', 204

@app.route(f'{URL_PREFIX}/api/system')
def system_info():
    import time

    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()._asdict()
    disk = psutil.disk_usage('/')._asdict()

    io_before = psutil.disk_io_counters()
    net_before = psutil.net_io_counters()
    time.sleep(1)
    io_after = psutil.disk_io_counters()
    net_after = psutil.net_io_counters()

    read_rate_mb = round((io_after.read_bytes - io_before.read_bytes) / (1024 * 1024), 2)
    write_rate_mb = round((io_after.write_bytes - io_before.write_bytes) / (1024 * 1024), 2)
    rx_rate_mb = round((net_after.bytes_recv - net_before.bytes_recv) / (1024 * 1024), 2)
    tx_rate_mb = round((net_after.bytes_sent - net_before.bytes_sent) / (1024 * 1024), 2)

    return jsonify({
        "cpu": {"percent": cpu_percent},
        "memory": memory,
        "disk": disk,
        "disk_io": {
            "read_rate_mb": read_rate_mb,
            "write_rate_mb": write_rate_mb
        },
        "network": {
            "rx_rate_mb": rx_rate_mb,
            "tx_rate_mb": tx_rate_mb
        }
    })

@app.route('/')
def root_redirect():
    return redirect(URL_PREFIX)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
