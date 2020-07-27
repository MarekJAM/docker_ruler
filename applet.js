const Applet = imports.ui.applet;
const Lang = imports.lang;
const St = imports.gi.St;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const PopupMenu = imports.ui.popupMenu;
const Clutter = imports.gi.Clutter;
const ModalDialog = imports.ui.modalDialog;
const UUID = 'dockerruler@marekjam';

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

  showNotification: function (message) {
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
      this.showNotification(_('Container ' + name + ' stopped'));
      this.refreshApplet();
    } else {
      this.docker.startContainer(name);
      this.showNotification(_('Container ' + name + ' started'));
      this.refreshApplet();
    }
  },

  openDialog: function () {
    let dialog = new NewImageDialog(Lang.bind(this, function () { }));
  },

  _onContainerClicked: function (actor, event) {
    let button = event.get_button();
    this.showNotification(this.isRunning.toString());
    // if (button == 3) {
    //   this.switchContainerStatus(isRunning, container.names);
    // } else {
    //   this.showNotification('aaa');
    // }
    return true;
  },
};


function NewImageDialog() {
  this._init.apply(this, arguments);
}

NewImageDialog.prototype = {
  __proto__: ModalDialog.ModalDialog.prototype,

  _init: function (aCallback) {
    ModalDialog.ModalDialog.prototype._init.call(this, {
      styleClass: null
    });
    this._callback = aCallback;
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
        text: _("Pull image - registry/image:tag")
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

      this.setButtons([{
        label: _("Cancel"),
        action: Lang.bind(this, function () {
          this.close();
        }),
      }, 
      {
        label: _("OK"),
        action: Lang.bind(this, function () {
          this.close();
        })
      }]);

      this.open();
      // this._imageNameClutter = this._imageName.clutter_text;
      // this._imageNameClutter.connect("key-release-event", Lang.bind(this, this._onKeyPressEvent));
      this._imageName.set_text('asfasf');
      this._imageName.grab_key_focus();
      // this._searchDelay = new Date().getTime();
    } catch (e) {
      global.log(e);
    }
  },

  _onKeyPressEvent: function (actor, event) {
    // try {
    //   let searchTerm = this._imageSearch.text;
    //   if (searchTerm == '') {
    //     return false;
    //   }
    //   let key = event.get_key_symbol();
    //   if (this._timer && this._timer > 0) {
    //     Mainloop.source_remove(this._timer);
    //     this._timer = 0;
    //   }
    //   if (key == Clutter.Return) {
    //     this.imageSearch(searchTerm, Lang.bind(this, this.displayResults));
    //   } else {
    //     this._timer = Mainloop.timeout_add(2000, Lang.bind(this, function () {
    //       this.imageSearch(searchTerm, Lang.bind(this, this.displayResults));
    //       this._timer = 0;
    //       return false;
    //     }));
    //   }
    // } catch (e) {
    //   global.log(e);
    // }
    return false;
  },

};

function main(metadata, orientation, panelHeight, instanceId) {
  let myApplet = new MyApplet(orientation, panelHeight, instanceId);
  return myApplet;
}

