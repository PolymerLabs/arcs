# Rules for compiling C++ to wasm using Emscripten.

WasmLibInfo = provider(fields = [
    "srcs",
    "hdrs",
])

WasmBinInfo = provider(fields = [
    "wasm",
])

# Default arguments to use when compiling wasm binaries with Emscripten.
# Additional context-specific args will be added in the cc_wasm_binary rule
# below.
_emscripten_args = [
    "em++",
    "-std=c++17",
    "-Os",
    "-s",
    "EXPORTED_FUNCTIONS=['_malloc','_free']",
    "-s",
    "EMIT_EMSCRIPTEN_METADATA",
    # For workspace-relative #includes:
    "-I",
    ".",
]

def _collect_deps(srcs, hdrs, deps):
    """Builds depsets out of the given srcs, hdrs and deps."""
    src_depset = depset(
        srcs,
        transitive = [dep[WasmLibInfo].srcs for dep in deps],
    )
    hdr_depset = depset(
        hdrs,
        transitive = [dep[WasmLibInfo].hdrs for dep in deps],
    )
    return src_depset, hdr_depset

def _cc_wasm_binary(ctx):
    args = ctx.actions.args()
    args.add_all(_emscripten_args)

    # For generated #includes.
    args.add("-I", ctx.genfiles_dir.path)

    # Output a wasm file.
    args.add("-o", ctx.outputs.wasm)

    # Inputs
    srcs, hdrs = _collect_deps(
        srcs = ctx.files.srcs,
        hdrs = ctx.files.hdrs,
        deps = ctx.attr.deps,
    )

    args.add_all(srcs)

    ctx.actions.run(
        progress_message = "Compiling C++ to WebAssembly: %s" % ctx.label.name,
        inputs = depset(transitive = [srcs, hdrs]),
        outputs = [ctx.outputs.wasm],
        arguments = [args],
        executable = ctx.executable.emsdk_wrapper,
    )

    return [WasmBinInfo(wasm = ctx.outputs.wasm)]

cc_wasm_binary = rule(
    implementation = _cc_wasm_binary,
    outputs = {
        "wasm": "%{name}.wasm",
    },
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "hdrs": attr.label_list(allow_files = True),
        "deps": attr.label_list(providers = [WasmLibInfo]),
        "emsdk_wrapper": attr.label(
            default = Label("//build_defs/emscripten:emsdk_wrapper"),
            executable = True,
            cfg = "host",
        ),
    },
    doc = "Builds a wasm binary from C++",
)

# cc_wasm_library just collects sources and headers, it doesn't actually build
# anything.
# TODO: make this build some sort of static/dynamic library that we can link
# into the final binary.
def _cc_wasm_library(ctx):
    srcs, hdrs = _collect_deps(
        srcs = ctx.files.srcs,
        hdrs = ctx.files.hdrs,
        deps = ctx.attr.deps,
    )
    return [WasmLibInfo(srcs = srcs, hdrs = hdrs)]

cc_wasm_library = rule(
    implementation = _cc_wasm_library,
    outputs = {},
    attrs = {
        "srcs": attr.label_list(allow_files = True),
        "hdrs": attr.label_list(allow_files = True),
        "deps": attr.label_list(providers = [WasmLibInfo]),
    },
    doc = """
Just collects .cc and .h files, doesn't actually build anything. Wasm output is
only actually built by the cc_wasm_binary rule.
""",
)
