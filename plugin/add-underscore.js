import path from 'path'
import { hasUnderscore } from './has-underscore'

export const addUnderscore = file => {
  if (!hasUnderscore(file)) {
    file = path.join(path.dirname(file), `_${path.basename(file)}`)
  }
  return file
}
