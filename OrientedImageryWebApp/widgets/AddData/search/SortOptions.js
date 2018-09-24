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
    "dojo/on",
    "dojo/dom-class",
    "./SearchComponent",
    "dojo/text!./templates/SortOptions.html",
    "dojo/i18n!../nls/strings",
    "dijit/form/Select"
  ],
  function(declare, on, domClass, SearchComponent, template, i18n) {

    return declare([SearchComponent], {

      i18n: i18n,
      templateString: template,

      sortField: null,
      sortOrder: null,

      postCreate: function() {
        this.inherited(arguments);
        this.updateSortOrderButton();

        var self = this;
        this.own(this.sortSelect.on("change", function() {
          var v = self.sortField = self.sortSelect.get("value");
          if (v === "") {
            self.sortOrder = null;
          } else if (v === "title" || v === "owner") {
            self.sortOrder = "asc";
          } else if (v === "avgrating" || v === "numviews" || v === "modified") {
            self.sortOrder = "desc";
          }
          self.updateSortOrderButton();
          self.search();
        }));

        this.own(on(this.sortSelect.dropDown, "open", function(){
          var selectPopup = this.domNode.parentElement;
          if(selectPopup) {
            domClass.add(selectPopup, "add-data-widget-popup");
          }
        }));
      },

      sortOrderClicked: function() {
        if (this.sortOrder === "asc") {
          this.sortOrder = "desc";
          this.updateSortOrderButton();
          this.search();
        } else if (this.sortOrder === "desc") {
          this.sortOrder = "asc";
          this.updateSortOrderButton();
          this.search();
        }
      },

      updateSortOrderButton: function() {
        var btn = this.sortOrderBtn;
        if (this.sortField !== null && this.sortField.length > 0) {
          btn.style.visibility = "visible";
        } else {
          btn.style.visibility = "hidden";
        }
        if (this.sortOrder === "desc") {
          domClass.add(btn, "descending");
        } else {
          domClass.remove(btn, "descending");
        }
      },

      /* SearchComponent API ============================================= */

      appendQueryParams: function(params) {
        params.sortField = null;
        params.sortOrder = null;
        var sortField = this.sortField,
          sortOrder = this.sortOrder;
        if (sortField !== null && sortField.length > 0) {
          params.sortField = sortField;
          if (sortOrder !== null && sortOrder.length > 0) {
            params.sortOrder = sortOrder;
          }
        } else if (!params.canSortByRelevance) {
          //params.sortField = "title";
          //params.sortOrder = "asc";
          params.sortField = "numviews";
          params.sortOrder = "desc";
        }
      }

    });

  });
