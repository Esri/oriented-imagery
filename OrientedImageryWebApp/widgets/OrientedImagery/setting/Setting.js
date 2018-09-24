///////////////////////////////////////////////////////////////////////////
// Copyright © 2018 Esri. All Rights Reserved.
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
    'dojo/dom',
    "dojo/_base/lang",
    'dojo/dom-construct',
    'dojo/dom-style',
    "dojo/html",
    'jimu/BaseWidgetSetting',
    'dijit/_WidgetsInTemplateMixin',
    "esri/request",
    "dgrid/List",
    'dgrid/Selection',
    'dgrid/Keyboard'
],
        function (
                declare,
                dom, lang,
                domConstruct,
                domStyle, html,
                BaseWidgetSetting,
                _WidgetsInTemplateMixin, esriRequest, List, Selection, Keyboard
                ) {
            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-OrientedImagery-setting',
                arrayList: [],
                returnFlag: false,
                startup: function () {
                    this.inherited(arguments);
                    this.loadingNode = domConstruct.toDom('<div class="oi-settings-loadingContainer" ><img style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif" /></div>');
                    domConstruct.place(this.loadingNode, this.domNode);
                    this.createDataGrid();
                    this.addBtn.on("click", lang.hitch(this, this.checkOIC));
                    this.deleteBtn.on("click", lang.hitch(this, this.deleteFromList));
                    this.inputOIC.on("change", lang.hitch(this, function (value) {
                        if (value)
                            this.addBtn.set("disabled", false);
                        else
                            this.addBtn.set("disabled", true);
                    }));
                    this.setConfig(this.config);

                },
                createDataGrid: function () {
                    var newList = declare([List, Selection, Keyboard]);
                    this.list = new newList({}, this.dataGrid);
                    this.list.on('dgrid-select', lang.hitch(this, function (event) {
                        this.deleteBtn.set("disabled", false);
                    }));
                    this.list.on('dgrid-deselect', lang.hitch(this, function (event) {
                        if (!this.list.selection) {
                            this.deleteBtn.set("disabled", true);
                        }
                    }));
                    this.arrayList = [];
                    this.list.renderArray(this.arrayList);

                },
                checkOIC: function () {
                    domStyle.set(this.loadingNode, "display", "block");
                    

                    var duplicateEntry;
                    var oicUrl = this.inputOIC.get("value");
                    for (var a in this.arrayList) {
                        if (this.arrayList[a].itemUrl.indexOf(oicUrl) !== -1) {
                            duplicateEntry = true;
                            break;
                        } else {
                            duplicateEntry = false;
                        }
                    }
                    if (!duplicateEntry) {
                        this.checkOICItem();
                    } else {
                        this.errorNotification("OIC already added to the list.");
                    }
                },
                checkOICItem: function () {
                    var url = this.inputOIC.get("value");
                    if(url.indexOf("id=") !== -1){
                    if (url.indexOf("/portal") !== -1)
                        var itemUrl = url.split("/portal")[0] + "/portal" + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];
                    else
                        var itemUrl = "http://www.arcgis.com" + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];
                    var request = new esriRequest({
                        url: itemUrl,
                        content: {
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    });
                    request.then(lang.hitch(this, function (response) {
                        if (response && response.type === "GeoJson") {
                            var request2 = new esriRequest({
                                url: itemUrl + "/data",
                                content: {
                                    f: "json"
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            });
                            request2.then(lang.hitch(this, function (oicInfo) {
                                if (oicInfo && oicInfo.properties) {
                                    this.arrayList.push({
                                        title: oicInfo.properties.Name,
                                        serviceUrl: oicInfo.properties.ServiceURL,
                                        overviewUrl: oicInfo.properties.OverviewURL,
                                        itemUrl: url
                                    });
                                    this.list.renderArray([this.arrayList[this.arrayList.length - 1].title]);
                                    
                                    domStyle.set(this.loadingNode, "display", "none");
                                } else {
                                    this.errorNotification("Error!");
                                }
                            }), lang.hitch(this, function () {
                                this.errorNotification("Error!");
                            }));
                        } else {
                            this.errorNotification("Item type is not OIC.");
                        }
                    }), lang.hitch(this, function () {
                        this.errorNotification("Error!");
                    }));
                }else{
                    this.errorNotification("Error!");
                }
                },
                deleteFromList: function () {
                    var index = [];
                    for (var a in this.list.selection) {
                        index.push(this.arrayList[parseInt(a)].title);
                    }
                    for (var a in index) {
                        for (var b = this.arrayList.length - 1; b >= 0; b--) {
                            if (index[a] === this.arrayList[b].title) {
                                this.arrayList.splice(b, 1);
                                break;
                            }
                        }
                    }
                    this.list.refresh();
                    var tempList = [];
                    for (var b in this.arrayList) {
                        tempList.push(this.arrayList[b].title);
                    }
                    this.list.renderArray(tempList);
                    if (this.arrayList.length === 0) {
                        this.deleteBtn.set("disabled", true);
                    }
                },
                setConfig: function (config) {
                    this.config = config;
                    if (this.config.oic) {
                        this.arrayList = this.config.oic;
                        var temp = [];
                        for (var a in this.arrayList) {
                            temp.push(this.arrayList[a].title);
                        }
                        this.list.renderArray(temp);
                    }
                },
                getConfig: function () {
                    this.config.oic = this.arrayList;
                    console.log(JSON.stringify(this.config.oic));
                    return this.config;
                },
                errorNotification: function (text) {
                    
                    domStyle.set(this.loadingNode, "display", "none");
                    html.set(this.errorNotify, text);
                    domStyle.set(this.errorNotify, "display", "block");
                    setTimeout(lang.hitch(this, function () {
                        domStyle.set(this.errorNotify, "display", "none");
                    }), 5000);
                }
            });
        });