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

var memCommonBlockchain = require('mem-common-blockchain')();

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

var JSONdata = JSON.stringify({ 
  op: 'r',
  btih: '335400c43179bb1ad0085289e4e60c0574e6252e',
  sha1: 'dc724af18fbdd4e59189f5fe768a5f8311527050',
  ipfs: 'QmcJf1w9bVpquGdzCp86pX4K21Zcn7bJBUtrBP1cr2NFuR',
  name: 'test.txt',
  size: 7,
  type: 'text/plain',
  title: 'A text file for testing',
  keywords: 'test, text, txt' 
});

describe("blockcast", function() {

  it("should post a message of a random string of 170 bytes", function(done) {

    var data = randomString(170);

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

  it("should post a message of a random string of 276 bytes", function(done) {

    blockcast.post({
      data: JSONdata,
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(error, blockcastTx) {
      expect(blockcastTx.data).toBe(JSONdata);
      expect(blockcastTx.txid).toBeDefined();
      expect(blockcastTx.transactionTotal).toBe(3);
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
        commonBlockchain: commonBlockchain
      }, function(error, blockcastTx) {
        expect(blockcastTx.data).toBe(data);
        expect(blockcastTx.txid).toBeDefined();
        expect(blockcastTx.transactionTotal).toBe(1);
        done();
      });

    });

  });

  it("should get the payloads length", function(done) {    
    var data = loremIpsum;
    blockcast.payloadsLength({data: data}, function(err, payloadsLength) {
      expect(payloadsLength).toBe(6);
      done();
    });
  });

  it("should warn when the payloads length is too big", function(done) {    
    var data = randomString(4200);
    blockcast.payloadsLength({data: data}, function(err, payloadsLength) {
      expect(err).toBe('data payload > 1277');
      expect(payloadsLength).toBe(false);
      done();
    });
  });

  it("should scan single txid 884db69602bffa8be074068ac8ee44fa37e31817b56a9092c996587d40e01742", function(done) {    
    var txid = "884db69602bffa8be074068ac8ee44fa37e31817b56a9092c996587d40e01742";
    blockcast.scanSingle({
      txid: txid,
      commonBlockchain: commonBlockchain
    }, function(err, data) {
      expect(data).toBe("ykt2AA31pAwBnB1IgNdoxsqcO41KxhsxVmqwhmWsRTTLQ9sp8QXNhWaZ58HhzMHB2O3p9CBkcvNtBngU1bgeMtsZywKHBCVRQgsVm6CtfFgrHNr8uaGX6kFLT8hvbMW6ID0XTUFFSTT83DIEeS4SifaFwTPex20B27QvwR0DDm");
      done();
    });
  });

  it("should scan single txid fe44cae45f69dd1d6115815356a73b9c5179feff1b276d99ac0e283156e1cd01", function(done) {    
    var txid = "fe44cae45f69dd1d6115815356a73b9c5179feff1b276d99ac0e283156e1cd01";
    blockcast.scanSingle({
      txid: txid,
      commonBlockchain: commonBlockchain
    }, function(err, data) {
      expect(data).toBe(JSONdata);
      done();
    });
  });

  it("should not scan single txid b32192c9d2d75a8a28dd4034ea61eacb0dfe4f226acb502cfe108df20fbddebc", function(done) {    
    var txid = "b32192c9d2d75a8a28dd4034ea61eacb0dfe4f226acb502cfe108df20fbddebc";
    blockcast.scanSingle({
      txid: txid,
      commonBlockchain: commonBlockchain
    }, function(err, data) {
      expect(data).toBe(false);
      expect(err).toBe("not blockcast");
      done();
    });
  });

  it("should post a message of a random string of 720 bytes and then scan (memCommonBlockchain) ", function(done) {
    var randomStringData = randomString(720);
    blockcast.post({
      data: randomStringData,
      commonWallet: commonWallet,
      commonBlockchain: memCommonBlockchain
    }, function(error, blockcastTx) {
      expect(blockcastTx.txid).toBeDefined();
      expect(blockcastTx.transactionTotal).toBe(8);
      blockcast.scanSingle({
        txid: blockcastTx.txid,
        commonBlockchain: memCommonBlockchain
      }, function(err, data) {
        expect(data).toBe(randomStringData);
        done();
    });
      done();
    });
  });

});