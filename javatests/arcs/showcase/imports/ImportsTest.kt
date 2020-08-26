package arcs.showcase.imports

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.host.toRegistration
import arcs.showcase.ShowcaseEnvironment
import arcs.showcase.imports.particles.AcceptImports
import arcs.showcase.imports.particles.IngestDock
import arcs.showcase.imports.particles.IngestOrder
import arcs.showcase.imports.particles.LabelInventory
import arcs.showcase.imports.particles.PackageEgress
import arcs.showcase.imports.particles.PlaceOrder
import arcs.showcase.imports.particles.ProduceInventory
import arcs.showcase.imports.recipes.GatherImportsPlan
import arcs.showcase.imports.recipes.IngestOrdersPlan
import arcs.showcase.imports.recipes.PrepareInventoryForShopPlan
import arcs.showcase.imports.recipes.ProcessOrderByNamePlan
import arcs.showcase.imports.stores.EmitQualityPlan
import arcs.showcase.imports.stores.EmitQuality
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@ExperimentalCoroutinesApi
@RunWith(AndroidJUnit4::class)
class ImportsTest {

    @get:Rule
    val env = ShowcaseEnvironment(
        ::LabelInventory.toRegistration(),
        ::ProduceInventory.toRegistration(),
        ::IngestDock.toRegistration(),
        ::AcceptImports.toRegistration(),
        ::IngestOrder.toRegistration(),
        ::PlaceOrder.toRegistration(),
        ::PackageEgress.toRegistration(),
        ::EmitQuality.toRegistration()
    )

    @Test
    fun teaShop_SupplyChain() = runBlocking {
        val arcs = listOf(
            GatherImportsPlan,
            IngestOrdersPlan,
            EmitQualityPlan,
            ProcessOrderByNamePlan,
            PrepareInventoryForShopPlan
        ).map { env.startArc(it) }


//        withTimeout(30000) {
//            PackageEgress.customerGotOrder.join()
//        }

        for (arc in arcs) {
            env.stopArc(arc)
        }
    }
}
