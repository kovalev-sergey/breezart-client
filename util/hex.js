exports.decToHex = function (dec) {
  if (!Number.isInteger(dec) || dec < 0 || dec > 65535) {
    throw new Error('Value must be a positive integer and less than 65535')
  }
  return dec.toString(16)
}

exports.decToHexSign = function (dec) {
  if (!Number.isInteger(dec) || dec > 65535) {
    throw new Error('Value must be a integer and less than 65535')
  }

  if (dec < 0) {
    dec = 0xFFFF + dec + 1
  }

  return parseInt(dec, 10).toString(16)
}

exports.hexToDec = function (hex) {
  return parseInt(hex, 16)
}

exports.hexToDecSign = function (hex) {
  let res = parseInt(hex, 16)
  if (((res & 0x8000) > 0)) {
    res = res - 0x10000
  }
  return res
}

/**
  Parce bits from `from` index to `to` index of two bytes hex `input`
  @return int
*/
exports.parceBits = function (input, from, to) {
  if (!to) to = from
  let bits = parseInt(input, 16).toString(2).split('').reverse()
  let val = bits.slice(from, to + 1).reverse().join('')
  return parseInt(val, 2)
}
