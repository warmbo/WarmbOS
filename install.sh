#!/bin/bash
set -e

echo "Installing WarmbOS Dev..."

# Update system and install Python
sudo apt update
sudo apt install -y python3 python3-pip python3-venv

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Flask
pip install Flask==3.0.0

# Create systemd service
sudo tee /etc/systemd/system/warmbos-dev.service > /dev/null << EOF
[Unit]
Description=WarmbOS Dev
After=network.target

[Service]
Type=exec
User=$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable warmbos-dev
sudo systemctl start warmbos-dev

echo "Done! Access at http://localhost:5000"
echo "Manage with: sudo systemctl start/stop/restart warmbos-dev"