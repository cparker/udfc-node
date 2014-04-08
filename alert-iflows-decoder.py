#! /usr/bin/env /usr/bin/python
import sys, json, datetime, pytz, pymongo,time
from time import gmtime, strftime


class SystemVars():
    firstRecordPrinted = False


def getCompletePacket():
    BDFPacket = []
    readCount = 0
    while readCount < 4:
        log('before readline')
        line = sys.stdin.readline().rstrip()
        if len(line) <= 0:
            log("no more lines")
            doExit(0)

        reversedLine = line[::-1]  # this is 'extended slice syntax'

        if reversedLine[:2] == '01':
            log('found {0} byte of station id'.format(readCount + 1))
            if readCount < 2:
                readCount += 1
                BDFPacket.append(reversedLine[2:])
            else:
                log('skipping unexpected byte in bitstream')
                readCount = 0
                BDFPacket = []
                continue

        if reversedLine[:2] == '11':
            log('fount {0} byte of value'.format(str(readCount - 1)))
            if 2 <= readCount < 4:
                readCount += 1
                BDFPacket.append(reversedLine[2:])
            else:
                log('skipping unexpeted byte in bitstream')
                readCount = 0
                BDFPacket = []
                continue

        if readCount == 4:
            #print('complete packet!')
            return BDFPacket


def getJSON(station, value):
    tz = pytz.timezone(strftime('%Z', gmtime()))
    bdf = {
        'stationID': station,
        'value': value,
        'datetime': datetime.datetime.now(tz=tz)
    }
    return bdf


def outputJson(station, value):
    if SystemVars.firstRecordPrinted:
        print(",")
    print(json.dumps(getJSON(station, value), indent=2, sort_keys=True))
    SystemVars.firstRecordPrinted = True


def outputText(station, value):
    print("stationID: " + str(station))
    print("value: " + str(value))


def insertToMongo(station, value):
    col = db.receivedStations
    col.insert(getJSON(station, value))
    log('inserted mongo record stationID:{station}, value:{value}'.format(station=station, value=value))


from optparse import OptionParser

commandLineOptions = OptionParser()
commandLineOptions.set_usage("""
A decoder for ALERT(Automated Local Evaluation in Real Time) Binary Data Format (BDF) packets.
INPUT : one 8-bit binary string per line, as output from minimidem (http://www.whence.com/minimodem/minimodem.1.html),
    read from stdin

OUTPUT : StationID and Value, to stdout (JSON or plain), also inserts to MongoDB

EXAMPLE: cat <some-binary-stream-file.txt> | {0}
""".format(sys.argv[0]))

commandLineOptions.add_option("--json-output", action="store_true", dest="jsonOutput", default=False,
                              help="Output JSON.  Doesn't work with verbose.")

commandLineOptions.add_option("--verbose", action="store_true", dest="verbose", default=False,
                              help="Verbose logging.  Only works with text output (the default).")

commandLineOptions.add_option("--mongo", action="store_true", dest="useMongo", default=False,
                              help="insert JSON data into a localhost mongodb instance")

commandLineOptions.add_option("--startup-delay", action="store", type="int", dest="startDelay", default=10,
                              help="wait N SECONDS before reading from stdin.  Gives time for the pipes to get setup correctly")

(options, args) = commandLineOptions.parse_args()


def log(message):
    if options.verbose and not options.jsonOutput:
        print(message)


def doExit(code):
    if options.jsonOutput:
        print(']}')
    exit(code)


mongoClient = None
db = None
if options.useMongo:
    mongoClient = pymongo.MongoClient()
    db = mongoClient.urbanDrainage

if sys.stdin.isatty():
    commandLineOptions.print_usage()
    commandLineOptions.print_help()
    doExit(1)
else:
    time.sleep(options.startDelay)
    if options.jsonOutput:
        print('{ "stations" : [ ')
    while True:
        packet = getCompletePacket()
        stationBinaryStr = packet[2][-1] + packet[1] + packet[0]
        valueBinaryStr = packet[3] + packet[2][:-1]
        stationID = int(stationBinaryStr, 2)
        stationValue = int(valueBinaryStr, 2)

        if options.jsonOutput:
            outputJson(stationID, stationValue)
        elif options.useMongo:
            insertToMongo(stationID, stationValue)
        else:
            outputText(stationID, stationValue)


