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
# Name: Drone2Map.py
# Description: This is a custom OIC type.
# Version: 2.0
# Date Created : 20181104
# Date updated : 20190704
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
#------------------------------------------------------------------------------

import arcpy
import os
import sys
import json
import re
import orientedimagerytools as oitools
from numpy.linalg import inv
import numpy as np
from datetime import datetime
import multiprocessing
import concurrent.futures
from concurrent.futures import ProcessPoolExecutor
import math
multiprocessing.set_executable(os.path.join(os.path.dirname(sys.executable), r"Python\envs\arcgispro-py3\pythonw.exe"))

def __init__(self, nametype):
    self._name = nametype

def main(oicPath, oicParas, inputParams, defValues, log=None):
    try:
        outPathSRS = arcpy.Describe(oicPath).spatialReference
        rasterPath = oicParas['RasterPath']
        cameraFile = oicParas['Drone2Map Camera File']
        imageDetailsFile = oicParas['Drone2Map Image List']
        imageryType = oicParas['Imagery Type']
        inputwkid = oicParas['Input Images SRS (WKID)']
        terrainAvgElev = float(oicParas['Terrain Average Elevation']) if oicParas['Terrain Average Elevation'] else 0

        calculateOrientation = True #if oicParas['Calculate Orientation(yes/no)'].strip().lower() == 'yes' else False
        importExifDrone2Map(oicPath, imageDetailsFile, outPathSRS, inputwkid, imageryType, rasterPath, cameraFile, calculateOrientation, defValues, log,terrainAvgElev)
        oicFilePath = getOicFilePath(oicPath)
        updateFilters(oicFilePath, imageryType)
        return("Successfully added list of images.")
    except Exception as e:
        if log:
            log.Message("Error in adding images. {}".format(str(e)), log.const_critical_text)
        return ("Error in adding images." + str(e))

def getOicFilePath(fcPath):
    oicParts = fcPath.split(os.sep)
    oicProjectPath = os.sep.join(oicParts[:-2])
    grpLayerName = '_'.join(oicParts[-1].split('_')[:-1])
    oicFilePath = os.path.join(oicProjectPath, '{}.oic'.format(grpLayerName))
    return oicFilePath

def importExifDrone2Map(inputTable, imageDetailsFile, outsrs, inwkid, imageryType, rasterPath, cameraFile, calculateOrientation, valueDefaults, log,terrainAvgElev):
    imgDetails = []
    with open(imageDetailsFile) as imgFile:
        lines = imgFile.readlines()
        lines = lines[1:]
        for line in lines:
            imgParams = line.split(' ')
            imgDict = {
                          'PerspectiveX': imgParams[1].strip(),
                          'PerspectiveY': imgParams[2].strip(),
                          'PerspectiveZ': imgParams[3].strip(),
                          'Omega': imgParams[4].strip(),
                          'Phi': imgParams[5].strip(),
                          'Kappa': imgParams[6].strip()

                      }
            if rasterPath.startswith('http'):
                imgDict.update({'imagePath': '/'.join([rasterPath.strip('/'), imgParams[0]])})
                imgDetails.append(imgDict)
            else:
                imgDict.update({'imagePath': os.path.join(rasterPath, imgParams[0])})
                imgDetails.append(imgDict)
    importFields = ['SHAPE@','Name','Image','AcquisitionDate','CamHeading','CamPitch','CamRoll','HFOV','VFOV','AvgHtAG','FarDist','NearDist','OIType','SortOrder','CamOffset','Accuracy','ImgPyramids','DepthImg','CamOri','ImgRot']
    fcCursor = arcpy.da.InsertCursor(inputTable,importFields)
    imgCount = len(imgDetails)
    cntrCut = round((imgCount * 10) / 100)
    cntr = -1
    imgCntr = 0
    imgList = [imgDict['imagePath'] for imgDict in imgDetails]
    cameraParams = getDrone2MapCamParams(cameraFile, log)

    anImageDict = oitools.getImageInfo(imgList[0])
    exif_data = anImageDict['exif_data']
    errMsg = anImageDict['error']

    if exif_data == {}:
        aDateTime = None
    else:
        aDateTime = oitools._get_if_exist(exif_data, 'EXIF_DateTime')
        if aDateTime is not None:
            aDateTime = oitools.returnDate(aDateTime)
        else:
            aDateTime = oitools._get_if_exist(exif_data, 'EXIF_DateTimeOriginal')
            if aDateTime is not None:
                aDateTime = oitools.returnDate(aDateTime)

        for img in imgList:


            cntr = cntr + 1
            imgCntr = imgCntr + 1


            imgDict = [d for d in imgDetails if d['imagePath'] == img][0]
            xCoord = imgDict['PerspectiveX']
            yCoord = imgDict['PerspectiveY']
            zValue = imgDict['PerspectiveZ']

            if yCoord == xCoord == None:
                arcpy.AddWarning("Could not extract coordinate info to add image: "+os.path.basename(img))
                log.Message("Could not extract coordinate info to add image: {}".format(os.path.basename(img)), log.const_warning_text)
                continue
            else:
                if cntr == cntrCut:
                    arcpy.AddMessage('Extracted Data for '+str(imgCntr)+' of '+str(imgCount))
                    cntr = 0

                aValueList = []

                aPoint = arcpy.Point()
                aPoint.X = xCoord
                aPoint.Y = yCoord

                inSRS = arcpy.SpatialReference(int(inwkid))
                #inSRS.factoryCode = 4326
                aPtGeometry = arcpy.PointGeometry(aPoint,inSRS).projectAs(outsrs)
                aPoint = aPtGeometry.centroid

                aValueList.append(aPoint)

                if img.startswith('http'):
                    ossep = '/'
                else:
                    ossep = os.sep

                aNameList = img.split(ossep)
                if len(aNameList) >= 2:
                    aCount = len(aNameList)
                    shortName = aNameList[aCount-2]+ossep+aNameList[aCount-1]
                    aName, anExt = os.path.splitext(shortName)
                    aValueList.append(aName)
                else:
                    aValueList.append(None)

                aValueList.append(img)


                aValueList.append(aDateTime)

                    # below method returns a dictionary of default parameters calculated from the image source
                #sourceDefaults = oitools.getDefaultValuesFromSource(exif_data)
                    #  below method retuns the default parameters to be filled in the table. Computed from the defualt parameter values entered by the user and the corresponding values from the source.

                omegaVal = float(imgDict['Omega']) * (math.pi/180)
                phiVal = float(imgDict['Phi']) * (math.pi / 180)
                kappaVal = float (imgDict['Kappa']) * (math.pi / 180)

                camHeading = (math.atan2(-1 * (math.sin(phiVal)), (-1 * (-math.sin(omegaVal)*math.cos(phiVal)))) * 180) / math.pi
                if camHeading < 0:
                    camHeading = camHeading + 360

                camPitch = math.acos(math.cos(omegaVal)*math.cos(phiVal)) * 180 / math.pi
                camRoll = (math.atan2((-1 * ((math.sin(omegaVal)*math.sin(kappaVal)) - (math.cos(omegaVal)*math.sin(phiVal)* math.cos(kappaVal)))), (math.sin(omegaVal)*math.cos(kappaVal)) + (math.cos(omegaVal)* math.sin(phiVal)* math.sin(kappaVal))) * 180) / math.pi


                HFOV = 2 * math.atan(cameraParams['sensorWidth']/(2 * cameraParams['FocalLength'] ))
                VFOV = 2 * math.atan(cameraParams['sensorHeight']/(2 * cameraParams['FocalLength'] ))

                HFOV = math.degrees(HFOV)
                VFOV = math.degrees(VFOV)

                AvgHtAG = imgDict['PerspectiveZ']
                AvgHtAG = float(AvgHtAG)
                AvgHtAG = abs(AvgHtAG - terrainAvgElev)

                if camPitch > 0 and camPitch < 90 and AvgHtAG != '' and AvgHtAG is not None:
                    nearDistance = AvgHtAG * math.tan((camPitch - (VFOV/2)) * math.pi / 180)
                elif camPitch == 0 and AvgHtAG != '' and AvgHtAG is not None:
                    nearDistance = -1 * AvgHtAG * math.sin(VFOV * math.pi / 360)
                else:
                    nearDistance = None
                    #nearDistance = valueDefaults['NearDist']


                if camPitch > 0 and camPitch < 90  and AvgHtAG != '' and AvgHtAG is not None:
                    farDistance = AvgHtAG * math.tan((camPitch + (VFOV/2))* math.pi / 180)
                    if farDistance < 0:
                        farDistance = abs(farDistance)
                elif camPitch == 0  and AvgHtAG != '' and AvgHtAG is not None:
                    farDistance = AvgHtAG * math.sin(VFOV * math.pi / 360)
                    if farDistance < 0:
                        farDistance = abs(farDistance)
                else:
                    farDistance = None
                    #farDistance = valueDefaults['FarDist']


                OIType = valueDefaults['OIType'][0]
                aValueList.extend([camHeading, camPitch,
                               camRoll, HFOV,
                               VFOV, AvgHtAG,
                               farDistance, nearDistance,
                                   OIType])
                order = 0
                aValueList.append(order)
                camOffset = None
                aValueList.append(camOffset)
                accuracy = None
                aValueList.append(accuracy)
                imgPyramids = None
                aValueList.append(imgPyramids)
                depthImg = None
                aValueList.append(depthImg)

                inverseAffineMatrix = np.array([[cameraParams['A1'], cameraParams['A2'], cameraParams['A0']],
                                                             [cameraParams['B1'], cameraParams['B2'], cameraParams['B0']],
                                                             [0, 0, 1]], dtype='float')

                camOri = '|'.join(['2', str(inwkid), str(inwkid), imgDict['PerspectiveX'], imgDict['PerspectiveY'],
                           str(imgDict['PerspectiveZ']), str(imgDict['Omega']), str(imgDict['Phi']), str(imgDict['Kappa']),
                           str(round(float(inverseAffineMatrix[0][2]), 6)), str(round(float(inverseAffineMatrix[0][0]), 6)),
                           str(round(float(inverseAffineMatrix[0][1]), 6)), str(round(float(inverseAffineMatrix[1][2]), 6)),
                           str(round(float(inverseAffineMatrix[1][0]), 6)), str(round(float(inverseAffineMatrix[1][1]), 6)),
                           str(cameraParams['FocalLength'] * 1000), str(cameraParams['PrincipalX']), str(cameraParams['PrincipalY']),
                           str(cameraParams['K1']), str(cameraParams['K2']), str(cameraParams['K3'])])

                aValueList.append(camOri)
                imgRot = 0
                aValueList.append(imgRot)
                fcCursor.insertRow(aValueList)

                log.Message('Inserted row for: {}'.format(img), log.const_general_text)

    del fcCursor

def getDrone2MapCamParams(camFile, log):
    try:
        with open(camFile) as f:
            allCamLines = f.readlines()
    except:
        log.Message('Error in reading camera file.', log.const_critical_text)
    try:
        camHeadings = [line for line in allCamLines if 'camera_calibration_file' in line.lower()]
        if len(camHeadings) >= 2:
            camLines = allCamLines[allCamLines.index(camHeadings[0]): allCamLines.index(camHeadings[1])]
        else:
            camLines = allCamLines
        for i, line in enumerate(camLines):
            if 'FOCAL' in line:
                focalLength = line.strip().split(' ')[1].strip()
            elif line.strip() == '#Principal Point Offset xpoff ypoff in mm':
                principalX = camLines[i+1].strip().split(' ')[1].strip()
                principalY = camLines[i+2].strip().split(' ')[1].strip()
            elif line.strip() == '#Symmetrical Lens Distortion Odd-order Poly Coeffs:K0,K1,K2,K3':
                k1, k2, k3 = camLines[i+1].strip().split(' ')[-3:]
            elif '#Focal Length' in line:
                sensorParams = re.findall('[\d]+[\.]?[\d]*', line)
                if len(sensorParams) >= 1:
                    sensorWidth = float(sensorParams[0].strip('.'))
                    sensorHeight = float(sensorParams[1].strip('.'))
            elif '#Image size' in line:
                imageParams = re.findall('[\d]+[\.]?[\d]*', line)
                if len(imageParams) >= 2:
                    imageWidth = float(imageParams[0].strip('.'))
                    imageHeight = float(imageParams[1].strip('.'))

        pixelSize = sensorWidth * 1000 / imageWidth
        a0 = ((imageWidth/2) - 0.5) #* pixelSize
        a1 = 1/pixelSize
        a2 = 0
        b0 = ((imageHeight/2) - 0.5) #* pixelSize
        b1 = 0
        b2 = -1/pixelSize
        return {
                    'A0': a0,
                    'A1': a1,
                    'A2': a2,
                    'B0': b0,
                    'B1': b1,
                    'B2': b2,
                    'FocalLength': float(focalLength),
                    'PrincipalX': float(principalX),
                    'PrincipalY': float(principalY),
                    'K1': float(k1),
                    'K2': float(k2),
                    'K3': float(k3),
                    'sensorWidth': sensorWidth,
                    'sensorHeight': sensorHeight,

               }
    except Exception as e:
        log.Message('Error in reading camera parameters.{}'.format(str(e)), log.const_critical_text)

def updateFilters(oicPath, imageryType):
    with open(oicPath) as oicFile:
        oicDict = json.load(oicFile)
    if not oicDict['properties'].get('Filters'):
        oicDict['properties']['Filters'] = {"All": "1=1"}
    if imageryType.lower() == 'oblique':
        if not oicDict['properties']['Filters'].get('Oblique'):
            oicDict['properties']['Filters']['Oblique'] = "Type = 'Oblique'"
    elif imageryType.lower() == 'nadir':
        if not oicDict['properties']['Filters'].get('Nadir'):
            oicDict['properties']['Filters']['Nadir'] = "Type = 'Nadir'"
    with open(oicPath, 'w') as oicFile:
        json.dump(oicDict, oicFile)