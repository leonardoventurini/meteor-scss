const { merge } = require('lodash')

module.exports = merge(require('@tstt/eslint-config/index.js'), {
  globals: { Meteor: 'readonly' },
  rules: {
    'no-shadow': 'error',
  },
})
