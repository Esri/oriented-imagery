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
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/on",
    "dojo/keys",
    "dojo/Deferred",
    "dojo/promise/all",
    "dojo/dom-class",
    "dojo/window",
    "dijit/Viewport",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/AddFromUrlPane.html",
    "dojo/i18n!../nls/strings",
    "./LayerLoader",
    "./util",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/CSVLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/GeoRSSLayer",
    "esri/layers/ImageParameters",
    "esri/layers/KMLLayer",
    "esri/layers/StreamLayer",
    "esri/layers/VectorTileLayer",
    "esri/layers/WFSLayer",
    "esri/layers/WMSLayer",
    "esri/layers/WMTSLayer",
    "esri/InfoTemplate",
    "dijit/form/Select"
  ],
  function(declare, lang, array, on, keys, Deferred, all, domClass, win, Viewport,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, template, i18n,
    LayerLoader, util, ArcGISDynamicMapServiceLayer,
    ArcGISImageServiceLayer, ArcGISTiledMapServiceLayer, CSVLayer,
    FeatureLayer, GeoRSSLayer, ImageParameters, KMLLayer, StreamLayer,
    VectorTileLayer, WFSLayer, WMSLayer, WMTSLayer,
    InfoTemplate) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      i18n: i18n,
      templateString: template,

      wabWidget: null,

      _dfd: null,

      postCreate: function() {
        this.inherited(arguments);
        this._updateExamples("ArcGIS");
        //this._restore();

        var self = this;
        this.own(on(this.urlTextBox, "keyup", function(evt) {
          if (evt.keyCode === keys.ENTER) {
            self.addClicked();
          } else {
            if (!domClass.contains(self.addButton, "disabled")) {
              self._setStatus("");
            }
          }
        }));
        /*
        this.own(on(this.urlTextBox,"change",function(evt) {
          if (!domClass.contains(self.addButton,"disabled")) {
            self._setStatus("");
          }
        }));
        */
        this.own(on(this.urlTextBox,"focus",function() {
          try {
            self.urlTextBox.select();
          } catch(ex) {}
        }));

        this.own(on(this.typeSelect, "change", function(type) {
          self._updateExamples(type);
        }));

        this.own(on(this.typeSelect.dropDown, "open", function(){
          var selectPopup = this.domNode.parentElement;
          if(selectPopup) {
            domClass.add(selectPopup, "add-data-widget-popup");
          }
        }));

        this.own(Viewport.on("resize", self.resize()));
      },

      destroy: function() {
        this.inherited(arguments);
      },

      addClicked: function() {
        var self = this,
          ok = false,
          btn = this.addButton;
        if (domClass.contains(btn, "disabled")) {
          return;
        }
        var type = this.typeSelect.get("value");
        var url = lang.trim(this.urlTextBox.value);
        if (url.length > 0) {
          if (url.indexOf("http://") === 0 || url.indexOf("https://") === 0) {
            ok = true;
          }
        }
        if (!ok) {
          return;
        }

        domClass.add(btn, "disabled");
        self._setStatus(i18n.search.item.messages.adding);
        var dfd = new Deferred();
        var map = this.wabWidget.map;
        this._handleAdd(dfd, map, type, url);
        dfd.then(function(result) {
          if (result) {
            //self.canRemove = true;
            self._setStatus("");
            //util.setNodeText(self.addButton,i18n.search.item.actions.remove);
            domClass.remove(btn, "disabled");
            // if (self.parentDialog) {
            //   self.parentDialog.hide();
            // }
          } else {
            self._setStatus(i18n.search.item.messages.addFailed);
            domClass.remove(btn, "disabled");
          }
        }).otherwise(function(error) {
          if (typeof error === "string" && error === "Unsupported") {
            self._setStatus(i18n.search.item.messages.unsupported);
            domClass.remove(btn, "disabled");
          } else {
            console.warn("Add layer failed.");
            console.warn(error);
            self._setStatus(i18n.search.item.messages.addFailed);
            domClass.remove(btn, "disabled");
            if (error && typeof error.message === "string" && error.message.length > 0) {
              // TODO show this message
              //console.warn("msg",error.message);
              self._setStatus(error.message);
              console.log("");
            }
          }
        });
      },

      examplesExpanderClicked: function() {
        domClass.toggle(this.examplesNode, "show");
      },

      preHide: function() {
        //this._persist();
      },

      resize: function() {
        var winBox = win.getBox(this.ownerDocument);
        if (winBox && typeof winBox.w !== "undefined") {
          //console.warn("winBox.w",winBox.w);
          if (winBox.w > 600) {
            domClass.add(this.urlTextBox, "url-textbox-wide");
          } else {
            domClass.remove(this.urlTextBox, "url-textbox-wide");
          }
        }
      },

      _handleAdd: function(dfd, map, type, url) {
        url = util.checkMixedContent(url);
        var lc = url.toLowerCase();
        var loader = new LayerLoader();
        var id = loader._generateLayerId();
        var self = this,
          layer = null;

        if (type === "ArcGIS") {
          if (lc.indexOf("/featureserver") > 0 || lc.indexOf("/mapserver") > 0) {
            loader._readRestInfo(url).then(function(info) {
              //console.warn("restInfo",info);
              if (info && typeof info.type === "string" && info.type === "Feature Layer") {
                layer = new FeatureLayer(url, {
                  id: id,
                  outFields: ["*"],
                  infoTemplate: new InfoTemplate()
                });
                self._waitThenAdd(dfd, map, type, loader, layer);
              } else {

                if (lc.indexOf("/featureserver") > 0) {
                  var dfds = [];
                  array.forEach(info.layers, function(li) {
                    var lyr = new FeatureLayer(url + "/" + li.id, {
                      id: loader._generateLayerId(),
                      outFields: ["*"],
                      infoTemplate: new InfoTemplate()
                    });
                    dfds.push(loader._waitForLayer(lyr));
                  });
                  all(dfds).then(function(results) {
                    var lyrs = [];
                    array.forEach(results, function(lyr) {
                      lyrs.push(lyr);
                    });
                    lyrs.reverse();
                    array.forEach(lyrs, function(lyr) {
                      loader._setFeatureLayerInfoTemplate(lyr);
                      lyr.xtnAddData = true;
                      map.addLayer(lyr);
                    });
                    dfd.resolve(lyrs);
                  }).otherwise(function(error) {
                    dfd.reject(error);
                  });

                } else if (lc.indexOf("/mapserver") > 0) {
                  if (info.tileInfo) {
                    layer = new ArcGISTiledMapServiceLayer(url, {
                      id: id
                    });
                  } else {
                    var mslOptions = {id:id};
                    if (info && info.supportedImageFormatTypes &&
                        info.supportedImageFormatTypes.indexOf("PNG32") !== -1) {
                      mslOptions.imageParameters = new ImageParameters();
                      mslOptions.imageParameters.format = "png32";
                    }
                    layer = new ArcGISDynamicMapServiceLayer(url,mslOptions);
                  }
                  self._waitThenAdd(dfd, map, type, loader, layer);
                }
              }
            }).otherwise(function(error) {
              dfd.reject(error);
            });

          } else if (lc.indexOf("/imageserver") > 0) {
            layer = new ArcGISImageServiceLayer(url, {
              id: id
            });
            this._waitThenAdd(dfd, map, type, loader, layer);

          } else if (lc.indexOf("/vectortileserver") > 0 ||
            lc.indexOf("/resources/styles/root.json") > 0) {
            if (!VectorTileLayer || !VectorTileLayer.supported()) {
              dfd.reject("Unsupported");
            } else {
              loader._checkVectorTileUrl(url, {}).then(function(vturl) {
                //console.warn("vectorTileUrl",vturl);
                layer = new VectorTileLayer(vturl, {
                  id: id
                });
                self._waitThenAdd(dfd, map, type, loader, layer);
              }).otherwise(function(error) {
                dfd.reject(error);
              });
            }
          } else if (lc.indexOf("/streamserver") > 0) {
            layer = new StreamLayer(url, {
              id: id,
              purgeOptions: {
                displayCount: 10000
              },
              infoTemplate: new InfoTemplate()
            });
            this._waitThenAdd(dfd, map, type, loader, layer);

          } else {
            dfd.reject("Unsupported");
          }
        } else if (type === "WMS") {
          layer = new WMSLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "WMTS") {
          layer = new WMTSLayer(url, {
            id: id
          });
        } else if (type === "WFS") {
          layer = new WFSLayer({
            id: id,
            url: url,
            infoTemplate: new InfoTemplate()
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
          console.warn("WFSLayer", layer);
        } else if (type === "KML") {
          layer = new KMLLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "GeoRSS") {
          layer = new GeoRSSLayer(url, {
            id: id
          });
          this._waitThenAdd(dfd, map, type, loader, layer);
        } else if (type === "CSV") {
          layer = new CSVLayer(url, {
            id: id
          });
          layer.setInfoTemplate(loader._newInfoTemplate());
          this._waitThenAdd(dfd, map, type, loader, layer);
        }
      },

      _persist: function() {
        //console.warn("AddFromUrlPane._persist");
        try {
          var type = this.typeSelect.get("value");
          var url = lang.trim(this.urlTextBox.value);
          this.wabWidget.xtnAddFromUrlPane = {
            type: type,
            url: url
          };
        } catch (ex) {}
      },

      _restore: function() {
        //console.warn("AddFromUrlPane._restore");
        try {
          var data = this.wabWidget.xtnAddFromUrlPane;
          if (data && typeof data.type === "string" && data.type.length > 0) {
            this.typeSelect.set("value", data.type);
          }
          if (data && typeof data.url === "string" && data.url.length > 0) {
            this.urlTextBox.value = data.url;
          }
        } catch (ex) {}
      },

      _setStatus: function(msg) {
        if(this.wabWidget) {
          this.wabWidget._setStatus(msg);
        }
      },

      _showLayers: function(){
        if (this.wabWidget) {
          this.wabWidget.showLayers();
        }
      },

      _updateExamples: function(type) {
        array.forEach(this.examplesNode.children, function(node) {
          var v = node.getAttribute("data-examples-type");
          if (typeof v === "string" && v.length > 0) {
            if (v === type) {
              node.style.display = "";
            } else {
              node.style.display = "none";
            }
          }
        });
      },

      _waitThenAdd: function(dfd, map, type, loader, layer) {
        //console.warn("_waitThenAdd",type,layer);
        loader._waitForLayer(layer).then(function(lyr) {
          //console.warn("_waitThenAdd.ok",lyr);
          if (type === "WMS") {
            loader._setWMSVisibleLayers(lyr);
          } else if (lyr && lyr.declaredClass === "esri.layers.ArcGISDynamicMapServiceLayer") {
            loader._setDynamicLayerInfoTemplates(lyr);
          //} else if (lyr && lyr.declaredClass === "esri.layers.ArcGISTiledMapServiceLayer") {
          } else if (lyr && lyr.declaredClass === "esri.layers.FeatureLayer") {
            loader._setFeatureLayerInfoTemplate(lyr);
          } else if (lyr && lyr.declaredClass === "esri.layers.CSVLayer") {
            loader._setFeatureLayerInfoTemplate(lyr);
          }
          lyr.xtnAddData = true;
          map.addLayer(lyr);
          dfd.resolve(lyr);
        }).otherwise(function(error) {
          //console.warn("_waitThenAdd.error",error);
          dfd.reject(error);
        });
      }

    });

  });
