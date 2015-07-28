var bitcoinTransactionBuilder = require("./bitcoin-transaction-builder");
var dataPayload = require("./data-payload");
var openTip = require("./open-tip");

var post = function(options, callback) {
  var commonWallet = options.commonWallet;
  var commonBlockchain = options.commonBlockchain;
  var data = options.data;
  var fee = options.fee;
  var propagationStatus = options.propagationStatus || function() {};
  var buildStatus = options.buildStatus || function() {};
  var retryMax = options.retryMax || 5;
  var id = options.id || 0; // THINK ABOUT THIS!!! Maybe go through their recent transactions by default? options.transactions?
  bitcoinTransactionBuilder.createSignedTransactionsWithData({
    data: data, 
    id: id, 
    fee: fee,
    buildStatus: buildStatus,
    commonBlockchain: commonBlockchain,
    commonWallet: commonWallet
  }, function(err, signedTransactions, txid) {
    var transactionTotal = signedTransactions.length;
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
          commonBlockchain.Transactions.Propagate(signedTransactions[propagateCounter], propagateResponse);
        }
        else {
          callback(err, false);
        }
      }
      propagateCounter++;
      if (propagateCounter < transactionTotal) {
        commonBlockchain.Transactions.Propagate(signedTransactions[propagateCounter], propagateResponse);
      }
      else {
        callback(false, {
          txid: txid,
          data: data,
          transactionTotal: transactionTotal
        });
      }
    }
    commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
  });
};

var payloadsLength = function(options, callback) {
  bitcoinTransactionBuilder.dataPayload.create({data: options.data, id: 0}, function(err, payloads) {
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
  var payloadDatum = [];
  var transactionTotal;
  var onTransaction = function(err, transactions) {
    var tx = transactions[0];
    if (!tx) {
      return callback(err, false);
    }
    allTransactions.push(tx);
    var payload = bitcoinTransactionBuilder.getPayloadsFromTransactions([tx])[0];
    if (!payload || !payload.data) {
      return callback("no payload", false);
    }
    payloadDatum.push(payload.data);
    var spentTxid = tx.vout[1].spentTxid;
    if (payload.length) {
      transactionTotal = payload.length;
    }
    if (allTransactions.length == transactionTotal) {
      dataPayload.decode(payloadDatum, function(err, data) {
        callback(err, data);
      });
    }
    else if (!spentTxid) {
      callback("missing: " + (allTransactions.length + 1), false);
      return;
    }
    else {
      commonBlockchain.Transactions.Get([spentTxid], onTransaction);
    }
  };
  commonBlockchain.Transactions.Get([txid], onTransaction)
};

var scan = function(options, callback) {
  var messages = [];
  var transactions = options.transactions;

  var addressesWithPayloads = bitcoinTransactionBuilder.getPayloadsFromTransactions(transactions);

  var addresses = {};
  var messageCount = 0;
  addressesWithPayloads.forEach(function(messageFragment) {
    var address = messageFragment.address;
    addresses[address] = addresses[address] ? addresses[address] : {};
    var id = messageFragment.id;
    if (!addresses[address][id]) {
      addresses[address][id] = [];
      messageCount++;
    }
    addresses[address][id].push(messageFragment.data);
  });

  var decodeCount = 0;
  onDecode = function(error, decodedData) {
    if (error) {
      decodeCount++;
      return;
    }
    var message = {
      address: address,
      message: decodedData
    }
    messages.push(message);
    decodeCount++;
    if (decodeCount == messageCount) {
      callback(false, messages);
    }
  }

  for (var address in addresses) {
    var addressMessages = addresses[address];
    for (var id in addressMessages) {
      var data = addressMessages[id];
      dataPayload.decode(data, onDecode);
    }
  }

}

var tip = function(options, callback) {
  var tipTransactionHash = options.tipTransactionHash;
  var tipDestinationAddress = options.tipDestinationAddress;
  var tipAmount = options.tipAmount || 10000;
  var tipDestinationAddress = options.tipDestinationAddress;
  var commonBlockchain = options.commonBlockchain;
  var commonWallet = options.commonWallet;
  var fee = options.fee;
  openTip.createSignedTransaction({
    tipTransactionHash: tipTransactionHash,
    tipDestinationAddress: tipDestinationAddress,
    tipAmount: tipAmount,
    commonBlockchain: commonBlockchain,
    commonWallet: commonWallet,
    fee: fee,
  }, function(err, signedTxHex, txid) {
    var propagateResponse = function(err, res) {
      var tipTx = {
        tipTransactionHash: tipTransactionHash,
        tipDestinationAddress: tipDestinationAddress,
        tipAmount: tipAmount,
        txid: txid
      }
      if (err) {
        tipTx.propagateResponse = "failure";
      }
      else {
        tipTx.propagateResponse = "success";
      }
      callback(err, tipTx);
    }
    commonBlockchain.Transactions.Propagate(signedTxHex, propagateResponse);
  });
};

var parseTip = function(tx, callback) {
  openTip.getTips({transactions: [tx]}, function(err, tips) {
    var tip = tips[0];
    callback(err, tip);
  });
};

module.exports = {
  post: post,
  scan: scan,
  scanSingle: scanSingle,
  parse: dataPayload.getInfo,
  tip: tip,
  payloadsLength: payloadsLength,
  parseTip: parseTip,
  bitcoinTransactionBuilder: bitcoinTransactionBuilder
};