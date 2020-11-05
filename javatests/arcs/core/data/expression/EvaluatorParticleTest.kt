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

import arcs.core.analytics.Analytics
import arcs.core.data.PaxelTypeException
import arcs.core.testutil.handles.dispatchFetch
import arcs.core.testutil.handles.dispatchFetchAll
import arcs.core.testutil.handles.dispatchStore
import arcs.core.util.Time
import arcs.core.util.testutil.LogRule
import arcs.sdk.testing.runHarnessTest
import com.google.common.truth.Truth.assertThat
import com.nhaarman.mockitokotlin2.any
import com.nhaarman.mockitokotlin2.times
import com.nhaarman.mockitokotlin2.verify
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4
import org.mockito.Mock
import org.mockito.MockitoAnnotations

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class EvaluatorParticleTest {

  @get:Rule
  val log = LogRule()

  @Mock
  private lateinit var mockAnalytics: Analytics

  @Mock
  private lateinit var mockTime: Time

  @Before
  fun setup() {
    MockitoAnnotations.initMocks(this)
  }

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
    assertThat(harness.output.dispatchFetch()?.scaled).containsExactly(300.0, 400.0, 500.0)
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

  @Test
  fun typeError() = runHarnessTest(
    TypeErrorTestHarness { EvaluatorParticle(TypeErrorRecipePlan.particles.first()) }
  ) { harness ->
    harness.input.dispatchStore(TypeError_Input(a = "Hello", b = "World"))
    assertThat(assertFailsWith<PaxelTypeException> {
      harness.start()
    }.message).contains(
      "input.a + input.b: left hand side of expression expected to be numeric type but was String."
    )
  }

  @Test
  fun typeOutputError() = runHarnessTest(
    TypeOutputErrorTestHarness { EvaluatorParticle(TypeOutputErrorRecipePlan.particles.first()) }
  ) { harness ->
    assertThat(assertFailsWith<PaxelTypeException> {
      harness.start()
    }.message).contains("Handle output expected Bar {sum: Number} but found Bar {sum: String}")
  }

  @Test
  fun typeErrorOutputTypo() = runHarnessTest(
    TypeErrorOutputTypoTestHarness {
      EvaluatorParticle(TypeErrorOutputTypoRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(TypeErrorOutputTypo_Input(a = 1.0, b = 2.0))
    assertThat(assertFailsWith<PaxelTypeException> {
      harness.start()
    }.message).contains(
      "Handle output expected Bar {sumx: Number} but found Bar {sum: Number}"
    )
  }

  @Test
  fun typeErrorInputTypo() = runHarnessTest(
    TypeErrorInputTypoTestHarness {
      EvaluatorParticle(TypeErrorInputTypoRecipePlan.particles.first())
    }
  ) { harness ->
    harness.input.dispatchStore(TypeErrorInputTypo_Input(a = 1.0, c = 2.0))
    assertThat(assertFailsWith<PaxelTypeException> {
      harness.start()
    }.message).contains(
      "Field `b` in input.b doesn't exist in scope Foo {a: Number, c: Number}"
    )
  }

  @Test
  fun logSingletonCase() = runHarnessTest(
    ReadWriteSingletonHandlesTestHarness {
      EvaluatorParticle(
        ReadWriteSingletonHandlesRecipePlan.particles.first(),
        mockAnalytics,
        mockTime
      )
    }
  ) { harness ->
    harness.input.dispatchStore(AbstractReadWriteSingletonHandles.Foo("BazBaz"))
    harness.start()
    verify(mockAnalytics, times(1)).logPaxelEvalLatency(any())
    verify(mockAnalytics, times(1)).logPaxelEntitiesCount(1L, 1L)
  }

  @Test
  fun logCollectionCase() = runHarnessTest(
    ReadWriteCollectionHandlesTestHarness {
      EvaluatorParticle(
        ReadWriteCollectionHandlesRecipePlan.particles.first(),
        mockAnalytics,
        mockTime
      )
    }
  ) { harness ->
    harness.input.dispatchStore(
      AbstractReadWriteCollectionHandles.Foo("Lorem"),
      AbstractReadWriteCollectionHandles.Foo("ipsum"),
      AbstractReadWriteCollectionHandles.Foo("dolor")
    )
    harness.start()
    verify(mockAnalytics, times(1)).logPaxelEvalLatency(any())
    verify(mockAnalytics, times(1)).logPaxelEntitiesCount(3L, 3L)
  }
}
