///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
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
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/_base/html',
    'dojo/topic',
    'dojo/aspect',
    'dojo/Deferred',
    'dojo/query','dojo/dom-class',
    'dojo/NodeList-dom',
    'dojo/NodeList-manipulate',
    'dojo/on',
    'dojo/mouse',
    'dojo/dom-attr',
    'dojo/dom-construct','dojo/dom-style',
    'dojo/dom-geometry',
    'dijit/registry',
    'jimu/BaseWidget',
    'jimu/PoolControllerMixin',
    'jimu/tokenUtils',
    'jimu/portalUtils',
    'jimu/portalUrlUtils',
    'jimu/utils',
    'jimu/dijit/Message',
    './PopupTileNodes',
    'dijit/Tooltip'
  ],
  function(declare, lang, array, html, topic, aspect, Deferred, query,domClass, nld, nlm, on, mouse, domAttr,
    domConstruct, domStyle,domGeometry, registry, BaseWidget, PoolControllerMixin, tokenUtils, portalUtils,
    portalUrlUtils, utils, Message, PopupTileNodes,
    Tooltip) {
    /* global jimuConfig */
    /* jshint scripturl:true */
    var clazz = declare([BaseWidget, PoolControllerMixin], {

      baseClass: 'jimu-widget-header-controller jimu-main-bgcolor',

      maxIconCount: -1,

      //whether need to create more icon
      createMoreIcon: false,
independentWidgets: [],
      //title, links are switchable depends the browser width
      switchableElements: {},

      //the default height of the widget
      height: 40,

      //the opened group/widget's id
      openedId: '',
      _lastOpenId: '',

      postCreate: function() {
        this.inherited(arguments);

        this._processGroupSetting();

        this.switchableElements.title = this.titleNode;
        this.switchableElements.links = this.linksNode;
        this.switchableElements.subtitle = this.subtitleNode;

        if (this.position && this.position.height) {
            
          this.height = this.position.height;
        }

        // if (!this.appConfig.portalUrl) {
        html.setStyle(this.signInSectionNode, 'display', 'none');
        // } else {
        //   html.setStyle(this.signInSectionNode, 'display', '');
        // }

        html.setAttr(
          this.logoNode,
          'src',
          this.appConfig.logo ? this.appConfig.logo : this.folderUrl + 'images/app-logo.png'
        );
        this.switchableElements.title.innerHTML = this.appConfig.title ? this.appConfig.title : '';
        this.switchableElements.subtitle.innerHTML = this.appConfig.subtitle ?
          this.appConfig.subtitle : '';

        this._createDynamicLinks(this.appConfig.links);
        if (this.appConfig.about) {
          html.setStyle(this.aboutNode, 'display', '');
          this.aboutNode.visible = true;
        } else {
          html.setStyle(this.aboutNode, 'display', 'none');
          this.aboutNode.visible = false;
        }

        this._setElementsSize();
        this.createAppTitle();
        this.own(on(this.domNode, mouse.enter, lang.hitch(this, function() {
          var title = '';
          var portalUrl = this.appConfig && this.appConfig.portalUrl || '';
          var server = portalUrlUtils.getServerByUrl(portalUrl);
          if (portalUrlUtils.isArcGIScom(server)) {
            server = 'ArcGIS.com';
          }
          if (server) {
            title = this.nls.signInTo + ' ' + server;
          }
          this.signinLinkNode.title = title;
        })));
      },

      startup: function() {
        this.inherited(arguments);
        this.resize();
        // this.timeoutHandle = setTimeout(lang.hitch(this, this.resize), 100);
      },
      createAppTitle: function() {
          var titleHeader = domConstruct.toDom('<div style="font-size: 25px; position: relative;  color: white; font-weight: bold;background-color: transparent;left:10px">'+this.appConfig.title+'</div>');
          domConstruct.place(titleHeader, "jimu-layout-manager", "after");
      },
      onAction: function(action, data) {
        /*jshint unused: false*/
        if (action === 'highLight' && data) {
          var node = query('div[settingid="' + data.widgetId + '"]')[0];
          
          this._highLight(node);
        }
       
        if (action === 'removeHighLight') {
          this._removeHighLight();
        }
      },

      resize: function() {
        var headerNodeFloat = html.getStyle(this.headerNode, 'float');
        var logoNodeFloat = html.getStyle(this.logoNode, 'float');
        var titlesNodeFloat = html.getStyle(this.titlesNode, 'float');
        var linksNodeFloat = html.getStyle(this.linksNode, 'float');
        var allHasFloatStyle = (headerNodeFloat && headerNodeFloat !== 'none') &&
          (logoNodeFloat && logoNodeFloat !== 'none') &&
          (titlesNodeFloat && titlesNodeFloat !== 'none') &&
          (linksNodeFloat && linksNodeFloat !== 'none');
        
        if (allHasFloatStyle) {
          this._resize();
        } else {
          setTimeout(lang.hitch(this, this.resize), 200);
        }
      },

      _resize: function() {
          
        var box = html.getContentBox(this.domNode);
 
 
        //by default, we show all elements
        this._showSwitchableElements(['title', 'links', 'subtitle']);

        // this.timeoutHandle = setTimeout(lang.hitch(this, function(){
        //   this._createIconNodes(box);
        // }), 50);

        this._createIconNodes(box);
      
        if (this.morePane) {
          html.setStyle(this.morePane.domNode, utils.getPositionStyle(this._getMorePanelSize()));
          this.morePane.resize();
        }
        
        if (this.popupLinkNode) {
          html.setStyle(jimuConfig.layoutId, {
            left: html.getContentBox(this.popupLinkNode).w + 'px'
          });
        }
      },

      destroy: function() {
        if (this.timeoutHandle) {
          clearTimeout(this.timeoutHandle);
          this.timeoutHandle = null;
        }
        if (this.morePane) {
          this.morePane.destroy();
        }
        this.inherited(arguments);
      },

      onAppConfigChanged: function(appConfig, reason, changedData) {
        switch (reason) {
          case 'attributeChange':
            this._onAttributeChange(appConfig, changedData);
            break;
          default:
            return;
        }
        this.resize();
      },

      getOpenedIds: function() {
          this.inherited(arguments);
        if (this.openedId === '') {
          return [];
        }
        return [this.openedId];
      },

      setOpenedIds: function(ids) {
          
        if (ids.length === 0) {
          return;
        }
        this.openedId = ids[0];
        var config = this.getConfigById(this.openedId);
        if (!config) {
          return;
        }
        if (config.widgets && config.openType === 'openAll') {
          this._showIconContent(config);
        } else if (!config.widgets) {
          this._showIconContent(config);
        }
      },

      _highLight: function(node) {
         
        if (this.hlDiv) {
          this._removeHighLight();
        }
        if (!node) {
          return;
        }
        var position = domGeometry.getMarginBox(node);
        var hlStyle = {
          position: 'absolute',
          left: (position.l) + 'px',
          top: (position.t) + 'px',
          width: (position.w) + 'px',
          height: (position.h) + 'px'
        };
        this.hlDiv = domConstruct.create('div', {
          "style": hlStyle,
          "class": 'icon-highlight'
        }, node, 'before');
      },

      _removeHighLight: function() {
        if (this.hlDiv) {
          domConstruct.destroy(this.hlDiv);
          this.hlDiv = null;
        }
      },


      _onAttributeChange: function(appConfig, changedData) {
        if (changedData.title !== undefined && changedData.title !== this.appConfig.title) {
          this.titleNode.innerHTML = changedData.title;
        }
        if (changedData.subtitle !== undefined &&
          changedData.subtitle !== this.appConfig.subtitle) {
          this.subtitleNode.innerHTML = changedData.subtitle;
        }
        if (changedData.logo) {
          html.setAttr(this.logoNode, 'src', changedData.logo);
        }
        if (changedData.links) {
          this._createDynamicLinks(changedData.links);
        }
      },

      _setElementsSize: function() {
        html.setStyle(this.logoNode, {
          height: '30px',
          minWidth: '30px',
          marginTop: ((this.height - 30) / 2) + 'px'
        });

        html.setStyle(this.titleNode, {
          lineHeight: this.height + 'px'
        });

        html.setStyle(this.subtitleNode, {
          lineHeight: this.height + 'px'
        });

        query('.link', this.domNode).style({
          lineHeight: this.height + 'px'
          
        });
        
      },

      _processGroupSetting: function() {
        function getOpenType(gLabel) {
          for (var i = 0; i < this.config.groupSetting.length; i++) {
            if (this.config.groupSetting[i].label === gLabel) {
              return this.config.groupSetting[i].type;
            }
          }
          //this is the default open type
          return 'openAll';
        }
        array.forEach(this.appConfig.widgetPool.groups, function(g) {
          g.openType = getOpenType.call(this, g.label);
        }, this);
      },

      _createDynamicLinks: function(links) {
        if (window.isRTL){
          var _links = [];
          array.forEach(links, function(link){
            _links.unshift(link);
          });
          links = _links;
        }
        html.empty(this.dynamicLinksNode);
        array.forEach(links, function(link) {
          html.create('a', {
            href: link.url,
            target: '_blank',
            innerHTML: link.label,
            'class': "link jimu-align-leading jimu-leading-margin1",
            style: {
              lineHeight: this.height + 'px'
            }
          }, this.dynamicLinksNode);
        }, this);
      },

      _showSwitchableElements: function(showElement) {
        var es = this.switchableElements;

        for (var p in es) {
          if (es.hasOwnProperty(p)) {
            if (showElement.indexOf(p) > -1) {
              html.setStyle(es[p], 'display', 'block');
              es[p].visible = true;
            } else {
              html.setStyle(es[p], 'display', 'none');
              es[p].visible = false;
            }
          }
        }
        //links is hidden
       
        if (this.logoClickHandle) {
          this.logoClickHandle.remove();
        }

        if (showElement.indexOf('links') < 0) {
          this.logoClickHandle = on(this.logoNode, 'click', lang.hitch(this, this._onLogoClick));
          // html.setStyle(this.logoNode, {
          //   cursor: 'pointer'
          // });
        } else {
          if (this.popupLinksVisible) {
            this._hidePopupLink();
          }
          html.setStyle(this.logoNode, {
            cursor: 'default'
          });
        }
      },

      _switchSignin: function() {
        var credential = tokenUtils.getPortalCredential(this.appConfig.portalUrl);
        if (credential) {
          this.onSignIn(credential);
        } else {
          this.onSignOut();
        }
      },

      _onLogoClick: function() {
        // return;
        if (this.popupLinkNode) {
          html.destroy(this.popupLinkNode);
          // this._switchSignin();
        }
        this.popupLinkNode = this._createPopupLinkNode();

        if (this.popupLinksVisible) {
          this._hidePopupLink();
        } else {
          this._showPopupLink();
        }
      },

      _hidePopupLink: function() {
        html.setStyle(this.popupLinkNode, 'display', 'none');

        if (window.isRTL) {
          html.setStyle(jimuConfig.layoutId, {
            right: 0
          });
        } else {
          html.setStyle(jimuConfig.layoutId, {
            left: 0
          });
        }

        this.popupLinksVisible = false;
      },

      _showPopupLink: function() {
        html.setStyle(this.popupLinkNode, 'display', '');

        if (window.isRTL) {
          html.setStyle(jimuConfig.layoutId, {
            right: html.getContentBox(this.popupLinkNode).w + 'px'
          });
        } else {
          html.setStyle(jimuConfig.layoutId, {
            left: html.getContentBox(this.popupLinkNode).w + 'px'
          });
        }

        this.popupLinksVisible = true;
      },

      _createPopupLinkNode: function() {
        var node, titleNode, box;
        box = html.getContentBox(jimuConfig.mainPageId);

        node = html.create('div', {
          'class': 'popup-links jimu-main-bgcolor',
          style: {
            position: 'absolute',
            zIndex: 100,
            top: 0,
            bottom: 0
          }
        }, jimuConfig.mainPageId);

        if (window.isRTL) {
          html.setStyle(node, {
            right: 0,
            left: '50px'
          });
        } else {
          html.setStyle(node, {
            left: 0,
            right: '50px'
          });
        }

        titleNode = html.create('div', {
          'class': 'popup-title',
          style: {
            height: this.height + 'px',
            width: '100%'
          }
        }, node);

        html.create('img', {
          'class': 'logo jimu-float-leading jimu-leading-margin1',
          src: this.appConfig.logo ? this.appConfig.logo : this.folderUrl + 'images/app-logo.png',
          style: {
            width: '30px',
            height: '30px',
            marginTop: ((this.height - 30) / 2) + 'px'
          }
        }, titleNode);

        html.create('div', {
          'class': 'title jimu-float-leading jimu-leading-margin1',
          innerHTML: this.appConfig.title,
          style: {
            lineHeight: this.height + 'px'
          }
        }, titleNode);

        array.forEach(this.appConfig.links, function(link) {
          this._createLinkNode(node, link, false);
        }, this);

        // this.popupSigninNode = this._createLinkNode(node, {
        //   label: 'SignIn',
        //   url: '#'
        // }, true);
        // this.popupUserNameNode = this._createLinkNode(node, {
        //   label: '',
        //   url: '#'
        // }, true);
        // this.popupSignoutNode = this._createLinkNode(node, {
        //   label: 'SignOut',
        //   url: '#'
        // }, true);

        // this.own(on(this.popupSigninNode, 'click', lang.hitch(this, '_onSigninClick')));
        // this.own(on(this.popupSignoutNode, 'click', lang.hitch(this, '_onSignoutClick')));

        //empty
        this._createLinkNode(node, {
          label: '',
          url: '#'
        }, false);
        return node;
      },

      _createLinkNode: function(containerNode, link, isSign) {
        var node, lineNode, linkSectionNode, className;

        node = html.place('<div class="link"></div>', containerNode);

        lineNode = html.place('<div class="line"></div>', node);
        if (isSign) {
          className = 'link-section signin';
        } else {
          className = 'link-section';
        }
        linkSectionNode = html.place('<div class="' + className + '"></div>', node);
        html.create('a', {
          href: link.url,
          target: '_blank',
          innerHTML: link.label,
          title: link.label,
          style: {
            lineHeight: '66px'
          }
        }, linkSectionNode);

        return node;
      },

      _onSigninClick: function() {
        tokenUtils.signInPortal(this.appConfig.portalUrl, this.appConfig.appId);
      },

      _onSignoutClick: function() {
        var isDepolyedApp = !this.appConfig.mode;

        if (isDepolyedApp) {
          //tokenUtils.signOutPortal(this.appConfig.portalUrl);
          tokenUtils.signOutAll();
        } else {
          new Message({
            message: this.nls.cantSignOutTip
          });
        }
      },

      _onAboutClick: function() {
        var widgetConfig = {
          id: this.appConfig.about + '_1',
          uri: this.appConfig.about,
          label: 'About'
        };
        this.widgetManager.loadWidget(widgetConfig).then(lang.hitch(this, function(widget) {
          html.place(widget.domNode, jimuConfig.mainPageId);
          widget.startup();
        }));
      },

      _onUserNameClick: function() {

      },

      _getHeaderSectionWidth: function() {
        var width;
        width = html.getMarginBox(this.headerNode).w;
        return width;
      },

      _getContainerWidth: function(box) {
        var headSectionWidth = this._getHeaderSectionWidth();
        //the container width
        var containerWidth = box.w - headSectionWidth - this._getEmptyWidth(box);

        return containerWidth;
      },

      _calcContainerAndEmptyWidth: function(box) {
        var containerWidth = this._getContainerWidth(box);
        var emptyWidth = this._getEmptyWidth(box);
        //here, we need put at least two icons
        if (containerWidth < this.iconWidth * 2) {
          if (this.switchableElements.subtitle.visible) {
            //hiden subtitle first
            this._showSwitchableElements(['title', 'links']);
            containerWidth = this._getContainerWidth(box);

            if (containerWidth < this.iconWidth * 2) {
              //hiden the title, subtitle, links
              this._showSwitchableElements([]);
              containerWidth = this._getContainerWidth(box);

              if (containerWidth < this.iconWidth * 2) {
                //all of the elements is hidden,
                // but the it's still can hold two icons(too small screen???),
                //use the empty space
                //the emptyWidth may be negative

                emptyWidth = emptyWidth - (this.iconWidth * 2 - containerWidth);
                containerWidth = this.iconWidth * 2;
                this._getContainerWidth(box);
              }
            }
          } else {
            //hiden the title, subtitle, links
            this._showSwitchableElements([]);
            containerWidth = this._getContainerWidth(box);
            if (containerWidth < this.iconWidth * 2) {
              //all of the elements is hidden,
              // but the it's still can hold two icons(too small screen???),
              //use the empty space
              //the emptyWidth may be negative
              emptyWidth = emptyWidth - (this.iconWidth * 2 - containerWidth);
              containerWidth = this.iconWidth * 2;
            }
          }
        }
        // console.log('containerWidth: %f, emptyWidth: %f', containerWidth, emptyWidth);
        return {
          containerWidth: containerWidth,
          emptyWidth: emptyWidth
        };
      },

      _getEmptyWidth: function(box) {
        return 1 / 10 * box.w;
      },

      _createIconNodes: function(box) {
         
        html.empty(this.containerNode);
        this._closeDropMenu();
         var checkUrl = window.location.href;
                    var parameters = window.location.href.split("?");
                   if(parameters[1]){
                       if(parameters[1].split("=")[0] === "story"){
                         ;
       //domStyle.set(this.containerNode,"display","none");
       
         domClass.add(this.domNode,"jimu-panel1");
       
     }}
        
        var i, iconConfig, allIconConfigs = this.getAllConfigs();

        this.headerIconCount = allIconConfigs.length;

        var openAtStartNode;
        var nodes = [];

        for (i =0; i < this.headerIconCount; i++) {
          iconConfig = allIconConfigs[i];
  
          var node = this._createIconNode(iconConfig);

          if (iconConfig.openAtStart) {
            openAtStartNode = node;
            
          }

          nodes.push(node);
        }
        //open the first openatstart widget
        if (openAtStartNode && !this.openAtStartWidget) {
          this._onIconClick(openAtStartNode);
          this.openAtStartWidget = openAtStartNode.config.name;
          this.openedId = openAtStartNode.config.id;
        }

        // attach tooltip
        new Tooltip({
            connectId: nodes,
            position: ['after'],
            getContent: function (matchedNode) {
              return "<span class='tooltip-title'>"+matchedNode.config.label+"</span>";
            }
        });
      
      },

      _createIconNode: function(iconConfig) {
         
        var node, iconUrl;
        iconUrl = iconConfig.icon;
        labelText = iconConfig.label;

        node = html.create('div', {
          'class': 'icon-node',
         // title: iconConfig.label,
          settingId: iconConfig.id,
        }, this.containerNode);

        if(iconUrl !== 'null'){
          html.create('img', {
            src: iconUrl,
          }, node);
        }else{
          html.create('span', {
            innerHTML: labelText,
          }, node);
        }

          on(node, 'click', lang.hitch(this, function() {
            this._onIconClick(node);
          }));

        node.config = iconConfig;

        //set current open node
        
        if (this.openedId === iconConfig.id) {
         
          html.addClass(node, 'jimu-state-selected');
          if (node.config.widgets && node.config.widgets.length > 1 &&
            node.config.openType === 'dropDown') {
       
            this._openDropMenu(node);
          }
        }
        if(this.independentWidgets.length > 0){
           
            for(var a in this.independentWidgets) {
                if(this.independentWidgets[a] === iconConfig.id){
                    html.addClass(node,'jimu-state-selected');
                    break;
                }
            }
        }

        return node;
      },

      _onIconClick: function(node) {
        if (this.openedId) {
          this._lastOpenId = this.openedId;
        }
        
       if(node.config.id === "_28" || node.config.id === "_30" ||node.config.id === "_32" || node.config.id === "_40" || node.config.id === "_50" || node.config.id === "_60"){
     if(domClass.contains(node,"jimu-state-selected")){
        
     for(var a = this.independentWidgets.length - 1;a>=0;a--){
         if(this.independentWidgets[a] === node.config.id){
            
             this.independentWidgets.splice(a,1);break;}
     }
                  this._switchNodeToClose(node.config.id);
 }
 else{
     var temp;
     for(var a=0;a < this.independentWidgets.length;a++){
     if(this.independentWidgets[a] === node.config.id)
     {
         temp = true; break;
     }else
         temp= false;}
     if(!temp)
                      this.independentWidgets.push(node.config.id);
     this._switchNodeToOpen(node.config.id);
 
              } }else{
       
        if (!node.config.widgets || node.config.widgets.length === 1 ||
          node.config.openType === 'openAll') {
          //widget or group with 'openAll' open type
          
          if (this.openedId && this.openedId === node.config.id) {
            
                  this._switchNodeToClose(this._lastOpenId);
            return;
          } else {
            if (this.openedId) {
          
                      this._switchNodeToClose(this.openedId).then(lang.hitch(this, function() {
              
                this._closeDropMenu();
                this._switchNodeToOpen(node.config.id);
               
              }));
            } else {
              
              this._switchNodeToOpen(node.config.id);
            }
          }
        } else {
           
          if (this.openedId && this.openedId === node.config.id) {
            this.openedId = '';
            this._closeDropMenu();
          } else {
            this.openedId = node.config.id;
            this._closeDropMenu();
            this._openDropMenu(node);
          }
        }
    }
      },

      _closeDropMenu: function() {
        if (this.dropMenuNode) {
          html.destroy(this.dropMenuNode);
          this.dropMenuNode = null;
        }
      },

      _openDropMenu: function(pnode) {
        this.dropMenuNode = html.create('div', {
          'class': 'jimu-drop-menu',
          title: pnode.config.label,
          style: {
            position: 'absolute',
            zIndex: '101'
          }
        });

        html.place(this.dropMenuNode, this.containerNode);

        this._setDropMenuPosition(pnode);

        array.forEach(pnode.config.widgets, function(widgetConfig) {
          this._createDropMenuItem(widgetConfig);
        }, this);

        if (this.morePane) {
          this.morePane.hide();
        }
      },

      _createDropMenuItem: function(sconfig) {
        var node = html.create('div', {
          'class': 'menu-item',
          title: sconfig.label,
          style: {
            height: this.height + 'px'
          }
        }, this.dropMenuNode);

        html.create('img', {
          'class': 'jimu-float-leading',
          src: sconfig.icon
        }, node);

        html.create('div', {
          'class': 'label jimu-float-leading',
          innerHTML: sconfig.label
        }, node);

        this.own(on(node, 'click', lang.hitch(this, function() {
          this._closeDropMenu();
          this._switchNodeToClose(this._lastOpenId).then(lang.hitch(this, function() {
            this._showIconContent(node.config);
          }));
        })));
        node.config = sconfig;
        return node;
      },

      _setDropMenuPosition: function(pnode) {
        var position = {},
          box = html.getMarginBox(pnode),
          thisBox = html.getMarginBox(this.domNode),
          right = thisBox.w - box.l - box.w;
        position.top = this.height + 1;

        if (window.isRTL){
          position.right = thisBox.w - right - box.w;
        }else {
          position.right = right;
        }
        html.setStyle(this.dropMenuNode, utils.getPositionStyle(position));
      },

      _switchNodeToOpen: function(id) {
        var node = this._getIconNodeById(id);
        
  //  if(!this.flagChange){
        /*  query('.icon-node', this.domNode).forEach(function(nodes){
           if(nodes.title !== "Change Detection"){
         domClass.remove(nodes,'jimu-state-selected');
         
      }
        });*/
  //  } 
        //query('.icon-node', this.domNode).removeClass('jimu-state-selected');
    
    html.addClass(node, 'jimu-state-selected');
        this._showIconContent(node.config);
      },

      _switchNodeToClose: function(id) {
       query('.icon-node', this.domNode).forEach(function(nodes){
           if(nodes.settingid === id){
       
                domClass.remove(nodes,'jimu-state-selected');
       }
        });
        
        return this.panelManager.closePanel(id + '_panel');
      },

      _getIconNodeById: function(id) {
        var node = query('.icon-node[settingId="' + id + '"]', this.domNode);
        if (node.length === 0) {
          return;
        }
        return node[0];
      },

      _onPanelClose: function(id) {
       query('.icon-node[settingId="' + id + '"]', this.domNode)
          .removeClass('jimu-state-selected');
   for(var a = this.independentWidgets.length - 1;a>=0;a--){
         if(this.independentWidgets[a] === id){
             this.independentWidgets.splice(a,1);break;}
     }
   if(id !== "_28" && id !== "_30" && id !== "_40" && id !== "_32" && id !== "_50" && id !== "_60")
        this.openedId = '';
      },

      _showIconContent: function(iconConfig) {
        this.panelManager.showPanel(iconConfig).then(lang.hitch(this, function(panel) {
            if(iconConfig.id !== "_28" && iconConfig.id !== "_30" && iconConfig.id !== "_32" && iconConfig.id !== "_40" && iconConfig.id !== "_50" && iconConfig.id !== "_60")
          this.openedId = iconConfig.id;
          this.own(aspect.after(panel, 'onClose', lang.hitch(this, function() {
            this._onPanelClose(iconConfig.id);
            
          })));
        }));
      },

      _moveConfigToHeader: function(config) {
        var allIconConfigs = this.getAllConfigs();

        var tempIndex = config.index;
        config.index = allIconConfigs[this.headerIconCount - 1].index;
        allIconConfigs[this.headerIconCount - 1].index = tempIndex;
      },

      _createCoverNode: function() {
        this.moreIconPaneCoverNode = html.create('div', {
          'class': 'jimu-more-icon-cover'
        }, jimuConfig.layoutId);
      },

      _getMorePanelSize: function() {
        var mapBox, minLen, position;
        mapBox = html.getContentBox(jimuConfig.mapId);
        minLen = Math.min(mapBox.w, mapBox.h);
        if (minLen < 600) {
          if (mapBox.w < mapBox.h) {
            position = {
              left: 20,
              right: 20,
              top: (mapBox.h - (mapBox.w - 40)) / 2,
              height: mapBox.w - 40,
              width: '',
              bottom: ''
            };
          } else {
            position = {
              top: 20,
              bottom: 20,
              left: (mapBox.w - (mapBox.h - 40)) / 2,
              width: mapBox.h - 40,
              height: '',
              right: ''
            };
          }
        } else {
          position = {
            top: (mapBox.h - 560) / 2,
            left: (mapBox.w - 560) / 2,
            width: 560,
            height: 560,
            right: '',
            bottom: ''
          };
        }
        return position;
      }
    });
    return clazz;
  });