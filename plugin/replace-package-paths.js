export function replacePackagePaths(content) {
  const regex = /@import\s+(['"])(\{.+})\/(.+)(['"])/gi

  return replaceRelativePaths(content).replace(
    regex,
    (_, quote1, match, rest, quote2) =>
      `@import ${quote1}${encodePath(match)}/${encodePath(rest)}${quote2}`,
  )
}

export function replaceRelativePaths(content) {
  const regex = /@import\s+(['"])(.+)(['"])/gi

  return content.replace(
    regex,
    (_, quote1, match, quote2) =>
      `@import ${quote1}${encodePath(match)}${quote2}`,
  )
}

export function encodePath(path) {
  return path
    .replace(/\{/g, 'XOPENCURLYBRACKETSX')
    .replace(/}/g, 'XCLOSECURLYBRACKETSX')
    .replace(/-/g, 'XDASHX')
    .replace(/:/g, 'XCOLONX')
    .replace(/\./g, 'XDOTX')
    .replace(/_/g, 'XUNDERSCOREX')
}

export function decodePath(url) {
  return url
    .replace(/XOPENCURLYBRACKETSX/g, '{')
    .replace(/XCLOSECURLYBRACKETSX/g, '}')
    .replace(/XDASHX/g, '-')
    .replace(/XCOLONX/g, ':')
    .replace(/XDOTX/g, '.')
    .replace(/XUNDERSCOREX/g, '_')
}
