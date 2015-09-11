blockcast
===

A multi-transaction protocol for storing data in the Bitcoin blockchain.

This protocol is intended for use while **developing** ```OP_RETURN``` based protocols. Mature protocols should switch to a custom ```OP_RETURN``` method that uses as few transactions as possible to store data. 

In the meantime, save yourself from premature optimizations. Wait until you've figured out your protocol's most basic requirements so you don't hold up developing applications that consume your APIs.

Posting data
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
var memCommonBlockchain = require("mem-common-blockchain")({
  type: "local"
});

// or we could connect to testnet

testnetCommonBlockchain = require('blockcypher-unofficial')({
  network: "testnet"
});
```

And finally we're ready to post.

```javascript
blockcast.post({
  data: "Hello, world! I'm posting a message that is compressed and spread out across a number of bitcoin transactions!",
  commonWallet: commonWallet,
  commonBlockchain: memCommonBlockchain
}, function(error, response) {
  console.log(response);
});
```

Scan for data from a single transaction
---

We can also provide the transaction hash from the first transaction's payload.

```javascript
blockcast.scanSingle({
  txid: 'fe44cae45f69dd1d6115815356a73b9c5179feff1b276d99ac0e283156e1cd01',
  commonBlockchain: testnetCommonBlockchain
}, function(err, body) {
  var document = JSON.parse(body);
  console.log(document);
});

```

How does it work?
---

Documents are compressed using DEFLATE and then embedded across up to 16 Bitcoin transactions in OP_RETURN outputs allowing for total compressed size of no larger than 1277 bytes. 

Each blockcast post has a primary transaction identified by the magic header ```0x1f00```. The compressed data can be rebuilt by following the chain of previous transactions back through their inputs and appending data stored in OP_RETURN.

```OP_RETURN 0x1f00032d8d5b4bc4301085ff4ac973d14c9a34c9beb982c20aa28222bee5ea06bb6d4cb3ec45fcef4ed59799e19cf39df92253262b52484b6c4d5b3cbb4e704a1def406a6bc1784a95604a071e7aea```

The total number of tranactions is stored as the first byte immediately following the magic header. In the above example, ```0x1f0003```, the total transaction count is 3, meaning that two more transactions bust be sequentially scanned in order to reconstruct the full compressed data.

This is enough space to contain a number of document digest formats, URIs and URNs. This allows for cross-platform content addressable formats between systems like BitTorrent and IPFS. Used by [openpublish](https://github.com/blockai/openpublish/).

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
