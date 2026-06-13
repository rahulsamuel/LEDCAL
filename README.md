# LEDTools Suite

Welcome to the LEDTools Suite, a comprehensive web-based application designed for LED screen technicians, project managers, and system designers. This toolkit provides a suite of powerful utilities to streamline the planning, configuration, and management of LED video wall setups.

## ✨ Key Features

*   **Product & Processor Libraries**: A comprehensive and editable database of LED panels and processors.
*   **LED Calculator**: Instantly calculate crucial metrics like resolution, physical dimensions, weight, and power consumption.
*   **Power & Data Planner**: Determine the number of processors, power circuits, and data ports required for your setup.
*   **Pixel Map Generator**: Create and visualize custom pixel maps for your LED screens.
*   **Raster Map Generator**: Position your screens on a processor canvas, with smart packing to optimize hardware usage.
*   **Wiring Diagrams**: Automatically generate data and power wiring diagrams based on your configuration.
*   **Hardware Requirements**: Get a calculated list of necessary hardware for flown, ground-stacked, or floor-mounted screens.
*   **Content Deliverables**: Generate a single, professional PDF report summarizing the entire project.
*   **Cloud Projects**: Save your project configurations to the cloud to access them from anywhere (requires login).
*   **Project Export**: Download your entire project, including all reports and diagrams, as a single `.zip` file.
*   **User Management (Admin)**: Admins can manage user accounts and roles.

## 🚀 Getting Started

1.  **Launch the App**: Open the application in your browser.
2.  **Configure Your Project**:
    *   Navigate to the **Product Library** and **Processor Library** tabs to ensure the hardware you need is available. Admins can add or edit products.
    *   Use the **sidebar settings** on the left to input your screen dimensions, select LED products, and configure other project parameters.
3.  **Explore the Tools**: Click through the tabs at the top to access the different calculators and generators. The data you enter in the sidebar will automatically populate the calculations in each tab.
4.  **Save Your Work**:
    *   Use the "Export to File" button on the **Start** tab to save your project configuration locally as a `.json` file.
    *   If you are logged in, you can use "Save to Cloud" to store your project online.
5.  **Download Your Project**: Once all tabs are configured correctly, visit the **Start** tab and use the "Download Full Project" button to get a `.zip` file containing all generated reports and diagrams. Or use **Content Deliverables** for a unified PDF.

## 🧰 The Tool Tabs Explained

### 1. Start
The landing page for the application. Here you can set the **Project Name**, author, and description. You can also import existing configuration files, save your current project to the cloud, or download the full project report as a zip file.

### 2. Product Library
A database of LED panels. Admins can add new products or edit existing ones. Each product includes vital specs like pixel resolution, physical size, weight, and power consumption. You can link "half-panels" to their parent panels for mixed configurations.

### 3. Processor Library
Manage the available LED processors (e.g., Brompton SX40, Megapixel Helios). Each processor stores its maximum resolution limits and port counts. For advanced users, you can define pixel capacities for different refresh rates and bit depths.

### 4. Product Finder
Input your target screen dimensions (in feet, meters, pixels, etc.) or a specific aspect ratio, and this tool will recommend compatible LED products. It calculates how many tiles are needed and how closely they match your target size.

### 5. LED Calculator
Provides a detailed breakdown of a single screen's specifications. This includes calculated resolution, aspect ratio, exact weight, and power draw at your specified operating voltage. It also handles curved wall calculations (concave/convex).

### 6. Power & Data
The core planning tool. It calculates:
*   **Total Processors**: Based on resolution limits and port availability.
*   **Smart Packing**: Uses stripping logic to fit large screens onto fewer processors.
*   **Data Ports**: Number of output ports required.
*   **Electrical Circuits**: Number of 20A circuits needed for the screen.

### 7. Pixel Map
A visual preview of your screen's panel grid. You can customize colors, add custom text overlays (with variables like `{width}` and `{height}`), and enable scaling overlays.

### 8. Raster Map
Visualizes how your screens are positioned on the processor's output canvas. It shows the smart packing (strips) and allows you to position multiple screens relative to each other. You can even open a "Live Output" window to drag onto a separate display.

### 9. Wiring Diagram
Generates a routing diagram for your setup. It supports both **Data** and **Power** wiring modes with multiple patterns (Left to Right, Serpentine, etc.). It visually groups panels by port or circuit.

### 10. Hardware Requirements
Calculates the rigging and mounting hardware needed based on your screen size and mounting type (Flown, Ground Stack, or Floor). It suggests quantities for header bars, outriggers, vertical trusses, and sandbags.

### 11. Media Server
Recommends a playback server configuration (e.g., Disguise, Pixera) based on your project's total resolution and required number of outputs.

### 12. Content Deliverables
A one-stop shop for project hand-off. It generates a professional, high-fidelity PDF report that combines all your technical specifications into a single document.

### 13. User Management
An admin-only tab to manage user roles and view projects saved by other users.

---

This application was built with Next.js, React, Tailwind CSS, and Firebase.
