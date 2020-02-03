load("//tools/build_defs/kotlin:rules.bzl", "kt_android_library")

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# Note: this needs to be kt_android_library because internally, the `kt_jvm_library` doesn't
# appreciate mockito_kotlin-android being used, and we need the android variant here because the
# junit test suite macro builds kt_android_libraries
kt_android_library(
    name = "testutil",
    testonly = True,
    srcs = glob(["*.kt"]),
    deps = [
        "//java/arcs/core/crdt/internal",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/util",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
