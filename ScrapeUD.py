import json, requests, pymongo, time, datetime,pytz
from pymongo import MongoClient
from pytz import reference
from datetime import datetime


baseURL = "https://udfcd.onerain.com"
jsonURL = baseURL + "/map/geojson.php"

siteParams = {
    'view_id': '364'
}

sensorParams = {
    'method': 'sensors',
    'view_id': '364'
}

sensorClasses = {
    'airTemp': 30,
    'pressure': 53,
    'batteryVoltage': 199,
    'dewPoint': 34,
    'evaptranspiration': 84,
    'flowRate': 25,
    'fuelMoisture': 52,
    'fuelTemperature': 38,
    'solarRadiation': 60,
    'ph': 100,
    'precipAccum': 11,
    'relativeHumidity': 50,
    'repeaterStatus': 198,
    'soilMoisture': 51,
    'specificConductance': 109,
    'stage': 20,
    'waterTemperature': 35,
    'windDirection': 44,
    'windRun': 43,
    'windVelocity': 40,
    'windVelocityMax': 41
}

headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/33.0.1750.152 Safari/537.36",
}


# establish a session
session = requests.Session()
loginResponse = session.get(baseURL, headers=headers, verify=False)

mongoClient = MongoClient()
db = mongoClient.urbanDrainage


def scrapeSites():
    # get SITES
    allSiteJson = session.get(jsonURL, params=siteParams).json()

    # insert SITES
    sitesCol = db.sites
    for site in allSiteJson['features']:
        sitesCol.insert(site)


def scrapeSensors():
    # insert sensor details
    sensorCol = db.sensors
    for sensorClass in sensorClasses:
        sensorParams['sensor_class'] = sensorClasses[sensorClass]
        print("using params " + str(sensorParams))
        sensorJson = session.get(jsonURL, params=sensorParams).json()
        time.sleep(0.2)

        for sensorRecord in sensorJson['features']:
            # check to see if we already have a record of this sensor at this time
            tz = pytz.timezone('US/Mountain')
            sensorRecordDT = sensorRecord['properties']['last_time']
            if (sensorRecordDT == None):
                print("missing last_time")
                continue

            realTime = datetime.strptime(sensorRecordDT, "%Y-%m-%d %H:%M:%S")
            realTime.replace(tzinfo=tz)
            if (realTime == None):
                print("couldn't parse " + sensorRecordDT)
                continue

            sensorRecord['properties']['last_time'] = realTime
            sensorQ = {
                'properties.device_alias': sensorRecord['properties']['device_alias'],
                'properties.device_id': sensorRecord['properties']['device_id'],
                'properties.last_time': realTime
            }

            if sensorCol.find_one(sensorQ) is None:
                sensorCol.insert(sensorRecord)


scrapeSites()
scrapeSensors()









