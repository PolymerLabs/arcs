load("//build_defs/kotlin-native:repo.bzl", "MACOS_DEPENDENCIES")

KtNativeInfo = provider(
    doc = "The minimum info about a Kotlin/Native dependency",
    fields = dict(
        cinterop_info = "Optional KtNativeCInteropInfo provider",
        exported_klibraries = "A subset of klibraries that should be exported when linking.",
        klibraries = "Depset of klib files to compile against.",
    ),
)

# Arguments for kotlinc
_kotlinc_args = [
    "-target",
    "wasm32",
    # Enable optimizations in the compilation
    "-opt",
    # Don't link the libraries from the dist/klib automatically
    "-nodefaultlibs"

]

def _collect_deps(srcs, deps):
    """Builds depsets out of srcs and deps."""
    exported_klib_depset = depset(
        srcs,
        transitive = [dep[KtNativeInfo].exported_klibraries for dep in deps],
    )
    klib_depset = depset(
        srcs,
        transitive = [dep[KtNativeInfo].klibraries for dep in deps],
    )
    return exported_klib_depset, klib_depset

def _kt_wasm_binary(ctx):
    args = ctx.actions.args()

    # Pass dependencies to wrapper script
    args.add(",".join([x for x, _ in MACOS_DEPENDENCIES]))

    args.add_all(_kotlinc_args)

    args.add("-o", ctx.outputs.wasm.path.rstrip(".wasm"))

    linkable_klibs, klibs = _collect_deps(
        srcs = ctx.files.srcs,
        deps = ctx.attr.deps,
    )

    args.add_all(linkable_klibs)

    ctx.actions.run(
        progress_message = "Compiling Kotlin to WebAssembly: %s" % ctx.label.name,
        inputs = depset(transitive = [linkable_klibs, klibs]),
        outputs = [ctx.outputs.wasm, ctx.outputs.js],
        arguments = [args],
        executable = ctx.executable.kotlinc_wrapper,
    )


kt_wasm_binary = rule(
    implementation = _kt_wasm_binary,
    outputs = {
       "wasm": "%{name}.wasm",
       "js": "%{name}.wasm.js",
    },
    attrs = {
        "srcs": attr.label_list(allow_files = True, allow_empty = True),
        "deps": attr.label_list(providers = [KtNativeInfo]),
        "kotlinc_wrapper": attr.label(
            default = Label("//build_defs/kotlin-native:kotlinc_wrapper"),
            executable = True,
            cfg = "host",
        ),
    },
    doc = "Builds a Wasm binary from Kotlin",
)

