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
    "dojo/_base/array",
    "dojo/on",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/LayerListPane.html",
    "dojo/i18n!../nls/strings",
    "./util"
],
function(declare, array, on, domClass, domConstruct, _WidgetBase, _TemplatedMixin,
  _WidgetsInTemplateMixin, template, i18n, util) {

  return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

    i18n: i18n,
    templateString: template,
    wabWidget: null,
    baseClass: "add-data-widget-layers",

    postCreate: function() {
      this.inherited(arguments);
    },

    startup: function() {
      if (this._started) {
        return;
      }
      this._buildList();
      this._initListeners();
      this.inherited(arguments);
    },

    _addLayer: function(parentNode,layer) {
      //console.warn("layer",layer);
      var self = this, name = this._getLayerTitle(layer);
      var layerNode = domConstruct.create("div",{
        "class": "add-data-layerlist--listitem"
      }, parentNode);
      domConstruct.create("A",{
        "class": "remove-button",
        "href": "#",
        innerHTML: "<span class='esri-icon-trash'></span>",
        title: i18n.layerList.removeLayer,
        onclick: function(event) {
          event.preventDefault();
          try {
            if (self.wabWidget && self.wabWidget.map) {
              self.wabWidget.map.removeLayer(layer);
              domConstruct.destroy(layerNode);
            }
          } catch(err) {
            console.warn("Error removing layer.");
            console.warn(err);
          }
        }
      },layerNode);
      var nameNode = domConstruct.create("label",{
        "class": "layer-name"
      },layerNode);
      util.setNodeText(nameNode,name);
    },

    _buildList: function() {
      var self = this, hasLayer = false, ids = [], map = this.wabWidget.map;
      /*
      var captionNode = domConstruct.create("div",{
        "class": "caption"
      },contentNode);
      util.setNodeText(captionNode,i18n.layerList.caption);
      */
      var layersNode = domConstruct.create("div",{
        "class": "add-data-layerlist--list"
      });
      array.forEach(map.layerIds, function(id) {ids.push(id);});
      array.forEach(map.graphicsLayerIds, function(id) {ids.push(id);});
      ids.reverse();
      array.forEach(ids, function(id) {
        var lyr = map.getLayer(id);
        if (lyr && lyr.xtnAddData) {
          hasLayer = true;
          self._addLayer(layersNode,lyr);
        }
      });
      if (!hasLayer) {

        return domConstruct.create("div",{
          "class": "no-data-message",
          "innerHTML": i18n.layerList.noLayersAdded
        });
      }
      return layersNode;
    },

    _getLayerTitle: function(layer) {
      var title = "...";
      if (typeof layer.label === "string" && layer.label.length > 0) {
        title = layer.label;
      } else if (typeof layer.title === "string" && layer.title.length > 0) {
        title = layer.title;
      } else if (typeof layer.name === "string" && layer.name.length > 0) {
        title = layer.name;
      } else if (layer.url) {
        var svc;
        var index = layer.url.indexOf("/FeatureServer");
        if (index === -1) {
          index = layer.url.indexOf("/MapServer");
        }
        if (index === -1) {
          index = layer.url.indexOf("/ImageServer");
        }
        if (index === -1) {
          index = layer.url.indexOf("/service");
        }
        if (index > -1) {
          svc = layer.url.substring(0,index);
          svc = svc.substring(svc.lastIndexOf("/") + 1,svc.length);
          title = svc;
        }
      }
      return title;
    },

    _initListeners: function() {
      var self = this;
      this.own(on(this._backButton, "click", function(event) {
        event.preventDefault();
        self.hide();
      }));
    },

    show: function() {
      var content = this._buildList();
      this._title.innerHTML = i18n.layerList.caption;
      this._layerlist.innerHTML = "";
      if(content && content.tagName) {
        this._layerlist.appendChild(content);
      }
      if(this.wabWidget && this.wabWidget.domNode) {
        domClass.add(this.wabWidget.domNode, "layerlist-show");
      }
      domClass.add(this.domNode, "show");
    },

    hide: function() {
      if(this.wabWidget && this.wabWidget.domNode) {
        domClass.remove(this.wabWidget.domNode, "layerlist-show");
      }
      domClass.remove(this.domNode, "show");
    }

  });

});
