"""Generates a parser .ts file from a .peg grammar file."""

def gentspegjs(
        name,
        src,
        module_name,
        ast_nodes = None,
        out = None,
        allowed_start_rules = None,
        custom_header = "",
        **kwargs):
    """Takes peg parser definitions and produces a TypeScript parser.

    Args:
      name: Genrule target name
      src: Input .peg file
      module_name: TypeScript module name to use.
      ast_nodes: TypeScript file that contains AST node definitions used.
      out: Output TypeScript file name.
      allowed_start_rules: Rule names that can be used as start of parsing.
      custom_header: Extra TypeScript code to insert into the output header.
      **kwargs: Extra arguments to pass to pegjs.
    """

    if out == None:
        out = src + ".ts"
    ast_nodes_str = ""
    tools =  ["//third_party/java/arcs/build_defs/internal:ts_pegjs_cli"]
    if ast_nodes != None:
        ast_node_str = "--ast-nodes " + "$(location " + ast_nodes + ") "
        tools.append(ast_nodes)
    allowed_start_rules_str = ""
    if allowed_start_rules != None:
        allowed_start_rules_str = "--allowed-start-rules " + ",".join(
            allowed_start_rules,
        ) + " "
    native.genrule(
        name = name,
        srcs = [src],
        outs = [out],
        message = "Generating pegjs parser from %s" % src,
        cmd = "$(location //third_party/java/arcs/build_defs/internal:ts_pegjs_cli) " +
              "-o $(location " + out + ") " +
              "--export-var " + module_name + " " +
              "--custom-header '" + custom_header + "' " +
              ast_nodes_str +
              allowed_start_rules_str +
              "$(location " + src + ") ",
        tools = tools,
        **kwargs
    )
