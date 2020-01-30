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
# Name: UltramapOblique.py
# Description: This is an custom OIC type. 
# Version: 1.0
# Date Created : 20181104
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
#------------------------------------------------------------------------------

import arcpy
import os
import sys
import csv

def __init__(self, nametype):
    self._name = nametype

def main(oicPath, oicParas, inputParams, defValues, log=None):
    try:
        metadataFile = oicParas['MetadataFilePath']
        headingOffset = oicParas["HeadingOffset"]
        rasterDir = oicParas['RasterFolder']
        srs = oicParas['SRS(wkid)']
        importCSVtoFCFema(metadataFile, rasterDir, headingOffset, srs, oicPath, defValues, log)
        return("Successfully added list of images.")
    except Exception as e:
        if log:
            log.Message("Error in adding images. {}".format(str(e)), log.const_critical_text)
        arcpy.AddMessage("Error in adding images. {}".format(str(e)))
        return ("Error in adding images." + str(e))

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

def importCSVtoFCFema(metadataFilePath, rasterDir, headingOffset, srs, fcPath, defValues, log):
    fcFields = ['SHAPE@','Name','Image','CamHeading','CamPitch','CamRoll','OIType','HFOV','VFOV','AvgHtAG','FarDist','NearDist','ImgRot']
    fcCursor = arcpy.da.InsertCursor(fcPath,fcFields)
    desc = arcpy.Describe(fcPath)
    fcSRS = desc.spatialReference 

    oicParts = fcPath.split(os.sep)
    oicProjectPath = os.sep.join(oicParts[:-2])
    grpLayerName = oicParts[-1].split('_')[0]  

    with open(metadataFilePath, newline='') as metadataFile:
        metadataReader = csv.reader(metadataFile)
        for metadataRow in metadataReader:
            insertRow = []
            name = metadataRow[0]
            image = '{}.jpg'.format(os.path.join(rasterDir, name))
            camHeading = 0
            try:
                if metadataRow[6]:
                    camHeading = float(metadataRow[6])
                if headingOffset:
                    camHeading = camHeading + float(headingOffset)
            except:
                arcpy.AddWarning("Input Yaw or heading offset for image {} must be numeric.".format(image))
                log.Message("Iinput Yaw or heading offset for image {} must be numeric".format(image), log.const_critical_text)
            if camHeading < 0:
                camHeading = camHeading + 360
            camPitch = 0
            try:
                if metadataRow[5]:
                    camPitch = float(metadataRow[5])
            except:
                arcpy.AddWarning("Input Pitch for image {} must be numeric".format(image))
                log.Message("Input Pitch for image {} must be numeric".format(image), log.const_critical_text)
            camRoll = 0
            try:
                if metadataRow[4]:
                    camRoll = float(metadataRow[4])
            except:
                arcpy.AddWarning("Input Roll for image {} must be numeric".format(image))
                log.Message("In input Roll for image {} must be numeric".format(image), log.const_critical_text)
            avgHtAG = 0
            try:
                if metadataRow[3]:
                    avgHtAG = float(metadataRow[3])
            except:
                arcpy.AddWarning("Input altitude for image {} must be numeric".format(image))
                log.Message("Input altitude for image {} must be numeric".format(image), log.const_critical_text)
            point = arcpy.Point()
            try:
                point.X = float(metadataRow[2])
                point.Y = float(metadataRow[1])
            except:
                arcpy.AddWarning("Input altitude for image {} must be numeric".format(image))
                log.Message("Input altitude for image {} must be numeric".format(image), log.const_critical_text)
            inSRSObj = arcpy.SpatialReference(int(srs))
            pointGeometry = arcpy.PointGeometry(point, inSRSObj).projectAs(fcSRS)
            pointCentroid = pointGeometry.centroid
            insertRow.extend([pointCentroid, name, image])
            sourceValues = {
                                "CamPitch": camPitch,
                                "CamRoll": camRoll,
                                "CamHeading": camHeading,
                                "FarDist": None,
                                "NearDist": None,
                                "AvgHtAG": avgHtAG,
                                "HFOV": None,
                                "VFOV": None
                           }
            OIType = defValues['OIType'][0]
            insertRow.extend([sourceValues['CamHeading'], sourceValues['CamPitch'],
                            sourceValues['CamRoll'], OIType, sourceValues['HFOV'],
                            sourceValues['VFOV'], sourceValues['AvgHtAG'],
                            sourceValues['FarDist'], sourceValues['NearDist'],
                            0])
            fcCursor.insertRow(insertRow)