package arcs.showcase.imports.particles

import kotlinx.coroutines.Job

class IngestDock : AbstractIngestDock() {


    override fun onFirstStart() {
        val shipment = setOf(
            Container(
                "CN-4584201-13",
                setOf(
                    Tea(
                        "Green Tea",
                        OKINAWA,
                        "Jasmine",
                        20000000.0,
                        1.5,
                        1669881600000
                    ),
                    Tea(
                        "Green Tea",
                        OKINAWA,
                        "Matcha",
                        30000000.0,
                        1.75,
                        1669881600000
                    )
                ),
                OAKLAND
            )

        )
        val boats = listOf(
            Boat("TK-19381",
                "U.S.S. Anton",
                Place(
                    "Port of San Diego",
                    "USA",
                    32.7355086,
                    -117.1771502
                ),
                setOf(
                    OAKLAND,
                    Place(
                        "Port of Seattle",
                        "USA",
                        47.5815401,
                        -122.36394
                    ),
                    Place(
                        "Sydney Harbor",
                        "Australia",
                        -33.8441565,
                        151.1985553
                    )
                ),
                shipment,
                "Docked"
            )
        )

        for (boat in boats) {
            handles.harbor.store(boat)
        }
        dockUnloaded.complete()
    }

    companion object {
        val OAKLAND = Place(
            "Port of Oakland",
            "USA",
            37.7956584,
            -122.2791769
        )

        val OKINAWA = Place(
            "Naha Port",
            "Japan",
            26.2107805,
            127.6679846
        )

        val dockUnloaded = Job()
    }
}

