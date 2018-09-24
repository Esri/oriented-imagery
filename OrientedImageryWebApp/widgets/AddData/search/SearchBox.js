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
    "dojo/on",
    "dojo/keys",
    "./SearchComponent",
    "dojo/text!./templates/SearchBox.html",
    "dojo/i18n!../nls/strings"
  ],
  function(declare, lang, on, keys, SearchComponent, template, i18n) {

    return declare([SearchComponent], {

      i18n: i18n,
      templateString: template,

      postCreate: function() {
        this.inherited(arguments);
        this._checkClearButton();

        this.own(on(this.searchTextBox, "keyup", lang.hitch(this, function(evt) {
          this._checkClearButton();
          if (evt.keyCode === keys.ENTER) {
            this.search();
          }
        })));
      },

      _checkClearButton: function() {
        /*
        var v = this.searchTextBox.value;
        if (v !== null && v.length > 0) {
          //domClass.remove(this.clearButton,"hidden");
          domClass.add(this.clearButton, "hidden");
        } else {
          domClass.add(this.clearButton, "hidden");
        }
        */
      },

      clearButtonClicked: function() {
        this.searchTextBox.value = "";
        this._checkClearButton();
        this.search();
      },

      searchButtonClicked: function() {
        this.search();
      },

      /* SearchComponent API ============================================= */

      appendQueryParams: function(params) {
        var q = this.searchTextBox.value;
        if (q !== null) {
          q = lang.trim(q);
        }
        if (q !== null && q.length > 0) {
          params.canSortByRelevance = true;
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
