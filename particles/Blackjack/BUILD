load(
    "//third_party/java/arcs/build_defs:build_defs.bzl",
    "arcs_kt_particles",
    "arcs_kt_schema",
)

licenses(["notice"])

arcs_kt_schema(
    name = "blackjack_schemas",
    srcs = ["Blackjack.arcs"],
    package = "arcs.tutorials.blackjack",
)

arcs_kt_particles(
    name = "Blackjack",
    srcs = [
        "BlackjackTable.kt",
        "Card.kt",
        "Dealer.kt",
        "DealingShoe.kt",
        "Player.kt",
    ],
    package = "arcs.tutorials.blackjack",
    deps = [":blackjack_schemas"],
)
