var txHexToJSON = require('bitcoin-tx-hex-to-json');
var async = require('async');

var bitcoinTransactionBuilder = require("./bitcoin-transaction-builder");
var dataPayload = require("./data-payload");

var post = function(options, callback) {
  var commonWallet = options.commonWallet;
  var commonBlockchain = options.commonBlockchain;
  var data = options.data;
  var fee = options.fee;
  var primaryTxHex = options.primaryTxHex;
  var signPrimaryTxHex = options.signPrimaryTxHex;
  var propagationStatus = options.propagationStatus || function() {};
  var buildStatus = options.buildStatus || function() {};
  var retryMax = options.retryMax || 5;
  var id = options.id || 0; // THINK ABOUT THIS!!! Maybe go through their recent transactions by default? options.transactions?
  bitcoinTransactionBuilder.createSignedTransactionsWithData({
    primaryTxHex: primaryTxHex,
    signPrimaryTxHex: signPrimaryTxHex,
    data: data, 
    id: id, 
    fee: fee,
    buildStatus: buildStatus,
    commonBlockchain: commonBlockchain,
    commonWallet: commonWallet
  }, function(err, signedTransactions, txid) {
    var reverseSignedTransactions = signedTransactions.reverse();
    var transactionTotal = reverseSignedTransactions.length;
    var propagateCounter = 0;
    var retryCounter = [];
    var propagateResponse = function(err, res) {
      propagationStatus({
        response: res,
        count: propagateCounter,
        transactionTotal: transactionTotal
      });
      if (err) {
        var rc = retryCounter[propagateCounter] || 0;
        if (rc < retryMax) {
          retryCounter[propagateCounter] = rc + 1;
          commonBlockchain.Transactions.Propagate(reverseSignedTransactions[propagateCounter], propagateResponse);
        }
        else {
          callback(err, false);
        }
      }
      propagateCounter++;
      if (propagateCounter < transactionTotal) {
        commonBlockchain.Transactions.Propagate(reverseSignedTransactions[propagateCounter], propagateResponse);
      }
      else {
        callback(false, {
          txid: txid,
          data: data,
          transactionTotal: transactionTotal
        });
      }
    }
    commonBlockchain.Transactions.Propagate(reverseSignedTransactions[0], propagateResponse);
  });
};

var payloadsLength = function(options, callback) {
  dataPayload.create({data: options.data, id: 0}, function(err, payloads) {
    if (err) {
      callback(err, payloads);
      return;
    }
    callback(false, payloads.length);
  });
};

var scanSingle = function(options, callback) {
  var txid = options.txid;
  var commonBlockchain = options.commonBlockchain;
  var allTransactions = [];
  var payloads = [];
  var transactionTotal;
  var length;
  var onTransaction = function(err, transactions) {
    var tx = transactions[0];
    allTransactions.push(tx);
    if (!tx) {
      return callback(err, false);
    }
    var vout = tx.vout;
    var dataOutput;
    for (var j = vout.length - 1; j >= 0; j--) {
      var output = vout[j];
      var scriptPubKey = output.scriptPubKey.hex;
      var scriptPubKeyBuffer = new Buffer(scriptPubKey, 'hex');
      if (scriptPubKeyBuffer[0] == 106) {
        var data = scriptPubKeyBuffer.slice(2,scriptPubKeyBuffer.length);
        var parsedLength = dataPayload.parse(data);
        dataOutput = parsedLength ? j : 0;
        transactionTotal = parsedLength ? parsedLength : transactionTotal;
        payloads.push(data);
      }
    }
    if (allTransactions.length == transactionTotal) {
      dataPayload.decode(payloads, function(err, data) {
        callback(err, data);
      });
      return;
    }
    var prevTxid = tx.vin[dataOutput].txid;
    if (!prevTxid) {
      callback("missing: " + (allTransactions.length + 1), false);
      return;
    }
    else {
      commonBlockchain.Transactions.Get([prevTxid], onTransaction);
    }
  };
  commonBlockchain.Transactions.Get([txid], onTransaction)

};

module.exports = {
  post: post,
  scanSingle: scanSingle,
  parse: dataPayload.getInfo,
  payloadsLength: payloadsLength,
  bitcoinTransactionBuilder: bitcoinTransactionBuilder
};