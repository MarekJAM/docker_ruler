/*jshint esversion: 6 */
const Mainloop = imports.mainloop;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;


function Docker() {
    this._init();
}

Docker.prototype = {
    _init: function () {
    },

    listContainers: function () {
        return this.colCommand('ps -a');
    },

    listImages: function () {
        return this.colCommand('image ls');
    },

    parseColumnMetadata: function (original_row) {
        let row = original_row;
        let last_reduction = '';
        while (row != last_reduction) {
            last_reduction = row;
            row = row.replace(/   /gi, '  ');
        }
        let positions = [];
        row.split('  ').forEach(function (element) {
            positions.push({
                name: element,
                position: original_row.match(element).index,
                length: -1
            });
        });
        for (let index = 0; index < positions.length - 1; index++) {
            positions[index].length = positions[index + 1].position - positions[index].position;
        }
        return positions;
    },

    colCommand: function (command) {
        let [res, list, err, status] = GLib.spawn_command_line_sync('docker' + ' ' + command);
        let output_lines = list.toString().split('\n');
        let columns = this.parseColumnMetadata(output_lines[0]);
        let lines = [];
        for (let index = 1; index < output_lines.length - 1; index++) {
            let line = {};
            for (let column_index = 0; column_index < columns.length; column_index++) {
                if (columns[column_index].length != -1) {
                    line[columns[column_index].name.toLowerCase()] = output_lines[index].substr(columns[column_index].position, columns[column_index].length).trim();
                } else {
                    line[columns[column_index].name.toLowerCase()] = output_lines[index].substr(columns[column_index].position).trim();
                }
            }
            lines.push(line);
        }
        return lines;
    },

    openInTerminal: function (containerName, entryPoint) {
        Main.Util.spawnCommandLine("gnome-terminal -e 'sh -c \"docker exec -it " + containerName + " " + entryPoint + "  ; $SHELL\"\'");
    },

    isContainerRunning: function (status) {
        if (status.substring(0, 2) == 'Up') {
            return true;
        }
        return false;
    },

    startContainer: function (container_name) {
        try {
            GLib.spawn_command_line_sync('docker start ' + container_name);
        } catch (e) {
            global.log(e);
        }
        return true;
    },

    stopContainer: function(container_name) {
        try {
            GLib.spawn_command_line_sync('docker stop ' + container_name);
        } catch(e) {
            global.log(e);
        }
        return true;
    },

    pullImage: function (image_data) {
        try {
            GLib.spawn_command_line_sync('docker pull ' + image_data);
        } catch (e) {
            global.log(e);
        }
        return true;
    },
};