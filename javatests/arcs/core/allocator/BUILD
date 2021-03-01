load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_library",
    "arcs_kt_jvm_test_suite",
)

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

arcs_kt_jvm_test_suite(
    name = "allocator",
    size = "large",
    srcs = glob(["*Test.kt"]),
    package = "arcs.core.allocator",
    deps = [
        ":allocator-test-util",
        "//java/arcs/core/allocator",
        "//java/arcs/core/common",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data/builder",
        "//java/arcs/core/data/testutil:generators",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/host/testutil:generators",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/util/testutil",
        "//javatests/arcs/core/host:particle",
        "//javatests/arcs/core/host:plans",
        "//javatests/arcs/core/host:pure-particles-jvm-kt",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_library(
    name = "allocator-test-util",
    testonly = 1,
    srcs = [
        "AllocatorInvariants.kt",
        "AllocatorTestBase.kt",
        "AllocatorLifecycleTestBase.kt",
        "AllocatorIntegrationTestBase.kt",
        "AllocatorTestFramework.kt",
    ],
    deps = [
        "//java/arcs/core/allocator",  # buildcleaner: keep
        "//java/arcs/core/common",
        "//java/arcs/core/data",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver:ramdisk",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//java/arcs/sdk",
        "//javatests/arcs/core/host:particle",
        "//javatests/arcs/core/host:plans",
        "//javatests/arcs/core/host:schemas",
        "//javatests/arcs/core/host:testhost",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
    ],
)
