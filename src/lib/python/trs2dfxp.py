#!/usr/bin/env python
# -*- coding: utf-8 -*-

import xml.parsers.expat
from sys import exit
import sys

__all__= [ 'Trans', 'TransComment', 'TransSpeaker', 'TransEpisode',
           'TransSection', 'TransTurn', 'TransSync',
           'TransEvent', 'TransWho', 'load_trans_file' ]

def _i1(string) :
    string= string.encode('utf-8')
    string= string.replace('&','&amp;')
    string= string.replace('<','&lt;')
    string= string.replace('>','&gt;')
    return string.replace('"','&quot;')

class TransWho:
    
    def __init__ ( self, nb ):
        self.nb= nb
        
    def write ( self, fd ):
        fd.write('<Who nb="%d"/>\n'%self.nb)
    
class TransComment:
    
    def __init__ ( self, desc ):
        self.desc= desc
    
    def write ( self, fd ):
        fd.write('<Comment desc="%s"/>\n'%self.desc)
    
class TransEvent:
    
    def __init__ ( self, attrs ):
        self.attrs= attrs
        
    def write ( self, fd ):
        fd.write('<Event')
        for k,v in self.attrs.iteritems():
            fd.write(' %s="%s"'%(_i1(k),_i1(v)))
        fd.write('/>\n')

class TransSync:
    
    def __init__ ( self, time ):
        self.time= time
    
    def write ( self, fd ):
        fd.write('<Sync time="%.3f"/>\n'%self.time)
        
class TransTurn:
    
    def __init__ ( self, start_time, end_time, speaker ):
        self.start_time= start_time
        self.end_time= end_time
        self.speaker= speaker
        self.content= []
        
    def write ( self, fd ):
        fd.write(('<Turn startTime="%.3f"'+
                  ' endTime="%.3f"')%(self.start_time,self.end_time))
        if self.speaker==None: fd.write('>\n')
        else: fd.write(' speaker="%s">\n'%_i1(self.speaker))
        for c in self.content:
            if isinstance(c,TransSync) or isinstance(c,TransEvent) \
                    or isinstance(c,TransComment):
                c.write(fd)
            elif c!='': fd.write(_i1('%s\n'%c))
        fd.write('</Turn>\n')
        
class TransSection:
    
    def __init__ ( self, stype, start_time, end_time ):
        self.stype= stype
        self.start_time= start_time
        self.end_time= end_time
        self.turns= []

    def write ( self, fd ):
        fd.write(('<Section type="%s" startTime="%.3f"'+
                  ' endTime="%.3f">\n')%(_i1(self.stype),self.start_time,
                                         self.end_time))
        for t in self.turns: t.write(fd)
        fd.write('</Section>\n')
        
class TransEpisode:
    
    def __init__ ( self ):
        self.sections= []
        
    def write ( self, fd ):
        fd.write('<Episode>\n')
        for s in self.sections: s.write(fd)
        fd.write('</Episode>\n')
        
class TransSpeaker:
    
    def __init__ ( self, sid= "unk", name= "Unknown", check= "no",
                   stype= "", dialect= "", accent= "", scope= "local" ):
        self.sid= sid
        self.name= name
        self.check= check
        self.stype= stype
        self.dialect= dialect
        self.accent= accent
        self.scope= scope
        
    def write ( self, fd ):
        fd.write(('<Speaker id="%s" name="%s" check="%s" type="%s"'+
                  ' dialect="%s" accent="%s"'+
                  ' scope="%s"/>\n')%(_i1(self.sid),_i1(self.name),
                                      _i1(self.check),
                                      _i1(self.stype),_i1(self.dialect),
                                      _i1(self.accent),_i1(self.scope)))

class TransTopic:
    
    def __init__ ( self, sid, desc ):
        self.id= sid
        self.desc= desc
        
    def write ( self, fd ):
        fd.write('<Topic id="%s" desc="%s"/>\n'%(_i1(self.id),_i1(self.desc)))
        
class Trans:
    
    def __init__ ( self, scribe, audio_filename, version, version_date ):
        self.scribe= scribe
        self.audio_filename= audio_filename
        self.version= version
        self.version_date= version_date
        self.topics= []
        self.speakers= []
        self.episodes= []
        
    def write ( self, fd ):
        fd.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        fd.write('<!DOCTYPE Trans SYSTEM "trans-14.dtd">\n')
        fd.write(('<Trans scribe="%s" audio_filename="%s"'+
                  ' version="%s" version_date="%s">\n')%(self.scribe,
                                                         self.audio_filename,
                                                         self.version,
                                                         self.version_date))
        fd.write('<Topics>\n')
        for t in self.topics: t.write(fd)
        fd.write('</Topics>\n')
        fd.write('<Speakers>\n')
        for s in self.speakers: s.write(fd)
        fd.write('</Speakers>\n')
        for e in self.episodes: e.write(fd)
        fd.write('</Trans>\n')

def error_pos ( name ):
    exit("error d'anidament en l'element '%s'"%name)

def get_attr ( attrs, name, element ):
    ret= attrs.get ( name )
    if ret == None :
        exit("falta l'atribut '%s' en l'element '%s'"%(name,element))
    return ret

def get_attr_empty ( attrs, name, element ):
    ret= attrs.get ( name )
    if ret == None : return ''
    return ret

def load_trans_file ( fd ):
    
    # Dades d'usuari.
    class UData:
        def __init__ ( self ):
            self.level= 0
            self.obj= None
            self.read= False
            self.cepisode= None
            self.csection= None
            self.cturn= None
    udata= UData()
    
    # Crea el parse
    parser= xml.parsers.expat.ParserCreate()
    def start_element ( name, attrs ):
        
        # Trans start
        if name == 'Trans' :
            if udata.level != 0 : error_pos ( name )
            scribe= get_attr ( attrs, 'scribe', name )
            audio_filename= get_attr ( attrs, 'audio_filename', name )
            version= get_attr ( attrs, 'version', name )
            version_date= get_attr ( attrs, 'version_date', name )
            udata.obj= Trans ( scribe, audio_filename, version, version_date )
        
        # Topics start
        elif name == 'Topics' :
            if udata.level != 1 : error_pos ( name )
            
        # Topic start
        elif name == 'Topic' :
            if udata.level != 2 : error_pos ( name )
            sid= get_attr ( attrs, 'id', name )
            desc= get_attr ( attrs, 'desc', name )
            udata.obj.topics.append(TransTopic(sid,desc))
            
        # Speakers start
        elif name == 'Speakers' :
            if udata.level != 1 : error_pos ( name )
            
        # Speaker start
        elif name == 'Speaker' :
            if udata.level != 2 : error_pos ( name )
            sid= get_attr_empty ( attrs, 'id', name )
            name= get_attr_empty ( attrs, 'name', name )
            check= get_attr_empty ( attrs, 'check', name )
            stype= get_attr_empty ( attrs, 'type', name )
            dialect= get_attr_empty ( attrs, 'dialect', name )
            accent= get_attr_empty ( attrs, 'accent', name )
            scope= get_attr_empty ( attrs, 'scope', name )
            udata.obj.speakers.append(TransSpeaker(sid,name,check,stype,
                                                   dialect,accent,scope))
            
        # Episode start
        elif name == 'Episode' :
            if udata.level != 1 : error_pos ( name )
            udata.cepisode= TransEpisode()
            udata.obj.episodes.append ( udata.cepisode )
            
        # Section start
        elif name == 'Section' :
            if udata.level != 2 : error_pos ( name )
            stype= get_attr ( attrs, 'type', name )
            start_time= float(get_attr ( attrs, 'startTime', name ))
            end_time= float(get_attr ( attrs, 'endTime', name ))
            udata.csection= TransSection(stype,start_time,end_time)
            udata.cepisode.sections.append ( udata.csection )
            
        # Turn start
        elif name == 'Turn' :
            if udata.level != 3 : error_pos ( name )
            start_time= float(get_attr ( attrs, 'startTime', name ))
            end_time= float(get_attr ( attrs, 'endTime', name ))
            speaker= get_attr_empty ( attrs, 'speaker', name )
            udata.cturn= TransTurn(start_time,end_time,speaker)
            udata.csection.turns.append ( udata.cturn )
            udata.read= True
            udata.data= ""
            
        # Sync start
        elif name == 'Sync' :
            if udata.level != 4 : error_pos ( name )
            udata.data= udata.data.strip()
            if udata.data != "" :
                udata.cturn.content.append ( udata.data )
            udata.data= ""
            time= float(get_attr ( attrs, 'time', name ))
            udata.cturn.content.append ( TransSync(time) )

        # Comment start
        elif name == 'Comment' :
            if udata.level != 4 : error_pos ( name )
            udata.data= udata.data.strip()
            if udata.data != "" :
                udata.cturn.content.append ( udata.data )
            udata.data= ""
            desc= get_attr ( attrs, 'desc', name )
            udata.cturn.content.append ( TransComment(desc) )
        
        # Comment start
        elif name == 'Who' :
            if udata.level != 4 : error_pos ( name )
            udata.data= udata.data.strip()
            if udata.data != "" :
                udata.cturn.content.append ( udata.data )
            udata.data= ""
            nb= int(get_attr ( attrs, 'nb', name ))
            udata.cturn.content.append ( TransWho(nb) )
        
        # Event start
        elif name == 'Event':
            if udata.level != 4 : error_pos ( name )
            udata.data= udata.data.strip()
            if udata.data != "" :
                udata.cturn.content.append ( udata.data )
            udata.data= ""
            udata.cturn.content.append ( TransEvent(attrs))
            
        else: sys.stderr.write("element '%s' desconegut\n"%name)
        udata.level+= 1
    parser.StartElementHandler= start_element
    
    def end_element ( name ):
        udata.level-=  1
        
        # Trans end
        if name == 'Trans' :
            if udata.level != 0 : error_pos ( name )
            
        # Topics end
        elif name == 'Topics' :
            if udata.level != 1 : error_pos ( name )
            
        # Topic end
        elif name == 'Topic' :
            if udata.level != 2 : error_pos ( name )
            
        # Speakers end
        elif name == 'Speakers' :
            if udata.level != 1 : error_pos ( name )
            
        # Speaker end
        elif name == 'Speaker' :
            if udata.level != 2 : error_pos ( name )
            
        # Episode end
        elif name == 'Episode' :
            if udata.level != 1 : error_pos ( name )
            
        # Section end
        elif name == 'Section' :
            if udata.level != 2 : error_pos ( name )
            
        # Turn
        elif name == 'Turn' :
            if udata.level != 3 : error_pos ( name )
            udata.data= udata.data.strip()
            if udata.data != "" :
                udata.cturn.content.append ( udata.data )
            udata.read= False
            
        # Sync
        elif name == 'Sync' :
            if udata.level != 4 : error_pos ( name )
            
        # Who
        elif name == 'Who' :
            if udata.level != 4 : error_pos ( name )

        # Comment
        elif name == 'Comment' :
            if udata.level != 4 : error_pos ( name )
        
        # Event
        elif name == 'Event' :
            if udata.level != 4 : error_pos ( name )
            
        #else: print "element '%s' desconegut"%name
    parser.EndElementHandler= end_element
    
    def char_data ( data ):
        if udata.read : udata.data+= data
    parser.CharacterDataHandler= char_data
    
    # Parseja i torna l'objecte creat
    parser.ParseFile ( fd )
    return udata.obj

#from sys import stdout
#obj= load_trans_file ( file("segment.trs") )
#obj.write(stdout)


def ow(text): sys.stdout.write(text.encode('utf-8'))
def own(text): ow(text+'\n')
def ft(secs):
    #hh= int(secs/3600)
    #secs%= 3600
    #mm= int(secs/60)
    #secs%= 60
    #return '%02d:%02d:%05.2f'%(hh,mm,secs)
    return secs
def escape(text):
    text= text.replace(u'&','&amp;')
    text= text.replace(u'<','&lt;')
    text= text.replace(u'>','&gt;')
    text= text.replace(u'"','&quot;')
    return text


if len(sys.argv) != 2:
  sys.stderr.write("%s <LANG> < TRS\n"%(sys.argv[0]))
  sys.exit(1)
lang = sys.argv[1]

trs= load_trans_file(sys.stdin)
segs= []
for e in trs.episodes:
    for s in e.sections:
        for t in s.turns:
            text= ""
            skip = False
            begin= t.start_time
            for c in t.content:
                if isinstance(c,TransSync):
                    if text != "":
                        aux= begin,c.time,text
                        segs.append(aux)
                    text= ""
                    begin= c.time
                elif isinstance(c,TransEvent):
                    if c.attrs['extent'] == 'begin': skip = True
                    elif c.attrs['extent'] == 'end': skip = False
                elif isinstance(c,TransWho): pass
                elif isinstance(c,TransComment): pass
                elif isinstance(c,unicode):
                    if skip: pass
                    elif c=='[sonido de fondo]' or c=='[background noise]': text+= ""
                    else: text+= " %s" % c
                else: 
                    print c
                    sys.exit('WTF!!!!!')
            aux= begin,t.end_time,text
            segs.append(aux)

own('<?xml version="1.0" encoding="utf-8"?>')
own('<tt xml:lang="%s" xmlns="http://www.w3.org/2006/04/ttaf1" xmlns:tts="http://www.w3.org/2006/10/ttaf1#style" xmlns:tl="translectures.eu">'%(lang))
own('<head>')
b=0
e=segs[-1][1]
own('<tl:document aT="human" aI="UPV" aC="1.0" cM="1.0" b="%s" e="%s"/>'%(ft(b),ft(e)))
own('</head>')
own('<body>')
segID=1
for b,e,content in segs:
    if content != None:
        own('<tl:s sI="%d" b="%s" e="%s">'%(segID,ft(b),ft(e)))
        own('%s'%escape(content))
        own('</tl:s>')
        segID+=1
own('</body>')
own('</tt>')


