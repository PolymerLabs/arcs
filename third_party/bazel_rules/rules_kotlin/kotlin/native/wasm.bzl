# Alias wasm split transition rule unless G3 Kotlin Native synced with GH rules
def wasm_kt_binary(name, kt_target, visibility = None):
    native.genrule(
        name = name,
        srcs = [kt_target + ".wasm", kt_target + ".wasm.js"],
        cmd = "cp $(location %s.wasm) $(@D)/%s.wasm; cp $(location %s.wasm.js) $(@D)/%s.wasm.js" % (kt_target, name, kt_target, name),
        outs = ["%s.wasm" % name, "%s.wasm.js" % name],
        tools = [kt_target],
        visibility = visibility,
    )
