var textract = require('textract');

textract.fromUrl('http://ailab.ijs.si/dunja/SiKDD2017/Papers/Brank_Wikifier.pdf' 
, function( error, text ) {
  if (error){
    console.log(error);
  }
  else{
    console.log(text);
    console.log(text.length);
  }
});
