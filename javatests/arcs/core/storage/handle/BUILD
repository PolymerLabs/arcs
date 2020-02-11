load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
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
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//javatests/arcs/core/storage",  # unuseddeps: keep
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
