load("@npm_bazel_typescript//:index.bzl", "ts_library")

ts_library(
    name = "platform",
    runtime = "nodejs",
    strict_checks = False,
    srcs = glob(
        ["*.ts"],
        exclude = [
            "crypto-node.ts",
            "devtools-*",
            "tf-node.ts",
            "pouch*",
            "protobuf*",
            ]
    ),
)
