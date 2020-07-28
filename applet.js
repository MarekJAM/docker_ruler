const Applet = imports.ui.applet;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;
const Cinnamon = imports.gi.Cinnamon;

const UUID = 'dockerruler@marekjam';
const APPLET_PATH = global.userdatadir + "/applets/" + UUID;
const SETTINGS_FILE = APPLET_PATH + "/settings.json";
const APPLET_NAME = "Docker Ruler";


let Docker;
if (typeof require !== 'undefined') {
  Docker = require('./docker');
} else {
  Docker = imports.ui.appletManager.applets[UUID].docker;
}

let jsonSettingsFileContent = Cinnamon.get_file_contents_utf8_sync(SETTINGS_FILE);
let settings = JSON.parse(jsonSettingsFileContent);

function MyApplet(orientation, panelHeight, instanceId) {
  this._init(orientation, panelHeight, instanceId);
}

MyApplet.prototype = {
  __proto__: Applet.IconApplet.prototype,

  _init: function (orientation, panelHeight, instanceId) {
    Applet.IconApplet.prototype._init.call(this, orientation, panelHeight, instanceId);

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
    let images = this.docker.listImages();
    this.isAnyContainerRunning = false;

    this.subMenuContainers = new PopupMenu.PopupSubMenuMenuItem('Containers');

    if (containers.length == 0) {
      this.subMenuContainers.menu.addMenuItem(this.createPopupMenuItem(
        _('No containers found.')
      ));
    } else {
      for (var i = 0; i < containers.length; i++) {
        let container = containers[i];
        let isRunning = (this.docker.isContainerRunning(container.status));
        this.subMenuContainers.menu.addMenuItem(this.createPopupIconMenuItem(_(container.names), isRunning ? "emblem-default" : "media-playback-stop", function (actor, event) {
          let button = event.get_button();
          if (button == 1) {
            this.switchContainerStatus(isRunning, container.names);
          } else if (button == 3) {
            this.docker.openInTerminal(container.names, "/bin/bash");
          }
        }));

        if (isRunning) {
          this.isAnyContainerRunning = true;
        }
      }
    }

    if (this.isAnyContainerRunning) {
      this.set_applet_icon_name("active");
    } else {
      this.set_applet_icon_name("inactive");
    }

    this.subMenuImages = new PopupMenu.PopupSubMenuMenuItem('Images');

    this.subMenuImages.menu.addMenuItem(this.createPopupIconMenuItem(
      _('Pull image'),
      'document-save',
      this.openDialog
    ));

    if (images.length == 0) {
      this.subMenuImages.menu.addMenuItem(this.createPopupMenuItem(
        _('No images found.')
      ));
    } else {
      for (var i = 0; i < images.length; i++) {
        let image = images[i];
        this.subMenuImages.menu.addMenuItem(this.createPopupMenuItem(_(image.repository + ":" + image.tag)));
      }
    }

    this.menu.addMenuItem(this.subMenuContainers);
    this.menu.addMenuItem(this.subMenuImages);
    this.menu.addMenuItem(this.createPopupIconMenuItem(_('Refresh'), 'view-refresh', this.refreshApplet));
  },

  on_applet_clicked: function (event) {
    this.menu.toggle();
  },

  createPopupIconMenuItem: function (label, icon, callback) {
    let item = new PopupMenu.PopupIconMenuItem(label, icon, St.IconType.FULLCOLOR);
    if (callback) {
      item.connect("activate", Lang.bind(this, callback));
    }
    return item;
  },

  createPopupMenuItem: function (label, callback) {
    let newItem = new PopupMenu.PopupMenuItem(label);
    if (callback) {
      newItem.connect("activate", Lang.bind(this, callback));
    }
    return newItem;
  },

  switchContainerStatus: function (isRunning, name) {
    if (isRunning) {
      this.docker.stopContainer(name);
      Main.notify(_(APPLET_NAME), _('Container ' + name + ' stopped'));
      this.refreshApplet();
    } else {
      this.docker.startContainer(name);
      Main.notify(_(APPLET_NAME), _('Container ' + name + ' started'));
      this.refreshApplet();
    }
  },

  openDialog: function () {
    let dialog = new NewImageDialog(this.docker);
  },
};


function NewImageDialog() {
  this._init.apply(this, arguments);
}

NewImageDialog.prototype = {
  __proto__: ModalDialog.ModalDialog.prototype,

  _init: function (docker) {
    ModalDialog.ModalDialog.prototype._init.call(this, {
      styleClass: null
    });
    this._docker = docker;

    try {
      let mainContentBox = new St.BoxLayout({
        vertical: false
      });

      this.contentLayout.add(mainContentBox, {
        x_fill: true,
        y_fill: true
      });

      let messageBox = new St.BoxLayout({
        vertical: true
      });

      mainContentBox.add(messageBox, {
        y_align: St.Align.START
      });

      this._subjectLabel = new St.Label({
        text: _("Pull image - repository/image:tag")
      });

      messageBox.add(this._subjectLabel, {
        y_fill: false,
        y_align: St.Align.START
      });

      this._imageName = new St.Entry({
        style_class: 'image-pull',
        track_hover: true,
        can_focus: true
      });

      messageBox.add(this._imageName, {
        y_fill: false,
        y_align: St.Align.START
      });

      this.addButtons([{
        label: _("Cancel"),
        action: Lang.bind(this, function () {
          this.close();
        }),
      },
      {
        label: _("Pull"),
        action: Lang.bind(this, this.pullImage)
      }]);

      this.open();
      this._imageName.set_text(settings.defaultPullString);
      this._imageName.grab_key_focus();
    } catch (e) {
      global.log(e);
    }
  },

  addButtons: function (buttons){
    this.setButtons(buttons);
  },

  pullImage: function () {
    let image = this._imageName.get_text();
    Main.notify(_(APPLET_NAME), 'Pulling image: ' + _(image));
    this._docker.pullImage(image);
    this.close();
  },

};

function main(metadata, orientation, panelHeight, instanceId) {
  let myApplet = new MyApplet(orientation, panelHeight, instanceId);
  return myApplet;
}

