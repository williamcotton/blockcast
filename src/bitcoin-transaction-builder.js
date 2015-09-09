var assert = require("assert");

var bitcoin = require("bitcoinjs-lib");

var dataPayload = require("./data-payload");

var loadAndSignTransaction = function(options, callback) {
  var tx = options.tx;
  var address = options.address;
  var fee = options.fee;
  var unspentOutputs = options.unspentOutputs;
  var unspentValue = 0;
  var compare = function(a,b) {
    if (a.value < b.value)
      return -1;
    if (a.value > b.value)
      return 1;
    return 0;
  };
  unspentOutputs.sort(compare);
  var txInputIndex = tx.inputs.length
  for (var i = unspentOutputs.length - 1; i >= 0; i--) {
    var unspentOutput = unspentOutputs[i];
    if (unspentOutput.value === 0) {
      continue;
    }
    unspentValue += unspentOutput.value;
    tx.addInput(unspentOutput.txid, unspentOutput.vout);
  };
  tx.addOutput(address, unspentValue - fee);
  options.signTransaction(tx, txInputIndex, function(err, signedTx) {
    callback(false, signedTx);
  });
};

var createTransactionWithPayload = function(payload, primaryTxHex) {
  var primaryTx = primaryTxHex ? bitcoin.TransactionBuilder.fromTransaction(bitcoin.Transaction.fromHex(primaryTxHex)) : false;
  var payloadScript = bitcoin.Script.fromChunks([bitcoin.opcodes.OP_RETURN, payload]);
  var tx = primaryTx || new bitcoin.TransactionBuilder();
  tx.addOutput(payloadScript, 0);
  return tx;
};

var getPayloadsFromTransactions = function(transactions) {
  var payloads = [];
  for (var i = 0; i < transactions.length; i++) {
    var transaction = transactions[i];
    //console.log(transaction);
    var vout = transaction.vout;
    var address = transaction.vin[0] ? transaction.vin[0].addresses[0] : null;
    //console.log("address", address);
    for (var j = vout.length - 1; j >= 0; j--) {
      var output = vout[j];
      var scriptPubKey = output.scriptPubKey.hex;
      //console.log("scriptPubKey", scriptPubKey);
      var scriptPubKeyBuffer = new Buffer(scriptPubKey, 'hex');
      if (scriptPubKeyBuffer[0] == 106 && scriptPubKeyBuffer[2] == 31) {
        var payload = scriptPubKeyBuffer.slice(2, scriptPubKeyBuffer.length);
        //console.log("payload", payload);
        var info = dataPayload.getInfo(payload);
        var data = payload;
        payloads.push({
          data: payload,
          id: info.id,
          index: info.index,
          length: info.length,
          address: address
        });
      }
    }
  };
  return payloads;
};

var findByIdAndAddress = function(payloads, options) {
  var matchingPayloads = [];
  payloads.forEach(function(payload) {
    if (payload.id == options.id && payload.address == options.address) {
      matchingPayloads.push(payload.data);
    }
  });
  return matchingPayloads;
}

var getData = function(options, callback) {
  var transactions = options.transactions;
  var commonWallet = options.commonWallet;
  var address = commonWallet.address;
  var id = options.id;
  var unsortedPayloads = findByIdAndAddress(getPayloadsFromTransactions(transactions), {address: address, id: id});
  var payloads = dataPayload.sort(unsortedPayloads);
  dataPayload.decode(payloads, function(error, decodedData) {
    callback(error, decodedData)
  });
};

var signFromTransactionHex = function(signTransactionHex) {
  if (!signTransactionHex) {
    return false;
  }
  return function(tx, input, callback) {
    var txHex = tx.tx.toHex();
    signTransactionHex({txHex: txHex, input: input}, function(error, signedTxHex) {
      var signedTx = bitcoin.TransactionBuilder.fromTransaction(bitcoin.Transaction.fromHex(signedTxHex));
      callback(error, signedTx);
    });
  };
};

var createSignedTransactionsWithData = function(options, callback) {
  var primaryTxHex = options.primaryTxHex;
  var signPrimaryTxHex = options.signPrimaryTxHex;
  var commonWallet = options.commonWallet;
  var address = commonWallet.address;
  var commonBlockchain = options.commonBlockchain;
  var buildStatus = options.buildStatus || function() {};
  var signTransaction = signFromTransactionHex(commonWallet.signRawTransaction);
  options.signTransaction = signTransaction;
  var data = options.data;
  commonBlockchain.Addresses.Unspents([address], function(err, addresses_unspents) {
    var unspentOutputs = addresses_unspents[0];
    var id = options.id;
    var fee = options.fee || 1000;
    var address = commonWallet.address;

    dataPayload.create({data: data, id: id}, function(err, payloads) {

      var signedTransactions = [];
      var signedTransactionsCounter = 0;
      var payloadsLength = payloads.length;
      var txid;

      buildStatus({
        response: "got payloads",
        data: data,
        payloadsLength: payloadsLength
      });

      var totalCost = payloadsLength * fee;
      var existingUnspents = [];
      var unspentValue = 0;
      var compare = function(a,b) {
        if (a.value < b.value)
          return -1;
        if (a.value > b.value)
          return 1;
        return 0;
      };
      unspentOutputs.sort(compare);
      for (var i = unspentOutputs.length - 1; i >= 0; i--) {
        var unspentOutput = unspentOutputs[i];
        unspentValue += unspentOutput.value;
        existingUnspents.push(unspentOutput);
        if (unspentValue >= totalCost) {
          break;
        }
      };

      var signedTransactionResponse = function(err, signedTx) {
        var signedTxBuilt = signedTx.buildIncomplete();
        var signedTxHex = signedTxBuilt.toHex();
        var signedTxid = signedTxBuilt.getId();

        var onSignedTxHexAndId = function(signedTxHex, signedTxid) {
          buildStatus({
            response: "signed transaction",
            txid: signedTxid,
            count: signedTransactionsCounter,
            payloadsLength: payloadsLength
          });

          if (signedTransactionsCounter == 0) {
            txid = signedTxid;
          }
          signedTransactions[signedTransactionsCounter] = signedTxHex;
          signedTransactionsCounter++;
          if (signedTransactionsCounter == payloadsLength) {
            callback(false, signedTransactions, txid);
          }
          else {
            var payload = payloads[signedTransactionsCounter];
            var tx = createTransactionWithPayload(payload);
            var value = signedTx.tx.outs[1].value;
            
            var vout = 1;

            var unspent = {
              txid: signedTxid,
              vout: vout,
              value: value
            };

            loadAndSignTransaction({
              fee: fee,
              tx: tx,
              unspentOutputs: [unspent],
              address: address,
              signTransaction: options.signTransaction
            }, signedTransactionResponse);
          }
        }

        if (signPrimaryTxHex) {
          signPrimaryTxHex(signedTxHex, function(err, signedTxHex) {
            var _tx = bitcoin.TransactionBuilder.fromTransaction(bitcoin.Transaction.fromHex(signedTxHex));
            onSignedTxHexAndId(signedTxHex, _tx.build().getId());
          });
        }
        else {
          onSignedTxHexAndId(signedTxHex, signedTxid);
        }


      };

      var tx = createTransactionWithPayload(payloads[0], primaryTxHex);

      var signOptions = {
        fee: fee,
        tx: tx,
        unspentOutputs: existingUnspents,
        address: address,
        signTransaction: options.signTransaction,
        signPrimaryTxHex: signPrimaryTxHex
      };

      loadAndSignTransaction(signOptions, signedTransactionResponse);
    });
  });
};

module.exports = {
  createSignedTransactionsWithData: createSignedTransactionsWithData,
  getPayloadsFromTransactions: getPayloadsFromTransactions,
  dataPayload: dataPayload,
  getData: getData
};