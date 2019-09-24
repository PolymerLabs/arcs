load("//build_defs/kotlin_native:repo.bzl", "get_dependencies")

KtNativeInfo = provider(
    doc = "The minimum info about a Kotlin/Native dependency",
    fields = dict(
        klibraries = "Depset of klib files to compile against.",
    ),
)

def _common_args(ctx, klibs):
    args = ctx.actions.args()

    # Pass dependencies for all platforms to wrapper script
    args.add("|".join([",".join([name for name, _ in get_dependencies(target)])
                      for target in ["windows", "macos", "linux"]]))

    # Arguments for kotlinc
    args.add_all([
                 "-target",
                 "wasm32",
                 # Enable optimizations in the compilation
                 "-opt",
                 # Don't link the libraries from the dist/klib automatically
                 "-nodefaultlibs",
                 ])

    args.add_all(klibs, before_each = "-l")

    args.add_all(ctx.files.srcs)

    return args

def _collect_deps(srcs, deps):
    """Builds depsets out of srcs and deps."""
    srcs_depset = depset(srcs)
    klib_depset = depset(
        transitive = [dep[KtNativeInfo].klibraries for dep in deps],
    )
    return srcs_depset,  klib_depset

def _kt_wasm_binary(ctx):
    srcs_deps, klibs = _collect_deps(
        srcs = ctx.files.srcs,
        deps = ctx.attr.deps,
    )

    args = _common_args(ctx, klibs)

    if ctx.attr.entry_point:
        args.add("-e", ctx.attr.entry_point)

    args.add("-o", ctx.outputs.wasm.path.replace(".wasm", ""))

    ctx.actions.run(
        progress_message = "Compiling Kotlin to WebAssembly: %s" % ctx.label.name,
        inputs = depset(transitive = [srcs_deps, klibs]),
        outputs = [ctx.outputs.wasm, ctx.outputs.js],
        arguments = [args],
        executable = ctx.executable.kotlinc_wrapper,
    )

kt_wasm_binary = rule(
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            allow_empty = True,
        ),
        "deps": attr.label_list(providers = [KtNativeInfo]),
        "kotlinc_wrapper": attr.label(
            default = Label("//build_defs/kotlin_native:kotlinc_wrapper"),
            executable = True,
            cfg = "host",
        ),
        "entry_point": attr.string(
            doc = "Specify the entrypoint (path to main function) for the binary. For example, `arcs.main`."
        )
    },
    doc = "Builds a Wasm binary from Kotlin",
    outputs = {
        "wasm": "%{name}.wasm",
        "js": "%{name}.wasm.js",
    },
    implementation = _kt_wasm_binary,
)

def _kt_wasm_library(ctx):
    srcs_deps, klibs = _collect_deps(
        srcs = ctx.files.srcs,
        deps = ctx.attr.deps,
    )

    args = _common_args(ctx, klibs)

    args.add("-produce", "library")

    args.add("-o", ctx.outputs.klib.path.replace(".klib", ""))

    ctx.actions.run(
        progress_message = "Building a Kotlin Library with WebAssembly target: %s" % ctx.label.name,
        inputs = depset(transitive = [srcs_deps, klibs]),
        outputs = [ctx.outputs.klib],
        arguments = [args],
        executable = ctx.executable.kotlinc_wrapper,
    )

    return [KtNativeInfo(klibraries = depset(order = "preorder", direct = [ctx.outputs.klib], transitive = [klibs]))]

kt_wasm_library = rule(
    attrs = {
        "srcs": attr.label_list(
            allow_files = True,
            allow_empty = True,
        ),
        "deps": attr.label_list(providers = [KtNativeInfo]),
        "kotlinc_wrapper": attr.label(
            default = Label("//build_defs/kotlin_native:kotlinc_wrapper"),
            executable = True,
            cfg = "host",
        ),
    },
    doc = "Builds a Wasm library (klib) from Kotlin files",
    outputs = {
        "klib": "%{name}.klib",
    },
    implementation = _kt_wasm_library,
)
