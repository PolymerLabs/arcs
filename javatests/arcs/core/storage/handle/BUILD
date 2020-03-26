load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

TEST_SRCS = glob(["*Test.kt"])

arcs_kt_jvm_library(
    name = "testbase",
    testonly = 1,
    srcs = ["HandleManagerTestBase.kt"],
    visibility = ["//visibility:public"],
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_test_suite(
    name = "handle",
    srcs = TEST_SRCS,
    package = "arcs.core.storage.handle",
    deps = [
        ":testbase",
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/handle",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/util/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/mockito:mockito-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin:mockito_kotlin-android",
    ],
)
