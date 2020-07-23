# Arcs Tools


## recipe2plan

To build the tool to run locally, call the Bazel command: `bazel build //java/arcs/tools:recipe2plan`
Thereafter, the binary can be run like any other executable.

### Usage

```
Usage: recipe2plan [OPTIONS] [MANIFESTS]...

  Generate plans from recipes.

  This script reads serialized manifests and generates Kotlin files with
  [Plan] classes.

Options:
  --outdir DIRECTORY   output directory; defaults to '.'
  --package-name TEXT  scope to specified package; default: 'arcs'
  -v, --verbose        Print logs
  -h, --help           Show this message and exit

Arguments:
  MANIFESTS  paths to protobuf-serialized manifests
```

Example: 
```
$ bazel-bin/java/arcs/tools/recipe2plan java/arcs/core/data/testdata/WriterReaderExample.pb.bin -v
```
