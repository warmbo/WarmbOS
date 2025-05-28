function debugLog(message) {
            const debugEl = document.getElementById('debug');
            const timestamp = new Date().toLocaleTimeString();
            debugEl.innerHTML += `[${timestamp}] ${message}\n`;
            debugEl.scrollTop = debugEl.scrollHeight;
            console.log(message);
        }
        
        async function loadSystemInfo() {
            debugLog('Starting system info fetch...');
            
            try {
                // Try to determine the correct base URL
                let baseUrl = '';
                if (window.location.protocol === 'file:') {
                    baseUrl = 'http://localhost:5000';
                } else {
                    baseUrl = window.location.origin;
                }
                
                debugLog(`Using base URL: ${baseUrl}`);
                
                const url = `${baseUrl}/api/system`;
                debugLog(`Fetching from: ${url}`);
                
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                debugLog(`Response status: ${response.status} ${response.statusText}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                debugLog('Data received successfully');
                debugLog(`Data: ${JSON.stringify(data, null, 2)}`);
                
                // OS Info
                document.getElementById('os-system').textContent = data.os.system;
                document.getElementById('os-release').textContent = data.os.release;
                document.getElementById('os-machine').textContent = data.os.machine;
                document.getElementById('os-processor').textContent = data.os.processor || 'Unknown';
                
                // Python Info
                document.getElementById('python-version').textContent = data.python.version;
                document.getElementById('python-impl').textContent = data.python.implementation;
                document.getElementById('python-exe').textContent = data.python.executable;
                
                // Disk Info
                document.getElementById('disk-usage').textContent = 
                    `${data.disk.used_gb} GB / ${data.disk.total_gb} GB (${data.disk.percent}%)`;
                document.getElementById('disk-progress').style.width = `${data.disk.percent}%`;
                
                // Network Info
                document.getElementById('hostname').textContent = data.network.hostname;
                document.getElementById('fqdn').textContent = data.network.fqdn;
                
                // Server Info
                document.getElementById('server-time').textContent = data.warmbos.server_time;
                document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
                
                document.getElementById('status').textContent = 'Connected - Data refreshed';
                document.getElementById('status').className = 'status';
                
                debugLog('UI updated successfully');
                
            } catch (error) {
                const errorMsg = `Failed to load system info: ${error.message}`;
                debugLog(`ERROR: ${errorMsg}`);
                console.error('System info error:', error);
                
                document.getElementById('status').textContent = errorMsg;
                document.getElementById('status').className = 'status error';
                
                // Set error values
                const errorValue = 'Error loading';
                document.querySelectorAll('.info-value').forEach(el => {
                    if (el.textContent === 'Loading...') {
                        el.textContent = errorValue;
                    }
                });
            }
        }
        
        // Load on page load
        document.addEventListener('DOMContentLoaded', () => {
            debugLog('DOM loaded, starting initial fetch...');
            loadSystemInfo();
        });
        
        // Refresh every 30 seconds 
        setInterval(() => {
            debugLog('Refreshing system info...');
            loadSystemInfo();
        }, 30000);