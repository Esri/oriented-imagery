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

define([
    'dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/Deferred',
    'esri/tasks/query',
    'esri/tasks/QueryTask',
    'jimu/utils',
    'jimu/dijit/Message'
  ],
  function(declare, lang, array, Deferred, EsriQuery, QueryTask, jimuUtils, Message) {

    function getCleanCurrentAttrsTemplate(){
      var template = {
        url: "",
        layerInfo: null,//layerDefinition
        limit: 10 * 1000,
        spatialReference: null,
        queryType: -1,
        objectIdField: "",
        query: {
          maxRecordCount: 1000,
          where: '',
          geometry: null,
          relationship: EsriQuery.SPATIAL_REL_INTERSECTS,
          outFields: ["*"],
          nextIndex: 0,
          allCount: 0,
          objectIds: [], //optional
          features: []
        }
      };
      return template;
    }

    var SingleTaskClass = declare(null, {
      currentAttrs: null,

      //public methods:
      //getFeatures

      //options: {url,layerInfo,limit,spatialReference,where,geometry,relationship,outFields}
      constructor: function(options){
        this.currentAttrs = getCleanCurrentAttrsTemplate();
        this.currentAttrs.url = options.url;
        this.currentAttrs.layerInfo = options.layerInfo;
        this.currentAttrs.spatialReference = options.spatialReference;
        this.currentAttrs.query.where = options.where;
        this.currentAttrs.query.geometry = options.geometry;
        this.currentAttrs.query.maxRecordCount = options.layerInfo.maxRecordCount || 1000;
        this.currentAttrs.queryType = this._getQueryType(options.layerInfo);
        this.currentAttrs.objectIdField = jimuUtils.getObjectIdField(options.layerInfo);
        if(options.relationship){
          this.currentAttrs.query.relationship = options.relationship;
        }
        if(options.outFields){
          this.currentAttrs.query.outFields = options.outFields;
        }
        if(options.limit > 0 || options.limit > this.currentAttrs.query.maxRecordCount){
          this.currentAttrs.limit = options.limit;
        }
      },

      //return a deferred object which resolves {status,count,features}
      //if status > 0, means we get all features
      //if status < 0, means count is big, so we can't get features
      getFeatures: function(){
        var def = new Deferred();
        var where = this.currentAttrs.query.where;
        var geometry = this.currentAttrs.query.geometry;
        var relationship = this.currentAttrs.query.relationship;
        if(this.currentAttrs.queryType === 2){
          //support objectIds
          def = this._getAllFeatures_SupportObjectIds(where, geometry, relationship);
        }else{
          //don't support objectIds
          def = this._getAllFeatures_NotSupportObjectIds(where, geometry, relationship);
        }
        return def;
      },

      _getQueryType: function(layerDefinition){
        var queryType = -1;

        /*if (this._isServiceSupportsOrderBy(layerDefinition) &&
          this._isServiceSupportsPagination(layerDefinition)) {
          queryType = 1;
        }*/

        if (this._isSupportObjectIds(layerDefinition)) {
          queryType = 2;
        } else {
          queryType = 3;
        }
        return queryType;
      },

      /*_isServiceSupportsOrderBy: function(layerInfo){
        var isSupport = false;
        if(layerInfo.advancedQueryCapabilities){
          if(layerInfo.advancedQueryCapabilities.supportsOrderBy){
            isSupport = true;
          }
        }
        return isSupport;
      },

      _isServiceSupportsPagination: function(layerInfo){
        var isSupport = false;
        if(layerInfo.advancedQueryCapabilities){
          if(layerInfo.advancedQueryCapabilities.supportsPagination){
            isSupport = true;
          }
        }
        return isSupport;
      },*/

      _isSupportObjectIds: function(layerInfo){
        //http://resources.arcgis.com/en/help/arcgis-rest-api/#/Layer_Table/02r3000000zr000000/
        //currentVersion is added from 10.0 SP1
        //typeIdField is added from 10.0
        var currentVersion = 0;
        if(layerInfo.currentVersion){
          currentVersion = parseFloat(layerInfo.currentVersion);
        }
        return currentVersion >= 10.0 || layerInfo.hasOwnProperty('typeIdField');
      },

      /*--------------------query support objectIds------------------------*/
      //resolve {status,count,features}
      _getAllFeatures_SupportObjectIds: function(where, geometry, relationship){
        return this._queryIds(where, geometry, relationship).then(lang.hitch(this, function(objectIds){
          //objectIds maybe null

          var hasResults = objectIds && objectIds.length > 0;

          if(!hasResults){
            this.currentAttrs.query.allCount = 0;

            return {
              status: 1,
              count: 0,
              features: []
            };
          }

          var allCount = objectIds.length;
          this.currentAttrs.query.allCount = allCount;
          this.currentAttrs.query.objectIds = objectIds;
          this.currentAttrs.query.nextIndex = 0;//reset nextIndex
          var maxRecordCount = this.currentAttrs.query.maxRecordCount;
          /*if(allCount > this.currentAttrs.limit){
            return {
              status: -1,
              count: allCount,
              features: []
            };
          }else{
            return this._onResultsScroll_SupportObjectIds();
          }*/

          if(allCount > maxRecordCount){
            return this._isContinue().then(lang.hitch(this, function(isContinue){
              if(isContinue){
                return this._onResultsScroll_SupportObjectIds();
              }else{
                return {
                  status: -1,
                  count: allCount,
                  features: []
                };
              }
            }));
          }else{
            return this._onResultsScroll_SupportObjectIds();
          }

        }));
      },

      _isContinue: function(){
        var def = new Deferred();
        var queryFeaturesNls = window.jimuNls.queryFeatures;
        var message = new Message({
          message: queryFeaturesNls.tooManyFeaturesTip + " " + queryFeaturesNls.askForContinue,
          buttons: [{
            label: window.jimuNls.common.continue1,
            onClick: lang.hitch(this, function(){
              def.resolve(true);
              message.close();
            })
          }, {
            label: window.jimuNls.common.cancel,
            onClick: lang.hitch(this, function(){
              def.resolve(false);
              message.close();
            })
          }]
        });
        return def;
      },

      //resolve {status,count,features}
      _onResultsScroll_SupportObjectIds: function(){
        var resultDef = new Deferred();
        var allObjectIds = this.currentAttrs.query.objectIds;
        var allCount = this.currentAttrs.query.allCount;
        var nextIndex = this.currentAttrs.query.nextIndex;
        var maxRecordCount = this.currentAttrs.query.maxRecordCount;
        var relationship = this.currentAttrs.query.relationship;

        if(nextIndex >= allCount){
          resultDef.resolve({
            status: 1,
            count: allCount,
            features: this.currentAttrs.query.features
          });
          return resultDef;
        }

        var countLeft = allObjectIds.length - nextIndex;
        var queryNum = Math.min(countLeft, maxRecordCount);
        var partialIds = allObjectIds.slice(nextIndex, nextIndex + queryNum);
        if(partialIds.length === 0){
          resultDef.resolve({
            status: 1,
            count: allCount,
            features: this.currentAttrs.query.features
          });
          return resultDef;
        }

        //do query by objectIds
        return this._queryByObjectIds(partialIds, true, relationship).then(lang.hitch(this, function(response){
          var features = response.features;
          this.currentAttrs.query.nextIndex += features.length;
          this.currentAttrs.query.features = this.currentAttrs.query.features.concat(features);
          return this._onResultsScroll_SupportObjectIds();
        }));
      },

      /*--------------------query doesn't support objectIds-------------------------*/
      //resolve {status, count, features}
      _getAllFeatures_NotSupportObjectIds: function(where, geometry, relationship){
        return this._doQuery_NotSupportObjectIds(where, geometry, relationship).then(lang.hitch(this, function(fs){
          return {
            status: 1,
            count: fs.length,
            features: fs
          };
        }));
      },

      //resolve features
      _doQuery_NotSupportObjectIds: function(where, geometry, relationship){
        var resultDef = new Deferred();
        this._query(where, geometry, true, relationship).then(lang.hitch(this, function(response){
          var features = response.features;
          this.currentAttrs.query.allCount = features.length;
          resultDef.resolve(features);
        }), lang.hitch(this, function(err){
          console.error(err);
          resultDef.reject(err);
        }));

        return resultDef;
      },

      /*----------------------------query-------------------------------*/
      _getOutputFields: function(){
        var result = ["*"];
        return result;
      },

      _query: function(where, geometry, returnGeometry, relationship){
        var queryParams = new EsriQuery();
        queryParams.where = where;
        if(geometry){
          queryParams.geometry = geometry;
        }
        queryParams.outSpatialReference = this.currentAttrs.spatialReference;
        queryParams.returnGeometry = !!returnGeometry;
        queryParams.spatialRelationship = relationship;
        queryParams.outFields = this._getOutputFields();
        var queryTask = new QueryTask(this.currentAttrs.url);
        return queryTask.execute(queryParams);
      },

      _queryIds: function(where, geometry, relationship){
        var queryParams = new EsriQuery();
        queryParams.where = where;
        if(geometry){
          queryParams.geometry = geometry;
        }
        queryParams.returnGeometry = false;
        queryParams.spatialRelationship = relationship;
        queryParams.outSpatialReference = this.currentAttrs.spatialReference;
        var queryTask = new QueryTask(this.currentAttrs.url);
        return queryTask.executeForIds(queryParams);
      },

      _queryByObjectIds: function(objectIds, returnGeometry, relationship){
        var def = new Deferred();
        var queryParams = new EsriQuery();
        queryParams.returnGeometry = !!returnGeometry;
        queryParams.outSpatialReference = this.currentAttrs.spatialReference;
        queryParams.outFields = this._getOutputFields();
        queryParams.objectIds = objectIds;
        queryParams.spatialRelationship = relationship;
        var queryTask = new QueryTask(this.currentAttrs.url);
        queryTask.execute(queryParams).then(lang.hitch(this, function(response){
          def.resolve(response);
        }), lang.hitch(this, function(err){
          if(err.code === 400){
            //the query fails maybe becasuse the layer is a joined layer
            //joined layer:
            //http://csc-wade7d:6080/arcgis/rest/services/Cases/ParcelWithJoin/MapServer/0
            //joined layer doesn't support query by objectIds direcly, so if the layer is joined,
            //it will go into errorCallback of queryTask.
            //the alternative is using where to re-query.
            var objectIdField = this.currentAttrs.objectIdField;
            var where = "";
            var count = objectIds.length;
            array.forEach(objectIds, lang.hitch(this, function(objectId, i){
              where += objectIdField + " = " + objectId;
              if(i !== count - 1){
                where += " OR ";
              }
            }));
            this._query(where, null, returnGeometry, relationship).then(lang.hitch(this, function(response){
              def.resolve(response);
            }), lang.hitch(this, function(err){
              def.reject(err);
            }));
          }else{
            def.reject(err);
          }
        }));
        return def;
      }

    });

    SingleTaskClass.getCleanCurrentAttrsTemplate = getCleanCurrentAttrsTemplate;

    return SingleTaskClass;
  });