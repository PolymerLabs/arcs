load("//build_defs/kotlin-native:repo.bzl", "MACOS_DEPENDENCIES")

KtNativeInfo = provider(
    doc = "The minimum info about a Kotlin/Native dependency",
    fields = dict(
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
    "-nodefaultlibs",
]

def _collect_deps(srcs, deps):
    """Builds depsets out of srcs and deps."""
    srcs_depset = depset(srcs)
    klib_depset = depset(
        transitive = [dep[KtNativeInfo].klibraries for dep in deps],
    )
    return srcs_depset,  klib_depset

def _kt_wasm_binary(ctx):
    args = ctx.actions.args()

    # Pass dependencies to wrapper script
    args.add(",".join([x for x, _ in MACOS_DEPENDENCIES]))

    args.add_all(_kotlinc_args)

    args.add("-o", ctx.outputs.wasm.path.rstrip(".wasm"))

    srcs_deps, klibs = _collect_deps(
        srcs = ctx.files.srcs,
        deps = ctx.attr.deps,
    )

    args.add_all(klibs, before_each = "-l")

    args.add_all(ctx.files.srcs)

    ctx.actions.run(
        progress_message = "Compiling Kotlin to WebAssembly: %s" % ctx.label.name,
        inputs = depset(transitive = [srcs_deps, klibs]),
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


def _kt_wasm_library(ctx):
    args = ctx.actions.args()

    # Pass dependencies to wrapper script
    args.add(",".join([x for x, _ in MACOS_DEPENDENCIES]))

    args.add_all(_kotlinc_args)

    args.add("-produce", "library")

    args.add("-o", ctx.outputs.klib.path.rstrip(".klib"))

    srcs_deps, klibs = _collect_deps(
        srcs = ctx.files.srcs,
        deps = ctx.attr.deps,
    )

    args.add_all(klibs, before_each = "-l")

    args.add_all(ctx.files.srcs)

    ctx.actions.run(
        progress_message = "Building a Koltin Library with WebAssebly target: %s" % ctx.label.name,
        inputs = depset(transitive = [srcs_deps, klibs]),
        outputs = [ctx.outputs.klib],
        arguments = [args],
        executable = ctx.executable.kotlinc_wrapper,
    )

    return [KtNativeInfo(klibraries = depset(order = "preorder", direct = [ctx.outputs.klib], transitive = [klibs]))]

kt_wasm_library = rule(
    implementation = _kt_wasm_library,
    outputs = {
        "klib": "%{name}.klib"
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
    doc = "Builds a Wasm library (klib) from Kotlin files",
)
