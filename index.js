//jshint -W033
//jshint -W018
//jshint  esversion: 11
const pull = require('pull-stream')
const copy = require('deep-copy')

module.exports = function(fitsBucket, add, opts) {
  opts = opts || {}
  let {timeout, initial, max_size} = opts
  if (max_size == undefined) max_size = 512

  let reading, end, timer
  let bucket = initial
  let size = 0 // how many items thrown into current bucket
  const cbs = [], queue = []

  return function (read) {

    return function (abort, cb) {
      cbs.push(cb)

      if (queue.length) return flush()
      if (end) {
        queue.push([end])
        return flush()
      }
      if (reading) return

      function flush() {
        while (cbs.length && queue.length) {
          const cb = cbs.shift()
          const [err, acc] = queue.shift()
          if (timer) clearTimeout(timer)
          timer = null
          cb(err, err ? null : acc)
        }
      }

      function setTimer() {
        if (timer) clearTimeout(timer)
        if (!timeout) return
        timer = setTimeout(()=>{
          timer = null
          if (bucket !== null && bucket !== undefined) {
            queue.push([null, copy(bucket)])
            flush()
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
            queue.push([bucket ? null : err, bucket])
            return flush()
          }

          if (bucket && !fitsBucket(bucket, data)) {
            queue.push([null, bucket]) // no need to copy, we create a new bucckt right away
            bucket = add(undefined, data) // update state *before* we call back
            flush()
          } else {
            bucket = add(bucket, data)
            if (bucket && max_size && ++size >= max_size) {
              size = 0
              queue.push([null, copy(bucket)])
              flush()
            }
            return slurp()
          }
        })
      }
      slurp()
    }
  }
}
