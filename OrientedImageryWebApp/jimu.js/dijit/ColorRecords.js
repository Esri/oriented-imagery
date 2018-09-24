///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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

define(['dojo/Evented',
  'dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/on',
  'dojo/query',
  'dojo/_base/Color',
  'dojo/cookie',
  'dojo/text!./templates/ColorRecords.html'
],
  function (Evented, declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    lang, html, on, query, Color, cookie, template) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, Evented], {
      templateString: template,
      baseClass: 'jimu-color-records',
      declaredClass: 'jimu.dijit.ColorRecords',
      uid: "",
      recordsLength: 10,
      colorList: null,

      postCreate: function () {
        this.inherited(arguments);
        this.colorList = [];

        this._createCoustomRecord();

        if (this.uid === "") {
          this.uid = "wab_colorRecords";
        }
        this.refresh();
        ////////////////////////////////////////////////////////////
        //TODO test data
        // this.colorList.push(new Color({ "r": 68, "g": 116, "b": 199, "a": 1 }));
        // this.colorList.push(new Color({ "r": 59, "g": 189, "b": 100, "a": 1 }));
        // this.colorList.push(new Color({ "r": 233, "g": 47, "b": 47, "a": 1 }));
        // this.colorList.push(new Color({ "r": 243, "g": 139, "b": 139, "a": 1 }));
        // this.colorList.push(new Color({ "r": 243, "g": 112, "b": 112, "a": 1 }));
        // this.colorList.push(new Color({ "r": 235, "g": 66, "b": 66, "a": 1 }));
        // this.colorList.push(new Color({ "r": 151, "g": 255, "b": 247, "a": 1 }));
        // this.colorList.push(new Color({ "r": 145, "g": 216, "b": 124, "a": 1 }));
        // this.colorList.push(new Color({ "r": 108, "g": 219, "b": 143, "a": 1 }));
        // this.colorList.push(new Color({ "r": 94, "g": 141, "b": 190, "a": 1 }));
        // this._setColors();
        ////////////////////////////////////////////////////////////
      },

      push: function (color) {
        this.colorList.unshift(color);
        if (this.colorList.length > this.recordsLength) {
          this.colorList.pop();
        }

        this._setColors();
      },
      selecteColor: function (color) {
        //selected style
        var newColor = new Color(color);
        var td = null;
        var tds = query("td", this.domNode);
        //clean selected
        for (var i = 0, len = tds.length; i < len; i++) {
          html.removeClass(tds[i], "dijitPaletteCellSelected");
        }
        //find td
        for (i = 0, len = tds.length; i < len; i++) {
          if (newColor.toString() === html.getAttr(tds[i], "title")) {
            td = tds[i];
            break;
          }
        }
        //set color
        if (td) {
          html.addClass(td, "dijitPaletteCellSelected");
          this.onChoose(newColor);
        }
      },
      refresh: function(){
        this._getCookie(this.uid);
        this._setColors();
      },

      _setColors: function () {
        for (var i = 0; i < this.recordsLength; i++) {
          var src = this["record" + i];
          if (src && this.colorList[i] && this.colorList[i].toString) {
            var color = this.colorList[i].toString();
            html.setAttr(src, "title", color);

            var img = this._findImg(src);
            html.setStyle(img, "background-color", color);
            html.setAttr(img, "alt", color);
            html.setAttr(img, "title", color);
          }
        }
        this._setCookie(this.uid);
      },

      _createCoustomRecord: function () {
        for (var i = 0; i < this.recordsLength; i++) {
          this["record" + i] = html.create('td', {
            'class': 'dijitPaletteCell',
            'tabindex': i,
            'title': "",
            'role': "gridcell"
          }, this.container);
          var span = html.create('span', {
            'class': 'dijitInline dijitPaletteImg'
          }, this["record" + i]);
          html.create('img', {
            'class': "dijitColorPaletteSwatch",
            'src': require.toUrl("dojo/resources/blank.gif"),
            //"alt": "",
            //"title": "",
            "style": "background-color: #ffffff"
          }, span);

          this.own(on(this["record" + i], 'click', lang.hitch(this, this.onRecordClick)));
        }
      },

      onRecordClick: function (evt) {
        var color = "";
        var src = evt.srcElement || evt.targe || evt.currentTarget;

        var img = this._findImg(src);
        if (img) {
          color = html.getStyle(img, "background-color");
          color = new Color(color).toString();
          //console.log("color==>" + color);
          this.onChoose(color);
        }
      },
      onChoose: function (color) {
        this.emit("choose", color);
      },

      _findImg: function (src) {
        var img = null;
        if (src.nodeName && "IMG" === src.nodeName.toUpperCase()) {
          return src;
        } else {
          img = query('.dijitColorPaletteSwatch', src)[0];
          return img;
        }
      },

      _setCookie: function (uid) {
        var cookieList = [];
        for (var i = 0, len = this.recordsLength; i < len; i++) {
          var one = this.colorList[i];
          if (one && one.toString) {
            cookieList[i] = one.toString();
          }
        }
        this._cleanCookie(uid);

        try {
          var cookieListStr = JSON.stringify(cookieList);
          cookie(uid, cookieListStr, {
            expires: 1000,
            path: '/'
          });
        } catch (error) {
          console.error('ColorRecords: cookieList JSON.stringify error.' + error.stack);
        }
      },
      _getCookie: function (uid) {
        var cookieList = cookie(uid);
        if ("undefined" === typeof cookieList) {
          return;
        }

        try {
          var cookieListArry = JSON.parse(cookieList);
          if (cookieListArry && "undefined" !== typeof cookieListArry.length) {
            for (var i = 0, len = this.recordsLength; i < len; i++) {
              var one = cookieListArry[i];
              if (one && one.toString) {
                this.colorList[i] = new Color(one.toString());
              }
            }
          }
        } catch (error) {
          console.error('ColorRecords: cookieList JSON.parse error.' + error.stack);
        }
      },
      _cleanCookie: function (uid) {
        cookie(uid, null, { expires: -1 });
      }
    });
  });