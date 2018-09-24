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
    "dojo/number",
    "./SearchComponent",
    "dojo/text!./templates/ResultCount.html",
    "dojo/i18n!../nls/strings",
    "./util"
  ],
  function(declare, number, SearchComponent, template, i18n, util) {

    var oThisClass = declare([SearchComponent], {

      i18n: i18n,
      templateString: template,

      typePlural: i18n.search.resultCount.itemPlural,
      typeSingular: i18n.search.resultCount.itemSingular,

      postCreate: function() {
        this.inherited(arguments);
      },

      /* SearchComponent API ============================================= */

      processResults: function(searchResponse) {
        var nHits = searchResponse.total;
        var sType = this.typePlural;
        if (nHits === 1) {
          sType = this.typeSingular;
        }
        var s = this.i18n.search.resultCount.countPattern;
        s = s.replace("{count}", number.format(nHits));
        s = s.replace("{type}", sType);
        util.setNodeText(this.messageNode, s);
      }

    });

    return oThisClass;
  });