# cat >build/cjs/package.json <<!EOF
# {
#     "type": "commonjs",
#     "main": "./index.js",
#     "browser": "./index.js"
# }
# !EOF

# cat >build/esm/package.json <<!EOF
# {
#     "type": "module",
#     "main": "./index.mjs",
#     "browser": "./index.mjs"
# }
# !EOF