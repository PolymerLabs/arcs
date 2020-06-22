load("@npm_bazel_typescript//:index.bzl", "ts_library")
load(
  "//third_party/java/arcs/build_defs:build_defs.bzl",
  "arcs_ts_preprocessing",
  "arcs_peg_generator",
)

package(default_visibility = ["//visibility:public"])

filegroup(
    name = "parser",
    srcs = [":runtime/manifest-parser.pegjs"],
)

filegroup(
    name = "ast_nodes",
    srcs = [":runtime/manifest-ast-nodes.ts"],
)
arcs_peg_generator(
    name = "parser_gen",
    src = ":parser",
    out = "gen/runtime/manifest-parser.ts",
    ast_nodes = ":ast_nodes",
    custom_header = "import * as AstNode from \"../../runtime/manifest-ast-nodes\";\nimport {Flags} from \"../../runtime/flags.js\";\nimport {CheckType} from \"../../runtime/particle-check.js\";import {ClaimType} from \"../../runtime/particle-claim.js\";",
    module_name = "parse",
)

arcs_ts_preprocessing(
    name = "runtime_files",
    srcs = glob(
        ["**/*.ts"],
        exclude = [
            # Broken from lack of DTS files
            "platform/devtools-*",
            "**/devtools/**",
            "**/devtools-connector/**",

            # Broken from TF downstream dependency
            "platform/tf-node.ts",

            # Broken because no targets in google3
            "platform/pouch*",

            # This is actually browser based
            "platform/image-node.ts",

            # Exclude to not create conflicting Bazel actions
            "gen/**/*.ts",

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
    ) ,
)

ts_library(
    name = "runtime_lib",
    srcs = [
        ":runtime_files",
        ":parser_gen",
    ],
    runtime = "nodejs",
    tsconfig = "//:tsconfig",
    deps = [
        "@npm//@types/node",
        "@npm//chai",
        "@npm//mocha",
        "@npm//node-fetch",
        "@npm//node-webcrypto-ossl",
    ],
)
