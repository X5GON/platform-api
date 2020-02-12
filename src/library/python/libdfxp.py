#!/usr/bin/python
# -*- coding: utf-8 -*-
#
#  Copyright 2012,2013,2014 transLectures-UPV Team
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#  http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
#

"""
    libdfxp.py: A library/parser for the transLectures-extended DFXP file format.

    Creates an object representation of a TL-dfxp file, allowing the user to
    manipulate the data according to the tL use cases (i.e. choose an specific 
    segment among different alternatives stated by one <tl:alt> tag).

    This library also includes a sample main function. You can execute it via 
    command-line as follows:

    $> python tldfxp.py <dfxp_file>

"""

#---- module imports ----#

from xml.dom.minidom import parse, parseString, Text, Element
from datetime import datetime
from string import join, split
import re
import sys
import cStringIO
import json

####---- Global variables ----####

SPECIAL_TOKENS = [ "[hesitation]", "<unk>", "~SILENCE~", "~SIL", "[UNKNOWN]", "[SILENCE]", "[unknown]", "[HESITATION]" ]
STATUS_VALUES = [ "fully_automatic", "partially_human", "fully_human" ]
DFXP_VERSION = "1.1"

#---- class definitions ----#

class Tl(object):
    """ 
      Base class with common attributtes and methods that will be
      inherited by the rest of classes.

    """

    def __init__(self):
        self.authorType = None
        self.authorId = None
        self.authorConf = None
        self.wordSegId = None
        self.timeStamp = None
        self.confMeasure = None
        self.begin = None
        self.end = None
        self.dfxp = None
        self.lang = None
        # Attributes proposed by EML
        self.elapsedTime = None
        self.modelId = None
        self.processingSteps = None
        self.audioLength = None
        self.status = None

    def __repr__(self):
        string = ""
        if self.authorType != None and (self.dfxp.authorType != self.authorType or isinstance(self,TlDfxp)): string += ' authorType="%s"'%(self.authorType)
        if self.authorId != None and (self.dfxp.authorId != self.authorId or isinstance(self,TlDfxp)): string += ' authorId="%s"'%(self.authorId)
        if self.authorConf != None and (self.dfxp.authorConf != self.authorConf or isinstance(self,TlDfxp)): string += ' authorConf="%.2f"'%(self.authorConf)
        if self.wordSegId != None and (self.dfxp.wordSegId != self.wordSegId or isinstance(self,TlDfxp)): string += ' wordSegId="%s"'%(self.wordSegId)
        if self.timeStamp != None and (self.dfxp.timeStamp != self.timeStamp or isinstance(self,TlDfxp)):   
            tt = self.timeStamp.timetuple()
            timestr = '%04d-%02d-%02dT%02d:%02d:%02d'%(tt[0],tt[1],tt[2],tt[3],tt[4],tt[5])
            string += ' timeStamp="%s"'%(timestr)
        #if self.confMeasure != None and (self.dfxp.confMeasure != self.confMeasure or isinstance(self,TlDfxp)): string += ' confMeasure="%.2f"'%(self.confMeasure)
        if self.confMeasure != None: string += ' confMeasure="%.4f"'%(self.confMeasure)
        if self.begin != None: string += ' begin="%.2f"'%(self.begin)
        if self.end != None: string += ' end="%.2f"'%(self.end)
        return string

    def printXml(self, out):
        if self.authorType != None and (self.dfxp.authorType != self.authorType or isinstance(self,TlDfxp)): w(out, ' aT="%s"'%(self.authorType))
        if self.authorId != None and (self.dfxp.authorId != self.authorId or isinstance(self,TlDfxp)): w(out, ' aI="%s"'%(self.authorId))
        if self.authorConf != None and (self.dfxp.authorConf != self.authorConf or isinstance(self,TlDfxp)): w(out, ' aC="%.2f"'%(self.authorConf))
        if self.wordSegId != None and (self.dfxp.wordSegId != self.wordSegId or isinstance(self,TlDfxp)): w(out, ' wS="%s"'%(self.wordSegId))
        if self.timeStamp != None and (self.dfxp.timeStamp != self.timeStamp or isinstance(self,TlDfxp)):   
            tt = self.timeStamp.timetuple()
            timestr = '%04d-%02d-%02dT%02d:%02d:%02d'%(tt[0],tt[1],tt[2],tt[3],tt[4],tt[5])
            w(out, ' tS="%s"'%(timestr))
        #if self.confMeasure != None and (self.dfxp.confMeasure != self.confMeasure or isinstance(self,TlDfxp)): w(' confMeasure="%.2f"'%(self.confMeasure))
        if self.confMeasure != None: w(out, ' cM="%.4f"'%(self.confMeasure))
        if self.begin != None: w(out, ' b="%.2f"'%(self.begin))
        if self.end != None: w(out, ' e="%.2f"'%(self.end))
        if self.elapsedTime != None and (self.dfxp.elapsedTime != self.elapsedTime or isinstance(self,TlDfxp)): w(out, ' eT="%s"'%(self.elapsedTime))
        if self.modelId != None and (self.dfxp.modelId != self.modelId or isinstance(self,TlDfxp)): w(out, ' mI="%s"'%(self.modelId))
        if self.processingSteps != None and (self.dfxp.processingSteps != self.processingSteps or isinstance(self,TlDfxp)): w(out, ' pS="%s"'%(self.processingSteps))
        if self.audioLength != None and (self.dfxp.audioLength != self.audioLength or isinstance(self,TlDfxp)): w(out, ' aL="%s"'%(self.audioLength))
        if self.status != None and (self.dfxp.status != self.status or isinstance(self,TlDfxp)): w(out, ' st="%s"'%(self.status))

class TlDfxp(Tl):
    """ 
      Represents the whole dfxp file.
      "data" attribute contains a sorted list of the elements below the <body> element.

    """

    ALL_DATA = 0
    ORI_DATA = 1
    CURR_DATA = 2
    
    SEG_FILT_DISABLE = 0
    SEG_FILT_ENABLE = 1
    SEG_FILT_EMPTY = -1

    def __init__(self):
        Tl.__init__(self)
        self.videoId = None
        self.version = DFXP_VERSION
        self.dfxp = self
        self.oridata = []
        self.data = []

    def __repr__(self):
        string = '<tl:document'
        string += ' version="%s"'%(self.version)
        if self.videoId != None: string += ' videoId="%s"'%(self.videoId)
        string += Tl.__repr__(self)
        string +='/>'
        for d in self.data:
            string += '\n\n%s'%(d)
        return string

    def printXml(self, out):
        w(out, '<tl:d')
        w(out, ' v="%s"'%(self.version))
        if self.videoId != None: w(out, ' vI="%s"'%(self.videoId))
        Tl.printXml(self, out)
        w(out, '/>')

    def toXml(self, data=ALL_DATA, seg_filt_pol=SEG_FILT_DISABLE):
	""" Returns an string, which contains a TL-dfxp xml representation of the data. 
	    It allows the user to provide previously manipulated data to be outputed.
	    
	    Arguments:
	    data -- Sorted list of the Elements that will be outputed (default: self.data class attribute)
	"""

        lang = 'en'
        if self.lang != None:
          lang = self.lang

        if self.oridata == [] and self.data != []:
          self.oridata = self.data[:]

        if seg_filt_pol != self.SEG_FILT_DISABLE:
          if data in (self.CURR_DATA, self.ALL_DATA):
            for s in self.data:
              filterSegment(s, seg_filt_pol)
          if data in (self.ORI_DATA, self.ALL_DATA):
            for s in self.oridata:
              filterSegment(s, seg_filt_pol)

        out = cStringIO.StringIO()

        w(out, '<?xml version="1.0" encoding="utf-8"?>' \
		 '\n<tt xml:lang="'+lang+'" xmlns="http://www.w3.org/2006/04/ttaf1" xmlns:tts="http://www.w3.org/2006/10/ttaf1#style" xmlns:tl="translectures.eu">' \
		 '\n<head>' \
		 '\n<tl:d')
        w(out, ' v="%s"'%(self.version))
        if self.videoId != None: w(out,' vI="%s"'%(self.videoId))
        Tl.printXml(self, out)
        w(out, '/>' \
                '\n</head>' \
                '\n<body>')

        if data in (self.CURR_DATA, self.ALL_DATA):
            if data == self.ALL_DATA: w(out, '\n<tl:c>')
            for d in self.data:
                d.printXml(out)
            if data == self.ALL_DATA: w(out, '\n</tl:c>')
        if data in (self.ORI_DATA, self.ALL_DATA):
            if data == self.ALL_DATA: w(out, '\n<tl:o>')
            for d in self.oridata:
                d.printXml(out)
            if data == self.ALL_DATA: w(out, '\n</tl:o>')

        w(out,'\n</body>' \
                '\n</tt>')

        data = out.getvalue()
        out.close()
        return data

    def toJSON(self, data=CURR_DATA, seg_filt_pol=SEG_FILT_DISABLE):
 
        if data == self.ORI_DATA:
            td = self.oridata
        else:
            td = self.data

        d = []
        for s in td:
           if seg_filt_pol != self.SEG_FILT_DISABLE:         
               filterSegment(s, seg_filt_pol)
           ret = s.toDict()
           d.append(ret)

        jsond = {'meta':{'b':self.begin, 'e':self.end, 'c':self.confMeasure, 'i':self.videoId}, 'data':d}

        return json.dumps(jsond, indent=4, encoding='utf-8')

    def toIBMJSON(self, data=CURR_DATA, seg_filt_pol=SEG_FILT_DISABLE):
 
        if data == self.ORI_DATA:
            td = self.oridata
        else:
            td = self.data

        d = []
        for s in td:
           if seg_filt_pol != self.SEG_FILT_DISABLE:         
               filterSegment(s, seg_filt_pol)
           ret = s.toIBMDict()
           d.append(ret)

        jsond = {'results':d}

        return json.dumps(jsond, indent=4, encoding='utf-8')




    def toText(self, data=None):
	""" Returns an string, which contains just plain text from the transcription/translation. 
	    It allows the user to provide previously manipulated data to be outputed.
	    
	    Arguments:
	    data -- Sorted list of the Elements that will be outputed (default: self.data class attribute)
	"""
	
        if data == None: data = self.data
        string = ""
        for d in data:
            string += "%s"%(d.toText())
        return string.encode('utf-8')
	

class TlAlt(object):
    """ 
      Represents a <tl:alt> Element. 
      "data" attribute contains a sorted list of the elements below this <tl:alt> element.

    """

    def __init__(self,dfxp):
        self.dfxp = dfxp
        self.data = []

    def __repr__(self):
        string = '<tl:alt>'
        for d in self.data:
            string += '\n%s'%(d)
        string += '\n</tl:alt>'
        return string

    def printXml(self, out):
        w(out,'\n<tl:a>')
        for d in self.data:
            d.printXml(out)
        w(out,'\n</tl:a>')

    def toText(self):
	""" Returns plain text from all child nodes. """
       	string = ""
        for d in self.data:
            string += "%s"%(d.toText())
        return string
	  

class TlSegment(Tl):
    """ 
      Represents a <tl:segment> Element. 
      "data" attribute contains a sorted list of the elements below this <tl:segment> element.

    """

    def __init__(self, dfxp, sId, begin, end):
        Tl.__init__(self)
        self.dfxp = dfxp
        self.segmentId = int(sId)
        self.begin = begin
        self.end = end
        self.data = []
        self.highlight = False
        self.deleted = False
        self.alignId = None

    def __repr__(self):
        string = '<tl:segment'
        string += ' segmentId="%d" highlight="%d" deleted="%d"' % (self.segmentId, int(self.highlight), int(self.deleted))
        if self.alignId != None: string += ' alignId="%s"' % (self.alignId)
        string += Tl.__repr__(self)    
        string +='>'
        for d in self.data:
            string += '\n%s'%(d)
        string += '\n</tl:segment>'
        return string
 
    def printXml(self, out):
        w(out,'\n<tl:s')
        w(out,' sI="%d"' % (self.segmentId))
        if self.highlight:
            w(out,' h="%d"' % (int(self.highlight)))
        if self.deleted:
            w(out,' d="%d"' % (int(self.deleted)))
        if self.alignId != None:
            w(out,' lI="%s"' % (self.alignId))
        Tl.printXml(self, out)
        w(out,'>')
        for d in self.data:
            d.printXml(out)
        w(out,'\n</tl:s>')
      
    def toText(self):
        """ Returns plain text from all child nodes. """
        string = ""
        for d in self.data:
            string += "%s "%(d.toText())
        string += '\n'
        return string

    def toDict(self):
        d = {'id':self.segmentId, 'b':self.begin, 'e':self.end, 'wl':[], 'aT':self.authorType }
        if self.confMeasure != None:
            d['c'] = self.confMeasure
        for x in self.data:
            d['wl'].append(x.toDict())
        return d

    def toIBMDict(self):
        d = {'timestamps':[], 'confidence':self.confMeasure, 'word_confidence':[], 'transcript':""}
        for x in self.data:
            if isinstance(x, TlWord):
                d['timestamps'].append(x.toIBMDictTS())
                d['word_confidence'].append(x.toIBMDictCM())
                d['transcript'] += "%s " % x.txt
            else:
                d['timestamps'].append(x.toIBMDictTS(self.begin, self.end))
                d['word_confidence'].append(x.toIBMDictCM(self.confMeasure))
                d['transcript'] = x.txt
        d['transcript'] = d['transcript'].strip()
        return {'alternatives':[d], 'final':True}

class TlGroup(Tl):
    """ 
      Represents a <tl:group> Element. 
      "data" attribute contains a sorted list of the elements below this <tl:group> element.

    """

    def __init__(self, dfxp, begin, end):
        Tl.__init__(self)
        self.dfxp = dfxp
        self.begin = begin
        self.end = end
        self.data = []

    def __repr__(self):
        string = '<tl:group'
        string += Tl.__repr__(self)    
        string +='>'
        for d in self.data:
            string += '\n%s'%(d)
        string += '\n</tl:group>'
        return string
 
    def printXml(self,out):
        w(out,'\n<tl:g')
        Tl.printXml(self,out)    
        w(out,'>')
        for d in self.data:
            d.printXml(out)
        w(out,'\n</tl:g>')
      
    def toText(self):
        """ Returns plain text from all child nodes. """
        string = ""
        for d in self.data:
            string += d.toText()+' '
        return string


class TlWord(Tl):
    """ 
      Represents a <tl:word> Element. 
      "txt" attribute contains the word that follows this <tl:word> element.

    """

    def __init__(self,dfxp):
        Tl.__init__(self)
        self.dfxp = dfxp
        self.txt = None

    def __repr__(self):
        string = '<tl:w'
        string += Tl.__repr__(self)    
        string +='/>'
        string +=' %s'%(self.txt)
        return string
 
    def printXml(self, out):
        w(out,'\n<tl:w')
        Tl.printXml(self,out)    
        w(out, '>%s</tl:w>'%(escape(self.txt)))
   
    def toText(self):
        """ Returns plain text. """
        return self.txt

    def toDict(self):
        d = {'b':self.begin, 'e':self.end, 'w':self.txt }
        if self.confMeasure != None:
            d['c'] = self.confMeasure
        return d

    def toIBMDictTS(self):
        return [self.txt, self.begin, self.end]

    def toIBMDictCM(self):
        return [self.txt, self.confMeasure]


class TlRawText(object):
    """ 
      Represents raw text located inside <tl:segment> or <tl:group> Elements. 
      "txt" attribute contains this text.

    """
    
    def __init__(self, txt):
        self.txt = txt

    def __repr__(self):
        return escape(self.txt)
 
    def printXml(self,out):
        w(out,'\n%s'%(escape(self.txt)))
      
    def toText(self):
        """ Returns plain text. """
        return self.txt

    def toDict(self):
        return {'w':self.txt}

    def toIBMDictTS(self, b, e):
        return [self.txt, b, e]

    def toIBMDictCM(self, cm):
        return [self.txt, cm]

class AlignFormatException(Exception):
    pass

class TlDfxpFormatError(Exception):
    """ 
      Exception that is thrown if the xml format is not compilant with the specifications
      of the TransLectures-DFXP extension. 

    """
    pass

#---- public functions

def escape(string):
    """ escapes xml-reserved tokens. """
    return re.sub(r"&(?!#\d{4};|amp;|lt;|gt;|quot;|apos;)", "&amp;", string).replace('<','&lt;').replace('>','&gt;').replace('"','&quot;').replace("'",'&apos;')

def parseDfxp(fn):
    """ Open, read, and parse a TL-DFXP file.

	Arguments:
	fn -- tl-dfxp file name.
    """

    dfxp = TlDfxp()
    pxml = parse(fn)
    __handleTt(pxml.getElementsByTagName("tt")[0], dfxp)
    if dfxp.version != DFXP_VERSION:
      upgrade_format(dfxp)
    if dfxp.oridata == [] and dfxp.data != []:
      dfxp.oridata = dfxp.data[:]
    return dfxp

def parseStrDfxp(string):
    """ Parse TL-DFXP string.

	Arguments:
	string -- tl-dfxp string.
    """
    dfxp = TlDfxp()
    pxml = parseString(string)
    __handleTt(pxml.getElementsByTagName("tt")[0], dfxp)
    return dfxp

def filterSegment(obj,filt=1, get_literal_on_subs=False):
  """ Filters segment data (special tokens) """ 
  if filt == -1: # Empty text
    obj.data = [ TlRawText("") ]
    return obj
  if filt == 0: # No filtering
    return obj
  if filt == 1: # filter special tokens and syntax
    new_data = []
    for d in obj.data:
      if isinstance(d,TlWord):
        if d.txt not in SPECIAL_TOKENS:
          new_data.append(d)
      elif isinstance(d,TlRawText):
        if get_literal_on_subs:
            d.txt = re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\1',d.txt))
        else:
            d.txt = re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d.txt))
        new_data.append(d)
      else:
        new_data.append(d)
    obj.data = new_data
    return obj

def filterAlt(obj,doc_ts,policy=2):
  """ Given a <tl:alt>, returns the best alternative (segment) 
      according to the specified policy 

  """ 
  if policy == 1 or policy == 10: # return last alternative
    last = None
    last_ts = datetime(1970,01,01,00,00)
    for d2 in obj.data:
      ts = d2.timeStamp
      if ts == None: 
        ts = doc_ts
      if ts == None: 
        last = d2
      elif ts > last_ts: 
        last = d2
        last_ts = ts
    return last
  elif policy == 2: # return best alternatives
    max_confMeasure = -1
    max_authorConf = -1
    last_ts = datetime(1970,01,01,00,00)
    max_seg = None
    human = False
    human_ac0 = None
    for d2 in obj.data:
      if d2.authorType == "human" or (d2.authorType == None and pdfxp.authorType == "human"):
        human = True
        if d2.authorConf == 0 or (d2.authorConf == None and pdfxp.authorConf == 0): # skip humans with aC == 0. 
          human_ac0 = d2
          continue
      ts = d2.timeStamp
      if ts == None: ts = doc_ts
      if ts == None: ts = datetime(2010,01,01,00,00)
      if not(human):
        if d2.confMeasure > max_confMeasure or (d2.confMeasure == max_confMeasure and ts > last_ts):
          max_confMeasure = d2.confMeasure
          last_ts = ts
          max_seg = d2
      elif human and d2.authorType == "human":
        if d2.authorConf > max_authorConf or (d2.authorConf == max_authorConf and ts > last_ts):
          max_authorConf = d2.authorConf
          last_ts = ts
          max_seg = d2
    if max_seg == None:
        max_seg = human_ac0
    return max_seg
  elif policy == 3: # return original, former transcription 
    first = None
    first_ts = datetime(3000,01,01,00,00)
    for d2 in obj.data:
      ts = d2.timeStamp
      if ts == None: 
        ts = doc_ts
      if ts == None: 
        first = d2
      elif ts < first_ts: 
        first = d2
        first_ts = ts
    return first
  else:
    return None
    
def filterDfxp(pdfxp, altFiltPol=2, segFiltPol=1, get_literal_on_subs=False):
  """ Filters the whole DFXP file """
  if altFiltPol == 0: # return all stuff
    return pdfxp.data
  else:
    filt_data = []
    doc_ts = pdfxp.timeStamp
    for d1 in pdfxp.data:
      if isinstance(d1,TlSegment):
        # altFiltPol == 10 -> Return only human segments with authorConf < 1.0
        if altFiltPol == 10 and ( (d1.authorType == "automatic") or (d1.authorType == "human" and d1.authorConf == 1) ):
          continue
        fs = filterSegment(d1,segFiltPol, get_literal_on_subs)
        if fs == None: return None
        filt_data.append(fs)
      elif isinstance(d1,TlAlt):
        seg = filterAlt(d1,doc_ts,altFiltPol)
        if altFiltPol == 10 and ( (seg.authorType == "automatic") or (seg.authorType == "human" and seg.authorConf == 1) ):
          continue
        if seg == None: return None
        fs = filterSegment(seg,segFiltPol, get_literal_on_subs)
        if fs == None: return None
        filt_data.append(fs)
      else:
        return None
    return filt_data

def format_time(t, delim=","):
  """ Timestamp formatting according to the DFXP specs """
  left=int(t); 
  h=left/3600; 
  m=(left%3600)/60; 
  s=((left%3600)%60)%60; 
  dec=int(str("%.3f"%(t-left))[2:]); 
  return "%02d:%02d:%02d%c%03d"%(h,m,s,delim,dec);

def convert_dfxp(pdfxp, form=0, sel_data=TlDfxp.CURR_DATA, seg_filt_pol=TlDfxp.SEG_FILT_ENABLE):
  """ DFXP object representation to text (DFXP, non-extended DFXP, srt) """
 
  if form == 0: 
    data = pdfxp.toXml(sel_data, seg_filt_pol)

  else:
    
    if pdfxp.oridata == [] and pdfxp.data != []:
      pdfxp.oridata = pdfxp.data[:]

    if sel_data == TlDfxp.ORI_DATA:
      dfxp_data = pdfxp.oridata
    else:
      dfxp_data = pdfxp.data

    if seg_filt_pol != TlDfxp.SEG_FILT_DISABLE:
      for s in dfxp_data:
        filterSegment(s, seg_filt_pol)
  
    if form == 1: # non-extended dfxp format
      data = '<tt xml:lang="" xmlns="http://www.w3.org/2006/10/ttaf1">\n <head>\n </head>\n <body>\n  <div>\n'
      for d1 in dfxp_data:
        if isinstance(d1,TlSegment):
          string = ""
          for d2 in d1.data:
            if isinstance(d2,TlWord) or isinstance(d2,TlRawText):
              string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d2.txt)))
              #string += "%s "%(re.sub(r'/([^/]+)/([^/]*)/',r'\2',d2.txt))
            elif isinstance(d2,TlGroup):
              for d3 in d2.data: string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d3.txt)))
          data += '   <p xml:id="%s" begin="%.2fs" end="%.2fs">\n    %s\n   </p>\n'%(str(d1.segmentId), d1.begin, d1.end, string.encode("UTF-8"))
      data += '  </div>\n </body>\n</tt>'
  
    elif form == 2: # srt
     data = ''
     i = 1
     for d1 in dfxp_data:
      if isinstance(d1,TlSegment):
        string = ""
        for d2 in d1.data:
          if isinstance(d2,TlWord) or isinstance(d2,TlRawText):
            string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d2.txt)))
          elif isinstance(d2,TlGroup):
            for d3 in d2.data: string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d3.txt)))
        beg = format_time(d1.begin)
        end = format_time(d1.end)
        data += '%d\n%s --> %s\n%s\n\n'%(i, beg, end, string.encode("UTF-8"))
        i += 1
  
    elif form == 3: # vtt
     data = 'WEBVTT\n\n'
     for d1 in dfxp_data:
      if isinstance(d1,TlSegment):
        string = ""
        for d2 in d1.data:
          if isinstance(d2,TlWord) or isinstance(d2,TlRawText):
            string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d2.txt)))
          elif isinstance(d2,TlGroup):
            for d3 in d2.data: string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d3.txt)))
        beg = format_time(d1.begin, delim='.')
        end = format_time(d1.end, delim='.')
        data += '%s --> %s\n%s\n\n'%(beg, end, string.encode("UTF-8"))

    elif form == 4: # txt
     data = ''
     for d1 in dfxp_data:
      if isinstance(d1,TlSegment):
        string = ""
        for d2 in d1.data:
          if isinstance(d2,TlWord) or isinstance(d2,TlRawText):
            string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d2.txt)))
          elif isinstance(d2,TlGroup):
            for d3 in d2.data: string += "%s "%(re.sub(r'\s+',r' ', re.sub(r'/([^/]+)/([^/]*)/',r'\2',d3.txt)))
        data += '%s\n'%(string.encode("UTF-8"))

    elif form == 5:
      data = pdfxp.toJSON(sel_data, seg_filt_pol)

    elif form == 6:
      data = pdfxp.toIBMJSON(sel_data, seg_filt_pol)


  return data

def create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight=False):
  newSeg = TlSegment(pdfxp,int(cm['sI']),float(cm['b']), float(cm['e']))
  newSeg.alignId = cm.get('aI', None)
  newSeg.data = [ TlRawText(escape(cm['t'].strip())) ]
  newSeg.confMeasure = 1
  newSeg.authorType = authorType
  newSeg.authorId = authorId
  newSeg.authorConf = authorConf
  newSeg.timeStamp = timeStamp
  if highlight: newSeg.highlight = True
  newcdata.append(newSeg)

def create_and_insert_aligned_segment(pdfxp, newcdata, sI, segd, authorType, authorId, authorConf, timeStamp):
  newSeg = TlSegment(pdfxp,int(sI),float(segd['b']), float(segd['e']))
  newSeg.data = []
  for w in segd['wl']:
      mw = TlWord(pdfxp)
      mw.begin = float(w['b'])
      mw.end = float(w['e'])
      mw.txt = w['w']
      newSeg.data.append(mw)
  newSeg.confMeasure = 1
  newSeg.authorType = authorType
  newSeg.authorId = authorId
  newSeg.authorConf = authorConf
  newSeg.timeStamp = timeStamp
  newcdata.append(newSeg)


def segment_overlapping(rb, re, hb, he):
  return (hb < rb and he > rb + 0.1) or (hb >= rb and he <= re) or (hb < re - 0.1 and he > re)

def overwriteDfxp(pdfxp, sup_part, unsup_part, authorId, authorConf, timeStamp=datetime.now()):
  checkl = [sup_part] 
  if unsup_part != None:
    checkl.append(unsup_part)
  mod_sId_lst = []
  for cm in checkl:
    if ('sI' not in cm) or ('b' not in cm) or ('e' not in cm) or ('t' not in cm): return 4
    if not(isinstance(cm['sI'], int)) or (not(isinstance(cm['b'], float)) and not(isinstance(cm['b'], int))) or (not(isinstance(cm['e'], float)) and not(isinstance(cm['e'], int))): return 5
    if float(cm['e']) - float(cm['b']) < 0.01: return 6
    if cm['sI'] in mod_sId_lst: return 7
    mod_sId_lst.append(cm['sI'])

  newdata = []
  create_and_insert_segment(pdfxp, newdata, sup_part, "human", authorId, authorConf, timeStamp)
  if unsup_part != None:
    create_and_insert_segment(pdfxp, newdata, unsup_part, "automatic", None, None, None)

  pdfxp.data = newdata
  pdfxp.end = newdata[-1].end

  try:
    update_status(pdfxp)
  except:
    return 9

  return 0


def updateDfxp(pdfxp,moddata,authorId,authorConf,authorType="human",timeStamp=datetime.now(), highlight=False):
  """ Updates a DFXP object representation, keeping track 
      of all changes made in the past with <tl:alt> 

  """

  if 'txt' not in moddata:
    return 1

  mod = moddata['txt']
  delsegl = moddata.get('del', [])

  if not(isinstance(mod, list)) or not(isinstance(delsegl, list)):
    return 2

  if len(mod) == 0 and len(delsegl) == 0:
    return 3

  currdata = []

  if len(delsegl) > 0:
    if highlight:
      for s in pdfxp.data:
        if s.segmentId not in delsegl:
          currdata.append(s)
        else:
          s.deleted = True
          currdata.append(s)
    else:
      for s in pdfxp.data:
        if s.segmentId not in delsegl:
          currdata.append(s)
  else:
    currdata = pdfxp.data[:]

  if len(mod) == 0:

    pdfxp.data = currdata
    if len(currdata) > 0:
      pdfxp.end = currdata[-1].end
    else:
      pdfxp.end = 0

  else: 

    # Format and safety checks
    mod_sId_lst = []
    for cm in mod:
      if ('sI' not in cm) or ('b' not in cm) or ('e' not in cm) or ('t' not in cm): return 4
      if not(isinstance(cm['sI'], int)) or (not(isinstance(cm['b'], float)) and not(isinstance(cm['b'], int))) or (not(isinstance(cm['e'], float)) and not(isinstance(cm['e'], int))): return 5
      if float(cm['e']) - float(cm['b']) < 0.01: return 6
      if cm['sI'] in mod_sId_lst: return 7
      mod_sId_lst.append(cm['sI'])

    slmod = sorted(mod, key=lambda x: float(x['b']), reverse=True)
    if float(slmod[-1]['b']) < 0: return 8

    # Drop edited segment IDs
    currdata2 = []
    for s in currdata:
      if s.segmentId not in mod_sId_lst:
        currdata2.append(s)
  
    # There we go
    cm = slmod.pop()
    ins = False
    newcdata = []

    for s in currdata2:

      while len(slmod) > 0 and float(cm['e']) < s.begin + 0.1:
        if not(ins):
          create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight)
        cm = slmod.pop()
        ins = False

      if len(slmod) == 0 and float(cm['e']) < s.begin + 0.1 and not(ins):
        create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight)
        ins = True

      if segment_overlapping(float(cm['b']), float(cm['e']), s.begin, s.end):
        if not(ins):
          create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight)
          ins = True
      else:
        newcdata.append(s)

    if not(ins):
      create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight)
  
    while len(slmod) > 0:
      cm = slmod.pop()
      create_and_insert_segment(pdfxp, newcdata, cm, authorType, authorId, authorConf, timeStamp, highlight)

    pdfxp.data = newcdata
    pdfxp.end = newcdata[-1].end

  try:
    update_status(pdfxp)
  except:
    return 9

  return 0


def updateDfxp_with_alignment(pdfxp, align_segs, authorType='human', authorId='TLP-aligner', authorConf=100, timeStamp=datetime.now()):

  if not(isinstance(align_segs, list)):
      raise AlignFormatException("Align data must be a list")

  for s in align_segs:
      if not(isinstance(s, dict)):
          raise AlignFormatException("Align elements must be dicts")
      if 'b' not in s.keys() or 'e' not in s.keys() or 'wl' not in s.keys():
          raise AlignFormatException("Missing 'b', 'e' or 'wl' keys on segment dicts")
      if not(isinstance(s['wl'], list)):
          raise AlignFormatException("'wl' key must be a list")
      #for w in s['wl']:
      #    if 'b' not in s.keys() or 'e' not in s.keys() or 'w' not in s.keys():
      #        raise AlignFormatException("Missing 'b', 'e' or 'w' keys on word dicts")

  salign_segs = sorted(align_segs, key=lambda x: float(x['b']), reverse=True)
  if float(salign_segs[-1]['b']) < 0: return 8

  max_sI = float("-inf")
  for s in pdfxp.data:
      if int(s.segmentId) > max_sI:
          max_sI = int(s.segmentId)
  next_sI = max_sI + 1

  # There we go
  cm = salign_segs.pop()
  ins = False
  newcdata = []

  for s in pdfxp.data:

    while len(salign_segs) > 0 and float(cm['e']) < s.begin + 0.1:
      if not(ins):
        create_and_insert_aligned_segment(pdfxp, newcdata, next_sI, cm, authorType, authorId, authorConf, timeStamp)
        next_sI += 1
      cm = salign_segs.pop()
      ins = False

    if len(salign_segs) == 0 and float(cm['e']) < s.begin + 0.1 and not(ins):
      create_and_insert_aligned_segment(pdfxp, newcdata, next_sI, cm, authorType, authorId, authorConf, timeStamp)
      next_sI += 1
      ins = True

    if segment_overlapping(float(cm['b']), float(cm['e']), s.begin, s.end):
      if not(ins):
        create_and_insert_aligned_segment(pdfxp, newcdata, next_sI, cm, authorType, authorId, authorConf, timeStamp)
        next_sI += 1
        ins = True
    else:
      newcdata.append(s)

  if not(ins):
    create_and_insert_aligned_segment(pdfxp, newcdata, next_sI, cm, authorType, authorId, authorConf, timeStamp)
    next_sI += 1

  while len(salign_segs) > 0:
    cm = salign_segs.pop()
    create_and_insert_aligned_segment(pdfxp, newcdata, next_sI, cm, authorType, authorId, authorConf, timeStamp)
    next_sI += 1

  pdfxp.data = newcdata
  pdfxp.end = newcdata[-1].end

  try:
    update_status(pdfxp)
  except:
    return 9

  return 0


def segmentation_changed(pdfxp):
  if len(pdfxp.oridata) != len(pdfxp.data):
    return True
  else:
    for t in zip(pdfxp.oridata, pdfxp.data):
      if t[0].begin != t[1].begin or t[0].end != t[0].end:
        return True
  return False

def update_status(pdfxp):
  auto_found = False
  human_found = False
  for d in pdfxp.data:
    if isinstance(d,TlSegment):
      aT = d.authorType if d.authorType != None else pdfxp.authorType
      if aT == "automatic":
        auto_found = True
      elif aT == "human":
        human_found = True
  if auto_found and not(human_found):
    pdfxp.status = "fully_automatic"
  elif not(auto_found) and human_found:
    pdfxp.status = "fully_human"
  elif auto_found and human_found:
    pdfxp.status = "partially_human"
  else:
    pdfxp.status = "fully_automatic"


def upgrade_format(pdfxp):
  if pdfxp.version == "1.0":
    cdata = filterDfxp(pdfxp, altFiltPol=2, segFiltPol=0)
    odata = filterDfxp(pdfxp, altFiltPol=3, segFiltPol=0)
    pdfxp.data = cdata
    pdfxp.oridata = odata
    pdfxp.version = DFXP_VERSION
    update_status(pdfxp)

""" Fast string generation functions """
def w(sIO, string): sIO.write(string.encode('utf-8'))
def wn(sIO, string): w(sIO,string+'\n')

#---- private functions ----#

def __handleTt(tt, dfxp):
    """ Parses <tt> Element. """
    lang = tt.getAttribute("xml:lang").strip()
    if lang != "": dfxp.lang = lang
    __handleHead(tt.getElementsByTagName("head")[0], dfxp)
    __handleBody(tt.getElementsByTagName("body")[0], dfxp)

def __handleHead(head, dfxp):
    """ Parses <head> Element. """
    for n in head.childNodes:
        if isinstance(n,Text):
            continue
        if n.tagName == "tl:document" or n.tagName == "tl:d":
            __handleTlDocument(n, dfxp)
        else:
            raise TlDfxpFormatError, 'Expected <tl:document/> or <tl:d> at <head>, but found another unexpected element.'

def __handleTlDocument(tl_d, dfxp):

    """ Parses <tl:document> Element. """
    if tl_d.getAttribute('v') != "": dfxp.version = tl_d.getAttribute('v')
    elif tl_d.getAttribute('version') != "": dfxp.version = tl_d.getAttribute('version')
    else: dfxp.version = "1.0"
    if tl_d.getAttribute('vI') != "": dfxp.videoId = tl_d.getAttribute('vI')
    elif tl_d.getAttribute('videoId') != "": dfxp.videoId = tl_d.getAttribute('videoId')
    if tl_d.getAttribute('aT') != "": dfxp.authorType = tl_d.getAttribute('aT')
    elif tl_d.getAttribute('authorType') != "": dfxp.authorType = tl_d.getAttribute('authorType')
    if tl_d.getAttribute('aI') != "": dfxp.authorId = tl_d.getAttribute('aI')
    elif tl_d.getAttribute('authorId') != "": dfxp.authorId = tl_d.getAttribute('authorId')
    if tl_d.getAttribute('aC') != "": dfxp.authorConf = float(tl_d.getAttribute('aC'))
    elif tl_d.getAttribute('authorConf') != "": dfxp.authorConf = float(tl_d.getAttribute('authorConf'))
    if tl_d.getAttribute('wS') != "": dfxp.wordSegId = tl_d.getAttribute('wS')
    elif tl_d.getAttribute('wordSegId') != "": dfxp.wordSegId = tl_d.getAttribute('wordSegId')
    if tl_d.getAttribute('tS') != "": dfxp.timeStamp = datetime.strptime(tl_d.getAttribute('tS'), "%Y-%m-%dT%H:%M:%S")
    elif tl_d.getAttribute('timeStamp') != "": dfxp.timeStamp = datetime.strptime(tl_d.getAttribute('timeStamp'), "%Y-%m-%dT%H:%M:%S")
    if tl_d.getAttribute('cM') != "": dfxp.confMeasure = float(tl_d.getAttribute('cM'))
    elif tl_d.getAttribute('confMeasure') != "": dfxp.confMeasure = float(tl_d.getAttribute('confMeasure'))
    if tl_d.getAttribute('b') != "": dfxp.begin = float(tl_d.getAttribute('b'))
    elif tl_d.getAttribute('begin') != "": dfxp.begin = float(tl_d.getAttribute('begin'))
    if tl_d.getAttribute('e') != "": dfxp.end = float(tl_d.getAttribute('e'))
    elif tl_d.getAttribute('end') != "": dfxp.end = float(tl_d.getAttribute('end'))
    if tl_d.getAttribute('eT') != "": dfxp.elapsedTime = tl_d.getAttribute('eT')
    elif tl_d.getAttribute('elapsedTime') != "": dfxp.elapsedTime = tl_d.getAttribute('elapsedTime')
    if tl_d.getAttribute('mI') != "": dfxp.modelId = tl_d.getAttribute('mI')
    elif tl_d.getAttribute('modelId') != "": dfxp.modelId = tl_d.getAttribute('modelId')
    if tl_d.getAttribute('pS') != "": dfxp.processingSteps = tl_d.getAttribute('pS')
    elif tl_d.getAttribute('processingSteps') != "": dfxp.processingSteps = tl_d.getAttribute('processingSteps')
    if tl_d.getAttribute('aL') != "": dfxp.audioLength = tl_d.getAttribute('aL')
    elif tl_d.getAttribute('audioLength') != "": dfxp.audioLength = tl_d.getAttribute('audioLength')
    if tl_d.getAttribute('st') != "": dfxp.status = tl_d.getAttribute('st')
    elif tl_d.getAttribute('status') != "": dfxp.status = tl_d.getAttribute('status')

    if dfxp.status != None and dfxp.status not in STATUS_VALUES:
        raise TlDfxpFormatError, 'Unexpected status attribute value: %s' % dfxp.status

def __handleBody(body, dfxp):
    """ Parses <body> Element. """
    if dfxp.version == "1.0":
      for n in body.childNodes:
        if isinstance(n,Element):
            if n.tagName == "tl:segment" or n.tagName == "tl:s":
                seg = __handleTlSegment(n,dfxp)
                dfxp.data.append(seg)
            elif n.tagName == "tl:alt" or n.tagName == "tl:a":
                alt = __handleTlAlt(n,dfxp)
                dfxp.data.append(alt)
            else:
                raise TlDfxpFormatError, 'Expected <tl:segment/> or <tl:alt> at <body>, but found another unexpected element.'
    elif dfxp.version == "1.1":
      sall = False
      for n in body.childNodes:
        if isinstance(n,Element):
            if n.tagName == "tl:current" or n.tagName == "tl:c":
              sall = True
              for n1 in n.childNodes:
                if isinstance(n1,Element):
                  if n1.tagName == "tl:segment" or n1.tagName == "tl:s":
                    seg = __handleTlSegment(n1,dfxp)
                    dfxp.data.append(seg)
                  else:
                    raise TlDfxpFormatError, 'Expected <tl:segment/> below <tl:c>, found another element.'
            elif n.tagName == "tl:original" or n.tagName == "tl:o":
              sall = True
              for n1 in n.childNodes:
                if isinstance(n1,Element):
                  if n1.tagName == "tl:segment" or n1.tagName == "tl:s":
                    seg = __handleTlSegment(n1,dfxp)
                    dfxp.oridata.append(seg)
                  else:
                    raise TlDfxpFormatError, 'Expected <tl:segment/> below <tl:c>, found another element.'
            elif n.tagName == "tl:segment" or n.tagName == "tl:s":
              if sall:
                raise TlDfxpFormatError, 'Unexpected <tl:segment/> after <tl:c> or <tl:o>.'
              seg = __handleTlSegment(n,dfxp)
              dfxp.data.append(seg)
            else:
                raise TlDfxpFormatError, 'Expected <tl:current>, <tl:original> or <tl:segment/>, but found another unexpected element.'
    else:
      raise TlDfxpFormatError, 'Unknown DFXP version %s (This library supports up to version %s.' % (dfxp.version, DFXP_VERSION)
     
	
def __handleTlAlt(xalt,dfxp):
    """ Parses <tl:alt> Element. """
    alt = TlAlt(dfxp)
    for n in xalt.childNodes:
        if isinstance(n,Element):
            if n.tagName == "tl:segment" or n.tagName == "tl:s":
                seg = __handleTlSegment(n,dfxp)
                alt.data.append(seg)
            else:
                raise TlDfxpFormatError, 'Expected <tl:segment/> element after <tl:alt>, but found another unexpected element.'
    return alt

def __handleTlSegment(xseg,dfxp):
    """ Parses <tl:segment> Element. """
    if xseg.getAttribute('sI') != "": segId = int(xseg.getAttribute('sI'))
    elif xseg.getAttribute('segmentId') != "": segId = int(xseg.getAttribute('segmentId'))
    if xseg.getAttribute('b') != "": begin = float(xseg.getAttribute('b'))
    elif xseg.getAttribute('begin') != "": begin = float(xseg.getAttribute('begin'))
    if xseg.getAttribute('e') != "": end = float(xseg.getAttribute('e'))
    elif xseg.getAttribute('end') != "": end = float(xseg.getAttribute('end'))
    seg = TlSegment(dfxp, int(segId), begin, end)
    if xseg.getAttribute('aT') != "": seg.authorType = xseg.getAttribute('aT')
    elif xseg.getAttribute('authorType') != "": seg.authorType = xseg.getAttribute('authorType')
    else: seg.authorType = dfxp.authorType
    if xseg.getAttribute('aI') != "": seg.authorId = xseg.getAttribute('aI')
    elif xseg.getAttribute('authorId') != "": seg.authorId = xseg.getAttribute('authorId')
    else: seg.authorId = dfxp.authorId
    if xseg.getAttribute('aC') != "": seg.authorConf = float(xseg.getAttribute('aC'))
    elif xseg.getAttribute('authorConf') != "": seg.authorConf = float(xseg.getAttribute('authorConf'))
    else: seg.authorConf = dfxp.authorConf
    if xseg.getAttribute('wS') != "": seg.wordSegId = xseg.getAttribute('wS')
    elif xseg.getAttribute('wordSegId') != "": seg.wordSegId = xseg.getAttribute('wordSegId')
    else: seg.wordSegId = dfxp.wordSegId
    if xseg.getAttribute('tS') != "": seg.timeStamp = datetime.strptime(xseg.getAttribute('tS'), "%Y-%m-%dT%H:%M:%S")
    elif xseg.getAttribute('timeStamp') != "": seg.timeStamp = datetime.strptime(xseg.getAttribute('timeStamp'), "%Y-%m-%dT%H:%M:%S")
    else: seg.timeStamp = dfxp.timeStamp
    if xseg.getAttribute('cM') != "": seg.confMeasure = float(xseg.getAttribute('cM'))
    elif xseg.getAttribute('confMeasure') != "": seg.confMeasure = float(xseg.getAttribute('confMeasure'))
    else: seg.confMeasure = dfxp.confMeasure
    if xseg.getAttribute('lI') != "": seg.alignId = xseg.getAttribute('lI')
    elif xseg.getAttribute('alignId') != "": seg.alignId = xseg.getAttribute('alignId')
    i = 0
    while i < len(xseg.childNodes):
        n = xseg.childNodes[i]
        if isinstance(n,Text):
            txt = n.data.strip()
            if txt != "":
                seg.data.append(TlRawText(txt))
            i += 1
        elif isinstance(n,Element):
            if n.tagName == "tl:word" or n.tagName == "tl:w":
              w = __handleTlWord(n,dfxp)
              seg.data.append(w)
              i += 1
            elif n.tagName == "tl:group" or n.tagName == "tl:g":
                grp = __handleTlGroup(n,dfxp)
                seg.data.append(grp)
                i += 1
            elif n.tagName == "br":
                i += 1
            else:
                raise TlDfxpFormatError, 'Expected <tl:word> or <tl:group> node, but found another unexpected Element.'
        else:
            raise TlDfxpFormatError, 'Expected Text or Element Node, but found unexpected XML node.'

    return seg

def __handleTlWord(n,dfxp):
    """ Parses <tl:word> Element. """
    w = TlWord(dfxp)
    if n.getAttribute('b') != "": w.begin = float(n.getAttribute('b'))
    elif n.getAttribute('begin') != "": w.begin = float(n.getAttribute('begin'))
    if n.getAttribute('e') != "": w.end = float(n.getAttribute('e'))
    elif n.getAttribute('end') != "": w.end = float(n.getAttribute('end'))
    if n.getAttribute('aT') != "": w.authorType = n.getAttribute('aT')
    elif n.getAttribute('authorType') != "": w.authorType = n.getAttribute('authorType')
    else: w.authorType = dfxp.authorType
    if n.getAttribute('aI') != "": w.authorId = n.getAttribute('aI')
    elif n.getAttribute('authorId') != "": w.authorId = n.getAttribute('authorId')
    else: w.authorId = dfxp.authorId
    if n.getAttribute('aC') != "": w.authorConf = float(n.getAttribute('aC'))
    elif n.getAttribute('authorConf') != "": w.authorConf = float(n.getAttribute('authorConf'))
    else: w.authorConf = dfxp.authorConf
    if n.getAttribute('wS') != "": w.wordSegId = n.getAttribute('wS')
    elif n.getAttribute('wordSegId') != "": w.wordSegId = n.getAttribute('wordSegId')
    else: w.wordSegId = dfxp.wordSegId
    if n.getAttribute('tS') != "": w.timeStamp = datetime.strptime(n.getAttribute('tS'), "%Y-%m-%dT%H:%M:%S")
    elif n.getAttribute('timeStamp') != "": w.timeStamp = datetime.strptime(n.getAttribute('timeStamp'), "%Y-%m-%dT%H:%M:%S")
    else: w.timeStamp = dfxp.timeStamp
    if n.getAttribute('cM') != "": w.confMeasure = float(n.getAttribute('cM'))
    elif n.getAttribute('confMeasure') != "": w.confMeasure = float(n.getAttribute('confMeasure'))
    else: w.confMeasure = dfxp.confMeasure
    try:
        n = n.childNodes[0]
    except:
        raise TlDfxpFormatError, '<tl:w> tag has no childs.'
    if isinstance(n,Text):
        txt = n.data.strip()
        if txt != "":
            w.txt = txt
        else:
            raise TlDfxpFormatError, 'Expected word inside <tl:w> tag, but found empty text.'
    else:
        raise TlDfxpFormatError, 'Expected Text Node inside <tl:w> tag, but found another unexpected XML node.'
    return w
  
def __handleTlGroup(xgrp,dfxp):
    """ Parses <tl:group> Element. """
    if xgrp.getAttribute('b') != "": begin = float(xgrp.getAttribute('b'))
    elif xgrp.getAttribute('begin') != "": begin = float(xgrp.getAttribute('begin'))
    if xgrp.getAttribute('e') != "": end = float(xgrp.getAttribute('e'))
    elif xgrp.getAttribute('end') != "": end = float(xgrp.getAttribute('end'))
    grp = TlGroup(dfxp, begin, end)
    if xgrp.getAttribute('aT') != "": grp.authorType = xgrp.getAttribute('aT')
    elif xgrp.getAttribute('authorType') != "": grp.authorType = xgrp.getAttribute('authorType')
    else: grp.authorType = dfxp.authorType
    if xgrp.getAttribute('aI') != "": grp.authorId = xgrp.getAttribute('aI')
    elif xgrp.getAttribute('authorId') != "": grp.authorId = xgrp.getAttribute('authorId')
    else: grp.authorId = dfxp.authorId
    if xgrp.getAttribute('aC') != "": grp.authorConf = float(xgrp.getAttribute('aC'))
    elif xgrp.getAttribute('authorConf') != "": grp.authorConf = float(xgrp.getAttribute('authorConf'))
    else: grp.authorConf = dfxp.authorConf
    if xgrp.getAttribute('wS') != "": grp.wordSegId = xgrp.getAttribute('wS')
    elif xgrp.getAttribute('wordSegId') != "": grp.wordSegId = xgrp.getAttribute('wordSegId')
    else: grp.wordSegId = dfxp.wordSegId
    if xgrp.getAttribute('tS') != "": grp.timeStamp = datetime.strptime(xgrp.getAttribute('tS'), "%Y-%m-%dT%H:%M:%S")
    elif xgrp.getAttribute('timeStamp') != "": grp.timeStamp = datetime.strptime(xgrp.getAttribute('timeStamp'), "%Y-%m-%dT%H:%M:%S")
    else: grp.timeStamp = dfxp.timeStamp
    if xgrp.getAttribute('cM') != "": grp.confMeasure = float(xgrp.getAttribute('cM'))
    elif xgrp.getAttribute('confMeasure') != "": grp.confMeasure = float(xgrp.getAttribute('confMeasure'))
    else: grp.confMeasure = dfxp.confMeasure
    i = 0
    while i < len(xgrp.childNodes):
        n = xgrp.childNodes[i] 
        if isinstance(n,Text):
            txt = n.data.strip()
            if txt != "":
                grp.data.append(TlRawText(txt))
            i += 1
        elif isinstance(n,Element):
            if n.tagName == "tl:word" or n.tagName == "tl:w":
                w = __handleTlWord(n,dfxp)
                seg.data.append(w)
                i += 1
        else:
            raise TlDfxpFormatError, 'Expected Text or Element Node, but found unexpected XML node.'
    return grp


#---- Main sample function. ----#

if __name__ == "__main__":
    """ Main sample function. """
    if len(sys.argv) != 2:
        sys.stderr.write("Usage: %s <dfxp_file>\n"%(sys.argv[0]))
        sys.exit(1)
    fn = sys.argv[1]
    dfxp = parseDfxp(fn)  # Open file, parse xml and return an object representation of the dfxp file.

    print dfxp.toIBMJSON()

