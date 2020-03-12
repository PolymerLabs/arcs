load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_android_test_suite(
    name = "ttl",
    srcs = TEST_SRCS,
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.storage.ttl",
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/ttl",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/jvm/util",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
