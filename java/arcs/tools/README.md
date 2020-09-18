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
