import { nodeResolve } from '@rollup/plugin-node-resolve'

export default [
  {
    input: './build/examples/index.js',
    output: {
      dir: './dist'
    },
    plugins: [
      nodeResolve({
        preferBuiltins: true
      })
    ]
  },
  {
    input: './build/examples/index2.js',
    output: {
      dir: './dist'
    },
    plugins: [
      nodeResolve({
        preferBuiltins: true
      })
    ]
  }
]
