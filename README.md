pull-buckets
===

Segmentate an incoming stream into groups ("buckets") and reduce each group to a single value that is then passed downstream.

``` js
const buckets = require('pull-buckets')

function bucketKey(n) {
  return (n / 10) << 0
}

function createOrAdd(b, n) {
  b = b || {
    tens: bucketKey(n),
    l: [],
    sum: 0
  }
  b.sum += n
  b.l = b.l.concat([n])
  return b
}

function fitsBucket({tens}, n) {
  return bucketKey(n) == tens
}

pull(
  pull.values([1,2,10,11,20,25]),
  buckets(fitsBucket, createOrAdd),
  pull.log()
)

/* output: 
   {tens: 0, sum: 3, l: [ 1, 2 ]},
   {tens: 1, sum: 21, l: [ 10, 11 ]},
   {tens: 2, sum: 45, l: [ 20, 25 ]} 
*/
```

`buckets(fitsBucket, add, opts)`
    
returns a new pull through stream that accumulates items in buckets and passes buckets
downstream once encountering an item that does not fit the current bucket.

IMPORTANT: because of this mechanics, the icoming stream needs to be a sorted stream in regards to
whatever criteria `fitsBucket` (see below) implements.

    fitsBucket(bucket, value)

returns true if the value fits into the given bucket, false otherwise

    add(bucket, value)

if bucket is `undefined`, creates a fresh bucket and throws the given value into it. Othereise, accumulate the value in the existing bucket.

Options:
    - `initial`: an initial value for the first bucket
    - `timeout`: emit the current bucket once last update is older than given milliseconds
    - `max_size`: start a new bucket when this number of items where thrown into current bucket

License: MIT
