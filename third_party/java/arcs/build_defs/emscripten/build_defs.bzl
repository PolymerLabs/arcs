load("//build_defs/emscripten:build_defs.bzl", _cc_wasm_binary = "cc_wasm_binary", _cc_wasm_library = "cc_wasm_library")

# In g3, this will use cc_binary + auto_wasm
def cc_wasm_binary(tags = [], **kwargs):
    _cc_wasm_binary(tags = ["emscripten"] + tags, **kwargs)

# In g3, this will use cc_library
def cc_wasm_library(tags = [], **kwargs):
    _cc_wasm_library(tags = ["emscripten"] + tags, **kwargs)
