import { convertToStandardPath } from './convert-to-standard-path'
import sass from 'sass'
import { replacePackagePaths } from './replace-package-paths'
import { hasUnderscore } from './has-underscore'
import { createImporter } from './create-importer'

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

    const sourceMapPaths = [`.${inputFile.getDisplayPath()}`]

    const importer = createImporter({
      rootDir,
      allFiles,
      inputFile,
      referencedImportPaths,
      sourceMapPaths,
    })

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
