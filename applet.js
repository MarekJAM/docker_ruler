const Applet = imports.ui.applet;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const UUID = 'docker@marekjam';

let Docker;
if (typeof require !== 'undefined') {
  Docker = require('./docker');
} else {
  Docker = imports.ui.appletManager.applets[UUID].docker;
}

function ConfirmDialog() {
  this._init();
}

function MyApplet(orientation, panelHeight, instanceId) {
  this._init(orientation, panelHeight, instanceId);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,

  _init: function (orientation, panelHeight, instanceId) {
    Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

    this._msgsource = new MessageTray.SystemNotificationSource("Docker Ruler");
    Main.messageTray.add(this._msgsource);


    try {
      this.set_applet_icon_name("inactive");
      this.set_applet_tooltip("Control docker containers");

      this.menuManager = new PopupMenu.PopupMenuManager(this);
      this.menu = new Applet.AppletPopupMenu(this, orientation);
      this.menuManager.addMenu(this.menu);

      this._contentSection = new PopupMenu.PopupMenuSection();
      this.menu.addMenuItem(this._contentSection);

      this.docker = new Docker.Docker();

      let containers = this.docker.listContainers();
      if (containers.length == 0) {
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(
          'No containers found.',
        ));
      } else {
        for (var i = 0; i < containers.length; i++) {
          let item = new PopupMenu.PopupMenuItem(containers[i].image);
          item.connect('activate', Lang.bind(this, function () {
            //  Main.Util.spawnCommandLine("gnome-terminal -e 'sh -c \"echo "+test.names+"; sleep 10; exec bash\"\'");
          }));
          this.menu.addMenuItem(item);

        }
      }
    }
    catch (e) {
      global.logError(e);
    }
  },

  on_applet_clicked: function (event) {
    this.menu.toggle();
  },

  notification: function (message) {
    let notification = new MessageTray.Notification(this._msgsource, "Docker Ruler", message);
    this._msgsource.notify(notification);
  },
};

function main(metadata, orientation, panelHeight, instanceId) {
  let myApplet = new MyApplet(orientation, panelHeight, instanceId);
  return myApplet;
}
