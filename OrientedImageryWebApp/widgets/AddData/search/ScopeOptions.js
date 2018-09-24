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
    "dojo/dom-class",
    "./SearchComponent",
    "dojo/text!./templates/ScopeOptions.html",
    "dojo/i18n!../nls/strings",
    "./util"
  ],
  function(declare, lang, array, domClass, SearchComponent, template, i18n, util) {

    return declare([SearchComponent], {

      i18n: i18n,
      templateString: template,
      curatedFilter: null,

      postCreate: function() {
        this.inherited(arguments);
      },

      startup: function() {
        if (this._started) {
          return;
        }
        this.inherited(arguments);
        this.initOptions();
        //console.warn("ScopeOptions.startup",this.searchPane.portal);
      },

      hideDropdown: function() {
        domClass.remove(this.scopePlaceholder, "opened");
        domClass.remove(this.btnGroup, "show");
      },

      initOptions: function() {
        var context = this.searchPane.searchContext;
        var hasUsername = (typeof context.username === "string" && context.username.length > 0);
        //var hasOrgId = (typeof context.orgId === "string" && context.orgId.length > 0);
        var options = this.getConfig().scopeOptions;
        this.curatedFilter = options.Curated.filter;
        var activeNode = null;

        var initOption = function(name, node) {
          var opt = options[name];
          if (opt && opt.allow) {
            if (typeof opt.label === "string" && lang.trim(opt.label). length > 0) {
              util.setNodeText(node,lang.trim(opt.label));
            } else {
              if (!hasUsername && name === "MyOrganization") {
                // "My Organization as a label doesn't make sense
                util.setNodeText(node,i18n.search.scopeOptions.anonymousContent);
              }
            }
            if (options.defaultScope === name) {
              activeNode = node;
            }
          } else {
            node.style.display = "none";
          }
        };
        initOption("MyContent", this.MyContentToggle);
        initOption("MyOrganization", this.MyOrganizationToggle);
        initOption("Curated", this.CuratedToggle);
        initOption("ArcGISOnline", this.ArcGISOnlineToggle);

        if (!activeNode) {
          if (options.MyOrganization.allow) {
            activeNode = this.MyOrganizationToggle;
          } else if (options.ArcGISOnline.allow) {
            activeNode = this.ArcGISOnlineToggle;
          } else if (options.Curated.allow) {
            activeNode = this.CuratedToggle;
          } else if (options.MyContent.allow) {
            activeNode = this.MyContentToggle;
          }
        }
        if (activeNode) {
          domClass.add(activeNode, "active");
          this.scopePlaceholderText.innerHTML = activeNode.innerHTML;
        }
      },

      optionClicked: function(evt) {
        this.toggleClassName(evt);
        this.hideDropdown();
        this.search();
      },

      scopePlaceholderClicked: function(evt) {
        evt.preventDefault();
        if (domClass.contains(this.scopePlaceholder, "opened")) {
          this.hideDropdown();
        } else {
          this.showDropdown();
        }
      },

      showDropdown: function() {
        // this.btnGroup.style.top = this.domNode.clientHeight + "px";
        domClass.add(this.scopePlaceholder, "opened");
        domClass.add(this.btnGroup, "show");
      },

      toggleClassName: function(evt) {
        array.forEach(this.btnGroup.children, function(node) {
          domClass.remove(node, "active");
        });
        domClass.add(evt.target, "active");
        this.scopePlaceholderText.innerHTML = evt.target.innerHTML;
      },

      /* SearchComponent API ============================================= */

      appendQueryParams: function(params, task) {
        var scope = null;
        array.some(this.btnGroup.children, function(node) {
          if (domClass.contains(node, "active")) {
            scope = node.getAttribute("data-option-name");
            return true;
          }
        });
        if (typeof scope === "undefined") {
          scope = null;
        }
        //console.warn("scope",scope);

        var q = null;
        var curatedFilter = this.curatedFilter;
        var context = this.searchPane.searchContext;
        var username = context.username;
        var orgId = context.orgId;
        var considerOrg = true;
        if (context.portal && context.portal.isPortal) {
          considerOrg = false;
        }

        if (scope === "MyContent") {
          if (typeof username === "string" && username.length > 0) {
            q = "(owner:" + util.escapeForLucene(username) + ")";
          }

        } else if (scope === "MyOrganization") {
          if (considerOrg && typeof orgId === "string" && orgId.length > 0) {
            q = "(orgid:" + util.escapeForLucene(orgId) + ")";
          }

        } else if (scope === "Curated") {
          if (typeof curatedFilter === "string" && curatedFilter.length > 0) {
            q = curatedFilter;
          }

        } else if (scope === "ArcGISOnline") {
          if (context.allowArcGISOnline) {
            task.scopeIsArcGISOnline = true;
          }
        }

        if (q !== null && q.length > 0) {
          q = "(" + q + ")";
          if (params.q !== null && params.q.length > 0) {
            params.q += " AND " + q;
          } else {
            params.q = q;
          }
        }
      }

    });

  });
