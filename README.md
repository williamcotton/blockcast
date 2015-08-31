blockcast
===

A multi-transaction protocol for storing data in the Bitcoin blockchain.

This protocol is intended for use while **developing** ```OP_RETURN``` based protocols. Mature protocols should switch to a custom ```OP_RETURN``` method that uses as few transactions as possible to store data. 

In the meantime, save yourself from premature optimizations. Wait until you've figured out your protocol's most basic requirements so you don't hold up developing applications that consume your APIs.

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

How can it be better?
---

* Support 80 byte OP_RETURN
* Use backwards pointer (native input txid) instead of forwards pointer (spentTxid)
* Exponential fee for unlimited, yet impractical, data sizes.
* Remove per transactions byte headers and use start bytes+length or start bytes/end bytes.
* skip DEFLATE if it is bigger than the data being embedded

Please fork this project and help make it better!

Why Bitcoin?
---

The Bitcoin blockchain is the world's first public equal-access data store. Data embedded in the Bitcoin blockchain becomes provably published records signed by recognizable authors.

Other public data stores are unreliable. Bittorrent, Freenet and public-access DHTs cannot guarantee that data will be retrievable.

What about polluting the blockchain?
---

We will move this protocol to a Bitcoin sidechain designed specifically for public data as soon as the technology for building sidechains becomes available.

In the meantime we've been using this protocol while prototyping other protocols that rely on storing metadata in the Bitcoin blockchain.

Woodsy Owl says "Give a Hoot! Don't Pollute!"

What about an alternative currency like Namecoin?
---

Namecoin doesn't match all specific use-cases as documents expire after ~200 days. 

It also lacks the infrastructure of exchanges, APIs, tools, and software that support Bitcoin.

Ultimately we feel that Bitcoin sidechains are a better approach to crypto-currencies than having competing alt-coins.

Building any application on top of Bitcoin creates an incentive to own Bitcoin. Incentives to own Bitcoin keep miners happy. Happy miners create happy Bitcoin.

Was this always intended for prototyping?
---

No, this started out as some sort of "Twitter on the Blockchain" protocol but it quickly became clear that the current Bitcoin blockchain is most useful for storing metadata related to digital assets and not as a generic decentralized data store.
