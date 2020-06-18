/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.data

import arcs.core.data.Recipe.Handle.Fate
import arcs.core.storage.StorageKeyParser
import arcs.core.storage.api.DriverAndKeyConfigurator
import com.google.common.truth.Truth.assertThat
import com.google.common.truth.Truth.assertWithMessage
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Recipe]. */
@RunWith(JUnit4::class)
class RecipeTest {

    // Type: [Person {name: Text}]
    private val personCollectionType = CollectionType(EntityType(Schema(
        names = setOf(SchemaName("Person")),
        fields = SchemaFields(
            singletons = mapOf("name" to FieldType.Text),
            collections = mapOf()
        ),
        hash = "abcd"
    )))

    // Type: [Contact {id: Text}]
    private val contactCollectionType = CollectionType(EntityType(Schema(
        names = setOf(SchemaName("Contact")),
        fields = SchemaFields(
            singletons = mapOf("id" to FieldType.Text),
            collections = mapOf()
        ),
        hash = "efgh"
    )))

    @Before
    fun setupTest() {
        DriverAndKeyConfigurator.configureKeyParsers()
    }

    @Test
    fun handleToStorageKey_withStorageKey() {
        val storageKey = "reference-mode://{db://abcd@arcs/Person}{db://abcd@arcs//handle/people}";

        assertThat(
            Recipe.Handle(
                name = "people",
                fate = Fate.MAP,
                type = personCollectionType,
                storageKey = storageKey
            ).toStorageKey()
        ).isEqualTo(
            StorageKeyParser.parse(storageKey)
        )
    }

    @Test
    fun handleToStorageKey_withStorageKeyAndCapabilities() {
        val storageKey = "reference-mode://{db://abcd@arcs/Person}{db://abcd@arcs//handle/people}";

        assertWithMessage("Existing storage key should be used whenever available").that(
            Recipe.Handle(
                name = "people",
                fate = Fate.MAP,
                type = personCollectionType,
                storageKey = storageKey,
                annotations = listOf(
                    Annotation.capability("persistent"),
                    Annotation.capability("queryable")
                )
            ).toStorageKey()
        ).isEqualTo(
            StorageKeyParser.parse(storageKey)
        )
    }

    @Test
    fun handleToStorageKey_noStorageKeyAndNoCapabilities() {
        assertThat(
            Recipe.Handle(
                name = "people",
                fate = Fate.CREATE,
                type = personCollectionType
            ).toStorageKey()
        ).isEqualTo(
            CreatableStorageKey("people")
        )
    }

    @Test
    fun particleToPlanParticle() {
        val handle = Recipe.Handle(
            name = "contacts",
            fate = Fate.CREATE,
            type = contactCollectionType
        )

        val spec = ParticleSpec(
            name = "ParticleName",
            location = "com.Particle",
            connections = listOf(
                HandleConnectionSpec("data", HandleMode.Read, contactCollectionType)
            ).associateBy { it.name }
        )

        assertThat(
            Recipe.Particle(
                spec = spec,
                handleConnections = listOf(
                    Recipe.Particle.HandleConnection(
                        spec = requireNotNull(spec.connections["data"]),
                        handle = handle
                    )
                )
            ).toPlanParticle()
        ).isEqualTo(
            Plan.Particle(
                particleName = "ParticleName",
                location = "com.Particle",
                handles = mapOf(
                    "data" to Plan.HandleConnection(
                        storageKey = CreatableStorageKey("contacts"),
                        mode = HandleMode.Read,
                        type = contactCollectionType
                    )
                )
            )
        )
    }

    @Test
    fun recipeToPlan_empty() {
        assertThat(
            Recipe(
                name = null,
                particles = emptyList(),
                handles = emptyMap(),
                annotations = emptyList()
            ).toPlan()
        ).isEqualTo(
            Plan(
                particles = emptyList(),
                annotations = emptyList()
            )
        )
    }

    @Test
    fun recipeToPlan_withNameAndArcId() {
        assertThat(
            Recipe(
                name = "RecipeName",
                particles = emptyList(),
                handles = emptyMap(),
                annotations = listOf(Annotation.arcId("arc-id"))
            ).toPlan()
        ).isEqualTo(
            Plan(
                particles = emptyList(),
                annotations = listOf(Annotation.arcId("arc-id"))
            )
        )
    }

    /**
     * Tests a conversion of a recipe equivalent to:
     * ```
     * @arcId('egress-contacts')
     * recipe EgressContacts
     *   people: map 'reference-mode://...'
     *   contacts: create
     *   ConvertToContacts
     *     input: people
     *     output: contacts
     *   EgressContacts
     *     data: contacts
     * ```
     */
    @Test
    fun recipeToPlan_fullExample() {

        val peopleStorageKey = "reference-mode://{db://abcd@arcs/Person}{db://abcd@arcs//handle/people}"

        val peopleHandle = Recipe.Handle(
            name = "people",
            fate = Fate.MAP,
            type = personCollectionType,
            storageKey = peopleStorageKey
        )

        val contactsHandle = Recipe.Handle(
            name = "contacts",
            fate = Fate.CREATE,
            type = contactCollectionType
        )

        val convertToContactsSpec = ParticleSpec(
            name = "ConvertToContacts",
            location = "com.ConvertToContacts",
            connections = listOf(
                HandleConnectionSpec("input", HandleMode.Read, personCollectionType),
                HandleConnectionSpec("output", HandleMode.Write, contactCollectionType)
            ).associateBy { it.name }
        )

        val egressContactsSpec = ParticleSpec(
            name = "EgressContacts",
            location = "com.EgressContacts",
            connections = listOf(
                HandleConnectionSpec("data", HandleMode.Read, contactCollectionType)
            ).associateBy { it.name }
        )

        assertThat(
            Recipe(
                name = "EgressContacts",
                handles = listOf(peopleHandle, contactsHandle).associateBy { it.name },
                particles = listOf(
                    Recipe.Particle(
                        spec = convertToContactsSpec,
                        handleConnections = listOf(
                            Recipe.Particle.HandleConnection(
                                spec = requireNotNull(convertToContactsSpec.connections["input"]),
                                handle = peopleHandle
                            ),
                            Recipe.Particle.HandleConnection(
                                spec = requireNotNull(convertToContactsSpec.connections["output"]),
                                handle = contactsHandle
                            )
                        )
                    ),
                    Recipe.Particle(
                        spec = egressContactsSpec,
                        handleConnections = listOf(
                            Recipe.Particle.HandleConnection(
                                spec = requireNotNull(egressContactsSpec.connections["data"]),
                                handle = contactsHandle
                            )
                        )
                    )
                ),
                annotations = listOf(Annotation.arcId("egress-contacts"))
            ).toPlan()
        ).isEqualTo(
            Plan(
                particles = listOf(
                    Plan.Particle(
                        particleName = "ConvertToContacts",
                        location = "com.ConvertToContacts",
                        handles = mapOf(
                            "input" to Plan.HandleConnection(
                                storageKey = StorageKeyParser.parse(peopleStorageKey),
                                mode = HandleMode.Read,
                                type = personCollectionType
                            ),
                            "output" to Plan.HandleConnection(
                                storageKey = CreatableStorageKey("contacts"),
                                mode = HandleMode.Write,
                                type = contactCollectionType
                            )
                        )
                    ),
                    Plan.Particle(
                        particleName = "EgressContacts",
                        location = "com.EgressContacts",
                        handles = mapOf(
                            "data" to Plan.HandleConnection(
                                storageKey = CreatableStorageKey("contacts"),
                                mode = HandleMode.Read,
                                type = contactCollectionType
                            )
                        )
                    )
                ),
                annotations = listOf(Annotation.arcId("egress-contacts"))
            )
        )
    }
}
