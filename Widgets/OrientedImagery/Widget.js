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
    "dojo/_base/lang",
    'dojo/dom-construct',
    "dojo/dom-style", "esri/tasks/query", "esri/tasks/QueryTask", "esri/request",
    "dojo/html", "dojox/layout/ResizeHandle", "esri/geometry/Extent", "esri/tasks/GeometryService", "esri/tasks/ProjectParameters",
    "esri/geometry/Polygon", "esri/SpatialReference", "esri/arcgis/Portal",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/symbols/SimpleFillSymbol",
    "esri/graphic", "esri/geometry/Point",
    "esri/layers/FeatureLayer",
    "esri/layers/ArcGISImageServiceLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/WMTSLayer",
    "esri/layers/WMSLayer",
    "esri/layers/KMLLayer",
    "esri/layers/VectorTileLayer",
    "https://oi.geocloud.com/api/v1.1/main.js",
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
                lang,
                domConstruct, domStyle, Query, QueryTask, esriRequest, html, ResizeHandle, Extent, GeometryService, ProjectParameters, Polygon, SpatialReference, arcgisPortal, SimpleMarkerSymbol, SimpleLineSymbol, Color, SimpleFillSymbol, Graphic, Point, FeatureLayer, ArcGISImageServiceLayer, ArcGISTiledMapServiceLayer, WMTSLayer, WMSLayer, KMLLayer, VectorTileLayer) {

            var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
                templateString: template,
                name: 'OrientedImagery',
                baseClass: 'jimu-widget-OrientedImagery',
                oiApiLoaded: false,
                activeImageID: null,
                widgetOpen: false,
                startup: function () {
                    this.inherited(arguments);
                },
                postCreate: function () {
                    this.loadingNode = domConstruct.toDom('<img  style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif">');
                    domConstruct.place(this.loadingNode, this.domNode);
                    this.hideLoading();
                    this.selectOIC.on("change", lang.hitch(this, this.selectFeatureService));
                    this.imagePoints.on("change", lang.hitch(this, this.turningOnOffFeatures, 'imagePoints'));
                    this.currentCoverage.on("change", lang.hitch(this, this.turningOnOffFeatures, "currentCoverage"));
                    this.similarCoverage.on("change", lang.hitch(this, this.turningOnOffFeatures, "similarCoverage"));
                    this.addBtn.on("click", lang.hitch(this, function () {
                        if (!this.addOICDialog.open) {
                            this.addOICDialog.show();
                            domConstruct.destroy(this.addOICDialog.id + "_underlay");
                            this.getOICFromAgol();
                        }
                    }));

                    this.addOICBtn.on("click", lang.hitch(this, this.addOICItem));
                    this.agolContentSelect.on("change", lang.hitch(this, this.populateFolderGroupList));
                    this.agolFolderList.on("change", lang.hitch(this, this.populateOICList));
                    this.agolOICList.on("change", lang.hitch(this, this.checkOIC));
                    this.allCoverage.on("change", lang.hitch(this, this.createCoverageArea));
                    this.loadOrientedImageryCatalog();

                    if (this.map) {
                        this.map.on("click", lang.hitch(this, this.mapClickEvent));
                        this.map.on("update-start", lang.hitch(this, this.showLoading));
                        this.map.on("update-end", lang.hitch(this, this.hideLoading));
                    }
                    if (this.config.enableAddOIC)
                        domStyle.set(this.addBtn.domNode, "display", "inline-block");

                    this.loadOrientedImageryApi();
                    this.setupSymbols();
                    this.setupResizeHandle();
                    this.geometryService = new GeometryService("https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer");
                },
                loadOrientedImageryApi: function () {
                    this.orientedViewer = orientedImagery.viewer(this.oiviewer);
                    this.orientedViewer.on("load", lang.hitch(this, function (value) {
                        this.oiApiLoaded = true;
                    }));
                    this.orientedViewer.on("searchImages", lang.hitch(this, this.drawPointAndPolygons));
                    this.orientedViewer.on("updateImage", lang.hitch(this, this.updateCoveragePolygon));
                    this.orientedViewer.on("changeImage", lang.hitch(this, this.updateGraphics));
                    this.orientedViewer.on("imageToGroundPoint", lang.hitch(this, function (pointJson) {
                        this.showPointOnMap(new Point(pointJson));
                    }));
                },
                loadOrientedImageryCatalog: function () {
                    this.selectOIC.addOption({label: "Select Catalog", value: "select"});
                    for (var a = 0; a < this.config.oic.length; a++) {
                        this.selectOIC.addOption({label: this.config.oic[a].title, value: a.toString()});
                    }
                },
                setupSymbols: function () {
                    this.activeSourcePointSymbol = new SimpleMarkerSymbol();
                    this.activeSourcePointSymbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE);
                    this.activeSourcePointSymbol.setSize(20);
                    this.activeSourcePointSymbol.setColor(new Color([255, 102, 102, 1]));
                    this.activeSourcePointSymbol.setOutline(null);
                    this.sourcePointSymbol = new SimpleMarkerSymbol();
                    this.sourcePointSymbol.setStyle(SimpleMarkerSymbol.STYLE_CIRCLE);
                    this.sourcePointSymbol.setSize(10);
                    this.sourcePointSymbol.setColor(new Color([0, 128, 192, 1]));
                    this.sourcePointSymbol.setOutline(null);
                    this.polygonSymbol = new SimpleFillSymbol();
                    this.polygonSymbol.setStyle(SimpleFillSymbol.STYLE_SOLID);
                    this.polygonSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([0, 128, 192]), 1));
                    this.polygonSymbol.setColor(new Color([0, 128, 192, 0.5]));
                    this.activePolygonSymbol = new SimpleFillSymbol();
                    this.activePolygonSymbol.setStyle(SimpleFillSymbol.STYLE_SOLID);
                    this.activePolygonSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([255, 102, 102]), 1));
                    this.activePolygonSymbol.setColor(new Color([255, 102, 102, 0.5]));
                    this.diamondSymbol = new SimpleMarkerSymbol();
                    this.diamondSymbol.setStyle(SimpleMarkerSymbol.STYLE_DIAMOND);
                    this.diamondSymbol.setSize(10);
                    this.diamondSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([0, 255, 0]), 1));
                    this.diamondSymbol.setColor(new Color([0, 255, 0]));
                    this.crossSymbol = new SimpleMarkerSymbol();
                    this.crossSymbol.setStyle(SimpleMarkerSymbol.STYLE_X);
                    this.crossSymbol.setSize(8);
                    this.crossSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([255, 0, 0]), 2));
                    this.crossSymbol.setColor(new Color([255, 0, 0]));
                    this.coverageMapSymbol = new SimpleFillSymbol();
                    this.coverageMapSymbol.setStyle(SimpleFillSymbol.STYLE_SOLID);
                    this.coverageMapSymbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_NULL, new Color([0, 200, 0]), 1));
                    this.coverageMapSymbol.setColor(new Color([0, 200, 0, 0.5]));
                },
                setupResizeHandle: function () {
                    var node = document.createElement("div");
                    this.imageDialog.domNode.appendChild(node);
                    var handle = new ResizeHandle({
                        targetId: this.imageDialog.id,
                        name: "oi-dialogHandle",
                        style: "bottom:2px;right:2px;",
                        minSize: {w: 400, h: 250}
                    }).placeAt(node);
                    dojo.subscribe("/dojo/resize/stop", lang.hitch(this, function (resizeHandle) {
                        if (resizeHandle.name === "oi-dialogHandle") {
                            this.oiviewer.style.width = "100%";
                            this.oiviewer.style.height = "100%";
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
                    value = Number(value);
                    if (this.overviewLayer) {
                        this.map.removeLayer(this.overviewLayer);
                        this.overviewLayer = null;
                    }
                    this.graphicExists = false;
                    this.allCoverage.set("checked", false);
                    this.map.graphics.clear();
                    this.imageDialog.hide();
                    if (value !== "select") {

                        var url = this.config.oic[value].serviceUrl;
                        if (url.indexOf("ImageServer") === -1) {
                            var query = new Query();
                            query.where = "1=1";
                            query.returnGeometry = false;
                            query.outSpatialReference = this.map.extent.spatialReference;
                            var queryTask = new QueryTask(url);
                            queryTask.executeForExtent(query, lang.hitch(this, function (response) {
                                if (response.extent) {
                                    this.map.setExtent(response.extent);
                                }
                            }));
                        } else {
                            var request = new esriRequest({
                                url: url,
                                content: {
                                    f: "json"
                                },
                                "handleAs": "json",
                                "callbackParamName": "callback"
                            });
                            request.then(lang.hitch(this, function (response) {
                                if (response && response.extent) {
                                    if (response.extent.spatialReference.wkid === this.map.spatialReference.wkid)
                                        this.map.setExtent(new Extent(response.extent));
                                    else {
                                        var params = new ProjectParameters();
                                        params.geometries = [new Extent(response.extent)];
                                        params.outSR = new SpatialReference(this.map.spatialReference.wkid);
                                        this.geometryService.project(params, lang.hitch(this, function (geometry) {
                                            this.map.setExtent(geometry[0]);
                                        }));
                                    }
                                }
                            }));
                        }
                        if (this.config.oic[value].overviewUrl) {
                            this.overviewLayer = this.layerModuleSelector(this.config.oic[value].overviewUrl);
                            this.map.addLayer(this.overviewLayer);
                        }
                    }
                },
                turningOnOffFeatures: function (selectedFeatures) {
                    switch (selectedFeatures) {
                        case 'imagePoints' :
                        {
                            if (this.imagePoints.get("checked")) {
                                for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                                    if (this.map.graphics.graphics[s].symbol.style === "circle") {
                                        this.map.graphics.graphics[s].show();

                                    }
                                }
                            } else {
                                for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                                    if (this.map.graphics.graphics[s].symbol.style === "circle")
                                        this.map.graphics.graphics[s].hide();
                                }
                            }
                            break;
                        }
                        case 'currentCoverage' :
                        {
                            if (this.currentCoverage.get("checked")) {
                                for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                                    if (this.map.graphics.graphics[s].symbol.style === "solid" && this.map.graphics.graphics[s].symbol.outline.color.r === 255) {
                                        this.map.graphics.graphics[s].show();

                                    }
                                }
                            } else {
                                for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                                    if (this.map.graphics.graphics[s].symbol.style === "solid" && this.map.graphics.graphics[s].symbol.outline.color.r === 255) {
                                        this.map.graphics.graphics[s].hide();
                                    }
                                }
                            }
                            break;
                        }
                        case 'similarCoverage' :
                        {
                            if (this.similarCoverage.get("checked")) {
                                for (var s = this.map.graphics.graphics.length - 1; s >= 0; s--) {
                                    if (this.map.graphics.graphics[s].symbol.style === "solid" && this.map.graphics.graphics[s].symbol.outline.color.b === 192) {
                                        this.map.graphics.graphics[s].show();
                                    }
                                }
                            } else {
                                for (var s = this.map.graphics.graphics.length - 1; s >= 0; s--) {
                                    if (this.map.graphics.graphics[s].symbol.style === "solid" && this.map.graphics.graphics[s].symbol.outline.color.b === 192) {
                                        this.map.graphics.graphics[s].hide();
                                    }
                                }
                            }
                            break;
                        }

                    }
                },
                mapClickEvent: function (evt) {
                    if (this.widgetOpen) {
                        if (this.selectOIC.get("value") !== "select") {
                            if (evt.altKey) {
                                this.showPointOnMap(evt.mapPoint);
                                this.groundToImage(evt.mapPoint);
                            } else {
                                this.allCoverage.set("checked", false);
                                this.graphicExists = false;
                                this.showLoading();
                                this.imageDialog.show();
                                domConstruct.destroy(this.imageDialog.id + "_underlay");
                                this.searchImages(evt.mapPoint);
                            }
                        }
                    }
                },
                searchImages: function (point) {
                    var url = this.config.oic[Number(this.selectOIC.get("value"))].itemUrl;
                    if (this.oiApiLoaded) {
                        this.orientedViewer.searchImages(point, url, 1000);
                    }
                },
                drawPointAndPolygons: function (response) {
                    this.hideLoading();
                    this.map.graphics.clear();
                    if (!response.error) {
                        this.graphicExists = false;
                        this.map.graphics.add(new Graphic(new Point(response.point), this.crossSymbol));
                        this.drawCoveragePolygons(response.coveragePolygons, response.imageID);
                        this.drawImageSourcePoints(response.imageSourcePoints, response.imageID);
                        this.activeImageID = response.imageID;
                    }
                },
                drawImageSourcePoints: function (points, imageID) {
                    for (var i = 0; i < points.length; i++) {
                        this.map.graphics.add(new Graphic(points[i], (imageID === points[i].imageID ? this.activeSourcePointSymbol : this.sourcePointSymbol), {"imageID": points[i].imageID}));
                        if (!this.imagePoints.checked)
                            this.map.graphics.graphics[this.map.graphics.graphics.length - 1].hide();
                    }
                },
                drawCoveragePolygons: function (polygons, imageID) {
                    this.coveragePolygons = [];
                    for (var a = 0; a < polygons.length; a++) {
                        this.coveragePolygons["p" + polygons[a].imageID] = polygons[a];
                        if (imageID === polygons[a].imageID) {
                            this.map.graphics.add(new Graphic(polygons[a], this.activePolygonSymbol, {"imageID": polygons[a].imageID}));
                            if (!this.currentCoverage.checked)
                                this.map.graphics.graphics[this.map.graphics.graphics.length - 1].hide();
                            var currentIndex = this.map.graphics.graphics.length - 1;
                        } else {
                            this.map.graphics.add(new Graphic(polygons[a], this.polygonSymbol, {"imageID": polygons[a].imageID}));
                            if (!this.similarCoverage.checked)
                                this.map.graphics.graphics[this.map.graphics.graphics.length - 1].hide();
                        }
                    }
                    if (currentIndex)
                        this.map.graphics.graphics[currentIndex].getDojoShape().moveToFront();
                },
                showPointOnMap: function (geometry) {
                    if (!this.graphicExists) {
                        this.map.graphics.add(new Graphic(geometry, this.diamondSymbol));
                        this.graphicExists = true;
                    } else {

                        for (var v = this.map.graphics.graphics.length - 1; v >= 0; v--) {
                            if (this.map.graphics.graphics[v].symbol.style === "diamond") {
                                this.map.graphics.graphics[v].setGeometry(geometry);
                                break;
                            }
                        }
                    }
                },
                groundToImage: function (point) {
                    if (this.oiApiLoaded) {
                        this.orientedViewer.groundToImage(point);
                    }
                },
                updateCoveragePolygon: function (imageProperties) {

                    for (var v = this.map.graphics.graphics.length - 1; v >= 0; v--) {
                        if (this.map.graphics.graphics[v].symbol.style === "solid" && this.map.graphics.graphics[v].attributes.imageID === imageProperties.imageID) {
                            this.map.graphics.graphics[v].setGeometry(new Polygon(imageProperties.coveragePolygon));
                            break;
                        }
                    }
                },
                updateGraphics: function (image) {

                    for (var v = this.map.graphics.graphics.length - 1; v >= 0; v--) {
                        if (this.map.graphics.graphics[v].symbol.style === "solid" && this.map.graphics.graphics[v].attributes.imageID === image.imageID) {
                            this.map.graphics.graphics[v].setSymbol(this.activePolygonSymbol);
                            if (!this.currentCoverage.checked)
                                this.map.graphics.graphics[v].hide();
                            else
                                this.map.graphics.graphics[v].show();
                        } else if (this.map.graphics.graphics[v].symbol.style === "solid" && this.map.graphics.graphics[v].attributes.imageID === this.activeImageID) {
                            this.map.graphics.graphics[v].setSymbol(this.polygonSymbol);
                            this.map.graphics.graphics[v].setGeometry(this.coveragePolygons["p" + this.activeImageID]);
                            if (!this.similarCoverage.checked)
                                this.map.graphics.graphics[v].hide();
                            else
                                this.map.graphics.graphics[v].show();
                        } else if (this.map.graphics.graphics[v].symbol.style === "circle" && this.map.graphics.graphics[v].attributes.imageID === image.imageID) {
                            this.map.graphics.graphics[v].setSymbol(this.activeSourcePointSymbol);
                        } else if (this.map.graphics.graphics[v].symbol.style === "circle" && this.map.graphics.graphics[v].attributes.imageID === this.activeImageID) {
                            this.map.graphics.graphics[v].setSymbol(this.sourcePointSymbol);
                        }
                    }
                    this.activeImageID = image.imageID;
                },
                createCoverageArea: function (value) {
                    if (this.overviewLayer) {
                        if (value)
                            this.overviewLayer.show();
                        else
                            this.overviewLayer.hide();
                    } else {
                        for (var s = 0; s <= this.map.graphics.graphics.length - 1; s++) {
                            if (this.map.graphics.graphics[s].symbol && this.map.graphics.graphics[s].symbol.style === "solid" && this.map.graphics.graphics[s].attributes.coverageMap) {
                                this.map.graphics.remove(this.map.graphics.graphics[s]);
                                break;
                            }
                        }
                        if (value && this.selectOIC.get("value") !== "select" && this.oiApiLoaded) {
                            this.orientedViewer.getCoverageMap(this.map.extent, this.config.oic[Number(this.selectOIC.get("value"))].itemUrl).then(lang.hitch(this, function (response) {
                                if (response.coverageMap) {
                                    var graphic = new Graphic(new Polygon(response.coverageMap), this.coverageMapSymbol, {"coverageMap": true});
                                    this.map.graphics.add(graphic);
                                    this.map.graphics.graphics[this.map.graphics.graphics.length - 1].getDojoShape().moveToBack();
                                }
                            }));
                        }
                    }
                },
                getOICFromAgol: function () {
                    this.showLoading();
                    var portal = new arcgisPortal.Portal("http://www.arcgis.com");
                    portal.signIn().then(lang.hitch(this, function (loggedInUser) {
                        html.set(this.itemNotify, "Please wait! Connecting to ArcGIS Online...");
                        if (!this.userContentInfo || loggedInUser.id !== this.userContentInfo.userId) {
                            this.userContentInfo = {
                                userId: loggedInUser.id,
                                myFolders: {},
                                myGroups: {},
                                user: loggedInUser
                            };
                            var groupRequest = new esriRequest({
                                url: loggedInUser.url,
                                content: {
                                    f: "json"
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            });
                            groupRequest.then(lang.hitch(this, function (userGroups) {
                                for (var b = 0; b < userGroups.groups.length; b++) {
                                    this.userContentInfo.myGroups[userGroups.groups[b].title] = {id: userGroups.groups[b].id, items: []};
                                }
                                this.getOICFromFolders(loggedInUser);
                            }), lang.hitch(this, function () {
                                this.getOICFromFolders(loggedInUser);
                            }));
                        } else {
                            this.hideLoading();
                            html.set(this.itemNotify, "");
                        }
                    }));
                },
                getOICFromFolders: function (loggedInUser) {
                    var request = new esriRequest({
                        url: loggedInUser.userContentUrl,
                        content: {
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function (userContent) {
                        this.userContentInfo.myFolders[userContent.currentFolder || "default"] = {id: null, items: []};
                        for (var a = 0; a < userContent.items.length; a++) {
                            if (userContent.items[a].type === "Oriented Imagery Catalog") {
                                this.userContentInfo.myFolders[userContent.currentFolder || "default"].items.push({name: userContent.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + userContent.items[a].id});
                            }
                        }
                        for (var a in userContent.folders) {
                            this.userContentInfo.myFolders[userContent.folders[a].title] = {id: userContent.folders[a].id, items: []};
                        }
                        this.populateFolderGroupList(this.agolContentSelect.get("value"));
                        this.hideLoading();
                        html.set(this.itemNotify, "");
                    }), lang.hitch(this, function () {
                        this.populateFolderGroupList(this.agolContentSelect.get("value"));
                        this.hideLoading();
                        html.set(this.itemNotify, "");
                    }));
                },
                populateFolderGroupList: function (value) {
                    if (value === "content")
                        var items = this.userContentInfo.myFolders;
                    else
                        var items = this.userContentInfo.myGroups;
                    this.agolFolderList.removeOption(this.agolFolderList.getOptions());
                    this.agolFolderList.addOption({label: "Select", value: ""});
                    for (var a in items) {
                        this.agolFolderList.addOption({label: a, value: a});
                    }
                    this.agolOICList.removeOption(this.agolOICList.getOptions());
                    this.agolOICList.addOption({label: "Select", value: ""});
                    this.addOICBtn.set("disabled", true);
                },
                populateOICList: function (value) {
                    this.agolOICList.removeOption(this.agolOICList.getOptions());
                    this.agolOICList.addOption({label: "Select", value: ""});
                    this.addOICBtn.set("disabled", true);
                    if (value) {
                        if (this.agolContentSelect.get("value") === "content") {
                            if (this.userContentInfo.myFolders[value].items.length) {
                                for (var a in this.userContentInfo.myFolders[value].items) {
                                    this.agolOICList.addOption({label: this.userContentInfo.myFolders[value].items[a].name, value: this.userContentInfo.myFolders[value].items[a].url});
                                }
                            } else
                                this.getOICFromFolder(value);

                        } else {
                            if (this.userContentInfo.myGroups[value].items.length) {
                                for (var a in this.userContentInfo.myGroups[value].items) {
                                    this.agolOICList.addOption({label: this.userContentInfo.myGroups[value].items[a].name, value: this.userContentInfo.myGroups[value].items[a].url});
                                }
                            } else
                                this.getOICFromGroup(value);
                        }
                    }
                },
                getOICFromGroup: function (value) {
                    this.showLoading();
                    var id = this.userContentInfo.myGroups[value].id;
                    var request = new esriRequest({
                        url: "https://www.arcgis.com/sharing/rest/content/groups/" + id,
                        content: {
                            f: "json"
                        },
                        "handleAs": "json",
                        "callbackParamName": "callback"
                    });
                    request.then(lang.hitch(this, function (response) {
                        if (response.items) {
                            for (var a = 0; a < response.items.length; a++) {
                                if (response.items[a].type === "Oriented Imagery Catalog") {
                                    this.userContentInfo.myGroups[value].items.push({name: response.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + response.items[a].id});
                                }
                            }
                            for (var a in this.userContentInfo.myGroups[value].items) {
                                this.agolOICList.addOption({label: this.userContentInfo.myGroups[value].items[a].name, value: this.userContentInfo.myGroups[value].items[a].url});
                            }
                            this.hideLoading();
                        } else
                            this.hideLoading();
                    }), lang.hitch(this, function (error) {
                        this.hideLoading();
                    }));
                },
                getOICFromFolder: function (value) {
                    this.showLoading();
                    var id = this.userContentInfo.myFolders[value].id;
                    var request = new esriRequest({
                        url: this.userContentInfo.user.userContentUrl + "/" + id,
                        content: {
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function (response) {
                        if (response.items) {
                            for (var a = 0; a < response.items.length; a++) {
                                if (response.items[a].type === "Oriented Imagery Catalog") {
                                    this.userContentInfo.myFolders[value].items.push({name: response.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + response.items[a].id});
                                }
                            }
                            for (var a in this.userContentInfo.myFolders[value].items) {
                                this.agolOICList.addOption({label: this.userContentInfo.myFolders[value].items[a].name, value: this.userContentInfo.myFolders[value].items[a].url});
                            }
                            this.hideLoading();
                        } else
                            this.hideLoading();
                    }), lang.hitch(this, function (error) {
                        this.hideLoading();
                    }));
                },
                checkOIC: function (value) {
                    if (value)
                        this.addOICBtn.set("disabled", false);
                    else
                        this.addOICBtn.set("disabled", true);
                },
                addOICItem: function () {
                    var url = this.agolOICList.get("value");
                    if (url) {
                        var request = new esriRequest({
                            url: url + "/data",
                            content: {
                                f: "json"
                            },
                            handleAs: "json",
                            callbackParamName: "callback"
                        });
                        request.then(lang.hitch(this, function (oicInfo) {
                            if (oicInfo && oicInfo.properties) {
                                this.config.oic.push({
                                    title: oicInfo.properties.Name,
                                    serviceUrl: oicInfo.properties.ServiceURL,
                                    overviewUrl: oicInfo.properties.OverviewURL,
                                    itemUrl: oicInfo
                                });
                                this.selectOIC.addOption({label: oicInfo.properties.Name, value: "" + this.config.oic.length - 1 + ""});
                                this.addOICDialog.hide();
                                this.hideLoading();
                            } else {
                                this.errorNotification("Error! Invalid OIC.");
                            }
                        }), lang.hitch(this, function () {
                            this.errorNotification("Error! Request to OIC Item failed.");
                        }));
                    } else {
                        this.errorNotification("Error! Incorrect Item URL.");
                    }
                },
                errorNotification: function (text) {
                    this.oicJSON = null;
                    html.set(this.errorNotify, text);
                    domStyle.set(this.errorNotify, "display", "block");
                    setTimeout(lang.hitch(this, function () {
                        domStyle.set(this.errorNotify, "display", "none");
                    }), 5000);
                },
                layerModuleSelector: function (url) {
                    if (url.indexOf("FeatureServer") !== -1) {
                        return new FeatureLayer(url, {
                            visible: false
                        });
                    } else if (url.indexOf("ImageServer") !== -1) {
                        return new ArcGISImageServiceLayer(url, {
                            visible: false
                        });
                    } else if (url.indexOf("VectorTileServer") !== -1) {
                        return new VectorTileLayer(url, {
                            visible: false
                        });
                    } else if (url.toLowerCase().indexOf("wmts") !== -1) {
                        return new WMTSLayer(url, {
                            visible: false
                        });
                    } else if (url.toLowerCase().indexOf("wms") !== -1) {
                        return new WMSLayer(url, {
                            visible: false
                        });
                    } else if (url.indexOf("MapServer") !== -1) {
                        return new ArcGISTiledMapServiceLayer(url, {
                            visible: false
                        });
                    } else if (url.toLowerCase().indexOf(".kml") !== -1) {
                        return new KMLLayer("oi-tempKMLLayer", url, {
                            visible: false
                        });
                    } else {
                        return new VectorTileLayer(url, {
                            visible: false
                        });
                    }
                },
                onOpen: function () {
                    this.widgetOpen = true;
                },
                onClose: function () {
                    this.widgetOpen = false;
                },
                showLoading: function () {
                    domStyle.set(this.loadingNode, "display", "block");
                },
                hideLoading: function () {
                    domStyle.set(this.loadingNode, "display", "none");
                }
            });
            clazz.hasLocale = false;
            return clazz;
        });
