jasmine.getEnv().defaultTimeoutInterval = 50000;

var bitcoinTransactionBuilder = require("../src/bitcoin-transaction-builder");
var dataPayload = require("../src/data-payload");

var txHexToJSON = require('bitcoin-tx-hex-to-json');
var bitcoin = require("bitcoinjs-lib");
var async = require("async");
var commonBlockchain = require("mem-common-blockchain")();

var testnetCommonBlockchain = require('blockcypher-unofficial')({
  network: "testnet"
});

var testCommonWallet = require('test-common-wallet');

var commonWallet = testCommonWallet({
  seed: "test",
  network: "testnet",
  commonBlockchain: commonBlockchain
});

var anotherCommonWallet = testCommonWallet({
  seed: "test1",
  network: "testnet",
  commonBlockchain: testnetCommonBlockchain
});

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?";

var randomJsonObject = function(messageLength) {
  var r = {
    "m": loremIpsum.slice(0,messageLength),
    "i": randomString(36),
    "t": +(new Date)
  };
  return JSON.stringify(r);
};

var randomString = function(length) {
  var characters = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  var output = '';
  for (var i = 0; i < length; i++) {
    var r = Math.floor(Math.random() * characters.length);
    output += characters.substring(r, r + 1);
  }
  return output;
};

describe("bitcoin transaction builder", function() {

  it("should create transaction with test0.data, using data0.utxo, signed with test0.privateKeyWIF and get text0.txHex", function(done) {

    var test0 = require("./raw-transactions/test0.json");

    var test0Wallet = {
      signRawTransaction: function(txHex, callback) {
        var index = 0;
        var options;
        if (typeof(txHex) == "object") {
          options = txHex;
          txHex = options.txHex;
          index = options.index || 0;
        }
        var tx = bitcoin.Transaction.fromHex(txHex);
        var key = bitcoin.ECKey.fromWIF(test0.privateKeyWIF)
        tx.sign(index, key);
        var signedTx = tx;
        var txid = signedTx.getId();
        var signedTxHex = signedTx.toHex();
        callback(false, signedTxHex, txid);
      },
      address: test0.address
    }

    var test0Blockchain = {
      Addresses: {
        Unspents: function(addresses, cb) { cb(false, [[test0.utxo]]) }
      }
    };

    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: test0.data, 
      commonWallet: test0Wallet,
      commonBlockchain: test0Blockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(1);
      var txHex = signedTransactions[0];
      expect(txHex).toBe(test0.txHex);
      done();
    });

  });

  it("should create transaction with test1.data, using data1.utxo, signed with test1.privateKeyWIF and get text1.txHex", function(done) {

    var test1 = require("./raw-transactions/test1.json");

    var test1Wallet = {
      signRawTransaction: function(txHex, callback) {
        var index = 0;
        var options;
        if (typeof(txHex) == "object") {
          options = txHex;
          txHex = options.txHex;
          index = options.index || 0;
        }
        var tx = bitcoin.Transaction.fromHex(txHex);
        var key = bitcoin.ECKey.fromWIF(test1.privateKeyWIF)
        tx.sign(index, key);
        var signedTx = tx;
        var txid = signedTx.getId();
        var signedTxHex = signedTx.toHex();
        callback(false, signedTxHex, txid);
      },
      address: test1.address
    }

    var test1Blockchain = {
      Addresses: {
        Unspents: function(addresses, cb) { cb(false, [[test1.utxo]]) }
      }
    };

    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: test1.data, 
      commonWallet: test1Wallet,
      commonBlockchain: test1Blockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(4);
      expect(signedTransactions).toEqual(test1.txHexes);
      done();
    });
    
  });

  it("should create the transaction for a random string of 30 bytes", function(done) {
    var data = randomString(30);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions, txid) {
      expect(signedTransactions.length).toBe(1);
      var primaryTxHex = signedTransactions[0];
      var primaryTx = txHexToJSON(primaryTxHex);
      expect(primaryTx.txid).toBe(txid);
      var primaryData = new Buffer(primaryTx.vout[0].scriptPubKey.hex, 'hex');
      var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
      expect(length).toBe(1);
      bitcoinTransactionBuilder.getData({transactions:signedTransactions}, function(error, decodedTransactions) {
        var decodedData = decodedTransactions[0].data;
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should create the transaction for a random string of 170 bytes", function(done) {
    var data = randomString(170);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions, txid) {
      expect(signedTransactions.length).toBe(2);
      var primaryTxHex = signedTransactions[0];
      var primaryTx = txHexToJSON(primaryTxHex);
      expect(primaryTx.txid).toBe(txid);
      var primaryData = new Buffer(primaryTx.vout[0].scriptPubKey.hex, 'hex');
      var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
      var txHex1 = signedTransactions[1];
      var tx1 = txHexToJSON(txHex1);
      expect(primaryTx.vin[0].txid).toBe(tx1.txid);
      expect(length).toBe(2);
      bitcoinTransactionBuilder.getData({transactions:signedTransactions}, function(error, decodedTransactions) {
        var decodedData = decodedTransactions[0].data;
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should create the transaction for a random string of 320 bytes", function(done) {
    var data = randomString(320);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions, txid) {
      expect(signedTransactions.length).toBe(4);
      var primaryTxHex = signedTransactions[0];
      var primaryTx = txHexToJSON(primaryTxHex);
      expect(primaryTx.txid).toBe(txid);
      var primaryData = new Buffer(primaryTx.vout[0].scriptPubKey.hex, 'hex');
      var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
      expect(length).toBe(4);
      var tx1 = txHexToJSON(signedTransactions[1]);
      expect(primaryTx.vin[0].txid).toBe(tx1.txid);
      var tx2 = txHexToJSON(signedTransactions[2]);
      expect(tx1.vin[0].txid).toBe(tx2.txid);
      var tx3 = txHexToJSON(signedTransactions[3]);
      expect(tx2.vin[0].txid).toBe(tx3.txid);
      bitcoinTransactionBuilder.getData({transactions:signedTransactions}, function(error, decodedTransactions) {
        var decodedData = decodedTransactions[0].data;
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should create the transaction for a random string of 675 bytes", function(done) {
    var data = randomString(675);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions, txid) {
      expect(signedTransactions.length).toBe(7);
      var primaryTxHex = signedTransactions[0];
      var primaryTx = txHexToJSON(primaryTxHex);
      expect(primaryTx.txid).toBe(txid);
      var primaryData = new Buffer(primaryTx.vout[0].scriptPubKey.hex, 'hex');
      var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
      expect(length).toBe(7);
      signedTransactions.forEach(function(signedTxHex) {
        var signedTx = txHexToJSON(signedTxHex);
        signedTx.vin.forEach(function(vin) {
          expect(vin.scriptSig.hex).not.toBe('');
        });
      });
      bitcoinTransactionBuilder.getData({transactions:signedTransactions}, function(error, decodedTransactions) {
        var decodedData = decodedTransactions[0].data;
        expect(data).toBe(decodedData);
        done();
      });
    });
  });

  it("should create the transaction for full latin paragraph of 1265 bytes", function(done) {
    var data = loremIpsum.slice(0, 1265);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions, txid) {
      expect(signedTransactions.length).toBe(6);
      signedTransactions.forEach(function(signedTxHex) {
        var signedTx = txHexToJSON(signedTxHex);
        signedTx.vin.forEach(function(vin) {
          expect(vin.scriptSig.hex).not.toBe('');
        });
      });
      bitcoinTransactionBuilder.getData({transactions:signedTransactions}, function(error, decodedTransactions) {
        var decodedData = decodedTransactions[0].data;
        expect(data).toBe(decodedData);
        done();
      });
    });  
  });

  it("should create the transaction with a custom primaryTxHex with 30 bytes", function(done) {
    var data = randomString(30);
    var value = 12345;
    anotherCommonWallet.createTransaction({
      destinationAddress: commonWallet.address,
      value: value,
      skipSign: true
    }, function(err, primaryTxHex) {
      var primaryTx = txHexToJSON(primaryTxHex);
      expect(primaryTx.vout[0].value).toBe(value);
      expect(primaryTx.vin[0].scriptSig.hex).toBe('');
      bitcoinTransactionBuilder.createSignedTransactionsWithData({
        primaryTxHex: primaryTxHex,
        data: data, 
        commonWallet: commonWallet,
        commonBlockchain: testnetCommonBlockchain
      }, function(err, signedTransactions, txid) {
        expect(signedTransactions.length).toBe(1);
        var primaryTxHex = signedTransactions[0];
        var primaryTx = txHexToJSON(primaryTxHex);
        expect(primaryTx.txid).toBe(txid);
        expect(primaryTx.vin[0].scriptSig.hex).toBe('');
        expect(primaryTx.vout[0].value).toBe(value);
        expect(primaryTx.vout[2].value).toBe(0);
        var primaryData = new Buffer(primaryTx.vout[2].scriptPubKey.hex, 'hex');
        var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
        expect(length).toBe(1);
        anotherCommonWallet.signRawTransaction({txHex: primaryTxHex, input: 0}, function(err, signedTxHex) {
          var signedTx = txHexToJSON(signedTxHex);
          signedTx.vin.forEach(function(vin) {
            expect(vin.scriptSig.hex).not.toBe('');
          });
          testnetCommonBlockchain.Transactions.Propagate(signedTxHex, function(err, res) {
            console.log(res.status, "1/1");
            if (err) {
              return done(err);
            }
            done();
            var txids = [res.txid];
            // testnetCommonBlockchain.Transactions.Get(txids, function(err, transactions) {
            //   expect(transactions[0].vout[0].value).toBe(value);
            //   bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
            //     expect(data).toBe(decodedData);
            //     done();
            //   });
            // });
          });
        });
      });
    });
  });

  it("should create the transaction with a custom primaryTxHex with 120 bytes", function(done) {
    var data = randomString(120);
    var value = 12345;
    var signPrimaryTxHex = function(txHex, callback) {
      anotherCommonWallet.signRawTransaction({txHex: txHex, input: 0}, callback);
    }
    anotherCommonWallet.createTransaction({
      destinationAddress: commonWallet.address,
      value: value,
      skipSign: true
    }, function(err, primaryTxHex) {
      bitcoinTransactionBuilder.createSignedTransactionsWithData({
        primaryTxHex: primaryTxHex,
        signPrimaryTxHex: signPrimaryTxHex,
        data: data, 
        commonWallet: commonWallet,
        commonBlockchain: testnetCommonBlockchain
      }, function(err, signedTransactions, txid) {
        expect(signedTransactions.length).toBe(2);
        var primaryTxHex = signedTransactions[0];
        var primaryTx = txHexToJSON(primaryTxHex);
        expect(primaryTx.txid).toBe(txid);
        expect(primaryTx.vout[0].value).toBe(value);
        expect(primaryTx.vout[2].value).toBe(0);
        signedTransactions.forEach(function(signedTxHex) {
          var signedTx = txHexToJSON(signedTxHex);
          signedTx.vin.forEach(function(vin) {
            expect(vin.scriptSig.hex).not.toBe('');
          });
        });
        var primaryData = new Buffer(primaryTx.vout[2].scriptPubKey.hex, 'hex');
        var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
        expect(length).toBe(2);
        var txHex1 = signedTransactions[1];
        var tx1 = txHexToJSON(txHex1);
        expect(primaryTx.vin[1].txid).toBe(tx1.txid);
        done();
      });
    });
  });

  it("should create the transaction with a custom primaryTxHex with 320 bytes", function(done) {
    var data = randomString(320);
    var value = 12345;
    var signPrimaryTxHex = function(txHex, callback) {
      anotherCommonWallet.signRawTransaction({txHex: txHex, input: 0}, callback);
    }
    anotherCommonWallet.createTransaction({
      destinationAddress: commonWallet.address,
      value: value,
      skipSign: true
    }, function(err, primaryTxHex) {
      bitcoinTransactionBuilder.createSignedTransactionsWithData({
        primaryTxHex: primaryTxHex,
        signPrimaryTxHex: signPrimaryTxHex,
        data: data, 
        commonWallet: commonWallet,
        commonBlockchain: testnetCommonBlockchain
      }, function(err, signedTransactions, txid) {
        expect(signedTransactions.length).toBe(4);
        var primaryTxHex = signedTransactions[0];
        var primaryTx = txHexToJSON(primaryTxHex);
        var primaryData = new Buffer(primaryTx.vout[2].scriptPubKey.hex, 'hex');
        var length = dataPayload.parse(primaryData.slice(2, primaryData.length));
        expect(length).toBe(4);
        signedTransactions.forEach(function(signedTxHex) {
          var signedTx = txHexToJSON(signedTxHex);
          signedTx.vin.forEach(function(vin) {
            expect(vin.scriptSig.hex).not.toBe('');
          });
        });
        expect(primaryTx.txid).toBe(txid);
        done();
      });
    });
  });

});