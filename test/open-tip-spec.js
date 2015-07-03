jasmine.getEnv().defaultTimeoutInterval = 50000;

var bitcoin = require("bitcoinjs-lib");
var openTip = require("../src/open-tip");

var commonBlockchain;
if (process.env.CHAIN_API_KEY_ID && process.env.CHAIN_API_KEY_SECRET) {
  var ChainAPI = require("chain-unofficial");
  commonBlockchain = ChainAPI({
    network: "testnet", 
    key: process.env.CHAIN_API_KEY_ID, 
    secret: process.env.CHAIN_API_KEY_SECRET
  });
}
else {
  commonBlockchain = require("mem-common-blockchain")();
}

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

describe("open tip", function() {

  it("should tip a transaction", function(done) {
    // this will keep growing every time the test suite is run... perhaps generate a random tipDestinationAddress?
    var tipDestinationAddress = "mr5qCMve7UVgJ8RCsqzsgQz9ry7sonEoKc";
    var tipTransactionHash = "ec42f55249fb664609ef4329dcce3cab6d6ae14f6860a602747a72f966de3e13";
    var tipAmount = 9000;
    openTip.createSignedTransaction({
      tipTransactionHash: tipTransactionHash,
      tipDestinationAddress: tipDestinationAddress, 
      tipAmount: tipAmount,
      commonWallet: commonWallet,
      commonBlockchain: commonBlockchain
    }, function(err, signedTxHex) {
      commonBlockchain.Transactions.Propagate(signedTxHex, function(err, res) {
        console.log(res.status, "1/1");
        if (err) {
          return done(err);
        }
        setTimeout(function() {
          commonBlockchain.Transactions.Get([res.txid], function(err, transactions) {
            openTip.getTips({transactions: transactions}, function(err, tips) {
              expect(tips.length >= 1).toBeTruthy();
              var tip = tips[0];
              expect(tip.tipTransactionHash).toBe(tipTransactionHash);
              expect(tip.tipDestinationAddress).toBe(tipDestinationAddress);
              expect(tip.tipAmount).toBe(tipAmount);
              done();
            });
          });
        }, 1500);
      });
    });
  });

 
});