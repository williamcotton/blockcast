jasmine.getEnv().defaultTimeoutInterval = 50000;

var bitcoinTransactionBuilder = require("../src/bitcoin-transaction-builder");

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
      id: 0,
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
      id: 0,
      commonWallet: test1Wallet,
      commonBlockchain: test1Blockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(8);
      expect(signedTransactions).toEqual(test1.txHexes);
      done();
    });
    
  });

  it("should create the transaction for a random string of 30 bytes", function(done) {
    var data = randomString(30);
    var id = parseInt(Math.random()*16);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      id: id, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(1);
      var txHex = signedTransactions[0];
      commonBlockchain.Transactions.Propagate(txHex, function(err, res) {
        console.log(res.status, "1/1");
        if (err) {
          return done(err);
        }
        var txids = [res.txid];
        commonBlockchain.Transactions.Get(txids, function(err, transactions) {
          //console.log(transactions);
          bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
            expect(data).toBe(decodedData);
            done();
          });
        });
      });
    });
  });

  it("should create the transaction for a random string of 70 bytes", function(done) {
    var data = randomString(70);
    var id = parseInt(Math.random()*16);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      id: id, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(2);
      var propagateCounter = 0;
      var txids = [];
      var propagateResponse = function(err, res) {
        //console.log(err, res);
        console.log(propagateCounter + 1 + "/" + signedTransactions.length);
        if (err) {
          return done(err);
        }
        txids.push(res.txid);
        propagateCounter++;
        if (propagateCounter == signedTransactions.length) {
          commonBlockchain.Transactions.Get(txids, function(err, transactions) {
            bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
              expect(data).toBe(decodedData);
              done();
            });
          });
        }
      }

      commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
      commonBlockchain.Transactions.Propagate(signedTransactions[1], propagateResponse);

    });
  });

  it("should create the transaction for a random string of 175 bytes", function(done) {
    var data = randomString(175);
    var id = parseInt(Math.random()*16);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      id: id, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(5);
      var propagateCounter = 0;
      var txids = [];
      var propagateResponse = function(err, res, body) {
        //console.log(err, res);
        console.log(propagateCounter + 1 + "/" + signedTransactions.length);
        if (err) {
          return done(err);
        }
        txids.push(res.txid);
        propagateCounter++;
        if (propagateCounter == signedTransactions.length) {
          //console.log(txids);
          commonBlockchain.Transactions.Get(txids, function(err, transactions) {
            //console.log("ttt", transactions);
            bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
              expect(data).toBe(decodedData);
              done();
            });
          });
        }
        else {
          commonBlockchain.Transactions.Propagate(signedTransactions[propagateCounter], propagateResponse);
        }
      }
      commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
    });
  });

  it("should create the transaction for full latin paragraph of 865 bytes", function(done) {
    var data = loremIpsum.slice(0, 865);
    var id = parseInt(Math.random()*16);
    bitcoinTransactionBuilder.createSignedTransactionsWithData({
      data: data, 
      id: id, 
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTransactions) {
      expect(signedTransactions.length).toBe(12);
      var propagateCounter = 0;
      var txids = [];
      var propagateResponse = function(err, res) {
        //console.log(err, res);
        console.log(propagateCounter + 1 + "/" + signedTransactions.length);
        if (err) {
          return done(err);
        }
        txids.push(res.txid);
        propagateCounter++;
        if (propagateCounter == signedTransactions.length) {
          commonBlockchain.Transactions.Get(txids, function(err, transactions) {
            //console.log("ttt", transactions);
            bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
              expect(data).toBe(decodedData);
              done();
            });
          });
        }
        else {
          commonBlockchain.Transactions.Propagate(signedTransactions[propagateCounter], propagateResponse);
        }
      }
      commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
    });  
  });

  it("should create the transaction with a custom primaryTxHex", function(done) {
    var data = randomString(30);
    var id = parseInt(Math.random()*16);
    var value = 12345;
    anotherCommonWallet.createTransaction({
      destinationAddress: commonWallet.address,
      value: value,
      skipSign: true
    }, function(err, primaryTxHex) {
      bitcoinTransactionBuilder.createSignedTransactionsWithData({
        primaryTxHex: primaryTxHex,
        data: data, 
        id: id, 
        commonWallet: commonWallet,
        commonBlockchain: testnetCommonBlockchain
      }, function(err, signedTransactions) {
        expect(signedTransactions.length).toBe(1);
        var txHex = signedTransactions[0];
        anotherCommonWallet.signRawTransaction({txHex: txHex, input: 0}, function(err, signedTxHex) {
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

});