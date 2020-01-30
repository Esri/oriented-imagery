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
# Version: 1.1.2
# Date Created : 20181104
# Date updated : 20190523
# Requirements: ArcGIS Pro 2.2
# Author: Esri Imagery Workflows team
#------------------------------------------------------------------------------

import arcpy
import os
import sys
import math
import datetime
project_folder = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
gptools_folder = os.path.join((project_folder), "GPTool")
sys.path.append(gptools_folder)
frame_camera_path = os.path.join((gptools_folder),"FrameCamera")
sys.path.append(frame_camera_path)
from FrameCamera import FrameCamera

def __init__(self, nametype):
    self._name = nametype

def main(oicPath, oicParas, inputParams, defValues, log=None):
    try:
        frame_camera = FrameCamera(log)
        eoFolder = oicParas['MetadataFolder']
        preFix = oicParas["Prefix"]
        postFix = oicParas['Suffix']
        rasterDir = oicParas['RasterPath']
        averageZ = oicParas['AverageZ(meters)']
        if not averageZ:
            averageZ = 0
        else:
            try:
                averageZ = float(averageZ)
            except:
                averageZ = 0
        cameraType = 'sanborn'        
        frame_camera.writeToFCSanborn(eoFolder, preFix, postFix, rasterDir, cameraType, oicPath, defValues, averageZ)
        return("Successfully added list of images.")
    except Exception as e:
        if log:
            log.Message("Error in adding images. {}".format(str(e)), log.const_critical_text)
        return ("Error in adding images." + str(e))