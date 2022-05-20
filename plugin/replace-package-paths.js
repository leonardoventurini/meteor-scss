export function replacePackagePaths(content) {
  const regex = /@import\s+(['"])\{(.+)}\//gi

  return content.replace(
    regex,
    (_, quote, match) => `@import ${quote}/packages/${match}/`,
  )
}
