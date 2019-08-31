
package(default_visibility = ["//java/arcs:__subpackages__",
                              "//javatests/arcs:__subpackages__"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library")

android_library(
  name = "impl",
  srcs = glob(["**/*.java"]),
  javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
  deps = [
      "//java/arcs/api",
      "@com_google_dagger",
      "@javax_inject_source//jar",
      "//java/arcs/builtinparticles",
      "@flogger//jar",
      "@flogger_system_backend//jar",
   ],
   manifest = "AndroidManifest.xml",
   resource_files = glob(["res/**"]),

)

android_binary(
    name = "app",
    manifest = "AndroidManifest.xml",
    deps = [":impl"],
    dexopts = ["--min-sdk-version=24", "--target-sdk-version=26"],
)


