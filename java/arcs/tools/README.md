# Arcs Tools


## recipe2plan

This tool converts serialized manifests (in proto format) into generated Kotlin code. 

The tool can be invoked with Bazel, like so: 
```
$ bazel run //java/arcs/tools:recipe2plan 
```

For full usage instructions, call: 
```
$ bazel run //java/arcs/tools:recipe2plan -- --help
```

Example invocation: 
```
$ bazel run //java/arcs/tools:recipe2plan -- java/arcs/core/data/testdata/WriterReaderExample.pb.bin -v
```
