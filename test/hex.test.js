/* eslint-env mocha */
process.env.NODE_ENV = 'test'

const { decToHex, hexToDec, decToHexSign, hexToDecSign, parceBits, isHex } = require('../util/hex')
const expect = require('chai').expect

describe('Check hex to dec to hex converting', () => {
  it('Dec for converting must be integer', () => {
    expect(() => decToHex(0.1)).to.throw('Value must be a positive integer and less than 65535')
  })

  it('... positive integer', () => {
    expect(() => decToHex(-1)).to.throw('Value must be a positive integer and less than 65535')
  })

  it('... ... two byte lenght', () => {
    expect(() => decToHex(99999)).to.throw('Value must be a positive integer and less than 65535')
  })

  it('And corect converting', () => {
    expect(decToHex(0)).have.to.be.equal('0')
    expect(decToHex(65535)).have.to.be.equal('ffff')
    expect(decToHexSign(-1)).have.to.be.equal('ffff')

    expect(hexToDec('ffff')).have.to.be.equal(65535)
    expect(hexToDec('0')).have.to.be.equal(0)
    expect(hexToDecSign('ffff')).have.to.be.equal(-1)
    expect(hexToDecSign('ffdd')).have.to.be.equal(-35)
    expect(hexToDecSign('1')).have.to.be.equal(1)
  })

  it('Hex to int by bits', () => {
    expect(parceBits('ffdd', 0, 7)).have.to.be.equal(221)
    expect(parceBits('1f4c', 8, 15)).have.to.be.equal(31)
    expect(parceBits('1f4c', 9)).have.to.be.equal(1)
    expect(parceBits('1f4c', 4)).have.to.be.equal(0)
    expect(parceBits('1f4c', 0, 15)).have.to.be.equal(8012)
    expect(parceBits('0', 0, 15)).have.to.be.equal(0)
    expect(parceBits('0', 0, 15)).have.to.be.equal(0)
    expect(parceBits('0', 8, 15)).have.to.be.equal(0)
    expect(parceBits('841', 0)).have.to.be.equal(1)
    expect(parceBits('841', 11)).have.to.be.equal(1)
    expect(parceBits('841', 15)).have.to.be.equal(0)
  })
})

describe('Check string to hex', () => {
  it('lenght must be between 1 and 4 symbols', () => {
    expect(isHex('1')).have.to.be.equal(true)
    expect(isHex('12345')).have.to.be.equal(false)
    expect(isHex('1234')).have.to.be.equal(true)
    expect(isHex('FFFF')).have.to.be.equal(true)
    expect(isHex('AAAAA')).have.to.be.equal(false)
    expect(isHex('HAAA')).have.to.be.equal(false)
  })
})
