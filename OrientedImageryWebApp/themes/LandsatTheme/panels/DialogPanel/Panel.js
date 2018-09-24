///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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

define(['dojo/_base/declare',
  'dojo/_base/html',
  'dojo/dom-class',
  'jimu/BaseWidgetPanel',
  'jimu/utils',
  './DialogWidgetFrame'
],
function(declare, html, domClass, BaseWidgetPanel, utils, DialogWidgetFrame) {

  return declare([BaseWidgetPanel], {
    baseClass: 'jimu-widget-panel jimu-dialog-panel',
    _dialogFrame: null,

    startup: function(){
      this.inherited(arguments);
    },

    createFrame: function(widgetConfig) {
      this.widgetConfig = widgetConfig;

      var frame = this._dialogFrame= new DialogWidgetFrame({
        'parent': this,
        'widgetConfig': widgetConfig,
        'widgetManager': this.widgetManager,
        'panelManager': this.panelManager
      });

      return frame;
    },

    onOpen: function(){      
      if(!this._dialogFrame) return;

      if(this._dialogFrame.getWidget())
        this.widgetManager.openWidget(this._dialogFrame.getWidget());
      if(this.widgetConfig.panel.noOverlay)
        domClass.add(document.body, "no-dialog-overlay");

      this._dialogFrame.show();
      if(this._dialogFrame.widget)
      this._dialogFrame.widget.resize();
    },

    onClose: function(){
      if(this._dialogFrame.getWidget())
        this.widgetManager.closeWidget(this._dialogFrame.getWidget());
      this._dialogFrame.hide();
    }

  });
});