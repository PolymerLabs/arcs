load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_gen",
    "arcs_kt_jvm_test_suite",
    "arcs_kt_library",
)

licenses(["notice"])

arcs_kt_gen(
    name = "var_generation",
    srcs = ["variable.arcs"],
)

arcs_kt_library(
    name = "shop_particles",
    srcs = [
        "Consumer.kt",
        "OrderIngestion.kt",
        "SkuRedactor.kt",
    ],
    deps = [
        ":var_generation",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)

arcs_kt_jvm_test_suite(
    name = "variable-tests",
    srcs = glob(["*Test.kt"]),
    package = "arcs.showcase.typevariables",
    deps = [
        ":shop_particles",
        ":var_generation",
        "//java/arcs/core/allocator",  # buildcleaner: keep
        "//java/arcs/core/common",
        "//java/arcs/core/crdt",
        "//java/arcs/core/data",
        "//java/arcs/core/data/util:data-util",
        "//java/arcs/core/entity",
        "//java/arcs/core/host",
        "//java/arcs/core/storage",
        "//java/arcs/core/storage/api",
        "//java/arcs/core/storage/driver",
        "//java/arcs/core/storage/driver/testutil",
        "//java/arcs/core/storage/keys",
        "//java/arcs/core/storage/referencemode",
        "//java/arcs/core/storage/testutil",
        "//java/arcs/core/testutil",
        "//java/arcs/core/util",
        "//java/arcs/core/util/testutil",
        "//java/arcs/jvm/host",
        "//java/arcs/jvm/util/testutil",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlin:kotlin_test",
        "//third_party/kotlin/kotlinx_coroutines",
        "//third_party/kotlin/kotlinx_coroutines:kotlinx_coroutines_test",
    ],
)
