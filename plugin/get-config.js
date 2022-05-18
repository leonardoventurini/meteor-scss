import { fileExists } from './file-exists'

const fs = Plugin.fs
const path = Plugin.path

/**
 * Build a path from current process working directory (i.e. meteor project
 * root) and specified file name, try to get the file and parse its content.
 * @param configFileName
 * @returns {{}}
 * @private
 */
export function getConfig(configFileName) {
  const appdir = process.env.PWD || process.cwd()
  const custom_config_filename = path.join(appdir, configFileName)
  let userConfig = {}

  if (fileExists(custom_config_filename)) {
    userConfig = fs.readFileSync(custom_config_filename, {
      encoding: 'utf8',
    })
    userConfig = JSON.parse(userConfig)
  } else {
    //console.warn('Could not find configuration file at ' + custom_config_filename);
  }
  return userConfig
}
