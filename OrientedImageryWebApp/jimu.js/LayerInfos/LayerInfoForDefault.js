///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/Deferred',
  './LayerInfo',
  './LayerInfos',
  'dojox/gfx',
  'dojo/dom-construct',
  'dojo/dom-attr',
  'dojo/dom-class',
  'dojo/aspect',
  'jimu/portalUrlUtils',
  'jimu/utils',
  'esri/symbols/jsonUtils',
  'esri/dijit/PopupTemplate',
  'esri/dijit/Legend'
], function(declare, array, lang, Deferred, LayerInfo, LayerInfos, gfx, domConstruct,
domAttr, domClass, aspect, portalUrlUtils, jimuUtils, jsonUtils, PopupTemplate, Legend) {
  var clazz = declare(LayerInfo, {
    _legendsNode: null,
    controlPopupInfo: null,
    // operLayer = {
    //    layerObject: layer,
    //    title: layer.label || layer.title || layer.name || layer.id || " ",
    //    id: layerId || " ",
    //    subLayers: [operLayer, ... ],
    //    mapService: {layerInfo: , subId: },
    //    collection: {layerInfo: }
    // };
    constructor: function() {
      /*
      this.layerLoadedDef = new Deferred();
      if(this.layerObject) {
        this.layerObject.on('load', lang.hitch(this, function(){
          this.layerLoadedDef.resolve();
        }));
      }
      */

      // init control popup
      this._initControlPopup();
      // update layerObject.name if it has.
      this._updateLayerObjectName();
    },

    _updateLayerObjectName: function() {
      if(this.layerObject &&
         !this.layerObject.empty &&
         this.layerObject.name &&
         !lang.getObject("_wabProperties.originalLayerName", false, this.layerObject)) {
        lang.setObject('_wabProperties.originalLayerName',
                       this.layerObject.name,
                       this.layerObject);
        this.layerObject.name = this.title;
      }
    },

    _initOldFilter: function() {
      // default value of this._oldFilter is null
      if(this.layerObject &&
         !this.layerObject.empty &&
         this.layerObject.getDefinitionExpression) {
        this._oldFilter = this.layerObject.getDefinitionExpression();
      } else {
        this._oldFilter = null;
      }
    },

    _getLayerOptionsForCreateLayerObject: function() {
      var options = {};
      // assign id
      options.id = this.id;
      // prepare outFileds for create feature layer.
      var outFields = [];
      var infoTemplate = this.getInfoTemplate();
      if(infoTemplate && infoTemplate.info && infoTemplate.info.fieldInfos) {
        array.forEach(infoTemplate.info.fieldInfos, function(fieldInfo) {
          if(fieldInfo.visible) {
            outFields.push(fieldInfo.fieldName);
          }
        }, this);
      } else {
        outFields = ["*"];
      }
      options.outFields = outFields;

      // assign capabilities
      //options.resourceInfo = {capabilities: ["Query"]};

      /*
      // prepare popupInfo of webmap for talbe (just for table).
      if(this.originOperLayer.popupInfo && this.isTable) {
        var popupTemplate = new PopupTemplate(this.originOperLayer.popupInfo);
        if(popupTemplate ) {
          options.infoTemplate = popupTemplate;
        }
      }
      */
      return options;
    },

    getExtent: function() {
      var extent = this.originOperLayer.layerObject.fullExtent ||
        this.originOperLayer.layerObject.initialExtent;
      if(extent) {
        return this._convertGeometryToMapSpatialRef(extent);
      } else {
        var def = new Deferred();
        def.resolve(null);
        return def;
      }
    },


    _resetLayerObjectVisiblity: function(layerOptions) {
      var layerOption  = layerOptions ? layerOptions[this.id]: null;
      if(!this.originOperLayer.collection) {
        if(layerOption) {
          this.layerObject.setVisibility(layerOption.visible);
          this._visible = this.layerObject.visible;
        }
      }
    },

    initVisible: function() {
      /*jshint unused: false*/
      var visible = false;
      if(this.originOperLayer.collection && this._notFirstInitVisilbeFlag) {
        var FCLayerInfo = this.originOperLayer.collection.layerInfo;
        var parentLayerVisible = FCLayerInfo._visible;
        var subLayerVisible = this.layerObject.visible;

        if(FCLayerInfo._oldIsShowInMap !== FCLayerInfo.isShowInMap()) {
          // control from collection layer
          return;
        }

        if(parentLayerVisible) {
          if(subLayerVisible) {
            this._visible = true;
          } else {
            this._visible = false;
          }
        } else {
          if(subLayerVisible) {
            this._visible = true;
          } else {
            this._visible = false;
          }
        }
        FCLayerInfo._onVisibilityChanged();
      } else {
        visible = this.originOperLayer.layerObject.visible;
        this._visible = visible;
      }
      this._notFirstInitVisilbeFlag = true;
    },

    _initControlPopup: function() {
      this.controlPopupInfo = {
        //enablePopup: this.originOperLayer.disablePopup ? false : true,
        enablePopup: this.layerObject.infoTemplate ? true: false,
        infoTemplate: this.layerObject.infoTemplate
      };
      // backup infoTemplate to layer.
      this.layerObject._infoTemplate = this.layerObject.infoTemplate;
      aspect.after(this.layerObject, "setInfoTemplate", lang.hitch(this, function(){
        this.layerObject._infoTemplate = this.layerObject.infoTemplate;
        this.controlPopupInfo.infoTemplate = this.layerObject.infoTemplate;
        if(!this.controlPopupInfo.enablePopup) {
          this.layerObject.infoTemplate = null;
        }
      }));
    },

    _setTopLayerVisible: function(visible) {
      if(this.originOperLayer.collection){
        //collection
        //click directly
        if(this.originOperLayer.collection.layerInfo._visible) {
          if(visible) {
            this.layerObject.show();
            this._visible = true;
          } else {
            this.layerObject.hide();
            this._visible = false;
          }
        } else {
          if(visible) {
            this.layerObject.hide();
            this._visible = true;
          } else {
            this.layerObject.hide();
            this._visible = false;
          }
        }
      } else {
        if (visible) {
          this.layerObject.show();
        } else {
          this.layerObject.hide();
        }
        this._visible = visible;
      }
    },

    setLayerVisiblefromTopLayer: function() {
      //click from top collecton
      if(this.originOperLayer.collection.layerInfo._visible) {
        if(this._visible) {
          this.layerObject.show();
        }
      } else {
        this.layerObject.hide();
      }
    },

    //---------------new section-----------------------------------------

    // obtainLegendsNode: function() {
    //   var layer = this.originOperLayer.layerObject;
    //   var legendsNode = domConstruct.create("div", {
    //     "class": "legends-div"
    //   });

    //   if (layer && layer.renderer) {
    //     this._initLegendsNode(legendsNode);
    //   } else {
    //     this.layerLoadedDef.then(lang.hitch(this, function(){
    //       this._initLegendsNode(legendsNode);
    //     }));
    //   }
    //   return legendsNode;
    // },

    createLegendsNode: function() {
      var legendsNode = domConstruct.create("div", {
        // placeAt 'legendsNode' to document.body first, else can not
        // show legend on IE8.
        "class": "legends-div jimu-legends-div-flag jimu-leading-margin1",
        "legendsDivId": this.id
      }, document.body);
      domConstruct.create("img", {
        "class": "legends-loading-img",
        "src":  require.toUrl('jimu') + '/images/loading.gif'
      }, legendsNode);
      return legendsNode;
    },

    drawLegends: function(legendsNode) {
      var useLegendDijit = true;
      if (useLegendDijit) {
        this._initLegendsNodeByLegendDijit(legendsNode);
      } else {
        this._initLegendsNode(legendsNode);
      }
    },

    _initLegendsNodeByLegendDijit: function(legendsNode) {
      if( this.layerObject &&
      !this.layerObject.empty &&
      (!this.originOperLayer.subLayer || this.originOperLayer.subLayers.length === 0) &&
      this.layerObject.loaded) {
        // delete loading image
        domConstruct.empty(legendsNode);
        // remove 'jimu-legends-div-flag'
        domClass.remove(legendsNode, 'jimu-legends-div-flag');
        var layerInfos = [{
          layer: this.layerObject
        }];
        var legend = new Legend({
          map: this.map,
          layerInfos: layerInfos,
          arrangement: Legend.ALIGN_LEFT,
          respectCurrentMapScale: false,
          respectVisibility: false
        }, domConstruct.create("div", {}, legendsNode));

        legend.startup();
        legendsNode._legendDijit = legend;
      }
    },

    _initLegendsNode: function(legendsNode) {
      var legendInfos = [];
      var layer = this.layerObject;

      if( this.layerObject &&
          !this.layerObject.empty &&
          (!this.originOperLayer.subLayer || this.originOperLayer.subLayers.length === 0)) {
        // delete loading image
        domConstruct.empty(legendsNode);
        // layer has renderer that means layer has been loadded.
        if (layer.renderer) {
          if (layer.renderer.infos) {
            legendInfos = lang.clone(layer.renderer.infos); // todo
          } else {
            legendInfos.push({
              label: layer.renderer.label,
              symbol: layer.renderer.symbol
            });
          }

          if(layer.renderer && layer.renderer.defaultSymbol && legendInfos.length > 0) {
            legendInfos.push({
              label: layer.renderer.defaultLabel || "others",
              symbol: layer.renderer.defaultSymbol
            });
          }

          array.forEach(legendInfos, function(legendInfo) {
            legendInfo.legendDiv = domConstruct.create("div", {
              "class": "legend-div"
            }, legendsNode);

            legendInfo.symbolDiv = domConstruct.create("div", {
              "class": "legend-symbol jimu-float-leading"
            }, legendInfo.legendDiv);
            legendInfo.labelDiv = domConstruct.create("div", {
              "class": "legend-label jimu-float-leading",
              "innerHTML": legendInfo.label || " "
            }, legendInfo.legendDiv);

            if(legendInfo.symbol.type === "textsymbol") {
              domAttr.set(legendInfo.symbolDiv, "innerHTML", legendInfo.symbol.text);
            } else {
              var mySurface = gfx.createSurface(legendInfo.symbolDiv, 50, 50);
              var descriptors = jsonUtils.getShapeDescriptors(legendInfo.symbol);
              var shape = mySurface.createShape(descriptors.defaultShape)
                          .setFill(descriptors.fill).setStroke(descriptors.stroke);
              shape.setTransform(gfx.matrix.translate(25, 25));
            }
          }, this);
        }
      }
    },

    obtainNewSubLayers: function() {
      var newSubLayers = [];
      /*
      if(!this.originOperLayer.subLayers || this.originOperLayer.subLayers.length === 0) {
        //***
      } else {
      */
      if(this.originOperLayer.subLayers && this.originOperLayer.subLayers.length !== 0) {
        array.forEach(this.originOperLayer.subLayers, function(subOperLayer){
          var subLayerInfo = new clazz(subOperLayer, this.map);
          newSubLayers.push(subLayerInfo);

          subLayerInfo.init();
        }, this);
      }
      return newSubLayers;
    },

    getOpacity: function() {
      if (this.layerObject.opacity) {
        return this.layerObject.opacity;
      } else {
        return 1;
      }
    },

    setOpacity: function(opacity) {
      if (this.layerObject.setOpacity) {
        this.layerObject.setOpacity(opacity);
      }
    },

    // get default popupInfo
    // Todo... improve the getPopupInfo interface.
    _getDefaultPopupInfo: function(object) {
      var popupInfo = null;
      if(object && object.fields) {
        popupInfo = {
          title: object.name,
          fieldInfos:[],
          description: null,
          showAttachments: true,
          mediaInfos: []
        };
        array.forEach(object.fields, function(field){
          if(field.name !== object.objectIdField &&
             field.name.toLowerCase() !== "globalid" &&
             field.name.toLowerCase() !== "shape"){
            var fieldInfo = jimuUtils.getDefaultPortalFieldInfo(field);
            fieldInfo.visible = true;
            fieldInfo.isEditable = field.editable;
            popupInfo.fieldInfos.push(fieldInfo);
          }
        });
      }
      return popupInfo;
    },

    // control popup
    // this method depend on layerObject or webmap's popupInfo, otherwise will return null;
    _getDefaultPopupTemplate: function(object) {
      var popupTemplate = null;
      /*
      if(object && object.fields) {
        var popupInfo = {
          title: object.name,
          fieldInfos:[],
          description: null,
          showAttachments: true,
          mediaInfos: []
        };
        array.forEach(object.fields, function(field){
          if(field.name !== object.objectIdField &&
             field.name.toLowerCase() !== "globalid" &&
             field.name.toLowerCase() !== "shape"){
            var fieldInfo = jimuUtils.getDefaultPortalFieldInfo(field);
            fieldInfo.visible = true;
            fieldInfo.isEditable = field.editable;
            popupInfo.fieldInfos.push(fieldInfo);
          }
        });
      }
      */
      // Todo... improve the getPopupInfo interface.
      var popupInfo = this.getPopupInfo() || this._getDefaultPopupInfo(object);
      if(popupInfo) {
        popupTemplate = new PopupTemplate(popupInfo);
      }
      return popupTemplate;
    },

    enablePopup: function() {
      return this.loadInfoTemplate().then(lang.hitch(this, function() {
        if(this.controlPopupInfo.infoTemplate) {
          this.controlPopupInfo.enablePopup = true;
          this.layerObject.infoTemplate = this.controlPopupInfo.infoTemplate;
          return true;
        } else {
          return false;
        }
      }));
    },

    disablePopup: function() {
      this.controlPopupInfo.enablePopup = false;
      this.layerObject.infoTemplate = null;
    },

    isPopupEnabled: function() {
      var isPopupEnabled;
      if(this.controlPopupInfo &&
         this.controlPopupInfo.enablePopup) {
        isPopupEnabled = true;
      } else {
        isPopupEnabled = false;
      }
      return isPopupEnabled;
    },

    /*
    loadInfoTemplate: function() {
      var def = new Deferred();
      if(!this.controlPopupInfo.infoTemplate) {
        this.controlPopupInfo.infoTemplate = this._getDefaultPopupTemplate(this.layerObject);
      }
      def.resolve(this.controlPopupInfo.infoTemplate);
      return def;
    },
    */

    // getLayerObject first because of some layerObjects has not been loaded, such as tabel.
    loadInfoTemplate: function() {
      var def = new Deferred();
      if(this.controlPopupInfo.infoTemplate) {
        def.resolve(this.controlPopupInfo.infoTemplate);
      } else {
        this.getLayerObject().then(lang.hitch(this, function() {
          this.controlPopupInfo.infoTemplate = this._getDefaultPopupTemplate(this.layerObject);
          def.resolve(this.controlPopupInfo.infoTemplate);
        }), lang.hitch(this, function() {
          def.resolve(null);
        }));
      }
      return def;
    },

    getInfoTemplate: function() {
      return this.controlPopupInfo.infoTemplate;
    },

    _getRelatedUrls: function(layerObject, relationshipRole) {
      var relatedUrls = [];
      if(!layerObject || !layerObject.url || !layerObject.relationships) {
        return relatedUrls;
      }

      var index = layerObject.url.lastIndexOf('/');
      var serverUrl = layerObject.url.slice(0, index);
      array.forEach(layerObject.relationships, function(relationship) {
        if (!relationshipRole ||
        !relationship.role ||
        relationshipRole === relationship.role) {
          var subUrl = serverUrl + '/' + relationship.relatedTableId.toString();
          relatedUrls.push(subUrl);
        }
      }, this);

      return relatedUrls;
    },

    // summary:
    //   get related tableInfo array
    // parameters:
    //   relationshipRole: optional
    //       "esriRelRoleOrigin"
    //       "esriRelRoleDestination"
    getRelatedTableInfoArray: function(relationshipRole) {
      var relatedTableInfoArray = [];
      var def = new Deferred();
      this.getLayerObject().then(lang.hitch(this, function(layerObject) {
        var relatedUrls = this._getRelatedUrls(layerObject, relationshipRole);
        if(relatedUrls.length === 0) {
          def.resolve(relatedTableInfoArray);
        } else {
          LayerInfos.getInstanceSync().traversalAll(lang.hitch(this, function(layerInfo) {
            var relatedUrlIndex = -1;
            if(relatedUrls.length === 0) {
              // all were found
              return true;
            } else {
              array.forEach(relatedUrls, function(relatedUrl, index) {
                if(lang.getObject("layerObject.url", false, layerInfo) &&
                   (portalUrlUtils.removeProtocol(relatedUrl.toString().replace(/\/+/g, '/').toLowerCase()) ===
                   portalUrlUtils.removeProtocol(
                                 layerInfo.layerObject.url.toString().replace(/\/+/g, '/').toLowerCase()))
                ) {
                  relatedTableInfoArray.push(layerInfo);
                  relatedUrlIndex = index;
                }
              }, this);
              if(relatedUrlIndex >= 0) {
                relatedUrls.splice(relatedUrlIndex, 1);
              }
              return false;
            }
          }));
          def.resolve(relatedTableInfoArray);
        }
      }), lang.hitch(this, function() {
        def.resolve(relatedTableInfoArray);
      }));
      return def;
    },

    getFilter: function() {
      // summary:
      //   get filter from layerObject.
      // description:
      //   return null if does not have or cannot get it.
      var filter;
      if(this.layerObject &&
         !this.layerObject.empty &&
         this.layerObject.getDefinitionExpression) {
        filter = this.layerObject.getDefinitionExpression();
      } else {
        filter = null;
      }
      return filter;
    },

    setFilter: function(layerDefinitionExpression) {
      // summary:
      //   set layer definition expression to layerObject.
      // paramtter
      //   layerDefinitionExpression: layer definition expression
      //   set 'null' to delete layer definition express
      // description:
      //   operation will skip if layer not support filter.
      if(this.layerObject &&
         !this.layerObject.empty &&
         this.layerObject.setDefinitionExpression) {
        this.layerObject.setDefinitionExpression(layerDefinitionExpression);
      }
    }

  });
  return clazz;
});
