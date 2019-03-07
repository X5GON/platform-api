#!/usr/bin/python

import sys
from libdfxp import parseDfxp

pdfxp = parseDfxp(sys.argv[1])
for s in pdfxp.data:
  print s.toText().strip().replace("\n", " ").replace("\r", "").encode('utf-8')
