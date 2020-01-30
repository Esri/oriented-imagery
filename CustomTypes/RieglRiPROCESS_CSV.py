#------------------------------------------------------------------------------
# Copyright 2018 Esri
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#------------------------------------------------------------------------------
# Name: RieglRPROCESS_CSV.py
# Description: This is a custom OIC type. 
# Version: 1.1.2
# Date Created : 20181104
# Date updated : 20190523
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
#------------------------------------------------------------------------------

import arcpy
import os
import csv
import json
import math
#import orientedimagerytools as oitools

def __init__(self, nametype):
    self._name = nametype

def main(oicPath, oicParas, inputParams, defValues, log=None):
    try:
        #defValues = {valueDict['name']: valueDict['value'] for valueDict in defValueList}
        outPathSRS = arcpy.Describe(oicPath).spatialReference
        rasterPath = oicParas['RasterPath']
        cameraFile = oicParas['Metadata File Path']
        imageryType = oicParas['Metadata Type(Panorama/Camera)']
        isCam = True if imageryType.lower() == 'camera' else False
        inputwkid = oicParas['SRS']
        if isCam:
            for i in range(6):
                camFileParts = os.path.splitext(cameraFile)
                camFilePath = ''.join(['{}{}'.format(camFileParts[0][:-1], str(i)), camFileParts[1]])
                importCSVtoFCLadyBug(camFilePath, oicPath, inputwkid, rasterPath, isCam, defValues, log)
        else:
            importCSVtoFCLadyBug(cameraFile, oicPath, inputwkid, rasterPath, isCam, defValues, log)
        return("Successfully added list of images.")
    except Exception as e:
        if log:
            log.Message("Error in adding images. {}".format(str(e)), log.const_critical_text)
        return ("Error in adding images." + str(e))

      
                  
def getDefaultValue(propertyName, isCam):
    if isCam:
        hfov = 72
    else:
        hfov = 360
    values = {
                "FarDist": 30,
                "NearDist": 3,
                "AvgHtAG": 3,
                "HFOV": hfov,
                "VFOV": 90
             }
    return values[propertyName]

def replaceDefaultValues(defValues, isCam):
    for key in defValues:
        if key in ['HFOV', 'VFOV', 'AvgHtAG', 'FarDist', 'NearDist']:
            if not defValues[key]:
                defValues[key] = getDefaultValue(key, isCam)
    return defValues

def getTableDefaults(sourceValues, userDefaults):
    # Retuns the default parameters to be filled in the table. Computed from the defualt parameter values entered by the user and the corresponding values from the source.
    tableDefaults = {}
    for userDefault in userDefaults:
        if userDefault['isDefault']:
            tableDefaults[userDefault['name']] = None
        else:
            if userDefault['value']:
                tableDefaults[userDefault['name']] = userDefault['value']
            else:
                tableDefaults[userDefault['name']] = sourceValues[userDefault['name']]
    return tableDefaults

def importCSVtoFCLadyBug(csvTablePath, fcPath, inwkid, rasterPath, isCam, defValues, log):
    fcFields = ['SHAPE@','Name','Image','CamHeading','CamPitch','CamRoll','OIType','HFOV','VFOV','AvgHtAG','FarDist','NearDist','ImgRot']
    fcCursor = arcpy.da.InsertCursor(fcPath,fcFields)
    desc = arcpy.Describe(fcPath)
    fcSRS = desc.spatialReference 
    headers = []
    with open(csvTablePath, 'r') as f:
        reader = csv.DictReader(f)
        headers = reader.fieldnames
    if 'Origin (Longitude[deg]' in headers:
        headers = ['Filename','Origin (Longitude[deg]','Latitude[deg]','Omega[deg]','Phi[deg]','Kappa[deg]']
    else:
        headers = ['Filename', 'Origin (Easting[m]', 'Northing[m]', 'Omega[deg]', 'Phi[deg]', 'Kappa[deg]']
        
    csvFields = tuple(headers)

    oicParts = fcPath.split(os.sep)
    oicProjectPath = os.sep.join(oicParts[:-2])
    grpLayerName = oicParts[-1].split('_')[0]  

    with arcpy.da.SearchCursor(csvTablePath,csvFields) as inCursor:
        for row in inCursor:
            insertRow = []
            name = row[0]
            folderName = ''
            if 'camera' in name.lower():
                folderName = 'Camera_{}'.format(os.path.splitext(name)[0][-1])
            if rasterPath.startswith('http'):
                if folderName:
                    imagePath = '/'.join([rasterPath.strip('/'), folderName, name])
                else:
                    imagePath = '/'.join([rasterPath.strip('/'), name])
            else:
                if folderName:
                    imagePath = os.path.join(rasterPath, folderName, name)
                else:
                    imagePath = os.path.join(rasterPath, name)
            x = row[1]
            y = row[2]
            omega = row[3]
            phi = row[4]
            kappa = row[5]
    
            inPtSRS = arcpy.SpatialReference(int(inwkid))
            aPoint = arcpy.Point()
            aPoint.X = x
            aPoint.Y = y

            aPtGeometry = arcpy.PointGeometry(aPoint,inPtSRS).projectAs(fcSRS)
            aPoint = aPtGeometry.centroid
            insertRow.extend([aPoint, name, imagePath])

            omegaVal = omega * (math.pi/180)
            phiVal = phi * (math.pi / 180)
            kappaVal = kappa * (math.pi / 180)

            camHeading = (math.atan2(-1 * (math.sin(phiVal)), (-1 * (-math.sin(omegaVal)*math.cos(phiVal)))) * 180) / math.pi
            if camHeading < 0:
                camHeading = camHeading + 360            
            camPitch = math.acos(math.cos(omegaVal)*math.cos(phiVal)) * 180 / math.pi
            camRoll = (math.atan2((-1 * ((math.sin(omegaVal)*math.sin(kappaVal)) - (math.cos(omegaVal)*math.sin(phiVal)* math.cos(kappaVal)))), (math.sin(omegaVal)*math.cos(kappaVal)) + (math.cos(omegaVal)* math.sin(phiVal)* math.sin(kappaVal))) * 180) / math.pi
            sourceValues = {
                                       "CamPitch": camPitch,
                                       "CamRoll": camRoll,
                                       "CamHeading": camHeading,
                                       "FarDist": None,
                                       "NearDist": None,
                                       "AvgHtAG": None,
                                       "HFOV": None,
                                       "VFOV": None
                    }
            defValues = replaceDefaultValues(defValues, isCam)
            OIType = defValues['OIType'][0]

            insertRow.extend([sourceValues['CamHeading'], sourceValues['CamPitch'],
                              sourceValues['CamRoll'], OIType, sourceValues['HFOV'],
                              sourceValues['VFOV'], sourceValues['AvgHtAG'],
                              sourceValues['FarDist'], sourceValues['NearDist'],
                              0])
            fcCursor.insertRow(insertRow)

    del inCursor
    del fcCursor
