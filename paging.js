var ObjectId = require('mongodb').ObjectID;

// Create a MongoDB ID from a string or return 0;
function makeID(string) {
  var id;
  try {
    string = string.toString();
    id = new ObjectId(string);
  } catch(e) {
    id = 0;
  }
  return id;
}

// Set the page number based on the query
function PageNumber(query) {
  var page = 1;
  if (query.page && !isNaN(query.page) && parseInt(query.page) >= 2) {
    page = parseInt(query.page);
  }
  return page;
}

// Set the limits based on the query and options
function Limits(query,options) {
  var intlimit = options.intlimit || 10;
  var maxlimit = options.maxlimit || 100;
  if (intlimit > maxlimit) {
    intlimit = maxlimit;
  }

  var limit = options.limit || intlimit;
  if (!options.limit && query.limit && !isNaN(query.limit) && query.limit <= maxlimit && parseInt(query.limit) >=1) {
    limit = parseInt(query.limit);
  }

  if (options.nolimit) {
    limit = 0;
  }
  return limit;
}

// Set the number of documents to skip based on page number and limit
function Skip(page,limit) {
  var skip = 0;
  if (page > 1) {
    skip = (page - 1) * limit;
  }
  return skip;
}

// Create pagination links
function Pagination(count,page,limit,prelink,trail) {

  // Query String
  var qs = "page=";
  if (limit != 0) {
    qs = "limit=" + limit + "&" + qs;
  }
  if (trail.length > 0) {
    qs = "&" + qs;
  }
  prelink = prelink + '/?' + trail + qs;

  // Pagination Links
  var links = {};
  links.first = prelink +  1;
  if (page > 1) {
    links.prev = prelink +  (page - 1);
  }
  links.self = prelink +  page;
  if (limit > 0 && count / page > limit) {
    links.next = prelink +  (page + 1);
  }
  var last = 1;
  if (limit > 0 && parseInt(count / limit) == count / limit && count > 0) {
    var last = 0;
  }
  links.last = prelink +  (parseInt(count / limit) + last || 1);
  return links;
}

// Create an object from these methods and export as a module
var paging = {

  makeID:makeID,
  PageNumber:PageNumber,
  Limits:Limits,
  Skip:Skip,
  Pagination:Pagination

};

module.exports = paging;
