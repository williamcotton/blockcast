jasmine.getEnv().defaultTimeoutInterval = 50000;

var bitcoinTransactionBuilder = require("../src/bitcoin-transaction-builder");

var bitcoin = require("bitcoinjs-lib");

var async = require("async");

var commonBlockchain = require("mem-common-blockchain")();

var seed = bitcoin.crypto.sha256("test");
var wallet = new bitcoin.Wallet(seed, bitcoin.networks.testnet);
var address = wallet.generateAddress();

var signRawTransaction = function(txHex, cb) {
  var tx = bitcoin.Transaction.fromHex(txHex);
  var signedTx = wallet.signWith(tx, [address]);
  var txid = signedTx.getId();
  var signedTxHex = signedTx.toHex();
  cb(false, signedTxHex, txid);
};

var commonWallet = {
  signRawTransaction: signRawTransaction,
  address: address
}

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
        var tx = bitcoin.Transaction.fromHex(txHex);
        var key = bitcoin.ECKey.fromWIF(test0.privateKeyWIF)
        tx.sign(0, key);
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
        setTimeout(function() {
          commonBlockchain.Transactions.Get(txids, function(err, transactions) {
            //console.log(transactions);
            bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
              expect(data).toBe(decodedData);
              done();
            });
          });
        }, 1500);
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
          setTimeout(function() {
            commonBlockchain.Transactions.Get(txids, function(err, transactions) {
              bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
                expect(data).toBe(decodedData);
                done();
              });
            });
          }, 1500);
        }
      }

      commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
      // delay the second one
      setTimeout(function() {
        commonBlockchain.Transactions.Propagate(signedTransactions[1], propagateResponse);
      }, 1500);

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
          setTimeout(function() {
              //console.log(txids);
              commonBlockchain.Transactions.Get(txids, function(err, transactions) {
                //console.log("ttt", transactions);
                bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
                  expect(data).toBe(decodedData);
                  done();
                });
              });

          }, 3500);
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
          setTimeout(function() {

              commonBlockchain.Transactions.Get(txids, function(err, transactions) {
                //console.log("ttt", transactions);
                bitcoinTransactionBuilder.getData({commonWallet: commonWallet, transactions:transactions, id:id}, function(error, decodedData) {
                  expect(data).toBe(decodedData);
                  done();
                });
              });
            
          }, 6500);
        }
        else {
          commonBlockchain.Transactions.Propagate(signedTransactions[propagateCounter], propagateResponse);
        }
      }
      commonBlockchain.Transactions.Propagate(signedTransactions[0], propagateResponse);
    });  
  });

});