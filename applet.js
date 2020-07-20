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
let isAnyContainerRunning;

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
    this.set_applet_icon_name("inactive");

    this.set_applet_tooltip("Control docker containers");

    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);

    this._contentSection = new PopupMenu.PopupMenuSection();
    this.menu.addMenuItem(this._contentSection);

    this.docker = new Docker.Docker();
    this.refreshApplet();
  },

  refreshApplet: function () {
    this.menu.removeAll();
    let containers = this.docker.listContainers();
    this.isAnyContainerRunning = false;

    this.subMenuContainers = new PopupMenu.PopupSubMenuMenuItem('Containers');
    this.menu.addMenuItem(this.subMenuContainers);

    if (containers.length == 0) {
      this.menu.addMenuItem(new PopupMenu.PopupMenuItem(
        'No containers found.',
      ));
    } else {
      for (var i = 0; i < containers.length; i++) {
        let container = containers[i];
        this.subMenuContainers.menu.addMenuItem(this.createPopupIconMenuItem(_(container.names), (container.status.substring(0, 2) == 'Up') ? "emblem-default" : "media-playback-stop", function () {
          if (container.status.substring(0, 2) == 'Up') {
            this.docker.openInTerminal(container.names, '/bin/sh');
          }
        }));

        if (this.docker.isContainerRunning(container.status)) {
          this.isAnyContainerRunning = true;
        }
      }
    }

    if (this.isAnyContainerRunning) {
      this.set_applet_icon_name("active");
    } else {
      this.set_applet_icon_name("inactive");
    }
    this.menu.addMenuItem(this.createPopupIconMenuItem(_('Refresh'), 'view-refresh', this.refreshApplet));
  },

  on_applet_clicked: function (event) {
    this.menu.toggle();
  },

  notification: function (message) {
    let notification = new MessageTray.Notification(this._msgsource, "Docker Ruler", message);
    this._msgsource.notify(notification);
  },

  createPopupIconMenuItem: function (label, icon, callback) {
    let item = new PopupMenu.PopupIconMenuItem(label, icon, St.IconType.FULLCOLOR);
    if (callback) {
      item.connect("activate", Lang.bind(this, callback));
    }
    return item;
  },
};

function main(metadata, orientation, panelHeight, instanceId) {
  let myApplet = new MyApplet(orientation, panelHeight, instanceId);
  return myApplet;
}

