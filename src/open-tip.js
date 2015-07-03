
var Bitcoin = require("bitcoinjs-lib");

var header = "♥";
var headerHex = "e299a5";

var signFromPrivateKeyWIF = function(privateKeyWIF) {
  return function(tx, callback) {
    var key = Bitcoin.ECKey.fromWIF(privateKeyWIF);
    tx.sign(0, key); 
    callback(false, tx);
  }
};

var signFromTransactionHex = function(signTransactionHex) {
  if (!signTransactionHex) {
    return false;
  }
  return function(tx, callback) {
    var txHex = tx.tx.toHex();
    signTransactionHex(txHex, function(error, signedTxHex) {
      var signedTx = Bitcoin.TransactionBuilder.fromTransaction(Bitcoin.Transaction.fromHex(signedTxHex));
      callback(error, signedTx);
    });
  };
};

var createSignedTransaction = function(options, callback) {
  var tipTransactionHash = options.tipTransactionHash;
  var tipDestinationAddress = options.tipDestinationAddress;
  var tipAmount = options.tipAmount || 10000;
  var data = new Buffer(headerHex + tipTransactionHash, "hex");
  var commonWallet = options.commonWallet;
  var commonBlockchain = options.commonBlockchain;
  var signTransaction = signFromTransactionHex(commonWallet.signRawTransaction);
  options.signTransaction = signTransaction;
  var address = commonWallet.address;
  var fee = options.fee || 1000;
  var payloadScript = Bitcoin.Script.fromChunks([Bitcoin.opcodes.OP_RETURN, data]);
  var tx = new Bitcoin.TransactionBuilder();
  commonBlockchain.Addresses.Unspents([address], function(err, addresses_unspents) {
    var unspentOutputs = addresses_unspents[0];
    var compare = function(a,b) {
      if (a.value < b.value)
        return -1;
      if (a.value > b.value)
        return 1;
      return 0;
    };
    unspentOutputs.sort(compare);
    var unspentValue = 0;
    for (var i = unspentOutputs.length - 1; i >= 0; i--) {
      var unspentOutput = unspentOutputs[i];
      if (unspentOutput.value === 0) {
        continue;
      }
      unspentValue += unspentOutput.value;
      tx.addInput(unspentOutput.txid, unspentOutput.vout);
      if (unspentValue - fee - tipAmount >= 0) {
        break;
      }
    };
    tx.addOutput(payloadScript, 0);
    tx.addOutput(tipDestinationAddress, tipAmount);

    if (unspentValue - fee - tipAmount > 0) {
      tx.addOutput(address, unspentValue - fee - tipAmount);
    }

    // AssertionError: Number of addresses must match number of transaction inputs
    // this seems to be a bug in bitcoinjs-lib
    // it is checking for assert.equal(tx.ins.length, addresses.length, 'Number of addresses must match number of transaction inputs')
    // but that doesn't make sense because the number of ins doesn't have anything to do with the number of addresses...
    // the solution is to upgrade bitcoinjs-min.js

    signTransaction(tx, function(err, signedTx) {
      var signedTxBuilt = signedTx.build();
      var signedTxHex = signedTxBuilt.toHex();
      var txHash = signedTxBuilt.getId();
      callback(false, signedTxHex, txHash);
    });

  });
};

var getTips = function(options, callback) {
  var transactions = options.transactions;
  var tips = [];
  transactions.forEach(function(tx) {
    var tip = {};
    var sources = [];
    var value;
    tx.vin.forEach(function(input) {
      var sourceAddress = input.addresses[0];
      if (sourceAddress) {
        sources.push(sourceAddress);
      }
    });
    tx.vout.forEach(function(output) {
      if (output.scriptPubKey.type == 'nulldata') {
        var scriptPubKey = output.scriptPubKey.hex;
        if (scriptPubKey.slice(0,2) == "6a") {
          var data = scriptPubKey.slice(4, 84);
          if (data.slice(0,6) == headerHex && data.length == 70) {
            tip.tipTransactionHash = data.slice(6, 70);
          }
        }
      }
      else if (output.scriptPubKey.type == 'pubkeyhash') {
        var destinationAddress = output.scriptPubKey.addresses[0];
        if (!value || output.value < value) {
          value = output.value;
        }
        if (sources.indexOf(destinationAddress) < 0) {
          tip.tipDestinationAddress = destinationAddress;
          tip.tipAmount = output.value;
        }
      }
    });
    if (!tip.tipDestinationAddress && typeof(value) != "undefined") {
      tip.tipDestinationAddress = sources[0];
      tip.tipAmount = value;
    }
    tips.push(tip)
  });
  callback(false, tips)
};

var openTip = {
  createSignedTransaction: createSignedTransaction,
  getTips: getTips
}

module.exports = openTip;