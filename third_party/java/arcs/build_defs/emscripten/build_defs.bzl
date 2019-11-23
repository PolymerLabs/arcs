load("//build_defs/emscripten:build_defs.bzl", _cc_wasm_binary = "cc_wasm_binary", _cc_wasm_library = "cc_wasm_library")

# In g3, this will use cc_binary + auto_wasm
def cc_wasm_binary(**kwargs):
    _cc_wasm_binary(**kwargs)

# In g3, this will use cc_library
def cc_wasm_library(**kwargs):
    _cc_wasm_library(**kwargs)
