const fs = Plugin.fs

export function fileExists(file) {
  if (fs.statSync) {
    try {
      fs.statSync(file)
    } catch (e) {
      return false
    }
    return true
  } else if (fs.existsSync) {
    return fs.existsSync(file)
  }
}
