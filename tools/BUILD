load("//build_defs:run_in_repo.bzl", "run_in_repo")

licenses(["notice"])

filegroup(
    name = "tools_srcs",
    srcs = glob(["**"], exclude = ["sigh"]),
    visibility = ["//visibility:public"],
)

filegroup(
    name = "sigh_bin",
    srcs = (["sigh"]),
    visibility = ["//visibility:public"],
)

# Runs sigh 'webpack' command.
run_in_repo(
    name = "sigh_webpack",
    srcs = ["//src:core_srcs"],
    outs = ["worker.js"],
    # Run webpack, then copy the output to the location bazel expects it to be.
    cmd = "$(location //tools:sigh_bin) webpack && cp $PWD/shells/lib/build/worker.js {OUT}",
    progress_message = "Webpacking Arcs runtime",
    visibility = ["//visibility:public"],
    deps = ["//tools:sigh_bin",
            "//tools",
            "@npm//:node_modules",
            "//:tsconfig"],
)
