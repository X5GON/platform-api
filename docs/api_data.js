define({ "api": [
  {
    "type": "GET",
    "url": "/embed/recommendations",
    "title": "Ember-ready recommendation list",
    "description": "<p>Gets the embed-ready recommendation list html</p>",
    "name": "GetRecommendationsEmbedReady",
    "group": "Recommendations",
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "text",
            "description": "<ul> <li>The raw text. If both <code>text</code> and <code>url</code> are present, <code>url</code> has the priority.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "url",
            "description": "<ul> <li>The url of the material. If both <code>text</code> and <code>url</code> are present, <code>url</code> has the priority.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"cosine\"",
              "\"null\""
            ],
            "optional": true,
            "field": "type",
            "description": "<ul> <li>The metrics used in combination with the url parameter.</li> </ul>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "list",
            "description": "<ul> <li>The html of the embed-ready list.</li> </ul>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage:",
        "content": "<iframe src=\"https://platform.x5gon.org/embed/recommendations?url=https://platform.x5gon.org/materialUrl&text=education\"\n    style=\"border:0px;height:425px;\"></iframe>",
        "type": "html"
      }
    ],
    "filename": "src/server/platform/routes/v1/website.js",
    "groupTitle": "Recommendations"
  },
  {
    "type": "GET",
    "url": "/api/v1/search",
    "title": "Recommendations in JSON",
    "description": "<p>Gets the recommendations in JSON format</p>",
    "name": "GetRecommendationsMeta",
    "group": "Recommendations",
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "text",
            "description": "<ul> <li>The raw text. If both <code>text</code> and <code>url</code> are present, <code>url</code> has the priority.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": true,
            "field": "url",
            "description": "<ul> <li>The url of the material. If both <code>text</code> and <code>url</code> are present, <code>url</code> has the priority.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"cosine\"",
              "\"null\""
            ],
            "optional": true,
            "field": "type",
            "description": "<ul> <li>The metrics used in combination with the url parameter.</li> </ul>"
          }
        ]
      }
    },
    "success": {
      "fields": {
        "200": [
          {
            "group": "200",
            "type": "Object",
            "optional": false,
            "field": "result",
            "description": "<ul> <li>The object containing the status and recommendations.</li> </ul>"
          },
          {
            "group": "200",
            "type": "Boolean",
            "optional": false,
            "field": "result.empty",
            "description": "<ul> <li>If recommendations were found for the given query.</li> </ul>"
          },
          {
            "group": "200",
            "type": "Object[]",
            "optional": false,
            "field": "result.recommendations",
            "description": "<ul> <li>The recommendations sorted by relevance/weight in descending order.</li> </ul>"
          },
          {
            "group": "200",
            "type": "Number",
            "optional": false,
            "field": "result.recommendations.weight",
            "description": "<ul> <li>The relevance weight. Bigger weight means bigger relevance.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "result.recommendations.url",
            "description": "<ul> <li>the material url.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "result.recommendations.title",
            "description": "<ul> <li>The material title.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "result.recommendations.description",
            "description": "<ul> <li>The material description.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "result.recommendations.provider",
            "description": "<ul> <li>The provider of the material.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "optional": false,
            "field": "result.recommendations.language",
            "description": "<ul> <li>The language in which the material is written/spoken.</li> </ul>"
          },
          {
            "group": "200",
            "type": "String",
            "allowedValues": [
              "\"video\"",
              "\"audio\"",
              "\"text\""
            ],
            "optional": false,
            "field": "result.recommendations.type",
            "description": "<ul> <li>The material type.</li> </ul>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage:",
        "content": "https://platform.x5gon.org/api/v1/search?url=https://platform.x5gon.org/materialUrl&text=deep+learning",
        "type": "json"
      }
    ],
    "filename": "src/server/platform/routes/v1/search.js",
    "groupTitle": "Recommendations"
  },
  {
    "type": "GET",
    "url": "/api/v1/snippet/:version/x5gon-log(.min)?.js",
    "title": "User activity acquisition library",
    "description": "<p>Gets the snippet library directly from the server</p>",
    "name": "GetSnippetLibrary",
    "group": "UserActivity",
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "String",
            "allowedValues": [
              "\"v1\"",
              "\"v2\"",
              "\"latest\""
            ],
            "optional": false,
            "field": "version",
            "description": "<ul> <li>The version of the library.</li> </ul>"
          }
        ]
      }
    },
    "examples": [
      {
        "title": "Example usage:",
        "content": "<script type=\"text/javascript\" src=\"https://platform.x5gon.org/api/v1/snippet/latest/x5gon-log.min.js\"></script>",
        "type": "html"
      }
    ],
    "filename": "src/server/platform/routes/v1/activity-logging.js",
    "groupTitle": "UserActivity"
  },
  {
    "type": "GET",
    "url": "/api/v1/snippet/log",
    "title": "User activity acquisition",
    "description": "<p>Send user activity snippet information. All parameters should be encoded by the <code>encodeURIComponent</code> function</p>",
    "name": "GetSnippetLog",
    "group": "UserActivity",
    "version": "1.0.0",
    "parameter": {
      "fields": {
        "Parameter": [
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": false,
            "field": "x5gonValidated",
            "description": "<ul> <li>Notifies if the user is validated by the X5GON platform.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "dt",
            "description": "<ul> <li>The URI date-time.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "rq",
            "description": "<ul> <li>The URL from which the request was sent.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "rf",
            "description": "<ul> <li>The referrer URL.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "String",
            "optional": false,
            "field": "cid",
            "description": "<ul> <li>The provider token generated by the X5GON platform.</li> </ul>"
          },
          {
            "group": "Parameter",
            "type": "Boolean",
            "optional": true,
            "field": "test",
            "defaultValue": "false",
            "description": "<ul> <li>Notifies if the request was sent to test the snippet integration.</li> </ul>"
          }
        ]
      },
      "examples": [
        {
          "title": "User Activity Information:",
          "content": "{\n  \"x5gonValidated\": true,\n  \"dt\": \"2018-10-04T10%3A19%3A45Z\",\n  \"rq\": \"https://platform.x5gon.org/example\",\n  \"rf\": null,\n  \"cid\": \"x5gonTokenXYZ\",\n  \"test\": true\n}",
          "type": "json"
        }
      ]
    },
    "success": {
      "examples": [
        {
          "title": "Success-Response:",
          "content": "HTTP/1.1 200 OK Image of a pixel with the following headers:\n    \"x-snippet-status\": \"success\"\n    \"x-snippet-message\": null",
          "type": "text"
        }
      ]
    },
    "error": {
      "examples": [
        {
          "title": "Error-Response:",
          "content": "HTTP/1.1 200 OK Image of a pixel with the following headers:\n    \"x-snippet-status\": \"failure\"\n    \"x-snippet-message\": \"check if all parameters are set and if the date-time is in the correct format\"",
          "type": "text"
        }
      ]
    },
    "filename": "src/server/platform/routes/v1/activity-logging.js",
    "groupTitle": "UserActivity"
  }
] });
