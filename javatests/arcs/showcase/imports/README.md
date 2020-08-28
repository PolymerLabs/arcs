# Import Showcase

This showcase demonstrates the ability to import components of manifest files across directories.
We'll demonstrate this usage through the example of a Tea import / export business.

Here, each manifest concept gets its own folder and BUILD rule: Schemas, particles, and recipes have their own folder, 
and coupled concepts will have their own file within each folder. The `ImportTest` file collects all these modules 
together and runs the resulting Arcs.
