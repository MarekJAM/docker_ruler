# docker_ruler

Simple cinnamon applet for maintaining docker containers/images. At the moment it allows to start/stop containers from the list.

How to run:

1. Clone the project to: ~/.local/share/cinnamon/applets
2. Rename main project folder accordingly to uuid in metadata.json (by default it should be dockerruler@marekjam)
3. Right click on your task bar
4. Choose 'Applets'
5. Find 'Docker Ruler' on the list
6. Click on plus icon
7. Make sure your user is added to docker group (so you're able to run docker commands without sudo) - to add user to docker group run following command: sudo usermod -aG docker $USER

Voila, applet should be added and ready to work.
