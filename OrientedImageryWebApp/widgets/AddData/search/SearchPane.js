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
    "dojo/on",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/SearchPane.html",
    "dojo/i18n!../nls/strings",
    "./SearchBox",
    "./BBoxOption",
    "./ScopeOptions",
    "./TypeOptions",
    "./SortOptions",
    "./ResultsPane",
    "./Paging",
    "./ResultCount"
  ],
  function(declare, lang, array, on, domClass, _WidgetBase, _TemplatedMixin,
    _WidgetsInTemplateMixin, template, i18n) {

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {

      i18n: i18n,
      templateString: template,

      qDefaultFilter: null,
      qRequiredFilter: null,
      searchOnStart: true,

      searchContext: null,
      wabWidget: null,

      _dfd: null,

      postCreate: function() {
        this.inherited(arguments);
        array.forEach(this.getComponents(), function(component) {
          component.searchPane = this;
        }, this);
      },

      startup: function() {
        if (this._started) {
          return;
        }
        this.inherited(arguments);
        //console.warn("SearchPane.startup .......................");
        this.bindEvents();
        if (this.searchOnStart) {
          this.search();
        }
      },

      _onFilterPlaceholderChanged: function() {
        if (domClass.contains(this.filterPlaceholder, "opened")) {
          domClass.remove(this.filterPlaceholder, "opened");
          domClass.remove(this.filterWrapper, "show");
        } else {
          this.filterWrapper.style.top = this.headerNode.clientHeight + "px";
          domClass.add(this.filterPlaceholder, "opened");
          domClass.add(this.filterWrapper, "show");
        }
      },

      _onSearchBoxPlaceholderChanged: function() {
        /*
        if (!this.searchBox) {
          return;
        }
        if (domClass.contains(this.searchBoxPlaceholder, "opened")) {
          domClass.remove(this.searchBoxPlaceholder, "opened");
          domClass.remove(this.searchBox.domNode, "show");
        } else {
          domClass.add(this.searchBoxPlaceholder, "opened");
          domClass.add(this.searchBox.domNode, "show");
          this.searchBox.searchTextBox.focus();
        }
        */
      },

      bindEvents: function() {
        // TODO
        this.own(on(this.filterPlaceholder,'click',
          lang.hitch(this, this._onFilterPlaceholderChanged)));

        // TODO
        /*
        this.own(on(this.searchBoxPlaceholder,
          'click',
          lang.hitch(this, this._onSearchBoxPlaceholderChanged)));
        */
      },

      buildQueryParams: function(task) {
        var qRequired = null;
        if (typeof this.qRequiredFilter === "string" && this.qRequiredFilter.length > 0) {
          qRequired = this.qRequiredFilter;
        }
        var params = {
          q: qRequired,
          canSortByRelevance: false
        };
        array.forEach(this.getComponents(), function(component) {
          component.appendQueryParams(params, task);
        });
        delete params.canSortByRelevance;
        if (params.q === null && typeof this.qDefaultFilter === "string" &&
          this.qDefaultFilter.length > 0) {
          params.q = this.qDefaultFilter;
        }
        return params;
      },

      getComponents: function() {
        return [this.searchBox,
          this.bboxOption,
          this.scopeOptions,
          this.typeOptions,
          this.sortOptions,
          this.resultsPane,
          this.paging,
          this.resultCount
        ];
      },

      resize: function() {
        this.contentNode.style.top = this.headerNode.clientHeight + 1 + "px";
      },

      search: function() {
        var self = this, task = {};
        var params = this.buildQueryParams(task);
        if (params === null || params.q === null) {
          return;
        }
        if (params && params.sortField === null) {
          params.sortOrder = "desc"; // (wab queryItems issue - unable to use relevance)
          //console.warn("search-params",params);
        }
        var portal = this.searchContext.portal;
        if (task.scopeIsArcGISOnline && this.searchContext.arcgisOnlinePortal) {
          portal = this.searchContext.arcgisOnlinePortal;
        }
        //console.warn("portal",portal);

        if (this._dfd !== null) {
          this._dfd.cancel("Search aborted.", false);
        }
        var dfd = null;
        this._dfd = dfd = portal.queryItems(params).then(function(searchResponse) {
          //console.warn("searchResponse",searchResponse);
          if (!dfd.isCanceled()) {
            if (!searchResponse.queryParams) {
              searchResponse.queryParams = {
                start: searchResponse.start,
                num: searchResponse.num
              };
              if (!searchResponse.nextQueryParams) {
                if (typeof searchResponse.nextStart !== "undefined" &&
                  searchResponse.nextStart !== -1) {
                  searchResponse.nextQueryParams = {
                    start: searchResponse.nextStart
                  };
                }
              }
            }
            array.forEach(self.getComponents(), function(component) {
              component.processResults(searchResponse);
            });
          }
        }).otherwise(function(error) {
          // TODO handle the error
          console.warn("searchError", error);
        });
      },

      _showLayers: function(){
        if (this.wabWidget) {
          this.wabWidget.showLayers();
        }
      }

    });

  });
