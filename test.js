//jshint esversion:11
//jshint -W033
const test = require('tape')
const pull = require('pull-stream')
const Stream = require('.')

test('aggregates values', t=>{
  pull(
    pull.values([1,2,10,11,20,25]),
    Stream(fitsBucket, add),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {tens: 0, sum: 3, l: [ 1, 2 ]},
        {tens: 1, sum: 21, l: [ 10, 11 ]},
        {tens: 2, sum: 45, l: [ 20, 25 ]} 
      ])
      t.end()
    })
  )
})

test('initial', t=>{
  pull(
    pull.values([10]),
    Stream(fitsBucket, add, {
      initial: {
        tens: 1, l:[], sum: 100
      }
    }),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { tens: 1, sum: 110, l: [ 10 ] }
      ])
      t.end()
    })
  )
})

test('initial, then end', t=>{
  pull(
    pull.values([]),
    Stream(fitsBucket, add, {
      initial: {
        tens: 1, l:[], sum: 100
      }
    }),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        { tens: 1, sum: 100, l: [] }
      ])
      t.end()
    })
  )
})

test('dont stall', t=>{
  pull(
    timedSource([
      [0, 1],
      [0, 2],
      [200, 3],
      [0, 10],
      [0, 11],
      [0, 20],
      [200, 25],
    ]),
    Stream(fitsBucket, add, {timeout: 100}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {tens: 0, sum: 3, l: [ 1, 2 ] },
        {tens: 0, sum: 6, l: [ 1, 2, 3 ] },
        {tens: 1, sum: 21, l: [ 10, 11 ] },
        {tens: 2, sum: 20, l: [ 20 ] },
        {tens: 2, sum: 45, l: [ 20, 25 ] }
      ])
      t.end()
    })
  )
})

test('max_size', t=>{
  pull(
    pull.values([1,2,4, 10,11,12]),
    Stream(fitsBucket, add, {max_size: 2}),
    pull.collect( (err, data)=>{
      t.deepEqual(data, [
        {tens: 0, sum: 3, l: [ 1, 2 ] },
        {tens: 0, sum: 7, l: [ 1, 2, 4 ] },
        {tens: 1, sum: 21, l: [ 10, 11 ] },
        {tens: 1, sum: 33, l: [ 10, 11, 12 ] }
      ])
      t.end()
    })
  )
})


// - - - -

function bucketKey(n) {
  return (n / 10) << 0
}

function add(b, n) {
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

function timedSource(data) {
  return pull(
    pull.values(data),
    pull.asyncMap(function(item, cb) {
      setTimeout(function() {
        cb(null, item[1])
      }, item[0]);
    })
  )
}

