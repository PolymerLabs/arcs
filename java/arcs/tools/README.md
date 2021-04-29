# Arcs Tools


## recipe2plan

This tool converts serialized manifests (in proto format) into generated Kotlin code.

The tool can be invoked with Bazel, like so:
```
$ bazel run //java/arcs/tools:recipe2plan
```

For full usage-instructions, run:
```
$ bazel run //java/arcs/tools:recipe2plan -- --help
```

Example invocation:
```
$ bazel run //java/arcs/tools:recipe2plan -- java/arcs/core/data/testdata/WriterReaderExample.binarypb -v
```

## run_dfa

This tools lets you run dataflow analysis on the given recipe, which can be
invoked as follows:

```
$ SIGH_CMD=/path/to/sigh bazel run //java/arcs/tools:run_dfa -- manifest.arcs
```

## decode_version_map

Decodes a base64-encoded version map proto (e.g. as stored in the SQLite database). Usage:

```
$ bazel run //java/arcs/tools:decode_version_map -- -e ChMKDzg3ODQ2NzAzNTAzODQxNhAB
{878467035038416: 1}
```

## inspect_manifest

This tool makes manifest binaries human-readable: It converts manifest `.binarypb`s
into textprotos.

```
$ bazel run --run_under="cd $PWD && " //java/arcs/tools:inspect_manifest -- ./ok_check_multiple_or_tags.binarypb ./ok_check_multiple_or_tags.textproto
```
