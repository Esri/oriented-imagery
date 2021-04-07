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

define([
    'dojo/_base/declare',
    'jimu/BaseWidgetSetting',
    'dojo/dom',
    "dojo/_base/lang",
    'dojo/dom-construct',
    'dojo/dom-style',
    "dojo/html",
    'dijit/_WidgetsInTemplateMixin',
    "esri/request", "esri/arcgis/Portal",
    "dgrid/List",
    'dgrid/Selection',
    'dgrid/Keyboard'
],
        function (
                declare,
                BaseWidgetSetting,
                dom, lang,
                domConstruct,
                domStyle, html,
                _WidgetsInTemplateMixin, esriRequest, arcgisPortal, List, Selection, Keyboard
                ) {
            return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {
                baseClass: 'jimu-widget-OrientedImagery3D-setting',
                arrayList: [],
                returnFlag: false,
                startup: function () {
                    this.inherited(arguments);
                    this.loadingNode = domConstruct.toDom('<div class="oi-settings-loadingContainer" ><img style="position: absolute;top:0;bottom: 0;left: 0;right: 0;margin:auto;z-index:100;" src="' + require.toUrl('jimu') + '/images/loading.gif" /></div>');
                    domConstruct.place(this.loadingNode, this.domNode);
                    this.hideLoading();
                    this.portalUrl = this.appConfig.portalUrl.charAt(this.appConfig.portalUrl.length - 1) === "/" ? this.appConfig.portalUrl : this.appConfig.portalUrl + "/";
                    this.createDataGrid();
                    this.agolContentSelect.on("change", lang.hitch(this, this.populateFolderGroupList));
                    this.agolFolderList.on("change", lang.hitch(this, this.populateOICList));
                    this.agolOICList.on("change", lang.hitch(this, this.checkOIC));
                    this.addBtn.on("click", lang.hitch(this, this.addOIC));
                    this.deleteBtn.on("click", lang.hitch(this, this.deleteFromList));
                    this.getOICFromAgol();
                    this.setConfig(this.config);

                },
                createDataGrid: function () {
                    var newList = declare([List, Selection, Keyboard]);
                    this.list = new newList({}, this.dataGrid);
                    // this.list.on('dgrid-select', lang.hitch(this, function (event) {
                    //     this.deleteBtn.set("disabled", false);
                    // }));
                    // this.list.on('dgrid-deselect', lang.hitch(this, function (event) {
                    //     if (!this.list.selection) {
                    //         this.deleteBtn.set("disabled", true);
                    //     }
                    // }));
                    this.arrayList = [];
                    this.list.refresh();
                    this.list.renderArray(this.arrayList);

                },
                checkOIC: function (value) {
                    if (value)
                        this.addBtn.set("disabled", false);
                    else
                        this.addBtn.set("disabled", true);
                },
                addOIC: function () {
                    this.showLoading();
                    var duplicateEntry;
                    var oicUrl = this.agolOICList.get("value").split("items/")[1];
                    for (var a in this.arrayList) {
                        if (this.arrayList[a].itemUrl.indexOf(oicUrl) !== -1) {
                            duplicateEntry = true;
                            break;
                        } else {
                            duplicateEntry = false;
                        }
                    }
                    if (!duplicateEntry) {
                        this.addOICItem();
                    } else {
                        this.errorNotification(this.nls.notification2);
                    }
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
                                this.arrayList[0] = {
                                    title: oicInfo.properties.Name,
                                    serviceUrl: oicInfo.properties.ServiceURL,
                                    overviewUrl: oicInfo.properties.OverviewURL,
                                    itemUrl: this.portalUrl + "home/item.html?id=" + url.split("items/")[1]
                                };
                                this.list.refresh();
                                this.list.renderArray([this.arrayList[this.arrayList.length - 1].title]);
                                this.deleteBtn.set("disabled", false);

                                this.hideLoading();
                            } else {
                                this.errorNotification(this.nls.error1);
                            }


                        }), lang.hitch(this, function () {
                            this.errorNotification(this.nls.error1);
                        }));
                    } else {
                        this.errorNotification(this.nls.error1);
                    }
                },
                getOICFromAgol: function () {
                    this.showLoading();
                    var portal = new arcgisPortal.Portal(this.portalUrl);
                    portal.signIn().then(lang.hitch(this, function (loggedInUser) {
                        html.set(this.itemNotify, this.nls.notification1);
                        if (!this.userContentInfo || loggedInUser.id !== this.userContentInfo.userId) {
                            this.userContentInfo = {
                                userId: loggedInUser.id,
                                myFolders: {},
                                myGroups: {},
                                user: loggedInUser
                            };
                            new esriRequest({
                                url: loggedInUser.url,
                                content: {
                                    f: "json"
                                },
                                handleAs: "json",
                                callbackParamName: "callback"
                            }).then(lang.hitch(this, function (userGroups) {
                                for (var b = 0; b < userGroups.groups.length; b++) {
                                    this.userContentInfo.myGroups[userGroups.groups[b].title] = {id: userGroups.groups[b].id, items: []};
                                }
                                this.getOICFromFolders(loggedInUser);
                            }), lang.hitch(this, function () {
                                this.getOICFromFolders(loggedInUser);
                            }));
                        } else {
                            this.errorNotification("");
                            this.hideLoading();
                        }
                    }), lang.hitch(this, function (error) {
                        this.errorNotification(error.message || this.nls.error2);
                        this.hideLoading();
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
                                this.userContentInfo.myFolders[userContent.currentFolder || "default"].items.push({name: userContent.items[a].title, url: this.portalUrl + "sharing/rest/content/items/" + userContent.items[a].id});
                            }
                        }
                        for (var a in userContent.folders) {
                            this.userContentInfo.myFolders[userContent.folders[a].title] = {id: userContent.folders[a].id, items: []};
                        }
                        this.populateFolderGroupList(this.agolContentSelect.get("value"));
                        this.errorNotification("");
                    }), lang.hitch(this, function (error) {
                        this.populateFolderGroupList(this.agolContentSelect.get("value"));
                        this.errorNotification(error.mesage || this.nls.error1);
                    }));
                },
                populateFolderGroupList: function (value) {
                    if (value === "content") {
                        var items = Object.keys(this.userContentInfo.myFolders);
                        this.folderGroupLabel.innerHTML = this.nls.folder + ": ";
                    } else {
                        var items = Object.keys(this.userContentInfo.myGroups);
                        this.folderGroupLabel.innerHTML = this.nls.group + ": ";
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
                    this.agolFolderList.removeOption(this.agolFolderList.getOptions());
                    this.agolFolderList.addOption({label: this.nls.select, value: ""});
                    for (var a in items) {
                        this.agolFolderList.addOption({label: items[a], value: items[a]});
                    }
                    this.agolOICList.removeOption(this.agolOICList.getOptions());
                    this.agolOICList.addOption({label: this.nls.select, value: ""});
                    this.addBtn.set("disabled", true);
                },
                populateOICList: function (value) {
                    this.agolOICList.removeOption(this.agolOICList.getOptions());
                    this.agolOICList.addOption({label: this.nls.select, value: ""});
                    this.addBtn.set("disabled", true);
                    if (value) {
                        if (this.agolContentSelect.get("value") === "content")
                            var items = this.userContentInfo.myFolders[value].items;
                        else
                            var items = this.userContentInfo.myGroups[value].items;
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
                                this.agolOICList.addOption({label: items[a].name, value: items[a].url});
                            }
                        } else {
                            if (this.agolContentSelect.get("value") === "content")
                                this.getOICFromFolder(value);
                            else
                                this.getOICFromGroup(value);
                        }

                    }
                },
                getOICFromGroup: function (value) {
                    this.showLoading();
                    var id = this.userContentInfo.myGroups[value].id;
                    var request = new esriRequest({
                        url: this.portalUrl + "sharing/rest/content/groups/" + id,
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
                                    this.userContentInfo.myGroups[value].items.push({name: response.items[a].title, url: this.portalUrl + "sharing/rest/content/items/" + response.items[a].id});
                                }
                            }
                            var items = this.userContentInfo.myGroups[value].items;
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
                                this.agolOICList.addOption({label: items[a].name, value: items[a].url});
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
                                    this.userContentInfo.myFolders[value].items.push({name: response.items[a].title, url: this.portalUrl + "sharing/rest/content/items/" + response.items[a].id});
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
                                this.agolOICList.addOption({label: items[a].name, value: items[a].url});
                            }
                            this.hideLoading();
                        } else
                            this.hideLoading();
                    }), lang.hitch(this, function (error) {
                        this.hideLoading();
                    }));
                },
                deleteFromList: function () {
                    var index = [];
                    // for (var a in this.list.selection) {
                    //     index.push(this.arrayList[parseInt(a)].title);
                    // }
                    // for (var a in index) {
                    //     for (var b = this.arrayList.length - 1; b >= 0; b--) {
                    //         if (index[a] === this.arrayList[b].title) {
                    //             this.arrayList.splice(b, 1);
                    //             break;
                    //         }
                    //     }
                    // }
                    this.arrayList = [];
                    this.list.refresh();
                    var tempList = [];
                    // for (var b in this.arrayList) {
                    //     tempList.push(this.arrayList[b].title);
                    // }
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
                        this.list.refresh();
                        this.list.renderArray(temp);
                    }
                    
                },
                getConfig: function () {
                    this.config.oic = this.arrayList;
                    return this.config;
                },
                errorNotification: function (text) {
                    this.hideLoading();
                    html.set(this.errorNotify, text);
                    html.set(this.itemNotify, "");
                    domStyle.set(this.errorNotify, "display", "block");
                    setTimeout(lang.hitch(this, function () {
                        domStyle.set(this.errorNotify, "display", "none");
                    }), 5000);
                },
                showLoading: function () {
                    domStyle.set(this.loadingNode, "display", "block");
                },
                hideLoading: function () {
                    domStyle.set(this.loadingNode, "display", "none");
                }
            });
        });