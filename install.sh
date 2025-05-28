#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get system IP address (prefer non-loopback)
get_system_ip() {
    # Try to get primary network interface IP
    if command -v ip >/dev/null 2>&1; then
        ip route get 1.1.1.1 2>/dev/null | grep -oP 'src \K[^ ]+' | head -1
    elif command -v hostname >/dev/null 2>&1; then
        hostname -I 2>/dev/null | awk '{print $1}'
    else
        # Fallback to localhost
        echo "127.0.0.1"
    fi
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "This script should not be run as root. Please run as a regular user."
    exit 1
fi

print_status "Installing WarmbOS..."

# Update system packages
print_status "Updating system packages..."
sudo apt update

# Install required system packages
print_status "Installing system dependencies..."
sudo apt install -y python3 python3-pip python3-venv curl wget git

# Create virtual environment
print_status "Creating Python virtual environment..."
if [ -d "venv" ]; then
    print_warning "Virtual environment already exists, removing old one..."
    rm -rf venv
fi

python3 -m venv venv
source venv/bin/activate

# Upgrade pip
print_status "Upgrading pip..."
pip install --upgrade pip

# Install Python dependencies
print_status "Installing Python dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
else
    print_warning "requirements.txt not found, installing basic dependencies..."
    pip install Flask==3.0.0 Flask-CORS==4.0.0 psutil==5.9.6
fi

# Get current user and working directory
CURRENT_USER=$(whoami)
WORKING_DIR=$(pwd)
SERVICE_NAME="warmbos"

# Create systemd service file
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=WarmbOS - Web Desktop Environment
After=network.target
Wants=network.target

[Service]
Type=exec
User=${CURRENT_USER}
Group=${CURRENT_USER}
WorkingDirectory=${WORKING_DIR}
Environment=PATH=${WORKING_DIR}/venv/bin
Environment=PORT=5000
ExecStart=${WORKING_DIR}/venv/bin/python app.py
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=${WORKING_DIR}

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
print_status "Configuring systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}

# Start the service
print_status "Starting WarmbOS service..."
sudo systemctl start ${SERVICE_NAME}

# Wait a moment for service to start
sleep 3

# Check service status
if sudo systemctl is-active --quiet ${SERVICE_NAME}; then
    print_success "WarmbOS service started successfully!"
else
    print_error "Failed to start WarmbOS service. Checking logs..."
    sudo systemctl status ${SERVICE_NAME} --no-pager -l
    exit 1
fi

# Get system IP
SYSTEM_IP=$(get_system_ip)
PORT=5000

# Display access information
echo
echo "=================================================================="
echo -e "${GREEN}✓ WarmbOS Installation Complete!${NC}"
echo "=================================================================="
echo
echo -e "${BLUE}Access URLs:${NC}"
echo -e "  Local:    http://localhost:${PORT}"
echo -e "  Network:  http://${SYSTEM_IP}:${PORT}"
echo
echo -e "${BLUE}Service Management:${NC}"
echo -e "  Start:    sudo systemctl start ${SERVICE_NAME}"
echo -e "  Stop:     sudo systemctl stop ${SERVICE_NAME}"
echo -e "  Restart:  sudo systemctl restart ${SERVICE_NAME}"
echo -e "  Status:   sudo systemctl status ${SERVICE_NAME}"
echo -e "  Logs:     sudo journalctl -u ${SERVICE_NAME} -f"
echo
echo -e "${BLUE}Configuration Files:${NC}"
echo -e "  Settings: ${WORKING_DIR}/settings.json"
echo -e "  Shortcuts: ${WORKING_DIR}/shortcuts.json"
echo
echo -e "${YELLOW}Note:${NC} The service will automatically start on boot."
echo "=================================================================="

# Optional: Open browser if available
if command -v xdg-open >/dev/null 2>&1; then
    read -p "Open WarmbOS in your default browser? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        xdg-open "http://localhost:${PORT}"
    fi
fi