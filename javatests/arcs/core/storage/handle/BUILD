load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_jvm_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_android_test_suite(
    name = "handle",
    srcs = TEST_SRCS,
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.storage.handle",
    deps = [
        ":fakes",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage/handle",
        "//javatests/arcs/core/storage",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)

arcs_kt_jvm_library(
    name = "fakes",
    srcs = glob(
        ["*.kt"],
        exclude = TEST_SRCS,
    ),
    deps = [
        "//java/arcs/core/common",
    ],
)
