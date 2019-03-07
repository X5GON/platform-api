#!/usr/bin/python

from libdfxp import *
import sys

def processDfxp(pdfxp):
  for i in xrange(len(pdfxp.data)):
    d1 = pdfxp.data[i]
    if isinstance(d1,TlSegment):
      processTlSegment(d1)

def processTlSegment(s):
  sent = ""
  for d in s.data:
    if isinstance(d,TlWord):
      sent += "%s "%d.txt
    elif isinstance(d,TlRawText):
      sent += "%s "%d.txt
    elif isinstance(d,TlGroup):
      for d1 in d.data:
        if isinstance(d1,TlWord):
          sent += "%s "%d1.txt
        elif isinstance(d1,TlRawText):
          sent += "%s "%d1.txt
  if sent.strip() == "": sent = "[sonido de fondo]"
  print '<Sync time="'+str(s.begin)+'"/>\n'+sent.encode('ISO-8859-1')
  print '<Sync time="'+str(s.end)+'"/>\n[sonido de fondo]'

if len(sys.argv) != 2:
  print "Usage: %s <dfxp>"%(sys.argv[0])
  sys.exit(1)

dfxp_fn = sys.argv[1]
pdfxp = parseDfxp(dfxp_fn)
pdfxp.data = filterDfxp(pdfxp)

print '''<?xml version="1.0" encoding="ISO-8859-1"?>
<!DOCTYPE Trans SYSTEM "trans-14.dtd">
<Trans scribe="UPV" audio_filename="" version="2" version_date="120116">
<Speakers>
<Speaker id="unk" name="Unknown" check="no" type="" dialect="" accent="" scope="local"/>
</Speakers>
<Episode>
<Section type="report" startTime="0" endTime="%.2f">
<Turn startTime="0" endTime="%.2f" speaker="unk">
<Sync time="0.00"/>
[sonido de fondo]'''%(pdfxp.end,pdfxp.end)

processDfxp(pdfxp)
    
print '''</Turn>
</Section>
</Episode>
</Trans>'''

