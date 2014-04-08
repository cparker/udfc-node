#!/bin/bash

rtl_fm -p 65 -M fm -f 169500000 -s24k -l 50 | sox  -t raw -r 24k  -es -b16 - -t wav -es -b16 - | minimodem --rx 300 --mark 2133 --space 1920 --binary --quiet -f - | ./alert-iflows-decoder.py --mongo
