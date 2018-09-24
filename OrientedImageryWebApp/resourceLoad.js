///////////////////////////////////////////////////////////////////////////
// Copyright (c) 2013 Esri. All Rights Reserved.
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
    "dojo/Evented",
    "dojo/on",
    "dijit/registry",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/dom","jimu/PanelManager",
    "esri/layers/MosaicRule",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/geometry/Extent",
    "dojo/date/locale", "dijit/Tooltip",
    "dojox/charting/Chart",
    "dojox/charting/action2d/Tooltip",
    "dojox/charting/themes/PrimaryColors",
    "dojox/charting/widget/SelectableLegend",
    "dojox/charting/action2d/Magnify",
    	"dojox/charting/action2d/Highlight",
    "dojo/dom-construct",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "esri/symbols/SimpleLineSymbol",
  "esri/dijit/LayerSwipe","jimu/WidgetManager",
    "esri/Color", "dijit/popup",
    "esri/geometry/geometryEngine",
    "dojo/dom-style", "esri/layers/ArcGISImageServiceLayer",
 "esri/layers/RasterFunction",
    "esri/layers/ImageServiceParameters",
     "esri/arcgis/Portal", "dojo/dom-attr","dojo/i18n!esri/nls/jsapi",
    "esri/toolbars/draw",
    "esri/request","esri/dijit/ColorPicker", "esri/geometry/Polygon", "esri/SpatialReference","esri/layers/RasterLayer",
    "dojo/_base/connect", 'dojo/dom-class',
    "esri/symbols/SimpleMarkerSymbol",
     "dijit/Dialog",
    "dijit/form/Select",
    "dijit/form/Button",
    "dijit/form/CheckBox",
    "dijit/form/TextBox",
     "dojox/charting/plot2d/Lines",
    "dojox/charting/plot2d/Markers","dojox/charting/plot2d/Areas",
    "dojox/charting/axis2d/Default",
    "dijit/ColorPalette","dojo/parser","dijit/form/DropDownButton","dijit/TooltipDialog",/* "dijit/Editor", "dijit/_editor/plugins/AlwaysShowToolbar",
    'dijit/_editor/plugins/FullScreen',
    'dijit/_editor/plugins/LinkDialog',
    'dijit/_editor/plugins/ViewSource',
    'dijit/_editor/plugins/FontChoice',
    'dijit/_editor/plugins/ToggleDir',
    'dojox/editor/plugins/Preview',
    'dijit/_editor/plugins/TextColor',
    'dojox/editor/plugins/ToolbarLineBreak',
    'dijit/ToolbarSeparator',
    'dojox/editor/plugins/InsertEntity',
    'dojox/editor/plugins/Smiley',
    'dojox/editor/plugins/FindReplace',
    'dojox/editor/plugins/PasteFromWord',
    'dojox/editor/plugins/InsertAnchor',
    'dojox/editor/plugins/UploadImage',
    'dojox/editor/plugins/LocalImage'*/
],
        function(
                declare,
                Evented,
                on,
                registry,
                lang,
                html,
                dom,PanelManager,
                MosaicRule,
                Query, QueryTask, Extent, locale,tooltip, Chart, Tooltip, theme,  SelectableLegend, Magnify, Highlight, domConstruct, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, SimpleLineSymbol, LayerSwipe, WidgetManager, Color, popup, geometryEngine, domStyle, ArcGISImageServiceLayer, RasterFunction, ImageServiceParameters, arcgisPortal, domAttr, bundle, Draw, esriRequest,ColorPicker,Polygon, SpatialReference, RasterLayer, connect, domClass, SimpleMarkerSymbol) {
                    return declare("resourceLoad", [Evented], {
    constructor: function(parameters) {
      var defaults = {
        resource: ""
      };
      lang.mixin(this, defaults, parameters);
    },
           
                load: function(widget) {
                    switch(widget) {
                        case  "layer": {
                        
                     var array =[on,
                lang,
                domClass,
                RasterFunction,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                tooltip, locale,
                domConstruct,
                dom, html, domStyle, connect, esriRequest, arcgisPortal,
                popup,
                Extent,bundle, registry,
                 PanelManager, 
                  domAttr];
              break;
                }
                case "time":{
                        
                    var array = [on,
                registry,
                lang,
                html,
                dom,
                MosaicRule,
                Query, QueryTask, Extent, locale, Chart, Tooltip, theme,  SelectableLegend, Magnify, Highlight, domConstruct, HorizontalSlider, HorizontalRule, HorizontalRuleLabels,  SimpleLineSymbol,  Color, popup, geometryEngine, domStyle, ArcGISImageServiceLayer, ImageServiceParameters,  Draw, esriRequest, connect, domClass, SimpleMarkerSymbol, PanelManager];
                    break;
                }
                case "compare":{
                    var array = [popup,
                registry,
                lang,
                dom,on,
                domConstruct,
                LayerSwipe, WidgetManager,domClass,domStyle];
            break;
                }
                case "mask":{
                    var array = [popup,on,
                lang,
                domClass,
                RasterFunction,ColorPicker,
               ImageServiceParameters,
               domConstruct,
                dom,html,domStyle, connect, Color,Query,QueryTask,Chart, Tooltip,theme,Magnify, Draw,esriRequest,Polygon, SpatialReference,registry,RasterLayer, PanelManager];
                break;}
                case "change":{
                        
                        var array= [on,
                lang,
                domClass,
                RasterFunction,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                tooltip, locale,
                domConstruct,
                dom, html, domStyle, connect,  SpatialReference,HorizontalRule, HorizontalRuleLabels,  esriRequest, popup, Query, QueryTask, Draw, Polygon, Chart, theme, Magnify, registry, Color, RasterLayer, PanelManager];
                break;
            }
            case "story" :{
                    var array = [on,
                lang,
                domClass,
                RasterFunction,
                ArcGISImageServiceLayer,
                ImageServiceParameters,
                 locale,
                domConstruct,
                dom, html, domStyle,WidgetManager, MosaicRule, esriRequest, HorizontalSlider,arcgisPortal,  Query, QueryTask, Extent, registry,popup, RasterLayer, PanelManager,bundle];
            break;
            }
            case "identify": {
                    var array = [registry,
                lang,
                dom,
                domConstruct,
                domStyle, esriRequest, Chart, Tooltip, theme, SelectableLegend, Magnify, locale, html, on, popup, RasterFunction, ImageServiceParameters, RasterLayer, connect, SimpleMarkerSymbol, SimpleLineSymbol, Color, domClass, PanelManager, tooltip, Query, QueryTask, Draw, Polygon, SpatialReference];
              break; 
                                                    }
                   
                    
                }
                    return array;
                }
               
               
                      
               
               
            
            });

           
        });