jasmine.getEnv().defaultTimeoutInterval = 50000;

var blockcast = require("../src/index");

var bitcoin = require("bitcoinjs-lib");

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"

var commonBlockchain = require("abstract-common-blockchain")({
  type: "local"
});

// uncomment this to use chain for testnet integration tests

// var ChainAPI = require("chain-unofficial");

// var commonBlockchain = ChainAPI({
//   network: "testnet", 
//   key: process.env.CHAIN_API_KEY_ID, 
//   secret: process.env.CHAIN_API_KEY_SECRET
// });

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

describe("blockcast", function() {

  it("should post a message of a random string of 70 bytes", function(done) {

    var data = randomString(70);

    blockcast.post({
      data: data,
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(error, blockcastTx) {
      expect(blockcastTx.data).toBe(data);
      expect(blockcastTx.txid).toBeDefined();
      expect(blockcastTx.transactionTotal).toBe(2);
      done();
    });

  });

  // We need to pick new transactions due to the hard fork
  //
  // Bitcoin Block Height: 342308
  // Testnet Block Height: 322184

  // it("should scan a block for messages", function(done) {

  //   helloblock.blocks.getTransactions(307068 , {limit: 100}, function(err, res, transactions) {
  //     blockcast.scan({
  //       transactions: transactions
  //     }, function(err, messages) {
  //       expect(messages.length).toBe(7);
  //       var msg = messages[0];
  //       expect(msg.address).toBe('mgqNd45CJsb11pCKdS68t13a7vcbs4HAHY');
  //       expect(msg.message).toBe('67ZUGK2M03aK3dbUK6UqllS2t3dKvWb8AnBOFeBL4qMZG4R1h2ep9thCFaDk0znZ65M1TeUK8OsK8TQN3hApdpP6u5AXq6Dx3Dsxv2fAsFq7Le');
  //       done();
  //     });
  //   });

  // });

  // it("should scan a single transaction", function(done) {
  //   var txid = "ec42f55249fb664609ef4329dcce3cab6d6ae14f6860a602747a72f966de3e13";
  //   blockcast.scanSingle({
  //     txid: txid,
  //     commonBlockchain: commonBlockchain
  //   }, function(err, message) {
  //     expect(message).toBe("zhhTf8FwMbncVmkkFlPIHmHi8ebif9oZzarnHFVGXpTvIlbSutrOlzA6npQnpn2SkfuhbytJQqdLiQ0MFRDfIqbFkvakl3h3nSHJlLPi5T50SR");
  //     done();
  //   });
  // });

  it("should tip a post", function(done) {

    var tipDestinationAddress = "mr5qCMve7UVgJ8RCsqzsgQz9ry7sonEoKc";
    var tipTransactionHash = "ec42f55249fb664609ef4329dcce3cab6d6ae14f6860a602747a72f966de3e13";

    blockcast.tip({
      tipDestinationAddress: tipDestinationAddress,
      tipTransactionHash: tipTransactionHash,
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(error, tipTx) {
      expect(tipTx.tipDestinationAddress).toBe(tipDestinationAddress);
      expect(tipTx.tipTransactionHash).toBe(tipTransactionHash);
      expect(tipTx.tipAmount).toBe(10000);
      expect(tipTx.txid).toBeDefined();
      done();
    });

  });


  it("should get the payloads length", function(done) {    
    var data = loremIpsum;
    blockcast.payloadsLength({data: data}, function(err, payloadsLength) {
      expect(payloadsLength).toBe(12);
      done();
    });
  });

  it("should warn when the payloads length is too big", function(done) {    
    var data = randomString(1200);
    blockcast.payloadsLength({data: data}, function(err, payloadsLength) {
      expect(err).toBe('data payload > 607');
      expect(payloadsLength).toBe(false);
      done();
    });
  });

});