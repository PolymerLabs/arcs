load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "host",
    srcs = glob(["*Test.kt"]),
    package = "arcs.jvm.host",
    deps = [
        "//java/arcs/core/allocator",
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/host/api",
        "//java/arcs/core/storage:storage-kt",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/testutil/handles",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//javatests/arcs/core/host:particle",
        "//javatests/arcs/core/host:testhost",
        "//javatests/arcs/core/host:testhostbase",
        "//third_party/java/junit",
        "//third_party/java/mockito",
        "//third_party/java/truth",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
        "//third_party/kotlin/mockito_kotlin",
    ],
)
