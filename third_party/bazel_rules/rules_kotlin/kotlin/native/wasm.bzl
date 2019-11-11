# Alias wasm split transition rule unless G3 Kotlin Native synced with GH rules
def wasm_kt_binary(name, kt_target):
    native.alias(name = name, actual = kt_target, visibility = ["//visibility:public"])
