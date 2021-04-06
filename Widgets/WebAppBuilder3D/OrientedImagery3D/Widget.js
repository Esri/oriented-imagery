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
    "dojo/_base/lang", "dojo/Deferred", "esri/identity/OAuthInfo",
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
    "https://oi1.img.arcgis.com/api/v2.6/main.js",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
    "dijit/Dialog"

],
        function (
                declare,
                _WidgetsInTemplateMixin,
                template,
                BaseWidget,
                lang, Deferred, OAuthInfo,
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
                coverageFlag: {imagePoints: false, similarCoverage: false, currentCoverage: true, allCoverage: true},
                startup: function () {
                    this.inherited(arguments);
                },
                postCreate: function () {
                    this.graphicsLayer = new GraphicsLayer({
                        id: "oi-graphicsLayer",
                        title: "Oriented Imagery",
                        elevationInfo: {mode: "absolute-height", Offset: 0}
                    });

                    IdentityManager.useSignInPage = false;
                    this.oauthInfo = new OAuthInfo({
                        appId: "orientedimagery",
                        portalUrl: "https://www.arcgis.com",
                        popup: true
                    });
                    IdentityManager.registerOAuthInfos([this.oauthInfo]);

                    this.sceneView.map.add(this.graphicsLayer);
                    this.sceneView.environment.lighting.cameraTrackingEnabled = true;
                    this.sceneView.environment.lighting.directShadowsEnabled = true;
                    this.loadingNode = domConstruct.toDom('<img  style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + this.amdFolder + '/images/loader-ie9.gif">');
                    domConstruct.place(this.loadingNode, this.domNode);
                    this.hideLoading();


                    this.viewGraphicBtn.addEventListener("click", lang.hitch(this, this.openImageInViewer));



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

                    this.loadOrientedImageryApi();
                    this.setupSymbols();
//                this.setupResizeHandle();
                    this.geometryService = new GeometryService({url: "https://utility.arcgisonline.com/ArcGIS/rest/services/Geometry/GeometryServer"});



                    IdentityManager.on('credential-create', lang.hitch(this, function (user) {
                        this.preserveToken = {};
                        this.preserveToken.token = user.credential.token;
                        this.preserveToken.server = user.credential.server;

                    }));

                    this.listAllVectorLayers();

                    // this.dialog._onKey = function (evt) {
                    //     if (evt.key === "Escape" || evt.key === "Esc" || evt.keyCode === 27)
                    //         evt.preventDefault();
                    // };
                    this.sceneView.on("resize", lang.hitch(this, function () {
                        if (this.oiApiLoaded) {
                            this.orientedViewer.resizeImageInView({width: this.sceneView.width, height: this.sceneView.height, camera: this.sceneView.camera.clone()});
                        }
                    }));
                    this.selectLocationFlag = true;
                    this.sceneView.cursor = "crosshair";

                    //changes for issue 744
                    if (!this.sceneView.ui.find("oic-click-btn")) {
                        var node = document.createElement("div");
                        node.innerHTML = `<button title="` + this.nls.selectPointOn + `" class="oi-btn-css oi-btn-css-clear oi-widget-selectBtnSelected oi-btn-css-grouped oi-widget-selectBtn" style="width:32px;height:32px;border-color:transparent;padding:0px;margin-top:-40px;"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="" class="svg-icon"><path d="M15.999 0C11.214 0 8 1.805 8 6.5v17l7.999 8.5L24 23.5v-17C24 1.805 20.786 0 15.999 0zM16 14.402A4.4 4.4 0 0 1 11.601 10a4.4 4.4 0 1 1 8.798 0A4.4 4.4 0 0 1 16 14.402z"/></svg></button>`;
                        node.id = "oic-click-btn";


                        this.sceneView.ui.add(node, {
                            position: "manual",
                            index: 2
                        });
                        document.getElementsByClassName("oi-widget-selectBtn")[0].addEventListener("click", () => {
                            this.selectPointOnMap();
                        });
                    }

                    //issue #610
                    this.sceneView.map.layers.on("after-add", lang.hitch(this, function () {
                        this.sceneView.map.reorder(this.graphicsLayer, this.sceneView.map.layers.length - 1);
                    }));
                    this.addOIC();
                },

                selectPointOnMap: function () {
                    if (domClass.contains(document.getElementsByClassName("oi-widget-selectBtn")[0], "oi-widget-selectBtnSelected")) {
                        domClass.remove(document.getElementsByClassName("oi-widget-selectBtn")[0], "oi-widget-selectBtnSelected");
                        document.getElementsByClassName("oi-widget-selectBtn")[0].title = this.nls.selectPointOn;
                        this.selectLocationFlag = false;
                        this.sceneView.cursor = "default";
                    } else {
                        domClass.add(document.getElementsByClassName("oi-widget-selectBtn")[0], "oi-widget-selectBtnSelected");
                        document.getElementsByClassName("oi-widget-selectBtn")[0].title = this.nls.selectPointOff;
                        this.selectLocationFlag = true;
                        this.sceneView.cursor = "crosshair";
                    }
                },

                loadOrientedImageryApi: function () {
                    orientedImagery.on("load", lang.hitch(this, function (loaded) {
                        if (loaded) {
                            var panel = this.getPanel();
                            if (panel) {
                                domStyle.set(this.oiviewer, "width", domStyle.get(panel.containerNode, "width"));
                                domStyle.set(this.oiviewer, "height", domStyle.get(panel.containerNode, "height"));
                            }
                            this.orientedViewer = orientedImagery.viewer(this.oiviewer);
                            this.oiApiLoaded = true;
                            this.orientedViewer.setHeightModelInfo({"heightModel": this.sceneView.heightModelInfo.heightModel, "heightUnit": this.sceneView.heightModelInfo.heightUnit});  // #670 issue
                            this.orientedViewer.setEnvironment("3D");
                            this.orientedViewer.showCoverageTools(true);
                            this.orientedViewer.toggleTool({name: "CurrentCoverage", state: true});
                            this.orientedViewer.toggleTool({name: "AllCoverage", state: true});//707 issue fix

                            this.orientedViewer.on("imagePointsCheckbox", lang.hitch(this, function (bool) {
                                this.coverageFlag.imagePoints = bool;
                                this.turningOnOffFeatures('imagePoints', bool);
                            }));
                            this.orientedViewer.on("currentCoverageCheckbox", lang.hitch(this, function (bool) {
                                this.coverageFlag.currentCoverage = bool;
                                this.turningOnOffFeatures('currentCoverage', bool);
                            }));
                            this.orientedViewer.on("similarCoverageCheckbox", lang.hitch(this, function (bool) {
                                this.coverageFlag.similarCoverage = bool;
                                this.turningOnOffFeatures('similarCoverage', bool);
                            }));
                            this.orientedViewer.on("coverageMapCheckbox", lang.hitch(this, function (bool) {
                                this.coverageFlag.allCoverage = bool;
                                this.createCoverageArea(bool);
                            }));
                            this.orientedViewer.on("sceneView", lang.hitch(this, function (bool) {
                                this.sceneViewFlag = bool;
                                this.setViewMode(bool);
                            }));
                            this.orientedViewer.on("searchImages", lang.hitch(this, this.drawPointAndPolygons));
                            this.orientedViewer.on("showImage", lang.hitch(this, this.drawPointAndPolygons));  //#607 #614
                            this.orientedViewer.on("updateImage", lang.hitch(this, this.updateCoveragePolygon));
                            this.orientedViewer.on("changeImage", lang.hitch(this, this.updateGraphics));
                            this.orientedViewer.on("imageToGroundPoint", lang.hitch(this, function (pointJson) {
                                this.showPointOnMap(new Point(pointJson));
                            }));

                            this.orientedViewer.on("addImageInView", lang.hitch(this, this.addImageInView));
                            this.orientedViewer.on("updateImageInView", lang.hitch(this, this.updateImageInView));
                            this.orientedViewer.on("deleteImageInView", lang.hitch(this, this.deleteImageInView));
                            this.orientedViewer.on("updateViewCamera", lang.hitch(this, this.updateViewCamera));
                            this.orientedViewer.on("addFeature", lang.hitch(this, this.addFeature));
                            this.orientedViewer.on("deleteFeature", lang.hitch(this, this.deleteFeature));
                            this.orientedViewer.on("selectFeature", lang.hitch(this, this.selectFeature));
                            this.orientedViewer.on("toggleDistanceTool", lang.hitch(this, function (flag) {   //kushagra change
                                this.distanceSelector = flag;
                            }));
                        } else
                            this.oiApiLoaded = false;
                    }));
                },

                setupSymbols: function () {
                    this.activeSourcePointSymbol = {
                        type: "simple-marker",
                        size: 15,
                        style: "circle",
                        color: [255, 102, 102, 0.5],
                        outline: null
                    };
                    this.sourcePointSymbol = {
                        type: "simple-marker",
                        size: 10,
                        style: "circle",
                        color: [0, 128, 192, 0.5],
                        outline: null
                    };
                    this.diamondSymbol = {
                        type: "simple-marker",
                        size: 10,
                        style: "diamond",
                        color: [0, 255, 0],
                        outline: null
                    };
                    this.greenLineSymbol = {
                        type: "simple-line",
                        width: 1,
                        style: "short-dash",
                        color: [0, 255, 0]
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
                                    type: "solid",
                                    color: [255, 102, 102, 0]
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
                                    type: "solid",
                                    color: [0, 128, 192, 0]
                                }
                            }]
                    };
                },
                resize: function () {
                    domStyle.set(this.oiviewer, "width", "100%");
                    domStyle.set(this.oiviewer, "height", "100%");
                    this.orientedViewer.resize();
                    setTimeout(function () {
                        domStyle.set(this.oiwidget, "width", "auto");
                        domStyle.set(this.oiwidget, "height", "auto");
                    }, 300);
                },
                addOIC: function () {
                    if (this.overviewLayer) {
                        this.sceneView.map.remove(this.overviewLayer);
                        this.overviewLayer = null;
                    }
                    if (this.oiApiLoaded && this.orientedViewer)
                        this.orientedViewer.reset();
                    this.graphicExists = false;
                    this.graphicsLayer.graphics.removeAll();

                    var url = this.config.oic[0].serviceUrl;
                    if (url.indexOf("ImageServer") === -1) {
                        var query = new Query();
                        query.where = "1=1";
                        query.returnGeometry = false;
                        query.outSpatialReference = this.sceneView.extent ? this.sceneView.extent.spatialReference : this.sceneView.spatialReference;
                        var queryTask = new QueryTask({url: url});
                        queryTask.executeForExtent(query).then(lang.hitch(this, function (response) {
                            if (response.extent) {
                                this.graphicsLayer.fullExtent = response.extent;//#740 issue fixed
                                if ((!geometryEngine.intersects(this.sceneView.extent, response.extent) || geometryEngine.within(response.extent, this.sceneView.extent))) {
                                    this.sceneView.goTo(response.extent);
                                }
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
                                if (response.data.extent.spatialReference.wkid === this.sceneView.spatialReference.wkid && (!geometryEngine.intersects(this.sceneView.extent, new Extent(response.data.extent)) || geometryEngine.within(new Extent(response.data.extent), this.sceneView.extent))) {
                                    this.sceneView.goTo(new Extent(response.data.extent));
                                    this.graphicsLayer.fullExtent = new Extent(response.data.extent);//#740 issue fixed
                                } else {
                                    var params = new ProjectParameters();
                                    params.geometries = [new Extent(response.data.extent)];
                                    params.outSpatialReference = this.sceneView.spatialReference;
                                    this.geometryService.project(params).then(lang.hitch(this, function (geometry) {
                                        this.graphicsLayer.fullExtent = geometry[0];//#740 issue fixed
                                        if (!geometryEngine.intersects(this.sceneView.extent, geometry[0]) || geometryEngine.within(geometry[0], this.sceneView.extent))
                                            this.sceneView.goTo(geometry[0]);
                                    }));
                                }
                            }
                        }));
                    }

                    if (this.config.oic[0].overviewUrl) {
                        this.layerModuleSelector(this.config.oic[0].overviewUrl);
                    } else {  //issue #607
                        if (this.config.oic[0].serviceUrl.indexOf("ImageServer") === -1)
                            this.layerModuleSelector(this.config.oic[0].serviceUrl);
                    }
                },
                turningOnOffFeatures: function (selectedFeatures, state) {
                    switch (selectedFeatures) {
                        case 'imagePoints':
                        {
                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].symbol.style === "circle") {
                                    this.graphicsLayer.graphics.items[s].visible = state;
                                }
                            }
                            break;
                        }
                        case 'currentCoverage':
                        {

                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[s].attributes.imageID === this.activeImageID) {
                                    this.graphicsLayer.graphics.items[s].visible = state;
                                }
                            }
                            break;
                        }
                        case 'similarCoverage':
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
                    if (this.widgetOpen && this.config.oic.length) {
                        if (this.sceneViewFlag) {
                            if (this.selectLocationFlag && !this.imageInViewFlag) {
                                this.searchImages(evt.mapPoint);
                            }
                        } else {
                            this.sceneView.hitTest(evt.screenPoint).then(lang.hitch(this, function (response) {
                                if (response.results.length > 0) {
                                    var mapPoint = response.results[0].mapPoint;
                                } else {
                                    var mapPoint = evt.mapPoint;
                                }

                                if (this.distanceSelector && this.currentImageCameraLocation) {
                                    if (mapPoint.spatialReference.wkid === 102100 || mapPoint.spatialReference.wkid === 3857) {
                                        var factor = 1 / Math.cos((Math.PI / 2) - (2 * Math.atan(Math.exp((-1 * mapPoint.y) / 6378137))));
                                    } else {
                                        var factor = 1;
                                    }
                                    var height = this.currentImageCameraLocation.z - mapPoint.z;
                                    var base = Math.sqrt(Math.pow(this.currentImageCameraLocation.x - mapPoint.x, 2) + Math.pow(this.currentImageCameraLocation.y - mapPoint.y, 2)) / factor;
                                    var distance = Math.sqrt(Math.pow(base, 2) + Math.pow(height, 2));

                                    //var distance = point.distance(this.currentImageCameraLocation);
                                    this.orientedViewer.setDistance(distance);
                                } else if (evt.native.altKey) {
                                    this.hidePopup = true;
                                    //this.showPointOnMap(evt.mapPoint);
                                    this.groundToImage(mapPoint);
                                } else if (this.selectLocationFlag) {
                                    this.hidePopup = true;
                                    this.graphicExists = false;
                                    this.showLoading();

                                    if (response.results.length > 0) {
                                        if (response.results[0].graphic.attributes && !response.results[0].graphic.attributes.id && response.results[0].graphic.attributes.imageID) {
                                            this.selectedGraphicProperties = {imgUrn: null, geometry: response.results[0].graphic.geometry, id: response.results[0].graphic.attributes.imageID, highlight: null};
                                            this.searchImages(this.selectedPoint, parseInt(this.selectedGraphicProperties.id));
                                        }
                                        //#607 #614
                                        else if (response.results[0].graphic.attributes && response.results[0].graphic.attributes.OBJECTID && response.results[0].graphic.layer.url.includes('FeatureServer')) {
                                            this.showImage(evt.mapPoint, response.results[0].graphic.attributes.OBJECTID);
                                        } else {
                                            this.selectedPoint = mapPoint;   //#596
                                            this.searchImages(mapPoint);
                                        }
                                    } else {
                                        this.selectedPoint = mapPoint;   //#596
                                        this.searchImages(mapPoint);
                                    }
                                }
                            }));
                        }
                    }
                },

                ///#607 #614
                showImage: function (point, objectId) {
                    var url = this.config.oic[0].itemUrl;

                    if (this.oiApiLoaded) {
                        //point.z = 0;
                        this.queryElevation(point).then(lang.hitch(this, function (res) {
                            pointJSON = point.toJSON();
                            pointJSON.elevation = res.geometry.z;
                            this.avgGroundElevation = res.geometry.z;
                            if (this.sceneViewFlag) {
                                this.graphicsLayer.graphics.removeAll();
                                this.graphicsLayer.add(new Graphic({geometry: point, symbol: this.crossSymbol, attributes: {id: "oi-focusPoint"}}));
                                this.showLoading();
                                var location = this.currentImageCameraLocation ? this.currentImageCameraLocation.clone() : this.sceneView.camera.position.clone();
                                this.orientedViewer.showImage(pointJSON, url, {
                                    token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null}, maxDistance: 1000, extent: this.sceneView.extent.toJSON(), mapSize: {w: this.sceneView.width, h: this.sceneView.height},
                                    mapSize: {w: this.sceneView.width, h: this.sceneView.height},
                                    camera: {
                                        heading: this.sceneView.camera.heading,
                                        tilt: this.sceneView.camera.tilt,
                                        fov: this.sceneView.camera.fov,
                                        elevation: 0, //result.geometry.z,
                                        position: location
                                    },
                                    objectId: objectId || null
                                });


                                //}));
                            } else {
                                this.orientedViewer.showImage(pointJSON, url, {
                                    token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null}, maxDistance: 1000, camera: this.sceneView.camera, mapSize: {w: this.sceneView.width, h: this.sceneView.height}, extent: this.sceneView.extent.toJSON(), objectId: objectId || null});
                            }
                        }));
                    }
                },
                //////
                searchImages: function (point, objectId) {
                    var url = this.config.oic[0].itemUrl;
                    if (this.oiApiLoaded) {
                        this.queryElevation(point).then(lang.hitch(this, function (res) {
                            pointJSON = point.toJSON();
                            pointJSON.elevation = res.geometry.z;
                            this.avgGroundElevation = res.geometry.z;
                            if (this.sceneViewFlag) {
                                this.graphicsLayer.graphics.removeAll();
                                this.graphicsLayer.add(new Graphic({geometry: point, symbol: this.crossSymbol, attributes: {id: "oi-focusPoint"}}));
                                this.showLoading();

                                var location = this.currentImageCameraLocation ? this.currentImageCameraLocation.clone() : this.sceneView.camera.position.clone();

                                this.orientedViewer.searchImages(pointJSON, url, {
                                    token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null},
                                    maxDistance: 1000, extent: this.sceneView.extent.toJSON(), mapSize: {w: this.sceneView.width, h: this.sceneView.height},
                                    camera: {
                                        heading: this.sceneView.camera.heading,
                                        tilt: this.sceneView.camera.tilt,
                                        fov: this.sceneView.camera.fov,
                                        elevation: 0,
                                        position: location
                                    },
                                    objectId: objectId || null
                                });



                            } else {
                                this.orientedViewer.searchImages(pointJSON, url, {
                                    token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null},
                                    maxDistance: 1000, camera: this.sceneView.camera, mapSize: {w: this.sceneView.width, h: this.sceneView.height}, extent: this.sceneView.extent.toJSON(), objectId: objectId || null});
                            }
                        }));
                    }
                },
                drawPointAndPolygons: function (response) {
                    this.hideLoading();
                    this.graphicsLayer.graphics.removeAll();
                    if (!response.error) {
                        this.graphicExists = false;

                        var multiPoint = this.createMultiPoint({geometries: response.imageSourcePoints, type: "point"});
                        var multiPoint2 = this.createMultiPoint({geometries: response.coverageFrustums, type: "frustum"});
                        multiPoint = multiPoint.concat(multiPoint2);
                        multiPoint = new Multipoint({points: multiPoint, spatialReference: this.sceneView.spatialReference});
                        // this.queryElevation(multiPoint).then(lang.hitch(this, function (res) {
                        for (var cv = 0; cv < multiPoint.points.length; cv++) {
                            if (cv < response.imageSourcePoints.length) {
                                response.imageSourcePoints[cv].z += (this.avgGroundElevation || 0); //res.geometry.points[cv][2];

                            } else {
                                for (var fm = 0; fm < response.coverageFrustums.length; fm++) {
                                    if (response.coverageFrustums[fm]) {  //#625
                                        for (var dm = 2; dm < response.coverageFrustums[fm].vertexAttributes.position.length; dm = dm + 3) {
                                            response.coverageFrustums[fm].vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2];
                                            cv++;
                                        }
                                    }
                                }
                            }
                        }
                        this.graphicsLayer.add(new Graphic({geometry: new Point(response.point), symbol: this.crossSymbol, attributes: {id: "oi-focusPoint"}}));
                        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
                        this.drawFrustums(response.coverageFrustums, response.imageAttributes.imageID);
                        if (response.point.spatialReference.isWebMercator) {
                            this.WMSF = 1 / Math.cos((Math.PI / 2) - (2 * Math.atan(Math.exp((-1 * response.point.y) / 6378137))));
                        } else {
                            this.WMSF = 1;
                        }
                        this.imageProperties = response.imageAttributes;
                        this.selectedAsset = response.point;
                        this.setCameraView(this.imageProperties);
                        this.activeImageID = response.imageAttributes.imageID;
                        //}));

                    }
                },
                drawImageSourcePoints: function (points, imageID) {
                    for (var i = 0; i < points.length; i++) {
                        this.graphicsLayer.add(new Graphic({geometry: new Point(points[i]), symbol: (imageID === points[i].imageID ? this.activeSourcePointSymbol : this.sourcePointSymbol), attributes: {"imageID": points[i].imageID}}));
                        if (!this.coverageFlag.imagePoints)
                            this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = false;
                    }
                },
                drawFrustums: function (frustums, imageID) {
                    this.coverageFrustums = [];
                    for (var a = 0; a < frustums.length; a++) {
                        if (frustums[a]) {  //#625
                            this.coverageFrustums["p" + frustums[a].imageID] = frustums[a];
                            if (imageID === frustums[a].imageID) {
                                this.graphicsLayer.add(new Graphic({geometry: Mesh.fromJSON(frustums[a]), symbol: this.activeFrustumSymbol, attributes: {"imageID": frustums[a].imageID, id: "oi-polygons"}}));
                                this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = this.coverageFlag.currentCoverage;

                            } else {
                                this.graphicsLayer.add(new Graphic({geometry: Mesh.fromJSON(frustums[a]), symbol: this.frustumSymbol, attributes: {"imageID": frustums[a].imageID, id: "oi-polygons"}}));
                                this.graphicsLayer.graphics.items[this.graphicsLayer.graphics.items.length - 1].visible = this.coverageFlag.similarCoverage;
                            }
                        }

                    }
                },
                showPointOnMap: function (geometry) {
                    if (!geometry.z) {
                        geometry.z = 0;
                    }
                    if (!this.graphicExists) {
                        this.graphicsLayer.add(new Graphic({geometry: geometry, symbol: this.diamondSymbol}));
                        for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                            if (this.graphicsLayer.graphics.items[v].symbol.style === "circle" && this.graphicsLayer.graphics.items[v].attributes.imageID === this.activeImageID) {
                                var g = this.graphicsLayer.graphics.items[v].geometry.clone();
                                this.graphicsLayer.add(new Graphic({geometry: new Polyline({paths: [[geometry.x, geometry.y, geometry.z], [g.x, g.y, g.z]], spatialReference: geometry.spatialReference.toJSON()}), symbol: this.greenLineSymbol}));
                                break;
                            }
                        }
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
                        for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                            if (this.graphicsLayer.graphics.items[v].symbol.type === "simple-line") {
                                var graphic = this.graphicsLayer.graphics.items[v].clone();
                                graphic.geometry.paths[0][0] = [geometry.x, geometry.y, geometry.z];
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                                this.graphicsLayer.add(graphic);
                                break;
                            }

                        }
                    }
                },
                groundToImage: function (point) {
                    if (this.oiApiLoaded) {
                        var pJSON = point.toJSON();
                        this.showPointOnMap(new Point(pJSON));
                        this.orientedViewer.displayGroundPointInImage(pJSON);
                    }
                },
                updateCoveragePolygon: function (imageProperties) {
                    if (imageProperties.coverageFrustum.vertexAttributes) {
                        var multiPoint = new Multipoint({points: this.createMultiPoint({type: "frustum", geometries: [imageProperties.coverageFrustum]}), spatialReference: this.sceneView.spatialReference});
                        //this.queryElevation(multiPoint).then(lang.hitch(this, function (result) {
                        var cb = 0;
                        for (var bm = 2; bm < imageProperties.coverageFrustum.vertexAttributes.position.length; bm = bm + 3) {
                            imageProperties.coverageFrustum.vertexAttributes.position[bm] += (this.avgGroundElevation || 0);//result.geometry.points[cb][2];
                            cb++;
                        }
                        for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                            if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === imageProperties.imageID) {
                                var graphic = this.graphicsLayer.graphics.items[v].clone();
                                graphic.geometry = Mesh.fromJSON(imageProperties.coverageFrustum);
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                                this.graphicsLayer.add(graphic);
                                break;
                            }
                        }
                        // }));
                    }

                },
                updateGraphics: function (image) {
                    this.imageProperties = image;
                    this.setCameraView(this.imageProperties);
                    for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                        if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === image.imageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.activeFrustumSymbol;
                            graphic.visible = this.coverageFlag.currentCoverage;//this.currentCoverage.checked;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        } else if (this.graphicsLayer.graphics.items[v].attributes && this.graphicsLayer.graphics.items[v].attributes.id === "oi-polygons" && this.graphicsLayer.graphics.items[v].attributes.imageID === this.activeImageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.symbol = this.frustumSymbol;
                            graphic.geometry = Mesh.fromJSON(this.coverageFrustums["p" + this.activeImageID]);
                            graphic.visible = this.coverageFlag.similarCoverage;//this.similarCoverage.checked;
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                        } else if (this.graphicsLayer.graphics.items[v].symbol.style === "circle" && this.graphicsLayer.graphics.items[v].attributes.imageID === image.imageID) {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            var currentGeometry = graphic.geometry.clone();
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
                    for (var v = this.graphicsLayer.graphics.items.length - 1; v >= 0; v--) {
                        if (this.graphicsLayer.graphics.items[v].symbol.type === "simple-line") {
                            var graphic = this.graphicsLayer.graphics.items[v].clone();
                            graphic.geometry.paths[0][1] = [currentGeometry.x, currentGeometry.y, currentGeometry.z];
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[v]);
                            this.graphicsLayer.add(graphic);
                            break;
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
                        if (value && this.config.oic.length && this.oiApiLoaded) {
                            this.orientedViewer.getCoverageMap(this.sceneView.extent.toJSON(), this.config.oic[0].itemUrl).then(lang.hitch(this, function (response) {
                                if (response.coverageMap) {
                                    var multiPoint = new Multipoint({spatialReference: this.sceneView.spatialReference, points: this.createMultiPoint({type: "polygon", geometries: [response.coverageMap]})});
                                    this.queryElevation(multiPoint).then(lang.hitch(this, function (result) {
                                        var cv = 0;
                                        for (var gm = 0; gm < response.coverageMap.rings.length; gm++) {
                                            for (var mb = 0; mb < response.coverageMap.rings[gm].length; mb++)
                                                response.coverageMap.rings[gm][mb][2] = result.geometry.points[cv][2];
                                            cv++;
                                        }

                                        var graphic = new Graphic({geometry: new Polygon(response.coverageMap), symbol: this.coverageMapSymbol, attributes: {"coverageMap": true}});
                                        this.graphicsLayer.add(graphic);
                                    }));
                                }
                            }));
                        }
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
                onOpen: function () {
                    this.widgetOpen = true;
//                if (this.dialog && this.config.oic.length) {
//                    this.dialog.set("title", this.dialog.title + " - " + this.config.oic[0].title);
//                }
                    if (this.selectLocationFlag) {
                        setTimeout(lang.hitch(this, function () {
                            this.sceneView.cursor = "crosshair";
                        }), 1000);
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
                            this.overviewLayer.minScale = Math.max(50000, this.config.oic[0].itemUrl && this.config.oic[0].itemUrl.properties ? 300 * Number(this.config.oic[0].itemUrl.properties.MaxDistance) : 50000);  //issue 619
                            this.sceneView.map.add(this.overviewLayer);
                            this.createCoverageArea(this.coverageFlag.allCoverage); //issue 613
                        }));
                    })).catch(lang.hitch(this, function () {
                        if (url.toLowerCase().indexOf("wmts") !== -1) {
                            this.overviewLayer = new WMTSLayer({
                                url: url,
                                visible: false,
                                minScale: Math.max(50000, this.config.oic[0].itemUrl && this.config.oic[0].itemUrl.properties ? 300 * Number(this.config.oic[0].itemUrl.properties.MaxDistance) : 50000)  //issue 619
                            });
                        } else if (url.toLowerCase().indexOf("wms") !== -1) {
                            this.overviewLayer = new WMSLayer({
                                url: url,
                                visible: false,
                                minScale: Math.max(50000, this.config.oic[0].itemUrl && this.config.oic[0].itemUrl.properties ? 300 * Number(this.config.oic[0].itemUrl.properties.MaxDistance) : 50000)  //issue 619
                            });
                        } else if (url.toLowerCase().indexOf(".kml") !== -1) {
                            this.overviewLayer = new KMLLayer({
                                url: url,
                                visible: false,
                                minScale: Math.max(50000, this.config.oic[0].itemUrl && this.config.oic[0].itemUrl.properties ? 300 * Number(this.config.oic[0].itemUrl.properties.MaxDistance) : 50000)  //issue 619
                            });
                        }
                        if (this.overViewLayer)
                            this.sceneView.map.add(this.overviewLayer);
                        this.createCoverageArea(this.coverageFlag.allCoverage); //issue 613
                    }));

                },
                setViewMode: function (value) {
                    this.graphicsLayer.graphics.removeAll();
                    if (!value) {
                        if (this.imageInViewFlag) {
                            this.deleteImageInView();
                        }
                        domStyle.set(this["2DModePane"], "display", "block");
                    } else {
                        domStyle.set(this["2DModePane"], "display", "none");

                    }
                },
                deleteImageInView: function () {
                    this.imageInViewFlag = false;
                    this.graphicsLayer.graphics.removeAll();
                    this.changeLayersVisibility(true);
                    this.setViewConstraints({
                        rotate: true
                    });
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
                            this.zoomImageInView(-1, evt.x, evt.y);
                        else
                            this.zoomImageInView(1, evt.x, evt.y);

                    })));
                    this.zoomHandlers.push(this.sceneView.on("double-click", stopEvtPropagation));

                    this.zoomHandlers.push(this.sceneView.on("double-click", ["Control"], stopEvtPropagation));

                    this.zoomHandlers.push(this.sceneView.on("drag", lang.hitch(this, function (evt) {
                        evt.stopPropagation();
                        this.panImageInView(evt);
                    })));

                    this.zoomHandlers.push(this.sceneView.on("drag", ["Shift"], stopEvtPropagation));
                    this.zoomHandlers.push(this.sceneView.on("drag", ["Shift", "Control"], stopEvtPropagation));
                    this.zoomHandlers.push(this.sceneView.on("key-down", lang.hitch(this, function (event) {
                        var prohibitedKeys = ["+", "-", "Shift", "_", "="];
                        var keyPressed = event.key;
                        if (prohibitedKeys.indexOf(keyPressed) !== -1) {
                            event.stopPropagation();
                            if (keyPressed === "+")
                                this.zoomImageInView(-1, this.sceneView.width / 2, this.sceneView.height / 2);
                            else if (keyPressed === "-")
                                this.zoomImageInView(1, this.sceneView.width / 2, this.sceneView.height / 2);
                        }
                        if (keyPressed.slice(0, 5) === "Arrow") {
                            event.stopPropagation();
                            this.panImageInView({action: "start", x: this.sceneView.width / 2, y: this.sceneView.height / 2});
                            if (keyPressed === "ArrowLeft")
                                this.panImageInView({action: "end", x: this.sceneView.width / 2 + 10, y: this.sceneView.height / 2});
                            else if (keyPressed === "ArrowRight")
                                this.panImageInView({action: "end", x: this.sceneView.width / 2 - 10, y: this.sceneView.height / 2});
                            else if (keyPressed === "ArrowUp")
                                this.panImageInView({action: "end", x: this.sceneView.width / 2, y: this.sceneView.height / 2 + 10});
                            else if (keyPressed === "ArrowDown")
                                this.panImageInView({action: "end", x: this.sceneView.width / 2, y: this.sceneView.height / 2 - 10});
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
                    // if (!flag) {
                    //     this.layerVisibleStatus = { g: [], b: [], o: [] };
                    // }
                    // var gLayer = this.sceneView.map.ground.layers.items;
                    // var bLayer = this.sceneView.map.basemap.baseLayers.items;
                    // if (flag) {
                    //     this.sceneView.map.ground.opacity = 1;//this.layerVisibleStatus.g[0];
                    //     if (this.layerVisibleStatus) {
                    //         for (var a = 0; a < bLayer.length; a++) {
                    //             bLayer[a].visible = this.layerVisibleStatus.b[a];
                    //         }
                    //     }

                    // } else {
                    //     this.sceneView.map.ground.opacity = 0;
                    //     for (var a = 0; a < bLayer.length; a++) {
                    //         this.layerVisibleStatus.b.push(bLayer[a].visible);
                    //         bLayer[a].visible = flag;
                    //     }
                    // }
                    // var oLayer = this.sceneView.map.layers.items;

                    // for (var a = 0; a < oLayer.length; a++) {
                    //     if (oLayer[a].id !== "oi-graphicsLayer" && oLayer[a].type !== "feature") {
                    //         if (flag)
                    //             oLayer[a].visible = this.layerVisibleStatus.o[a];
                    //         else {
                    //             this.layerVisibleStatus.o.push(oLayer[a].visible);
                    //             oLayer[a].visible = flag;
                    //         }
                    //     }
                    // }
                },
                addImageInView: function (response) {
                    for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                        if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-imageMesh") {
                            this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                            break;
                        }
                    }
                    if (response.image) {
                        this.imageProperties = response.properties;
                        this.setViewConstraints({
                            rotate: false
                        });
                        var multipoint = this.createMultiPoint({type: "point", geometries: response.imageSourcePoints});
                        var multipoint2 = this.createMultiPoint({type: "frustum", geometries: response.coverageFrustums});
                        multipoint = multipoint.concat(multipoint2);
                        if (response.image.elevation === "relative-to-ground") {
                            var multipoint3 = this.createMultiPoint({type: "frustum", geometries: [response.image.mesh]});
                            multipoint = multipoint.concat(multipoint3);
                        }
                        var image = response.image.mesh.clone();
                        // this.queryElevation(new Multipoint({points:multipoint, spatialReference: this.sceneView.spatialReference})).then(lang.hitch(this, function (res) {
                        for (var cv = 0; cv < multipoint.length; cv++) {
                            if (cv < response.imageSourcePoints.length) {
                                response.imageSourcePoints[cv].z += (this.avgGroundElevation || 0);//res.geometry.points[cv][2];
                            } else {
                                for (var fm = 0; fm < response.coverageFrustums.length; fm++) {
                                    for (var dm = 2; dm < response.coverageFrustums[fm].vertexAttributes.position.length; dm = dm + 3) {
                                        response.coverageFrustums[fm].vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2];
                                        cv++;
                                    }
                                }
                                if (response.image.elevation === "relative-to-ground") {
                                    for (var dm = 2; dm < image.vertexAttributes.position.length; dm = dm + 3) {
                                        image.vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2];
                                        cv++;
                                    }
                                }

                            }
                        }
                        this.imageInViewFlag = true;
                        var graphic = new Graphic({geometry: image, symbol: {type: "mesh-3d", symbolLayers: [{type: "fill"}]}, attributes: {"id": "oi-imageMesh"}});
                        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
                        this.activeImageID = response.imageAttributes.imageID;

                        if (response.image.elevation === "relative-to-ground") {
                            var point = new Point({x: response.properties.location.x, y: response.properties.location.y, spatialReference: new SpatialReference(response.properties.location.spatialReference)});
                            this.queryElevation(point).then(lang.hitch(this, function (result) {
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
                                camera.heading = cam.heading; //camheading error fix
                                this.sceneView.camera = camera;
                                this.sceneView.goTo(cam).then(lang.hitch(this, function () {
                                    this.changeLayersVisibility(false);
                                    this.graphicsLayer.add(graphic);

                                }));
                            }));
                        } else {
                            var cam = new Camera({
                                fov: response.properties.fov,
                                heading: response.properties.yaw,
                                tilt: response.properties.pitch,
                                position: response.properties.location
                            });
                            var camera = this.sceneView.camera.clone();
                            camera.fov = cam.fov;
                            camera.heading = cam.heading;
                            this.sceneView.camera = camera;
                            this.sceneView.goTo(cam).then(lang.hitch(this, function () {
                                this.changeLayersVisibility(false);
                                this.graphicsLayer.add(graphic);

                            }));
                        }


                        // }));

                    } else {
                        // if (response.error)
                        //     html.set(this.notifyUser, response.error);
                        // else
                        //     html.set(this.notifyUser, response.error);
                    }
                    this.hideLoading();
                },
                updateImageInView: function (response) {
                    var image = response.image.mesh.clone();
                    if (response.image.elevation === "relative-to-ground") {
                        var multipoint = this.createMultiPoint({type: "frustum", geometries: [response.image.mesh]});
                        this.queryElevation(new Multipoint({points: multipoint, spatialReference: this.sceneView.spatialReference})).then(lang.hitch(this, function (res) {
                            var cv = 0;
                            for (var dm = 2; dm < image.vertexAttributes.position.length; dm = dm + 3) {
                                image.vertexAttributes.position[dm] += res.geometry.points[cv][2];
                                cv++;
                            }

                            for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                                if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-imageMesh") {
                                    this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                                    break;
                                }
                            }
                            var graphic = new Graphic({geometry: image, symbol: {type: "mesh-3d", symbolLayers: [{type: "fill"}]}, attributes: {"id": "oi-imageMesh"}});
                            this.graphicsLayer.add(graphic);
                        }));
                    } else {
                        for (var s = this.graphicsLayer.graphics.items.length - 1; s >= 0; s--) {
                            if (this.graphicsLayer.graphics.items[s].attributes && this.graphicsLayer.graphics.items[s].attributes.id === "oi-imageMesh") {
                                this.graphicsLayer.remove(this.graphicsLayer.graphics.items[s]);
                                break;
                            }
                        }
                        var graphic = new Graphic({geometry: image, symbol: {type: "mesh-3d", symbolLayers: [{type: "fill"}]}, attributes: {"id": "oi-imageMesh"}});
                        this.graphicsLayer.add(graphic);
                    }


                },
                setCameraView: function (att) {
                    var def = new Deferred();
                    if (att) {
                        var point = new Point({x: att.location.x, y: att.location.y, spatialReference: new SpatialReference(att.location.spatialReference)});
                        this.queryElevation(point).then(lang.hitch(this, function (result) {
                            this.imageProperties.alt = result.geometry.z;
                            result.geometry.z += att.location.z;
                            var distAssetToSceneCamera = Math.sqrt(Math.pow(this.selectedAsset.z - this.sceneView.camera.position.z, 2) + Math.pow(Math.sqrt(Math.pow(this.selectedAsset.x - this.sceneView.camera.position.x, 2) + Math.pow(this.selectedAsset.y - this.sceneView.camera.position.y, 2)) / this.WMSF, 2)) * this.WMSF;
                            var distAssetToExposurePoint = Math.sqrt(Math.pow(this.selectedAsset.z - result.geometry.z, 2) + Math.pow(Math.sqrt(Math.pow(this.selectedAsset.x - result.geometry.x, 2) + Math.pow(this.selectedAsset.y - result.geometry.y, 2)) / this.WMSF, 2)) * this.WMSF;
                            if (att.fov > this.sceneView.camera.fov) { //828 issue fix
                                distAssetToSceneCamera /= Math.pow(2, Math.abs(Math.round(Math.log(att.fov / this.sceneView.camera.fov) / Math.log(2))));
                            }
                            if (distAssetToExposurePoint - distAssetToSceneCamera > 0) {
                                var pt = result.geometry;
                                var fov = att.fov;
                                var fraction = distAssetToSceneCamera / distAssetToExposurePoint;
                                for (var b = 0; b < 15; b++) {
                                    z1 = 1 / Math.pow(2, b);
                                    z2 = 1 / Math.pow(2, b + 1);
                                    if (fraction <= z1 && fraction > z2) {
                                        if (Math.abs(fraction - z1) < Math.abs(fraction - z2)) {
                                            fov *= z1;
                                        } else {
                                            fov *= z2;
                                        }
                                        break;
                                    }
                                } //828 issue fix
                            } else {
                                var pt = result.geometry;
                                var fov = att.fov;
                            }
                            var cam = new Camera({
                                fov: fov,
                                heading: att.yaw,
                                tilt: att.pitch,
                                position: pt
                            });
                            this.currentImageCameraLocation = result.geometry.clone();
                            var camera = this.sceneView.camera.clone();
                            camera.fov = cam.fov;
                            camera.heading = cam.heading;
                            this.sceneView.camera = camera;
                            this.sceneView.goTo(cam).then(lang.hitch(this, function () {
                                return def.resolve();
                            }));
                        }));
                    }
                    return def.promise;
                },
                zoomImageInView: function (scaleFactor, x, y) {
                    var camera = this.sceneView.camera.clone();
                    this.orientedViewer.zoomImageInView({
                        width: this.sceneView.width,
                        height: this.sceneView.height,
                        x: x, y: y, fov: camera.fov,
                        heading: camera.heading,
                        tilt: camera.tilt,
                        elevation: this.imageProperties.alt,
                        position: camera.position,
                        delta: scaleFactor
                    });
                },
                panImageInView: function (evt) {
                    //evt.stopPropagation();
                    var camera = this.sceneView.camera.clone();
                    this.orientedViewer.panImageInView({
                        width: this.sceneView.width,
                        height: this.sceneView.height,
                        elevation: this.imageProperties.alt,
                        heading: camera.heading,
                        tilt: camera.tilt,
                        action: evt.action,
                        x: evt.x, y: evt.y,
                        fov: camera.fov,
                        position: camera.position
                    });
                },
                updateViewCamera: function (cameraProperties) {
                    var camera = this.sceneView.camera.clone();
                    camera.heading = cameraProperties.heading;
                    camera.tilt = cameraProperties.tilt;
                    camera.fov = cameraProperties.fov;
                    if (cameraProperties.elevation === "relative-to-ground") {
                        cameraProperties.location.z += this.imageProperties.alt;
                    }
                    camera.position = cameraProperties.location;
                    this.sceneView.camera = camera;
                },
                listAllVectorLayers: function () {
                    var layers = this.sceneView.map.layers.items;
                    var count = layers.length;
                    this.vectorLayers = {};
                    for (var a = 0; a < layers.length; a++) {
                        this.sceneView.whenLayerView(layers[a]).then(lang.hitch(this, function (layerView) {
                            count--;
                            if (layerView.layer.type === "feature") {
                                this.vectorLayers[layerView.layer.id] = {
                                    id: layerView.layer.id,
                                    title: layerView.layer.title,
                                    url: layerView.layer.url + "/" + layerView.layer.layerId,
                                    editable: layerView.layer.editingEnabled && layerView.layer.capabilities && layerView.layer.capabilities.operations.supportsEditing,
                                    renderer: layerView.layer.renderer,
                                    geometryType: layerView.layer.geometryType,
                                    fields: layerView.layer.fields
                                };
                            }
                            if (count === 0 || count < 0) {
                                this.addVectorLayersToViewer();
                            }
                        })).catch(lang.hitch(this, function () {
                            count--;
                        }));
                    }

                },
                addFeature: function (json) {
                    for (var b in this.vectorLayers) {
                        if (this.vectorLayers[b].title === json.layer) {
                            if (this.vectorLayers[b].renderer.type === "unique-value" && this.vectorLayers[b].renderer.field)
                                var uniqueValueField = this.vectorLayers[b].renderer.field; //#794
                            else
                                var uniqueValueField = null;
                            var layer = this.sceneView.map.findLayerById(b);
                            break;
                        }
                    }
                    var attributes = json.attributes ? json.attributes : {};
                    attributes["ImgGeom"] = JSON.stringify(attributes["ImgGeom"]);
                    if (!layer.hasZ) {
                        if (layer.geometryType === "point")
                            json.geometry.z = null;
                        else if (layer.geometryType === "polyline") {
                            //#757 issue fixed
                            for (var cv = 0; cv <= json.geometry.paths.length - 1; cv++) {
                                for (var bn = 0; bn <= json.geometry.paths[cv].length - 1; bn++) {
                                    json.geometry.paths[cv][bn] = json.geometry.paths[cv][bn].splice(0, 2);
                                }
                            }
                        } else if (layer.geometryType === "polygon") {
                            for (var cv = 0; cv <= json.geometry.rings.length - 1; cv++) {
                                for (var bn = 0; bn <= json.geometry.rings[cv].length - 1; bn++) {
                                    json.geometry.rings[cv][bn] = json.geometry.rings[cv][bn].splice(0, 2);
                                }
                            }
                        }
                        //
                    }
                    var graphic = new Graphic({
                        geometry: layer.geometryType === "point" ? new Point(json.geometry) : layer.geometryType === "polyline" ? new Polyline(json.geometry) : new Polygon(json.geometry),
                        attributes: attributes
                    });

                    var param = {addFeatures: [graphic]};
                    layer.applyEdits(param).then(lang.hitch(this, function (result) {
                        if (result.addFeatureResults.length) {
                            this.showAttributeWindow(layer, graphic, result.addFeatureResults[0].objectId, uniqueValueField);
                            this.orientedViewer.applyEdits({layer: json.layer, success: true, objectId: result.addFeatureResults[0].objectId, mode: "add"});
                        } else
                            this.orientedViewer.applyEdits({layer: json.layer, success: false, error: "Failed", mode: "add"});
                    })).catch(lang.hitch(this, function (error) {
                        this.orientedViewer.applyEdits({layer: json.layer, success: false, error: error.message, mode: "add"});
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
                                        graphics.push(new Graphic({
                                            attributes: results.features[a].attributes,
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
                            if (this.featureSelected) {
                                this.orientedViewer.deselectFeaturesInImage(this.featureSelected);
                            }
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
                            if (imgUrnExists && this.config.oic.length) {
                                for (var a in this.vectorLayerAdded) {
                                    if (this.vectorLayerAdded[a].indexOf(graphic.layer.url) !== -1) {
                                        if (graphic.attributes.hasOwnProperty("ImgUrn")) {
                                            this.findImageInCatalog(graphic.attributes.ImgUrn, graphic, this.config.oic[0].serviceUrl, temp);
                                        } else {
                                            var objectId = graphic.attributes[graphic.layer.objectIdField];
                                            var query = new Query();
                                            query.where = graphic.layer.objectIdField + "=" + objectId;
                                            query.outFields = ["ImgUrn"];
                                            query.returnGeometry = false;
                                            graphic.layer.queryFeatures(query).then(lang.hitch(this, function (response) {
                                                if (response.features.length) {
                                                    this.findImageInCatalog(response.features[0].attributes.ImgUrn, graphic, this.config.oic[0].serviceUrl, temp);
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
                        var url = this.config.oic[0].itemUrl;
                        if (this.selectedGraphicProperties.geometry.type === "point")
                            var point = this.selectedGraphicProperties.geometry;
                        else if (this.selectedGraphicProperties.geometry.type === "polygon")
                            var point = this.selectedGraphicProperties.geometry.centroid;
                        else
                            var point = this.selectedGraphicProperties.geometry.extent.center;
                        point.z = 0;
                        this.selectedPoint = point.toJSON();   //#596
                        domStyle.set(this.viewGraphicBtn, "display", "none");

                        this.orientedViewer.searchImages(point.toJSON(), url, {
                            token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null},
                            maxDistance: 1000, mapSize: {w: this.sceneView.width, h: this.sceneView.height}, objectId: parseInt(this.selectedGraphicProperties.id), extent: this.sceneView.extent.toJSON(), camera: this.sceneView.camera
                        });
                        this.orientedViewer.toggleEditTool({layer: this.selectedGraphicProperties.graphicLayer, tool: "display", state: true});
                        this.orientedViewer.selectFeaturesInImage(this.selectedGraphicProperties.highlight);
                    }
                },

                showAttributeWindow: function (layer, graphic, objectId, uniqueValueField) {
                    var editingNode = domConstruct.toDom("<div id='formDiv'></div>");
                    //editable field change
                    var fieldInfos = [];
                    for (var i = 0; i < layer.fields.length; i++) {
                        if (layer.fields[i].editable === true) {
                            if (layer.fields[i].name !== 'ImgUrn' && layer.fields[i].name !== 'ImgGeom' && layer.fields[i].name !== uniqueValueField) {
                                fieldInfos.push({name: layer.fields[i].name, label: layer.fields[i].name, editable: true});
                            }
                        }
                    }
                    var featureForm = new FeatureForm({
                        container: editingNode,
                        layer: layer,
                        feature: graphic,
                        fieldConfig: fieldInfos
                    });
                    //editable field change
                    setTimeout(lang.hitch(this, function () {   //#652
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
                        if (fieldInfos.length > 0) {
                            this.sceneView.popup.open({location: graphic.geometry, content: editingNode});
                        }
                    }), 500);

                },
                addVectorLayersToViewer: function () {
                    for (var z in this.vectorLayers) {
                        var vectorLayerProp = this.vectorLayers[z];
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
                                //                            var labelDrawingMode = false;
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
                                //                            var labelDrawingMode = false;
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
                },
                queryElevation: function (geometry) {
                    var def = new Deferred();
                    if (this.sceneView.map.ground.layers.length) {
                        this.sceneView.map.ground.queryElevation(geometry).then(lang.hitch(this, function (result) {
                            return def.resolve(result);
                        }));
                    } else {
                        var geomClone = geometry.clone();
                        if (geomClone.type === "point")
                            geomClone.z = 0;
                        else {
                            for (var a = 0; a < geomClone.points.length; a++) {
                                geomClone.points[a][2] = 0;
                            }
                        }
                        return def.resolve({geometry: geomClone});
                    }

                    return def.promise;
                },

                createMultiPoint: function (gJSON) {
                    var points = [];
                    if (gJSON.type === "point") {
                        for (var nm in gJSON.geometries) {
                            if (gJSON.geometries[nm]) {  //#625
                                points.push([gJSON.geometries[nm].x, gJSON.geometries[nm].y]);
                            }
                        }
                        return points;
                    } else if (gJSON.type === "frustum") {
                        for (var nm in gJSON.geometries) {
                            if (gJSON.geometries[nm]) {  //#625
                                for (var gm = 0; gm < gJSON.geometries[nm].vertexAttributes.position.length; gm = gm + 3) {
                                    points.push([gJSON.geometries[nm].vertexAttributes.position[gm], gJSON.geometries[nm].vertexAttributes.position[gm + 1]]);
                                }
                            }
                        }
                        return points;
                    } else if (gJSON.type === "polygon") {
                        for (var nm in gJSON.geometries) {
                            if (gJSON.geometries[nm]) {  //#625
                                for (var gm = 0; gm < gJSON.geometries[nm].rings.length; gm++) {
                                    for (var mb = 0; mb < gJSON.geometries[nm].rings[gm].length; mb++)
                                        points.push([gJSON.geometries[nm].rings[gm][mb][0], gJSON.geometries[nm].rings[gm][mb][1]]);
                                }
                            }
                        }
                        return points;
                    }
                }
            });
            clazz.hasLocale = false;
            return clazz;
        });