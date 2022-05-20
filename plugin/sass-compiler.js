import { getRealImportPathFromIncludes } from './get-real-import-path-from-includes'
import { convertToStandardPath } from './convert-to-standard-path'
import sass from 'sass'
import { decodeFilePath } from './decode-file-path'
import {
  decodePath,
  encodePath,
  replacePackagePaths,
} from './replace-package-paths'
import { fixTilde } from './fix-tilde'
import { getRealImportPath } from './get-real-import-path'
import { hasUnderscore } from './has-underscore'

const fs = Plugin.fs
const path = Plugin.path

const rootDir = convertToStandardPath((process.env.PWD || process.cwd()) + '/')

export class SassCompiler extends MultiFileCachingCompiler {
  constructor() {
    super({
      compilerName: 'sass',
      defaultCacheSize: 1024 * 1024 * 10,
    })
  }

  getCacheKey(inputFile) {
    return inputFile.getSourceHash()
  }

  compileResultSize(compileResult) {
    return (
      compileResult.css.length + this.sourceMapSize(compileResult.sourceMap)
    )
  }

  // The heuristic is that a file is an import (ie, is not itself processed as a
  // root) if it matches _*.sass, _*.scss
  // This can be overridden in either direction via an explicit
  // `isImport` file option in api.addFiles.
  isRoot(inputFile) {
    const fileOptions = inputFile.getFileOptions()

    if ('isImport' in fileOptions) {
      return !fileOptions.isImport
    }

    const pathInPackage = inputFile.getPathInPackage()
    return !hasUnderscore(pathInPackage)
  }

  compileOneFileLater(inputFile, getResult) {
    inputFile.addStylesheet(
      {
        path: inputFile.getPathInPackage(),
      },
      async () => {
        const result = await getResult()
        return (
          result && {
            data: result.css,
            sourceMap: result.sourceMap,
          }
        )
      },
    )
  }

  compileOneFile(inputFile, allFiles) {
    const referencedImportPaths = []

    var totalImportPath = []
    var sourceMapPaths = [`.${inputFile.getDisplayPath()}`]

    const parentMap = new Map()

    //Handle import statements found by the sass compiler, used to handle cross-package imports
    const importer = function (url, prev) {
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

    const options = {
      sourceMap: true,
      sourceMapContents: true,
      sourceMapEmbed: false,
      sourceComments: false,
      omitSourceMapUrl: true,
      sourceMapRoot: '.',
      indentedSyntax: inputFile.getExtension() === 'sass',
      outFile: `.${inputFile.getBasename()}`,
      importer,
      includePaths: [],
      precision: 10,
    }

    options.file = this.getAbsoluteImportPath(inputFile)

    options.data = inputFile.getContentsAsBuffer().toString('utf8')

    options.data = replacePackagePaths(options.data)

    // If the file is empty, options.data is an empty string
    // In that case options.file will be used by node-sass,
    // which it can not read since it will contain a meteor package or app reference '{}'
    // This is one workaround, another one would be to not set options.file, in which case the importer 'prev' will be 'stdin'
    // However, this would result in problems if a file named stdín.scss would exist.
    // Not the most elegant of solutions, but it works.
    if (!options.data.trim()) {
      options.data = '$fakevariable_ae7bslvbp2yqlfba : blue;'
    }

    let output

    try {
      output = sass.renderSync(options)
    } catch (e) {
      inputFile.error({
        message: `SASS Compiler Error: ${e.formatted}\n`,
        sourcePath: inputFile.getDisplayPath(),
      })
      console.error(e)
      return null
    }
    //End compile sass

    //Start fix sourcemap references
    if (output.map) {
      const map = JSON.parse(output.map.toString('utf-8'))
      map.sources = sourceMapPaths
      output.map = map
    }
    //End fix sourcemap references

    const compileResult = {
      css: output.css.toString('utf-8'),
      sourceMap: output.map,
    }
    return { compileResult, referencedImportPaths }
  }

  addCompileResult(inputFile, compileResult) {
    inputFile.addStylesheet({
      data: compileResult.css,
      path: `${inputFile.getPathInPackage()}.css`,
      sourceMap: compileResult.sourceMap,
    })
  }
}
