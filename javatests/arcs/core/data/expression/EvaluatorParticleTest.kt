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

package arcs.core.data.expression

import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.sdk.testing.runHarnessTest
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class EvaluatorParticleTest {

  @Test
  fun readWriteSingletonHandles() = runHarnessTest(
    ReadWriteSingletonHandlesTestHarness {
      EvaluatorParticle(ReadWriteSingletonHandlesRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(AbstractReadWriteSingletonHandles.Foo("BazBaz"))
    harness.start()
    assertThat(harness.output.dispatchFetch()?.bar).isEqualTo("BazBaz")
  }

  @Test
  fun readWriteCollectionHandles() = runHarnessTest(
    ReadWriteCollectionHandlesTestHarness {
      EvaluatorParticle(ReadWriteCollectionHandlesRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractReadWriteCollectionHandles.Foo("Lorem"),
      AbstractReadWriteCollectionHandles.Foo("ipsum"),
      AbstractReadWriteCollectionHandles.Foo("dolor")
    )
    harness.start()
    assertThat(
      harness.output.dispatchFetchAll().map { it.bar }
    ).containsExactly("Lorem", "ipsum", "dolor")
  }

  @Test
  fun readWriteCollectionFields() = runHarnessTest(
    ReadWriteCollectionFieldsTestHarness {
      EvaluatorParticle(ReadWriteCollectionFieldsRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractReadWriteCollectionFields.Foo(
        numbers = setOf(3.0, 4.0, 5.0),
        scalar = 100.0
      )
    )
    harness.start()
    assertThat(harness.output.fetch()?.scaled).containsExactly(300.0, 400.0, 500.0)
  }

  @Test
  fun onlyOutputNoInput() = runHarnessTest(
    OnlyOutputNoInputTestHarness {
      EvaluatorParticle(OnlyOutputNoInputRecipePlan.particles.first())
    }
  ) { harness ->
    harness.start()
    assertThat(harness.output.dispatchFetch()?.foo).isEqualTo("Hardcoded!")
  }

  @Test
  fun multiInputMultiOutput() = runHarnessTest(
    MultiInputMultiOutputTestHarness {
      EvaluatorParticle(MultiInputMultiOutputRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input1.dispatchStore(AbstractMultiInputMultiOutput.Value(3.0))
    harness.input2.dispatchStore(AbstractMultiInputMultiOutput.Value(5.0))
    harness.start()
    assertThat(harness.sum.dispatchFetch()?.x).isEqualTo(8.0)
    assertThat(harness.product.dispatchFetch()?.x).isEqualTo(15.0)
  }

  @Test
  fun readNestedInlineEntities() = runHarnessTest(
    ReadNestedInlineEntitiesTestHarness {
      EvaluatorParticle(ReadNestedInlineEntitiesRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractReadNestedInlineEntities.L1(
        AbstractReadNestedInlineEntities.L2(
          AbstractReadNestedInlineEntities.L3(
            "Deep deep deep"
          )
        )
      )
    )
    harness.start()
    assertThat(harness.output.dispatchFetch()?.c).isEqualTo("Deep deep deep")
  }

  @Test
  fun writeNestedInlineEntities() = runHarnessTest(
    WriteNestedInlineEntitiesTestHarness {
      EvaluatorParticle(WriteNestedInlineEntitiesRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(AbstractWriteNestedInlineEntities.Foo("FooBarBaz"))
    harness.start()
    assertThat(
      harness.output.dispatchFetch()?.a?.b?.c
    ).isEqualTo("FooBarBaz")
  }

  @Test
  fun rewriteInlineEntity() = runHarnessTest(
    RewriteInlineEntityTestHarness {
      EvaluatorParticle(RewriteInlineEntityRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractRewriteInlineEntity.L1(
        AbstractRewriteInlineEntity.L2(
          AbstractRewriteInlineEntity.L3(
            "Wholesale Copy"
          )
        )
      )
    )
    harness.start()
    assertThat(harness.output.dispatchFetch()?.a?.b?.c).isEqualTo("Wholesale Copy")
  }

  @Test
  fun identityTranslation() = runHarnessTest(
    IdentityTranslationTestHarness {
      EvaluatorParticle(IdentityTranslationRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractIdentityTranslation.Foo("Lorem"),
      AbstractIdentityTranslation.Foo("ipsum")
    )
    harness.start()
    assertThat(
      harness.output.dispatchFetchAll().map { it.foo }
    ).containsExactly("Lorem", "ipsum")
  }

  @Test
  fun readWriteInlineEntityList() = runHarnessTest(
    ReadWriteInlineEntityListTestHarness {
      EvaluatorParticle(ReadWriteInlineEntityListRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      ReadWriteInlineEntityList_Input(
        listOf(
          ReadWriteInlineEntityList_Input_Bars("(1-1)")
        )
      ),
      ReadWriteInlineEntityList_Input(
        listOf(
          ReadWriteInlineEntityList_Input_Bars("(2-1)"),
          ReadWriteInlineEntityList_Input_Bars("(2-2)")
        )
      )
    )
    harness.start()
    assertThat(harness.output.dispatchFetchAll().map { bar ->
      bar.foos.joinToString { it.value }
    }).containsExactly("(1-1)", "(2-1), (2-2)")
  }

  @Test
  fun readWriteInlineEntitySet() = runHarnessTest(
    ReadWriteInlineEntitySetTestHarness {
      EvaluatorParticle(ReadWriteInlineEntitySetRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(
      ReadWriteInlineEntitySet_Input(
        setOf(
          ReadWriteInlineEntitySet_Input_Bars("(1-1)")
        )
      ),
      ReadWriteInlineEntitySet_Input(
        setOf(
          ReadWriteInlineEntitySet_Input_Bars("(2-1)"),
          ReadWriteInlineEntitySet_Input_Bars("(2-2)")
        )
      )
    )
    harness.start()
    assertThat(harness.output.dispatchFetchAll().map { bar ->
      bar.foos.sortedBy { it.value }.joinToString { it.value }
    }).containsExactly("(1-1)", "(2-1), (2-2)")
  }

  @Test
  fun numericWidening() = runHarnessTest(
    NumericWideningTestHarness { EvaluatorParticle(NumericWideningRecipePlan.particles.first()) }
  ) { harness ->
    harness.input.dispatchStore(NumericWidening_Input(a = 3, b = 3.1415))
    harness.start()
    assertThat(harness.output.dispatchFetch()?.sum).isWithin(.0001).of(6.1415)
  }

  @Test
  fun numericOverflow() = runHarnessTest(
    NumericOverflowTestHarness { EvaluatorParticle(NumericOverflowRecipePlan.particles.first()) }
  ) { harness ->
    harness.input.dispatchStore(NumericOverflow_Input(a = 100, b = 100))
    harness.start()
    // Note the overflow of Byte.
    assertThat(harness.output.dispatchFetch()?.sum).isEqualTo(-56)
  }
}
