/**
  Licensing

  Copyright 2020 Esri

  Licensed under the Apache License, Version 2.0 (the "License"); You
  may not use this file except in compliance with the License. You may
  obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
  implied. See the License for the specific language governing
  permissions and limitations under the License.

  A copy of the license is available in the repository's
  LICENSE file.
*/
/** @jsx jsx */
import { jsx, BaseWidget, AllWidgetProps, ReactResizeDetector } from 'jimu-core';
import { JimuMapViewComponent, JimuMapView } from 'jimu-arcgis';
import { Button, Select, Option, Icon, Checkbox, Switch, Tooltip, Resizable } from 'jimu-ui';
import defaultMessages from './translations/default';
import esriRequest = require('esri/request');
import Point = require('esri/geometry/Point');
import GraphicsLayer = require('esri/layers/GraphicsLayer');
import Graphic = require('esri/Graphic');
import { Polygon, Extent, Multipoint, SpatialReference, Polyline } from 'esri/geometry';
import { ChangeEvent } from 'react';
import Layer = require('esri/layers/Layer');
import WMTSLayer = require('esri/layers/WMTSLayer');
import WMSLayer = require('esri/layers/WMSLayer');
import KMLLayer = require('esri/layers/KMLLayer');
import Query = require('esri/tasks/support/Query');
import QueryTask = require('esri/tasks/QueryTask');
import ProjectParameters = require('esri/tasks/support/ProjectParameters');
import geometryEngine = require('esri/geometry/geometryEngine');
import FeatureForm = require('esri/widgets/FeatureForm');
import Camera = require('esri/Camera');
import promiseUtils = require('esri/core/promiseUtils');
import Mesh = require("esri/geometry/Mesh");
import './assets/calcite.css';
import './assets/style.css';

interface State {
  toggleButtonTooltip: string,
  toggleButtonColor: string,
  toggleIconColor: string,
  selectedOIC: string,
  currentCoverageOn: boolean,
  currentCoverageDisabled: boolean,
  similarCoverageDisabled: boolean,
  imagePointsDisabled: boolean,
  sceneModePaneView: string
}


export default class Widget extends BaseWidget<AllWidgetProps<{}>, State>{
  //state: State = { extent: null };
  mapView: any;
  orientedViewer: any;
  oiApiLoaded: boolean;
  distanceSelector: any;
  activeSourcePointSymbol: { type: string; size: number; style: string; color: number[]; outline: any; };
  sourcePointSymbol: { type: string; size: number; style: string; color: number[]; outline: any; };
  polygonSymbol: { type: string; style: string; outline: any; color: number[]; };
  activePolygonSymbol: { type: string; style: string; outline: any; color: number[]; };
  diamondSymbol: { type: string; size: number; style: string; color: number[]; outline: any; };
  crossSymbol: { type: string; size: number; style: string; color: number[]; outline: { color: number[]; width: number; style: string; }; };
  coverageMapSymbol: { type: string; style: string; outline: any; color: number[]; };
  currentImagePoint: any;
  selectLocationFlag: boolean = true;
  graphicsLayer: GraphicsLayer;
  graphicExists: boolean;
  imageProperties: any;
  activeImageID: any;
  coveragePolygons: any[];
  config: any;
  overviewLayer: any;
  oicList: string[];
  geometryService: any;
  vectorLayers: any[];
  featureSelected: any;
  selectedGraphicProperties: any;
  hidePopup: any;
  preserveToken: any;
  selectedAsset: any;
  WMSF: number;
  currentImageCameraLocation: Point | __esri.Multipoint | __esri.Polyline;
  layerVisibleStatus: { g: any[]; b: any[]; o: any[]; };
  zoomHandlers: any[];
  activeFrustumSymbol: any;
  frustumSymbol: any;
  coverageFrustums: any;
  mapViewState: any;
  imagePointCheck: boolean = false;
  currentCoverageCheck: boolean = true;
  similarCoverageCheck: boolean = false;
  allCoverageCheck: boolean = false;
  coverageFlag = {imagePoints: false, similarCoverage: false, currentCoverage: true, allCoverage: true};
  sceneViewFlag: boolean = false;
  imageInViewFlag: boolean;
  selectedPoint: any;
  selectedExposurePoint: { geometry: any; id: any; };
  avgGroundElevation: any;
  clickEvent: any;

  constructor(props) {
    super(props);
    this.state = {
      toggleButtonTooltip: 'toggleButtonOn',
      toggleButtonColor: '#0079c1',
      toggleIconColor: 'white',
      selectedOIC: '',
      currentCoverageOn: false,
      currentCoverageDisabled: true,
      similarCoverageDisabled: true,
      imagePointsDisabled: true,
      sceneModePaneView: 'none'
    };

    this.addOICItem = this.addOICItem.bind(this);
    this.loadOrientedImageryApi = this.loadOrientedImageryApi.bind(this);
    this.searchImages = this.searchImages.bind(this);
    this.layerModuleSelector = this.layerModuleSelector.bind(this);
    this.showAttributeWindow = this.showAttributeWindow.bind(this);
    this.setupResizeHandle = this.setupResizeHandle.bind(this);
    this.setViewMode = this.setViewMode.bind(this);
    this.setCameraView = this.setCameraView.bind(this);
    this.enableZoom = this.enableZoom.bind(this);
    this.disableZoom = this.disableZoom.bind(this);
    this.addAllVectorLayers = this.addAllVectorLayers.bind(this);
    this.toggleIcon = this.toggleIcon.bind(this);
    this.setupSymbols = this.setupSymbols.bind(this);
    this.mapClickEvent = this.mapClickEvent.bind(this);
    this.drawPointAndPolygons = this.drawPointAndPolygons.bind(this);
    this.drawCoveragePolygons = this.drawCoveragePolygons.bind(this);
    this.drawImageSourcePoints = this.drawImageSourcePoints.bind(this);
    this.updateCoveragePolygon = this.updateCoveragePolygon.bind(this);
    this.updateGraphics = this.updateGraphics.bind(this);
    this.createCoverageArea = this.createCoverageArea.bind(this);
    this.drawFrustums = this.drawFrustums.bind(this);
    this.showPointOnMap = this.showPointOnMap.bind(this);
    this.groundToImage = this.groundToImage.bind(this);
    this.turningOnOffFeatures = this.turningOnOffFeatures.bind(this);
    this.removeVectorLayers = this.removeVectorLayers.bind(this);
    this.addFeature = this.addFeature.bind(this);
    this.deleteFeature = this.deleteFeature.bind(this);
    this.selectFeature = this.selectFeature.bind(this);
    this.graphicSelected = this.graphicSelected.bind(this);
    this.findImageInCatalog = this.findImageInCatalog.bind(this);
    this.openImageInViewer = this.openImageInViewer.bind(this);
    this.zoomImageInView = this.zoomImageInView.bind(this);
    this.panImageInView = this.panImageInView.bind(this);
    this.updateViewCamera = this.updateViewCamera.bind(this);
    this.updateImageInView = this.updateImageInView.bind(this);
    this.deleteImageInView = this.deleteImageInView.bind(this);
    this.createMultiPoint = this.createMultiPoint.bind(this);
    this.addImageInView = this.addImageInView.bind(this);
    this.setViewConstraints = this.setViewConstraints.bind(this);
    this.changeLayersVisibility = this.changeLayersVisibility.bind(this);


  }

  nls = (id: string) => {
    return this.props.intl ? this.props.intl.formatMessage({ id: id, defaultMessage: defaultMessages[id] }) : id;
  }

  isConfigured = () => {
    console.log(this.props.useMapWidgetIds);
    return this.props.useMapWidgetIds && this.props.useMapWidgetIds.length === 1;
  }

  onActiveViewChange = (jimuMapView: JimuMapView) => {
    if (jimuMapView) {
      this.mapView = jimuMapView.view;

      this.mapView.on('click', this.mapClickEvent.bind(this));
      this.mapView.popup.watch("selectedFeature", this.graphicSelected.bind(this));
      this.mapView.popup.watch("visible", (visible) => {
        if (!visible && this.featureSelected) {
          this.orientedViewer.deselectFeaturesInImage(this.featureSelected);
          document.getElementById("viewGraphicBtn").style.display = "none";
        }
      });
      if (!this.config) {
        this.config = {
          oic: []
        };
      }
      this.loadOrientedImageryApi();
      this.setupSymbols();


      if (this.mapView.type === '2d') {
        // document.getElementById('3dmode').style.display = 'none';
        this.graphicsLayer = new GraphicsLayer({
          id: "oi-graphicsLayer",
          title: "Oriented Imagery",
          elevationInfo: { mode: "on-the-ground", Offset: 0 }
        } as any);
        this.orientedViewer?.setEnvironment("2D"); //#818
      } else {
        // document.getElementById('3dmode').style.display = 'inline-block';
        this.graphicsLayer = new GraphicsLayer({
          id: "oi-graphicsLayer",
          title: "Oriented Imagery",
          elevationInfo: { mode: "absolute-height", Offset: 0 }
        } as any);

        //#818
        this.orientedViewer?.setHeightModelInfo({ "heightModel": this.mapView.heightModelInfo?.heightModel, "heightUnit": this.mapView.heightModelInfo?.heightUnit });  // #670 issue
        this.orientedViewer?.setEnvironment("3D");

      }

      if (!this.mapView.map.findLayerById(this.graphicsLayer.id)) {
        this.mapView.map.add(this.graphicsLayer);
      }

      if (!this.mapView.ui.find("oic-click-btn")) {
        var node = document.createElement("div");
        node.innerHTML = `<button title="Turn on to pick a focus point in scene to view image" class="oi-btn-css oi-btn-css-clear oi-widget-selectBtnSelected oi-btn-css-grouped oi-widget-selectBtn" style="width:32px;height:32px;border-color:transparent;padding:0px;margin-top:-40px;" id="selectPointBtn"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" style="" class="svg-icon"><path d="M15.999 0C11.214 0 8 1.805 8 6.5v17l7.999 8.5L24 23.5v-17C24 1.805 20.786 0 15.999 0zM16 14.402A4.4 4.4 0 0 1 11.601 10a4.4 4.4 0 1 1 8.798 0A4.4 4.4 0 0 1 16 14.402z"/></svg></button>`;
        node.id = "oic-click-btn";

        this.mapView.ui.add(node, {
          position: "bottom-right",
          index: 2
        });
      }
      
        document.getElementsByClassName("oi-widget-selectBtn")[0].removeEventListener("click", this.toggleIcon);
        
      
      document.getElementsByClassName("oi-widget-selectBtn")[0].addEventListener("click", this.toggleIcon);

      if (this.overviewLayer) {
        if (!this.mapView.map.findLayerById(this.overviewLayer.id)) {
          this.mapView.map.add(this.overviewLayer);
          this.overviewLayer.visible = this.coverageFlag.allCoverage;
        }
      }

      //issue #610
      // this.mapView.map.layers.on("after-add", () => {
      //   this.mapView.map.reorder(this.graphicsLayer, this.mapView.map.layers.length - 1);
      // });
    }
  }

  componentDidMount() {
    this.config = {
      oic: []
    }
    this.oicList = [];
    this.selectLocationFlag = true;
    if (this.mapView) {
      this.mapView.cursor = 'crosshair';   //issue 249
    }

  }

  componentDidUpdate(prevProps: AllWidgetProps<{}>) {

  }

  layerModuleSelector = (url) => {
    Layer.fromArcGISServerUrl({
      url: url,
      properties: {
        visible: false
      }
    }).then((layerObject) => {
      //layerObject.spatialReference = this.mapView.spatialReference;
      layerObject.load().then((loaded) => {
        //#776
        if (this.overviewLayer) {
          this.mapView.map.remove(this.overviewLayer);
          this.overviewLayer = null;
        }
        this.overviewLayer = layerObject;
        this.overviewLayer.minScale = Math.max(50000, 300 * Number(this.config.oic[this.state.selectedOIC].itemUrl.properties.MaxDistance));  //issue 619
        this.mapView.map.add(this.overviewLayer);
        this.createCoverageArea(this.coverageFlag.allCoverage);
      });
    }).catch(() => {
      //#776
      if (this.overviewLayer) {
        this.mapView.map.remove(this.overviewLayer);
        this.overviewLayer = null;
      }
      if (url.toLowerCase().indexOf("wmts") !== -1) {
        this.overviewLayer = new WMTSLayer({
          url: url,
          visible: false,
          minScale: Math.max(50000, 300 * Number(this.config.oic[this.state.selectedOIC].itemUrl.properties.MaxDistance))  //issue 619
        });
      } else if (url.toLowerCase().indexOf("wms") !== -1) {
        this.overviewLayer = new WMSLayer({
          url: url,
          visible: false,
          minScale: Math.max(50000, 300 * Number(this.config.oic[this.state.selectedOIC].itemUrl.properties.MaxDistance))  //issue 619
        });
      } else if (url.toLowerCase().indexOf(".kml") !== -1) {
        this.overviewLayer = new KMLLayer({
          url: url,
          visible: false,
          minScale: Math.max(50000, 300 * Number(this.config.oic[this.state.selectedOIC].itemUrl.properties.MaxDistance))  //issue 619
        });
      }
      if (this.overviewLayer) {
        this.mapView.map.add(this.overviewLayer);
        this.createCoverageArea(this.coverageFlag.allCoverage); //issue #613
      }
    });
  }

  loadOrientedImageryApi = () => {
    //oiapi();
    if (!this.oiApiLoaded) {
      orientedImagery.on("load", (loaded) => {
        if (loaded) {
          this.orientedViewer = orientedImagery.viewer("oiviewer");
          this.oiApiLoaded = true;
          if (this.mapView.type === '3d') {
            this.orientedViewer.setHeightModelInfo({ "heightModel": this.mapView.heightModelInfo?.heightModel, "heightUnit": this.mapView.heightModelInfo?.heightUnit });  // #670 issue
            this.orientedViewer.setEnvironment("3D");
          }

          this.orientedViewer.showCoverageTools(true);

          this.orientedViewer.toggleTool({ name: "CurrentCoverage", state: true });
          this.orientedViewer.toggleTool({ name: "AllCoverage", state: true });//707 issue fix
          // this.coverageFlag.allCoverage = true;
          // this.createCoverageArea(true);  //#776
          this.orientedViewer.on("imagePointsCheckbox", (bool) => {
            this.coverageFlag.imagePoints = bool;
            this.turningOnOffFeatures('imagePoints', bool);
          });
          this.orientedViewer.on("currentCoverageCheckbox", (bool) => {
            this.coverageFlag.currentCoverage = bool;
            this.turningOnOffFeatures('currentCoverage', bool);
          });
          this.orientedViewer.on("similarCoverageCheckbox", (bool) => {
            this.coverageFlag.similarCoverage = bool;
            this.turningOnOffFeatures('similarCoverage', bool);
          });
          this.orientedViewer.on("coverageMapCheckbox", (bool) => {
            this.coverageFlag.allCoverage = bool;
            this.createCoverageArea(bool);
          });
          this.orientedViewer.on("sceneView", (bool) => {          
              this.sceneViewFlag = bool;
              this.setViewMode(bool);
          });
          this.orientedViewer.on("searchImages", this.drawPointAndPolygons);
          this.orientedViewer.on("showImage", this.drawPointAndPolygons);
          this.orientedViewer.on("updateImage", this.updateCoveragePolygon);
          this.orientedViewer.on("changeImage", this.updateGraphics);
          this.orientedViewer.on("imageToGroundPoint", (pointJson) => {
            this.showPointOnMap(new Point(pointJson));
          });
          this.orientedViewer.on("addFeature", this.addFeature);
          this.orientedViewer.on("deleteFeature", this.deleteFeature);
          this.orientedViewer.on("selectFeature", this.selectFeature);
          this.orientedViewer.on("toggleDistanceTool", (flag) => {   
            this.distanceSelector = flag;
          });
          this.orientedViewer.on("addImageInView", this.addImageInView);
          this.orientedViewer.on("updateImageInView", this.updateImageInView);
          this.orientedViewer.on("updateViewCamera", this.updateViewCamera);
          this.orientedViewer.on("deleteImageInView", this.deleteImageInView);


        } else {
          this.oiApiLoaded = false;
        }
      });
    }
  }

  addOICItem = (url: string) => {
    //var url = url;
    esriRequest(url + "/data", {
      query: {
        f: "json"
      },
      responseType: "json"

    }).then((oicInfo) => {
      url = oicInfo.url.substring(0, oicInfo.url.indexOf('/data'));
      oicInfo = oicInfo.data;

      if (oicInfo && oicInfo.properties) {
        this.config.oic[url] = {
          title: oicInfo.properties.Name,
          serviceUrl: oicInfo.properties.ServiceURL,
          overviewUrl: oicInfo.properties.OverviewURL,
          itemUrl: oicInfo
        };

        if (!this.state.selectedOIC) {
          this.setState({
            selectedOIC: this.oicList[0]
          });
          if (this.oicList[0]) {
            var url = this.config.oic[this.oicList[0]].serviceUrl;
            if (url.indexOf("ImageServer") === -1) {
              var query = new Query();
              query.where = "1=1";
              query.returnGeometry = false;
              query.outSpatialReference = this.mapView.extent.spatialReference;
              var queryTask = new QueryTask({ url: url });
              queryTask.executeForExtent(query).then((response) => {
                if (response.extent && (!geometryEngine.intersects(this.mapView.extent, response.extent) || geometryEngine.within(response.extent, this.mapView.extent))) {
                  this.mapView.goTo(response.extent);
                  this.graphicsLayer.fullExtent = response.extent;
                }
              });
            } else {
              esriRequest(url, {
                query: {
                  f: "json"
                },
                "responseType": "json"
              }).then((response) => {
                if (response.data && response.data.extent) {
                  if (response.data.extent.spatialReference.wkid === this.mapView.spatialReference.wkid && (!geometryEngine.intersects(this.mapView.extent, new Extent(response.data.extent)) || geometryEngine.within(new Extent(response.data.extent), this.mapView.extent))) {
                    this.mapView.goTo(new Extent(response.data.extent));
                    this.graphicsLayer.fullExtent = new Extent(response.data.extent);
                  }
                  else {
                    var params = new ProjectParameters();
                    params.geometries = [new Extent(response.data.extent)];
                    params.outSpatialReference = this.mapView.spatialReference;
                    this.geometryService.project(params).then((geometry) => {
                      if (!geometryEngine.intersects(this.mapView.extent, geometry[0]) || geometryEngine.within(geometry[0], this.mapView.extent))
                        this.mapView.goTo(geometry[0]);
                        this.graphicsLayer.fullExtent = geometry[0];
                    });
                  }
                }
              });
            }

            this.layerModuleSelector(this.config.oic[this.oicList[0]].overviewUrl);
          }
        }
      } else {
        //this.errorNotification("Error! Invalid OIC.");
      }
    });
  }

  setupSymbols = () => {
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
    this.polygonSymbol = {
      type: "simple-fill",
      style: "solid",
      outline: null,
      color: [0, 128, 192, 0.5]
    };
    this.activePolygonSymbol = {
      type: "simple-fill",
      style: "solid",
      outline: null,
      color: [255, 102, 102, 0.5]
    };
    this.greenLineSymbol = {
                type: "simple-line",
                width: 1,
                style: "short-dash",
                color: [0, 255, 0]
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
                            type: "solid",
                            color:[255, 102, 102,0]
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
                            color:[0, 128, 192,0]
        }
      }]
    };
  }



  mapClickEvent = (evt) => {
    if (this.mapView.type === '2d') {
      if (this.distanceSelector && this.currentImagePoint) {
        var distance = evt.mapPoint.distance(this.currentImagePoint);
        this.orientedViewer.setDistance(distance);
      } else if (evt.native.altKey) {
        //this.hidePopup = true;
        this.showPointOnMap(evt.mapPoint);
        this.groundToImage(evt.mapPoint);
      } else if (this.selectLocationFlag) {
        //this.hidePopup = true;
        //document.getElementById("allCoverage").checked = false;
        this.graphicExists = false;
        this.mapView.hitTest(evt.screenPoint).then((response) => {
          if (response.results.length > 0) {
              if (response.results[0].graphic.attributes && !response.results[0].graphic.attributes.id && response.results[0].graphic.attributes.imageID) {
                  this.selectedExposurePoint = {geometry: response.results[0].graphic.geometry, id: response.results[0].graphic.attributes.imageID};
                  this.searchImages(this.selectedPoint, parseInt(this.selectedExposurePoint.id));  // to streamlime the API searchImages function to use the this.searchImages of the widget
              }
              //#607 #614
              else if (response.results[0].graphic.attributes && response.results[0].graphic.attributes.OBJECTID && response.results[0].graphic.layer.url.includes('FeatureServer') && response.results[0].graphic.layer.url === this.config.oic[this.state.selectedOIC].serviceUrl) {
                  this.showImage(evt.mapPoint, response.results[0].graphic.attributes.OBJECTID);


              } else {
                  this.selectedPoint = evt.mapPoint;
                  this.searchImages(evt.mapPoint, null);
              }

          } else {
              //#596
              this.selectedPoint = evt.mapPoint;
              this.searchImages(evt.mapPoint, null);
          }
      });

      }
    } else {

      if (this.sceneViewFlag) {
        if (this.selectLocationFlag && !this.imageInViewFlag) {
          //document.getElementById("allCoverage").checked = false;
          this.hidePopup = true;
          this.searchImages(evt.mapPoint, null);
        }
      } else {
        this.mapView.hitTest(evt.screenPoint).then((response) => {
          if (response.results.length > 0) {
            var mapPoint = response.results[0].mapPoint;
          }
          else {
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
            //document.getElementById("allCoverage").checked = false;
            this.graphicExists = false;
            this.searchImages(mapPoint, null);
          }
        });
      }
    }
  }

  searchImages = (point, objectId) => {
    let url = this.config.oic[this.state.selectedOIC]?.itemUrl;
    if (this.oiApiLoaded && url) {
      if (this.mapView.type === '2d') {
        point.z = 0;
        this.orientedViewer.searchImages(point.toJSON(), url, { maxDistance: 1000, extent: this.mapView.extent.toJSON(), objectId: objectId || null });
      } else {
        this.queryElevation(point).then((res) => {
          let pointJSON = point.toJSON();
          pointJSON.elevation = res.geometry.z;
          this.avgGroundElevation = res.geometry.z; //583 issue fix
          if (this.sceneViewFlag) {
            this.graphicsLayer.graphics.removeAll();
            this.graphicsLayer.add(new Graphic({ geometry: point, symbol: this.crossSymbol, attributes: { id: "oi-focusPoint" } }));
            //this.showLoading();
            //html.set("notifyUser", "Please wait. Searching for image.");
            //document.getElementById('notifyUser').innerHTML = 'Please wait. Searching for image.';
            var location = this.currentImageCameraLocation ? this.currentImageCameraLocation.clone() : this.mapView.camera.position.clone();
            // this.mapView.map.ground.queryElevation(location).then((result) => {
            //   location.z -= result.geometry.z;
              this.orientedViewer.searchImages(pointJSON, url, {
                // token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null},
                maxDistance: 1000, extent: this.mapView.extent.toJSON(), mapSize: { w: this.mapView.width, h: this.mapView.height },
                camera: {
                  heading: this.mapView.camera.heading,
                  tilt: this.mapView.camera.tilt,
                  fov: this.mapView.camera.fov,
                  elevation: 0,
                  position: location
                },
                objectId: objectId || null
              });
            // });
          } else {
            this.orientedViewer.searchImages(pointJSON, url, {
              maxDistance: 1000, camera: this.mapView.camera, mapSize: { w: this.mapView.width, h: this.mapView.height }, extent: this.mapView.extent.toJSON(), objectId: objectId || null
            });
          }
        });
      }
    }

  }

  showImage = (point, objectId) => {
    let url = this.config.oic[this.state.selectedOIC]?.itemUrl;
    if (this.oiApiLoaded && url) {
      if (this.mapView.type === '2d') {
        point.z = 0;
        this.orientedViewer.showImage(point.toJSON(), url, { maxDistance: 1000, extent: this.mapView.extent.toJSON(), objectId: objectId || null });
      } else {
        this.queryElevation(point).then((res) => {
          let pointJSON = point.toJSON();
          pointJSON.elevation = res.geometry.z;
          this.avgGroundElevation = res.geometry.z; //583 issue fix
          if (this.sceneViewFlag) {
            this.graphicsLayer.graphics.removeAll();
            this.graphicsLayer.add(new Graphic({ geometry: point, symbol: this.crossSymbol, attributes: { id: "oi-focusPoint" } }));
            //this.showLoading();
            //html.set("notifyUser", "Please wait. Searching for image.");
            //document.getElementById('notifyUser').innerHTML = 'Please wait. Searching for image.';
            var location = this.currentImageCameraLocation ? this.currentImageCameraLocation.clone() : this.mapView.camera.position.clone();
            // this.mapView.map.ground.queryElevation(location).then((result) => {
            //   location.z -= result.geometry.z;
              this.orientedViewer.showImage(pointJSON, url, {
                // token: {token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null},
                maxDistance: 1000, extent: this.mapView.extent.toJSON(), mapSize: { w: this.mapView.width, h: this.mapView.height },
                camera: {
                  heading: this.mapView.camera.heading,
                  tilt: this.mapView.camera.tilt,
                  fov: this.mapView.camera.fov,
                  elevation: 0,
                  position: location
                },
                objectId: objectId || null
              });
            // });
          } else {
            this.orientedViewer.showImage(pointJSON, url, {
              maxDistance: 1000, camera: this.mapView.camera, mapSize: { w: this.mapView.width, h: this.mapView.height }, extent: this.mapView.extent.toJSON(), objectId: objectId || null
            });
          }
        });
      }
    }

  }

  drawPointAndPolygons = (response) => {
    //this.hideLoading();
    // document.getElementById('oi-div-holder').style.display = '';
    // document.getElementById('default-msg').style.display = 'none';
    this.graphicsLayer.graphics.removeAll();
    if (!response.error) {
      this.graphicExists = false;
      if (this.mapView.type === '2d') {
        response.point.z = 0;
        this.graphicsLayer.add(new Graphic({ geometry: new Point(response.point), symbol: this.crossSymbol }));
        this.drawCoveragePolygons(response.coveragePolygons, response.imageAttributes.imageID);
        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
        this.imageProperties = response.imageAttributes;
        this.activeImageID = response.imageAttributes.imageID;
        this.currentImagePoint = new Point({ x: this.imageProperties.location.x, y: this.imageProperties.location.y, spatialReference: new SpatialReference(this.imageProperties.location.spatialReference) });

       
      } else {
        // if (!response.point.z) {
        //   response.point.z = 0;
        // }
        var multiPoint: any = this.createMultiPoint({ geometries: response.imageSourcePoints.concat(response.point), type: "point" });
        var multiPoint2: any = this.createMultiPoint({ geometries: response.coverageFrustums, type: "frustum" });
        multiPoint = multiPoint.concat(multiPoint2);
        multiPoint = new Multipoint({ points: multiPoint, spatialReference: this.mapView.spatialReference });
        //this.queryElevation(multiPoint).then((res) => { //583 issue fixed
          for (var cv = 0; cv < multiPoint.points.length; cv++) {  //583 issue fixed
            if (cv < response.imageSourcePoints.length) {
              response.imageSourcePoints[cv].z += (this.avgGroundElevation || 0);//res.geometry.points[cv][2]; //583 issue fix
            // } else if (cv === response.imageSourcePoints.length) {
            //   response.point.z += (res.geometry as any).points[cv][2];
            } else {
              for (var fm = 0; fm < response.coverageFrustums.length; fm++) {
                if (response.coverageFrustums[fm]) {  //#625
                  for (var dm = 2; dm < response.coverageFrustums[fm].vertexAttributes.position.length; dm = dm + 3) {
                    response.coverageFrustums[fm].vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2]; //583 issue fix
                    cv++;
                  }
                }
              }
            }
          }
          this.graphicsLayer.add(new Graphic({ geometry: new Point(response.point), symbol: this.crossSymbol, attributes: { id: "oi-focusPoint" } }));
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
          // document.getElementById('imagePoints').disabled = false;
          // document.getElementById('currentCoverage').disabled = false;
          // //document.getElementById('currentCoverage').checked = true;
          // document.getElementById('similarCoverage').disabled = false;

          // this.setState({    //issue 253
          //   currentCoverageOn: true,
          //   currentCoverageDisabled: false,
          //   imagePointsDisabled: false,
          //   similarCoverageDisabled: false
          // }, () => {
          //   this.turningOnOffFeatures('currentCoverage', this.currentCoverageCheck);
          // });
        //});
      }
    }

  }

  drawCoveragePolygons = (polygons, imageID) => {
    this.coveragePolygons = [];
    for (var a = 0; a < polygons.length; a++) {
      if (polygons[a]) {  //#625
        this.coveragePolygons["p" + polygons[a].imageID] = polygons[a];
        if (imageID === polygons[a].imageID) {
          this.graphicsLayer.add(new Graphic({ geometry: new Polygon(polygons[a]), symbol: this.activePolygonSymbol, attributes: { "imageID": polygons[a].imageID, id: "oi-polygons" } }));
          this.graphicsLayer.graphics.getItemAt(this.graphicsLayer.graphics.length - 1).visible = this.coverageFlag.currentCoverage;
        } else {
          this.graphicsLayer.add(new Graphic({ geometry: new Polygon(polygons[a]), symbol: this.polygonSymbol, attributes: { "imageID": polygons[a].imageID, id: "oi-polygons" } }));
          this.graphicsLayer.graphics.getItemAt(this.graphicsLayer.graphics.length - 1).visible = this.coverageFlag.similarCoverage;
        }
      }
    }
  }

  drawImageSourcePoints = (points, imageID) => {
    for (var i = 0; i < points.length; i++) {
      this.graphicsLayer.add(new Graphic({ geometry: new Point(points[i]), symbol: (imageID === points[i].imageID ? this.activeSourcePointSymbol : this.sourcePointSymbol), attributes: { "imageID": points[i].imageID } }));
      if (!this.coverageFlag.imagePoints) {
        this.graphicsLayer.graphics.getItemAt(this.graphicsLayer.graphics.length - 1).visible = false;
      }
    }
  }

  updateCoveragePolygon = (imageProperties) => {
    //this.setupResizeHandle(); //#853
    if (this.mapView.type === '2d') {
      if (imageProperties.coveragePolygon) {
        for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
          if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === imageProperties.imageID) {
            let graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
            graphic.geometry = new Polygon(imageProperties.coveragePolygon);
            this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
            this.graphicsLayer.add(graphic);
            break;
          }
        }
      }
    } else {
      if (imageProperties.coverageFrustum.vertexAttributes) {
        let multiPoint = new Multipoint({ points: this.createMultiPoint({ type: "frustum", geometries: [imageProperties.coverageFrustum] }), spatialReference: this.mapView.spatialReference });
        //this.queryElevation(multiPoint).then((result) => {
          let cb = 0;
          for (let bm = 2; bm < imageProperties.coverageFrustum.vertexAttributes.position.length; bm = bm + 3) {
            imageProperties.coverageFrustum.vertexAttributes.position[bm] += (this.avgGroundElevation || 0);//result.geometry.points[cb][2]; //583 issue fix
            cb++;
          }
          for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
            if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === imageProperties.imageID) {
              let graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
              graphic.geometry = Mesh.fromJSON(imageProperties.coverageFrustum);
              this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
              this.graphicsLayer.add(graphic);
              break;
            }
          }
        //});
      }
    }

  }

  updateGraphics = (image) => {
    this.imageProperties = image;
    if (this.mapView.type === '3d') {
      this.setCameraView(this.imageProperties);
      for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
        if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === image.imageID) {
          var graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
          graphic.symbol = this.activeFrustumSymbol;
          graphic.visible = this.coverageFlag.currentCoverage;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === this.activeImageID) {
          var graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
          graphic.symbol = this.frustumSymbol;
          graphic.geometry = Mesh.fromJSON(this.coverageFrustums["p" + this.activeImageID]);
          graphic.visible = this.coverageFlag.similarCoverage;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).symbol.style === "circle" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === image.imageID) {
          var graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
          var currentGeometry = graphic.geometry.clone() as any;
          graphic.symbol = this.activeSourcePointSymbol;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).symbol.style === "circle" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === this.activeImageID) {
          var graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
          graphic.symbol = this.sourcePointSymbol;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        }
      }
      for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
        if (this.graphicsLayer.graphics.getItemAt(v).symbol.type === "simple-line") {
            let graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
            graphic.geometry.paths[0][1] = [currentGeometry.x, currentGeometry.y, currentGeometry.z];
            this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
            this.graphicsLayer.add(graphic);
            break;
        }

    }
    } else {
      this.currentImagePoint = new Point({ x: this.imageProperties.location.x, y: this.imageProperties.location.y, spatialReference: new SpatialReference(this.imageProperties.location.spatialReference) });
      for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
        if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === image.imageID) {
          let graphic = this.graphicsLayer.graphics.getItemAt(v).clone() as any;
          graphic.symbol = this.activePolygonSymbol;
          graphic.visible = this.coverageFlag.currentCoverage;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).attributes && this.graphicsLayer.graphics.getItemAt(v).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === this.activeImageID) {
          let graphic = this.graphicsLayer.graphics.getItemAt(v).clone() as any;
          graphic.symbol = this.polygonSymbol;
          graphic.geometry = new Polygon(this.coveragePolygons["p" + this.activeImageID]);
          graphic.visible = this.coverageFlag.similarCoverage;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).symbol.style === "circle" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === image.imageID) {
          let graphic = this.graphicsLayer.graphics.getItemAt(v).clone() as any;
          graphic.symbol = this.activeSourcePointSymbol;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        } else if (this.graphicsLayer.graphics.getItemAt(v).symbol.style === "circle" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === this.activeImageID) {
          let graphic = this.graphicsLayer.graphics.getItemAt(v).clone() as any;
          graphic.symbol = this.sourcePointSymbol;
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
          this.graphicsLayer.add(graphic);
        }
      }
    }

    this.activeImageID = image.imageID;
  }

  createCoverageArea = (value: boolean) => {
    //this.allCoverageCheck = value;
    if (this.overviewLayer) {
      if (value)
        this.overviewLayer.visible = true;
      else
        this.overviewLayer.visible = false;
    } else {
      for (var s = 0; s <= this.graphicsLayer.graphics.length - 1; s++) {
        if (this.graphicsLayer.graphics.getItemAt(s).symbol && this.graphicsLayer.graphics.getItemAt(s).symbol.style === "solid" && this.graphicsLayer.graphics.getItemAt(s).attributes.coverageMap) {
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(s));
          break;
        }
      }
      if (value && this.oiApiLoaded) {
        this.orientedViewer.getCoverageMap(this.mapView.extent.toJSON(), this.config.oic[this.state.selectedOIC].itemUrl).then((response) => {
          if (response.coverageMap) {
            if (this.mapView.type === '2d') {
              var graphic = new Graphic({ geometry: new Polygon(response.coverageMap), symbol: this.coverageMapSymbol, attributes: { "coverageMap": true } });
              this.graphicsLayer.add(graphic);
              this.overviewLayer = graphic;
            } else {
              var multiPoint = new Multipoint({ spatialReference: this.mapView.spatialReference, points: this.createMultiPoint({ type: "polygon", geometries: [response.coverageMap] }) });
              this.queryElevation(multiPoint).then((result) => {
                var cv = 0;
                for (var gm = 0; gm < response.coverageMap.rings.length; gm++) {
                  for (var mb = 0; mb < response.coverageMap.rings[gm].length; mb++)
                    response.coverageMap.rings[gm][mb][2] = result.geometry.points[cv][2];
                  cv++;
                }

                var graphic = new Graphic({ geometry: new Polygon(response.coverageMap), symbol: this.coverageMapSymbol, attributes: { "coverageMap": true } });
                this.graphicsLayer.add(graphic);
                this.overviewLayer = graphic;
              });
            }
          }
        });
      }
    }
  }

  drawFrustums = (frustums, imageID) => {
    this.coverageFrustums = [];
    for (var a = 0; a < frustums.length; a++) {
      if (frustums[a]) {  //#625
        this.coverageFrustums["p" + frustums[a].imageID] = frustums[a];
        if (imageID === frustums[a].imageID) {
          this.graphicsLayer.add(new Graphic({ geometry: Mesh.fromJSON(frustums[a]), symbol: this.activeFrustumSymbol, attributes: { "imageID": frustums[a].imageID, id: "oi-polygons" } }));
          this.graphicsLayer.graphics.getItemAt(this.graphicsLayer.graphics.length - 1).visible = this.coverageFlag.currentCoverage;

        } else {
          this.graphicsLayer.add(new Graphic({ geometry: Mesh.fromJSON(frustums[a]), symbol: this.frustumSymbol, attributes: { "imageID": frustums[a].imageID, id: "oi-polygons" } }));
          this.graphicsLayer.graphics.getItemAt(this.graphicsLayer.graphics.length - 1).visible = this.coverageFlag.similarCoverage;
        }
      }
    }
  }

  showPointOnMap = (geometry) => {
    if (this.mapView.type === '2d') {
      geometry.z = 0;
      if (!this.graphicExists) {
        this.graphicsLayer.add(new Graphic({ geometry: geometry, symbol: this.diamondSymbol }));
        this.graphicExists = true;
      } else {

        for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
          if (this.graphicsLayer.graphics.getItemAt(v).symbol?.style === "diamond") {
            let graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
            graphic.geometry = geometry;
            this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
            this.graphicsLayer.add(graphic);
            break;
          }
        }
      }
    } else {
      if (!geometry.z) {
        geometry.z = 0;
      }
      if (!this.graphicExists) {
        this.graphicsLayer.add(new Graphic({geometry: geometry, symbol: this.diamondSymbol}));
        for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
            if (this.graphicsLayer.graphics.getItemAt(v).symbol?.style === "circle" && this.graphicsLayer.graphics.getItemAt(v).attributes.imageID === this.activeImageID) {
                let g = this.graphicsLayer.graphics.getItemAt(v).geometry.clone() as any;
                this.graphicsLayer.add(new Graphic({geometry: new Polyline({paths: [[geometry.x, geometry.y, geometry.z], [g.x, g.y, g.z]], spatialReference: geometry.spatialReference.toJSON()}), symbol: this.greenLineSymbol}));
                break;
            }
        }
        this.graphicExists = true;
    } else {

        for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
            if (this.graphicsLayer.graphics.getItemAt(v).symbol?.style === "diamond") {
                let graphic = this.graphicsLayer.graphics.getItemAt(v).clone();
                graphic.geometry = geometry;
                this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
                this.graphicsLayer.add(graphic);
                break;
            }

        }
        for (let v = this.graphicsLayer.graphics.length - 1; v >= 0; v--) {
            if (this.graphicsLayer.graphics.getItemAt(v).symbol?.type === "simple-line") {
                let graphic = this.graphicsLayer.graphics.getItemAt(v).clone() as any;
                graphic.geometry.paths[0][0] = [geometry.x, geometry.y, geometry.z];
                this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(v));
                this.graphicsLayer.add(graphic);
                break;
            }

        }
    }
    }


  }

  groundToImage = (point) => {
    if (this.oiApiLoaded) {
      if (this.mapView.type === '2d') {
        point.z = 0;
        this.orientedViewer.displayGroundPointInImage(point.toJSON());
      } else {
        //this.mapView.map.ground.queryElevation(point).then((result) => {
          var pJSON = point.toJSON();
          //pJSON.z -= result.geometry.z;
          this.showPointOnMap(point);
          this.orientedViewer.displayGroundPointInImage(pJSON);
   // });
      }
    }
  }


  toggleIcon = () => {
    //issue 252 and 249

    if (document.getElementsByClassName("oi-widget-selectBtn")[0].classList.contains("oi-widget-selectBtnSelected")) {
      document.getElementsByClassName("oi-widget-selectBtn")[0].classList.remove("oi-widget-selectBtnSelected");
      document.getElementsByClassName("oi-widget-selectBtn")[0].title = "Turn on to pick a focus point in scene to view image";
      this.selectLocationFlag = false;
      this.mapView.cursor = "default";
  } else {
    document.getElementsByClassName("oi-widget-selectBtn")[0].classList.add("oi-widget-selectBtnSelected");
    document.getElementsByClassName("oi-widget-selectBtn")[0].title = "Turn off to select features in scene";
      this.selectLocationFlag = true;
      this.mapView.cursor = "crosshair";
  }
  }

  turningOnOffFeatures = (selectedFeatures: string, state: boolean) => {
    switch (selectedFeatures) {
      //#806
      case 'imagePoints':
        {
          for (var s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
            if (this.graphicsLayer.graphics.getItemAt(s).symbol.style === "circle") {
              this.graphicsLayer.graphics.getItemAt(s).visible = state;
            }
          }
          break;
        }
      case 'currentCoverage':
        {

          for (var s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
            if (this.graphicsLayer.graphics.getItemAt(s).attributes && this.graphicsLayer.graphics.getItemAt(s).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(s).attributes.imageID === this.activeImageID) {
              this.graphicsLayer.graphics.getItemAt(s).visible = state;
            }
          }
          break;
        }
      case 'similarCoverage':
        {

          for (var s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
            if (this.graphicsLayer.graphics.getItemAt(s).attributes && this.graphicsLayer.graphics.getItemAt(s).attributes.id === "oi-polygons" && this.graphicsLayer.graphics.getItemAt(s).attributes.imageID !== this.activeImageID) {
              this.graphicsLayer.graphics.getItemAt(s).visible = state;
            }
          }
          break;
        }

    }

  }


  addAllVectorLayers = () => {
    let layers = this.mapView.map.layers.items;
    this.vectorLayers = [];
    for (let i = 0; i < this.props.config.vectorLayers.length; i++) {
      for (let a = 0; a < layers.length; a++) {
        if (layers[a].id === this.props.config.vectorLayers[i].featureLayer.id && this.props.config.vectorLayers[i].addToViewer) {
          //this.addSelectOption(document.getElementById("featureClass"), layers[a].title || layers[a].name, layers[a].id);
          this.vectorLayers.push({ //#862 
            id: layers[a].id,
            title: layers[a].title,
            url: layers[a].url + "/" + layers[a].layerId,
            editable: this.props.config.vectorLayers[i].editing && layers[a].editingEnabled && layers[a].capabilities && layers[a].capabilities.operations.supportsEditing,
            renderer: layers[a].renderer,
            geometryType: layers[a].geometryType,
            fields: layers[a].fields
          });
        }
      }
    }


    for (let i = 0; i < this.vectorLayers.length; i++) {
      var vectorLayerProp = this.vectorLayers[i];
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
            //var labelDrawingMode = false;   
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
            //var labelDrawingMode = false; 
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
            //var labelDrawingMode = document.getElementById("labelLayer").checked;
            break;
          }
      }
      this.orientedViewer.addVectorLayer(vectorLayerProp.title, vectorLayerProp.url, renderer, vectorLayerProp.editable);  
      //this.vectorLayerAdded.push(vectorLayerProp.url);

    }
  }

  removeVectorLayers = () => {
    if (this.vectorLayers?.length > 0) {
      for (let a = 0; a < this.vectorLayers.length; a++) {
        this.orientedViewer.removeVectorLayer(this.vectorLayers[a].title);
      }
    }

  }

  addFeature = (json) => {
    for (var b in this.vectorLayers) {
      if (this.vectorLayers[b].title === json.layer) {
        if (this.vectorLayers[b].renderer.type === "unique-value" && this.vectorLayers[b].renderer.field)
          var uniqueValueField = this.vectorLayers[b].renderer.field; //#794
        else
          var uniqueValueField = null;
        var layer = this.mapView.map.findLayerById(this.vectorLayers[b].id);
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


      var param = { addFeatures: [graphic] };
      layer.applyEdits(param).then((result) => {
        if (result.addFeatureResults.length) {
          this.showAttributeWindow(layer, graphic, result.addFeatureResults[0].objectId, uniqueValueField);
          this.orientedViewer.applyEdits({ layer: json.layer, success: true, objectId: result.addFeatureResults[0].objectId, mode: "add" });
        } else
          this.orientedViewer.applyEdits({ layer: json.layer, success: false, error: "Failed", mode: "add" });
      }).catch((error) => { //#863
        this.orientedViewer.applyEdits({ layer: json.layer, success: false, error: error.message, mode: "add" });
      });



  }

  deleteFeature = (json) => {
    for (var b in this.vectorLayers) {
      if (this.vectorLayers[b].title === json.layer) {
        var layer = this.mapView.map.findLayerById(this.vectorLayers[b].id);
        break;
      }
    }
    layer.applyEdits({ deleteFeatures: [{ objectId: json.featureId }] }).then((result) => {
      if (result.deleteFeatureResults.length)
        this.orientedViewer.applyEdits({ layer: json.layer, success: true, mode: "delete" });
      else
        this.orientedViewer.applyEdits({ layer: json.layer, success: false, error: "Failed", mode: "delete" });
    }).catch((error) => {
      this.orientedViewer.applyEdits({ layer: json.layer, success: false, error: error.message, mode: "delete" });
    });
  }

  selectFeature = (featureJson) => {
    if (this.mapView.popup.visible) {
      this.mapView.popup.close();
    }

    var features = Object.keys(featureJson);
    var graphics = [];
    var count = features.length;
    features.forEach((key) => {
      for (var b in this.vectorLayers) {
        if (this.vectorLayers[b].title === key) {
          var layer = this.mapView.map.findLayerById(this.vectorLayers[b].id);
          break;
        }
      }
      if (layer.popupEnabled && layer.visible) {
        layer.queryFeatures({
          objectIds: featureJson[key],
          outFields: ["*"],
          returnGeometry: true,
          returnZ: true,
          outSpatialReference: this.mapView.extent.spatialReference
        }).then((results) => {
          if (results.features.length) {
            for (var a in results.features) {
              results.features[a].geometry.spatialReference = this.mapView.extent.spatialReference;
              graphics.push(new Graphic({
                attributes: results.features[a].attributes,
                layer: layer,
                geometry: layer.geometryType === "point" ? new Point(results.features[a].geometry) : layer.geometryType === "polyline" ? new Polyline(results.features[a].geometry) : new Polygon(results.features[a].geometry),
                popupTemplate: layer.popupTemplate
              }));

            }
            count--;
            if (count === 0) {
              this.mapView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
              this.mapView.popup.open({ features: graphics });
              this.featureSelected = featureJson;

            }
          }
        }).bind(this).catch(() => {
          count--;
          if (count === 0 && graphics.length) {
            this.mapView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
            this.mapView.popup.open({ features: graphics });
            this.featureSelected = featureJson;
          }
        }).bind(this);
      } else {
        count--;
        if (count === 0 && graphics.length) {
          this.mapView.popup.location = graphics[0].geometry.type === "polygon" ? graphics[0].geometry.centroid : graphics[0].geometry.type === "polyline" ? graphics[0].geometry.extent.center : graphics[0].geometry;
          this.mapView.popup.open({ features: graphics });
          this.featureSelected = featureJson;
        }
      }
    });
  }

  showAttributeWindow = (layer, graphic, objectId, uniqueValueField) => {
    //var editingNode = domConstruct.toDom("<div id='formDiv'></div>");
    var objectId = objectId;
    var editingNode = document.createElement('div');
    editingNode.setAttribute('id', 'formDiv');
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

    //domConstruct.place("<button class='oi-btn-css oi-btn-css-clear'>Update</button><button class='oi-btn-css oi-btn-css-clear' style='margin-left:10px;'>Delete</button>", featureForm.container);

    setTimeout((this, () => {   //#652
      var upbutton = document.createElement('button');
      upbutton.setAttribute('class', 'oi-btn-css oi-btn-css-clear');
      upbutton.innerHTML = 'Update';
      upbutton.addEventListener("click", () => {
        if (featureForm)
          featureForm.submit();
      });
      featureForm.container.appendChild(upbutton);
      var dlbutton = document.createElement('button');
      dlbutton.setAttribute('class', 'oi-btn-css oi-btn-css-clear');
      dlbutton.style.marginLeft = '10px';
      dlbutton.innerHTML = 'Delete';
      dlbutton.addEventListener("click", () => {
        layer.applyEdits({ deleteFeatures: [{ objectId: objectId }] }).then((result) => {
          if (result.deleteFeatureResults.length) {
            this.orientedViewer.refreshVectorLayer(layer.title);
            this.mapView.popup.clear();
            this.mapView.popup.close();
          }

        });
      });
      featureForm.container.appendChild(dlbutton);

      featureForm.on("submit", () => {
        var updated = featureForm.getValues();
        Object.keys(updated).forEach((name) => {
          graphic.attributes[name] = updated[name];
        });
        graphic.attributes[layer.objectIdField] = objectId;
        var param = { updateFeatures: [graphic] };
        layer.applyEdits(param).then((result) => {
          if (result.updateFeatureResults.length) {
            this.mapView.popup.clear();
            this.mapView.popup.close();
          }
        });
      });
      if (fieldInfos.length > 0) {
        this.mapView.popup.open({ location: graphic.geometry, content: editingNode });
      }
    }), 500);

  }

  graphicSelected = (graphic) => {
    if (!this.hidePopup) {
      this.selectedGraphicProperties = null;
      document.getElementById("viewGraphicBtn").style.display = "none";
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
        if (imgUrnExists) {
          for (var a in this.vectorLayers) {
            if (this.vectorLayers[a].indexOf(graphic.layer.url) !== -1) {
              if (graphic.attributes.hasOwnProperty("ImgUrn")) {
                this.findImageInCatalog(graphic.attributes.ImgUrn, graphic, this.config.oic[this.state.selectedOIC].serviceUrl, temp);
              } else {
                var objectId = graphic.attributes[graphic.layer.objectIdField];
                var query = new Query();
                query.where = graphic.layer.objectIdField + "=" + objectId;
                query.outFields = ["ImgUrn"];
                query.returnGeometry = false;
                graphic.layer.queryFeatures(query).then((response) => {
                  if (response.features.length) {
                    this.findImageInCatalog(response.features[0].attributes.ImgUrn, graphic, this.config.oic[this.state.selectedOIC].serviceUrl, temp);
                  }
                });
              }
              break;
            }
          }
        }
      }
    } else if (this.hidePopup) {
      this.hidePopup = false;
      this.mapView.popup.clear();
      this.mapView.popup.close();
    }
  }

  findImageInCatalog = (imgUrn, graphic, serviceUrl, graphicId) => {
    var geometry = graphic.geometry;
    if (imgUrn) {
      Layer.fromArcGISServerUrl({
        url: serviceUrl,
        properties: {
          visible: false
        }
      }).then((layerObject) => {
        layerObject.load().then((loaded) => {
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
            layerObject.queryObjectIds(query).then((response) => {
              if (response.length) {
                this.selectedGraphicProperties = { imgUrn: imgUrn, geometry: geometry, id: response[0], highlight: graphicId };
                document.getElementById("viewGraphicBtn").style.display = "inline-block";
              }

            });
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
              this.selectedGraphicProperties = { imgUrn: imgUrn, geometry: geometry, id: id, highlight: graphicId };
              document.getElementById("viewGraphicBtn").style.display = "inline-block";
            }


          }
        });
      });
    }
  }

  openImageInViewer = () => {
    if (this.selectedGraphicProperties && this.oiApiLoaded) {
      var url = this.config.oic[this.state.selectedOIC].itemUrl;
      if (this.selectedGraphicProperties.geometry.type === "point")
        var point = this.selectedGraphicProperties.geometry;
      else if (this.selectedGraphicProperties.geometry.type === "polygon")
        var point = this.selectedGraphicProperties.geometry.centroid;
      else
        var point = this.selectedGraphicProperties.geometry.extent.center;
      point.z = 0;
      this.selectedPoint = point.toJSON();   //#596
      document.getElementById("viewGraphicBtn").style.display = "none";
    
      if (this.mapView.type === "2d") {
        this.orientedViewer.searchImages(point.toJSON(), url,
          {
            token:
              { token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null },
            maxDistance: 1000,
            objectId: parseInt(this.selectedGraphicProperties.id),
            extent: this.mapView.extent.toJSON()
          });
      } else {
        this.orientedViewer.searchImages(point.toJSON(), url,
          {
            token:
              { token: this.preserveToken && this.preserveToken.token ? this.preserveToken.token : null, server: this.preserveToken && this.preserveToken.server ? this.preserveToken.server + '/sharing/rest' : null },
            maxDistance: 1000,
            mapSize: { w: this.mapView.width, h: this.mapView.height },
            objectId: parseInt(this.selectedGraphicProperties.id),
            extent: this.mapView.extent.toJSON()
          });
      }
      this.orientedViewer.toggleEditTool({ layer: this.selectedGraphicProperties.graphicLayer, tool: "display", state: true });
      this.orientedViewer.selectFeaturesInImage(this.selectedGraphicProperties.highlight);
    }
  }

  setCameraView = (att) => {
    //var def = new Deferred();
    return promiseUtils.create(function (resolve, reject) {
      if (att) {
        var point = new Point({ x: att.location.x, y: att.location.y, spatialReference: new SpatialReference(att.location.spatialReference) });
        this.queryElevation(point).then((result) => {
          this.imageProperties.alt = result.geometry.z;
          result.geometry.z += att.location.z;
          var distAssetToSceneCamera = Math.sqrt(Math.pow(this.selectedAsset.z - this.mapView.camera.position.z, 2) + Math.pow(Math.sqrt(Math.pow(this.selectedAsset.x - this.mapView.camera.position.x, 2) + Math.pow(this.selectedAsset.y - this.mapView.camera.position.y, 2)) / this.WMSF, 2)) * this.WMSF;
          var distAssetToExposurePoint = Math.sqrt(Math.pow(this.selectedAsset.z - result.geometry.z, 2) + Math.pow(Math.sqrt(Math.pow(this.selectedAsset.x - result.geometry.x, 2) + Math.pow(this.selectedAsset.y - result.geometry.y, 2)) / this.WMSF, 2)) * this.WMSF;
          if (att.fov > this.mapView.camera.fov) { //828 issue fix
            distAssetToSceneCamera /= Math.pow(2,Math.abs(Math.round(Math.log(att.fov/this.mapView.camera.fov) / Math.log(2))));
             
          }
          if (distAssetToExposurePoint - distAssetToSceneCamera > 0) {
            var pt = result.geometry;
            var fov = att.fov;
            var fraction = distAssetToSceneCamera / distAssetToExposurePoint;
            for (var b = 0; b < 15; b++) {
              let z1 = 1 / Math.pow(2, b);
              let z2 = 1 / Math.pow(2, b + 1);
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
          var camera = this.mapView.camera.clone();
          camera.fov = cam.fov;
          camera.heading = cam.heading; //camheading error fix
          this.mapView.camera = camera;
          this.mapView.goTo(cam).then(() => {
            resolve();
          });
        });
      }
    }.bind(this));
  }

  deleteImageInView = () => {
    this.imageInViewFlag = false;
    this.graphicsLayer.graphics.removeAll();
    this.changeLayersVisibility(true);
    this.setViewConstraints({
      rotate: true
    });
  }

  zoomImageInView = (scaleFactor, x, y) => {
    let camera = this.mapView.camera.clone();
    this.orientedViewer.zoomImageInView({
      width: this.mapView.width,
      height: this.mapView.height,
      x: x, y: y, fov: camera.fov,
      heading: camera.heading,
      tilt: camera.tilt,
      elevation: this.imageProperties.alt,
      position: camera.position,
      delta: scaleFactor
    });
  }

  panImageInView = (evt) => {
    //evt.stopPropagation();
    let camera = this.mapView.camera.clone();
    this.orientedViewer.panImageInView({
      width: this.mapView.width,
      height: this.mapView.height,
      elevation: this.imageProperties.alt,
      heading: camera.heading,
      tilt: camera.tilt,
      action: evt.action,
      x: evt.x, y: evt.y,
      fov: camera.fov,
      position: camera.position
    });
  }

  updateViewCamera = (cameraProperties) => {
    let camera = this.mapView.camera.clone();
    camera.heading = cameraProperties.heading;
    camera.tilt = cameraProperties.tilt;
    camera.fov = cameraProperties.fov;
    if (cameraProperties.elevation === "relative-to-ground") {
      cameraProperties.location.z += this.imageProperties.alt;
    }
    camera.position = cameraProperties.location;
    this.mapView.camera = camera;
  }

  updateImageInView = (response) => {
    let image = response.image.mesh.clone(); //#771
    if (response.image.elevation === "relative-to-ground") {
      let multipoint = this.createMultiPoint({ type: "frustum", geometries: [response.image.mesh] });
      this.queryElevation(new Multipoint({ points: multipoint, spatialReference: this.mapView.spatialReference })).then((res) => {
        let cv = 0;
        for (let dm = 2; dm < image.vertexAttributes.position.length; dm = dm + 3) {
          image.vertexAttributes.position[dm] += res.geometry.points[cv][2];
          cv++;
        }

        for (let s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
          if (this.graphicsLayer.graphics.getItemAt(s).attributes && this.graphicsLayer.graphics.getItemAt(s).attributes.id === "oi-imageMesh") {
            this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(s));
            break;
          }
        }
        let graphic = new Graphic({ geometry: image, symbol: { type: "mesh-3d", symbolLayers: [{ type: "fill" }] } as any, attributes: { "id": "oi-imageMesh" } });
        this.graphicsLayer.add(graphic);
      });
    } else {
      for (let s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
        if (this.graphicsLayer.graphics.getItemAt(s).attributes && this.graphicsLayer.graphics.getItemAt(s).attributes.id === "oi-imageMesh") {
          this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(s));
          break;
        }
      }
      let graphic = new Graphic({ geometry: image, symbol: { type: "mesh-3d", symbolLayers: [{ type: "fill" }] } as any, attributes: { "id": "oi-imageMesh" } });
      this.graphicsLayer.add(graphic);
    }

  }

  createMultiPoint = (gJSON) => {
    var points = [];
    if (gJSON.type === "point") {
      for (var nm in gJSON.geometries) {
        points.push([gJSON.geometries[nm].x, gJSON.geometries[nm].y]);
      }
      return points;
    } else if (gJSON.type === "frustum") {
      for (var nm in gJSON.geometries) {
        for (var gm = 0; gm < gJSON.geometries[nm].vertexAttributes.position.length; gm = gm + 3) {
          points.push([gJSON.geometries[nm].vertexAttributes.position[gm], gJSON.geometries[nm].vertexAttributes.position[gm + 1]]);
        }
      }
      return points;
    } else if (gJSON.type === "polygon") {
      for (var nm in gJSON.geometries) {
        for (var gm = 0; gm < gJSON.geometries[nm].rings.length; gm++) {
          for (var mb = 0; mb < gJSON.geometries[nm].rings[gm].length; mb++)
            points.push([gJSON.geometries[nm].rings[gm][mb][0], gJSON.geometries[nm].rings[gm][mb][1]]);
        }
      }
      return points;
    }
  }

  addImageInView = (response) => {
    for (let s = this.graphicsLayer.graphics.length - 1; s >= 0; s--) {
      if (this.graphicsLayer.graphics.getItemAt(s).attributes && this.graphicsLayer.graphics.getItemAt(s).attributes.id === "oi-imageMesh") {
        this.graphicsLayer.remove(this.graphicsLayer.graphics.getItemAt(s));
        break;
      }
    }
    if (response.image) {
      this.imageProperties = response.properties;
      this.setViewConstraints({
        rotate: false
      });
      let multipoint = this.createMultiPoint({ type: "point", geometries: response.imageSourcePoints });
      let multipoint2 = this.createMultiPoint({ type: "frustum", geometries: response.coverageFrustums });
      multipoint = multipoint.concat(multipoint2);
      if (response.image.elevation === "relative-to-ground") {
        let multipoint3 = this.createMultiPoint({ type: "frustum", geometries: [response.image.mesh] });
        multipoint = multipoint.concat(multipoint3);
      }
      //multipoint = multipoint.concat(multipoint3);
      let image = response.image.mesh.clone(); //#771
      //this.queryElevation(new Multipoint({ points: multipoint, spatialReference: this.mapView.spatialReference })).then((res) => { //#583 fix
        for (let cv = 0; cv < multipoint.length; cv++) { //583 issue fix
          if (cv < response.imageSourcePoints.length) {
            response.imageSourcePoints[cv].z += (this.avgGroundElevation || 0); //583 issue fix
          } else {
            for (let fm = 0; fm < response.coverageFrustums.length; fm++) {
              for (let dm = 2; dm < response.coverageFrustums[fm].vertexAttributes.position.length; dm = dm + 3) {
                response.coverageFrustums[fm].vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2]; //583 issue fix
                cv++;
              }
            }
            if (response.image.elevation === "relative-to-ground") {
              for (let dm = 2; dm < image.vertexAttributes.position.length; dm = dm + 3) {
                image.vertexAttributes.position[dm] += (this.avgGroundElevation || 0);//res.geometry.points[cv][2]; //583 issue fix
                cv++;
              }
            }

          }
        }
        this.imageInViewFlag = true;
        var graphic = new Graphic({ geometry: image, symbol: { type: "mesh-3d", symbolLayers: [{ type: "fill" }] } as any, attributes: { "id": "oi-imageMesh" } });
        this.drawImageSourcePoints(response.imageSourcePoints, response.imageAttributes.imageID);
        //this.drawFrustums(response.coverageFrustums, response.imageAttributes.imageID);
        this.activeImageID = response.imageAttributes.imageID;
        // document.getElementById("hideImageBtn").classList.remove("oi-widget-hide");
        // document.getElementById("notifyUser").innerHTML = "";

        if (response.image.elevation === "relative-to-ground") {
          let point = new Point({ x: response.properties.location.x, y: response.properties.location.y, spatialReference: new SpatialReference(response.properties.location.spatialReference) });
          this.queryElevation(point).then((result) => {
            this.imageProperties.alt = result.geometry.z;
            result.geometry.z += response.properties.location.z;

            var cam = new Camera({
              fov: response.properties.fov,
              heading: response.properties.yaw,
              tilt: response.properties.pitch,
              position: result.geometry
            });
            var camera = this.mapView.camera.clone();
            camera.fov = cam.fov;
            camera.heading = cam.heading; //camheading error fix
            this.mapView.camera = camera;
            this.mapView.goTo(cam).then(() => {
              this.changeLayersVisibility(false);
              this.graphicsLayer.add(graphic);

            });
          });
        } else {
          var cam = new Camera({
            fov: response.properties.fov,
            heading: response.properties.yaw,
            tilt: response.properties.pitch,
            position: response.properties.location
          });
          var camera = this.mapView.camera.clone();
          camera.fov = cam.fov;
          camera.heading = cam.heading;
          this.mapView.camera = camera;
          this.mapView.goTo(cam).then(() => {
            this.changeLayersVisibility(false);
            this.graphicsLayer.add(graphic);

          });
        }

        // this.setState({    //issue 253
        //   currentCoverageOn: true,
        //   currentCoverageDisabled: false,
        //   imagePointsDisabled: false,
        //   similarCoverageDisabled: false
        // }, () => {
        //   this.turningOnOffFeatures('currentCoverage', this.currentCoverageCheck);
        // });
      //});
    } else {
      // if (response.error)
      //     html.set("notifyUser", response.error);
      // else
      //     html.set("notifyUser", response.error);
    }
  }

  queryElevation = (geometry) => {
    return promiseUtils.create((resolve, reject) => {
      if (this.mapView.map.ground.layers.length) {
        this.mapView.map.ground.queryElevation(geometry).then((result) => {
            resolve(result);
        });
    } else {
        var geomClone = geometry.clone();
        if (geomClone.type === "point")
            geomClone.z = 0;
        else {
            for (var a = 0; a < geomClone.points.length; a++) {
                geomClone.points[a][2] = 0;
            }
        }
        resolve({geometry: geomClone});
    }
    });
  }
  setViewConstraints = (prop) => {
    if (!prop.rotate) {
      this.disableZoom();
    } else {
      this.enableZoom();
    }
  }

  changeLayersVisibility = (flag) => {
    // if (!flag) {
    //   this.layerVisibleStatus = { g: [], b: [], o: [] };
    // }
    // var gLayer = this.mapView.map.ground.layers.items;
    // var bLayer = this.mapView.map.basemap.baseLayers.items;
    // if (flag) {
    //   this.mapView.map.ground.opacity = 1;//this.layerVisibleStatus.g[0];
    //   if (this.layerVisibleStatus) {
    //     for (var a = 0; a < bLayer.length; a++) {
    //       bLayer[a].visible = this.layerVisibleStatus.b[a];
    //     }
    //   }

    // } else {
    //   this.mapView.map.ground.opacity = 0;
    //   for (var a = 0; a < bLayer.length; a++) {
    //     this.layerVisibleStatus.b.push(bLayer[a].visible);
    //     bLayer[a].visible = flag;
    //   }
    // }
    // var oLayer = this.mapView.map.layers.items;

    // for (var a = 0; a < oLayer.length; a++) {
    //   if (oLayer[a].id !== "oi-graphicsLayer" && oLayer[a].type !== "feature") {
    //     if (flag)
    //       oLayer[a].visible = this.layerVisibleStatus.o[a];
    //     else {
    //       this.layerVisibleStatus.o.push(oLayer[a].visible);
    //       oLayer[a].visible = flag;
    //     }
    //   }
    // }
  }

  disableZoom = () => {
    var zoomNode = document.getElementsByClassName("esri-component esri-zoom esri-widget");
    if (zoomNode.length) {
      zoomNode[0].style.display = "none";
    }
    var stopEvtPropagation = function (evt) {
      evt.stopPropagation();
    };
    this.zoomHandlers = [];
    this.zoomHandlers.push(this.mapView.on("mouse-wheel", (evt) => {

      evt.stopPropagation();
      if (evt.deltaY < 0)
        this.zoomImageInView(-1, evt.x, evt.y);
      else
        this.zoomImageInView(1, evt.x, evt.y);

    }));
    this.zoomHandlers.push(this.mapView.on("double-click", stopEvtPropagation));

    this.zoomHandlers.push(this.mapView.on("double-click", ["Control"], stopEvtPropagation));

    this.zoomHandlers.push(this.mapView.on("drag", (evt) => {
      evt.stopPropagation();
      this.panImageInView(evt);
    }));

    this.zoomHandlers.push(this.mapView.on("drag", ["Shift"], stopEvtPropagation));
    this.zoomHandlers.push(this.mapView.on("drag", ["Shift", "Control"], stopEvtPropagation));
    this.zoomHandlers.push(this.mapView.on("key-down", (event) => {
      var prohibitedKeys = ["+", "-", "Shift", "_", "="];
      var keyPressed = event.key;
      if (prohibitedKeys.indexOf(keyPressed) !== -1) {
        event.stopPropagation();
        if (keyPressed === "+")
          this.zoomImageInView(-1, this.mapView.width / 2, this.mapView.height / 2);
        else if (keyPressed === "-")
          this.zoomImageInView(1, this.mapView.width / 2, this.mapView.height / 2);
      }
      if (keyPressed.slice(0, 5) === "Arrow") {
        event.stopPropagation();
        this.panImageInView({ action: "start", x: this.mapView.width / 2, y: this.mapView.height / 2 });
        if (keyPressed === "ArrowLeft")
          this.panImageInView({ action: "end", x: this.mapView.width / 2 + 10, y: this.mapView.height / 2 });
        else if (keyPressed === "ArrowRight")
          this.panImageInView({ action: "end", x: this.mapView.width / 2 - 10, y: this.mapView.height / 2 });
        else if (keyPressed === "ArrowUp")
          this.panImageInView({ action: "end", x: this.mapView.width / 2, y: this.mapView.height / 2 + 10 });
        else if (keyPressed === "ArrowDown")
          this.panImageInView({ action: "end", x: this.mapView.width / 2, y: this.mapView.height / 2 - 10 });
      }
    }));
  }

  enableZoom = () => {
    let zoomNode = document.getElementsByClassName("esri-component esri-zoom esri-widget");
    if (zoomNode.length) {
      zoomNode[0].style.display = "block";
    }
    for (var a in this.zoomHandlers) {
      this.zoomHandlers[a].remove();
    }
    this.zoomHandlers = [];
  }

  

  setViewMode = (value) => {
    this.graphicsLayer.graphics.removeAll();
    if (!value) {
      if (this.imageInViewFlag) {//if (!domClass.contains("hideImageBtn", "oi-widget-hide"))
                    this.deleteImageInView()
    }
    } else {



    }
  }

  setupResizeHandle = (width, height) => {
    if (height && width) { //#840
      document.getElementById('oiviewer').style.height = '100%';
      document.getElementById('oiviewer').style.width = '100%';

      this.orientedViewer?.resize();
    }

  }

  render() {

    if (!this.isConfigured()) {
      return 'Please choose map';
    }

    // for (let i = 0; i < document.getElementsByClassName('border bg-white shadow rounded').length; i++) {
    //   document.getElementsByClassName('border bg-white shadow rounded')[i].style = { width: '450px', height: 'fit-content' };
    // }
    let oicAddedFlag = false;
    const oic = this.state.selectedOIC ? this.state.selectedOIC : this.props.config.oicList.length > 0 ? this.props.config.oicList[0].url : '';
    if (oic) {
      if (!this.oicList) {
        this.oicList = [];
        for (let i = 0; i < this.props.config.oicList.length; i++) {
          this.oicList.push(this.props.config.oicList[i].url);
        }
      }
      if (this.oicList.length > 0) {
        for (let i = 0; i < this.oicList.length; i++) {
          if (this.oicList[i] === oic) {
            oicAddedFlag = true;

          } else {
            this.oicList.push(oic);
          }
        }
      } else {
        this.oicList.push(oic);
      }

      if (window.location.href.indexOf('oic') !== -1) {
        let v = window.location.href.split('oic=')[1];
        if (v) {
          this.oicList[0] = ("https://www.arcgis.com/sharing/rest/content/items/" + v.split("&")[0]);
        }

      }
      for (let i = 0; i < this.oicList.length; i++) {
        this.addOICItem(this.oicList[i]);
      }

    }
    if (this.orientedViewer && this.props.config.editingEnabled && this.mapView) {
      this.addAllVectorLayers();
    } else if (this.orientedViewer && !this.props.config.editingEnabled && this.mapView) {
      this.removeVectorLayers();
    }

    return <div id="oiviewer" className="widget-orientedimagery" style={{ width: '100%', height: '100%', overflow: 'auto' }}>

      <JimuMapViewComponent useMapWidgetIds={this.props.useMapWidgetIds} onActiveViewChange={this.onActiveViewChange}></JimuMapViewComponent>

      <div>

      </div>
      <button className='oi-btn-css oi-btn-css-transparent' style={{ display: 'none', marginTop: '5px' }} id='viewGraphicBtn'>{this.nls('viewImage')}</button>

      <div id="3DModePane" style={{ display: 'none' }}>
       
        <div id="notifyUser" style={{ display: 'block', color: 'red' }}></div>
      </div>


      <ReactResizeDetector handleWidth handleHeight onResize={this.setupResizeHandle}></ReactResizeDetector>
    </div>
  }
}
