# Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
# This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
# The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
# The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
# Code distributed by Google as part of the polymer project is also
# subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt

licenses(["notice"])  # Apache v2.0

package(
    default_visibility = ["//visibility:public"],
)

load(
    "@com_google_asylo//asylo/bazel:asylo.bzl",
    "enclave_loader",
    "sim_enclave",
)
load("@com_google_asylo//asylo/bazel:proto.bzl", "asylo_proto_library")

# Example and exercise for using Asylo toolkits.
asylo_proto_library(
    name = "arcs_asylo_proto",
    srcs = ["arcs_asylo.proto"],
    deps = ["@com_google_asylo//asylo:enclave_proto"],
)

sim_enclave(
    name = "arcs_asylo_enclave",
    srcs = ["arcs_asylo_enclave.cc"],
    deps = [
        ":arcs_asylo_proto_cc",
        "@com_google_absl//absl/strings",
        "@com_google_asylo//asylo:enclave_runtime",
        "@com_google_asylo//asylo/crypto:aes_gcm_siv",
        "@com_google_asylo//asylo/util:cleansing_types",
        "@com_google_asylo//asylo/util:status",
    ],
)

enclave_loader(
    name = "arcs_enclave",
    srcs = ["arcs_asylo_driver.cc"],
    enclaves = {"enclave": ":arcs_asylo_enclave"},
    loader_args = ["--enclave_path='{enclave}'"],
    deps = [
        ":arcs_asylo_proto_cc",
        "@com_github_gflags_gflags//:gflags_nothreads",
        "@com_google_asylo//asylo:enclave_client",
        "@com_google_asylo//asylo/util:logging",
    ],
)
