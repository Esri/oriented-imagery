import { React, Immutable, DataSourceManager, css } from 'jimu-core';
import { BaseWidgetSetting, AllWidgetSettingProps } from 'jimu-for-builder';
import { JimuMapViewSelector, SettingSection, SettingRow } from 'jimu-ui/advanced/setting-components';
import { ArcGISDataSourceTypes, MapViewManager } from 'jimu-arcgis';
import { Select, Option, Button, Checkbox, Label, TextInput, Tooltip, Switch, Icon, Collapse } from 'jimu-ui';
import { IMConfig } from '../config';
import arcgisPortal = require("esri/portal/Portal");
import esriRequest = require('esri/request');
import IdentityManager = require('esri/identity/IdentityManager');
import defaultMessages from './translations/default';
import { ChangeEvent } from 'react';
import MapView = require('esri/views/MapView');
import './assets/style.css';

interface State {
  groupList: any,
  selectContent: string,
  folderList: any,
  itemList: any,
  orgGroupList: any,
  contentList: any,
  oicList: any,
  featureList: any,
  showDropdown: boolean,
  layerEditCollapseFlags: any
}

const arrowDown = require('jimu-ui/lib/icons/arrow-down-12.svg');
const arrowUp = require('jimu-ui/lib/icons/arrow-up-12.svg');

export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>, any> {
  supportedTypes = Immutable([ArcGISDataSourceTypes.WebMap]);
  dsManager = DataSourceManager.getInstance();
  userContentInfo: any;
  OICList: any[];
  mapView: MapView;
  mvManager: MapViewManager = MapViewManager.getInstance();
  vectorLayers: any[];
  featureLayerCss: string = "oi-hideFeatureLayers"; 
  

  constructor(props) {
    super(props);
    this.state = {
      groupList: [],
      selectContent: 'group',
      folderList: [],
      itemList: [],
      orgGroupList: [],
      contentList: [],
      oicList: [],
      featureList: [],
      oic: null,
      showDropdown: false,
      layerEditCollapseFlags: {}
    };

    this.getOICfromUrl = this.getOICfromUrl.bind(this);
    this.getOICFromUserAcc = this.getOICFromUserAcc.bind(this);
    this.getOrganisationGroups = this.getOrganisationGroups.bind(this);
    this.getOICFromFolders = this.getOICFromFolders.bind(this);
    this.populateFolderGroupList = this.populateFolderGroupList.bind(this);
    this.populateOICList = this.populateOICList.bind(this);
    this.getOICFromFolder = this.getOICFromFolder.bind(this);
    this.getOICFromGroup = this.getOICFromGroup.bind(this);
    this.changeContent = this.changeContent.bind(this);
    this.chooseOIC = this.chooseOIC.bind(this);
    this.getOICfromUrl = this.getOICfromUrl.bind(this);
    this.addOICToList = this.addOICToList.bind(this);
    this.deleteOICList = this.deleteOICList.bind(this);
    this.enableEditing = this.enableEditing.bind(this);
  }

  onMapSelected = (useMapWidgetIds: any) => {
    this.props.onSettingChange({
      id: this.props.id,
      useMapWidgetIds: useMapWidgetIds
    });

    if (useMapWidgetIds.length > 0) {
      // document.getElementById("oi-widget").style.display = "block";
      this.vectorLayers = [];
      this.mapView = this.mvManager.jimuMapViewGroups[useMapWidgetIds[0]].getActiveJimuMapView().view;
      //var map = this.mvManager.getJimuMapViewById(useMapWidgetIds[0]);
      let layers = this.mapView.map.layers;
      for (let i = 0; i < layers.length; i++) {
        if (layers.getItemAt(i).type === 'feature') {
          let layer = {};
          layer.title = layers.getItemAt(i).title;
          layer.id = layers.getItemAt(i).id;
          this.vectorLayers.push({ featureLayer: layer, addToViewer: false, editing: false});
        }
      }
    }
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('vectorLayers', this.vectorLayers)
    }); 
    this.setState({
      featureList: this.vectorLayers
    });

  }

  nls = (id: string) => {
    return this.props.intl ? this.props.intl.formatMessage({ id: id, defaultMessage: defaultMessages[id] }) : id;
  }

  componentDidMount() {
    if (this.props.config.oicList.length > 0) {
      this.OICList = this.props.config.oicList;
    } else {
      this.OICList = [];
    }
    this.getOICFromUserAcc();

  }

  getOICFromUserAcc = () => {
    var portal = new arcgisPortal({ url: this.props.portalUrl });
    portal.load().then((user) => {
      if (!this.userContentInfo) {
        this.userContentInfo = {
          userId: this.props.user.username,
          myFolders: {},
          myGroups: {},
          myOrgGroups: {},
          //myFavorites: {},
          user: user
        };

        for (var b = 0; b < this.props.user.groups.length; b++) {
          this.userContentInfo.myGroups[this.props.user.groups[b].title] = { id: this.props.user.groups[b].id, items: [] };
        }
        this.getOrganisationGroups(user);

        this.getOICFromFolders(user);
      }
    });


  }

  getOrganisationGroups = (user) => {
    esriRequest(user.restUrl + '/community/groups', {
      query: {
        f: "json",
        q: "orgid:" + this.props.user.orgId,
        start: 1,
        num: 50,
        sortField: 'title',
        sortOrder: 'asc'

      },
      responseType: "json"
    }).then((result) => {
      var orgGroups = result.data;
      for (var b = 0; b < orgGroups.results.length; b++) {
        this.userContentInfo.myOrgGroups[orgGroups.results[b].title] = { id: orgGroups.results[b].id, items: [] };
      }
    });
  }

  getOICFromFolders = (user) => {
    esriRequest(user.restUrl + '/content/users/' + this.props.user.username, {
      query: {
        f: "json",
        token: this.props.token
      },
      responseType: "json"
    }).then((userContent) => {
      userContent = userContent.data;
      this.userContentInfo.myFolders[userContent.currentFolder || "[ root folder ]"] = { id: null, items: [] };
      for (var a = 0; a < userContent.items.length; a++) {
        if (userContent.items[a].type === "Oriented Imagery Catalog") {
          this.userContentInfo.myFolders[userContent.currentFolder || "[ root folder ]"].items.push({ name: userContent.items[a].title, url: "https://www.arcgis.com/sharing/rest/content/items/" + userContent.items[a].id });
        }
      }
      for (var a in userContent.folders) {
        this.userContentInfo.myFolders[userContent.folders[a].title] = { id: userContent.folders[a].id, items: [] };
      }
      this.populateFolderGroupList(this.state.selectContent);
      //html.set("itemNotify", "");
      //this.hideLoading();
    }).catch(() => {
      this.populateFolderGroupList(this.state.selectContent);
      //html.set("itemNotify", "");
      //this.hideLoading();
    });
  }

  populateFolderGroupList = (value) => {
    if (value === "content") {
      var items = Object.keys(this.userContentInfo.myFolders);
    }
    else if (value === 'group') {  //groupchange
      var items = Object.keys(this.userContentInfo.myGroups);
    }
    else if (value === 'orgGroups') {
      var items = Object.keys(this.userContentInfo.myOrgGroups);
    }
    // else {
    //     var items = Object.keys(this.userContentInfo.myFavorites);
    // }
    items.sort(function (a, b) {
      a = a.toLowerCase().split(" ")[0];
      b = b.toLowerCase().split(" ")[0];
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });

    this.setState({
      contentList: items
    });

  }

  populateOICList = (evt) => {
    var value = evt.currentTarget.value;
    if (value) {
      if (this.state.selectContent === "content")
        var items = this.userContentInfo.myFolders[value].items;
      else if (this.state.selectContent === "group") //groupchange
        var items = this.userContentInfo.myGroups[value].items;
      else if (this.state.selectContent === "orgGroups")
        var items = this.userContentInfo.myOrgGroups[value].items;
      // else 
      //     var items = this.userContentInfo.myFavorites[value];
      if (items.length) {
        items.sort(function (a, b) {
          a = a.name.toLowerCase().split(" ")[0];
          b = b.name.toLowerCase().split(" ")[0];
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
        var OIClist = [];

        for (var a in items) {
          //this.addSelectOption(document.getElementById("agolOICList"), items[a].name, items[a].url);
          OIClist.push({ name: items[a].name, value: items[a].url });
        }
        this.setState({
          itemList: OIClist
        });
      } else {
        if (this.state.selectContent === "content")
          this.getOICFromFolder(value);
        else
          this.getOICFromGroup(value);
      }
    }
  }

  getOICFromFolder = (value) => {
    var id = this.userContentInfo.myFolders[value].id;
    esriRequest(this.userContentInfo.user.restUrl + "/content/users/" + this.props.user.username + '/' + id, {
      query: {
        f: "json",
        token: this.props.token

      },
      responseType: "json"
    }).then((response) => {
      response = response.data;
      if (response.items) {
        this.userContentInfo.myFolders[value].items = [];
        for (var a = 0; a < response.items.length; a++) {
          if (response.items[a].type === "Oriented Imagery Catalog") {
            this.userContentInfo.myFolders[value].items.push({ name: response.items[a].title, url: this.userContentInfo.user.restUrl + "/content/items/" + response.items[a].id });
          }
        }
        var items = this.userContentInfo.myFolders[value].items;
        items.sort(function (a, b) {
          a = a.name.toLowerCase().split(" ")[0];
          b = b.name.toLowerCase().split(" ")[0];
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
        var OIClist = [];

        for (var a in items) {
          //this.addSelectOption(document.getElementById("agolOICList"), items[a].name, items[a].url);
          OIClist.push({ name: items[a].name, value: items[a].url });
        }
        this.setState({
          itemList: OIClist
        });

        //this.hideLoading();
      } //else
      //this.hideLoading();
    }).catch(() => {
      //this.hideLoading();
    });
  }

  getOICFromGroup = (value) => {
    var id = this.userContentInfo.myGroups[value] ? this.userContentInfo.myGroups[value].id : this.userContentInfo.myOrgGroups[value].id; //groupchange
    esriRequest(this.userContentInfo.user.restUrl + "/content/groups/" + id, {
      query: {
        f: "json",
        token: this.props.token
      },
      responseType: "json"
    }).then((response) => {
      response = response.data;
      if (response.items) {
        if (this.userContentInfo.myGroups[value]) {
          this.userContentInfo.myGroups[value].items = [];
        } else if (this.userContentInfo.myOrgGroups[value]) {
          this.userContentInfo.myOrgGroups[value].items = [];
        }
        for (var a = 0; a < response.items.length; a++) {
          if (response.items[a].type === "Oriented Imagery Catalog") {
            if (this.userContentInfo.myGroups[value]) { //groupchange
              this.userContentInfo.myGroups[value].items.push({ name: response.items[a].title, url: this.userContentInfo.user.restUrl + "/content/items/" + response.items[a].id });
            } else {
              this.userContentInfo.myOrgGroups[value].items.push({ name: response.items[a].title, url: this.userContentInfo.user.restUrl + "/content/items/" + response.items[a].id });

            }
          }
        }
        var items = this.userContentInfo.myGroups[value] ? this.userContentInfo.myGroups[value].items : this.userContentInfo.myOrgGroups[value].items;
        items.sort(function (a, b) {
          a = a.name.toLowerCase().split(" ")[0];
          b = b.name.toLowerCase().split(" ")[0];
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
        var OIClist = [];

        for (var a in items) {
          //this.addSelectOption(document.getElementById("agolOICList"), items[a].name, items[a].url);
          OIClist.push({ name: items[a].name, value: items[a].url });
        }
        this.setState({
          itemList: OIClist
        });

        //this.hideLoading();
      } //else
      //this.hideLoading();
    }).catch(() => {
      //this.hideLoading();
    });
  }

  changeContent = (evt) => {
    if (evt.currentTarget.value !== 'itemurl') {
      this.populateFolderGroupList(evt.currentTarget.value);
    }
    this.setState({
      selectContent: evt.currentTarget.value
    });

  }

  chooseOIC = (evt) => {
    this.setState({
      oic: { name: evt.currentTarget.textContent, url: evt.currentTarget.value }
    });
  }

  getOICfromUrl = (value: string) => {
    var url = value;
    if (url.indexOf("id=") !== -1) {
      //if (url.indexOf("/portal") !== -1)
      var itemUrl = url.split("/home")[0] + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];   //#530
      // else
      //     var itemUrl = "https://www.arcgis.com" + "/sharing/rest/content/items/" + (url.split("id=")[1]).split("/")[0];
      esriRequest(itemUrl, {
        query: {
          f: "json",
          token: this.props.token
        },
        responseType: "json"
      }).then((response) => {
        if (response.data && response.data.type === "Oriented Imagery Catalog") {
          this.OICList.push({ name: response.data.title, url: response.url });
        } else {
          //document.getElementById('addOICDialog').style.display = '';
          //this.errorNotification("Error! Item type is not OIC.");
        }
      }).catch(() => {
        // document.getElementById('addOICDialog').style.display = '';
        // this.errorNotification("Error! Please enter a valid OIC item url.");
      });
    } else {
      // document.getElementById('addOICDialog').style.display = '';
      // this.errorNotification("Error! Please enter a valid OIC item url.");
    }
  }



  addOICToList = () => {
    if (this.state.selectContent !== 'itemurl') {
      this.OICList = [];
      this.OICList.push(this.state.oic);
    }
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('oicList', this.OICList)
    });
    this.setState({
      oicList: this.OICList
    });
  }

  deleteOICList = () => {
    this.OICList.pop();
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('oicList', this.OICList)
    });

    this.setState({
      oicList: this.OICList
    });
  }

  enableEditing = (event: ChangeEvent<HTMLInputElement>, checked: boolean) => {
    //#861
    this.featureLayerCss = checked ? "oi-showFeatureLayers" : "oi-hideFeatureLayers";
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('editingEnabled', checked)
    });
  }

  enableLayerView = (event: ChangeEvent<HTMLInputElement>, checked: boolean) => {

    if (!this.vectorLayers || this.vectorLayers.length === 0) {
      this.vectorLayers = this.props.config.vectorLayers;
    }
    for (let i = 0; i < this.vectorLayers.length; i++) {
      if (event.currentTarget.id.split('-add')[0] === this.vectorLayers[i].featureLayer.id) {
        this.vectorLayers[i].addToViewer = checked;
        break;
      }
    }
    
    this.setState({ showDropdown: checked });
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('vectorLayers', this.vectorLayers)
    }); 
    
  }

  enableLayerEdit = (event: ChangeEvent<HTMLInputElement>, checked: boolean) => {

    if (!this.vectorLayers || this.vectorLayers.length === 0) {
      this.vectorLayers = this.props.config.vectorLayers;
    }
    for (let i = 0; i < this.vectorLayers.length; i++) {
      if (event.currentTarget.id.split('-edit')[0] === this.vectorLayers[i].featureLayer.id) {
        this.vectorLayers[i].editing = checked;
        break;
      }
    }
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('vectorLayers', this.vectorLayers)
    }); 
    
  }

  // handleEditingDropdown = evt => {
  //   const { showDropdown } = this.state;
  //   this.setState({ showDropdown: !showDropdown });
  // }



  render() {
    let oicBlock = [];
    let content;

    const { showDropdown } = this.state;

    //#839
    if (this.props.useMapWidgetIds && !this.mapView) {
      this.onMapSelected(this.props.useMapWidgetIds);
    }

    if (this.OICList && this.OICList.length) {
      oicBlock = this.OICList.map((oic, i) => {
        return <span style={{ color: 'black' }}>{oic.name}<br /></span>
      });
    }

    this.featureLayerCss = this.props.config.editingEnabled ? "oi-showFeatureLayers" : "oi-hideFeatureLayers"; //#861
    

    if (this.state.selectContent === 'itemurl') {
      content = <SettingRow><TextInput id='oic-itemurl' placeholder="Item url" onAcceptValue={this.getOICfromUrl} /> </SettingRow>
    } else {
      content = <><SettingRow><Select placeholder='Select group/folder' style={{ display: 'inline-block', width: '16.35rem', maxWidth: '16.35rem !important' }} onChange={this.populateOICList}>
        {
          this.state.contentList.map((item, i) => {
            return <Option value={item}>{item}</Option>
          }
          )}
      </Select></SettingRow>
        <SettingRow>
          <Select placeholder='Select OIC' style={{ display: 'inline-block', width: '16.35rem', maxWidth: '16.35rem !important' }} onChange={this.chooseOIC} value={this.state.oic ? this.state.oic.url : null}>
            {
              this.state.itemList.map((oic, i) => {
                return <Option value={oic.value}>{oic.name}</Option>
              })
            }
          </Select></SettingRow></>
    }

    let feautureDiv;
    
    //#804
    if (this.props.config.vectorLayers?.length > 0) {
      feautureDiv = this.props.config.vectorLayers?.map((product, i) => {
        //#861
        //#872
        let editingEnabled = (this.mapView.map.findLayerById(product.featureLayer.id) as any)?.editingEnabled && (this.mapView.map.findLayerById(product.featureLayer.id) as any)?.capabilities?.operations?.supportsEditing ? true : false;
        return <SettingRow flow="wrap" className={this.featureLayerCss} label={
          <div className="w-100 d-flex">
            {/* <Tooltip placement="top" showArrow={true} title={this.nls('addToViewer')}> */}
              <span className="d-inline-flex"><Checkbox checked={product.addToViewer} onChange={this.enableLayerView} id={product.featureLayer.id + '-add'} />
                <label className="pl-2">{product.featureLayer.title}</label></span>

            {/* </Tooltip> */}
            {/* <Button size={'sm'} type={'tertiary'} icon onClick={this.handleEditingDropdown} className="collapse-btn">
              <Icon size={12} icon={ product.addToViewer ? arrowUp : arrowDown} />
            </Button> */}
          </div>
        }>
          {/* #872 */}
              <Collapse isOpen={product.addToViewer} className="w-100 offset-1">
              <Tooltip placement="top" showArrow={true} title={!editingEnabled ? this.nls('editingTooltip') : ""}>
                <span className="d-inline-flex"><Checkbox disabled={!editingEnabled} onChange={this.enableLayerEdit} id={product.featureLayer.id + '-edit'} />
                  <label className="pl-2">{this.nls('editLayer')}</label></span>
                  </Tooltip>
              </Collapse>
           

          </SettingRow>

      });
    } 
    
    let enableEditingSwitch = this.props.config.vectorLayers.length > 0 ? true : false; //#870
    return <div className="widget-setting-orientedimagery">
      <SettingSection
        className="map-selector-section"
        title={this.nls('chooseMapWidget')}
      >
        <SettingRow>
          <JimuMapViewSelector onSelect={this.onMapSelected} useMapWidgetIds={this.props.useMapWidgetIds} /><br />


        </SettingRow>
      </SettingSection>
      {/* issue #781 will show the configuration whether correct map widget is selected or not. Behavior similar to other Exb widgets */}
      {/* <div id="oi-widget"  style={{display:"none"}}> */} 
      <SettingSection

        title={this.nls('chooseOIC')}
      >

        <SettingRow>
          <Select style={{ display: 'inline-block', width: '16.35rem', maxWidth: '16.35rem !important' }} value={this.state.selectContent} onChange={this.changeContent}>
            <Option value='content'>{this.nls('contents')}</Option>
            <Option value='group'>{this.nls('groups')}</Option>
            <Option value='orgGroups'>{this.nls('org')}</Option>
            <Option value='itemurl'>{this.nls('itemurl')}</Option>
          </Select>
        </SettingRow>
        {content}
        <SettingRow>
          <div id='oi-oicList' style={{ background: 'white', height: '3rem', width: '100%' }}>
            {
              oicBlock
            }
          </div>
        </SettingRow>
        <SettingRow>
          <Button type='primary' size='sm' onClick={this.addOICToList}>{this.nls('addOIC')}</Button>
          <Button type='secondary' size='sm' onClick={this.deleteOICList}>{this.nls('deleteOIC')}</Button>

        </SettingRow>

      </SettingSection>
      
          <SettingSection title={this.nls('configureEdit')}>
            <SettingRow>
            <Tooltip placement="top" showArrow={true} title={!enableEditingSwitch ? this.nls('editingSwitchTooltip') : ""}>
              <span>
              <Label style={{ cursor: 'pointer' }}><Switch className="mr-2" onChange={this.enableEditing} id='oi-editingCheckbox' checked={this.props.config.editingEnabled && enableEditingSwitch ? true : false} disabled={!enableEditingSwitch} /*#870*/  /> {this.nls('enableEditing')}</Label>
              </span></Tooltip>
            </SettingRow>


            {feautureDiv}

          </SettingSection>
         
      {/* </div> */}
      </div>
      
  }
}