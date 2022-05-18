import { SassCompiler } from './sass-compiler'

Plugin.registerCompiler(
  {
    extensions: ['scss', 'sass'],
    archMatching: 'web',
  },
  () => new SassCompiler(),
)
