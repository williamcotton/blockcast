var assert = require("assert");

var Bitcoin = require("bitcoinjs-lib");
var zlib = require("zlib");

var OP_RETURN_SIZE = 80;

var MAGIC_NUMBER = new Buffer("1f", "hex");
var VERSION = new Buffer("00", "hex");

var dth = function(d) {
  var h = Number(d).toString(16);
  while (h.length < 2) {
    h = "0" + h;
  }
  return h;
}

var compress = function(decompressedBuffer, callback) {
  zlib.deflateRaw(decompressedBuffer, function(err, compressedBuffer) {
    callback(err, compressedBuffer);
  });
};

var decompress = function(compressedBuffer, callback) {
  zlib.inflateRaw(compressedBuffer, function(err, decompressedBuffer) {
    callback(err, decompressedBuffer);
  });
};

var parse = function(payload) {
  var length = payload.slice(2,3).readUIntLE(0, 1);
  var valid = payload.slice(0,1).equals(MAGIC_NUMBER) && payload.slice(1,2).equals(VERSION) && length;
  return valid ? length : false;
};

var create = function(options, callback) {
  var data = options.data;
  var payloads = [];
  var buffer = new Buffer(data);
  compress(buffer, function(error, compressedBuffer) {
    var dataLength = compressedBuffer.length;
    var dataPayloads = [];
    if (dataLength > 1277) {
      callback("data payload > 1277", false);
      return;
    }
    var length = parseInt(((dataLength - OP_RETURN_SIZE) / OP_RETURN_SIZE) + 2);
    var lengthByte = new Buffer(dth(length), "hex");
    var count = OP_RETURN_SIZE - 3;
    var dataPayload = compressedBuffer.slice(0, count);
    payloads.push(Buffer.concat([MAGIC_NUMBER, VERSION, lengthByte, dataPayload]));
    while(count < dataLength) {
      dataPayload = compressedBuffer.slice(count, count+OP_RETURN_SIZE);
      count += OP_RETURN_SIZE;
      payloads.push(dataPayload);
    }
    callback(false, payloads);
  });
};

var decode = function(payloads, callback) {
  var firstPayload = payloads[0];
  var startHeader = firstPayload.slice(0,3);
  var compressedBuffer;
  var length = startHeader.slice(2,3).readUIntLE(0, 1);
  if (!length) {
    callback("no start header", false);
  }
  assert.equal(payloads.length, length);
  var compressedBuffer = new Buffer("");
  for (var i = 0; i < length; i++) {
    var payload = payloads[i];
    var dataPayload = i == 0 ? payload.slice(3, OP_RETURN_SIZE) : payload;
    compressedBuffer = Buffer.concat([compressedBuffer, dataPayload]);
  };
  decompress(compressedBuffer, function(err, data) {
    if (!data || !data.toString) {
      callback(true, "");
    }
    else {
      callback(false, data.toString());
    }
  });
};

module.exports = {
  create: create,
  decode: decode,
  parse: parse
};