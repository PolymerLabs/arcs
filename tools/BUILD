load("//build_defs:sigh.bzl", "sigh_command")

licenses(["notice"])

filegroup(
    name = "tools_srcs",
    srcs = glob(
        ["**"],
        exclude = ["sigh"],
    ),
    visibility = ["//visibility:public"],
)

filegroup(
    name = "sigh_bin",
    srcs = (["sigh"]),
    visibility = ["//visibility:public"],
)

# Runs sigh 'webpack' command.
sigh_command(
    name = "sigh_webpack",
    srcs = ["//:all_srcs"],
    outs = ["worker.js"],
    progress_message = "Webpacking Arcs runtime",
    # Run webpack, then copy the output to the location bazel expects it to be.
    sigh_cmd = "webpack && cp $PWD/shells/lib/build/worker.js {OUT}",
    visibility = ["//visibility:public"],
)
