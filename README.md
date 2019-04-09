# Oriented Imagery

Use the Oriented Imagery widget for Web AppBuilder to build web apps to explore oriented imagery (imagery not pointing straight down at the ground) from aerial, drone, or terrestrial sensors. App users select an oriented imagery catalog, click a location of interest on the map, then explore any available oblique, street-view, or inspection images that depict the area of interest using the inset viewer. As you pan and zoom in the oriented image, see the camera’s field of view dynamically updated on the map. 

Oriented imagery in ArcGIS is managed using oriented imagery catalogs (OICs). To view OICs in ArcGIS Pro, download the Oriented Imagery add-in for ArcGIS Pro for free from [ArcGIS Marketplace](https://marketplace.arcgis.com/listing.html?id=19b5028e59c141239d0a262117639f81). To create and manage your own OICs, download the Oriented Imagery Management Tools from [ArcGIS Online](https://www.arcgis.com/home/item.html?id=36ee0bbedca64a5a8b68d7c69ab51728).

This repo also contains a [description of the oriented imagery catalog schema](https://github.com/ArcGIS/oriented-imagery/blob/master/OrientedImageryCatalog_Schema/Oriented%20Imagery%20Catalog_Schema%20Documentation.pdf) for use in developing your own custom applications. The OIC is defined as a JSON that references a point-based feature service that defines the camera location, orientation, and image metadata. 

![App](Images/OrientedImageryExampleApp.png)

## Widget features

Features include:
* Build custom Oriented Imagery apps with no programming required
* Support for standard frame, panoramic, or omnidirectional cameras (among others) 
* A built-in viewer for non-nadir imagery, or the option to integrate a custom imagery viewer
* Spatial navigation tools designed to work with non-nadir imagery
* Querying based on current view and filters (including time)
* Image enhancement options
* Linear and height measurement tools – where suitable ancillary data available
* Synchronized display of view extent
* Option to display extents and images similar to your current selection
* API to help 3rd party developers


## Instructions

1. Download and unzip the Oriented Imagery repo ZIP file
2. Download and install [Web AppBuilder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/guide/getstarted.htm)
3. Follow the instructions for [custom widget deployment](https://developers.arcgis.com/web-appbuilder/guide/deploy-custom-widget-and-theme.htm) 

## Requirements

* ArcGIS Online account
* Web AppBuilder for ArcGIS 2.9+ Developer Edition

## Resources

* [Web App Builder for ArcGIS (Developer Edition)](https://developers.arcgis.com/web-appbuilder/)
* [Oriented Imagery example web app](https://www.esriurl.com/orientedimageryapp)

## Issues

Find a bug or want to request a new feature?  Please let us know by submitting an issue.

## Contributing

Esri welcomes contributions from anyone and everyone. Please see our [guidelines for contributing](https://github.com/esri/contributing).

## Licensing
Copyright 2018 Esri

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

A copy of the license is available in the repository's [License.txt](License.txt?raw=true) file.



