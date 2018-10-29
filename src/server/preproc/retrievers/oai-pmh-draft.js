let OaiPmh = require('oai-pmh').OaiPmh;
const config = require('../../../config/config');
const pg = require('../../../lib/postgresQL')(config.pg);

class OaiPmhAPI {
  /**
   * Initialize the oai-pmh API class.
   * @param {Object} args - The constructor parameters.
   */
  constructor(args) {
    this.domain = 'http://export.arxiv.org/oai2';
  }

  /**
   * Make ListRecords request.
   * @param {String} [url='http://export.arxiv.org/oai2'] - the repository url
   * @param {String} [Prefix='oai_dc'] - metadataPrefix for oaiPmh request
   * @param {String} [fromDate='2018-01-04'] - fromDate for oaiPmh request
   * @param {String} [untilDate='2018-03-04'] - untilDate for oaiPmh request
   * @param {Number} [N=30] - number of records to retreive
   */
  async getMaterial (url=this.domain, Prefix='oai_dc', fromDate='2018-01-04', untilDate='2018-03-04', N=3, cb) {
    if(!url) {
      return cb(new Error('url must be provided'));
    }
    const oaiPmh = new OaiPmh(url);      
    let options = {
      metadataPrefix: Prefix,
      from: fromDate,
      until: untilDate
    };
    let recs = oaiPmh.listRecords(options);
    let count = 0;
    const oerMaterials = [];

    for await (const Record of recs) {
      count ++;
      if(count>N){ // number of records you want to recieve
        break;
      }
      try{
        let result = await this.formatMetadataRecord(Record);
        oerMaterials.push(result);
      }
      catch(err){
        console.log(err)
      } 
      try{
        await this.sendMetadataRecord(Record);
      }
      catch(err){
        console.log(err)
      }
    }
    pg.close();   
  }

  /**
   * Get extractMetadataAndValues of Record
   * @param {Object} obj - the Record
   */
  extractMetadataAndValues(obj) {
    let Metadata = [],
        Keys = [],
        i = 0,
        Vals = [];
    // check what are the conditions
    for (let key in obj) {
      if (obj[key] instanceof Array) {
        // check if key-value is array
        Metadata.push(`${i+1}- ${key} == ${obj[key]}`); i++;
        Vals.push(obj[key]);
        Keys.push(`${key}`);       
      } else if(obj[key] instanceof Object) {
        // check if key-value is object
        for(let kkey in obj[key]) {            
          if (obj[key][kkey] instanceof Array) {              
            // check if kkey-value is an array
            Metadata.push(`${i+1}- ${key} --> ${kkey} == ${obj[key][kkey]}`); i++;
            Vals.push(obj[key][kkey]);
            Keys.push(`${kkey}`);
          }else if(obj[key][kkey] instanceof Object){
            //check if kkey-value is an object
            for(let kkkey in obj[key][kkey]) {
              Metadata.push(`${i+1}- ${key} --> ${kkey} -> ${kkkey} == ${obj[key][kkey][kkkey]}`); i++;
              Vals.push(obj[key][kkey][kkkey]);
              Keys.push(`${kkkey}`);
            }
          }else {
            // the kkey-values are primary values
            Metadata.push(`${i+1}-${key} --> ${kkey} == ${obj[key][kkey]}`); i++;
            Vals.push(obj[key][kkey]);
            Keys.push(`${kkey}`);
          }            
        }          
      }else{
        // the key-values are primary values
        Metadata.push(`${i+1}- ${key} == ${obj[key]}`); i++;
        Vals.push(obj[key]);
        Keys.push(`${key}`);
      }
    }
    // return the key-values
    return { FullData: Metadata, keys: Keys, values: Vals};
  }

  /**
   * Get License of Record
   * @param {Object} obj - the Record
   */
  getLicense(obj){
    let Keys = this.extractMetadataAndValues(obj).keys;
    let Vals = this.extractMetadataAndValues(obj).values;
    if(Keys.includes('license') && (Vals[Keys.indexOf('license')] !== null)) {
      return Vals[Keys.indexOf('license')].toString(); 
    }else {
      return 'Data provider did not include a license'
    }
  }

  /**
   * Format Record Metadata
   * @param {Object} obj - the Record
   */
  async formatMetadataRecord(obj) {
    let Keys = this.extractMetadataAndValues(obj).keys,
        Vals = this.extractMetadataAndValues(obj).values,
        formatedMaterial = {
          title: 'N/A',
          description: 'N/A',
          providerUri: 'N/A',
          materialUrl: 'N/A',
          author: 'N/A',
          language: 'N/A',
          dateCreated: (new Date()).toISOString(),
          dateRetrieved:  (new Date()).toISOString(),
          type: { mimetype: null },
          providerMetadata: {
            title: 'N/A',
            url: 'N/A'
          },
          materialMetadata: {},
          license: {
            repo: 'N/A',
            material: 'N/A'
          },
          topic: 'N/A',
          publisher: 'N/A'
    };        
    if(Keys.includes('dc:title') && (Vals[Keys.indexOf('dc:title')] !== null)) { formatedMaterial.title = Vals[Keys.indexOf('dc:title')].toString(); }
    
    if(Keys.includes('dc:description') && (Vals[Keys.indexOf('dc:description')] !== null)) {
      formatedMaterial.description = Vals[Keys.indexOf('dc:description')].toString(); 
      if(Vals[Keys.indexOf('dc:description')] instanceof Array) { formatedMaterial.description = Vals[Keys.indexOf('dc:description')][0].toString(); }
    }

    if(Keys.includes('dc:identifier') && (Vals[Keys.indexOf('dc:identifier')] !== null)) {

      if(Vals[Keys.indexOf('dc:identifier')] instanceof Array) {
        formatedMaterial.providerMetadata.title = Vals[Keys.indexOf('dc:identifier')][0].split('/', 3)[2];
        formatedMaterial.providerMetadata.url = Vals[Keys.indexOf('dc:identifier')][0].split('/', 3).join('/');
        formatedMaterial.providerUri = Vals[Keys.indexOf('dc:identifier')][0].toString();        
        formatedMaterial.materialUrl = Vals[Keys.indexOf('dc:identifier')][0].toString();
      }else{
        formatedMaterial.providerMetadata.title = Vals[Keys.indexOf('dc:identifier')].split('/', 3)[2];
        formatedMaterial.providerMetadata.url = Vals[Keys.indexOf('dc:identifier')].split('/', 3).join('/');
        formatedMaterial.providerUri = Vals[Keys.indexOf('dc:identifier')].toString();        
        formatedMaterial.materialUrl = Vals[Keys.indexOf('dc:identifier')].toString();
      }

      if(formatedMaterial.providerUri.includes('arxiv')){
        formatedMaterial.materialUrl = Vals[Keys.indexOf('dc:identifier')].toString().split('abs').join('pdf');
        try{formatedMaterial.license.material = await this.getRec (this.domain, Vals[Keys.indexOf('identifier')], 'arXiv');}
        catch(err){console.log(err)}
      }else if(Keys.includes('dc:source') && (Vals[Keys.indexOf('dc:source')] !== null)) {
        ///other repo materialurl...
        formatedMaterial.materialUrl = Vals[Keys.indexOf('dc:source')].toString();
      }else if(Keys.includes('dc:relation') && (Vals[Keys.indexOf('dc:relation')] !== null)) {
        ///other repo materialurl...
        if(Vals[Keys.indexOf('dc:relation')] instanceof Array) {
          formatedMaterial.providerUri = Vals[Keys.indexOf('dc:relation')][0].toString();
          formatedMaterial.materialUrl = Vals[Keys.indexOf('dc:relation')][1].toString();
        }else{
          formatedMaterial.providerUri = Vals[Keys.indexOf('dc:relation')].toString();
        }
      }  
    }
    if(Keys.includes('dc:creator') && (Vals[Keys.indexOf('dc:creator')] !== null)) { formatedMaterial.author = Vals[Keys.indexOf('dc:creator')].toString().split(', ').join(' , '); }
    if(Keys.includes('dc:contributor') && (Vals[Keys.indexOf('dc:contributor')] !== null)) { formatedMaterial.author = (formatedMaterial.author +' and contributers: '+ Vals[Keys.indexOf('dc:contributor')].toString().split(', ').join(' + ')); }

    if(Keys.includes('dc:language') && (Vals[Keys.indexOf('dc:language')] !== null)) { formatedMaterial.language = Vals[Keys.indexOf('dc:language')].toString(); }
    
    if(Keys.includes('dc:type') && (Vals[Keys.indexOf('dc:type')] !== null)) { formatedMaterial.type.mimetype = Vals[Keys.indexOf('dc:type')].toString(); }
    if(Keys.includes('dc:format') && (Vals[Keys.indexOf('dc:format')] !== null)) { formatedMaterial.type.mimetype = (formatedMaterial.type.mimetype +' in the format of '+ Vals[Keys.indexOf('dc:format')]).toString(); }

    if(Keys.includes('dc:date') && (Vals[Keys.indexOf('dc:date')] !== null) && !(Vals[Keys.indexOf('dc:date')] instanceof Array)) {
      formatedMaterial.dateCreated = new Date(Vals[Keys.indexOf('dc:date')]).toISOString();  
    }else { formatedMaterial.dateCreated = new Date(Vals[Keys.indexOf('dc:date')][0]).toISOString(); }

    if(Keys.includes('dc:rights') && (Vals[Keys.indexOf('dc:rights')] !== null)) { formatedMaterial.license.repo = Vals[Keys.indexOf('dc:rights')].toString(); }

    if(Keys.includes('dc:subject') && (Vals[Keys.indexOf('dc:subject')] !== null)) { formatedMaterial.topic = Vals[Keys.indexOf('dc:subject')].toString(); }
    if(Keys.includes('dc:coverage') && (Vals[Keys.indexOf('dc:coverage')] !== null)) { formatedMaterial.topic = (formatedMaterial.topic +' covering: '+ Vals[Keys.indexOf('dc:coverage')]).toString(); }
    
    if(Keys.includes('dc:publisher') && (Vals[Keys.indexOf('dc:publisher')] !== null)) { formatedMaterial.publisher = Vals[Keys.indexOf('dc:publisher')].toString(); }
    
    // return the formated Metadata
    return formatedMaterial;
  }

  /**
   * Make getRecord request.
   * @param {String} [url='http://export.arxiv.org/oai2'] - the repository url
   * @param {String} [id='oai:arXiv.org:0706.2563'] - the record identifier
   * @param {String} [Prefix='arXiv'] - metadataPrefix for oaiPmh request
   */
  async getRec (url=this.domain, id='', Prefix='arXiv') {
    const oaiPmh = new OaiPmh(url);  
    try{
      let Record = await oaiPmh.getRecord(id , Prefix);    
      return this.getLicense(Record);
    }catch(err){console.log(err);}    
  }

  /**
   * Send the mateial to postgresql
   * @param {Object} material - the material
   */
  async sendMetadataRecord(material) {
    let pgRecord = {};
    await this.formatMetadataRecord(material)
    .then(function(result) {
      pgRecord = {
        title: result.title,
        description: result.description,
        providerUri: result.providerUri,
        materialUrl: result.materialUrl,
        author: result.author,
        language: result.language,
        dateCreated: result.dateCreated,
        dateRetrieved:  result.dateRetrieved,
        type: { mimetype: result.type.mimetype },
        providerMetadata: {
          title: result.providerMetadata.title,
          url: result.providerMetadata.url
        },
        materialMetadata: result.materialMetadata,
      };
    }).catch(console.error);

    pg.insert(pgRecord, 'oer_materials', (error, result) => {
      if (error) { 
        console.log('pg.insert ' + error);
      } else {
        console.log('pg.insert Success');
      }
    });
  }  
}
module.exports = OaiPmhAPI;