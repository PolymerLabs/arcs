load("@npm_bazel_typescript//:index.bzl", "ts_library")
load("@npm_bazel_rollup//:index.bzl", "rollup_bundle")


package(default_visibility = ["//visibility:public"])


ts_library(
    name = "runtime_lib",
    srcs = glob(
        ["**/*.ts"],
        exclude = [
            # Breaks due to node openssl dependency
            "platform/crypto-node.ts",
            # Broken from lack of DTS files
            "platform/devtools-*",
            "**/devtools/**",
            "**/devtools-connector/**",

            # Broken from TF downstream dependency
            "platform/tf-node.ts",

            # Broken because no targets in google3
            "platform/pouch*",

            # Exclude test code
            "**/storageNG/testing/**",
            "**/tests/**",
            "**/time/tests/**",
            "**/manual_tests/**",
            "**/test/**",
            "**/keymgmt/testing/**",
            "**/firebase*",
            "**/testing/test-helper.ts",
            "planning/testing/**",
            "runtime/testing/callback-tracker.ts",

            # Exclude services for now (e.g. ML)
            "**/services/**",

            # Exclude wasm stuff <-- Maybe we need this?
            "**/webassembly.d.ts",

            # Exclude tools
            "**/tools/**",
            "**/cli/**",

            # Exclude server code
            "**/keymgmt/webcrypto.ts",
            "**/keymgmt/manager.ts",
            "**/webmain.ts",

            # Exclude until import is fixed by copybara (unused?)
            "platform/protobuf*",
        ],
    ),  # + [":gen/runtime/manifest-parser.ts"],
    runtime = "nodejs",
    tsconfig = "//:tsconfig",
    deps = [
        "@npm//chai"
    ]
)


rollup_bundle(
    name = "runtime",
    srcs = glob(["platform/*.js"]) + [
        "modalities/dom/components/xen/xen-state.js",
        "modalities/dom/components/xen/xen-template.js",
    ],
    deps = [":runtime_lib"],
    entry_point = ":runtime/runtime.ts",
)
