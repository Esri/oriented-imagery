///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2019 Esri. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
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
    'dijit/_WidgetsInTemplateMixin',
    'dojo/text!./Widget.html',
    'jimu/BaseWidget',
    "dojo/_base/lang", "dojo/Deferred",
    'dojo/dom-construct', "dojo/dom-class", "dojo/dom", "dojo/on",
    "dojo/dom-style", "esri/identity/IdentityManager", "esri/tasks/support/Query", "esri/tasks/QueryTask", "esri/request", "esri/layers/Layer",
    "dojo/html", "dojox/layout/ResizeHandle", "esri/geometry/Extent", "esri/tasks/GeometryService", "esri/tasks/support/ProjectParameters",
    "esri/geometry/Polygon", "esri/geometry/Mesh", "esri/geometry/SpatialReference", "esri/portal/Portal", "esri/geometry/geometryEngine",
    "esri/Camera",
    "esri/Graphic", "esri/geometry/Point", "esri/geometry/Polyline", "esri/geometry/Multipoint", "esri/core/watchUtils", "esri/widgets/FeatureForm",
    "esri/layers/GraphicsLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/WMTSLayer",
    "esri/layers/WMSLayer",
    "esri/layers/KMLLayer", "dijit/registry",
    "https://oi.geocloud.com/api/v2.3/main.js",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/TextBox"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                lang, Deferred,
                domConstruct, domClass, dom, on, domStyle, IdentityManager, Query, QueryTask, esriRequest, Layer, html, ResizeHandle, Extent, GeometryService, ProjectParameters, Polygon, Mesh, SpatialReference, arcgisPortal, geometryEngine, Camera, Graphic, Point, Polyline, Multipoint, watchUtils, FeatureForm, GraphicsLayer, FeatureLayer, WMTSLayer, WMSLayer, KMLLayer, registry) {

            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'OrientedImagery3D',
                baseClass: 'jimu-widget-OrientedImagery3D',
                oiApiLoaded: false,
                activeImageID: null,
                widgetOpen: false,
				graphicsType: "3d",		   
                selectLocationFlag: false,
                vectorLayerAdded: [],
                layerVisibleStatus: {g: [], b: [], o: []},
                featureSelected: null,
                startup: function () {
                    this.inherited(arguments);
                },
                postCreate: function () {
                    this.graphicsLayer = new GraphicsLayer({
                        id: "oi-graphicsLayer",
                        title: "Oriented Imagery",
                        elevationInfo: {mode: "relative-to-ground", Offset: 0}
                    });

                    this.sceneView.map.add(this.graphicsLayer);
                    this.loadingNode = domConstruct.toDom('<img  style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + this.amdFolder + '/images/loader-ie9.gif">');
                    domConstruct.place(this.loadingNode, this.domNode);
                    this.hideLoading();
                    this.selectOIC.addEventListener("change", lang.hitch(this, function () {
                        this.selectFeatureService(this.selectOIC.value);
                    }));
                    this.imagePoints.on("change", lang.hitch(this, function () {
                        this.turningOnOffFeatures('imagePoints', this.imagePoints.checked);
                    }));
                    this.currentCoverage.on("change", lang.hitch(this, function () {
                        this.turningOnOffFeatures("currentCoverage", this.currentCoverage.checked);
                    }));
                    this.similarCoverage.on("change", lang.hitch(this, function () {
                        this.turningOnOffFeatures("similarCoverage", this.similarCoverage.checked);
                    }));
                    this.addBtn.addEventListener("click", lang.hitch(this, function () {
                        if (!this.addOICDialog.open) {
                            this.inputOICUrl.value = "";
                            this.oicFile.value = '';
                            this.addOICDialog.show();
                            domConstruct.destroy(this.addOICDialog.id + "_underlay");
                            domStyle.set(this.addOICDialog.domNode, "z-index", "1");
                            this.showHideInput(this.oicInputType.value);
                        }
                    }));
                    this.oicInputType.addEventListener("change", lang.hitch(this, function () {
                        this.showHideInput(this.oicInputType.value);
                    }));
                    this.agolContentSelect.addEventListener("change", lang.hitch(this, function () {
                        if (this.agolContentSelect.value === "group" || this.agolContentSelect.value === "orgGroups") {
                            html.set(this.folderGroupLabel, this.nls.group + ": ");
						}
                        else if (this.agolContentSelect.value === "content") {																						
                            html.set(this.folderGroupLabel, this.nls.folder + ": ");
                        }
						this.populateFolderGroupList(this.agolContentSelect.value);
                    }));
                    this.agolFolderList.addEventListener("change", lang.hitch(this, function () {
                        this.populateOICList(this.agolFolderList.value);
                    }));
                    this.agolOICList.addEventListener("change", lang.hitch(this, function () {
                        this.setDisabledProperty(this.agolOICList.value);
                    }));
                    this.inputOICUrl.addEventListener("change", lang.hitch(this, function () {
                        this.setDisabledProperty(this.inputOICUrl.value);
                    }));
					this.sampleOICList.addEventListener("change", lang.hitch(this, function () {
                        this.setDisabledProperty(this.sampleOICList.value);
                    }));																						  				
                    this.oicFile.addEventListener("change", lang.hitch(this, this.readOICFile));
                    this.addOICBtn.addEventListener("click", lang.hitch(this, this.checkInput));

                    this.allCoverage.on("change", lang.hitch(this, function () {
                        this.createCoverageArea(this.allCoverage.checked);
                    }));
                    this.viewGraphicBtn.addEventListener("click", lang.hitch(this, this.openImageInViewer));
                    this["2DView"].addEventListener("click", lang.hitch(this, function () {
                        if (this["2DView"].checked && this.mapViewState) {
                            for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                                if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-focusPoint")
                                    var point = this.graphicsLayer.graphics.items[v].geometry;

                                if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-imageMesh")
                                    var flag = true;
                            }
                            this.setViewMode("2D");

                            if (this.activeImageID && point && flag) {
                                this.showLoading();
                                if (!this.imageDialog.open) {
                                    this.imageDialog.show();
                                    domConstruct.destroy(this.imageDialog.id + "_underlay");
                                    if (this.dialogPosition) {
                                        domStyle.set(this.imageDialog.domNode, "left", this.dialogPosition.l + "px");
                                        domStyle.set(this.imageDialog.domNode, "top", this.dialogPosition.t + "px");
                                    }
                                    domStyle.set(this.imageDialog.domNode, "z-index", "1");
                                }
                                this.searchImages(point, this.activeImageID);
                            }
                        }
                    }));
                    this["3DView"].addEventListener("click", lang.hitch(this, function () {
                        if (this["3DView"].checked && !this.mapViewState) {
                            for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                                if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-focusPoint")
                                    var point = this.graphicsLayer.graphics.items[v].geometry;

                                if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons")
                                    var flag = true;
                            }
                            this.setViewMode("3D");
                            if (this.activeImageID && point && flag)
                                this.searchImages(point, this.activeImageID);
                        }
                    }));
                    this.hideImageBtn.addEventListener("click", lang.hitch(this, this.setMapView));
                    this.loadOrientedImageryCatalog();
                    if (this.sceneView) {
                        this.sceneView.on("click", lang.hitch(this, this.mapClickEvent));
                        this.sceneView.popup.watch("selectedFeature", lang.hitch(this, this.graphicSelected));
                        this.sceneView.popup.watch("visible", lang.hitch(this, function (visible) {
                            if (!visible && this.featureSelected) {
                                this.orientedViewer.deselectFeaturesInImage(this.featureSelected);
                                domStyle.set(this.viewGraphicBtn, "display", "none");
                            }
                        }));
                    }
                    if (this.config.enableAddOIC)
                        domStyle.set(this.addBtn, "display", "inline-block");
                    this.loadOrientedImageryApi();
                    this.setupSymbols();
                    this.setupResizeHandle();
                    this.geometryService = new GeometryService({url: "https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"});

					this.addFieldBtn.addEventListener('click', lang.hitch(this, function () {
                var url = this.addFieldVectorLayer.url.substring(0, this.addFieldVectorLayer.url.indexOf('rest/') + 4);
                url = url + '/admin/';
                url = url + this.addFieldVectorLayer.url.substring(this.addFieldVectorLayer.url.indexOf('rest/') + 5) + '/addToDefinition';

                if (this.listofFieldstoAdd.length > 0) {
                    var fields = [];
                    for (var i = 0; i < this.listofFieldstoAdd.length; i++) {
                        fields.push({
                            "name": this.listofFieldstoAdd[i],
                            "type": "esriFieldTypeString",
                            "alias": this.listofFieldstoAdd[i],
                            "nullable": true,
                            "editable": true,
                            "length": 1000
                        });


                    }
                    var fieldsToAdd = {};
                    fieldsToAdd.fields = fields;
                }
                if (this.preserveToken && this.preserveToken.token) {

                    esriRequest(url + '?token=' + this.preserveToken.token, {
                        query: {
                            addToDefinition: JSON.stringify(fieldsToAdd),
                            f: 'json'
                        },
                        method: 'post'
                    }).then(lang.hitch(this, function (res) {
                        console.log(res);
                        document.getElementById('addfielddiv').style.display = 'none';
                        this.fieldAddedFlag = true;
                        document.getElementById("removeVectorBtn").click();
                        this.sceneView.map.remove(this.sceneView.map.findLayerById(this.addFieldVectorLayer.id));
                        var featureLayer = new FeatureLayer({
                            url: this.addFieldVectorLayer.url,
                            id: this.addFieldVectorLayer.id,
                            title: this.addFieldVectorLayer.title
                        });
                        this.sceneView.map.add(featureLayer);
                        //this.orientedViewer.addVectorLayer(this.addFieldVectorLayer.title, this.addFieldVectorLayer.url, this.addFieldVectorLayer.renderer.toJSON(), this.addFieldVectorLayer.editable).then(lang.hitch(this, function(res) {
                        //}));

                        document.getElementById('addVectorBtn').click();
                    })).catch(function (err) {
                        this.errorNotification("Cannot add fields");
                        document.getElementById('addfielddiv').style.display = 'none';
                    });
                } else {
                    this.errorNotification("Please log in to add fields.");
                    document.getElementById('addfielddiv').style.display = 'none';
                }
            }));

            this.featureClass.addEventListener('change', lang.hitch(this, function () {
                document.getElementById('addfielddiv').style.display = 'none';
            }));

            this.noAddFieldBtn.addEventListener('click', lang.hitch(this, function () {
                document.getElementById('addfielddiv').style.display = 'none';
            }));
                    this.addVectorBtn.addEventListener("click", lang.hitch(this, function () {
                        var vectorLayerProp = this.vectorLayers[this.featureClass.value];
                        var addLayer = true;
                        for (var zv = this.vectorLayerAdded.length - 1; zv >= 0; zv--) {
                            if (this.vectorLayerAdded[zv] === vectorLayerProp.url) {
                                addLayer = false;
                                break;
                            }
                        }
						
						if (!this.fieldAddedFlag) {
                    var imgurnfield = 0;
                    var imggeomfield = 0;
                    for (var i in vectorLayerProp.fields) {
                        if (vectorLayerProp.fields[i].name.toLowerCase() === "ImgUrn".toLowerCase()) {
                            imgurnfield++;
                        }
                        if (vectorLayerProp.fields[i].name.toLowerCase() === "ImgGeom".toLowerCase()) {
                            imggeomfield++;
                        }
                    }
                    document.getElementById('missingfieldholder').innerHTML = '';
                    if (imgurnfield === 0 || imggeomfield === 0) {
                        this.listofFieldstoAdd = [];
                        document.getElementById('addfielddiv').style.display = 'block';
                        var node = document.createElement('ul');
                        if (imgurnfield === 0) {
                            this.listofFieldstoAdd.push("ImgUrn");
                            var node1 = document.createElement('li');
                            node1.innerHTML = 'ImgUrn';
                            node.appendChild(node1);
                        }
                        if (imggeomfield === 0) {
                            this.listofFieldstoAdd.push("ImgGeom");
                            var node1 = document.createElement('li');
                            node1.innerHTML = 'ImgGeom';
                            node.appendChild(node1);
                        }
                        document.getElementById('missingfieldholder').appendChild(node);
                        this.addFieldVectorLayer = vectorLayerProp;
                    }
                }
                        if (addLayer) {   
                            var renderer = vectorLayerProp.renderer.toJSON();
                            switch (vectorLayerProp.geometryType) {
                                case 'polygon':
                                {
                                    if (renderer.type === "simple") {
                                        var symbol = {
                                            "type": "polygon",
                                            "color": vectorLayerProp.renderer.symbol.color ? [vectorLayerProp.renderer.symbol.color.r, vectorLayerProp.renderer.symbol.color.g, vectorLayerProp.renderer.symbol.color.b, vectorLayerProp.renderer.symbol.color.a] : [0, 0, 0, 0],
                                            "outline": {
                                                "width": vectorLayerProp.renderer.symbol.outline ? vectorLayerProp.renderer.symbol.outline.width : 2,
                                                "color": vectorLayerProp.renderer.symbol.outline && vectorLayerProp.renderer.symbol.outline.color ? [vectorLayerProp.renderer.symbol.outline.color.r, vectorLayerProp.renderer.symbol.outline.color.g, vectorLayerProp.renderer.symbol.outline.color.b, vectorLayerProp.renderer.symbol.outline.color.a] : [0, 92, 230, 255]
                                            }
                                        };
                                        renderer.symbol = symbol;
                                    } else if (renderer.type === "uniqueValue") {
                                        for (var b in vectorLayerProp.renderer.uniqueValueInfos) {
                                            var symbol = {
                                                "type": "polygon",
                                                "color": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color ? [vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.r, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.g, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.b, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.a] : [0, 0, 0, 0],
                                                "outline": {
                                                    "width": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline ? vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.width : 2,
                                                    "color": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline && vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color ? [vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.r, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.g, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.b, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.a] : [0, 92, 230, 255]
                                                }
                                            };
                                            renderer.uniqueValueInfos[b].symbol = symbol;
                                        }
                                    }
                                    break;
                                }
                                case 'polyline':
                                {
                                    if (renderer.type === "simple") {
                                        var symbol = {
                                            "type": "polyline",
                                            "color": vectorLayerProp.renderer.symbol.color ? [vectorLayerProp.renderer.symbol.color.r, vectorLayerProp.renderer.symbol.color.g, vectorLayerProp.renderer.symbol.color.b, vectorLayerProp.renderer.symbol.color.a] : [76, 230, 0, 255],
                                            "width": vectorLayerProp.renderer.symbol.width || 2
                                        };
                                        renderer.symbol = symbol;
                                    } else if (renderer.type === "uniqueValue") {
                                        for (var b in vectorLayerProp.renderer.uniqueValueInfos) {
                                            var symbol = {
                                                "type": "polyline",
                                                "color": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color ? [vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.r, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.g, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.b, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.a] : [76, 230, 0, 255],
                                                "width": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.width || 2
                                            };
                                            renderer.uniqueValueInfos[b].symbol = symbol;
                                        }
                                    }
                                    break;
                                }
                                case 'point':
                                {
                                    if (renderer.type === "simple") {
                                        var symbol = {
                                            "type": "point",
                                            "style": vectorLayerProp.renderer.symbol.style || "circle",
                                            "color": vectorLayerProp.renderer.symbol.color ? [vectorLayerProp.renderer.symbol.color.r, vectorLayerProp.renderer.symbol.color.g, vectorLayerProp.renderer.symbol.color.b, vectorLayerProp.renderer.symbol.color.a] : [255, 127, 127, 255],
                                            "size": vectorLayerProp.renderer.symbol.size || 10,
                                            "outline": {
                                                "width": vectorLayerProp.renderer.symbol.outline ? vectorLayerProp.renderer.symbol.outline.width : 0,
                                                "color": vectorLayerProp.renderer.symbol.outline && vectorLayerProp.renderer.symbol.outline.color ? [vectorLayerProp.renderer.symbol.outline.color.r, vectorLayerProp.renderer.symbol.outline.color.g, vectorLayerProp.renderer.symbol.outline.color.b, vectorLayerProp.renderer.symbol.outline.color.a] : [0, 0, 0, 1]
                                            }
                                        };
                                        renderer.symbol = symbol;
                                    } else if (renderer.type === "uniqueValue") {
                                        for (var b in vectorLayerProp.renderer.uniqueValueInfos) {
                                            var symbol = {
                                                "type": "point",
                                                "style": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.style || "circle",
                                                "color": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color ? [vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.r, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.g, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.b, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.color.a] : [255, 127, 127, 255],
                                                "size": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.size || 10,
                                                "outline": {
                                                    "width": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline ? vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.width : 0,
                                                    "color": vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline && vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color ? [vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.r, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.g, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.b, vectorLayerProp.renderer.uniqueValueInfos[b].symbol.outline.color.a] : [0, 0, 0, 1]
                                                }
                                            };
                                            renderer.uniqueValueInfos[b].symbol = symbol;
                                        }
                                    }
                                    break;
                                }
                            }
                            this.orientedViewer.addVectorLayer(vectorLayerProp.title, vectorLayerProp.url, renderer, vectorLayerProp.editable);
                            this.vectorLayerAdded.push(vectorLayerProp.url);
                        }
                    }));
					IdentityManager.on('credential-create', lang.hitch(this, function (user) {
                this.preserveToken = {};
                this.preserveToken.token = user.credential.token;
                this.preserveToken.server = user.credential.server;

            }));
                    this.removeVectorBtn.addEventListener("click", lang.hitch(this, function () {
                        this.orientedViewer.removeVectorLayer(this.vectorLayers[this.featureClass.value].title);
                        for (var zv = this.vectorLayerAdded.length - 1; zv >= 0; zv--) {
                            if (this.vectorLayerAdded[zv] === this.vectorLayers[this.featureClass.value].url) {
                                this.vectorLayerAdded.splice(zv, 1);
                                break;
                            }
                        }
                    }));
                    this.selectPointBtn.addEventListener("click", lang.hitch(this, this.selectPointOnMap));
                    this.listAllVectorLayers();
                    on(this.imageDialog.closeButtonNode, "click", lang.hitch(this, function () {
                        this.dialogPosition = {l: this.imageDialog.domNode.offsetLeft, t: this.imageDialog.domNode.offsetTop};
                    }));
                    this.imageDialog._onKey = function (evt) {
                        if (evt.key === "Escape" || evt.key === "Esc" || evt.keyCode === 27)
                            evt.preventDefault();
                    };
                    this.sceneView.on("resize", lang.hitch(this, function () {
                        if (this.oiApiLoaded) {
                            this.orientedViewer.resizeImageOnMap({width: this.sceneView.width, height: this.sceneView.height, camera: this.sceneView.camera.clone()});
                        }
                    }));
					this.selectLocationFlag = true;
            this.sceneView.cursor = "crosshair";
                },
                loadOrientedImageryApi: function () {
                    orientedImagery.on("load", lang.hitch(this, function (loaded) {
                        if (loaded) {
                            this.orientedViewer = orientedImagery.viewer(this.oiviewer);
                            this.oiApiLoaded = true;
                            this.orientedViewer.on("searchImages", lang.hitch(this, this.drawPointAndPolygons));
                            this.orientedViewer.on("updateImage", lang.hitch(this, this.updateCoveragePolygon));
                            this.orientedViewer.on("changeImage", lang.hitch(this, this.updateGraphics));
                            this.orientedViewer.on("imageToGroundPoint", lang.hitch(this, function (pointJson) {
                                this.showPointOnMap(new Point(pointJson));
                            }));
                            this.orientedViewer.on("addImageOnMap", lang.hitch(this, this.addImageOnMap));
                            this.orientedViewer.on("updateImageOnMap", lang.hitch(this, this.updateImageOnMap));
                            this.orientedViewer.on("updateCamera", lang.hitch(this, this.updateCameraOnMap));
                            this.orientedViewer.on("addFeature", lang.hitch(this, this.addFeature));
                            this.orientedViewer.on("deleteFeature", lang.hitch(this, this.deleteFeature));
                            this.orientedViewer.on("selectFeature", lang.hitch(this, this.selectFeature));
                        } else
                            this.oiApiLoaded = false;
                    }));
                },
                loadOrientedImageryCatalog: function () {
                    this.addSelectOption(this.selectOIC, this.nls.selectOIC, "select");
                    for (var a = 0; a < this.config.oic.length; a++) {
                        this.addSelectOption(this.selectOIC, this.config.oic[a].title, a.toString());
                    }
                },
                setupSymbols: function () {
                    this.activeSourcePointSymbol = {
                        type: "simple-marker",
                        size: 15,
                        style: "circle",
                        color: [255, 102, 102, 1],
                        outline: null
                    };
                    this.sourcePointSymbol = {
                        type: "simple-marker",
                        size: 10,
                        style: "circle",
                        color: [0, 128, 192, 1],
                        outline: null
                    };
                    this.diamondSymbol = {
                        type: "simple-marker",
                        size: 10,
                        style: "diamond",
                        color: [0, 255, 0],
                        outline: null
                    };
                    this.crossSymbol = {
                        type: "simple-marker",
                        size: 8,
                        style: "x",
                        color: [255, 0, 0],
                        outline: {
                            color: [255, 0, 0],
                            width: 2,
                            style: "solid"
                        }
                    };
                    this.coverageMapSymbol = {
                        type: "simple-fill",
                        style: "solid",
                        outline: null,
                        color: [0, 200, 0, 0.5]
                    };
                    this.activeFrustumSymbol = {
                        type: "mesh-3d",
                        symbolLayers: [{
                                type: "fill",
                                material: {
                                    color: [255, 102, 102, 0.5]
                                },
                                edges: {
                                    type: "none"
                                }
                            }]
                    };
                    this.frustumSymbol = {
                        type: "mesh-3d",
                        symbolLayers: [{
                                type: "fill",
                                material: {
                                    color: [0, 128, 192, 0.5]
                                },
                                edges: {
                                    type: "none"
                                }
                            }]
                    };
                },
                setupResizeHandle: function () {
                    var node = document.createElement("div");
                    //node.id = "dialogResizeHandle";
                    this.imageDialog.domNode.appendChild(node);
                    var handle = new ResizeHandle({
                        targetId: this.imageDialog.id,
                        //id: "dialogHandle",
                        style: "bottom:2px;right:2px;",
                        minSize: {w: 400, h: 250}
                    }).placeAt(node);
                    this.dialogHandlerID = handle.id;
                    dojo.subscribe("/dojo/resize/stop", lang.hitch(this, function (resizeHandle) {
                        if (resizeHandle.id === this.dialogHandlerID) {
                            domStyle.set("oiviewer", "width", "100%");
                            domStyle.set("oiviewer", "height", "100%");
                            this.orientedViewer.resize();
                            document.getElementsByClassName("dijitDialogPaneContent")[0].style.overflow = "hidden";
                        }
                    }));
                    dojo.connect(this.imageDialog, "hide", function () {
                        if (document.getElementsByClassName("oi-videoCanvas")[0] && domStyle.get(document.getElementsByClassName("oi-videoCanvas")[0], "display") === "block") {
                            document.getElementsByClassName("oi-videoCanvas")[0].src = "";
                            this.currentVideoSrc = null;
                        }
                    });
                },
                selectFeatureService: function (value) {
                    if (this.overviewLayer) {
                        this.sceneView.map.remove(this.overviewLayer);
                        this.overviewLayer = null;
                    }
                    this.graphicExists = false;
                    this.allCoverage.set("checked", false);
                    this.graphicsLayer.graphics.removeAll();
                    if (this["3DView"].checked && !domClass.contains(this.hideImageBtn, "oi-widget-hide"))
                        this.setMapView();
                    if (this.imageDialog.open) {
                        this.dialogPosition = {l: this.imageDialog.domNode.offsetLeft, t: this.imageDialog.domNode.offsetTop};
                        this.imageDialog.hide();
                    }
                    if (value !== "select") {
                        value = parseInt(value);
                        var url = this.config.oic[value].serviceUrl;
                        if (url.indexOf("ImageServer") === -1) {
                            var query = new Query();
                            query.where = "1=1";
                            query.returnGeometry = false;
                            query.outSpatialReference = this.sceneView.extent.spatialReference;
                            var queryTask = new QueryTask({url: url});
                            queryTask.executeForExtent(query).then(lang.hitch(this, function (response) {
                                if (response.extent && (!geometryEngine.intersects(this.sceneView.extent, response.extent) || geometryEngine.within(response.extent, this.sceneView.extent))) {
                                    this.sceneView.goTo(response.extent);
                                }
                            }));
                        } else {
                            esriRequest(url, {
                                query: {
                                    f: "json"
                                },
                                "responseType": "json"
                            }).then(lang.hitch(this, function (response) {
                                if (response.data && response.data.extent) {
                                    if (response.data.extent.spatialReference.wkid === this.sceneView.spatialReference.wkid && (!geometryEngine.intersects(this.sceneView.extent, new Extent(response.data.extent)) || geometryEngine.within(new Extent(response.data.extent), this.sceneView.extent)))
                                        this.sceneView.goTo(new Extent(response.data.extent));
                                    else {
                                        var params = new ProjectParameters();
                                        params.geometries = [new Extent(response.data.extent)];
                                        params.outSpatialReference = this.sceneView.spatialReference;
                                        this.geometryService.project(params).then(lang.hitch(this, function (geometry) {
                                            if (!geometryEngine.intersects(this.sceneView.extent, geometry[0]) || geometryEngine.within(geometry[0], this.sceneView.extent))
                                                this.sceneView.goTo(geometry[0]);
                                        }));
                                    }
                                }
                            }));
                        }
                        if (this.config.oic[value].overviewUrl) {
                            this.layerModuleSelector(this.config.oic[value].overviewUrl);
                        }
                    }
                },
                turningOnOffFeatures: function (selectedFeatures, state) {
                    switch (selectedFeatures) {
                        case 'imagePoints' :
                        {
                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].symbol.style === "circle") {
                                    this.graphicsLayer.graphics.items[s].visible = state;
                                }
                            }
                            break;
                        }
                        case 'currentCoverage' :
                        {

                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[s].attributes.imageID === this.activeImageID) {
                                    this.graphicsLayer.graphics.items[s].visible = state;
                                }
                            }
                            break;
                        }
                        case 'similarCoverage' :
                        {

                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[s].attributes.imageID !== this.activeImageID) {
                                    this.graphicsLayer.graphics.items[s].visible = state;
                                }
                            }
                            break;
                        }

                    }


                },
                mapClickEvent: function (evt) {
                    if (this.widgetOpen && this.selectOIC.value !== "select") {
                        if (this.mapViewState) {
                            if (this.selectLocationFlag && domClass.contains(this.hideImageBtn, "oi-widget-hide")) {
                                this.allCoverage.set("checked", false);
                                this.hidePopup = true;
                                this.searchImages(evt.mapPoint);
                            }
                        } else {
                            if (evt.native.altKey) {
                                this.hidePopup = true;
                                this.showPointOnMap(evt.mapPoint);
                                this.groundToImage(evt.mapPoint);
                            } else if (this.selectLocationFlag) {
                                this.hidePopup = true;
                                this.allCoverage.set("checked", false);
                                this.graphicExists = false;
                                this.showLoading();
                                if (!this.imageDialog.open) {
                                    this.imageDialog.show();
                                    domConstruct.destroy(this.imageDialog.id + "_underlay");
                                    if (this.dialogPosition) {
                                        domStyle.set(this.imageDialog.domNode, "left", this.dialogPosition.l + "px");
                                        domStyle.set(this.imageDialog.domNode, "top", this.dialogPosition.t + "px");
                                    }
                                    domStyle.set(this.imageDialog.domNode, "z-index", "1");
                                }
                                this.searchImages(evt.mapPoint);
                            }
                        }
                    }
                },
                searchImages: function (point, objectId) {
                    var url = this.config.oic[this.selectOIC.value].itemUrl;
                    if (this.oiApiLoaded) {
                        point.z = 0;
                        if (this.mapViewState) {
                            this.graphicsLayer.graphics.removeAll();
                            this.graphicsLayer.add(new Graphic({geometry: point, symbol: this.crossSymbol, attributes: {id: "oi-focusPoint"}}));
                            this.showLoading();
                            html.set(this.notifyUser, this.nls.notification1);
                            var location = this.sceneView.camera.position.clone();
                            location.z = 0;
                            this.sceneView.map.ground.queryElevation(location).then(lang.hitch(this, function (result) {
                                location.z = this.sceneView.camera.position.z - result.geometry.z;
                                this.orientedViewer.searchImages(point, url, {maxDistance: 1000, extent: this.sceneView.extent.toJSON(), mapSize: {w: this.sceneView.width, h: this.sceneView.height},
                                    camera: {
                                        heading: this.sceneView.camera.heading,
                                        tilt: this.sceneView.camera.tilt,
                                        fov: this.sceneView.camera.fov,
                                        elevation: result.geometry.z,
                                        position: location
                                    },
                                    objectId: objectId || null
                                });


                            }));
                        } else
                            this.orientedViewer.searchImages(point.toJSON(), url, {maxDistance: 1000, camera: this.sceneView.camera, mapSize: {w: this.sceneView.width, h: this.sceneView.height}, extent: this.sceneView.extent.toJSON(), objectId: objectId || null});
                    }
                },
                drawPointAndPolygons: function (response) {
                    this.hideLoading();
                    this.graphicsLayer.graphics.removeAll();
                    if (!response.error) {
                        this.graphicExists = false;
                        response.point.z = 0;
                        this.graphicsLayer.add(new Graphic({geometry: new Point(response.point), symbol: this.crossSymbol, attributes: {id: "oi-focusPoint"}}));
                        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
                        this.drawFrustums(response.coverageFrustums, response.imageAttributes.imageID);
                        this.imageProperties = response.imageAttributes;
                        this.setCameraView(this.imageProperties);
                        this.activeImageID = response.imageAttributes.imageID;
						this.imagePoints.set('disabled', false);
            this.currentCoverage.set('disabled', false);
            this.currentCoverage.set('checked', true);
            this.similarCoverage.set('disabled', false);
                    }
                },
                drawImageSourcePoints: function (points, imageID) {
                    for (var i = 0; i < points.length; i++) {
                        this.graphicsLayer.add(new Graphic({geometry: new Point(points[i]), symbol: (imageID === points[i].imageID ? this.activeSourcePointSymbol : this.sourcePointSymbol), attributes: {"imageID": points[i].imageID}}));
                        if (!this.imagePoints.checked)
                            this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = false;
                    }
                },
                drawFrustums: function (frustums, imageID) {
                    this.coverageFrustums = [];
                    for (var a = 0; a < frustums.length; a++) {
                        this.coverageFrustums["p" + frustums[a].imageID] = frustums[a];
                        if (imageID === frustums[a].imageID) {
                            this.graphicsLayer.add(new Graphic({geometry: Mesh.fromJSON(frustums[a]), symbol: this.activeFrustumSymbol, attributes: {"imageID": frustums[a].imageID, id: "oi-polygons"}}));
                            this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = this.currentCoverage.checked;

                        } else {
                            this.graphicsLayer.add(new Graphic({geometry: Mesh.fromJSON(frustums[a]), symbol: this.frustumSymbol, attributes: {"imageID": frustums[a].imageID, id: "oi-polygons"}}));
                            this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = this.similarCoverage.checked;
                        }
                    }
                },
                showPointOnMap: function (geometry) {
                    geometry.z = 0;
                    if (!this.graphicExists) {
                        this.graphicsLayer.add(new Graphic({geometry: geometry, symbol: this.diamondSymbol}));
                        this.graphicExists = true;
                    } else {

                        for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                            if (this.graphicsLayer.graphics.items[v].symbol.style === "diamond") {
                                var graphic = this.graphicsLayer.graphics.items[v].clone();
                                graphic.geometry = geometry;
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                                this.graphicsLayer.add(graphic);
                                break;
                            }
                        }
                    }
                },
                groundToImage: function (point) {
                    if (this.oiApiLoaded) {
                        point.z = 0;
                        this.orientedViewer.displayGroundPointInImage(point.toJSON());
                    }
                },
                updateCoveragePolygon: function (imageProperties) {
                    if (imageProperties.coverageFrustum.vertexAttributes) {
                        for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                            if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === imageProperties.imageID) {
                                var graphic = this.graphicsLayer.graphics.items[v].clone();
                                graphic.geometry = Mesh.fromJSON(imageProperties.coverageFrustum);
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                                this.graphicsLayer.add(graphic);
                                break;
                            }
                        }
                    }

                },
                updateGraphics: function (image) {
                    this.imageProperties = image;
                    this.setCameraView(this.imageProperties);
                    for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                        if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === image.imageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.activeFrustumSymbol;
                            graphic.visible = this.currentCoverage.checked;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        } else if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === this.activeImageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.frustumSymbol;
                            graphic.geometry = Mesh.fromJSON(this.coverageFrustums["p" + this.activeImageID]);
                            graphic.visible = this.similarCoverage.checked;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        } else if (this.graphicsLayer.graphics.items[v].symbol.style === "circle" && this.graphicsLayer.graphics.items[v].attributes.imageID === image.imageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.activeSourcePointSymbol;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        } else if (this.graphicsLayer.graphics.items[v].symbol.style === "circle" && this.graphicsLayer.graphics.items[v].attributes.imageID === this.activeImageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.sourcePointSymbol;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        }
                    }

                    this.activeImageID = image.imageID;
                },
                createCoverageArea: function (value) {
                    if (this.overviewLayer) {
                        if (value)
                            this.overviewLayer.visible = true;
                        else
                            this.overviewLayer.visible = false;
                    } else {
                        for (var s = 0; s <= this.graphicsLayer.graphics.items.length - 1; s++) {
                            if (this.graphicsLayer.graphics.items[s].symbol && this.graphicsLayer.graphics.items[s].symbol.style === "solid" && this.graphicsLayer.graphics.items[s].attributes.coverageMap) {
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                                break;
                            }
                        }
                        if (value && this.selectOIC.value !== "select" && this.oiApiLoaded) {
                            this.orientedViewer.getCoverageMap(this.sceneView.extent.toJSON(), this.config.oic[this.selectOIC.value].itemUrl).then(lang.hitch(this, function (response) {
                                if (response.coverageMap) {
                                    var graphic = new Graphic({geometry: new Polygon(response.coverageMap), symbol: this.coverageMapSymbol, attributes: {"coverageMap": true}});
                                    this.graphicsLayer.add(graphic);
                                }
                            }));
                        }
                    }
                },
                showHideInput: function (value) {
                    this.addOICBtn.disabled = true;
                    if (value === "url") {
                        domStyle.set(this.agolInput, "display", "none");
                        domStyle.set(this.agolContentSelect, "display", "none");
                        domStyle.set(this.fileInput, "display", "none");
                        domStyle.set(this.urlInput, "display", "table");
						domStyle.set(this.sampleInput, "display", "none");
                        if (this.inputOICUrl.value)
                            this.addOICBtn.disabled = false;
                    } else if (value === "file") {
                        domStyle.set(this.agolInput, "display", "none");
                        domStyle.set(this.agolContentSelect, "display", "none");
                        domStyle.set(this.urlInput, "display", "none");
                        domStyle.set(this.fileInput, "display", "block");
						domStyle.set(this.sampleInput, "display", "none");
                        if (this.oicFile.value)
                            this.addOICBtn.disabled = false;
                    } else if (value === "agol"){
                        domStyle.set(this.urlInput, "display", "none");
                        domStyle.set(this.fileInput, "display", "none");
                        domStyle.set(this.agolInput, "display", "block");
						domStyle.set(this.sampleInput, "display", "none");
                        domStyle.set(this.agolContentSelect, "display", "inline-block");
                        if (this.agolOICList.value)
                            this.addOICBtn.disabled = false;
                        this.getOICFromAgol();
                    } else {
						domStyle.set(this.urlInput, "display", "none");
                        domStyle.set(this.fileInput, "display", "none");
                        domStyle.set(this.agolInput, "display", "none");
						domStyle.set(this.sampleInput, "display", "block");
                        domStyle.set(this.agolContentSelect, "display", "none");
                                if (this.sampleOICList.value) {
                    this.addOICBtn.disabled = false;
                }
                this.getSampleOIC("5a0a7396d2ce4e739536b0f55a22d814");
					}
                },
				getSampleOIC: function (id) {
            this.removeSelectOptions(this.sampleOICList);
            this.addSelectOption(this.sampleOICList, "Select", "");
            esriRequest("https://www.arcgis.com/sharing/rest/content/groups/" + id, {
                query: {
                    f: "json"
                },
                responseType: "json"
            }).then(lang.hitch(this, function (response) {
                response = response.data;
                if (response.items) {
                    var count = response.items.length;
                    if (count) {
                        var oicCount = 0;
                        for (var oicitem = 0; oicitem < count; oicitem++) {
                            if (response.items[oicitem].type === "Oriented Imagery Catalog") {
                                oicCount++;
									  
                            }
                        }
                        if (oicCount > 1) {
                            this.addSelectOption(this.sampleOICList, "Add all", "add all");
														   
																																												
																	
								 
								
                        }
                        response.items.forEach(lang.hitch(this, function (item) {
                            if (item.type === "Oriented Imagery Catalog") {
                                esriRequest("https://www.arcgis.com/sharing/rest/content/items/" + item.id + "/data", {
                                    query: {
                                        f: "json"
																		
																				
																		
																		
												   
															
												  
																		
																				
																	   
																		 
											   
															
							
																	   
																		
																		 
																						
												   
															
											  
					 
                                    },
                                    responseType: "json"
									   
																			
												  
                                }).then(lang.hitch(this, function (data) {
                                    data = data.data;
																											
													
															 
											  
											 
												 
							  
														  
										
											 
								  
													


                                    this.addSelectOption(this.sampleOICList, data.properties.Name, "https://www.arcgis.com/sharing/rest/content/items/" + item.id);


                                }));
																	
																	
																	
								
                            } else {
                                count--;
                                if (count === 0)
                                    this.hideLoading();
                            }
                        }));
                    } else
                        this.hideLoading();
                } else
                    this.hideLoading();
            })).catch(lang.hitch(this, function () {
                this.hideLoading();
            }));
        },
                getOICFromAgol: function () {
                    this.showLoading();
                    var portal = new arcgisPortal("https://www.arcgis.com");
                    portal.authMode = "immediate";
                    portal.load().then(lang.hitch(this, function () {
                        html.set(this.itemNotify, "<span style='display:inline-block;padding-bottom:0.8em;'>" + this.nls.notification2 + "</span>");
                        if (!this.userContentInfo || portal.user.username !== this.userContentInfo.userId) {
                            this.userContentInfo = {
                                userId: portal.user.username,
                                myFolders: {},
                                myGroups: {},
								myOrgGroups: {},
                                user: portal.user
                            };
                            esriRequest(portal.user.url, {
                                query: {
                                    f: "json"
                                },
                                responseType: "json"

                            }).then(lang.hitch(this, function (userGroups) {
                                userGroups = userGroups.data;
                                for (var b = 0; b < userGroups.groups.length; b++) {
                                    this.userContentInfo.myGroups[userGroups.groups[b].title] = {id: userGroups.groups[b].id, items: []};
                                }
								this.getOrganisationGroups(portal.user);
                                this.getOICFromFolders(portal.user);
                            })).catch(lang.hitch(this, function () {
								this.getOrganisationGroups(portal.user);
                                this.getOICFromFolders(portal.user);
                            }));
                        } else {
                            html.set(this.itemNotify, "");
                            this.hideLoading();
                        }
                    })).catch(lang.hitch(this, function () {
                        html.set(this.itemNotify, "");
                        this.hideLoading();
                    }));
                },
				getOrganisationGroups: function (user) {
            esriRequest(user.portal.restUrl + '/community/groups', {
                query: {
                    f: "json",
                    q: "orgid:" + user.orgId,
                    start: 1,
                    num: 50,
                    sortField: 'title',
                    sortOrder: 'asc'

                },
                responseType: "json"
            }).then(lang.hitch(this, function(result) {
                var orgGroups = result.data;
                for (var b = 0; b < orgGroups.results.length; b++) {
                    this.userContentInfo.myOrgGroups[orgGroups.results[b].title] = { id: orgGroups.results[b].id, items: [] };
                }
            }))
        },
                getOICFromFolders: function (loggedInUser) {
                    esriRequest(loggedInUser.userContentUrl, {
                        query: {
                            f: "json"
                        },
                        responseType: "json"
                    }).then(lang.hitch(this, function (userContent) {
                        userContent = userContent.data;
                        this.userContentInfo.myFolders[userContent.currentFolder || "default"] = {id: null, items: []};
                        for (var a = 0; a < userContent.items.length; a++) {
                            if (userContent.items[a].type === "Oriented Imagery Catalog") {
                                this.userContentInfo.myFolders[userContent.currentFolder || "default"].items.push({name: userContent.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + userContent.items[a].id});
                            }
                        }
                        for (var a in userContent.folders) {
                            this.userContentInfo.myFolders[userContent.folders[a].title] = {id: userContent.folders[a].id, items: []};
                        }
                        this.populateFolderGroupList(this.agolContentSelect.value);
                        html.set(this.itemNotify, "");
                        this.hideLoading();
                    })).catch(lang.hitch(this, function () {
                        this.populateFolderGroupList(this.agolContentSelect.value);
                        html.set(this.itemNotify, "");
                        this.hideLoading();
                    }));
                },
                populateFolderGroupList: function (value) {
                    if (value === "content") {
                        var items = Object.keys(this.userContentInfo.myFolders);
                    } else if (value === 'group') {												
                        var items = Object.keys(this.userContentInfo.myGroups);
					} else if (value === 'orgGroups') {
						var items = Object.keys(this.userContentInfo.myOrgGroups);
					}
						
                    items.sort(function (a, b) {
                        a = a.toLowerCase().split(" ")[0];
                        b = b.toLowerCase().split(" ")[0];
                        if (a < b) {
                            return -1;
                        }
                        if (a > b) {
                            return 1;
                        }
                        return 0;
                    });
                    this.removeSelectOptions(this.agolFolderList);
                    this.addSelectOption(this.agolFolderList, this.nls.select, "");
                    for (var a in items) {
                        this.addSelectOption(this.agolFolderList, items[a], items[a]);
                    }
                    this.removeSelectOptions(this.agolOICList);
                    this.addSelectOption(this.agolOICList, this.nls.select, "");
                    this.addOICBtn.disabled = true;
                },
                populateOICList: function (value) {
                    this.removeSelectOptions(this.agolOICList);
                    this.addSelectOption(this.agolOICList, this.nls.select, "");
                    this.addOICBtn.disabled = true;
                    if (value) {
                        if (this.agolContentSelect.value === "content")
                            var items = this.userContentInfo.myFolders[value].items;
                        else if (this.agolContentSelect.value === "group")
                            var items = this.userContentInfo.myGroups[value].items;
						else if (this.agolContentSelect.value === "orgGroups") 
							var items = this.userContentInfo.myOrgGroups[value].items;
                        if (items.length) {
                            items.sort(function (a, b) {
                                a = a.name.toLowerCase().split(" ")[0];
                                b = b.name.toLowerCase().split(" ")[0];
                                if (a < b) {
                                    return -1;
                                }
                                if (a > b) {
                                    return 1;
                                }
                                return 0;
                            });
                            for (var a in items) {
                                this.addSelectOption(this.agolOICList, items[a].name, items[a].url);
                            }
                            if (items.length > 1)
                                this.addSelectOption(this.agolOICList, this.nls.addAll, "add all");
                        } else {
                            if (this.agolContentSelect.value === "content")
                                this.getOICFromFolder(value);
                            else
                                this.getOICFromGroup(value);
                        }
                    }
                },
                getOICFromGroup: function (value) {
                    var id = this.userContentInfo.myGroups[value] ? this.userContentInfo.myGroups[value].id : this.userContentInfo.myOrgGroups[value].id;;
                    esriRequest("https://www.arcgis.com/sharing/rest/content/groups/" + id, {
                        query: {
                            f: "json"
                        },
                        responseType: "json"
                    }).then(lang.hitch(this, function (response) {
                        response = response.data;
                        if (response.items) {
							if (this.userContentInfo.myGroups[value]) {
                        this.userContentInfo.myGroups[value].items = [];
                    } else if (this.userContentInfo.myOrgGroups[value]) {
                        this.userContentInfo.myOrgGroups[value].items = [];
                    }
                            for (var a = 0; a < response.items.length; a++) {
                                if (response.items[a].type === "Oriented Imagery Catalog") {
                                    if (this.userContentInfo.myGroups[value]) { //groupchange
                                this.userContentInfo.myGroups[value].items.push({ name: response.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + response.items[a].id });
                            } else {
                                this.userContentInfo.myOrgGroups[value].items.push({ name: response.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + response.items[a].id });
                              
											 
								 
										 
							   
												  
																									
                            }
                                }
                            }
                            var items = this.userContentInfo.myGroups[value] ? this.userContentInfo.myGroups[value].items : this.userContentInfo.myOrgGroups[value].items;
                            items.sort(function (a, b) {
                                a = a.name.toLowerCase().split(" ")[0];
                                b = b.name.toLowerCase().split(" ")[0];
                                if (a < b) {
                                    return -1;
                                }
                                if (a > b) {
                                    return 1;
                                }
                                return 0;
                            });
                            for (var a in items) {
                                this.addSelectOption(this.agolOICList, items[a].name, items[a].url);
                            }
                            if (items.length > 1)
                                this.addSelectOption(this.agolOICList, this.nls.addAll, "add all");
                            this.hideLoading();
                        } else
                            this.hideLoading();
                    })).catch(lang.hitch(this, function () {
                        this.hideLoading();
                    }));
                },
                getOICFromFolder: function (value) {
                    var id = this.userContentInfo.myFolders[value].id;
                    esriRequest(this.userContentInfo.user.userContentUrl + "/" + id, {
                        query: {
                            f: "json"
                        },
                        responseType: "json"
                    }).then(lang.hitch(this, function (response) {
                        response = response.data;
                        if (response.items) {
							this.userContentInfo.myFolders[value].items = [];
                            for (var a = 0; a < response.items.length; a++) {
                                if (response.items[a].type === "Oriented Imagery Catalog") {
                                    this.userContentInfo.myFolders[value].items.push({name: response.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + response.items[a].id});
                                }
                            }
                            var items = this.userContentInfo.myFolders[value].items;
                            items.sort(function (a, b) {
                                a = a.name.toLowerCase().split(" ")[0];
                                b = b.name.toLowerCase().split(" ")[0];
                                if (a < b) {
                                    return -1;
                                }
                                if (a > b) {
                                    return 1;
                                }
                                return 0;
                            });
                            for (var a in items) {
                                this.addSelectOption(this.agolOICList, items[a].name, items[a].url);
                            }
                            if (items.length > 1)
                                this.addSelectOption(this.agolOICList, this.nls.addAll, "add all");
                            this.hideLoading();
                        } else
                            this.hideLoading();
                    })).catch(lang.hitch(this, function () {
                        this.hideLoading();
                    }));
                },
                addOICFromGroup: function (id) {
                    esriRequest("https://www.arcgis.com/sharing/rest/content/groups/" + id, {
                        query: {
                            f: "json"
                        },
                        responseType: "json"
                    }).then(lang.hitch(this, function (response) {
                        response = response.data;
                        if (response.items) {
                            var count = response.items.length;
                            if (count) {
                                response.items.forEach(lang.hitch(this, function (item) {
                                    if (item.type === "Oriented Imagery Catalog") {
                                        esriRequest("https://www.arcgis.com/sharing/rest/content/items/" + item.id + "/data", {
                                            query: {
                                                f: "json"
                                            },
                                            responseType: "json"
                                        }).then(lang.hitch(this, function (data) {
                                            data = data.data;
                                            count--;
                                            this.config.oic.push({
                                                title: data.properties.Name,
                                                serviceUrl: data.properties.ServiceURL,
                                                overviewUrl: data.properties.OverviewURL,
                                                itemUrl: data
                                            });
                                            this.addSelectOption(this.selectOIC, this.config.oic[this.config.oic.length - 1].title, "" + (this.config.oic.length - 1) + "");
                                            if (count === 0)
                                                this.hideLoading();
                                        }));
                                    } else {
                                        count--;
                                        if (count === 0)
                                            this.hideLoading();
                                    }
                                }));
                            } else
                                this.hideLoading();
                        } else
                            this.hideLoading();
                    })).catch(lang.hitch(this, function () {
                        this.hideLoading();
                    }));
                },
                readOICFile: function (evt) {
                    this.oicJSON = null;
                    var file = evt.target.files[0];
                    if (file) {
                        var read = new FileReader();
                        read.onload = lang.hitch(this, function (e) {
                            try {
                                this.oicJSON = JSON.parse(e.target.result);
                                this.addOICBtn.disabled = false;
                            } catch (e) {
                                this.errorNotification(this.nls.error1);
                            }
                        });
                        read.onerror = lang.hitch(this, this.errorNotification, this.nls.error2);
                        read.readAsText(file);

                    } else {
                        this.errorNotification(this.nls.error2);
                    }
                },
                checkInput: function () {
                    var input = this.oicInputType.value;
                    if (input === "url")
                        this.addOICItemUrl();
                    else if (input === "file")
                        this.addOICFile();
                    else if (input === 'agol') {
                        if (this.agolOICList.value === "add all") {
                            var oicList = this.agolOICList.options;
                            for (var a = 0; a < oicList.length; a++) {
                                if (oicList[a].value && oicList[a].value !== "add all")
                                    this.addOICItem(oicList[a].value, false);
                            }
                        } else
                            this.addOICItem(this.agolOICList.value, true);
                    }
					else {
                if (this.sampleOICList.value === "add all") {
                    var oicList = this.sampleOICList.options;
                    for (var a = 0; a < oicList.length; a++) {
                        if (oicList[a].value && oicList[a].value !== "add all")
                            this.addOICItem(oicList[a].value, false);
                    }
                } else {
                    this.addOICItem(this.sampleOICList.value, true);
                }
          
                }
				},
                addOICItem: function (url, autoSelect) {
                    esriRequest(url + "/data", {
                        query: {
                            f: "json"
                        },
                        responseType: "json"

                    }).then(lang.hitch(this, function (oicInfo) {
                        oicInfo = oicInfo.data;
                        if (oicInfo && oicInfo.properties) {
                            this.config.oic.push({
                                title: oicInfo.properties.Name,
                                serviceUrl: oicInfo.properties.ServiceURL,
                                overviewUrl: oicInfo.properties.OverviewURL,
                                itemUrl: oicInfo
                            });
                            this.addSelectOption(this.selectOIC, oicInfo.properties.Name, "" + this.config.oic.length - 1 + "");
                            this.addOICDialog.hide();
                            if (autoSelect) {
                                this.selectOIC.selectedIndex = this.selectOIC.options.length - 1;
                                this.selectFeatureService(this.selectOIC.value);
                            }
                        } else {
                            this.errorNotification(this.nls.error4);
                        }
                    })).catch(lang.hitch(this, function () {
                        this.errorNotification(this.nls.error3);
                    }));
                },
                addOICItemUrl: function () {
                    var url = this.inputOICUrl.value;
                    if (url.indexOf("id=") !== -1) {
                        if (url.indexOf("/portal") !== -1)
                            var itemUrl = url.split("/portal")[0] + "/portal" + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];
                        else
                            var itemUrl = "https://www.arcgis.com" + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];
                        esriRequest(itemUrl, {
                            query: {
                                f: "json"
                            },
                            responseType: "json"
                        }).then(lang.hitch(this, function (response) {
                            if (response.data && response.data.type === "Oriented Imagery Catalog") {
                                this.addOICItem(itemUrl, true);
                            } else {
                                this.errorNotification(this.nls.error5);
                            }
                        })).catch(lang.hitch(this, function () {
                            this.errorNotification(this.nls.error6);
                        }));
                    } else {
                        this.errorNotification(this.nls.error6);
                    }
                },
                addOICFile: function () {
                    if (this.oicJSON) {
                        if (this.oicJSON.type && this.oicJSON.type.toLowerCase() === "oic" && this.oicJSON.properties) {
                            this.config.oic.push({
                                title: this.oicJSON.properties.Name,
                                serviceUrl: this.oicJSON.properties.ServiceURL,
                                overviewUrl: this.oicJSON.properties.OverviewURL,
                                itemUrl: this.oicJSON
                            });
                            this.addSelectOption(this.selectOIC, this.oicJSON.properties.Name, "" + this.config.oic.length - 1 + "");
                            this.addOICDialog.hide();
                            this.selectOIC.selectedIndex = this.selectOIC.options.length - 1;
                            this.selectFeatureService(this.selectOIC.value);
                        } else
                            this.errorNotification(this.nls.error1);
                    }
                },
                setDisabledProperty: function (value) {
                    if (value)
                        this.addOICBtn.disabled = false;
                    else
                        this.addOICBtn.disabled = true;
                },
                errorNotification: function (text) {
                    this.oicJSON = null;
                    html.set(this.errorNotify, text);
                    domStyle.set(this.errorNotify, "display", "block");
                    setTimeout(lang.hitch(this, function () {
                        domStyle.set(this.errorNotify, "display", "none");
                    }), 5000);
                },
                onOpen: function () {
                    this.widgetOpen = true;
                    if (this.selectLocationFlag) {
                        this.sceneView.cursor = "crosshair";
                    }
                },
                onClose: function () {
                    this.widgetOpen = false;
                    if (this.selectLocationFlag) {
                        this.sceneView.cursor = "default";
                    }
                },
                layerModuleSelector: function (url) {
                    Layer.fromArcGISServerUrl({
                        url: url,
                        properties: {
                            visible: false
                        }
                    }).then(lang.hitch(this, function (layerObject) {
                        layerObject.load().then(lang.hitch(this, function (loaded) {
                            this.overviewLayer = layerObject;
                            this.sceneView.map.add(this.overviewLayer);
                        }));
                    })).catch(lang.hitch(this, function () {
                        if (url.toLowerCase().indexOf("wmts") !== -1) {
                            this.overviewLayer = new WMTSLayer({
                                url: url,
                                visible: false
                            });
                        } else if (url.toLowerCase().indexOf("wms") !== -1) {
                            this.overviewLayer = new WMSLayer({
                                url: url,
                                visible: false
                            });
                        } else if (url.toLowerCase().indexOf(".kml") !== -1) {
                            this.overviewLayer = new KMLLayer({
                                url: url,
                                visible: false
                            });
                        }
                        if (this.overViewLayer)
                            this.sceneView.map.add(this.overviewLayer);
                    }));

                },
                setViewMode: function (value) {
                    this.graphicsLayer.graphics.removeAll();
                    if (value === "2D") {
                        if (!domClass.contains(this.hideImageBtn, "oi-widget-hide"))
                            this.setMapView();
                        domStyle.set(this["3DModePane"], "display", "none");
                        domStyle.set(this["2DModePane"], "display", "block");
                        this.mapViewState = false;
                        this.orientedViewer.setMapView({state: "Off"});
                    } else {
                        this.mapViewState = true;
                        if (this.imageDialog.open) {
                            this.dialogPosition = {l: this.imageDialog.domNode.offsetLeft, t: this.imageDialog.domNode.offsetTop};
                            this.imageDialog.hide();
                        }
                        this.orientedViewer.setMapView({state: "On", width: this.sceneView.width, height: this.sceneView.height});
                        domStyle.set(this["2DModePane"], "display", "none");
                        domStyle.set(this["3DModePane"], "display", "block");

                    }
                },
                setMapView: function () {
                    html.set(this.notifyUser, "");
                    this.graphicsLayer.graphics.removeAll();
                    this.changeLayersVisibility(true);
                    this.setViewConstraints({
                        rotate: true
                    });
                    domClass.add(this.hideImageBtn, "oi-widget-hide");
                },
                setViewConstraints: function (prop) {

                    if (!prop.rotate) {
                        this.disableZoom();
                    } else {
                        this.enableZoom();
                    }
                },
                disableZoom: function () {
                    var zoomNode = document.getElementsByClassName("esri-component esri-zoom esri-widget");
                    if (zoomNode.length)
                        domStyle.set(zoomNode[0], "display", "none");
                    var stopEvtPropagation = function (evt) {
                        evt.stopPropagation();
                    };
                    this.zoomHandlers = [];
                    this.zoomHandlers.push(this.sceneView.on("mouse-wheel", lang.hitch(this, function (evt) {

                        evt.stopPropagation();
                        if (evt.deltaY < 0)
                            this.zoomImageOnMap(-1, evt.x, evt.y);
                        else
                            this.zoomImageOnMap(1, evt.x, evt.y);

                    })));
                    this.zoomHandlers.push(this.sceneView.on("double-click", stopEvtPropagation));

                    this.zoomHandlers.push(this.sceneView.on("double-click", ["Control"], stopEvtPropagation));

                    this.zoomHandlers.push(this.sceneView.on("drag", lang.hitch(this, function (evt) {
                        evt.stopPropagation();
                        this.panImageOnMap(evt);
                    })));

                    this.zoomHandlers.push(this.sceneView.on("drag", ["Shift"], stopEvtPropagation));
                    this.zoomHandlers.push(this.sceneView.on("drag", ["Shift", "Control"], stopEvtPropagation));
                    this.zoomHandlers.push(this.sceneView.on("key-down", lang.hitch(this, function (event) {
                        var prohibitedKeys = ["+", "-", "Shift", "_", "="];
                        var keyPressed = event.key;
                        if (prohibitedKeys.indexOf(keyPressed) !== -1) {
                            event.stopPropagation();
                            if (keyPressed === "+")
                                this.zoomImageOnMap(-1, this.sceneView.width / 2, this.sceneView.height / 2);
                            else if (keyPressed === "-")
                                this.zoomImageOnMap(1, this.sceneView.width / 2, this.sceneView.height / 2);
                        }
                        if (keyPressed.slice(0, 5) === "Arrow") {
                            event.stopPropagation();
                            this.panImageOnMap({action: "start", x: this.sceneView.width / 2, y: this.sceneView.height / 2});
                            if (keyPressed === "ArrowLeft")
                                this.panImageOnMap({action: "end", x: this.sceneView.width / 2 + 10, y: this.sceneView.height / 2});
                            else if (keyPressed === "ArrowRight")
                                this.panImageOnMap({action: "end", x: this.sceneView.width / 2 - 10, y: this.sceneView.height / 2});
                            else if (keyPressed === "ArrowUp")
                                this.panImageOnMap({action: "end", x: this.sceneView.width / 2, y: this.sceneView.height / 2 + 10});
                            else if (keyPressed === "ArrowDown")
                                this.panImageOnMap({action: "end", x: this.sceneView.width / 2, y: this.sceneView.height / 2 - 10});
                        }
                    })));
                },
                enableZoom: function () {
                    var zoomNode = document.getElementsByClassName("esri-component esri-zoom esri-widget");
                    if (zoomNode.length)
                        domStyle.set(zoomNode[0], "display", "block");
                    for (var a in this.zoomHandlers) {
                        this.zoomHandlers[a].remove();
                    }
                    this.zoomHandlers = [];
                },
                changeLayersVisibility: function (flag) {
                    if (!flag) {
                        this.layerVisibleStatus = {g: [], b: [], o: []};
                    }
                    var gLayer = this.sceneView.map.ground.layers.items;
                    var bLayer = this.sceneView.map.basemap.baseLayers.items;
                    if (flag) {
                        this.sceneView.map.ground.opacity = 1;//this.layerVisibleStatus.g[0];
                        if (this.layerVisibleStatus) {
                            for (var a = 0; a < bLayer.length; a++) {
                                bLayer[a].visible = this.layerVisibleStatus.b[a];
                            }
                        }

                    } else {
                        this.sceneView.map.ground.opacity = 0;
                        for (var a = 0; a < bLayer.length; a++) {
                            this.layerVisibleStatus.b.push(bLayer[a].visible);
                            bLayer[a].visible = flag;
                        }
                    }
                    var oLayer = this.sceneView.map.layers.items;

                    for (var a = 0; a < oLayer.length; a++) {
                        if (oLayer[a].id !== "oi-graphicsLayer" && oLayer[a].type !== "feature") {
                            if (flag)
                                oLayer[a].visible = this.layerVisibleStatus.o[a];
                            else {
                                this.layerVisibleStatus.o.push(oLayer[a].visible);
                                oLayer[a].visible = flag;
                            }
                        }
                    }
                },
                addImageOnMap: function (response) {
                    for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                        if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-imageMesh") {
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                            break;
                        }
                    }
                    if (response.image) {
                        var graphic = new Graphic({geometry: response.image, symbol: {type: "mesh-3d", symbolLayers: [{type: "fill"}]}, attributes: {"id": "oi-imageMesh"}});
                        this.imageProperties = response.properties;
                        this.setViewConstraints({
                            rotate: false
                        });
                        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
                        this.drawFrustums(response.coverageFrustums, response.imageAttributes.imageID);
                        this.activeImageID = response.imageAttributes.imageID;
                        domClass.remove(this.hideImageBtn, "oi-widget-hide");
                        html.set(this.notifyUser, "");

                        var point = new Point({x: response.properties.location.x, y: response.properties.location.y, spatialReference: new SpatialReference(response.properties.location.spatialReference)});
                        this.sceneView.map.ground.queryElevation(point).then(lang.hitch(this, function (result) {
                            this.imageProperties.alt = result.geometry.z;
                            result.geometry.z += response.properties.location.z;

                            var cam = new Camera({
                                fov: response.properties.fov,
                                heading: response.properties.yaw,
                                tilt: response.properties.pitch,
                                position: result.geometry
                            });
                            var camera = this.sceneView.camera.clone();
                            camera.fov = cam.fov;
                            this.sceneView.camera = camera;
                            this.sceneView.goTo(cam).then(lang.hitch(this, function () {
                                this.changeLayersVisibility(false);
                                this.graphicsLayer.add(graphic);

                            }));
                        }));
                    } else {
                        if (response.error)
                            html.set(this.notifyUser, response.error);
                        else
                            html.set(this.notifyUser, response.error);
                    }
                    this.hideLoading();
                },
                updateImageOnMap: function (response) {
                    for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                        if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-imageMesh") {
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                            break;
                        }
                    }
                    var graphic = new Graphic({geometry: response.image, symbol: {type: "mesh-3d", symbolLayers: [{type: "fill"}]}, attributes: {"id": "oi-imageMesh"}});
                    this.graphicsLayer.add(graphic);

                },
                setCameraView: function (att) {
                    var def = new Deferred();
                    if (att) {
                        var point = new Point({x: att.location.x, y: att.location.y, spatialReference: new SpatialReference(att.location.spatialReference)});
                        this.sceneView.map.ground.queryElevation(point).then(lang.hitch(this, function (result) {
                            this.imageProperties.alt = result.geometry.z;
                            result.geometry.z += att.location.z;
                            var cam = new Camera({
                                fov: att.fov,
                                heading: att.yaw,
                                tilt: att.pitch,
                                position: result.geometry
                            });
                            var camera = this.sceneView.camera.clone();
                            camera.fov = cam.fov;
                            this.sceneView.camera = camera;
                            this.sceneView.goTo(cam).then(lang.hitch(this, function () {
                                return def.resolve();
                            }));
                        }));
                    }
                    return def.promise;
                },
                zoomImageOnMap: function (scaleFactor, x, y) {
                    var camera = this.sceneView.camera.clone();
                    this.orientedViewer.zoomImageOnMap({width: this.sceneView.width,
                        height: this.sceneView.height,
                        x: x, y: y, fov: camera.fov,
                        heading: camera.heading,
                        tilt: camera.tilt,
                        elevation: this.imageProperties.alt,
                        position: camera.position,
                        delta: scaleFactor});
                },
                panImageOnMap: function (evt) {
                    //evt.stopPropagation();
                    var camera = this.sceneView.camera.clone();
                    this.orientedViewer.panImageOnMap({
                        width: this.sceneView.width,
                        height: this.sceneView.height,
                        elevation: this.imageProperties.alt,
                        heading: camera.heading,
                        tilt: camera.tilt,
                        action: evt.action,
                        x: evt.x, y: evt.y,
                        fov: camera.fov,
                        position: camera.position});
                },
                updateCameraOnMap: function (cameraProperties) {
                    var camera = this.sceneView.camera.clone();
                    camera.heading = cameraProperties.heading;
                    camera.tilt = cameraProperties.tilt;
                    camera.fov = cameraProperties.fov;
                    cameraProperties.location.z += this.imageProperties.alt;
                    camera.position = cameraProperties.location;
                    this.sceneView.camera = camera;
                },
                listAllVectorLayers: function () {
                    var layers = this.sceneView.map.layers.items;
                    this.vectorLayers = {};
                    for (var a = 0; a < layers.length; a++) {
                        if (layers[a].type === "feature") {
                            this.addSelectOption(this.featureClass, layers[a].title || layers[a].name, layers[a].id);
                            this.vectorLayers[layers[a].id] = {
                                title: layers[a].title,
                                url: layers[a].url + "/" + layers[a].layerId,
                                editable: layers[a].editingEnabled || layers[a].capabilities.operations.supportsEditing,
                                renderer: layers[a].renderer,
                                geometryType: layers[a].geometryType,
								fields: layers[a].fields
                            };
                        }
                    }
                    if (Object.keys(this.vectorLayers).length)
                        domStyle.set(this.addVectorContainer, "display", "block");
                    else
                        domStyle.set(this.addVectorContainer, "display", "none");
                },
                addFeature: function (json) {

                    for (var b in this.vectorLayers) {
                        if (this.vectorLayers[b].title === json.layer) {
                            var layer = this.sceneView.map.findLayerById(b);
                            break;
                        }
                    }
                    var attributes = json.attributes ? json.attributes : {};
                    attributes["ImgGeom"] = JSON.stringify(attributes["ImgGeom"]);
                    var graphic = new Graphic({
                        geometry: layer.geometryType === "point" ? new Point(json.geometry) : layer.geometryType === "polyline" ? new Polyline(json.geometry) : new Polygon(json.geometry),
                        attributes: attributes
                    });
                    if (layer.geometryType === "polygon")
                        var geo = new Multipoint({points: graphic.geometry.rings[0], spatialReference: graphic.geometry.spatialReference});
                    else
                        var geo = graphic.geometry;
                    this.sceneView.map.ground.queryElevation(geo).then(lang.hitch(this, function (result) {
                        if (layer.geometryType === "polygon") {
                            if (graphic.geometry.hasZ) {
                                for (var a in geo.points) {
                                    result.geometry.points[a][2] += (geo.points[a][2]);
                                }
                            }
                            graphic.geometry.hasZ = true;
                            graphic.geometry.rings[0] = result.geometry.points;
                        } else {
                            graphic.geometry = result.geometry;
                            if (geo.hasZ) {
                                if (graphic.geometry.type === "point") {
                                    graphic.geometry.z += (geo.z);
                                } else {
                                    for (var a in geo.paths[0]) {
                                        graphic.geometry.paths[0][a][2] += (geo.paths[0][a][2]);
                                    }
                                }
                            }
                        }
                        var param = {addFeatures: [graphic]};
                        layer.applyEdits(param).then(lang.hitch(this, function (result) {
                            if (result.addFeatureResults.length) {
                                this.showAttributeWindow(layer, graphic, result.addFeatureResults[0].objectId);
                                this.orientedViewer.applyEdits({layer: json.layer, success: true, objectId: result.addFeatureResults[0].objectId, mode: "add"});
                            } else
                                this.orientedViewer.applyEdits({layer: json.layer, success: false, error: "Failed", mode: "add"});
                        })).catch(lang.hitch(this, function (error) {
                            this.orientedViewer.applyEdits({layer: json.layer, success: false, error: error.message, mode: "add"});
                        }));
                    }));


                },
                deleteFeature: function (json) {

                    for (var b in this.vectorLayers) {
                        if (this.vectorLayers[b].title === json.layer) {
                            var layer = this.sceneView.map.findLayerById(b);
                            break;
                        }
                    }
                    layer.applyEdits({deleteFeatures: [{objectId: json.featureId}]}).then(lang.hitch(this, function (result) {
                        if (result.deleteFeatureResults.length)
                            this.orientedViewer.applyEdits({layer: json.layer, success: true, mode: "delete"});
                        else
                            this.orientedViewer.applyEdits({layer: json.layer, success: false, error: "Failed", mode: "delete"});
                    })).catch(lang.hitch(this, function (error) {
                        this.orientedViewer.applyEdits({layer: json.layer, success: false, error: error.message, mode: "delete"});
                    }));

                },
                selectFeature: function (featureJson) {
                    if (this.sceneView.popup.visible)
                        this.sceneView.popup.close();

                    var features = Object.keys(featureJson);
                    var graphics = [];
                    var count = features.length;
                    features.forEach(lang.hitch(this, function (key) {
                        for (var b in this.vectorLayers) {
                            if (this.vectorLayers[b].title === key) {
                                var layer = this.sceneView.map.findLayerById(b);
                                break;
                            }
                        }
                        if (layer.popupEnabled && layer.visible) {
                            layer.queryFeatures({
                                objectIds: featureJson[key],
                                outFields: ["*"],
                                returnGeometry: true,
                                returnZ: true,
                                outSpatialReference: this.sceneView.extent.spatialReference
                            }).then(lang.hitch(this, function (results) {
                                if (results.features.length) {
                                    for (var a in results.features) {
                                        results.features[a].geometry.spatialReference = this.sceneView.extent.spatialReference;
                                        graphics.push(new Graphic({attributes: results.features[a].attributes,
                                            layer: layer,
                                            geometry: layer.geometryType === "point" ? new Point(results.features[a].geometry) : layer.geometryType === "polyline" ? new Polyline(results.features[a].geometry) : new Polygon(results.features[a].geometry),
                                            popupTemplate: layer.popupTemplate
                                        }));

                                    }
                                    count--;
                                    if (count === 0) {
                                        this.sceneView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
                                        this.sceneView.popup.open({features: graphics});
                                        this.featureSelected = featureJson;

                                    }
                                }
                            })).catch(lang.hitch(this, function () {
                                count--;
                                if (count === 0 && graphics.length) {
                                    this.sceneView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
                                    this.sceneView.popup.open({features: graphics});
                                    this.featureSelected = featureJson;
                                }
                            }));
                        } else {
                            count--;
                            if (count === 0 && graphics.length) {
                                this.sceneView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
                                this.sceneView.popup.open({features: graphics});
                                this.featureSelected = featureJson;
                            }
                        }
                    }));

                },
                graphicSelected: function (graphic) {
                    if (!this.hidePopup) {
                        this.selectedGraphicProperties = null;
                        domStyle.set(this.viewGraphicBtn, "display", "none");
                        if (graphic && graphic.layer) {
                            if (this.featureSelected)
                                this.orientedViewer.deselectFeaturesInImage(this.featureSelected);
                            var temp = {};
                            temp[graphic.layer.title] = [graphic.attributes[graphic.layer.objectIdField]];
                            this.featureSelected = temp;
                            this.orientedViewer.selectFeaturesInImage(this.featureSelected);
                            var imgUrnExists = false;
                            for (var b in graphic.layer.fields) {
                                if (graphic.layer.fields[b].name === "ImgUrn") {
                                    imgUrnExists = true;
                                    break;
                                }
                            }
                            if (imgUrnExists && this.selectOIC.value !== "select") {
                                for (var a in this.vectorLayerAdded) {
                                    if (this.vectorLayerAdded[a].indexOf(graphic.layer.url) !== -1) {
                                        if (graphic.attributes.hasOwnProperty("ImgUrn")) {
                                            this.findImageInCatalog(graphic.attributes.ImgUrn, graphic, this.config.oic[this.selectOIC.value].serviceUrl, temp);
                                        } else {
                                            var objectId = graphic.attributes[graphic.layer.objectIdField];
                                            var query = new Query();
                                            query.where = graphic.layer.objectIdField + "=" + objectId;
                                            query.outFields = ["ImgUrn"];
                                            query.returnGeometry = false;
                                            graphic.layer.queryFeatures(query).then(lang.hitch(this, function (response) {
                                                if (response.features.length) {
                                                    this.findImageInCatalog(response.features[0].attributes.ImgUrn, graphic, this.config.oic[this.selectOIC.value].serviceUrl, temp);
                                                }
                                            }));
                                        }
                                        break;
                                    }
                                }
                            }
                        }
                    } else if (this.widgetOpen && this.hidePopup) {
                        this.hidePopup = false;
                        this.sceneView.popup.clear();
                        this.sceneView.popup.close();
                    }
                },
                findImageInCatalog: function (imgUrn, graphic, serviceUrl, graphicId) {
                    var geometry = graphic.geometry;
                    if (imgUrn) {
                        Layer.fromArcGISServerUrl({
                            url: serviceUrl,
                            properties: {
                                visible: false
                            }
                        }).then(lang.hitch(this, function (layerObject) {
                            layerObject.load().then(lang.hitch(this, function (loaded) {
                                var fields = layerObject.fields;
                                for (var a in fields) {
                                    if (fields[a].type === "global-id") {
                                        var globalId = fields[a].name;
                                        break;
                                    }
                                    if (fields[a].name === "ExposureID")
                                        var exposureId = "ExposureID";
                                }
                                if (globalId || exposureId) {
                                    var query = new Query();
                                    query.where = (globalId || exposureId) + " = '" + imgUrn + "'";
                                    layerObject.queryObjectIds(query).then(lang.hitch(this, function (response) {
                                        if (response.length) {
                                            this.selectedGraphicProperties = {imgUrn: imgUrn, geometry: geometry, id: response[0], highlight: graphicId};
                                            domStyle.set(this.viewGraphicBtn, "display", "inline-block");
                                        }

                                    }));
                                } else {
                                    if (serviceUrl.indexOf("/ImageServer") !== -1)
                                        var serviceName = (serviceUrl.split("/ImageServer")[0]).split("services/")[1];
                                    else
                                        var serviceName = (serviceUrl.split("/FeatureServer")[0]).split("services/")[1];
                                    var params = imgUrn.split("|");
                                    if (params.length === 3) {
                                        var serviceNameFlag = serviceName.indexOf(params[1]) !== -1 ? true : false;
                                        var id = params[2];
                                    } else if (params.length === 2) {
                                        var serviceNameFlag = serviceName.indexOf(params[0]) !== -1 ? true : false;
                                        var id = params[1];
                                    } else {
                                        var serviceNameFlag = false;
                                        var id = params[0];
                                    }

                                    if (serviceNameFlag) {
                                        this.selectedGraphicProperties = {imgUrn: imgUrn, geometry: geometry, id: id, highlight: graphicId};
                                        domStyle.set(this.viewGraphicBtn, "display", "inline-block");
                                    }


                                }
                            }));
                        }));
                    }
                },
                openImageInViewer: function () {
                    if (this.selectedGraphicProperties && this.oiApiLoaded) {
                        var url = this.config.oic[this.selectOIC.value].itemUrl;
                        if (this.selectedGraphicProperties.geometry.type === "point")
                            var point = this.selectedGraphicProperties.geometry;
                        else if (this.selectedGraphicProperties.geometry.type === "polygon")
                            var point = this.selectedGraphicProperties.geometry.centroid;
                        else
                            var point = this.selectedGraphicProperties.geometry.extent.center;
                        point.z = 0;
                        domStyle.set(this.viewGraphicBtn, "display", "none");
                        if (!this.imageDialog.open) {
                            this.imageDialog.show();
                            domConstruct.destroy(this.imageDialog.id + "_underlay");
                            domStyle.set(this.imageDialog.domNode, "z-index", "1");
                            if (this.dialogPosition) {
                                domStyle.set(this.imageDialog.domNode, "left", this.dialogPosition.l + "px");
                                domStyle.set(this.imageDialog.domNode, "top", this.dialogPosition.t + "px");
                            }
                        }
                        this.orientedViewer.searchImages(point.toJSON(), url, {maxDistance: 1000, mapSize: {w: this.sceneView.width, h: this.sceneView.height}, objectId: parseInt(this.selectedGraphicProperties.id), extent: this.sceneView.extent.toJSON()});
                        this.orientedViewer.toggleEditTool({layer: this.selectedGraphicProperties.graphicLayer, tool: "display", state: true});
                        this.orientedViewer.selectFeaturesInImage(this.selectedGraphicProperties.highlight);
                    }
                },
                selectPointOnMap: function () {
                    if (domClass.contains(this.selectPointBtn, "oi-widget-selectBtnSelected")) {
                        domClass.remove(this.selectPointBtn, "oi-widget-selectBtnSelected");
                        this.selectPointBtn.title = this.nls.selectPointOn;
                        this.selectLocationFlag = false;
                        this.sceneView.cursor = "default";
                    } else {
                        domClass.add(this.selectPointBtn, "oi-widget-selectBtnSelected");
                        this.selectPointBtn.title = this.nls.selectPointOff;
                        this.selectLocationFlag = true;
                        this.sceneView.cursor = "crosshair";
                    }
                },
                showAttributeWindow: function (layer, graphic, objectId) {
                    var editingNode = domConstruct.toDom("<div id='formDiv'></div>");
                    var featureForm = new FeatureForm({
                        container: editingNode,
                        layer: layer,
                        feature: graphic
                    });
                    domConstruct.place("<button class='btn btn-clear'>" + this.nls.update + "</button><button class='btn btn-clear' style='margin-left:10px;'>" + this.nls.delete + "</button>", featureForm.container);
                    featureForm.container.childNodes[1].addEventListener("click", lang.hitch(this, function () {
                        if (featureForm)
                            featureForm.submit();
                    }));
                    featureForm.container.childNodes[2].addEventListener("click", lang.hitch(this, function () {
                        layer.applyEdits({deleteFeatures: [{objectId: objectId}]}).then(lang.hitch(this, function (result) {
                            if (result.deleteFeatureResults.length) {
                                this.orientedViewer.refreshVectorLayer(layer.title);
                                this.sceneView.popup.clear();
                                this.sceneView.popup.close();
                            }

                        }));
                    }));
                    featureForm.on("submit", lang.hitch(this, function () {
                        var updated = featureForm.getValues();
                        Object.keys(updated).forEach(lang.hitch(this, function (name) {
                            graphic.attributes[name] = updated[name];
                        }));
                        graphic.attributes[layer.objectIdField] = objectId;
                        var param = {updateFeatures: [graphic]};
                        layer.applyEdits(param).then(lang.hitch(this, function (result) {
                            if (result.updateFeatureResults.length) {
                                this.sceneView.popup.clear();
                                this.sceneView.popup.close();
                            }
                        }));
                    }));
                    this.sceneView.popup.open({location: graphic.geometry, content: editingNode});
                },
                showLoading: function () {
                    domStyle.set(this.loadingNode, "display", "block");
                },
                hideLoading: function () {
                    domStyle.set(this.loadingNode, "display", "none");
                },
                removeSelectOptions: function (domNode) {
                    for (var b = domNode.options.length - 1; b >= 0; b--) {
                        domNode.remove(b);
                    }
                },
                addSelectOption: function (domNode, label, value) {
                    var option = document.createElement("option");
                    option.text = label;
                    option.value = value;
                    domNode.add(option);
                }
            });
            clazz.hasLocale = false;
            return clazz;
        });