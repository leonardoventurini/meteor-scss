import { convertToStandardPath } from './convert-to-standard-path'
import { decodePath, encodePath } from './replace-package-paths'
import { fixTilde } from './fix-tilde'
import { getRealImportPath } from './get-real-import-path'
import { getRealImportPathFromIncludes } from './get-real-import-path-from-includes'
import { decodeFilePath } from './decode-file-path'
import path from 'path'
import fs from 'fs'

//Handle import statements found by the sass compiler, used to handle cross-package imports
export const createImporter = ({
  rootDir,
  inputFile,
  allFiles,
  sourceMapPaths,
  referencedImportPaths,
}) => {
  const parentMap = new Map()
  const totalImportPath = []

  return (url, prev) => {
    prev = convertToStandardPath(decodePath(prev))
    prev = fixTilde(prev)

    if (!totalImportPath.length) {
      totalImportPath.push(prev)
    }

    if (prev !== undefined) {
      // iterate backwards over totalImportPath and remove paths that don't equal the prev url
      for (let i = totalImportPath.length - 1; i >= 0; i--) {
        // check if importPath contains prev, if it doesn't, remove it. Up until we find a path that does contain it
        if (totalImportPath[i] === prev) {
          break
        } else {
          // remove last item (which has to be item i because we are iterating backwards)
          totalImportPath.splice(i, 1)
        }
      }
    }

    let importPath = convertToStandardPath(decodePath(url))

    importPath = fixTilde(importPath)

    for (let i = totalImportPath.length - 1; i >= 0; i--) {
      if (importPath.startsWith('/') || importPath.startsWith('{')) {
        break
      }
      // 'path' is the nodejs path module
      importPath = path.join(path.dirname(totalImportPath[i]), importPath)
    }

    let accPosition = importPath.indexOf('{')

    if (accPosition > -1) {
      importPath = importPath.substr(accPosition, importPath.length)
    }

    // TODO: This fix works.. BUT if you edit the scss/css file it doesn't recompile! Probably because of the absolute path problem
    if (importPath.startsWith('{')) {
      // replace {}/node_modules/ for rootDir + "node_modules/"
      importPath = importPath.replace(
        /^(\{\}\/node_modules\/)/,
        rootDir + 'node_modules/',
      )
      // importPath = importPath.replace('{}/node_modules/', rootDir + "node_modules/");
      if (importPath.endsWith('.css')) {
        // .css files aren't in allFiles. Replace {}/ for absolute path.
        importPath = importPath.replace(/^(\{\}\/)/, rootDir)
      }
    }

    const _getRealImportPath = getRealImportPath(
      inputFile,
      totalImportPath,
      allFiles,
    )

    try {
      let parsed = _getRealImportPath(importPath)

      if (!parsed) {
        parsed = getRealImportPathFromIncludes(
          decodePath(url),
          _getRealImportPath,
        )
      }

      if (parsed) parentMap.set(parsed.path, prev)

      if (!parsed) {
        //Nothing found...
        throw new Error(`File to import: ${url} not found in file: ${prev}`)
      }

      totalImportPath.push(parsed.path)

      if (parsed.absolute) {
        sourceMapPaths.push(parsed.path)
        return {
          contents: fs.readFileSync(parsed.path, 'utf8'),
          file: encodePath(parsed.path),
        }
      } else {
        referencedImportPaths.push(parsed.path)
        sourceMapPaths.push(decodeFilePath(parsed.path))
        return {
          contents: allFiles.get(parsed.path).getContentsAsString(),
          file: encodePath(parsed.path),
        }
      }
    } catch (e) {
      return e
    }
  }
}
