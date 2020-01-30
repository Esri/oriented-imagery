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
# Name: pictometry.py
# Description: This is an custom OIC type. It ingests data from a shape file containing data and attributes for pictometry data.
# Version: 1.1.2
# Date Created : 20181126
# Date updated : 20190523
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
#------------------------------------------------------------------------------

import arcpy
import os

#class pictometry:
def __init__(self, nametype):
    self._name = nametype


def main(oicpath,oicparas,inputParams,defValues, log=None):

    try:
        # Get the Spatial reference to the input OIC.
        outPathSRS = arcpy.Describe(oicpath).spatialReference
        count = int(arcpy.GetCount_management(oicpath)[0])
        if not count:
            maxObjectID = 0
        else:
            maxObjectID = arcpy.da.SearchCursor(oicpath, "OBJECTID", sql_clause = (None, "ORDER BY OBJECTID DESC")).next()[0]

        inPath = oicparas['InputFile']     
        imgPath = oicparas['PathToImage']
        if log:
            log.Message("Input file: {}".format(inPath), log.const_general_text)
            log.Message("Input folder: {}".format(imgPath), log.const_general_text)
        ps_microns = oicparas['PixelSize(Microns)']

        avght_meters = oicparas['AverageTerrainHeight(Meters)']

        h_wkid = oicparas['HorizontalWKID']
        v_wkid = oicparas['VeritcalWKID']

        inChkFldsList = [
            'ImageName',
        'ShotDate',
        'ImageRows',
        'ImageCols',
        'PPx',
        'PPy',
        'CameraX',
        'CameraY',
        'CameraZ',
        'Omega',
        'Phi',
        'Kappa',
        'BalancedFL',
        'BalancedK0',
        'BalancedK1',
        'BalancedK2',
        'BalancedK3',
        'Units']

        missingFldList = []
        for mFldName in inChkFldsList:
            mFldList = arcpy.ListFields(inPath,mFldName)
            if len(mFldList) == 0:
                missingFldList.append(mFldName)

        if len(missingFldList) >=1:
            errorMsg = 'Error: The following fields were required and could not be found in the input table:'+'\n'+(','.join(missingFldList))
            log.Message('Error: The following fields were required and could not be found in the input table:'+'\n'+(','.join(missingFldList)), log.const_critical_text)
            return(errorMsg)

        #Get the SRS
        #start, ext = os.path.splitext(inPath)
        inFileDesc = arcpy.Describe(inPath)
        if hasattr(inFileDesc, "spatialReference"):
            inPathSRS = arcpy.Describe(inPath).spatialReference
        else:
            inPathSRS = arcpy.SpatialReference(int(h_wkid))


        #build a list of input fields
    ##    stringfields = arcpy.ListFields(inPath)
    ##    inputFields = []
    ##    for fld in stringfields:
    ##        if ('FID' in fld.name) or ('Shape' in fld.name):
    ##            pass
    ##        else:
    ##            inputFields.append(fld.name)

        #Add missing fiedls to the OIC Table.
        arcpy.AddMessage("Adding Fields:")
        log.Message("Adding Fields:", log.const_general_text)
        #for infldName in inChkFldsList:

        for infld in arcpy.ListFields(inPath):

            if ('FID' in infld.name) or ('Shape' in infld.name):
                pass
            else:
                chkFldName = infld.name
                fieldChkList = arcpy.ListFields(oicpath,chkFldName)
                try:
                    if len(fieldChkList) == 0:
                        if chkFldName in inChkFldsList:
                            arcpy.AddField_management(oicpath, infld.name, infld.type, infld.precision, infld.scale, infld.length, infld.aliasName)
                            log.Message('Adding field {}'.format(infld.name), log.const_general_text)
                        else:
                            arcpy.AddMessage( "The field name: " + infld.name + " already exists.")
                            log.Message('The field name: {} already exists.'.format(infld.name), log.const_general_text)
                except:
                    log.Message('Could not add field {}'.format(infld.name), log.const_general_text)
                    continue

        #build the input list of output fields.
        outFldList = arcpy.ListFields(oicpath)
        outFldNameList = []
        for outfld in outFldList:
            if ('OBJECTID' in outfld.name) or ('Shape' in outfld.name):
                pass
            else:
                outFldNameList.append(outfld.name)

        outFldNameList.insert(0,'SHAPE@')

        inputFields = inChkFldsList[:]

        #if useShapeFld == True:
        #    inputFields.insert(0,'SHAPE@')

        outCursor = arcpy.da.InsertCursor(oicpath,outFldNameList)
        arcpy.AddMessage('Importing Records')
        log.Message('Importing Records', log.const_general_text)

        with arcpy.da.SearchCursor(inPath,inputFields) as inCursor:
            for inRec in inCursor:
                valueList = []
                valueList = [None] * (len(outFldNameList))

    ##            if useShapeFld == True:
    ##                aPoint = inRec[0]
    ##
    ##                aPtGeometry = aPoint.projectAs(outPathSRS)
    ##                aPoint = aPtGeometry.centroid
    ##                valueList[0] = aPoint
    ##            else:
                    #use the shape fields
                xindx = inputFields.index('CameraX')
                yindx = inputFields.index('CameraY')
                inX = inRec[xindx]
                inY = inRec[yindx]

                aPoint = arcpy.Point()
                aPoint.X = inX
                aPoint.Y = inY

                aPtGeometry = arcpy.PointGeometry(aPoint,inPathSRS).projectAs(outPathSRS)
                aPoint = aPtGeometry.centroid
                valueList[0] = aPoint

                #Set all the default values.
                defKeys = defValues.keys()
                for aKey in defKeys:
                    if aKey in outFldNameList:
                        keyindex = outFldNameList.index(aKey)
                        tdefVal = defValues[aKey]
                        try:
                            if tdefVal is not None:
                                defValAsNum = float(tdefVal)
                                valueList[keyindex] = defValAsNum
                            else:
                                #Assign default as none, if user defined default value is none.
                                valueList[keyindex] = None
                        except Exception as valueError:
                            #arcpy.AddMessage ('Value Error:'+str(valueError))
                            valueList[keyindex] = defValues[aKey][0]

                #read and set the values from the input table.
                for x in range(0, len(inputFields)):
                    infldName = inputFields[x]

                    if ('OBJECTID' in infldName) or ('Shape' in infldName):
                        #handle things.
                        continue
                    else:
                        aValue = inRec[x]
                        #arcpy.AddMessage(infldName)
                        outindex = outFldNameList.index(infldName)
                        valueList[outindex] = aValue
                #add records
                #arcpy.AddMessage(outFldNameList)
                #arcpy.AddMessage(valueList)
                outCursor.insertRow(valueList)

        del inCursor
        del outCursor
        del inRec

            #Calculate additional values.
    ##    chkFldList = arcpy.ListFields(oicpath,'X')
    ##    if len(chkFldList) == 1:
    ##        arcpy.AddMessage('Calculating X')
    ##        arcpy.CalculateField_management(oicpath, 'X',
    ##                                "!SHAPE.CENTROID.X!",
    ##                                "PYTHON3")
    ##    chkFldList = arcpy.ListFields(oicpath,'Y')
    ##    if len(chkFldList) == 1:
    ##        arcpy.AddMessage('Calculating Y')
    ##        arcpy.CalculateField_management(oicpath, 'Y',
    ##                                "!SHAPE.CENTROID.Y!",
    ##                                "PYTHON3")
        arcpy.MakeFeatureLayer_management(oicpath, out_layer='lyr_selection', 
                                      where_clause='"OBJECTID" > {}'.format(maxObjectID))     
        chkFldList = arcpy.ListFields(oicpath,'Point')

        if len(chkFldList) == 1:
            arcpy.AddMessage('Calculating Point')
            log.Message('Calculating Point', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'Point',
                                            "str(!SHAPE.CENTROID.X!)+','+str(!SHAPE.CENTROID.Y!)",
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'ImageName')
        if len(chkFldList) == 1:
            arcpy.AddMessage("Calculating Name")
            log.Message('Calculating Name', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'Name',
                                            '!ImageName!',
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'AcquisitionDate')
        if len(chkFldList) == 1:
            arcpy.AddMessage("Calculating Date")
            log.Message('Calculating Date', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'AcquisitionDate',
                                            '!ShotDate!',
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'HFOV')
        if len(chkFldList) == 1:
            arcpy.AddMessage("Calculating HFOV")
            log.Message('Calculating HFOV', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'HFOV',
                                            'math.degrees(2 * math.atan(!BalancedFL!/(!ImageCols!*'+ps_microns+'/2000)))',
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'VFOV')
        if len(chkFldList) == 1:
            arcpy.AddMessage("Calculating VFOV")
            log.Message('Calculating VFOV', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'VFOV',
                                            'math.degrees(2 * math.atan(!BalancedFL!/(!ImageRows!*'+ps_microns+'/2000)))',
                                    "PYTHON3")


        chkFldList = arcpy.ListFields(oicpath,'SRS')
        if len(chkFldList) == 1:
            arcpy.AddMessage('Calculating SRS')
            log.Message('Calculating SRS', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'SRS',
                                            outPathSRS.factoryCode,
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'CameraZ')
        if len(chkFldList) == 1:
            arcpy.AddMessage('Calculating AvgHtag')
            log.Message('Calculating AvgHtag', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'AvgHtAG',
                                            '!CameraZ! - '+avght_meters,
                                "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'Name')
        if len(chkFldList) == 1:
            #arcpy.AddMessage('Calculating Name')
            arcpy.CalculateField_management('lyr_selection', 'Name',
                                            "!ImageName!",
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'ImageName')
        if len(chkFldList) == 1:
            #imgPath = os.path.normpath(imgPath)

            imageCodeBlock = "def makeImgPath(imagePath,imgName):\n    import os\n    fullimageName = os.path.join(imagePath,imgName+'.jpg') \n    return (fullimageName)"
            arcpy.AddMessage('Calculating Image Path')
            log.Message('Calculating Image Path', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'Image',
                                            'makeImgPath(r"'+imgPath+'",!Name!)',
                                "PYTHON3",imageCodeBlock)

    #if omega phi and kappa values are available use it to caluclate camheading, campitch and camroll.
        if outFldNameList.count('Omega') == 1 and outFldNameList.count('Phi') == 1 and outFldNameList.count('Kappa') == 1:

            camHeadingFormula = '(math.atan2(-1 * (math.sin(!Phi! * (math.pi/180))), (-1 * (-math.sin(!Omega! * (math.pi/180))*math.cos(!Phi!)))) * 180) / math.pi'
            arcpy.CalculateField_management('lyr_selection', 'CamHeading',
                                            camHeadingFormula,
                                    "PYTHON3")

            camPitchFormula = 'math.acos(math.cos(!Omega! * (math.pi/180))*math.cos(!Phi! * (math.pi/180))) * 180 / math.pi'
            arcpy.CalculateField_management('lyr_selection', 'CamPitch',
                                            camPitchFormula,
                                    "PYTHON3")

            camRollFormula = '(math.atan2((-1 * ((math.sin(!Omega! * (math.pi/180))*math.sin(!Kappa! * (math.pi/180))) - (math.cos(!Omega! * (math.pi/180))*math.sin(!Phi! * (math.pi/180))* math.cos(!Kappa! * (math.pi/180))))), (math.sin(!Omega! * (math.pi/180))*math.cos(!Kappa! * (math.pi/180))) + (math.cos(!Omega! * (math.pi/180))* math.sin(!Phi! * (math.pi/180))* math.sin(!Kappa! * (math.pi/180)))) * 180) / math.pi'
            arcpy.CalculateField_management('lyr_selection', 'CamRoll',
                                            camRollFormula,
                                    "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'FarDist')
        if len(chkFldList) == 1:
            farDistCodeBlock = "def retAvgHt(VFOV,AvgHtAG,Pitch):\n    FarDist = AvgHtAG*math.sin(Pitch+(VFOV/2))\n    if FarDist > (AvgHtAG*4.0):\n        FarDist=AvgHtAG*4.0\n    return (FarDist)"
            arcpy.AddMessage('Calculating FarDist')
            log.Message('Calculating FarDist', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'FarDist',
                                            "retAvgHt(!VFOV!,!AvgHtAG!,!CamPitch!)",
                                "PYTHON3",farDistCodeBlock)

        chkFldList = arcpy.ListFields(oicpath,'NearDist')
        if len(chkFldList) == 1:

            arcpy.AddMessage('Calculating NearDist')
            log.Message('Calculating NearDist', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'NearDist',
                                            "!AvgHtAG!*math.sin(!CamPitch!-(!VFOV!/2))",
                                "PYTHON3")

        chkFldList = arcpy.ListFields(oicpath,'CamOri')
        if len(chkFldList) == 1:

            camORiExp = "returnCO(+"+h_wkid+","+v_wkid+",!CameraX!,!CameraY!,!CameraZ!,!Omega!,!Phi!,!Kappa!,!ImageCols!,!ImageRows!,"+ps_microns+",!BalancedFL!,!PPx!,!PPy!,!BalancedK0!,!BalancedK1!,!BalancedK2!,!Units!)"
            camORICodeBlock = "def returnCO(WKID_H,WKID_V,X,Y,Z,O,P,K,cols,rows,psm,FL,ppx,ppy,K1,K2,K3,units):\n    \n    if 'feet' in units.lower():\n        SC = 0.3048\n    else:\n        SC = 1   \n    Z = Z*SC\n    A0 = cols/2\n    A1 = 1/psm\n    A2 = 0\n    B0 = rows/2\n    B1 = 0\n    B2 = A1\n    PPAX = ppx*psm\n    PPAY  = ppx*psm\n    \n    camoristr = 'T|'+str(WKID_H)+'|'+str(WKID_V)+'|'+str(X)+'|'+str(Y)+'|'+str(Z)+'|'+str(O)+'|'+str(P)+'|'+str(K)+'|'+str(A0)+'|'+str(A1)+'|'+str(A2)+'|'+str(B0)+'|'+str(B1)+'|'+str(B2)+'|'+str(FL)+'|'+str(PPAX)+'|'+str(PPAY)+'|'+str(K1)+'|'+str(K2)+'|'+str(K3)\n    return(camoristr) "

            arcpy.AddMessage('Calculating Camera Orientation Parameters')
            log.Message('Calculating Camera Orientation Parameters', log.const_general_text)
            arcpy.CalculateField_management('lyr_selection', 'CamOri',
                                            camORiExp,
                                "PYTHON3",camORICodeBlock)

        arcpy.AddMessage('Cleaning up Oriented Imagery Catalog')
        log.Message('Cleaning up Oriented Imagery Catalog', log.const_general_text)
        arcpy.DeleteField_management(oicpath, inChkFldsList)

        return ("Completed.")
    except Exception as e:
        if log:
            log.Message("Error in type pictometry. {}".format(str(e)), log.const_critical_text)
        return("Error in type pictometry. {}".format(str(e)))