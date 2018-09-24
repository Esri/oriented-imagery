///////////////////////////////////////////////////////////////////////////
// Copyright © 2016 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define(["dojo/_base/declare",
    "dijit/_WidgetBase",
    "dojo/i18n!../nls/strings",
    "dijit/Dialog",
    "./AddFromUrlPane"
  ],
  function(declare, _WidgetBase, i18n, Dialog, AddFromUrlPane) {

    return declare([_WidgetBase], {

      dialog: null,
      i18n: i18n,
      wabWidget: null,

      postCreate: function() {
        this.inherited(arguments);
      },

      hide: function() {
        if (this.dialog) {
          this.dialog.hide();
        }
      },

      show: function() {
        var self = this;
        var content = new AddFromUrlPane({
          parentDialog: this,
          wabWidget: this.wabWidget
        });
        var dialog = this.dialog = new Dialog({
          "class": this.wabWidget.baseClass + "-dialog",
          title: i18n.tabs.url,
          content: content
        });

        var h2 = null;
        h2 = dialog.on("hide", function() {
          if (content && typeof content.preHide === "function") {
            content.preHide();
          }
          h2.remove();
          setTimeout(function() {
            dialog.destroyRecursive(false);
            self.destroyRecursive(false);
          }, 300);
        });
        dialog.show();
      }

    });

  });
