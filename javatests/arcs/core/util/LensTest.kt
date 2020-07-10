package arcs.core.util

import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

/** Tests for [Lens]. */
@RunWith(JUnit4::class)
class LensTest {

    data class Mother(val motherName: String)
    data class Child(val childName: String)
    data class Person(
        val name: String,
        val age: Int,
        val mother: Mother,
        val children: Map<String, Child> = mapOf()
    )

    data class People(val people: List<Person>)

    @Test
    fun getAndSet_immutable() {
        val sally = Mother("Sally")

        val motherNameLens = lens(Mother::motherName) { t, f ->
            t.copy(motherName = f)
        }

        // set the name field and return a new Person object with the modification
        val rita = motherNameLens.set(sally, "Rita")

        assertThat("Rita").isEqualTo(motherNameLens.get(rita))
        assertThat(Mother("Rita")).isEqualTo(rita)
    }

    @Test
    fun getAndSet_deepImmutable() {
        val mother1 = Mother("Sally")
        val mother2 = Mother("Rita")
        val person1 = Person("John", 21, mother1)
        val person2 = Person("Tom", 42, mother2)
        val people = People(listOf(person1, person2))

        val motherNameLens = lens(Mother::motherName) { t, f ->
            t.copy(motherName = f)
        }

        val ageLens = lens(Person::age) { t, f ->
            t.copy(age = f)
        }

        val motherLens = lens(Person::mother) { t, f ->
            t.copy(mother = f)
        }

        // A Lens into the Person.mother.motherName field
        val deepMotherName = motherLens + motherNameLens

        val peopleLens = lens(People::people) { t, f ->
            t.copy(people = f)
        }

        // We could probably compose these two better and pull off the mutations without making
        // extra copies. 
        val moddedMotherNames = (peopleLens.traverse() + deepMotherName).mod(people) { "$it!" }
        val moddedAges = (peopleLens.traverse() + ageLens).mod(moddedMotherNames) { it + 2 }

        val expected = People(
            listOf(
                person1.copy(age = 23, mother = Mother("Sally!")),
                person2.copy(age = 44, mother = Mother("Rita!"))
            )
        )

        assertThat(moddedAges).isEqualTo(expected)
    }

    @Test
    fun mutate_with_traversalComposition() {
        val mother = Mother("Mom")
        val child1 = Child("Jack")
        val child2 = Child("Jill")
        val child3 = Child("Tom")
        val child4 = Child("Jerry")

        val person1 = Person("Sally", 21, mother, mapOf("child1" to child1, "child2" to child2))
        val person2 = Person("Rita", 42, mother, mapOf("child3" to child3, "child4" to child4))
        val people = People(listOf(person1, person2))

        val peopleLens = lens(People::people) { t, f ->
            t.copy(people = f)
        }

        val childrenLens = lens(Person::children) { t, f ->
            t.copy(children = f)
        }

        val childrenNameLens = lens(Child::childName) { t, f ->
            t.copy(childName = f)
        }

        // This traversal enumerates every leaf node Child.childName of the graph
        val allChildrenNames =
            peopleLens.traverse() + childrenLens.traverse() + childrenNameLens

        // Modify every leaf node and return a new immutable data structure graph
        val actualNewPeople = allChildrenNames.mod(people) {
            "Baby $it"
        }

        val newchild1 = Child("Baby Jack")
        val newchild2 = Child("Baby Jill")
        val newchild3 = Child("Baby Tom")
        val newchild4 = Child("Baby Jerry")
        val newperson1 =
            Person("Sally", 21, mother, mapOf("child1" to newchild1, "child2" to newchild2))
        val newperson2 =
            Person("Rita", 42, mother, mapOf("child3" to newchild3, "child4" to newchild4))
        val expectedNewPeople = People(listOf(newperson1, newperson2))

        assertThat(actualNewPeople).isEqualTo(expectedNewPeople)
    }
}
