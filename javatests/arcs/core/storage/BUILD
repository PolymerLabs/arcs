load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_android_test_suite",
    "arcs_kt_jvm_library",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_android_test_suite(
    name = "storage",
    srcs = TEST_SRCS,
    manifest = "//java/arcs/android/common:AndroidManifest.xml",
    package = "arcs.core.storage",
    deps = [
        ":fakes",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/database",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",  # buildcleaner: keep
        "//java/arcs/core/testutil",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/storage/database/testutil",
        "//java/arcs/jvm/util/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_atomicfu",
        "//third_party/kotlin/kotlinx_coroutines",
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
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
