jasmine.getEnv().defaultTimeoutInterval = 50000;

var blockcast = require("../src/index");

var bitcoin = require("bitcoinjs-lib");

var env = require('node-env-file');
env('./.env');

var loremIpsum = "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?"

var BLOCKCYPHER_TOKEN = process.env.BLOCKCYPHER_TOKEN;

var commonBlockchain = require('blockcypher-unofficial')({
  key: BLOCKCYPHER_TOKEN,
  network: "testnet"
});


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

var testCommonWallet = require('test-common-wallet');

var commonWallet = testCommonWallet({
  seed: "test",
  network: "testnet",
  commonBlockchain: commonBlockchain
});

var anotherCommonWallet = testCommonWallet({
  seed: "test1",
  network: "testnet",
  commonBlockchain: commonBlockchain
});

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

  it("should post a message with a primaryTx", function(done) {

    var data = JSON.stringify({
      op: "t",
      value: 50000000,
      sha1: "dd09da17ec523e92e38b5f141d9625a5e77bb9fa"
    });

    var signPrimaryTxHex = function(txHex, callback) {
      anotherCommonWallet.signRawTransaction({txHex: txHex, input: 0}, callback);
    }

    var value = 12345;
    anotherCommonWallet.createTransaction({
      destinationAddress: commonWallet.address,
      value: value,
      skipSign: true
    }, function(err, primaryTxHex) {
      blockcast.post({
        primaryTxHex: primaryTxHex,
        signPrimaryTxHex: signPrimaryTxHex,
        data: data,
        commonWallet: commonWallet,
        commonBlockchain: commonBlockchain,
        propagationStatus: console.log
      }, function(error, blockcastTx) {
        console.log(error, blockcastTx);
        expect(blockcastTx.data).toBe(data);
        expect(blockcastTx.txid).toBeDefined();
        expect(blockcastTx.transactionTotal).toBe(2);
        done();
      });

    });

  });

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