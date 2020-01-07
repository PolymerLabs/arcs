# Alias wasm split transition rule unless G3 Kotlin Native synced with GH rules
def wasm_kt_binary(name, kt_target, visibility = None):
    # Remove the `-wasm` suffix from the name.
    suffix = "-wasm"
    outname = name if not name.endswith(suffix) else name[:-len(suffix)]
    native.genrule(
        name = name,
        srcs = [kt_target + ".wasm", kt_target + ".wasm.js"],
        cmd = "cp $(location %s.wasm) $(@D)/%s.wasm; cp $(location %s.wasm.js) $(@D)/%s.wasm.js" % (kt_target, outname, kt_target, outname),
        outs = ["%s.wasm" % outname, "%s.wasm.js" % outname],
        tools = [kt_target],
        visibility = visibility,
    )
