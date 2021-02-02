load("//third_party/java/arcs/build_defs/internal:kotlin.bzl", "arcs_kt_jvm_library")

licenses(["notice"])

package(default_visibility = ["//java/arcs:allowed-packages"])

FAKE_DRIVER_PROVIDER_SRCS = [
    "FakeDriverProvider.kt",
    "FakeDriver.kt",
]

arcs_kt_jvm_library(
    name = "testutil",
    testonly = True,
    srcs = glob(
        ["*.kt"],
        exclude = FAKE_DRIVER_PROVIDER_SRCS,
    ),
    deps = [
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data:data-kt",
        "//java/arcs/core/data:rawentity",
        "//java/arcs/core/entity",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
        "//java/arcs/core/storage:writeback",
        "//java/arcs/core/storage/driver:driver_providers",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/type",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_library(
    name = "fake_driver_provider",
    testonly = True,
    srcs = FAKE_DRIVER_PROVIDER_SRCS,
    deps = [
        "//java/arcs/core/crdt",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage:storage_key",
    ],
)
