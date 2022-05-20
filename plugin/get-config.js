import { fileExists } from './file-exists'
import fs from 'fs'
import path from 'path'

/**
 * Build a path from current process working directory (i.e. meteor project
 * root) and specified file name, try to get the file and parse its content.
 * @param configFileName
 * @returns {{}}
 * @private
 */
export function getConfig(configFileName) {
  const appDir = process.env.PWD || process.cwd()

  const possiblePaths = [path.join(appDir, configFileName)]

  for (const possiblePath of possiblePaths) {
    if (fileExists(possiblePath)) {
      const content = fs.readFileSync(possiblePath, {
        encoding: 'utf8',
      })

      return JSON.parse(content)
    }
  }

  return {}
}
