///////////////////////////////////////////////////////////////////////////
// Copyright © 2015 Esri. All Rights Reserved.
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
    "dojo/query",
    "dojo/dom-class",
    "dojo/dom-construct",
    "jimu/BaseWidgetSetting",
    "dijit/_WidgetsInTemplateMixin",
    "dijit/form/Form",
    "dijit/form/CheckBox",
    "dijit/form/NumberTextBox",
    "dijit/form/ValidationTextBox"
  ],
  function(declare, lang, query, domClass, domConstruct,
    BaseWidgetSetting, _WidgetsInTemplateMixin) {

    return declare([BaseWidgetSetting, _WidgetsInTemplateMixin], {

      baseClass: "jimu-widget-add-data-setting",
      maxRecordThreshold: 100000,

      postCreate: function() {
        this.inherited(arguments);

        var self = this;
        query(".default-scope",this.domNode).forEach(function(nd){
          var txt = domConstruct.create("span",{
            "class": "opt-text"
          },nd);
          txt.appendChild(document.createTextNode(self.nls._default));
          var btn = domConstruct.create("span",{
            "class": "opt-button",
            "onclick": function() {
              self.setDefaultScope(nd.getAttribute("data-scope"));
            }
          },nd);
          btn.appendChild(document.createTextNode(self.nls.makeDefault));
        });
      },

      startup: function() {
        if (this._started) {
          return;
        }
        this.inherited(arguments);
        this.setConfig(this.config);
      },

      getConfig: function() {
        if (!this.settingsForm.validate()) {
          return false;
        }
        if (!this.config) {
          this.config = {};
        }

        var getInt = function(defaultNum, min, max, numberBox) {
          var v = numberBox.get("value");
          if (typeof v === "number" && !isNaN(v)) {
            v = Math.floor(v);
            if (v >= min && v <= max) {
              return v;
            }
          }
          return defaultNum;
        };

        var getStr = function(textBox) {
          var v = textBox.get("value");
          if (typeof v === "string" && lang.trim(v).length > 0) {
            return lang.trim(v);
          }
          return null;
        };

        var setOption = function(options, name, checkBox, textBox) {
          var opt = options[name];
          if (!opt) {
            opt = options[name] = {};
          }
          opt.allow = !!checkBox.get("checked");
          if (textBox) {
            opt.label = null;
            var v = textBox.get("value");
            if (typeof v === "string" && lang.trim(v).length > 0) {
              opt.label = lang.trim(v);
            }
          }
        };

        this.config.numPerPage = getInt(30,1,100,this.numPerBageBox);

        if (!this.config.scopeOptions) {
          this.config.scopeOptions = {};
        }
        delete this.config.scopeOptions.FromUrl;
        var options = this.config.scopeOptions;
        options.defaultScope = this.getDefaultScope();

        setOption(options,"MyContent",
          this.MyContentCheckBox,this.MyContentTextBox);
        setOption(options,"MyOrganization",
          this.MyOrganizationCheckBox,this.MyOrganizationTextBox);
        setOption(options,"ArcGISOnline",
          this.ArcGISOnlineCheckBox,this.ArcGISOnlineTextBox);
        setOption(options,"Curated",
          this.CuratedCheckBox,this.CuratedTextBox);
        options.Curated.filter = getStr(this.CuratedFilterTextBox);
        setOption(this.config,"addFromUrl",this.addFromUrlCheckBox);
        setOption(this.config,"addFromFile",this.addFromFileCheckBox);

        this.config.addFromFile.maxRecordCount = 1000;
        /*
        this.config.addFromFile.maxRecordCount = getInt(1000,1,
          this.maxRecordThreshold,this.maxRecordBox);
        */

        //console.warn("getConfig",this.config);
        return this.config;
      },

      setConfig: function(config) {
        this.config = config || {};
        var self = this;
        //console.warn("setConfig",this.config);

        var setInt = function(num, min, max, numberBox, warn) {
          try {
            var v = Number(num);
            if (typeof v === "number" && !isNaN(v)) {
              v = Math.floor(v);
              if (v >= min && v <= max) {
                numberBox.set("value",v);
              }
            }
          } catch (ex) {
            console.warn(warn);
            console.warn(ex);
          }
        };

        var setStr = function(v,textBox) {
          if (typeof v === "string") {
            textBox.set("value",lang.trim(v));
          }
        };

        var setOption = function(options, name, checkBox, textBox, chkScope) {
          var opt = options[name];
          if (!opt) {
            opt = options[name] = {
              allow: true
            };
            if (textBox) {
              opt.label = null;
            }
          }
          if (typeof opt.allow !== "boolean") {
            opt.allow = true;
          }
          checkBox.set("checked",opt.allow);
          if (textBox) {
            if (typeof opt.label === "string") {
              var s = lang.trim(opt.label);
              if (s.length > 0) {
                textBox.set("value",s);
              }
            }
          }
          if (chkScope) {
            if (options.defaultScope === name) {
              self.setDefaultScope(name);
            }
          }
        };

        this.numPerBageBox.set("value",30);
        setInt(this.config.numPerPage,1,100,
          this.numPerBageBox,"Error setting config.numPerPage:");

        if (!this.config.scopeOptions) {
          this.config.scopeOptions = {};
        }
        var options = this.config.scopeOptions;
        this.setDefaultScope("MyOrganization");

        setOption(options,"MyContent",
          this.MyContentCheckBox,this.MyContentTextBox,true);
        setOption(options,"MyOrganization",
          this.MyOrganizationCheckBox,this.MyOrganizationTextBox,true);
        setOption(options,"ArcGISOnline",
          this.ArcGISOnlineCheckBox,this.ArcGISOnlineTextBox,true);
        setOption(options,"Curated",
          this.CuratedCheckBox,this.CuratedTextBox,true);
        setStr(options.Curated.filter,this.CuratedFilterTextBox);
        setOption(this.config,"addFromUrl",this.addFromUrlCheckBox);
        setOption(this.config,"addFromFile",this.addFromFileCheckBox);

        /*
        this.maxRecordBox.set("value",1000);
        setInt(this.config.addFromFile.maxRecordCount,1,this.maxRecordThreshold,
          this.maxRecordBox,"Error setting config.addFromFile.numPerPage:");
        */
      },

      getDefaultScope: function() {
        var scope = "MyOrganization";
        query(".default-scope",this.domNode).forEach(function(nd){
          if (domClass.contains(nd,"sel")) {
            scope = nd.getAttribute("data-scope");
          }
        });
        return scope;
      },

      setDefaultScope: function(value) {
        query(".default-scope",this.domNode).forEach(function(nd){
          var v = nd.getAttribute("data-scope");
          if (v === value) {
            domClass.add(nd,"sel");
          } else {
            domClass.remove(nd,"sel");
          }
        });
      }

    });

  });
