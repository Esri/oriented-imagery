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
    "dojo/_base/array",
    "./SearchComponent",
    "dojo/text!./templates/ResultsPane.html",
    "dojo/i18n!../nls/strings",
    "./ItemCard",
    "./util"
  ],
  function(declare, array, SearchComponent, template, i18n, ItemCard, util) {

    return declare([SearchComponent], {

      i18n: i18n,
      templateString: template,

      postCreate: function() {
        this.inherited(arguments);
      },

      addItem: function(itemCard) {
        itemCard.placeAt(this.itemsNode);
      },

      destroyItems: function() {
        this.noMatchNode.style.display = "none";
        this.noMatchNode.innerHTML = "";
        this.destroyDescendants(false);
      },

      showNoMatch: function() {
        util.setNodeText(this.noMatchNode, i18n.search.resultsPane.noMatch);
        this.noMatchNode.style.display = "block";
      },

      /* SearchComponent API ============================================= */

      processResults: function(searchResponse) {
        this.destroyItems();
        var results = searchResponse.results;
        if (results && results.length > 0) {
          var idsAdded = util.findLayersAdded(this.getMap(), null).itemIds;
          array.forEach(searchResponse.results, function(result) {
            //console.warn(result.id,idsAdded);
            this.addItem(new ItemCard({
              item: result,
              canRemove: (idsAdded.indexOf(result.id) !== -1),
              resultsPane: this
            }));
          }, this);
        } else {
          this.showNoMatch();
        }
      }

    });

  });