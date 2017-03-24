"use strict";

var ObjectId = require('mongodb').ObjectID;
var urlencode = require('urlencode');
var paging = require('./paging');

function FindAPI(collection,query,options,callback) {

  // If callback is missing, try to use parameter in options position
  if (options && !callback) {
    if (typeof options == 'function') {
      callback = options;
      options = {};
    }
  }

  // If no options are available, use some defaults
  if (!options || options == {}) {
    options = {
      links: true,
      count: true,
      meta: true
    };
  }

  // Fields
  var f = options.fields || {};
  delete f._id;

  // Set ID Field
  var id_field = options.id_field || "_id";

  // Query from options
  var q = options.q || {};

  // Trail
  var trail = options.trail || {};

  // Query by _id
  if (id_field == "_id" && (query._id)) {
    q._id = paging.makeID(query._id);
    trail._id = q._id.toString();
  }

  // Query by "id"
  if (id_field == "_id" && options.id && (query.id)) {
    q._id = paging.makeID(query.id);
    trail.id = query.id.toString();
  }

  // Query by Custom ID field
  if (!q._id && query[id_field]) {
    q[id_field] = query[id_field].toString();
    trail[id_field] = q[id_field];
  }

  // Query by Type
  if (!q.type && query.type) {
    q.type = {
      $in:[query.type.toString()]
    };
    trail.type = query.type.toString();
  }

  // Finish trail
  var t = "";
  for(var key in trail) {
    t = t + key + "=" + urlencode(trail[key]) + "&";
  }
  trail = t.slice(0,-1);

  // Feed Prelink
  var prelink = options.prelink || '';

  // Canonical Link
  var link = prelink;

  // Remove trailing slash from prelink
  if (prelink.substr(-1) == '/') {
    prelink = prelink.slice(0,-1);
  }

  // Data Prelink - Prelink for the data objects
  var data_prelink = options.data_prelink || prelink;
  if (data_prelink.substr(-1) == '/') {
    data_prelink = data_prelink.slice(0,-1);
  }

  // Sort
  var sort = options.sort || {"_id":-1};

  // Collection
  var data = collection;

  // Response Object
  var response = {};

  // Meta Data
  if (options.meta != 0) {
    response.meta = {};
  }
  if (typeof options.meta == 'object') {
    response.meta = options.meta;
  }

  // Single - Limit results to 1
  // Do not include feed prelinks
  // Do no include the meta count
  if (options.single) {
    options.limit = 1;
    options.links = false;
    options.count = false;
  }

  // Count - Number of results matching the query
  data.count(q,function(err,count) {

    if (options.count != 0 && options.meta != 0) {
      // Add count to meta object
      response.meta.count = count;
    }

    // Limit
    var limit = paging.Limits(query,options);

    // Set Page and Skip based on limit
    var page = 1;
    var skip = 0;
    if (limit != 0) {

      // Page Number
      page = paging.PageNumber(query);

      // Skip
      skip = paging.Skip(page,limit);
    
    }

    // Links
    if (options.links != 0) {
      response.links = paging.Pagination(count,page,limit,prelink,trail);
      var canonical = link;
      if (canonical.substr(-1) == '/') {
        canonical = canonical.slice(0,-1);
      }
      response.links.canonical = canonical;
    }

    // Query
    data.find(q,f,{limit:limit,skip:skip,sort:sort}).toArray(function(err,results) {
      var docs = [];
      if (results) {

        // Page Count (if meta and count is true in options)
        if (options.count && options.meta) {
          response.meta.page_count = results.length;
        }

        // Loop thru the results and create response data
        for(var x = 0; x < results.length; x++) {
          docs[x] = {};

          // Add a convenient string id field within the object (based on _id) if id does not exist
          if (options.id) {
            docs[x].id = results[x].id || results[x]._id.toString();
          }

          // Assign the type and remove old reference to clean up object display
          docs[x].type = results[x].type;
          delete results[x].type;

          // if (options.link), Set the object's URL based on the data_prelink and ID field (options.id_field)
          if (options.link) {
            docs[x].link = data_prelink + "/" + results[x][id_field];
          }

          // Option to include or exclude the MongoDB _id field
          if (options.mongoid == 0) {
            delete results[x]._id;
          }

          // Assign the updated document to itself
          docs[x] = Object.assign(docs[x],results[x]);

        }

      }

      // Set response data and callback
      if (options.single) {
        if (docs[0]) {
          response.data = docs[0];
          callback(response);
        } else {
          callback(null);
        }
      } else {
        response.data = docs;
        callback(response);
      }

    });

  });

}

module.exports = FindAPI;
