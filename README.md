# WarmbOS
A browser-based desktop-like environment for viewing local services and servers on your home network.


<div align="center">
<img src="https://wpdn.one/os/static/images/warmbos.png" alt="image-1747371957965.png" width="200px" height="200px"/>
</div>


## Screenshots
<div align="center">
<img src="https://i.imgur.com/xvc33eg.png" alt="WarmbOS Main Screen">
<img src="https://i.imgur.com/TDpRP3G.png" alt="WarmbOS System Monitor">
<img src="https://i.imgur.com/RbnhyDG.png" alt="WarmbOS Configuration Editor">
</div>

## Features (some WIP)
* **Customizable Taskbar and Main Menu:**  Easily add, remove, and rearrange applications and services in the taskbar and main menu via a built-in editor.  Persistent configuration is stored locally.
* **Multi-Window Support:** Open and manage multiple windows simultaneously, each with customizable size and position.  Window state is preserved across sessions.
* **System Monitoring:** View nearly real-time CPU usage, memory usage, disk I/O, and network activity.
* **Built-in Applications:** Includes a simple calendar application with more planned to come soon.
* **External Application Support:** Launch and interact with external applications and web services through URLs.
* **Configurable Appearance:** Customize the appearance with custom background images (not yet implemented).

## Usage
1.  **Navigate to WarmbOS:** Access WarmbOS via a web browser at the designated URL (typically `http://<your_server_ip>:5000/os`).
2.  **Use the Interface:** Interact with the application and system monitoring widgets using the provided interface.
3.  **Configure Settings:** Access the configuration editor to customize the taskbar, main menu, and system settings.
4.  **Manage Windows:** Open and manage windows using the taskbar.

## Installation
1.  **Prerequisites:** Ensure you have Python 3 and `pip` installed.
2.  **Install Dependencies:** Use pip to install required packages:  `pip install -r requirements.txt` (This file needs to be created with project dependencies)
3.  **Run the Application:** Execute the main application script: `python app.py`.
4.  **Access WarmbOS:** Open a web browser and navigate to `http://localhost:5000/os` or `http://<your_server_ip>:5000/os` (replace `<your_server_ip>` with your server's IP address).

## Technologies Used
* **Python:** The backend is written in Python, providing the API and system information.
* **Flask:** A lightweight Python web framework used for the application's backend.
* **psutil:** A Python library for retrieving system and process information.
* **JavaScript:**  Handles the front-end user interface and window management.
* **HTML, CSS:** Standard web technologies used for creating the user interface.
* **Local Storage:** Used for storing window state and application settings.

## Configuration
The application configuration is stored in `config.json`.  This file allows customization of the taskbar, main menu, and system settings.  The config file is structured as a JSON object:

```json
{
  "taskbar": [...],
  "main_menu": [...],
  "taskbar_unique": [...]
}
```

Each array contains objects describing individual taskbar items, main menu items, and unique taskbar buttons.  These objects include fields such as `title`, `url`, `width`, `height`, and `icon`.

The configuration can be modified through the built-in editor.

## Dependencies
The project dependencies are listed in `requirements.txt` (This file needs to be created).

## Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## Testing
No dedicated testing framework is currently included.  Testing should be added.

*README.md was made with [Etchr](https://etchr.dev)*
