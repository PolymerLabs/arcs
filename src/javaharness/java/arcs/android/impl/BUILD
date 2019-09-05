
package(default_visibility = ["//java/arcs:__subpackages__",
                              "//javatests/arcs:__subpackages__"])

licenses(["notice"])

load("@build_bazel_rules_android//android:rules.bzl", "android_library", "android_binary")

android_library(
  name = "impl",
  srcs = glob(["**/*.java"]),
  javacopts = ["-Xep:AndroidJdkLibsChecker:OFF"],
  deps = [
      "//java/arcs/api:api-android",
      "@com_google_dagger",
      "@javax_inject_source//jar",
      "@flogger//jar",
      "@flogger_system_backend//jar",
   ],
   manifest = "AndroidManifest.xml",
)
