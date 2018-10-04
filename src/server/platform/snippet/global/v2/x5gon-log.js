/**
 * Creates the user activity tracker function.
 * @returns {Function} The user activity tracker function where the input parameter
 * is the provider token. Uses the image pixel integration.
 */
var x5gonActivityTracker = function () {

  /**
   * Checks and changes the number to be part of time format.
   * @param {Number} num - The number used to compose time.
   * @returns {String} Part of time format.
   */
  function x5gonCheckTime(num) {
    if(num < 10) { num = '0' + num; }
    return num;
  }

  /**
   * Creates the request string.
   * @param {Boolean|String} validationFlag - If the user already validated X5GON.
   * @param {String} providerToken - The OER provider token used for identification.
   */
  function x5gonGetRequestString(validationFlag, providerToken, test) {
    var Dat = new Date();
    var Dt = Dat.toISOString().split('.')[0] + 'Z';
    var CURL = document.URL;
    var PURL = document.referrer;

    var request = 'https://platform.x5gon.org/api/v1/snippet/log?x5gonValidated=';
    request += encodeURIComponent(validationFlag);
    request += '&dt=' + encodeURIComponent(Dt);
    request += '&rq=' + encodeURIComponent(CURL);
    request += '&rf=' + encodeURIComponent(PURL);
    request += '&cid=' + encodeURIComponent(providerToken);
    if (test) { request +='&test=' + test; }
    return request;
  }

  return function(providerToken, test) {
    try {
      var img = document.createElement('img');
      img.setAttribute('src', x5gonGetRequestString(true, providerToken, test));
      document.body.appendChild(img);
    } catch(err) { }
  };

}();