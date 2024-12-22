# circuit-sketcher-core
The core for drawing circuits on a canvas.

This project provides a set of tools and components to create, manage, and manipulate circuit diagrams on a canvas. It includes features such as draggable elements, context menus, custom ports, and local storage management for saving and loading circuit designs. The core functionality is built using TypeScript and integrates with libraries like React, jQuery and draw2d ([code-forge-temple draw2d fork](https://github.com/code-forge-temple/draw2d)).

## Table of Contents
- [Features](#features)
- [Related Projects](#related-projects)
- [License](#license)

## Features
- Draggable and resizable circuit elements
- Context menus for adding, removing, and managing nodes/ports/connections
- Customizable nodes, ports and connections
- Local storage support for saving and loading customized nodes
- Integration with draw2d for advanced diagramming capabilities

## Related Projects
- [circuit-sketcher-app](https://github.com/code-forge-temple/circuit-sketcher-app): A web application that uses `circuit-sketcher-core` to provide a user-friendly interface for creating and editing circuit diagrams.
- [circuit-sketcher-obsidian-plugin](https://github.com/code-forge-temple/circuit-sketcher-obsidian-plugin): An Obsidian plugin that integrates `circuit-sketcher-core` to allow users to create and manage circuit diagrams within the Obsidian note-taking app.

## License
This project is licensed under the GNU General Public License v3.0. See the [LICENSE](LICENSE) file for more details.