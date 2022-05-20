import { getConfig } from './get-config'

import path from 'path'

const { includePaths } = getConfig('scss-config.json')

const _includePaths = Array.isArray(includePaths) ? includePaths : []

export function getRealImportPathFromIncludes(importPath, getRealImportPathFn) {
  let possibleFilePath, foundFile

  for (let includePath of _includePaths) {
    possibleFilePath = path.join(includePath, importPath)
    foundFile = getRealImportPathFn(possibleFilePath)

    if (foundFile) {
      return foundFile
    }
  }

  return null
}
