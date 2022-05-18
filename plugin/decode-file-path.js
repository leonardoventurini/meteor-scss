export function decodeFilePath(filePath) {
  const match = filePath.match(/{(.*)}\/(.*)$/)

  if (!match) {
    throw new Error(`Failed to decode sass path: ${filePath}`)
  }

  if (match[1] === '') {
    // app
    return match[2]
  }

  return `packages/${match[1]}/${match[2]}`
}
