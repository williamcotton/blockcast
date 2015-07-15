blockcast
===

A multi-transaction protocol for storing data in the Bitcoin blockchain.

Posting a message
---

In our examples we're going to use ```bitcoinjs-lib``` to create our wallet.

```javascript
var bitcoin = require("bitcoinjs-lib");

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
```

We'll need to provide an instance of a commonBlockchain which will provide functions for signing a transaction, propagating a trasnaction, and looking up a transaction by ```txid```.

In this example we're using the in memory version that is provided by ```mem-common-blockchain```.


```javascript
var commonBlockchain = require("mem-common-blockchain")({
  type: "local"
});

// or we could connect to testnet

// commonBlockchain = require('blockcypher-unofficial')({
//   network: "testnet"
// });
```

And finally we're ready to post.

```javascript
blockcast.post({
  data: "Hello, world! I'm posting a message that is compressed and spread out across a number of bitcoin transactions!",
  commonWallet: commonWallet,
  commonBlockchain: commonBlockchain
}, function(error, response) {
  console.log(response);
});
```

Scan for a document from a single transaction
---

We can also provide the transaction hash from the first transaction's payload.

```javascript
blockcast.scanSingle({
  txid: '',
  commonBlockchain: commonBlockchain
}, function(err, document) {
  console.log(document);
});

```

How does it work?
---

Documents are compressed using DEFLATE and then embedded across up to 16 Bitcoin transactions in OP_RETURN outputs along with custom headers allowing for documents no larger than 607 bytes. 

This is enough space to contain a number of document digest formats, URIs and URNs. This allows for cross-platform content addressable systems such as BitTorrent and IPFS. Used by [openpublish](https://github.com/blockai/openpublish/)

Why Bitcoin?
---

The Bitcoin blockchain is the world's first public equal-access data store. Data embedded in the Bitcoin blockchain becomes provably published records signed by recognizable authors.

Other public data stores are unreliable. Bittorrent, Freenet and public-access DHTs cannot guarantee that data will be retrievable.

What about polluting the blockchain?
---

We will move this protocol to a Bitcoin sidechain designed specifically for public data as soon as the technology for building sidechains becomes available.

In the meantime we've created our own centralized public-access data store call [bitstore](https://github.com/blockai/bitstore-client/) that uses Bitcoin PKI for authentication, Bitcoin for payments, and pollutes the Bitcoin blockchain with no other data than a reference URI and a signed hash of the document. The multi-transaction Blockcast protocol will still be useful for storing this metadata as it will be more than 40 bytes.

Woodsy Owl says "Give a Hoot! Don't Pollute!"

What about an alternative currency like Namecoin?
---

Namecoin doesn't match this specific use-case as documents expire after ~200 days. 

It also lacks the infrastructure of exchanges, APIs, tools, and software that support Bitcoin.

Ultimately we feel that Bitcoin sidechains are a better approach to crypto-currencies than having competing alt-coins.

Building any application on top of Bitcoin creates an incentive to own Bitcoin. Incentives to own Bitcoin keep miners happy. Happy miners create happy Bitcoin.
