define({
  "_widgetLabel": "เพิ่มข้อมูล",
  "noOptionsConfigured": "ไม่มีตัวเลือกที่มีการกำหนดค่า",
  "tabs": {
    "search": "ค้นหา",
    "url": "URL",
    "file": "ไฟล์"
  },
  "search": {
    "featureLayerTitlePattern": "{serviceName} - {layerName}",
    "layerInaccessible": "ชั้นข้อมูลนี้ไม่สามารถเข้าถึงได้",
    "loadError": "เพิ่มข้อมูล ไม่สามารถโหลด:",
    "searchBox": {
      "search": "ค้นหา",
      "placeholder": "ค้นหา..."
    },
    "bboxOption": {
      "bbox": "ภายในแผนที่"
    },
    "scopeOptions": {
      "anonymousContent": "เนื้อหา",
      "myContent": "เนื้อหาของฉัน",
      "myOrganization": "องค์กรของฉัน",
      "curated": "การจัดการ",
      "ArcGISOnline": "ArcGIS Online"
    },
    "sortOptions": {
      "prompt": "จำแนกโดย:",
      "relevance": "สัมพันธ์",
      "title": "ชื่อ",
      "owner": "เจ้าของ",
      "rating": "อันดับ",
      "views": "จำนวนผู้ชม",
      "date": "วันที่",
      "switchOrder": "เปลี่ยน"
    },
    "typeOptions": {
      "prompt": "ชนิด",
      "mapService": "เซอร์วิสแผนที่",
      "featureService": "ฟีเจอรเซอร์วิส",
      "imageService": "เซอร์วิสภาพ",
      "vectorTileService": "เซอร์วิสเวกเตอร์ไทล์",
      "kml": "KML",
      "wms": "WMS"
    },
    "resultsPane": {
      "noMatch": "ไม่พบผลลัพธ์"
    },
    "paging": {
      "first": "<<",
      "firstTip": "หน้าแรก",
      "previous": "<",
      "previousTip": "ก่อนหน้า",
      "next": ">",
      "nextTip": "ถัดไป",
      "pagePattern": "{page}"
    },
    "resultCount": {
      "countPattern": "{count} {type}",
      "itemSingular": "รายการ",
      "itemPlural": "รายการ"
    },
    "item": {
      "actions": {
        "add": "เพิ่ม",
        "close": "ปิด",
        "remove": "นำออก",
        "details": "รายละเอียด",
        "done": "เรียบร้อย",
        "editName": "แก้ไขชื่อ"
      },
      "messages": {
        "adding": "กำลังเพิ่ม...",
        "removing": "กำลังลบ...",
        "added": "เพิ่มแล้ว",
        "addFailed": "การเพิ่มข้อมูลล้มเหลว",
        "unsupported": "ไม่รองรับ"
      },
      "typeByOwnerPattern": "{type} โดย {owner}",
      "dateFormat": "d MMMM,yyyy",
      "datePattern": "{date}",
      "ratingsCommentsViewsPattern": "{ratings} {ratingsIcon} {comments} {commentsIcon} {views} {viewsIcon}",
      "ratingsCommentsViewsLabels": {
        "ratings": "เรตติ้ง\", \"ความคิดเห็น\": \"ความคิดเห็น\", \"วิว\": \"วิว"
      },
      "types": {
        "Map Service": "เซอร์วิสแผนที่",
        "Feature Service": "ฟีเจอรเซอร์วิส",
        "Image Service": "เซอร์วิสภาพ",
        "Vector Tile Service": "เซอร์วิสเวกเตอร์ไทล์",
        "WMS": "WMS",
        "KML": "KML"
      }
    }
  },
  "addFromUrl": {
    "type": "ชนิด",
    "url": "URL",
    "types": {
      "ArcGIS": "An ArcGIS Server Web Service",
      "WMS": "A WMS OGC Web Service",
      "WMTS": "A WMTS OGC Web Service",
      "WFS": "A WFS OGC Web Service",
      "KML": "ไฟล์ KML",
      "GeoRSS": "ไฟล์ GeoRSS",
      "CSV": "ไฟล์ CSV"
    },
    "samplesHint": "ตัวอย่าง URL"
  },
  "addFromFile": {
    "intro": "คุณสามารถวางหรือเรียกดูไฟล์ประเภทใด ประเภทหนึ่งต่อไปนี้:",
    "types": {
      "Shapefile": "Shapefile (.zip, ไฟล์ ZIP ที่มีไฟล์ shapefile ทั้งหมดอยู่ภายใน)",
      "CSV": "ไฟล์ CSV (.csv ที่มีที่อยู่ หรือค่าลองจิจูด ละติจูด และจุลภาค เซมิคอลอน หรือ คั่นด้วยแท็บ)",
      "KML": "ไฟล์ KML (.kml)",
      "GPX": "ไฟล์ GPX (.gpx ไฟล์สำหรับการแลกเปลี่ยนรูปแบบจากอุปกรณ์ GPS)",
      "GeoJSON": "ไฟล์ GeoJSON (.geo.json หรือ .geojson)"
    },
    "generalizeOn": "ลดทอนรายละเอียดฟีเจอร์เพื่อใช้ในการแสดงผลบนเว็บ",
    "dropOrBrowse": "วางหรือเรียกดู",
    "browse": "ค้นหา",
    "invalidType": "ชนิดไฟล์นี้ไม่สนับสนุน",
    "addingPattern": "{filename}: กำลังเพิ่ม",
    "addFailedPattern": "{filename}: เพิ่มไม่สำเร็จ",
    "featureCountPattern": "{filename}: {count} ชิ้น",
    "invalidTypePattern": "{filename}: ไม่สนับสนุนไฟล์ประเภทนี้",
    "maxFeaturesAllowedPattern": "จำนวนสูงสุด {count} ชิ้น ที่ยอมให้ใช้ได้",
    "layerNamePattern": "{filename} - {name}"
  },
  "layerList": {
    "caption": "เลเยอร์",
    "noLayersAdded": "ไม่มีเลเยอร์ได้เพิ่ม",
    "removeLayer": "ลบชั้นข้อมูล",
    "back": "กลับ"
  }
});