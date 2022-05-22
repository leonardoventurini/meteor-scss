import { assert } from 'chai'

function getStyle(element, property) {
  const compStyles = getComputedStyle(element)

  return compStyles[property]
}

describe('Meteor Sass', () => {
  it('should import correctly', function () {
    const div = document.createElement('div')

    document.body.appendChild(div)

    const prefixes = ['scss']

    try {
      const test = function (className, style) {
        prefixes.forEach(function (prefix) {
          div.className = prefix + '-' + className

          // Read 'border-top-style' instead of 'border-style' (which is set
          // by the stylesheet) because only the individual styles are computed
          // and can be retrieved. Trying to read the synthetic 'border-style'
          // gives an empty string.
          assert.equal(getStyle(div, 'borderTopStyle'), style, div.className)
        })
      }
      test('el1', 'dotted')
      test('el2', 'dashed')
      test('el3', 'solid')
      test('el4', 'double')
      test('el5', 'groove')
      test('el6', 'inset')

      // This is assigned to 'ridge' in not-included.s(a|c)ss, which is ... not
      // included. So that's why it should be 'none'.  (This tests that we don't
      // process non-main files.)
      test('el0', 'none')
    } finally {
      document.body.removeChild(div)
    }
  })

  it('should import from included paths correctly', function () {
    const div = document.createElement('div')

    document.body.appendChild(div)

    try {
      div.className = 'from-include-paths'

      assert.equal(getStyle(div, 'borderBottomStyle'), 'outset', div.className)
    } finally {
      document.body.removeChild(div)
    }
  })
})
