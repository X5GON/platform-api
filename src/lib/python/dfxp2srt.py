#!/usr/bin/python

from libdfxp import *
import sys

dfxp_fn = sys.argv[1]
pdfxp = parseDfxp(dfxp_fn)
#pdfxp.data = filterDfxp(pdfxp)
srt = convert_dfxp(pdfxp, form=2)
print srt
