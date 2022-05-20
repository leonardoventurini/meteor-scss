import path from 'path'

export function hasUnderscore(file) {
  return path.basename(file).startsWith('_')
}
