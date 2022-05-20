export const fixTilde = function (thePath) {
  let newPath = thePath
  // replace ~ with {}/....
  if (newPath.startsWith('~')) {
    newPath = newPath.replace('~', '{}/node_modules/')
  }

  // add {}/ if starts with node_modules
  if (!newPath.startsWith('{')) {
    if (newPath.startsWith('node_modules')) {
      newPath = '{}/' + newPath
    }
    if (newPath.startsWith('/node_modules')) {
      newPath = '{}' + newPath
    }
  }

  return newPath
}
