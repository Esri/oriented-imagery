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
    "dojo/_base/json",
    "dojo/on",
    "dojo/Deferred",
    "dojo/dom-class",
    "dijit/Viewport",
    "dojo/sniff",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/AddFromFilePane.html",
    "dojo/i18n!../nls/strings",
    "./LayerLoader",
    "./util",
    "dojo/_base/kernel",
    "esri/request",
    "esri/layers/FeatureLayer",
    "esri/layers/KMLLayer",
    "esri/geometry/scaleUtils",
    "jimu/dijit/Message",
    "jimu/dijit/CheckBox"
  ],
  function(declare, lang, array, dojoJson, on, Deferred, domClass, Viewport, sniff,
    _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,template, i18n,
     LayerLoader, util, kernel, esriRequest, FeatureLayer, KMLLayer, scaleUtils,
     Message) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      i18n: i18n,
      templateString: template,
      wabWidget: null,
      maxRecordCount: 1000,
      maxRecordThreshold: 100000,
      SHAPETYPE_ICONS: [{
        "type": "shapefile",
        "url": "images/filetypes/zip.svg"
      },{
        "type": "csv",
        "url": "images/filetypes/csv.svg"
      },{
        "type": "kml",
        "url": "images/filetypes/kml.svg"
      },{
        "type": "gpx",
        "url": "images/filetypes/gpx.svg"
      },{
        "type": "geojson",
        "url": "images/filetypes/geojson.svg"
      }],

      postCreate: function() {
        this.inherited(arguments);
        this.generalizeCheckBox.setLabel(i18n.addFromFile.generalizeOn);
        this.own(Viewport.on("resize",this.resize()));
      },

      destroy: function() {
        this.inherited(arguments);
        //console.warn("AddFromFilePane::destroy");
      },

      startup: function() {
        if (this._started) {
          return;
        }
        if (this.wabWidget.isPortal) {
          this.SHAPETYPE_ICONS = [{
            "type": "shapefile",
            "url": "images/filetypes/zip.svg"
          },{
            "type": "csv",
            "url": "images/filetypes/csv.svg"
          },{
            "type": "kml",
            "url": "images/filetypes/kml.svg"
          }];
        }
        this.inherited(arguments);
        //console.warn("AddFromFilePane.startup .......................");

        var self = this, dropNode = this.dropArea;

        var v, config = this.wabWidget.config;
        if (config.addFromFile) {
          try {
            v = Number(config.addFromFile.maxRecordCount);
            if (typeof v === "number" && !isNaN(v)) {
              v = Math.floor(v);
              if (v >= 1 && v <= this.maxRecordThreshold) {
                this.maxRecordCount = v;
              }
            }
          } catch (ex) {
            console.warn("Error setting AddFromFile.maxRecordCount:");
            console.warn(ex);
          }
        }

        if(i18n.addFromFile.types) {
          try {
            for (var fileTypeName in i18n.addFromFile.types) {
              this._createFileTypeImage(fileTypeName);
            }
          } catch (ex) {
            console.warn("Error reading support file types:");
            console.warn(ex);
          }
        }

        this.own(on(this.fileNode,"change",function(){
          if (!self._getBusy()) {
            self._setBusy(true);
            var fileInfo = self._getFileInfo();
            if (fileInfo.ok) {
              self._execute(fileInfo);
            }
          }
        }));

        this.own(on(this.uploadLabel,"click",function(event){
          if (self._getBusy()) {
            event.preventDefault();
            event.stopPropagation();
          }
        }));

        this.own(on(dropNode,"dragenter",function(event) {
          event.preventDefault();
          if (!self._getBusy()) {
            domClass.add(dropNode,"hit");
            self._setStatus("");
          }
        }));
        this.own(on(dropNode,"dragleave",function(event) {
          event.preventDefault();
          domClass.remove(dropNode,"hit");
        }));
        this.own(on(dropNode,"dragover",function(event) {
          event.preventDefault();
        }));
        this.own(on(dropNode,"drop",function(event) {
          event.preventDefault();
          event.stopPropagation();
          //console.warn("drop");
          if (!self._getBusy()) {
            self._setBusy(true);
            var fileInfo = self._getFileInfo(event);
            if (fileInfo.ok) {
              self._execute(fileInfo);
            }
          }
        }));

        // by default, dropping a file on a page will cause
        // the browser to navigate to the file
        var nd = this.wabWidget.domNode;
        this.own(on(nd,"dragenter",function(event) {
          event.preventDefault();
        }));
        this.own(on(nd,"dragleave",function(event) {
          event.preventDefault();
        }));
        this.own(on(nd,"dragover",function(event) {
          event.preventDefault();
        }));
        this.own(on(nd,"drop",function(event) {
          event.preventDefault();
        }));

        this.own(on(this.hintButton,"click", lang.hitch(this, function(event) {
          event.preventDefault();

          var test = '<div class="intro">' +
            '<label>' + i18n.addFromFile.intro + "</label>" +
            '<ul>' +
              '<li>' + i18n.addFromFile.types.Shapefile + '</li>' +
              '<li>' + i18n.addFromFile.types.CSV + '</li>' +
              '<li>' + i18n.addFromFile.types.KML + '</li>' +
              '<li>' + i18n.addFromFile.types.GPX + '</li>' +
              '<li>' + i18n.addFromFile.types.GeoJSON + '</li>' +
              '<li><span class="note">' + i18n.addFromFile.maxFeaturesAllowedPattern
                        .replace("{count}", this.maxRecordCount) + '</span></li>' +
            '</ul>' +
          '</div>';

          if (this.wabWidget.isPortal) {
            test = '<div class="intro">' +
              '<label>' + i18n.addFromFile.intro + "</label>" +
              '<ul>' +
                '<li>' + i18n.addFromFile.types.Shapefile + '</li>' +
                '<li>' + i18n.addFromFile.types.CSV + '</li>' +
                '<li>' + i18n.addFromFile.types.KML + '</li>' +
                '<li><span class="note">' + i18n.addFromFile.maxFeaturesAllowedPattern
                          .replace("{count}", this.maxRecordCount) + '</span></li>' +
              '</ul>' +
            '</div>';
          }

          new Message({message: test});
        })));
      },

      _addFeatures: function(job,featureCollection) {
        //var triggerError = null; triggerError.length;
        var fullExtent, layers = [], map = job.map, nLayers = 0;
        var loader = new LayerLoader();
        if (featureCollection.layers) {
          nLayers = featureCollection.layers.length;
        }
        array.forEach(featureCollection.layers,function(layer) {
          var featureLayer = new FeatureLayer(layer, {
            id: loader._generateLayerId(),
            outFields: ["*"]
          });
          featureLayer.xtnAddData = true;
          if (featureLayer.graphics) {
            job.numFeatures += featureLayer.graphics.length;
          }
          if (nLayers === 0) {
            featureLayer.name = job.baseFileName;
          } else if (typeof featureLayer.name !== "string" ||
            featureLayer.name.length === 0) {
            featureLayer.name = job.baseFileName;
          } else if (featureLayer.name.indexOf(job.baseFileName) !== 0) {
            featureLayer.name = i18n.addFromFile.layerNamePattern
              .replace("{filename}",job.baseFileName)
              .replace("{name}",featureLayer.name);
          }
          loader._setFeatureLayerInfoTemplate(featureLayer,null,null);
          if (featureLayer.fullExtent) {
            if (!fullExtent) {
              fullExtent = featureLayer.fullExtent;
            } else {
              fullExtent = fullExtent.union(featureLayer.fullExtent);
            }
          }
          layers.push(featureLayer);
        });
        if (layers.length > 0) {
          map.addLayers(layers);
          if (fullExtent) {
            map.setExtent(fullExtent.expand(1.25),true);
          }
        }
      },

      _analyze: function(job,formData) {
        if (job.fileType.toLowerCase() !== "csv") {
          var dfd = new Deferred();
          dfd.resolve(null);
          return dfd;
        }

        var geocoder = null;
        if (this.wabWidget.batchGeocoderServers &&
            this.wabWidget.batchGeocoderServers.length > 0) {
          geocoder = this.wabWidget.batchGeocoderServers[0];
        }
        var analyzeParams = {
          "enableGlobalGeocoding": true,
          "sourceLocale": kernel.locale
        };
        if (geocoder) {
          analyzeParams.geocodeServiceUrl = geocoder.url;
          if (geocoder.isWorldGeocodeServer) {
            analyzeParams.sourceCountry = "world";
            analyzeParams.sourceCountryHint = "";
          }
        }

        var url = job.sharingUrl + "/content/features/analyze";
        var content = {
          f: "json",
          filetype: job.fileType.toLowerCase(),
          analyzeParameters: window.JSON.stringify(analyzeParams)
        };
        var req = esriRequest({
          url: url,
          content: content,
          form: formData,
          handleAs: "json"
        });
        req.then(function(response){
          //console.warn("Analyzed:",response);
          if (response && response.publishParameters) {
            job.publishParameters = response.publishParameters;
          }
        });
        return req;
      },

      _createFileTypeImage: function(fileTypeName) {
        var isRTL = window.isRTL;
        array.some(this.SHAPETYPE_ICONS, lang.hitch(this, function(filetypeIcon, index) {
          if(fileTypeName.toLowerCase() === filetypeIcon.type.toLowerCase()) {
            var iconImg = document.createElement("IMG");
            iconImg.src = this.wabWidget.folderUrl + filetypeIcon.url;
            iconImg.alt = fileTypeName;
            if(index === 0) {
              iconImg.className += " " + (isRTL ? "last" : "first") + "-type-icon";
            } else if(index === 1) {
              iconImg.className += " second-" + (isRTL ? "last" : "first") + "-type-icon";
            } else if(index === (this.SHAPETYPE_ICONS.length - 2)) {
              iconImg.className += " second-" + (isRTL ? "first" : "last") + "-type-icon";
            } else if (index === (this.SHAPETYPE_ICONS.length - 1)) {
              iconImg.className += " " + (isRTL ? "first" : "last") + "-type-icon";
            }
            this.supportedFileTypes.appendChild(iconImg);
          }
        }));
      },

      _execute: function(fileInfo) {
        var job = {
          map: this.wabWidget.map,
          sharingUrl: this.wabWidget.getSharingUrl(),
          baseFileName: fileInfo.baseFileName,
          fileName: fileInfo.fileName,
          fileType: fileInfo.fileType,
          generalize: !!this.generalizeCheckBox.getValue(),
          publishParameters: {},
          numFeatures: 0
        };
        this._setBusy(true);
        this._setStatus(i18n.addFromFile.addingPattern
          .replace("{filename}",fileInfo.fileName));
        if (fileInfo.fileType.toLowerCase() === "kml") {
          return this._executeKml(fileInfo);
        }

        var fileName = fileInfo.fileName;
        var self = this, formData = new FormData();
        formData.append("file",fileInfo.file);
        self._analyze(job,formData).then(function(){
          return self._generateFeatures(job,formData);
        }).then(function(response){
          //console.warn("Generated",response);
          self._addFeatures(job,response.featureCollection);
          self._setBusy(false);
          self._setStatus(i18n.addFromFile.featureCountPattern
            .replace("{filename}",fileName)
            .replace("{count}",job.numFeatures)
          );
        }).otherwise(function(error){
          self._setBusy(false);
          self._setStatus(i18n.addFromFile.addFailedPattern
            .replace("{filename}",fileName));
          console.warn("Error generating features.");
          console.warn(error);
          if (error && typeof error.message === "string" && error.message.length > 0) {
            // e.g. The maximum number of records allowed (1000) has been exceeded.
            new Message({
              titleLabel: i18n._widgetLabel,
              message: error.message
            });
          }
        });
      },

      _executeKml: function(fileInfo) {
        var _self = this;
        var reader = new FileReader();
        var map = this.wabWidget.map;

        var handleError = function(pfx,error) {
          _self._setBusy(false);
          _self._setStatus(i18n.addFromFile.addFailedPattern
            .replace("{filename}",fileInfo.fileName));
          console.warn(pfx);
          console.error(error);
          if (error && typeof error.message === "string" && error.message.length > 0) {
            new Message({
              titleLabel: i18n._widgetLabel,
              message: error.message
            });
          }
        };

        reader.onerror = function(err) {
          handleError("FileReader::onerror",err);
        };

        reader.onload = function(event) {
          if (reader.error) {
            handleError("FileReader::error",reader.error);
            return;
          }
          var v = event.target.result;
          var url = "";
          var loader = new LayerLoader();
          var id = loader._generateLayerId();
          var layer = new KMLLayer(url, {
            id: id,
            name: fileInfo.fileName,
            linkInfo: {
              visibility: false
            }
          });
          layer.visible = true;
          delete layer.linkInfo;

          layer._parseKml = function() {
            var self = this;
            this._fireUpdateStart();
            // Send viewFormat as necessary if this kml layer represents a
            // network link i.e., in the constructor options.linkInfo is
            // available and linkInfo has viewFormat property
            this._io = esriRequest({
              url: this.serviceUrl,
              content: {
                /*url: this._url.path + this._getQueryParameters(map),*/
                kmlString: encodeURIComponent(v),
                model: "simple",
                folders: "",
                refresh: this.loaded ? true : undefined,
                outSR: dojoJson.toJson(this._outSR.toJson())
              },
              callbackParamName: "callback",
              load: function(response) {
                //console.warn("response",response);
                self._io = null;
                self._initLayer(response);
                loader._waitForLayer(layer).then(function(lyr) {
                  var num = 0;
                  lyr.name = fileInfo.fileName;
                  lyr.xtnAddData = true;
                  array.forEach(lyr.getLayers(),function(l) {
                    if (l && l.graphics && l.graphics.length > 0 ) {
                      num += l.graphics.length;
                    }
                  });
                  map.addLayer(lyr);
                  _self._setBusy(false);
                  _self._setStatus(i18n.addFromFile.featureCountPattern
                    .replace("{filename}",fileInfo.fileName)
                    .replace("{count}",num)
                  );
                }).otherwise(function(err) {
                  handleError("kml-_waitForLayer.error",err);
                });
              },
              error: function(err) {
                self._io = null;
                err = lang.mixin(new Error(), err);
                err.message = "Unable to load KML: " + (err.message || "");
                self._fireUpdateEnd(err);
                self._errorHandler(err);
                handleError("Unable to load KML",err);
              }
            },{usePost:true});
          };
          layer._parseKml();

        };

        try {
          reader.readAsText(fileInfo.file);
        } catch(ex) {
          handleError("FileReader::readAsText",ex);
        }
      },

      _generateFeatures: function(job,formData) {
        var url = job.sharingUrl + "/content/features/generate";
        job.publishParameters =  job.publishParameters || {};
        var params = lang.mixin(job.publishParameters,{
          name: job.baseFileName,
          targetSR: job.map.spatialReference,
          maxRecordCount: this.maxRecordCount,
          enforceInputFileSizeLimit: true,
          enforceOutputJsonSizeLimit: true
        });
        if (job.generalize) {
          // 1:40,000
          var extent = scaleUtils.getExtentForScale(job.map,40000);
          var resolution = extent.getWidth() / job.map.width;
          params.generalize = true;
          params.maxAllowableOffset = resolution;
          // 1:4,000
          resolution = resolution / 10;
          var numDecimals = 0;
          while (resolution < 1) {
            resolution = resolution * 10;
            numDecimals++;
          }
          params.reducePrecision = true;
          params.numberOfDigitsAfterDecimal = numDecimals;
        }
        var content = {
          f: "json",
          filetype: job.fileType.toLowerCase(),
          publishParameters: window.JSON.stringify(params)
        };
        return esriRequest({
          url: url,
          content: content,
          form: formData,
          handleAs: "json"
        });
      },

      _getBaseFileName: function(fileName) {
        var a, baseFileName = fileName;
        if (sniff("ie")) { //fileName is full path in IE so extract the file name
          a = baseFileName.split("\\");
          baseFileName = a[a.length - 1];
        }
        a = baseFileName.split(".");
        //Chrome and IE add c:\fakepath to the value - we need to remove it
        baseFileName = a[0].replace("c:\\fakepath\\","");
        return baseFileName;
      },

      _getBusy: function() {
        return domClass.contains(this.uploadLabel,"disabled");
      },

      _getFileInfo: function(dropEvent) {
        var file, files;
        var info = {
          ok: false,
          file: null,
          fileName: null,
          fileType: null
        };
        if (dropEvent) {
          files = dropEvent.dataTransfer.files;
        } else {
          files = this.fileNode.files;
        }
        if (files && files.length === 1) {
          info.file = file = files[0];
          info.fileName = file.name;
          if (util.endsWith(file.name,".zip")) {
            info.ok = true;
            info.fileType = "Shapefile";
          } else if (util.endsWith(file.name,".csv")) {
            info.ok = true;
            info.fileType = "CSV";
          } else if (util.endsWith(file.name,".kml")) {
            info.ok = true;
            info.fileType = "KML";
          } else if (util.endsWith(file.name,".gpx")) {
            info.ok = true;
            info.fileType = "GPX";
          } else if (util.endsWith(file.name,".geojson") ||
            util.endsWith(file.name,".geo.json")) {
            info.ok = true;
            info.fileType = "GeoJSON";
          }
        }
        if (info.ok) {
          info.ok = array.some(this.SHAPETYPE_ICONS,function(filetypeIcon) {
            return filetypeIcon.type.toLowerCase() === info.fileType.toLowerCase();
          });
        }
        if (info.ok) {
          info.baseFileName = this._getBaseFileName(info.fileName);
        } else {
          var msg = i18n.addFromFile.invalidType, usePopup = true;
          if (typeof info.fileName === "string" && info.fileName.length > 0) {
            msg = i18n.addFromFile.invalidTypePattern
              .replace("{filename}",info.fileName);
          }
          this._setBusy(false);
          this._setStatus(msg);
          if (usePopup) {
            var nd = document.createElement("div");
            nd.appendChild(document.createTextNode(msg));
            new Message({
              titleLabel: i18n._widgetLabel,
              message: nd
            });
          }
        }
        return info;
      },

      resize: function() {
      },

      _setBusy: function(isBusy) {
        if (isBusy) {
          domClass.add(this.uploadLabel,"disabled");
          domClass.add(this.dropArea,["hit","disabled"]);
        } else {
          domClass.remove(this.uploadLabel,"disabled");
          domClass.remove(this.dropArea,["hit","disabled"]);
        }
      },

      _setStatus: function(msg) {
        if(this.wabWidget) {
          this.wabWidget._setStatus(msg);
        }
      }

    });

  });
