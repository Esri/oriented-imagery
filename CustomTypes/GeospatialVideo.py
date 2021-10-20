# ------------------------------------------------------------------------------
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
# ------------------------------------------------------------------------------
# Name: GeoSpatial Video
# Description: This is an custom OIC type.
# Version: 1.4
# Date Created : 20201209
# Date updated : 20211012
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
# ------------------------------------------------------------------------------

import arcpy
import os
import sys
import math
import datetime
import requests
import orientedimagerytools as oitools
import json
from datetime import datetime
from dateutil.parser import parse
from dateutil.parser import parserinfo

IDENTIFY_URL = 'https://elevation.arcgis.com/arcgis/rest/services/WorldElevation/Terrain/ImageServer/identify?geometry={}&geometryType=esriGeometryPoint&renderingRule={}&pixelSize=3&time=&returnGeometry=false&returnCatalogItems=false&token={}&f=pjson'

def __init__(self, nametype):
    self._name = nametype


def main(oicPath, oicParas, inputParams, defValues, log=None):
    try:

        addedFields = oitools.addMissingFields(oicPath,['All'])

        isSuccessful = processInput(oicPath, oicParas, inputParams, defValues, log)

        lastObjectId = oitools.returnLastOID(oicPath)

        oitools.deleteEmptyFields(oicPath, lastObjectId, addedFields)
        if isSuccessful:
            return("Successfully added list of images.")
        else:
            return("Error: Failed to add Images.")

    except Exception as e:
        if log:
            log.Message("Error in adding images. {}".format(
                str(e)), log.const_critical_text)
        arcpy.AddMessage("Error in adding images. {}".format(str(e)))
        return ("Error in adding images." + str(e))


def getOicFilePath(fcPath):
    oicParts = fcPath.split(os.sep)
    oicProjectPath = os.sep.join(oicParts[:-2])
    grpLayerName = '_'.join(oicParts[-1].split('_')[:-1])
    oicFilePath = os.path.join(oicProjectPath, '{}.oic'.format(grpLayerName))
    return oicFilePath


def returnInputTableFieldList(inputCSVFile):

    with open(inputCSVFile) as csvFile:
        headerLine = csvFile.readline()
        headerLine = headerLine.strip()

    csvFile.close()
    tableFieldList = headerLine.split(',')

    return(tableFieldList)

def returnFieldIndex (fieldList,fieldToFind):
    fieldIndex = -1

    for l in fieldList:
        if fieldToFind.lower() == l.lower():
            fieldIndex = fieldList.index(l)

    return fieldIndex

def processInput(oicPath, oicParas, inputParams, defValues, log=None):

    arcpy.AddField_management(oicPath, 'OffsetFromStart', 'DOUBLE',
                              '','','', 'OffsetFromStart')

    inputCSVFile = oicParas["Metadata File"]
    if not os.path.exists(inputCSVFile):
        log.Message("Invlalid Input file : {}".format(
            str(inputCSVFile)), log.const_critical_text)
        arcpy.AddMessage("Invlalid Input file : {}".format(str(inputCSVFile)))
        return (False)


    inputVideoFile = oicParas["Video File"]
    if not isSupportedVideoFile(inputVideoFile):
        log.Message("Video file format is not supported by Oriented Imagery Viewer : {}".format(
            str(inputVideoFile)), log.const_critical_text)
        arcpy.AddMessage("Video file format is not supported by Oriented Imagery Viewer: {}".format(str(inputVideoFile))+'\n'+'Supported formats are : MP4, MOV, WebM, and OGG ')
        return False

    keyFrame = oicParas["Frames Step (In Seconds)"]
    keyFrame = keyFrame.strip()

    if keyFrame == '':
        keyFrame = 0
    else:
        try:
            keyFrame = int(keyFrame)
        except Exception as e:
            arcpy.AddMessage("Key frame value has to be an integer. {}".format(str(e)))
            return False

    inFieldList = returnInputTableFieldList(inputCSVFile)

    outFields = ['SHAPE@','Name','Image','CamHeading','CamPitch','CamRoll','HFOV','VFOV','AvgHtAG','FarDist','NearDist','OffsetFromStart']
    #outTable = arcpy.da.InsertCursor (oicPath, outFields)

    try:
        if os.path.isfile(inputCSVFile):
            inTable = arcpy.da.SearchCursor(inputCSVFile,inFieldList)

            #get the field index
            timeStampIndex = returnFieldIndex(inFieldList,'TimeStamp')
            if timeStampIndex > -1:
                outFields.append('AcquisitionDate')

            outTable = arcpy.da.InsertCursor (oicPath, outFields)

            unixTimeStampFIndex = returnFieldIndex(inFieldList,'UNIX Time Stamp')
            if unixTimeStampFIndex == -1:
                unixTimeStampFIndex = returnFieldIndex(inFieldList,'UnixTimeStamp')
                if unixTimeStampFIndex == -1:
                    log.Message("Could Not find UnixTimeStamp or UNIX Time Stamp Field", log.const_critical_text)
                    arcpy.AddMessage("Could Not find UnixTimeStamp or UNIX Time Stamp Field")
                    return False

            yFieldIndex = returnFieldIndex(inFieldList,'SensorLatitude')
            if yFieldIndex == -1:
                log.Message("Could Not find SensorLatitude Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find SensorLatitude Field")
                return False

            xFieldIndex = returnFieldIndex(inFieldList,'SensorLongitude')
            if xFieldIndex == -1:
                log.Message("Could Not find SensorLongitude Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find SensorLongitude Field")
                return False

            platHeadingFIndex = returnFieldIndex(inFieldList,'PlatformHeading')
            if platHeadingFIndex == -1:
                log.Message("Could Not find PlatformHeading Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find PlatformHeading Field")
                return False

            platPitchFIndex = returnFieldIndex(inFieldList,'PlatformPitch')
            if platPitchFIndex == -1:
                log.Message("Could Not find PlatformPitch Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find PlatformPitch Field")
                return False

            platRollFIndex = returnFieldIndex(inFieldList,'PlatformRoll')
            if platRollFIndex == -1:
                log.Message("Could Not find PlatformRoll Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find PlatformRoll Field")
                return False

            sensorElipsHtFIndex = returnFieldIndex(inFieldList,'SensorAltitude')
            isOrthoHeight = True
            if sensorElipsHtFIndex == -1:
                sensorElipsHtFIndex = returnFieldIndex(inFieldList,'SensorEllipsoidHeight')
                if sensorElipsHtFIndex == -1:
                    log.Message("Could Not find SensorEllipsoidHeight or SensorAltitude Field", log.const_critical_text)
                    arcpy.AddMessage("Could Not find SensorEllipsoidHeight or SensorAltitude Field")
                    return False
                else:
                    isOrthoHeight = False
            else:
                isOrthoHeight = True

            sensorRelAzimuthFIndex = returnFieldIndex(inFieldList,'SensorRelativeAzimuth')
            if sensorRelAzimuthFIndex == -1:
                sensorRelAzimuthFIndex = returnFieldIndex(inFieldList,'Sensor Relative Azimuth Angle')
                if sensorRelAzimuthFIndex == -1:
                    log.Message("Could Not find SensorRelativeAzimuth Field", log.const_critical_text)
                    arcpy.AddMessage("Could Not find SensorRelativeAzimuth Field")
                    #return False

            sensorRelElevFIndex = returnFieldIndex(inFieldList,'SensorRelativeElevation')
            if sensorRelElevFIndex == -1:
                sensorRelElevFIndex = returnFieldIndex(inFieldList,'Sensor Relative Elevation Angle')
                if sensorRelElevFIndex == -1:
                    log.Message("Could Not find SensorRelativeElevation or Sensor Relative Elevation Angle Field", log.const_critical_text)
                    arcpy.AddMessage("Could Not find SensorRelativeElevation or Sensor Relative Elevation Angle Field")
                    #return False

            sensorRelRollFIndex = returnFieldIndex(inFieldList,'SensorRelativeRoll')
            if sensorRelRollFIndex == -1:
                sensorRelRollFIndex = returnFieldIndex(inFieldList,'Sensor Relative Roll Angle')
                if sensorRelRollFIndex == -1:
                    log.Message("Could Not find SensorRelativeRoll or Sensor Relative Roll Angle Field", log.const_critical_text)
                    arcpy.AddMessage("Could Not find SensorRelativeRoll or Sensor Relative Roll Angle Field")
                    #return False

            HFOVFIndex = returnFieldIndex(inFieldList,'HorizontalFOV')
            if HFOVFIndex == -1:
                log.Message("Could Not find HorizontalFOV Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find HorizontalFOV Field")
                return False

            VFOVFIndex = returnFieldIndex(inFieldList,'VerticalFOV')
            if VFOVFIndex == -1:
                log.Message("Could Not find VerticalFOV Field", log.const_critical_text)
                arcpy.AddMessage("Could Not find VerticalFOV Field")
                return False

            #aToken = returnArcGISToken()

            elevPointsResult = returnElevationPoints(inputCSVFile,isOrthoHeight)

            DEMInterval = elevPointsResult[0]
            elevPoints = elevPointsResult[1]
            if len(elevPoints) == 0:
                log.Message("Could not get elevation values. Please ensure you are connected to connected to net and signed into ArcGIS Online.", log.const_critical_text)
                arcpy.AddMessage("Could not get elevation values. Please ensure you are connected to connected to net and signed into ArcGIS Online.")
                return False

            currenttime = 0
            recCounter = -1
            firstTimeStamp = -1
            offSetFromStart = -1

            DEMIntReset = 0
            DEMIntResetCount = 0
            callInter = True
            interpolatedDiff = None

            desc = arcpy.Describe(oicPath)
            fcSRS = desc.spatialReference
            inPtSRS = arcpy.SpatialReference(4326)

            arcpy.AddMessage('Reading Records...')
            for inRow in inTable:

                #arcpy.AddMessage('DEMIntResetCount: {} , elevPoints: {}'.format(str(DEMIntResetCount),str(len(elevPoints))))
                #arcpy.AddMessage("1")

                if DEMIntResetCount == (len(elevPoints)-1):
                    startElev = elevPoints[DEMIntResetCount-1]
                    endElev = elevPoints[DEMIntResetCount]
                else:
                    startElev = elevPoints[DEMIntResetCount]
                    endElev = elevPoints[DEMIntResetCount+1]


                if callInter:
                    interpolatedDiff = returnInterpolated(startElev,endElev,DEMInterval)
                    callInter = False
                    elevVal = startElev
                else:
                    elevVal = elevVal + interpolatedDiff

                inY = float(inRow[yFieldIndex])
                inX = float(inRow[xFieldIndex])

                if timeStampIndex > -1:
                    acqDateStr = inRow[timeStampIndex]
                    acqDate = returnDate(acqDateStr)

                platHeading = float(inRow[platHeadingFIndex])
                if sensorRelAzimuthFIndex == -1:
                    sensorAzimuth = 0
                else:
                    sensorAzimuth = float(inRow[sensorRelAzimuthFIndex])

                camHeading = platHeading + sensorAzimuth
                if(camHeading < 0):
                    camHeading += 360
                elif(camHeading > 360):
                    camHeading -= 360

                platPitch = float(inRow[platPitchFIndex])
                if sensorRelElevFIndex == -1:
                    sensorRelElevAng = 0
                else:
                    sensorRelElevAng = float(inRow[sensorRelElevFIndex])

                camPitch = platPitch + sensorRelElevAng + 90

                platRoll = float(inRow[platRollFIndex])
                if sensorRelRollFIndex == -1:
                    sensorRollAng = 0
                else:
                    sensorRollAng = float(inRow[sensorRelRollFIndex])
                camRoll =  platRoll + sensorRollAng

                HFOV = int(inRow[HFOVFIndex])
                VFOV = int(inRow[VFOVFIndex])

                sensorElev = float(inRow[sensorElipsHtFIndex])

                recCounter = recCounter+1

                if keyFrame > 0:
                    unixTimeStamp = int(inRow[unixTimeStampFIndex])
                    if recCounter == 0:
                        firstTimeStamp = int(inRow[unixTimeStampFIndex])
                        offSetFromStart = 0
                        lastKeyFrameAdded = 0
                        addRec = True
                    else:
                        offSetFromStart = round((unixTimeStamp - firstTimeStamp) / 1000000)

                        recCounter = recCounter+1

                        if offSetFromStart % keyFrame == 0:
                            if offSetFromStart == lastKeyFrameAdded:
                                addRec = False
                            else:
                                addRec = True
                                lastKeyFrameAdded = offSetFromStart
                                #arcpy.AddMessage('Last Key Frame:{} '.format(str(lastKeyFrameAdded)))
                        else:
                            addRec = False

                else:
                    addRec = True
                    recCounter = recCounter+1
                    unixTimeStamp = int(inRow[unixTimeStampFIndex])

                    if recCounter == 0:
                        firstTimeStamp = int(inRow[unixTimeStampFIndex])

                    offSetFromStart = round((unixTimeStamp - firstTimeStamp) / 1000000)

                if addRec:
                    inputRowAttribs = []

                    aPoint = arcpy.Point()
                    aPoint.X = inX
                    aPoint.Y = inY

                    #if DEMIntReset == 0:
                    #    elevVal = returnElevation(isOrthoHeight,inX,inY,4326,aToken)

                    if elevVal != None:
                        avgHtAG = sensorElev - float(elevVal)
                    else:
                        avgHtAG = sensorElev

                    aPtGeometry = arcpy.PointGeometry(aPoint,inPtSRS).projectAs(fcSRS)
                    inPoint = aPtGeometry.centroid

##                    if (camPitch - (VFOV/2) <=0 ) :
##                        nearDist = 0
##                    else:
##                        nearDist = avgHtAG / math.cos( (camPitch - (VFOV/2)) * math.pi/180)
##
##                    if (camPitch + (VFOV/2) >=90) :
##                        farDist = defValues['FarDist']
##                    else:
##                        farDist = avgHtAG / math.cos((camPitch + (VFOV/2)) * math.pi/180)

##                    nearDist = abs(avgHtAG * math.tan(( camPitch - (VFOV/2))* math.pi/180))
##                    farDist = abs(avgHtAG * math.tan(( camPitch + (VFOV/2))*math.pi/180))

                    nearDist = avgHtAG / math.cos( (camPitch - (VFOV/2)) * math.pi/180)
                    farDist = avgHtAG / math.cos((camPitch + (VFOV/2)) * math.pi/180)

                    inputRowAttribs.append(inPoint)

                    inName = os.path.basename(inputVideoFile).split('.')[0]
                    inputRowAttribs.append(inName+'_'+str(int(offSetFromStart)))
                    inputRowAttribs.append(inputVideoFile)
                    inputRowAttribs.append(camHeading)
                    inputRowAttribs.append(camPitch)
                    inputRowAttribs.append(camRoll)
                    inputRowAttribs.append(HFOV)
                    inputRowAttribs.append(VFOV)
                    inputRowAttribs.append(avgHtAG)
                    inputRowAttribs.append(farDist)
                    inputRowAttribs.append(nearDist)

                    inputRowAttribs.append(offSetFromStart)
                    if timeStampIndex > -1:
                        if acqDate != None:
                            inputRowAttribs.append(acqDate)
                        else:
                            inputRowAttribs.append('')


                    outTable.insertRow(inputRowAttribs)

                DEMIntReset = DEMIntReset+1
                if DEMIntReset == round(DEMInterval):
                    DEMIntReset = 0
                    DEMIntResetCount = DEMIntResetCount + 1
                    if DEMIntResetCount >= len(elevPoints):
                        DEMIntResetCount = len(elevPoints) -1

                    callInter = True

        oicFilePath = getOicFilePath(oicPath)
        updateVideoPrefix(oicFilePath,inputVideoFile)
        return True
    except Exception as e:
        if log:
            log.Message("Error in processing images. {}".format(
                str(e)), log.const_critical_text)
        arcpy.AddMessage("Error in processing images. {}".format(str(e)))
        #return ("Error in processing images." + str(e))
        return False

def updateVideoPrefix(oicpath,videoprefix):

    with open(oicpath) as oicFile:
        oicDict = json.load(oicFile)
        #oicDict['properties']['VideoPrefix'] = videoprefix
        oicDict['properties']['DefaultAttributes']['OIType'] = 'V'

    with open(oicpath, 'w') as oicFile:
        json.dump(oicDict, oicFile)


def returnDate(dateTimeStr):
    try:
        if ' ' in dateTimeStr:
            dateTimeSplit = dateTimeStr.split(' ')
            modifiedDate = dateTimeSplit[0].replace(':','-')
            newSplit = dateTimeStr.split(' ')[1:]
            newSplit.insert(0, modifiedDate)
            dateTimeStr = ' '.join(newSplit)
        elif 'T' in dateTimeStr:
            dateTimeSplit = dateTimeStr.split('T')
            modifiedDate = dateTimeSplit[0].replace(':','-')
            newSplit = dateTimeStr.split('T')[1:]
            newSplit.insert(0, modifiedDate)
            dateTimeStr = 'T'.join(newSplit)
        elif '_' in dateTimeStr:
            dateTimeSplit = dateTimeStr.split('_')
            modifiedDate = dateTimeSplit[0].replace(':','-')
            newSplit = dateTimeStr.split(' ')[1:]
            newSplit.insert(0, modifiedDate)
            dateTimeStr = ' '.join(newSplit)
        parserInfo = parserinfo(dayfirst=False, yearfirst=True)
        dateObj = parse(dateTimeStr, parserInfo, ignoretz=True)
    except Exception as e:
        arcpy.AddWarning("{} is not in the required format.".format(dateTimeStr))
        return None
    return dateObj


def returnElevationPoints(inputFile,isOrthoMetric):

    inputCSVFile = open(inputFile)
    num_lines = sum(1 for line in inputCSVFile)
    inputCSVFile.close()

    inputCSVFile = open(inputFile)

    token = returnArcGISToken()

    #arcpy.AddMessage(num_lines)

    DEMInterval = (num_lines * 10) / 100
    DEMInterval = round(DEMInterval)
    DEMIntReset = -1

    elevationPoints = []

    if isOrthoMetric:
        renderingrule  =''
    else:
        renderingrule  = { "rasterFunction" : "Ellipsoidal_Height"}

    count = -1
    latIndex = -1
    longIndex = -1

    with inputCSVFile:
        allLines = inputCSVFile.readlines()
        #allLinesCount = len(allLines)

    for line in allLines:
        count= count+1
        #arcpy.AddMessage("count {}".format(str(count)))
        if count == 0:
            DEMIntReset = DEMIntReset+1
##            if line == "\n":
##                continue

            headerLineSplit = line.split(',')
            hLineIndex = -1
            for hline in headerLineSplit:
                hLineIndex= hLineIndex+1
                if 'SensorLatitude' in hline:
                    latIndex = hLineIndex

                if 'SensorLongitude' in hline:
                    longIndex = hLineIndex

        if count == 1 or DEMIntReset == DEMInterval or count == num_lines:
            headerLineSplit = line.split(',')
            y = headerLineSplit[latIndex]
            x = headerLineSplit[longIndex]

            #arcpy.AddMessage("AAAA ::: "+line)
            srs = '4326'
            ptGeometry = {
              "x": x,
              "y": y,
              "spatialReference": srs
            }

            elevVal = None

            try:
                retrycount = 0
                while retrycount < 5:
                    identifyURL = IDENTIFY_URL.format(ptGeometry,renderingrule,token)
                    response = requests.get(identifyURL, verify=False)
                    responseJSON = response.json()
                    if 'error' in responseJSON:
                       token = returnArcGISToken()
                       retrycount = retrycount + 1
                    else:
                        elevVal = responseJSON['value']
                        elevationPoints.append(float(elevVal))
                        break
                        #arcpy.AddMessage("Elevl {}".format(str(elevVal)))

                DEMIntReset = 0

            except Exception as e:
                if log:
                    log.Message("Error: {}".format(
                        str(e)), log.const_critical_text)
        else:
            DEMIntReset = DEMIntReset + 1

    inputCSVFile.close()

    return ([DEMInterval,elevationPoints])

def returnArcGISToken():

    signintoken = arcpy.GetSigninToken()
    aToken = signintoken['token']
    return aToken



def returnInterpolated(startElev,endElev,DEMInterval):

    if startElev < endElev:
        #Add
        diff = endElev - startElev
        inter = round(diff/DEMInterval)

    else:
        #subtract
        diff = startElev - endElev
        inter = round(diff/DEMInterval)
        inter = -inter

    return inter

def isSupportedVideoFile(videoFile):

    validFileExtList = ['.mp4','.mov','.webm','.ogg']
    vExt = os.path.splitext(videoFile)
    vExt = vExt[1].lower()

    if vExt in validFileExtList:
        return True
    else:
        return False

