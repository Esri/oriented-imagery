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

define(['dojo/_base/declare',
  'dijit/_WidgetBase',
  'dijit/_TemplatedMixin',
  'dijit/_WidgetsInTemplateMixin',
  'dojo/_base/lang',
  'dojo/_base/html',
  'dojo/on',
  'dojo/_base/Color',
  'dojo/query',
  "jimu/dijit/EditorColorPalette",
  'jimu/dijit/ColorPicker',
  'jimu/dijit/ColorRecords',
  'dijit/popup',
  'jimu/utils'
],
  function (declare, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin,
    lang, html, on, Color, query,
    DojoColorPalette, JimuColorPicker, ColorRecords, dojoPopup, jimuUtils) {
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
      templateString: "<div></div>",
      baseClass: 'jimu-color-palette',
      declaredClass: 'jimu.dijit.ColorPalette',
      _TRANSPARENT_STR: "rgba(0, 0, 0, 0)",

      value: "",//dojoColor
      appearance: {
        showTransparent: true,
        showColorPalette: true,
        showCoustom: true,
        showCoustomRecord: true
      },
      recordUID: "",//uid for colorRecords

      postMixInProperties: function () {
        this.nls = window.jimuNls.colorPalette;
      },

      postCreate: function () {
        this.inherited(arguments);

        //default color
        if (this.value) {
          this.value = new Color(this.value);
        } else {
          this.value = new Color('#fff');
        }

        this._createContent();
      },
      _createContent: function () {
        var tooltipDialogContent = html.create("div", { "class": "jimu-colorpalette" }, this.domNode);

        if (this.appearance.showTransparent) {
          this._createSpecialColors(tooltipDialogContent);
        }
        if (this.appearance.showColorPalette) {
          this._createDojoColorPalette(tooltipDialogContent);
        }
        if (this.appearance.showCoustom) {
          this._createJimuColorPicker(tooltipDialogContent);
        }
        if (this.appearance.showCoustom && this.appearance.showCoustomRecord) {
          this._createCoustomRecord(tooltipDialogContent);
        }
      },
      setColor: function (newColor, isOnChange, force) {
        if (!this._isColorEqual(newColor) || force) {
          this.value = new Color(newColor);

          this._setSpatialColor(this.value);
          if ("undefined" !== typeof this.value.a && 0 === this.value.a) {
            //"transparent"
            this.palette.set('value', new Color('transparent'));
            this.picker.setColor(new Color("#fff"), false);//set white color for picker, as "transparent"

            if ("undefined" === typeof isOnChange || true === isOnChange) {
              this.onChange(this.value);
            }
          } else {
            //not "transparent"
            this.picker.setColor(this.value, false);
            this.palette.set('value', this.value.toHex());//hex work,only

            if ("undefined" === typeof isOnChange || true === isOnChange) {
              this.onChange(this.value.toHex());
            }
          }

          if (this.colorRecords) {
            this.colorRecords.selecteColor(this.value);
          }
        }
      },
      getColor: function () {
        return this.value;
      },
      refreshRecords: function () {
        if (this.colorRecords) {
          this.colorRecords.refresh();
        }
      },
      destroy: function () {
        dojoPopup.close(this.tooltipDialog);
        this.picker.destroy();
        this.inherited(arguments);
      },

      //1.SpecialColors
      _createSpecialColors: function (tooltipDialogContent) {
        var specialColorDom = html.create("div", {
          "class": "special-color"
        }, tooltipDialogContent);

        this.transparentBtn = html.create("div", {
          "class": "transparent btn",
          innerHTML: '<div class="btn-wapper"><div class="transparent icon jimu-float-leading"></div>' +
          '<div class="transparent text jimu-float-leading">' + this.nls.transparent + '</div></div>'
        }, specialColorDom);

        this.own(on(this.transparentBtn, 'click', lang.hitch(this, this._onTransparentClick)));
      },
      _onTransparentClick: function () {
        this.setColor(new Color("transparent"));
      },
      _setSpatialColor: function (color) {
        if (this.transparentBtn) {
          var wapper = query(".btn-wapper",this.transparentBtn)[0];
          html.removeClass(wapper, "selected");
          if (color && color.toString) {
            var isTransparent = (color.toString() === this._TRANSPARENT_STR);
            if (isTransparent) {
              html.addClass(wapper, "selected");
            }
          }
        }
      },

      //2. DojoColorPalette
      _createDojoColorPalette: function (tooltipDialogContent) {
        this.palette = new DojoColorPalette({});
        this.palette.placeAt(tooltipDialogContent);
        this.own(on(this.palette, 'change', lang.hitch(this, function (colorStr) {
          var color = new Color(colorStr);
          this.setColor(color);
        })));
      },

      //3. JimuColorPicker
      _createJimuColorPicker: function (tooltipDialogContent) {
        this.coustomtBtn = html.create("div", {
          "class": "coustom btn"
        }, tooltipDialogContent);

        var customColorHtml = '<div class="btn-wapper"><div class="custom icon jimu-float-leading"></div>' +
          '<div class="custom text jimu-float-leading">' + this.nls.custom + '</div></div>';
        this.picker = new JimuColorPicker({
          ensureMode: true,
          showOk: false,
          showLabel: false,
          value: this.value.toHex(),
          onChange: lang.hitch(this, function (colorHex) {
            //JimuColorPicker use hex or RGB only, can't use Rgba
            var color = new Color(colorHex);
            this.setColor(color);

            if (this.colorRecords && this.colorRecords.push) {
              this.colorRecords.push(color);
            }
          })
        });
        this.picker.placeAt(this.coustomtBtn);
        this.picker.setLabel(customColorHtml);//icon + text
        this.picker.setColor(this.value, false);
      },

      //4. CoustomRecord
      _createCoustomRecord: function (tooltipDialogContent) {
        this.colorRecords = new ColorRecords({
          recordsLength: 10,
          uid: this.recordUID || ""
        });
        this.colorRecords.placeAt(tooltipDialogContent);

        this.own(on(this.colorRecords, 'choose', lang.hitch(this, function (color) {
          this.setColor(new Color(color));
        })));
      },

      ///////////////////////////////////////////////////////////////////////////////
      _isColorEqual: function (newColor) {
        if (this.value.toString() === new Color(newColor).toString()) {
          return true;
        } else {
          return false;
        }
      },
      _changeLabel: function (newColor) {
        html.empty(this.domNode);
        html.create('span', {
          innerHTML: newColor.toHex(),
          className: "color-label",
          style: {
            color: jimuUtils.invertColor(newColor.toHex())
          }
        }, this.domNode);
      }
      //,
      //onChange: function (newColor) {
      /*jshint unused: false*/
      // if (this.showColorInBG) {
      //   html.setStyle(this.domNode, 'backgroundColor', newColor.toString());
      // }
      // if (this.showLabel) {
      //   this._changeLabel(newColor);
      // }
      //}
    });
  });