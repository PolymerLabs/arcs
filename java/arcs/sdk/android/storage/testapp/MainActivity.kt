/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.sdk.android.storage.testapp

import android.app.Application
import android.os.Bundle
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import arcs.android.crdt.ParcelableCrdtType
import arcs.core.crdt.CrdtSet
import arcs.core.data.CollectionType
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaDescription
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.ExistenceCriteria
import arcs.core.storage.Store
import arcs.core.storage.StoreOptions
import arcs.core.storage.api.ArcsSet
import arcs.core.storage.driver.RamDiskStorageKey
import arcs.core.storage.referencemode.RefModeStoreData
import arcs.core.storage.referencemode.RefModeStoreOp
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.util.Log
import arcs.sdk.android.storage.ServiceStoreFactory
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelChildren
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

val STORAGE_KEY = ReferenceModeStorageKey(
    RamDiskStorageKey("person"),
    RamDiskStorageKey("people")
)

/** UI and process-separate container to display data from the StorageService using ServiceStore. */
@UseExperimental(ExperimentalCoroutinesApi::class)
class MainActivity : AppCompatActivity() {
    private val coroutineContext = Dispatchers.Main + Job()
    private val scope = CoroutineScope(coroutineContext)
    private val personSchema = Schema(
        listOf(SchemaName("person")),
        SchemaFields(setOf("name"), emptySet()),
        SchemaDescription()
    )
    val store: Store<CrdtSet.Data<RawEntity>, CrdtSet.Operation<RawEntity>, Set<RawEntity>> =
        Store(
            StoreOptions(
                STORAGE_KEY,
                ExistenceCriteria.MayExist,
                CollectionType(EntityType(personSchema))
            )
        )
    private lateinit var set: ArcsSet<RawEntity, RefModeStoreData.Set, RefModeStoreOp.Set>
    private lateinit var adapter: Adapter
    private lateinit var recyclerView: RecyclerView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.main_activity)

        Log.debug { "MainActivity onCreate" }
        adapter = Adapter(personSchema, coroutineContext)
        recyclerView = findViewById(R.id.recycler)

        recyclerView.adapter = adapter
        recyclerView.layoutManager = LinearLayoutManager(this)

        if (Application.getProcessName().endsWith("ui")) {
            // *
            Store.defaultActiveStoreFactory = ServiceStoreFactory(
                this,
                lifecycle,
                ParcelableCrdtType.Set,
                coroutineContext
            )

            // */
        }

        set = ArcsSet(
            STORAGE_KEY,
            personSchema,
            coroutineContext = coroutineContext
        )

        findViewById<Button>(R.id.add_person_button).setOnClickListener {
            val name = findViewById<EditText>(R.id.person_name).text.toString()
            scope.launch(Dispatchers.IO) {
                Log.debug { "MainActivity addingToSet: $name" }
                set.addAsync(
                    RawEntity(id = name, singletons = mapOf("name" to name.toReferencable()))
                ).await()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        coroutineContext.cancelChildren()
    }
}

@ExperimentalCoroutinesApi
class Adapter(
    private val schema: Schema,
    private val coroutineContext: CoroutineContext
) : RecyclerView.Adapter<PersonHolder>() {
    private val scope = CoroutineScope(coroutineContext)
    val set = ArcsSet(
        STORAGE_KEY,
        schema,
        coroutineContext = coroutineContext
    )
    private var setRepr = setOf<RawEntity>()

    init {
        set.onUpdate = {
            scope.launch(Dispatchers.IO) {
                val newSet = set.freeze()
                val needsRefresh = newSet != setRepr
                setRepr = newSet
                Log.debug { "Adapter onUpdate: $newSet" }

                if (needsRefresh) {
                    withContext(Dispatchers.Main) {
                        notifyDataSetChanged()
                    }
                }
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, type: Int): PersonHolder =
        PersonHolder(parent)

    override fun getItemCount(): Int = setRepr.size

    @Suppress("UNCHECKED_CAST")
    override fun onBindViewHolder(holder: PersonHolder, location: Int) {
        val contents = setRepr.sortedBy {
            it.singletons["name"]?.tryDereference().toString()
        }
        holder.name = (
            contents[location].singletons["name"]
                ?.tryDereference() as? ReferencablePrimitive<String>
            )?.value
    }
}

class PersonHolder(
    parent: ViewGroup
) : RecyclerView.ViewHolder(
    LayoutInflater.from(parent.context).inflate(R.layout.person_view, parent, false)
) {
    var name: String? = null
        set(value) {
            field = value
            itemView.findViewById<TextView>(R.id.name).text = value
        }
}
