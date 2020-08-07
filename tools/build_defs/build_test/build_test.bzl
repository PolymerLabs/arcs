"""Re-exports build_test rule."""

load("@bazel_skylib//rules:build_test.bzl", _build_test = "build_test")

build_test = _build_test
