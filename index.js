const lenses = require('./lenses.js')
const operations = require('./operations.js')
const { dx } = require('./parser.js')

module.exports = {
  ...lenses,
  ...operations,
  dx
}
