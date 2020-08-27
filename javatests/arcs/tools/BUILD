load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_jvm_test_suite",
    "arcs_manifest",
)

licenses(["notice"])

package(default_visibility = ["//visibility:public"])

# Test case for policy_test, which exercises the policy_test BUILD rules and
# the VerifyPolicy binary.
arcs_manifest(
    name = "policy_testcase",
    srcs = ["policy_testcase.arcs"],
    policy_test = True,
)

arcs_kt_jvm_test_suite(
    name = "tools",
    srcs = glob(["*Test.kt"]),
    package = "arcs.tools",
    deps = [
        "//java/arcs/core/data",
        "//java/arcs/core/data:schema_fields",
        "//java/arcs/core/testutil",
        "//java/arcs/tools:recipe2plan_lib",
        "//third_party/java/junit:junit-android",
        "//third_party/java/truth:truth-android",
        "//third_party/kotlin/kotlinpoet",
    ],
)
