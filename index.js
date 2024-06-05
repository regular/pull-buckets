//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const copy = require('deep-copy')

module.exports = function(fitsBucket, add, opts) {
  opts = opts || {}
  let {timeout, initial, max_age} = opts
  if (max_age == undefined) max_age = 512

  let end, timer, bucket = initial, reading
  let rec_cnt = 0
  const cbs = []
  const buff = []

  return function (read) {

    return function (abort, cb) {
      cbs.push(cb)

      if (buff.length) {
        cb = cbs.shift()
        const [err, acc] = buff.shift()
        if (err) return cb(err)
        return cb(null, acc)
      }
      if (end) return flush(end)
      if (reading) return

      function flush(err, acc) {
        buff.push([err, acc])
        cb = cbs.shift()
        if (cb) {
          if (timer) clearTimeout(timer)
          timer = null
          const [err, acc] = buff.shift()
          if (err) return cb(err)
          return cb(null, acc)
        }
      }

      function setTimer() {
        if (timer) clearTimeout(timer)
        if (!timeout) return
        timer = setTimeout(()=>{
          timer = null
          if (bucket !== null && bucket !== undefined) {
            flush(null, copy(bucket))
          }
        }, timeout)
      }


      function slurp() {
        reading = true
        setTimer()
        read(abort, (err, data) =>{
          reading = false
          if (err) {
            end = err
            if (bucket) flush(null, bucket)
            else flush(err)
            return
          }

          if (bucket && !fitsBucket(bucket, data)) {
            flush(null, bucket) // no need to copy, we create a new bucckt right away
            bucket = add(undefined, data)
          } else {
            bucket = add(bucket, data)
            if (bucket && max_age && ++rec_cnt >= max_age) {
              rec_cnt = 0
              flush(null, copy(bucket))
            }
            return slurp()
          }
        })
      }
      slurp()
    }
  }
}
