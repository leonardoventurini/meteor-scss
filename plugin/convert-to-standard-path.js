export function convertToStandardPath(osPath) {
  if (process.platform === 'win32') {
    // return toPosixPath(osPath, partialPath);
    // p = osPath;
    // Sometimes, you can have a path like \Users\IEUser on windows, and this
    // actually means you want C:\Users\IEUser
    if (osPath[0] === '\\') {
      osPath = process.env.SystemDrive + osPath
    }

    osPath = osPath.replace(/\\/g, '/')
    if (osPath[1] === ':') {
      // transform "C:/bla/bla" to "/c/bla/bla"
      osPath = `/${osPath[0]}${osPath.slice(2)}`
    }

    return osPath
  }

  return osPath
}
