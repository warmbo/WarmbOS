# WarmbOS

A minimal web-based desktop environment for use as a startpage, homelab management dashboard, or just a fun playground on your network.  The project is designed to be modular and theme-able, offering diverse usage options.

## Screenshots

![Desktop](https://i.imgur.com/DGt8bmp.png)  
Desktop

![Settings Menus](https://i.imgur.com/S3sANat.png)  
Settings

![System Info](https://i.imgur.com/Kag3olD.png)  
System Info


## Features

* Customizable Desktop: Users can add, remove, and arrange desktop icons, and customize the background image.
* Start Menu: A functional start menu provides quick access to applications.
* Taskbar: A taskbar displays open applications and system controls.
* Window Management: Basic window management features including drag and resize, minimize, maximize, and close.
* Persistent State: Application positions, sizes, and open status are saved across sessions using localStorage.
* Settings Editor: Allows customization of various settings such as background image, theme, and font size.
* Shortcut Editor: Provides a simple interface to manage and edit application shortcuts for the desktop, taskbar, and start menu.


## Usage

1. Run the application: Start the Flask server using the `install.sh` script (see Installation section).
2. Access the desktop: Open your web browser and navigate to `http://localhost:5000`.
3. Interact with the desktop: Use the start menu, taskbar, and desktop icons to launch and manage applications.
4. Customize settings: Access the settings page through the taskbar icon to adjust various preferences.
5. Manage shortcuts: Edit the `shortcuts.json` file to customize application shortcuts.


## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/warmbo/WarmbOS.git
   cd WarmbOS
   ```
2. Run the installation script: This script installs the necessary dependencies and sets up a systemd service (requires root privileges):
   ```bash
   sudo ./install.sh
   ```
   Alternatively, use Docker Compose:
   ```bash
   docker-compose up -d
   ```


## Technologies Used

* Python: Backend server using Flask for handling API requests and serving static files.
* Flask: Lightweight web framework for the backend.
* HTML, CSS, JavaScript: Frontend technologies for building the user interface.
* localStorage: Used for persistent storage of desktop state.
* systemd: Used for managing the Flask application as a system service (Linux only).
* Docker: Containerization for simplified deployment.


## Configuration

The application's behavior is configured through two JSON files:

* `shortcuts.json`: Defines the applications and their associated icons, which appear on the desktop, taskbar, and start menu. See the file for example format. The format is flexible, allowing for either a single array of shortcuts or separate arrays for each menu type under keys `"desktop"`, `"taskbar"`, and `"startMenu"`.
* `settings.json`: Contains customizable settings such as background image, theme, and font size. See the file for example format.



## API Documentation

The Flask backend exposes the following endpoints:

* `/`: Serves the main desktop HTML file (`desktop.html`).
* `/shortcuts.json`: GET request returns the `shortcuts.json` data. POST request saves the provided shortcut data to `shortcuts.json`. Example POST request:
  ```json
  {
    "desktop": [
      {
        "title": "New App",
        "iconUrl": "path/to/icon.png",
        "contentPath": "/path/to/app.html"
      }
    ]
  }
  ```
* `/settings.json`: GET request returns the `settings.json` data. POST request saves the provided settings data to `settings.json`. Example POST request:
  ```json
  {
    "backgroundImage": "https://example.com/wallpaper.jpg",
    "preferences": {
      "theme": "dark",
      "fontSize": 14
    }
  }
  ```
* `/<path:filename>`: Serves any other file from the project root directory.


## Dependencies

The project dependencies are listed in the `requirements.txt` file. Install them using:

```bash
pip install -r requirements.txt
```

## Planned Features

* Integration with selfh.st/icons
* Upload images for avatar and wallpaper
* Apps (Terminal, Notepad, Calendar, Network Map)
* Ability to call APIs
* Better handling of desktop icon locations and window management

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.


## Testing

No formal testing framework is currently implemented. Testing is primarily done through manual interaction with the application.


## License

GNU AFFERO GENERAL PUBLIC LICENSE
Version 3, 19 November 2007


*README.md was made with [Etchr](https://etchr.dev)*