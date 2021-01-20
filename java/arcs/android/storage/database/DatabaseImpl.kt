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

package arcs.android.storage.database

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.DatabaseUtils
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.util.Base64
import androidx.annotation.VisibleForTesting
import arcs.android.common.MAX_PLACEHOLDERS
import arcs.android.common.batchDelete
import arcs.android.common.forEach
import arcs.android.common.forSingleResult
import arcs.android.common.getBoolean
import arcs.android.common.getNullableArcsInstant
import arcs.android.common.getNullableBoolean
import arcs.android.common.getNullableByte
import arcs.android.common.getNullableDouble
import arcs.android.common.getNullableFloat
import arcs.android.common.getNullableInt
import arcs.android.common.getNullableLong
import arcs.android.common.getNullableShort
import arcs.android.common.getNullableString
import arcs.android.common.map
import arcs.android.common.transaction
import arcs.android.crdt.VersionMapProto
import arcs.android.crdt.fromProto
import arcs.android.crdt.toProto
import arcs.core.common.Referencable
import arcs.core.crdt.VersionMap
import arcs.core.data.FieldName
import arcs.core.data.FieldType
import arcs.core.data.LARGEST_PRIMITIVE_TYPE_ID
import arcs.core.data.PrimitiveType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.util.ReferencableList
import arcs.core.data.util.ReferencablePrimitive
import arcs.core.data.util.toReferencable
import arcs.core.storage.Reference
import arcs.core.storage.StorageKey
import arcs.core.storage.StorageKeyManager
import arcs.core.storage.database.Database
import arcs.core.storage.database.DatabaseClient
import arcs.core.storage.database.DatabaseData
import arcs.core.storage.database.DatabasePerformanceStatistics
import arcs.core.storage.database.ReferenceWithVersion
import arcs.core.storage.embed
import arcs.core.util.ArcsDuration
import arcs.core.util.ArcsInstant
import arcs.core.util.BigInt
import arcs.core.util.TaggedLog
import arcs.core.util.guardedBy
import arcs.core.util.performance.Counters
import arcs.core.util.performance.PerformanceStatistics
import arcs.core.util.performance.Timer
import arcs.jvm.util.JvmTime
import com.google.protobuf.InvalidProtocolBufferException
import kotlin.coroutines.coroutineContext
import kotlin.math.roundToLong
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic
import kotlinx.atomicfu.updateAndGet
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.filter
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** The Type ID that gets stored in the database. */
typealias TypeId = Long

/** The ID for a field in a schema. */
typealias FieldId = Long

/** The ID for a storage key. */
typealias StorageKeyId = Long

/** The ID of a field value, referring to either a row in a primitive table, or an entity ID. */
typealias FieldValueId = Long

/** The ID of a collection (or a singleton). */
typealias CollectionId = Long

/** The ID of an entity reference. */
typealias ReferenceId = Long

/** Implementation of [Database] for Android using SQLite. */
@VisibleForTesting(otherwise = VisibleForTesting.PACKAGE_PRIVATE)
@Suppress("Recycle", "EXPERIMENTAL_API_USAGE")
// Our helper extension methods close Cursors correctly.
class DatabaseImpl(
  context: Context,
  private val storageKeyManager: StorageKeyManager,
  databaseName: String,
  persistent: Boolean = true,
  val onDatabaseClose: suspend () -> Unit = {}
) : Database, SQLiteOpenHelper(
  context,
  // Using `null` with SQLiteOpenHelper's database name makes it an in-memory database.
  if (persistent) databaseName else null,
  /* cursorFactory = */ null,
  DB_VERSION
) {
  // TODO(#5551): Consider including a hash of toString for tracking.
  private val log = TaggedLog { "DatabaseImpl" }

  // TODO: handle rehydrating from a snapshot.
  private val stats = DatabasePerformanceStatistics(
    insertUpdate = PerformanceStatistics(
      Timer(JvmTime),
      *DatabaseCounters.INSERT_UPDATE_COUNTERS
    ),
    get = PerformanceStatistics(Timer(JvmTime), *DatabaseCounters.GET_COUNTERS),
    delete = PerformanceStatistics(Timer(JvmTime), *DatabaseCounters.DELETE_COUNTERS)
  )

  /** Maps from schema hash to type ID (local copy of the 'types' table). */
  private val schemaTypeMap by lazy(LazyThreadSafetyMode.SYNCHRONIZED) { atomic(loadTypes()) }

  private val clientMutex = Mutex()
  private var nextClientId by guardedBy(clientMutex, 1)
  private val clients by guardedBy(clientMutex, mutableMapOf<Int, DatabaseClient>())
  private val clientFlow: Flow<DatabaseClient> = flow {
    clientMutex.withLock {
      // Make a copy of the values to prevent ConcurrentModificationExceptions.
      clients.values.toList()
    }.forEach { emit(it) }
  }
  private var initialized = false

  override fun onConfigure(db: SQLiteDatabase?) {
    super.onConfigure(db)

    /**
     * After enabling WAL, multiple sqlite connections are established at db open,
     * onCreate/onUpgrade/onDowngrade may be called concurrently per connections,
     * either using "IF EXISTS"/"IF NOT EXISTS" option to create/drop table/index
     * or protecting onCreate/onUpgrade/onDowngrade with a lock, otherwise a
     * [SQLiteException] might be thrown during executing SQL statements complaining
     * tables/indice already (not) existed.
     */
    db?.enableWriteAheadLogging()
  }

  override fun onCreate(db: SQLiteDatabase) = synchronized(db) {
    if (initialized) return
    db.transaction { initializeDatabase(this) }
    initialized = true
  }

  override fun onUpgrade(
    db: SQLiteDatabase,
    oldVersion: Int,
    newVersion: Int
  ) = synchronized(db) {
    if (initialized) return
    db.transaction {
      ((oldVersion + 1)..newVersion).forEach { nextVersion ->
        MIGRATION_STEPS[nextVersion]?.forEach(db::execSQL)
      }
    }
    initialized = true
  }

  override fun onDowngrade(
    db: SQLiteDatabase,
    oldVersion: Int,
    newVersion: Int
  ) = synchronized(db) {
    if (initialized) return
    db.transaction {
      // Select all of the tables from the database, not just the ones we know about given
      // our version, then generate DROP TABLE statements and execute them.
      rawQuery(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
        emptyArray()
      ).map { "DROP TABLE ${it.getString(0)}" }.forEach(db::execSQL)

      initializeDatabase(this)
      Unit
    }
    initialized = true
  }

  /**
   * Creates the tables for the database and initializes the [PrimitiveType] values.
   */
  private fun initializeDatabase(db: SQLiteDatabase) {
    db.transaction {
      CREATE.forEach(db::execSQL)
      initializeTypesTable(db)
    }
  }

  /* Initializes the types table values. */
  private fun initializeTypesTable(db: SQLiteDatabase) {
    // We used to keep primitive types in the table, and used the sentinel to distinguish between
    // primitive and entity types.
    // Now we only keep entity types here, but the sentinel is kept for backwards compatibility.
    val sentinel = ContentValues().apply {
      put("is_primitive", true)
      put("id", REFERENCE_TYPE_SENTINEL)
      put("name", REFERENCE_TYPE_SENTINEL_NAME)
    }
    db.insertOrThrow(TABLE_TYPES, null, sentinel)
  }

  override suspend fun addClient(client: DatabaseClient): Int = clientMutex.withLock {
    clients[nextClientId] = client
    nextClientId++
  }

  override suspend fun removeClient(identifier: Int) = clientMutex.withLock {
    clients.remove(identifier)
    if (clients.isEmpty()) {
      onDatabaseClose()
      // TODO: track bulk deletes, and if none is in progress we can close the connection.
    }
    Unit
  }

  override suspend fun get(
    storageKey: StorageKey,
    dataType: KClass<out DatabaseData>,
    schema: Schema
  ) = stats.get.timeSuspending { counters ->
    when (dataType) {
      DatabaseData.Entity::class -> {
        counters.increment(DatabaseCounters.GET_ENTITY)
        getEntity(storageKey, schema, counters)
      }
      DatabaseData.Collection::class -> {
        counters.increment(DatabaseCounters.GET_COLLECTION)
        getCollection(storageKey, schema, counters)
      }
      DatabaseData.Singleton::class -> {
        counters.increment(DatabaseCounters.GET_SINGLETON)
        getSingleton(storageKey, schema, counters)
      }
      else -> throw UnsupportedOperationException("Unsupported data type $dataType.")
    }
  }

  @Suppress("UNCHECKED_CAST")
  private fun getEntity(
    storageKey: StorageKey,
    schema: Schema,
    counters: Counters? = null
  ): DatabaseData.Entity? = readableDatabase.transaction {
    val db = this
    // Fetch the entity's type by storage key.
    counters?.increment(DatabaseCounters.GET_ENTITY_TYPE_BY_STORAGEKEY)
    rawQuery(
      """
                SELECT
                    storage_keys.id,
                    storage_keys.data_type,
                    entities.entity_id,
                    entities.creation_timestamp,
                    entities.expiration_timestamp,
                    entities.version_map,
                    entities.version_number
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
      """.trimIndent(),
      arrayOf(storageKey.toString())
    ).forSingleResult {
      val dataType = DataType.values()[it.getInt(1)]
      require(dataType == DataType.Entity) {
        "Expected storage key $storageKey to be an Entity but was a $dataType."
      }
      val storageKeyId = it.getLong(0)
      val entityId = it.getString(2)
      val creationTimestamp = it.getLong(3)
      val expirationTimestamp = it.getLong(4)
      val versionMap = requireNotNull(it.getVersionMap(5)) {
        "No VersionMap available for Entity at $storageKey"
      }
      val versionNumber = it.getInt(6)
      val rawSingletons =
        schema.fields.singletons.mapValues<FieldName, FieldType, Referencable?> { null }
          .toMutableMap()
      val rawCollections =
        schema.fields.collections.mapValues { emptySet<Referencable>() }
          .toMutableMap()
      val (dbSingletons, dbCollections) = getEntityFields(storageKeyId, counters, db)
      dbSingletons.forEach { (fieldName, value) -> rawSingletons[fieldName] = value }
      dbCollections.forEach { (fieldName, value) -> rawCollections[fieldName] = value }

      return@forSingleResult DatabaseData.Entity(
        RawEntity(
          id = entityId,
          singletons = rawSingletons,
          collections = rawCollections,
          creationTimestamp = creationTimestamp,
          expirationTimestamp = expirationTimestamp
        ),
        schema,
        versionNumber,
        versionMap
      )
    }
  }

  /** Returns the singleton and collection fields for the entity at the given storage key ID. */
  private fun getEntityFields(
    storageKeyId: StorageKeyId,
    counters: Counters?,
    db: SQLiteDatabase
  ): Pair<Map<FieldName, Referencable?>, Map<FieldName, Set<Referencable>>> {
    counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
    val singletons = mutableMapOf<FieldName, Referencable?>()
    val collections = mutableMapOf<FieldName, MutableSet<Referencable>>()
    val lists = mutableMapOf<FieldName, MutableList<Referencable>>()
    val listTypes = mutableMapOf<FieldName, FieldType>()

    db.rawQuery(
      """
                SELECT
                    fields.name,
                    fields.is_collection,
                    fields.type_id,
                    CASE
                        WHEN fields.is_collection IN $VALUE_TABLE_FIELDS THEN field_values.value_id
                        ELSE collection_entries.value_id
                    END AS field_value_id,
                    text_primitive_values.value,
                    number_primitive_values.value,
                    entity_refs.entity_id,
                    entity_refs.backing_storage_key,
                    entity_refs.version_map,
                    entity_refs.creation_timestamp,
                    entity_refs.expiration_timestamp,
                    entity_refs.is_hard_ref
                FROM field_values
                JOIN fields ON field_values.field_id = fields.id
                LEFT JOIN collection_entries
                    ON fields.is_collection > 0
                    AND collection_entries.collection_id = field_values.value_id
                LEFT JOIN number_primitive_values
                    ON fields.type_id IN $NUMBER_TABLE_TYPES AND number_primitive_values.id = field_value_id
                LEFT JOIN text_primitive_values
                    ON fields.type_id IN $TEXT_TABLE_TYPES AND text_primitive_values.id = field_value_id
                LEFT JOIN entity_refs
                    ON fields.type_id > $LARGEST_PRIMITIVE_TYPE_ID AND entity_refs.id = field_value_id
                WHERE field_values.entity_storage_key_id = ?
      """.trimIndent(),
      arrayOf(storageKeyId.toString())
    ).forEach {
      // Artifact of all the LEFT JOINs. If the entity is empty, there can be a single
      // row full of NULLs. Just skip it if null.
      val fieldName = it.getNullableString(0) ?: return@forEach
      val isCollection = FieldClass.fromOrdinal(it.getInt(1))
      val typeId = it.getInt(2)

      val value: Referencable? = when (typeId) {
        PrimitiveType.Boolean.id -> it.getNullableBoolean(3)?.toReferencable()
        PrimitiveType.Text.id -> it.getNullableString(4)?.toReferencable()
        PrimitiveType.Number.id -> it.getNullableDouble(5)?.toReferencable()
        PrimitiveType.Byte.id -> it.getNullableByte(3)?.toReferencable()
        PrimitiveType.Short.id -> it.getNullableShort(3)?.toReferencable()
        PrimitiveType.Int.id -> it.getNullableInt(3)?.toReferencable()
        PrimitiveType.Long.id -> it.getNullableLong(3)?.toReferencable()
        PrimitiveType.Char.id -> it.getNullableInt(3)?.toChar()?.toReferencable()
        PrimitiveType.Float.id -> it.getNullableFloat(5)?.toReferencable()
        PrimitiveType.Double.id -> it.getNullableDouble(5)?.toReferencable()
        PrimitiveType.BigInt.id ->
          if (it.isNull(4)) {
            null
          } else {
            BigInt(it.getString(4)).toReferencable()
          }
        PrimitiveType.Instant.id -> it.getNullableArcsInstant(4)?.toReferencable()
        else ->
          if (
            isCollection == FieldClass.InlineEntity ||
            isCollection == FieldClass.InlineEntityCollection ||
            isCollection == FieldClass.InlineEntityList
          ) {
            if (it.isNull(3)) {
              // Empty list/collection (the field value points to a collection with no entries).
              null
            } else {
              val rawSingletons = mutableMapOf<FieldName, Referencable?>()
              val rawCollections = mutableMapOf<FieldName, Set<Referencable>>()
              val inlineStorageKeyId = it.getLong(3)
              val entityId = db.rawQuery(
                """
                SELECT
                    entity_id
                FROM entities
                WHERE storage_key_id = ?
                """.trimIndent(),
                arrayOf(inlineStorageKeyId.toString())
              ).forSingleResult {
                it.getString(0)
              }
              val (dbSingletons, dbCollections) =
                getEntityFields(inlineStorageKeyId, counters, db)
              dbSingletons.forEach { (fieldName, value) -> rawSingletons[fieldName] = value }
              dbCollections.forEach { (fieldName, value) ->
                rawCollections[fieldName] = value
              }
              RawEntity(
                id = requireNotNull(entityId) {
                  "DB in an inconsistent state: entity data exists against " +
                    "storage_key_id $inlineStorageKeyId without matching ID from " +
                    "entities table"
                },
                singletons = rawSingletons,
                collections = rawCollections
              )
            }
          } else if (it.isNull(6)) {
            null
          } else {
            Reference(
              id = it.getString(6),
              storageKey = storageKeyManager.parse(it.getString(7)),
              version = it.getVersionMap(8),
              _creationTimestamp = it.getLong(9),
              _expirationTimestamp = it.getLong(10),
              isHardReference = it.getBoolean(11)
            )
          }
      }

      when (isCollection) {
        FieldClass.Collection, FieldClass.InlineEntityCollection -> {
          // Ensure we create the collection even if the element to add is null.
          val collection = collections.getOrPut(fieldName) { mutableSetOf() }
          value?.let { x -> collection.add(x) }
        }
        FieldClass.List -> {
          val list = lists.getOrPut(fieldName) { mutableListOf() }
          if (typeId > LARGEST_PRIMITIVE_TYPE_ID) {
            listTypes.getOrPut(fieldName) {
              FieldType.EntityRef(getSchemaHash(typeId, db))
            }
          } else {
            listTypes.put(
              fieldName,
              FieldType.Primitive(PrimitiveType.values()[typeId])
            )
          }
          value?.let { list.add(it) }
        }
        FieldClass.InlineEntityList -> {
          val list = lists.getOrPut(fieldName) { mutableListOf() }
          listTypes.getOrPut(fieldName) {
            FieldType.InlineEntity(getSchemaHash(typeId, db))
          }
          value?.let { list.add(it) }
        }
        FieldClass.Singleton -> singletons[fieldName] = value
        FieldClass.InlineEntity -> singletons[fieldName] = value
      }
    }
    lists.entries.forEach { (key, value) ->
      singletons[key] =
        value.toReferencable(FieldType.ListOf(listTypes[key]!!))
    }
    return singletons to collections
  }

  private fun getCollection(
    storageKey: StorageKey,
    schema: Schema,
    counters: Counters? = null
  ): DatabaseData.Collection? = readableDatabase.transaction {
    val db = this
    counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
    val (collectionId, versionMap, versionNumber) =
      getCollectionMetadata(storageKey, DataType.Collection, db)
        ?: return@transaction null

    counters?.increment(DatabaseCounters.GET_COLLECTION_ENTRIES)
    val values = getCollectionReferenceEntries(collectionId, db)
    DatabaseData.Collection(
      values,
      schema,
      versionNumber,
      versionMap
    )
  }

  private fun getSingleton(
    storageKey: StorageKey,
    schema: Schema,
    counters: Counters? = null
  ): DatabaseData.Singleton? = readableDatabase.transaction {
    val db = this
    counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
    val (collectionId, versionMap, versionNumber) =
      getCollectionMetadata(storageKey, DataType.Singleton, db)
        ?: return@transaction null

    counters?.increment(DatabaseCounters.GET_SINGLETON_ENTRIES)
    val values = getCollectionReferenceEntries(collectionId, db)
    require(values.size <= 1) {
      "Singleton at storage key $storageKey has more than one value."
    }
    val value = values.singleOrNull()
    DatabaseData.Singleton(
      value?.let { ReferenceWithVersion(value.reference, value.versionMap) },
      schema,
      versionNumber,
      versionMap
    )
  }

  override suspend fun insertOrUpdate(
    storageKey: StorageKey,
    data: DatabaseData,
    originatingClientId: Int?
  ): Boolean = stats.insertUpdate.timeSuspending { counters ->
    when (data) {
      is DatabaseData.Entity -> {
        counters.increment(DatabaseCounters.INSERTUPDATE_ENTITY)
        insertOrUpdateEntity(storageKey, data, counters)
      }
      is DatabaseData.Collection -> {
        counters.increment(DatabaseCounters.INSERTUPDATE_COLLECTION)
        insertOrUpdateCollection(storageKey, data, DataType.Collection, counters)
      }
      is DatabaseData.Singleton -> {
        counters.increment(DatabaseCounters.INSERTUPDATE_SINGLETON)
        insertOrUpdateSingleton(storageKey, data, counters)
      }
    }
  }.also { success ->
    if (success) {
      notifyClients(storageKey) {
        it.onDatabaseUpdate(data, data.databaseVersion, originatingClientId)
      }
    }
  }

  @VisibleForTesting
  suspend fun insertOrUpdateEntity(
    storageKey: StorageKey,
    data: DatabaseData.Entity,
    counters: Counters? = null
  ): Boolean = writableDatabase.transaction {
    val db = this
    val entity = data.rawEntity
    // Fetch/create the entity's type ID.
    val schemaTypeId = getSchemaTypeId(data.schema, db, counters)
    // Create a new ID for the storage key.
    val storageKeyId = createEntityStorageKeyId(
      storageKey,
      entity.id,
      entity.creationTimestamp,
      entity.expirationTimestamp,
      schemaTypeId,
      data.versionMap,
      data.databaseVersion,
      db,
      counters
    ) ?: return@transaction false // Database has newer data. Don't apply the given op.

    insertOrUpdateEntityByStorageKeyId(
      storageKey,
      storageKeyId,
      entity,
      schemaTypeId,
      db,
      counters
    )
  }

  suspend fun insertOrUpdateEntityByStorageKeyId(
    storageKey: StorageKey,
    storageKeyId: StorageKeyId,
    entity: RawEntity,
    schemaTypeId: TypeId,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): Boolean = db.transaction {
    // Insert the entity's field types.
    counters?.increment(DatabaseCounters.GET_ENTITY_FIELDS)
    val fields = getSchemaFields(schemaTypeId, db)
    val content = ContentValues().apply {
      put("entity_storage_key_id", storageKeyId)
    }
    entity.allData
      .filter { (_, fieldValue) ->
        // If a field value is null, we don't write it to the database.
        fieldValue != null
      }
      .forEach { (fieldName, fieldValue) ->
        content.apply {
          val field = fields.getValue(fieldName)
          put("field_id", field.fieldId)
          val valueId = when {
            field.isCollection == FieldClass.List ||
              field.isCollection == FieldClass.InlineEntityList -> {
              if (fieldValue == null) return@forEach
              require(fieldValue is ReferencableList<*>) {
                "Ordered List fields must be of type List. Instead found " +
                  "${fieldValue::class}."
              }
              val value = fieldValue.value
              insertFieldCollection(
                value,
                field.typeId,
                field.isCollection,
                fieldName,
                storageKey,
                db,
                counters
              )
            }
            field.isCollection == FieldClass.InlineEntity -> {
              require(fieldValue is RawEntity) {
                "Expected field value to be a RawEntity but was $fieldValue."
              }

              insertInlineEntity(
                fieldValue,
                fieldName,
                field.typeId,
                storageKey,
                db,
                counters
              )
            }
            field.isCollection == FieldClass.Collection ||
              field.isCollection == FieldClass.InlineEntityCollection -> {
              if (fieldValue == null) return@forEach
              require(fieldValue is Set<*>) {
                "Collection field $fieldName must be of type Set. Instead found " +
                  "${fieldValue::class}."
              }
              if (fieldValue.isEmpty()) return@forEach
              insertFieldCollection(
                fieldValue,
                field.typeId,
                field.isCollection,
                fieldName,
                storageKey,
                db,
                counters
              )
            }
            isPrimitiveType(field.typeId) -> {
              getPrimitiveValueId(
                fieldValue as Referencable,
                field.typeId,
                db,
                counters
              )
            }
            else -> {
              require(fieldValue is Reference) {
                "Expected field value to be a Reference but was $fieldValue."
              }
              getEntityReferenceId(fieldValue, db, counters)
            }
          }
          put("value_id", valueId)
        }

        counters?.increment(DatabaseCounters.UPDATE_ENTITY_FIELD_VALUE)
        insertWithOnConflict(
          TABLE_FIELD_VALUES,
          null,
          content,
          SQLiteDatabase.CONFLICT_REPLACE
        )
      }
    true
  }

  /**
   * Inserts an inline entity into the database. Will create and return a StorageKeyId
   * for the entity. Will return null if creation of the storageKey fails.
   */
  private suspend fun insertInlineEntity(
    entity: RawEntity,
    fieldName: String,
    typeId: TypeId,
    parentStorageKey: StorageKey,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): StorageKeyId? = db.transaction {
    val childKey = InlineStorageKey(parentStorageKey, fieldName)
    val childKeyId = createEntityStorageKeyId(
      childKey,
      entity.id,
      entity.creationTimestamp,
      entity.expirationTimestamp,
      typeId,
      VersionMap(),
      0,
      db,
      counters
    ) ?: return@transaction null
    insertOrUpdateEntityByStorageKeyId(
      childKey,
      childKeyId,
      entity,
      typeId,
      db,
      counters
    )
    childKeyId
  }

  /**
   * Inserts a new collection into the database. Can contain primitives, inline entities, or
   * references. Will create and return a new collection ID for the collection. For entity field
   * collections only (handle collections should use [insertOrUpdateCollection]).
   */
  private suspend fun insertFieldCollection(
    elements: Iterable<*>,
    typeId: TypeId,
    fieldClass: FieldClass,
    fieldName: String,
    parentStorageKey: StorageKey,
    db: SQLiteDatabase,
    counters: Counters?
  ): FieldValueId = db.transaction {
    // Create a new collection.
    counters?.increment(DatabaseCounters.INSERT_COLLECTION_RECORD)
    val collectionId = insertOrThrow(
      TABLE_COLLECTIONS,
      null,
      ContentValues().apply {
        put("type_id", typeId)
        // Entity field collections don't need version maps or numbers.
      }
    )

    val content = ContentValues().apply {
      put("collection_id", collectionId)
    }
    // TODO(#4889): Don't do this one-by-one.
    val valueIds = when {
      isPrimitiveType(typeId) ->
        elements.map { getPrimitiveValueId(it as Referencable, typeId, db) }
      fieldClass == FieldClass.InlineEntityCollection ||
        fieldClass == FieldClass.InlineEntityList ->
        elements.map {
          require(it is RawEntity) {
            "Expected element in collection to be a RawEntity but was $it."
          }
          insertInlineEntity(it, fieldName, typeId, parentStorageKey, db, counters)
        }
      else ->
        elements.map {
          require(it is Reference) {
            "Expected element in collection to be a Reference but was $it."
          }
          getEntityReferenceId(it, db, counters)
        }
    }

    valueIds.forEach { valueId ->
      content.put("value_id", valueId)
      counters?.increment(DatabaseCounters.INSERT_COLLECTION_ENTRY)
      insertOrThrow(TABLE_COLLECTION_ENTRIES, null, content)
    }

    collectionId
  }

  @VisibleForTesting
  suspend fun insertOrUpdateCollection(
    storageKey: StorageKey,
    data: DatabaseData.Collection,
    dataType: DataType,
    counters: Counters?
  ): Boolean = writableDatabase.transaction {
    val db = this

    // Fetch/create the entity's type ID.
    val schemaTypeId = getSchemaTypeId(data.schema, db, counters)

    when (dataType) {
      DataType.Collection ->
        counters?.increment(DatabaseCounters.GET_COLLECTION_ID)
      DataType.Singleton ->
        counters?.increment(DatabaseCounters.GET_SINGLETON_ID)
      else -> Unit
    }

    // Retrieve existing collection ID for this storage key, if one exists.
    val metadata = getCollectionMetadata(storageKey, dataType, db)

    val collectionId = if (metadata == null) {
      // Create a new collection ID and storage key ID.
      when (dataType) {
        DataType.Collection ->
          counters?.increment(DatabaseCounters.INSERT_COLLECTION_RECORD)
        DataType.Singleton ->
          counters?.increment(DatabaseCounters.INSERT_SINGLETON_RECORD)
        else -> Unit
      }
      val collectionId = insertOrThrow(
        TABLE_COLLECTIONS,
        null,
        ContentValues().apply {
          put("type_id", schemaTypeId)
          put("version_map", data.versionMap.toProtoLiteral())
          put("version_number", data.databaseVersion)
        }
      )
      when (dataType) {
        DataType.Collection ->
          counters?.increment(DatabaseCounters.INSERT_COLLECTION_STORAGEKEY)
        DataType.Singleton ->
          counters?.increment(DatabaseCounters.INSERT_SINGLETON_STORAGEKEY)
        else -> Unit
      }
      insertOrThrow(
        TABLE_STORAGE_KEYS,
        null,
        ContentValues().apply {
          put("storage_key", storageKey.toString())
          put("data_type", dataType.ordinal)
          put("value_id", collectionId)
        }
      )
      collectionId
    } else {
      // Collection already exists; delete all existing entries.
      val collectionId = metadata.collectionId
      if (data.databaseVersion != metadata.versionNumber + 1) {
        return@transaction false
      }

      // TODO(#4889): Don't blindly delete everything and re-insert: only insert/remove the
      // diff.
      when (dataType) {
        DataType.Collection ->
          counters?.increment(DatabaseCounters.DELETE_COLLECTION_ENTRIES)
        DataType.Singleton ->
          counters?.increment(DatabaseCounters.DELETE_SINGLETON_ENTRY)
        else -> Unit
      }
      delete(
        TABLE_COLLECTION_ENTRIES,
        "collection_id = ?",
        arrayOf(collectionId.toString())
      )

      // Updated collection metadata.
      update(
        TABLE_COLLECTIONS,
        ContentValues().apply {
          put("version_map", data.versionMap.toProtoLiteral())
          put("version_number", data.databaseVersion)
        },
        "id = ?",
        arrayOf(collectionId.toString())
      )
      collectionId
    }

    // Insert all elements into the collection.
    val content = ContentValues().apply {
      put("collection_id", collectionId)
    }
    // TODO(#4889): Don't do this one-by-one.
    data.values
      .map {
        getEntityReferenceId(it.reference, db) to it.versionMap
      }
      .forEach { (referenceId, versionMap) ->
        when (dataType) {
          DataType.Collection ->
            counters?.increment(DatabaseCounters.INSERT_COLLECTION_ENTRY)
          DataType.Singleton ->
            counters?.increment(DatabaseCounters.INSERT_SINGLETON_ENTRY)
          else -> Unit
        }
        insertOrThrow(
          TABLE_COLLECTION_ENTRIES,
          null,
          content.apply {
            put("value_id", referenceId)
            put("version_map", versionMap.toProtoLiteral())
          }
        )
      }
    true
  }

  @VisibleForTesting
  suspend fun insertOrUpdateSingleton(
    storageKey: StorageKey,
    data: DatabaseData.Singleton,
    counters: Counters? = null
  ): Boolean {
    // Convert Singleton into a a zero-or-one-element Collection.
    val set = mutableSetOf<ReferenceWithVersion>()
    data.value?.let { set.add(it) }
    val collectionData = with(data) {
      DatabaseData.Collection(
        set,
        schema,
        databaseVersion,
        versionMap
      )
    }
    // Store the Collection as a Singleton.
    return insertOrUpdateCollection(storageKey, collectionData, DataType.Singleton, counters)
  }

  override suspend fun delete(
    storageKey: StorageKey,
    originatingClientId: Int?
  ) = writableDatabase.use {
    delete(storageKey, it)
  }.also { notifyClients(storageKey) { it.onDatabaseDelete(originatingClientId) } }

  suspend fun delete(
    storageKey: StorageKey,
    db: SQLiteDatabase
  ): Unit = stats.delete.timeSuspending { counters ->
    db.transaction {
      if (storageKey is InlineStorageKey) {
        throw UnsupportedOperationException(
          "Invalid attempt to delete inline storage key $storageKey." +
            " Inline entities should not be removed using delete()."
        )
      }
      counters.increment(DatabaseCounters.GET_STORAGE_KEY_ID)
      // Select the given storage key, and also all descendant keys (all keys of inline entities
      // contained in the top level entity).
      rawQuery(
        """
                    SELECT id, data_type, value_id
                    FROM storage_keys
                    WHERE storage_key = ? OR storage_key LIKE ?
        """.trimIndent(),
        // We need a '}' immediately after the storageKey to ensure it really is a child key, but
        // not immediately before to pick up all the levels of nesting (for example
        // 'inline://{inline://{{db://...').
        arrayOf(storageKey.toString(), "inline://{%$storageKey}%")
      ).forEach {
        val dataType = DataType.values()[it.getInt(1)]
        var collectionId: Long? = null
        if (dataType == DataType.Singleton || dataType == DataType.Collection) {
          collectionId = it.getLong(2)
        }
        val storageKeyId = it.getLong(0)

        counters.increment(DatabaseCounters.DELETE_STORAGE_KEY)
        execSQL("DELETE FROM storage_keys WHERE id = ?", arrayOf(storageKeyId))
        counters.increment(DatabaseCounters.DELETE_ENTITY)
        execSQL("DELETE FROM entities WHERE storage_key_id = ?", arrayOf(storageKeyId))
        counters.increment(DatabaseCounters.DELETE_ENTITY_FIELDS)

        // entity_refs and types don't get deleted.

        if (collectionId != null) {
          counters.increment(DatabaseCounters.DELETE_COLLECTION)
          execSQL("DELETE FROM collections WHERE id = ?", arrayOf(collectionId))
          counters.increment(DatabaseCounters.DELETE_COLLECTION_ENTRIES)
          execSQL(
            "DELETE FROM collection_entries WHERE collection_id = ?",
            arrayOf(collectionId)
          )
        } else {
          deleteFields(arrayOf(storageKeyId.toString()), db)
        }
      }
    }
  }

  /**
   * Removes all refs (in entity_refs table) that are not being used.
   */
  private fun removeUnusedRefs(db: SQLiteDatabase) {
    db.transaction {
      // Find all entity_refs.ids used in singleton fields.
      val singletonFieldRefs = rawQuery(
        """
                    SELECT field_values.value_id
                    FROM field_values
                    INNER JOIN fields ON field_values.field_id = fields.id
                    WHERE fields.is_collection = 0
                    AND fields.type_id > ?
        """.trimIndent(),
        arrayOf(LARGEST_PRIMITIVE_TYPE_ID.toString()) // only references.
      ).map { it.getLong(0).toString() }.toSet()

      // Find all entity_refs.ids used in top level collections/singletons or collection
      // fields.
      val collectionRefs = rawQuery(
        """
                    SELECT entity_refs.id
                    FROM entity_refs
                    LEFT JOIN collection_entries ON entity_refs.id = collection_entries.value_id
                    LEFT JOIN collections ON collection_entries.collection_id = collections.id
                    WHERE collections.type_id > ?
        """.trimIndent(),
        arrayOf(LARGEST_PRIMITIVE_TYPE_ID.toString()) // only entity collections.
      ).map { it.getLong(0).toString() }.toSet()

      val usedRefs = (collectionRefs union singletonFieldRefs)
        .joinToString(separator = ", ", prefix = "", postfix = "")
      // Remove from all unused references.
      delete(
        TABLE_ENTITY_REFS,
        "id NOT IN ($usedRefs)",
        arrayOf()
      )
    }
  }

  override suspend fun runGarbageCollection() {
    val twoDaysAgo = JvmTime.currentTimeMillis - ArcsDuration.ofDays(2).toMillis()
    writableDatabase.transaction {
      val db = this
      // First, remove unused refs (leftovers from removed entities/fields).
      removeUnusedRefs(db)
      rawQuery(
        """
                    SELECT storage_key_id, storage_key, orphan, MAX(entity_refs.id) IS NULL AS noRef
                    FROM entities
                    LEFT JOIN storage_keys ON entities.storage_key_id = storage_keys.id
                    LEFT JOIN entity_refs ON entity_storage_key = storage_keys.storage_key
                    GROUP BY storage_key_id, storage_key, orphan
                    HAVING entities.creation_timestamp < $twoDaysAgo
                    AND storage_keys.storage_key NOT LIKE 'inline%'
                    AND (orphan OR noRef)
        """.trimIndent(),
        arrayOf()
      ).forEach {
        val storageKeyId = it.getLong(0)
        val storageKey = storageKeyManager.parse(it.getString(1))
        val orphan = it.getNullableBoolean(2) ?: false
        val noRef = it.getBoolean(3)
        if (orphan && noRef) {
          // Already marked as orphan, still not referenced, safe to delete.
          // TODO(#4889): Don't do this one-by-one, do a single delete query.
          delete(storageKey = storageKey, db = db)
          notifyClients(storageKey) { it.onDatabaseDelete(null) }
        }
        if (!orphan && noRef) {
          // Is not referenced, but not marked as orphan: mark as orphan, will be deleted
          // on the next round.
          update(
            TABLE_ENTITIES,
            ContentValues().apply {
              put("orphan", true)
            },
            "storage_key_id = ?",
            arrayOf(storageKeyId.toString())
          )
        }
        if (orphan && !noRef) {
          // Was marked orphan, but now has a reference, mark as not orphan.
          update(
            TABLE_ENTITIES,
            ContentValues().apply {
              put("orphan", false)
            },
            "storage_key_id = ?",
            arrayOf(storageKeyId.toString())
          )
        }
      }
    }
  }

  override suspend fun getSize(): Long {
    val pageCount = DatabaseUtils.longForQuery(
      readableDatabase, "PRAGMA page_count;", null
    )
    return pageCount * readableDatabase.pageSize
  }

  override suspend fun snapshotStatistics() = stats.snapshot()

  /** Deletes everything from the database. */
  override fun reset() {
    writableDatabase.transaction {
      TABLES.forEach { execSQL("DROP TABLE $it") }
      initializeDatabase(this)
      schemaTypeMap.lazySet(loadTypes())
    }
  }

  override suspend fun getAllHardReferenceIds(backingStorageKey: StorageKey): Set<String> {
    return readableDatabase.rawQuery(
      "SELECT entity_id FROM entity_refs WHERE backing_storage_key = ? AND is_hard_ref",
      arrayOf(backingStorageKey.toString())
    ).map { it.getString(0) }.toSet()
  }

  override suspend fun removeEntitiesHardReferencing(
    backingStorageKey: StorageKey,
    entityId: String
  ): Long {
    return writableDatabase.transaction {
      // Find all fields of reference type, which point to the given backing storage key and
      // entity id, and extract their entity_storage_key_id (entity which contains these
      // fields).
      val storageKeyIds = rawQuery(
        """
                SELECT
                    entity_storage_key_id,
                    CASE
                        WHEN fields.is_collection IN $VALUE_TABLE_FIELDS THEN field_values.value_id
                        ELSE collection_entries.value_id
                    END AS field_value_id
                FROM field_values
                LEFT JOIN fields
                    ON field_values.field_id = fields.id
                LEFT JOIN collection_entries
                    ON fields.is_collection IN $COLLECTION_FIELDS
                    AND collection_entries.collection_id = field_values.value_id
                LEFT JOIN entity_refs
                    ON fields.type_id > $LARGEST_PRIMITIVE_TYPE_ID
                    AND entity_refs.id = field_value_id
                WHERE entity_refs.backing_storage_key = ?
                AND entity_refs.entity_id = ?
                AND entity_refs.is_hard_ref
        """.trimIndent(),
        arrayOf(backingStorageKey.toString(), entityId)
      ).map { it.getInt(0) }

      // Clear regular entities as usual.
      val entitiesRemovedFirstPass = clearEntities(
        """
                SELECT id, storage_key
                FROM storage_keys
                WHERE id IN (${storageKeyIds.joinToString()})
                AND storage_key NOT LIKE 'inline%'
                """
      ).toLong()

      // For inline entities, we find the root entity first, and clear starting from those.
      val topLevelStorageKeys = rawQuery(
        """
                SELECT storage_key
                FROM storage_keys
                WHERE id IN (${storageKeyIds.joinToString()})
                AND storage_key LIKE 'inline%'
        """.trimIndent(),
        arrayOf()
      ).map { InlineStorageKey.getTopLevelKey(it.getString(0)) }.toSet()

      // Make sure we respect the sqlite parameter size limit.
      val entitiesRemovedSecondPass = topLevelStorageKeys.chunked(MAX_PLACEHOLDERS).map { chunk ->
        clearEntities(
          """
                SELECT id, storage_key
                FROM storage_keys
                WHERE storage_key IN (${chunk.joinToString { "?" }})
                """,
          args = chunk.toTypedArray()
        )
      }.sum()

      // Make sure we remove also the corresponding entity_refs entries, to remove every copy of the
      // ID.
      removeUnusedRefs(this)

      entitiesRemovedSecondPass + entitiesRemovedFirstPass
    }
  }

  override suspend fun removeAllEntities() {
    // Filter by creation_timestamp to exclude inline entities (those are handled inside
    // clearEntities).
    clearEntities(
      """
            SELECT storage_key_id, storage_key
            FROM entities
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id
            WHERE storage_keys.storage_key NOT LIKE 'inline%'
            """
    )
  }

  override suspend fun removeEntitiesCreatedBetween(startTimeMillis: Long, endTimeMillis: Long) {
    clearEntities(
      """
            SELECT storage_key_id, storage_key
            FROM entities
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id
            WHERE creation_timestamp >= $startTimeMillis
            AND creation_timestamp <= $endTimeMillis
            AND storage_keys.storage_key NOT LIKE 'inline%'
            """
    )
  }

  override suspend fun getEntitiesCount(): Long {
    return DatabaseUtils.queryNumEntries(readableDatabase, TABLE_ENTITIES)
  }

  override suspend fun removeExpiredEntities() {
    val nowMillis = JvmTime.currentTimeMillis

    // Find expired references. Run this before cleaning expired entities as the clearEntities
    // method will notify containers with missing refs.
    writableDatabase.transaction {
      delete(
        TABLE_ENTITY_REFS,
        "expiration_timestamp > -1 AND expiration_timestamp < ?",
        arrayOf(nowMillis.toString())
      )
    }

    val query = """
            SELECT storage_key_id, storage_key
            FROM entities
            LEFT JOIN storage_keys
                ON entities.storage_key_id = storage_keys.id
            WHERE expiration_timestamp > -1 AND expiration_timestamp < $nowMillis
            AND storage_keys.storage_key NOT LIKE 'inline%'
        """
    clearEntities(query)
  }

  /*
   * Clear entities obtained by the given query. The query should return pairs of
   * (storage_key_id, storage_key) from the storage_keys table. This method will delete all fields
   * for those entities and remove references pointing to them. It also notifies client listening
   * for any updated storage key.
   *
   * @return the number of entities removed.
   */
  private suspend fun clearEntities(
    query: String,
    entitiesAreTopLevel: Boolean = true,
    args: Array<String> = arrayOf()
  ): Int {
    return writableDatabase.transaction {
      val db = this
      // Query the storage_keys table with the given query.
      val storageKeyIdsPairs = rawQuery(query.trimIndent(), args)
        .map { it.getLong(0) to it.getString(1) }.toSet()
      val storageKeyIds = storageKeyIdsPairs.map { it.first.toString() }.toTypedArray()
      val storageKeys = storageKeyIdsPairs.map { it.second }

      /**
       * We can't just return here if there are no storageKeyIds, because this code path
       * is also used to clear expired references.
       */
      if (storageKeyIds.isNotEmpty()) {
        /**
         * Entities can be nested either as singletons or as collections. The following
         * two clearEntities recursions cover each case respectively.
         */
        val nestedEntitySingletonQuery =
          """
                        SELECT
                            field_values.value_id,
                            storage_key
                        FROM field_values
                        INNER JOIN fields
                            ON field_values.field_id = fields.id
                            AND fields.is_collection = ${FieldClass.InlineEntity.ordinal}
                            AND field_values.entity_storage_key_id IN (${storageKeyIds.joinToString()})
                        INNER JOIN storage_keys
                            ON field_values.value_id = storage_keys.id
          """.trimIndent()
        clearEntities(nestedEntitySingletonQuery, false)

        val nestedEntityCollectionQuery =
          """
                        SELECT
                            collection_entries.value_id,
                            storage_key
                        FROM field_values
                        INNER JOIN fields
                            ON field_values.field_id = fields.id
                            AND fields.is_collection IN $INLINE_ENTITY_COLLECTIONS
                            AND field_values.entity_storage_key_id IN (${storageKeyIds.joinToString()})
                        INNER JOIN collection_entries
                            ON field_values.value_id = collection_entries.collection_id
                        INNER JOIN storage_keys
                            ON collection_entries.value_id = storage_keys.id
          """.trimIndent()
        clearEntities(nestedEntityCollectionQuery, false)

        deleteFields(storageKeyIds, db)

        if (!entitiesAreTopLevel) {
          delete(
            TABLE_ENTITIES,
            "storage_key_id IN (${storageKeyIds.joinToString()})",
            arrayOf()
          )
          delete(
            TABLE_STORAGE_KEYS,
            "id IN (${storageKeyIds.joinToString()})",
            arrayOf()
          )
        }
      }

      // Clean up unused values as they can contain sensitive data.
      // This query will return all field value ids being referenced by collection or
      // singleton fields.
      fun usedFieldIdsQuery(typeIds: List<Int>) =
        """
                    SELECT
                        CASE
                            WHEN fields.is_collection IN $VALUE_TABLE_FIELDS THEN field_values.value_id
                            ELSE collection_entries.value_id
                        END AS field_value_id
                    FROM field_values
                    LEFT JOIN fields
                        ON field_values.field_id = fields.id
                    LEFT JOIN collection_entries
                        ON fields.is_collection IN $COLLECTION_FIELDS
                        AND collection_entries.collection_id = field_values.value_id
                    WHERE fields.type_id in (${typeIds.map { it.toString() }.joinToString()})
        """.trimIndent()

      delete(
        TABLE_NUMBER_PRIMITIVES,
        "id NOT IN (${usedFieldIdsQuery(TYPES_IN_NUMBER_TABLE)})",
        arrayOf()
      )
      delete(
        TABLE_TEXT_PRIMITIVES,
        "id NOT IN (${usedFieldIdsQuery(TYPES_IN_TEXT_TABLE)})",
        arrayOf()
      )

      // Remove all references to these entities.
      batchDelete(
        TABLE_ENTITY_REFS,
        { questionMarks -> "entity_storage_key IN ($questionMarks)" },
        storageKeys
      )

      if (entitiesAreTopLevel) {
        // Find all collections with missing entries (collections that were updated).
        val updatedContainersStorageKeys = rawQuery(
          """
                        SELECT storage_keys.storage_key
                        FROM storage_keys
                        LEFT JOIN collection_entries
                            ON storage_keys.value_id = collection_entries.collection_id
                        WHERE storage_keys.data_type IN (?, ?)
                        AND collection_entries.value_id NOT IN (SELECT id FROM entity_refs)
          """.trimIndent(),
          arrayOf(
            DataType.Singleton.ordinal.toString(),
            DataType.Collection.ordinal.toString()
          )
        ).map { it.getString(0) }.toSet()

        // Remove from collection_entries (for top level collections) all references to the
        // expired entities.
        delete(
          TABLE_COLLECTION_ENTRIES,
          """
                        collection_id IN (SELECT id FROM collections
                                          WHERE type_id > ? AND version_map IS NOT NULL)
                        AND value_id NOT IN (SELECT id FROM entity_refs)
          """.trimIndent(),
          arrayOf(LARGEST_PRIMITIVE_TYPE_ID.toString()) // only entity collections.
        )

        (storageKeys union updatedContainersStorageKeys).map { storageKey ->
          notifyClients(storageKeyManager.parse(storageKey)) {
            it.onDatabaseDelete(null)
          }
        }
      }
      storageKeyIdsPairs.size
    }
  }

  private fun deleteFields(storageKeyIds: Array<String>, db: SQLiteDatabase) = db.transaction {
    // Find collection ids for collection fields of the expired entities.
    val collectionIdsToDelete = rawQuery(
      """
                SELECT collection_id
                FROM fields
                LEFT JOIN field_values
                    ON field_values.field_id = fields.id
                LEFT JOIN collection_entries
                    ON fields.is_collection IN $COLLECTION_FIELDS
                    AND collection_entries.collection_id = field_values.value_id
                WHERE fields.is_collection IN $COLLECTION_FIELDS
                    AND field_values.entity_storage_key_id IN (${storageKeyIds.joinToString()})
      """.trimIndent(),
      emptyArray()
    ).map { it.getLong(0).toString() }.toSet()

    // Remove entries for those collections.
    batchDelete(
      TABLE_COLLECTION_ENTRIES,
      { questionMarks -> "collection_id IN ($questionMarks)" },
      collectionIdsToDelete
    )
    // Remove those collections.
    batchDelete(
      TABLE_COLLECTIONS,
      { questionMarks -> "id IN ($questionMarks)" },
      collectionIdsToDelete
    )

    // Remove field values for all expired entities.
    batchDelete(
      TABLE_FIELD_VALUES,
      { questionMarks -> "entity_storage_key_id IN ($questionMarks)" },
      storageKeyIds.toSet()
    )
  }

  private fun getSchemaHash(typeId: Int, db: SQLiteDatabase): String =
    db.rawQuery("SELECT name FROM types WHERE id = ?", arrayOf(typeId.toString()))
      .forSingleResult {
        it.getString(0)
          ?: throw IllegalArgumentException(
            "Attempted to extract schema hash for invalid typeId $typeId"
          )
      }!!

  @VisibleForTesting
  suspend fun getSchemaTypeId(
    schema: Schema,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): TypeId = db.transaction {
    var cacheHit = false
    val schemaTypeId = schemaTypeMap.updateAndGet { currentMap ->
      currentMap[schema.hash]?.let {
        cacheHit = true
        return@updateAndGet currentMap
      }
      cacheHit = false
      val content = ContentValues().apply {
        put("name", schema.hash)
        put("is_primitive", false)
      }
      insertWithOnConflict(
        TABLE_TYPES,
        null,
        content,
        SQLiteDatabase.CONFLICT_IGNORE
      )
      val id = rawQuery("SELECT id FROM types WHERE name = ?", arrayOf(schema.hash))
        .forSingleResult { it.getLong(0) }!!
      currentMap + (schema.hash to id)
    }.get(schema.hash) ?: throw IllegalStateException(
      "Unable to find or create a type ID for schema with hash: ${schema.hash}"
    )

    if (cacheHit) {
      counters?.increment(DatabaseCounters.ENTITY_SCHEMA_CACHE_HIT)
      return@transaction schemaTypeId
    } else {
      counters?.increment(DatabaseCounters.ENTITY_SCHEMA_CACHE_MISS)
      counters?.increment(DatabaseCounters.INSERT_ENTITY_TYPE_ID)
    }

    val insertFieldStatement = compileStatement(
      """
                INSERT INTO fields (type_id, parent_type_id, name, is_collection)
                VALUES (?, ?, ?, ?)
      """.trimIndent()
    )

    suspend fun insertFieldBlock(
      fieldName: String,
      fieldType: FieldType,
      isCollection: FieldClass
    ) {
      counters?.increment(DatabaseCounters.INSERT_ENTITY_FIELD)
      insertFieldStatement.apply {
        bindLong(1, getTypeId(fieldType, db))
        bindLong(2, schemaTypeId)
        bindString(3, fieldName)
        bindLong(4, isCollection.ordinal.toLong())
        executeInsert()
      }
    }
    schema.fields.singletons.forEach { (fieldName, fieldType) ->
      val fieldClass = when (fieldType.tag) {
        FieldType.Tag.List -> {
          require(fieldType is FieldType.ListOf) {
            "FieldType with List tag is not a list!"
          }
          when (fieldType.primitiveType) {
            is FieldType.InlineEntity -> FieldClass.InlineEntityList
            else -> FieldClass.List
          }
        }
        FieldType.Tag.InlineEntity -> FieldClass.InlineEntity
        else -> FieldClass.Singleton
      }
      insertFieldBlock(fieldName, fieldType, fieldClass)
    }
    schema.fields.collections.forEach { (fieldName, fieldType) ->
      val fieldClass = when (fieldType.tag) {
        FieldType.Tag.InlineEntity -> FieldClass.InlineEntityCollection
        else -> FieldClass.Collection
      }
      insertFieldBlock(fieldName, fieldType, fieldClass)
    }
    schemaTypeId
  }

  /**
   * Creates a new storage key ID for the given entity [StorageKey]. If one already exists, it and
   * all data for the existing entity are deleted first before creating a new one.
   *
   * @returns the new storage key ID for the entity if one was successfully created, or null
   *     otherwise (e.g. if the given version number was too low)
   */
  @VisibleForTesting
  suspend fun createEntityStorageKeyId(
    storageKey: StorageKey,
    entityId: String,
    creationTimestamp: Long,
    expirationTimestamp: Long,
    typeId: TypeId,
    versionMap: VersionMap,
    databaseVersion: Int,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): StorageKeyId? = db.transaction {
    // TODO(#4889): Use an LRU cache.
    counters?.increment(DatabaseCounters.GET_ENTITY_STORAGEKEY_ID)
    rawQuery(
      """
                SELECT
                    storage_keys.data_type,
                    entities.entity_id,
                    entities.version_number
                FROM storage_keys
                LEFT JOIN entities ON storage_keys.id = entities.storage_key_id
                WHERE storage_keys.storage_key = ?
      """.trimIndent(),
      arrayOf(storageKey.toString())
    ).forSingleResult {
      // Check existing entry for the storage key.
      val dataType = DataType.values()[it.getInt(0)]
      require(dataType == DataType.Entity) {
        "Expected storage key $storageKey to be an Entity, instead was $dataType."
      }
      val storedEntityId = it.getString(1)
      require(storedEntityId == entityId) {
        "Expected storage key $storageKey to have entity ID $entityId but was " +
          "$storedEntityId."
      }
      // Inline entities are covered by the version stored with their
      // parent entity and don't need to be separately gated by version.
      if (storageKey !is InlineStorageKey) {
        val storedVersion = it.getInt(2)
        if (databaseVersion != storedVersion + 1) {
          return@transaction null
        }
      }

      // Remove the existing entity.
      this@DatabaseImpl.delete(storageKey, db)
    }

    // Insert storage key.
    counters?.increment(DatabaseCounters.INSERT_ENTITY_STORAGEKEY)
    val storageKeyId = insertOrThrow(
      TABLE_STORAGE_KEYS,
      null,
      ContentValues().apply {
        put("storage_key", storageKey.toString())
        put("data_type", DataType.Entity.ordinal)
        put("value_id", typeId)
      }
    )

    // Insert entity ID.
    counters?.increment(DatabaseCounters.INSERT_ENTITY_RECORD)
    insertOrThrow(
      TABLE_ENTITIES,
      null,
      ContentValues().apply {
        put("storage_key_id", storageKeyId)
        put("entity_id", entityId)
        put("creation_timestamp", creationTimestamp)
        put("expiration_timestamp", expirationTimestamp)
        put("version_map", versionMap.toProtoLiteral())
        put("version_number", databaseVersion)
      }
    )

    storageKeyId
  }

  @VisibleForTesting
  fun getEntityReferenceId(
    reference: Reference,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): ReferenceId = db.transaction {
    counters?.increment(DatabaseCounters.GET_ENTITY_REFERENCE)
    val withoutVersionMap =
      """
                SELECT id
                FROM entity_refs
                WHERE entity_id = ? AND backing_storage_key = ? AND version_map IS NULL
                    AND creation_timestamp = ? AND expiration_timestamp = ?
                    AND is_hard_ref = ?
      """.trimIndent() to arrayOf(
        reference.id,
        reference.storageKey.toString(),
        reference.creationTimestamp.toString(),
        reference.expirationTimestamp.toString(),
        reference.isHardReference.toQueryString()
      )
    val withVersionMap =
      """
                SELECT id
                FROM entity_refs
                WHERE entity_id = ? AND backing_storage_key = ? AND version_map = ?
                    AND creation_timestamp = ? AND expiration_timestamp = ?
                    AND is_hard_ref = ?
      """.trimIndent() to arrayOf(
        reference.id,
        reference.storageKey.toString(),
        reference.version?.toProtoLiteral(),
        reference.creationTimestamp.toString(),
        reference.expirationTimestamp.toString(),
        reference.isHardReference.toQueryString()
      )

    val refId = (reference.version?.let { withVersionMap } ?: withoutVersionMap)
      .let { rawQuery(it.first, it.second) }
      .forSingleResult { it.getLong(0) }

    refId ?: run {
      counters?.increment(DatabaseCounters.INSERT_ENTITY_REFERENCE)
      insertOrThrow(
        TABLE_ENTITY_REFS,
        null,
        ContentValues().apply {
          put("entity_id", reference.id)
          put("creation_timestamp", reference.creationTimestamp)
          put("expiration_timestamp", reference.expirationTimestamp)
          put("backing_storage_key", reference.storageKey.toString())
          put("entity_storage_key", reference.referencedStorageKey().toString())
          put("is_hard_ref", reference.isHardReference)
          reference.version?.let {
            put("version_map", it.toProtoLiteral())
          } ?: run {
            putNull("version_map")
          }
        }
      )
    }
  }

  @VisibleForTesting
  fun getCollectionMetadata(
    storageKey: StorageKey,
    expectedDataType: DataType,
    db: SQLiteDatabase
  ): CollectionMetadata? =
    db.rawQuery(
      """
                SELECT
                    storage_keys.data_type,
                    collections.id,
                    collections.version_map,
                    collections.version_number
                FROM storage_keys
                LEFT JOIN collections ON collections.id = storage_keys.value_id
                WHERE storage_keys.storage_key = ?
      """.trimIndent(),
      arrayOf(storageKey.toString())
    ).forSingleResult {
      val dataType = DataType.values()[it.getInt(0)]
      val collectionId = it.getLong(1)
      require(dataType == expectedDataType) {
        "Expected storage key $storageKey to be a $expectedDataType but was a $dataType."
      }
      val versionMap = requireNotNull(it.getVersionMap(2)) {
        "Expected a version map for the collection at $storageKey"
      }
      val versionNumber = it.getInt(3)
      CollectionMetadata(collectionId, versionMap, versionNumber)
    }

  private fun getCollectionReferenceEntries(
    collectionId: CollectionId,
    db: SQLiteDatabase
  ): Set<ReferenceWithVersion> = db.rawQuery(
    """
            SELECT
                entity_refs.entity_id,
                entity_refs.creation_timestamp,
                entity_refs.expiration_timestamp,
                entity_refs.backing_storage_key,
                entity_refs.version_map,
                collection_entries.version_map
            FROM collection_entries
            JOIN entity_refs ON collection_entries.value_id = entity_refs.id
            WHERE collection_entries.collection_id = ?
    """.trimIndent(),
    arrayOf(collectionId.toString())
  ).map {
    ReferenceWithVersion(
      Reference(
        id = it.getString(0),
        storageKey = storageKeyManager.parse(it.getString(3)),
        version = it.getVersionMap(4),
        _creationTimestamp = it.getLong(1),
        _expirationTimestamp = it.getLong(2)
      ),
      it.getVersionMap(5)!!
    )
  }.toSet()

  /** Returns true if the given [TypeId] represents a primitive type. */
  private fun isPrimitiveType(typeId: TypeId) = typeId <= LARGEST_PRIMITIVE_TYPE_ID

  /**
   * Returns a map of field name to field ID and type ID, for each field in the given schema
   * [TypeId].
   *
   * Call [getSchemaTypeId] first to get the [TypeId].
   */
  @VisibleForTesting
  fun getSchemaFields(
    schemaTypeId: TypeId,
    db: SQLiteDatabase
  ): Map<FieldName, SchemaField> {
    // TODO(#4889): Use an LRU cache.
    val fields = mutableMapOf<FieldName, SchemaField>()
    db.rawQuery(
      "SELECT name, id, type_id, is_collection FROM fields WHERE parent_type_id = ?",
      arrayOf(schemaTypeId.toString())
    ).forEach {
      fields[it.getString(0)] = SchemaField(
        fieldName = it.getString(0),
        fieldId = it.getLong(1),
        typeId = it.getLong(2),
        isCollection = FieldClass.fromOrdinal(it.getInt(3))
      )
    }
    return fields
  }

  /**
   * Returns the ID of the given value from the appropriate primitive table.
   *
   * Booleans don't have a primitive table, they will just be returned as either 0 or 1.
   */
  @VisibleForTesting
  fun getPrimitiveValueId(
    primitiveValue: Referencable,
    typeId: TypeId,
    db: SQLiteDatabase,
    counters: Counters? = null
  ): FieldValueId {
    require(primitiveValue is ReferencablePrimitive<*>) {
      "Expected value to be a ReferencablePrimitive but was $primitiveValue."
    }
    val value = primitiveValue.value
    // TODO(#4889): Cache the most frequent values somehow.
    when (typeId.toInt()) {
      PrimitiveType.Boolean.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        return when (value) {
          true -> 1
          false -> 0
          else -> throw IllegalArgumentException("Expected value to be a Boolean.")
        }
      }
      PrimitiveType.Byte.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        require(value is Byte) { "Expected value to be a Byte." }
        return value.toLong()
      }
      PrimitiveType.Short.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        require(value is Short) { "Expected value to be a Short." }
        return value.toLong()
      }
      PrimitiveType.Int.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        require(value is Int) { "Expected value to be an Int." }
        return value.toLong()
      }
      PrimitiveType.Long.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        require(value is Long) { "Expected value to be a Long." }
        return value
      }
      PrimitiveType.Char.id -> {
        counters?.increment(DatabaseCounters.GET_INLINE_VALUE_ID)
        require(value is Char) { "Expected value to be a Char." }
        return value.toLong()
      }
    }
    return db.transaction {
      val (tableName, valueStr) = when (typeId.toInt()) {
        PrimitiveType.Text.id -> {
          require(value is String) { "Expected value to be a String." }
          counters?.increment(DatabaseCounters.GET_TEXT_VALUE_ID)
          TABLE_TEXT_PRIMITIVES to value
        }
        PrimitiveType.BigInt.id -> {
          // TODO(https://github.com/PolymerLabs/arcs/issues/5867): To avoid
          // lexicographic ordering, ArcsInstant and BigInt should be compared as numeric
          // values rather than strings.
          require(value is BigInt) { "Expected value to be a BigInt" }
          counters?.increment(DatabaseCounters.GET_TEXT_VALUE_ID)
          TABLE_TEXT_PRIMITIVES to value.toString()
        }
        PrimitiveType.Instant.id -> {
          // TODO(https://github.com/PolymerLabs/arcs/issues/5867): To avoid
          // lexicographic ordering, ArcsInstant and BigInt should be compared as numeric
          // values rather than strings.
          require(value is ArcsInstant) {
            "Expected value to be a ArcsInstant, got $value"
          }
          counters?.increment(DatabaseCounters.GET_TEXT_VALUE_ID)
          TABLE_TEXT_PRIMITIVES to value.toEpochMilli().toString()
        }
        PrimitiveType.Number.id -> {
          require(value is Double) { "Expected value to be a Double." }
          counters?.increment(DatabaseCounters.GET_NUMBER_VALUE_ID)
          TABLE_NUMBER_PRIMITIVES to value.toString()
        }
        PrimitiveType.Float.id -> {
          require(value is Float) { "Expected value to be a Float." }
          counters?.increment(DatabaseCounters.GET_NUMBER_VALUE_ID)
          TABLE_NUMBER_PRIMITIVES to value.toString()
        }
        PrimitiveType.Double.id -> {
          require(value is Double) { "Expected value to be a Double." }
          counters?.increment(DatabaseCounters.GET_NUMBER_VALUE_ID)
          TABLE_NUMBER_PRIMITIVES to value.toString()
        }
        else -> throw IllegalArgumentException("Not a primitive type ID: $typeId")
      }
      val fieldValueId = rawQuery(
        "SELECT id FROM $tableName WHERE value = ?", arrayOf(valueStr)
      ).forSingleResult { it.getLong(0) }
      fieldValueId ?: run {
        when (tableName) {
          TABLE_TEXT_PRIMITIVES ->
            counters?.increment(DatabaseCounters.INSERT_TEXT_VALUE)
          TABLE_NUMBER_PRIMITIVES ->
            counters?.increment(DatabaseCounters.INSERT_NUMBER_VALUE)
        }
        insertOrThrow(
          tableName,
          null,
          ContentValues().apply {
            put("value", valueStr)
          }
        )
      }
    }
  }

  /** Returns the type ID for the given [fieldType] if known, otherwise throws. */
  private suspend fun getTypeId(
    fieldType: FieldType,
    database: SQLiteDatabase
  ): TypeId = when (fieldType) {
    is FieldType.Primitive -> fieldType.primitiveType.primitiveTypeId()
    is FieldType.EntityRef -> {
      val schema = SchemaRegistry.getSchema(fieldType.schemaHash)
      getSchemaTypeId(schema, database)
    }
    // TODO(b/156003617)
    is FieldType.Tuple ->
      throw NotImplementedError("[FieldType.Tuple]s not currently supported.")
    is FieldType.ListOf -> getTypeId(fieldType.primitiveType, database)
    is FieldType.InlineEntity -> {
      val schema = SchemaRegistry.getSchema(fieldType.schemaHash)
      getSchemaTypeId(schema, database)
    }
  }

  /** Test-only version of [getTypeId]. */
  @VisibleForTesting
  suspend fun getTypeIdForTest(fieldType: FieldType) =
    getTypeId(fieldType, writableDatabase)

  /** Loads all schema type IDs from the 'types' table into memory. */
  private fun loadTypes(): Map<String, TypeId> {
    val typeMap = mutableMapOf<String, TypeId>()
    readableDatabase.rawQuery(
      "SELECT name, id FROM types WHERE is_primitive = 0",
      emptyArray()
    ).forEach {
      val hash = it.getString(0)
      val id = it.getLong(1)
      typeMap[hash] = id
    }
    return typeMap
  }

  private suspend fun notifyClients(
    storageKey: StorageKey,
    action: suspend (DatabaseClient) -> Unit
  ): Job {
    return clientFlow.filter { it.storageKey == storageKey }
      .onEach(action)
      .launchIn(CoroutineScope(coroutineContext))
  }

  @VisibleForTesting(otherwise = VisibleForTesting.NONE)
  fun dumpCursor(cursor: Cursor) {
    val header = cursor.columnNames.joinToString(" | ", "| ", " |")
    val border = "-".repeat(header.length)
    println(border)
    println(header)
    println(border)

    while (cursor.moveToNext()) {
      println(
        (0 until cursor.columnCount).joinToString(" | ", "| ", " |") { col ->
          when (cursor.getType(col)) {
            Cursor.FIELD_TYPE_BLOB -> cursor.getBlob(col).toString()
            else -> if (cursor.isNull(col)) "NULL" else cursor.getString(col)
          }
        }
      )
    }
    println(border)
  }

  @VisibleForTesting(otherwise = VisibleForTesting.NONE)
  fun dumpTables(vararg tableNames: String, db: SQLiteDatabase? = null) {
    tableNames.forEach { tableName ->
      println("\nDumping table \"$tableName\":")
      (db ?: readableDatabase).rawQuery("SELECT * FROM $tableName", arrayOf())
        .use { dumpCursor(it) }
    }
  }

  @VisibleForTesting(otherwise = VisibleForTesting.NONE)
  fun dumpAllTables() = dumpTables(*TABLES)

  // Returns a string representation of the boolean that can be used when querying boolean fields.
  private fun Boolean.toQueryString() = if (this) "1" else "0"

  /** Returns a base-64 string representation of the [VersionMapProto] for this [VersionMap]. */
  // TODO(#4889): Find a way to store raw bytes as BLOBs, rather than having to base-64 encode.
  private fun VersionMap.toProtoLiteral() =
    Base64.encodeToString(toProto().toByteArray(), Base64.DEFAULT)

  /** Parses a [VersionMap] out of the [Cursor] for the given column. */
  private fun Cursor.getVersionMap(column: Int): VersionMap? {
    if (isNull(column)) return null

    val str = getString(column)
    val bytes = Base64.decode(str, Base64.DEFAULT)
    val proto: VersionMapProto
    try {
      proto = VersionMapProto.parseFrom(bytes)
    } catch (e: InvalidProtocolBufferException) {
      // TODO(b/160251910): Make logging detail more cleanly conditional.
      log.debug(e) { "Parsing serialized VersionMap \"$str\"." }
      log.info { "Failed to parse serialized version map." }
      throw e
    }
    return fromProto(proto)
  }

  /** The type of the data stored at a storage key. */
  @VisibleForTesting
  enum class DataType {
    Entity,
    Singleton,
    Collection
  }

  /** The class of a non-primitive field.*/
  enum class FieldClass {
    Singleton,
    Collection,
    List,
    InlineEntity,
    InlineEntityCollection,
    InlineEntityList;

    companion object {
      fun fromOrdinal(ordinal: Int) = when (ordinal) {
        0 -> FieldClass.Singleton
        1 -> FieldClass.Collection
        2 -> FieldClass.List
        3 -> FieldClass.InlineEntity
        4 -> FieldClass.InlineEntityCollection
        5 -> FieldClass.InlineEntityList
        else -> throw IllegalStateException(
          "Invalid value $ordinal for FieldClass stored in isCollection field."
        )
      }
    }
  }

  @VisibleForTesting
  data class SchemaField(
    val fieldName: String,
    val fieldId: FieldId,
    val typeId: TypeId,
    val isCollection: FieldClass
  )

  @VisibleForTesting
  data class CollectionMetadata(
    val collectionId: CollectionId,
    val versionMap: VersionMap,
    val versionNumber: Int
  )

  companion object {
    @VisibleForTesting
    const val DB_VERSION = 6

    private const val TABLE_STORAGE_KEYS = "storage_keys"
    private const val TABLE_COLLECTION_ENTRIES = "collection_entries"
    private const val TABLE_COLLECTIONS = "collections"
    private const val TABLE_ENTITIES = "entities"
    private const val TABLE_ENTITY_REFS = "entity_refs"
    private const val TABLE_FIELDS = "fields"
    private const val TABLE_FIELD_VALUES = "field_values"
    private const val TABLE_TYPES = "types"
    private const val TABLE_TEXT_PRIMITIVES = "text_primitive_values"
    private const val TABLE_NUMBER_PRIMITIVES = "number_primitive_values"

    @VisibleForTesting
    val TABLES = arrayOf(
      TABLE_STORAGE_KEYS,
      TABLE_COLLECTION_ENTRIES,
      TABLE_COLLECTIONS,
      TABLE_ENTITIES,
      TABLE_ENTITY_REFS,
      TABLE_FIELDS,
      TABLE_FIELD_VALUES,
      TABLE_TYPES,
      TABLE_TEXT_PRIMITIVES,
      TABLE_NUMBER_PRIMITIVES
    )

    private val CREATE_VERSION_3 =
      """
                CREATE TABLE types (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE, -- Either a primitive type name or a schema hash.
                    is_primitive INTEGER NOT NULL DEFAULT 0
                );

                CREATE INDEX type_name_index ON types (name, id);

                CREATE TABLE storage_keys (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    storage_key TEXT UNIQUE NOT NULL,
                    -- The kind of data stored at this storage key. See DataType enum for values.
                    data_type INTEGER NOT NULL,
                    -- For entities: points to type_id in types table.
                    -- For singletons and collections: points to collection_id in collections table.
                    value_id INTEGER NOT NULL
                );

                CREATE INDEX storage_key_index ON storage_keys (storage_key, id);

                -- Maps entity storage key IDs to entity IDs (Arcs string ID, not a row ID).
                CREATE TABLE entities (
                    -- Points to id in storage_keys table.
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    -- The Arcs entity ID.
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the entity.
                    version_map TEXT NOT NULL,
                    -- Monotonically increasing version number for the entity.
                    version_number INTEGER NOT NULL,
                    -- Whether the entity was found to have any reference to it during the last
                    -- garbage collection cycle (if orphan=1, then it did not have references).
                    orphan INTEGER
                );

                -- Stores references to entities.
                CREATE TABLE entity_refs (
                    -- Unique ID in this table.
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- The ID for the entity (Arcs string ID, not a row ID).
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- The storage key for the backing store for this entity.
                    backing_storage_key TEXT NOT NULL,
                    -- Serialized VersionMapProto for the reference, if available.
                    version_map TEXT,
                    -- Storage key of the referenced entity.
                    entity_storage_key TEXT
                );

                CREATE INDEX entity_refs_index ON entity_refs (
                    entity_id,
                    backing_storage_key,
                    version_map
                );

                -- Name is a bit of a misnomer. Defines both collections and singletons.
                CREATE TABLE collections (
                    id INTEGER NOT NULL PRIMARY KEY,
                    -- Type of the elements stored in the collection/singleton.
                    type_id INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_map TEXT,
                    -- Monotonically increasing version number for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_number INTEGER
                );

                -- Entries in a collection/singleton. (Singletons will have only a single row.)
                CREATE TABLE collection_entries (
                    collection_id INTEGER NOT NULL,
                    -- For collections of primitives: value_id for primitive in collection.
                    -- For collections of inline entities: storage_key_id of entity.
                    -- For collections/singletons of (references to) entities: id of reference in
                    --   entity_refs table.
                    value_id INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the entry in this collection/singleton
                    -- (version at which the entry was added to the collection).
                    -- (Not required for entity field collections but required for top level
                    -- collections.)
                    version_map TEXT
                );

                CREATE INDEX collection_entries_collection_id_index
                ON collection_entries (collection_id);

                -- Fields in an entity.
                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- Points to id in types table.
                    type_id INTEGER NOT NULL,
                    -- The type id (types table) of the parent (eg if this is a field in an entity,
                    -- the type id of that entity).
                    parent_type_id INTEGER NOT NULL,
                    -- Name of the field.
                    name TEXT NOT NULL,
                    -- The class of this field: see FieldClass enum for values.
                    is_collection INTEGER NOT NULL
                );

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name);

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    -- Points to id field in fields table
                    field_id INTEGER NOT NULL,
                    -- For singleton primitive fields: id in primitive value table (the type_id in
                    -- the corresponding fields table determine which primitive value table to use).
                    -- For booleans this is the boolean value as 0/1.
                    -- For singleton entity references: id in entity_refs table.
                    -- for singleton inline entities: storage_key_id of entity.
                    -- For collections of anything: collection_id.
                    value_id INTEGER
                );

                CREATE INDEX field_values_by_entity_storage_key
                ON field_values (entity_storage_key_id, value_id);

                CREATE TABLE text_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE
                );

                CREATE INDEX text_primitive_value_index ON text_primitive_values (value);

                CREATE TABLE number_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value REAL NOT NULL UNIQUE
                );

                CREATE INDEX number_primitive_value_index ON number_primitive_values (value);
      """.trimIndent().split("\n\n")

    // Adds the is_hard_ref field to the entity_refs table.
    private val CREATE_VERSION_6 =
      """
                CREATE TABLE types (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE, -- Either a primitive type name or a schema hash.
                    is_primitive INTEGER NOT NULL DEFAULT 0
                );

                CREATE INDEX type_name_index ON types (name, id);

                CREATE TABLE storage_keys (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    storage_key TEXT UNIQUE NOT NULL,
                    -- The kind of data stored at this storage key. See DataType enum for values.
                    data_type INTEGER NOT NULL,
                    -- For entities: points to type_id in types table.
                    -- For singletons and collections: points to collection_id in collections table.
                    value_id INTEGER NOT NULL
                );

                CREATE INDEX storage_key_index ON storage_keys (storage_key, id);

                -- Maps entity storage key IDs to entity IDs (Arcs string ID, not a row ID).
                CREATE TABLE entities (
                    -- Points to id in storage_keys table.
                    storage_key_id INTEGER NOT NULL PRIMARY KEY,
                    -- The Arcs entity ID.
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the entity.
                    version_map TEXT NOT NULL,
                    -- Monotonically increasing version number for the entity.
                    version_number INTEGER NOT NULL,
                    -- Whether the entity was found to have any reference to it during the last
                    -- garbage collection cycle (if orphan=1, then it did not have references).
                    orphan INTEGER
                );

                -- Stores references to entities.
                CREATE TABLE entity_refs (
                    -- Unique ID in this table.
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- The ID for the entity (Arcs string ID, not a row ID).
                    entity_id TEXT NOT NULL,
                    creation_timestamp INTEGER NOT NULL,
                    expiration_timestamp INTEGER NOT NULL,
                    -- The storage key for the backing store for this entity.
                    backing_storage_key TEXT NOT NULL,
                    -- Serialized VersionMapProto for the reference, if available.
                    version_map TEXT,
                    -- Storage key of the referenced entity.
                    entity_storage_key TEXT,
                    -- For reference fields, whether this is an hard reference (propagates deletes).
                    is_hard_ref INTEGER
                );

                CREATE INDEX entity_refs_index ON entity_refs (
                    entity_id,
                    backing_storage_key,
                    version_map
                );

                -- Name is a bit of a misnomer. Defines both collections and singletons.
                CREATE TABLE collections (
                    id INTEGER NOT NULL PRIMARY KEY,
                    -- Type of the elements stored in the collection/singleton.
                    type_id INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_map TEXT,
                    -- Monotonically increasing version number for the collection/singleton.
                    -- (Not required for entity field collections.)
                    version_number INTEGER
                );

                -- Entries in a collection/singleton. (Singletons will have only a single row.)
                CREATE TABLE collection_entries (
                    collection_id INTEGER NOT NULL,
                    -- For collections of primitives: value_id for primitive in collection.
                    -- For collections of inline entities: storage_key_id of entity.
                    -- For collections/singletons of (references to) entities: id of reference in
                    --   entity_refs table.
                    value_id INTEGER NOT NULL,
                    -- Serialized VersionMapProto for the entry in this collection/singleton
                    -- (version at which the entry was added to the collection).
                    -- (Not required for entity field collections but required for top level
                    -- collections.)
                    version_map TEXT
                );

                CREATE INDEX collection_entries_collection_id_index
                ON collection_entries (collection_id);

                -- Fields in an entity.
                CREATE TABLE fields (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    -- Points to id in types table.
                    type_id INTEGER NOT NULL,
                    -- The type id (types table) of the parent (eg if this is a field in an entity,
                    -- the type id of that entity).
                    parent_type_id INTEGER NOT NULL,
                    -- Name of the field.
                    name TEXT NOT NULL,
                    -- The class of this field: see FieldClass enum for values.
                    is_collection INTEGER NOT NULL
                );

                CREATE INDEX field_names_by_parent_type ON fields (parent_type_id, name);

                CREATE TABLE field_values (
                    entity_storage_key_id INTEGER NOT NULL,
                    -- Points to id field in fields table
                    field_id INTEGER NOT NULL,
                    -- For singleton primitive fields: id in primitive value table (the type_id in
                    -- the corresponding fields table determine which primitive value table to use).
                    -- For booleans this is the boolean value as 0/1.
                    -- For singleton entity references: id in entity_refs table.
                    -- for singleton inline entities: storage_key_id of entity.
                    -- For collections of anything: collection_id.
                    value_id INTEGER
                );

                CREATE INDEX field_values_by_entity_storage_key
                ON field_values (entity_storage_key_id, value_id);

                CREATE TABLE text_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL UNIQUE
                );

                CREATE INDEX text_primitive_value_index ON text_primitive_values (value);

                CREATE TABLE number_primitive_values (
                    id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                    value REAL NOT NULL UNIQUE
                );

                CREATE INDEX number_primitive_value_index ON number_primitive_values (value);
      """.trimIndent().split("\n\n")
    private val CREATE_VERSION_4 = CREATE_VERSION_3
    private val CREATE_VERSION_5 = CREATE_VERSION_3

    private val DROP_VERSION_2 =
      """
                DROP INDEX type_name_index;
                DROP TABLE types;
                DROP INDEX storage_key_index;
                DROP TABLE storage_keys;
                DROP TABLE entities;
                DROP INDEX entity_refs_index;
                DROP TABLE entity_refs;
                DROP TABLE collections;
                DROP INDEX collection_entries_collection_id_index;
                DROP TABLE collection_entries;
                DROP INDEX field_names_by_parent_type;
                DROP TABLE fields;
                DROP INDEX field_values_by_entity_storage_key;
                DROP TABLE field_values;
                DROP INDEX text_primitive_value_index;
                DROP TABLE text_primitive_values;
                DROP INDEX number_primitive_value_index;
                DROP TABLE number_primitive_values;
      """.trimIndent().split("\n")
    private val DROP_VERSION_3 = DROP_VERSION_2

    private val VERSION_2_MIGRATION = arrayOf("ALTER TABLE entities ADD COLUMN orphan INTEGER;")
    private val VERSION_3_MIGRATION =
      listOf(DROP_VERSION_2, CREATE_VERSION_3).flatten().toTypedArray()
    private val VERSION_4_MIGRATION =
      listOf(DROP_VERSION_3, CREATE_VERSION_4).flatten().toTypedArray()
    // This migration was previously needed to update the types table with new primitive types.
    // It is no longer needed as primitive types are no longer kept in the types table.
    private val VERSION_5_MIGRATION = emptyArray<String>()
    private val VERSION_6_MIGRATION = arrayOf(
      "ALTER TABLE entity_refs ADD COLUMN is_hard_ref INTEGER;"
    )

    @VisibleForTesting
    val MIGRATION_STEPS = mapOf(
      2 to VERSION_2_MIGRATION,
      3 to VERSION_3_MIGRATION,
      4 to VERSION_4_MIGRATION,
      5 to VERSION_5_MIGRATION,
      6 to VERSION_6_MIGRATION
    )

    @VisibleForTesting
    val CREATES_BY_VERSION = mapOf(
      3 to CREATE_VERSION_3,
      4 to CREATE_VERSION_4,
      5 to CREATE_VERSION_5,
      6 to CREATE_VERSION_6
    )

    private val CREATE = checkNotNull(CREATES_BY_VERSION[DB_VERSION])

    /** The primitive types that are stored in TABLE_NUMBER_PRIMITIVES */
    private val TYPES_IN_NUMBER_TABLE = listOf(
      PrimitiveType.Number.id,
      PrimitiveType.Float.id,
      PrimitiveType.Double.id
    )

    /** A version of TYPES_IN_NUMBER_TABLE to use in SQL IN statements */
    private val NUMBER_TABLE_TYPES =
      TYPES_IN_NUMBER_TABLE.joinToString(prefix = "(", postfix = ")")

    /** The primitive types that are stored in TABLE_TEXT_PRIMITIVES */
    private val TYPES_IN_TEXT_TABLE = listOf(
      PrimitiveType.Text.id,
      PrimitiveType.BigInt.id,
      PrimitiveType.Instant.id
    )

    /** A version of TYPES_IN_TEXT_TABLE to use in SQL IN statements */
    private val TEXT_TABLE_TYPES =
      TYPES_IN_TEXT_TABLE.joinToString(prefix = "(", postfix = ")")

    /**
     * The field classes for which the value of the field is stored directly in
     * TABLE_FIELD_VALUES
     */
    private val FIELD_CLASSES_IN_VALUE_TABLE = listOf(
      FieldClass.Singleton.ordinal,
      FieldClass.InlineEntity.ordinal
    )

    /** A version of FIELD_CLASSES_IN_VALUE_TABLE to use in SQL IN statements */
    private val VALUE_TABLE_FIELDS =
      FIELD_CLASSES_IN_VALUE_TABLE.joinToString(prefix = "(", postfix = ")")

    /**
     * The field classes for which the value in TABLE_FIELD_VALUES selects (0, N) rows in
     * TABLE_COLLECTION_ENTRIES, which store the actual field values.
     */
    private val FIELD_CLASSES_IN_COLLECTION_TABLE = listOf(
      FieldClass.Collection.ordinal,
      FieldClass.List.ordinal,
      FieldClass.InlineEntityCollection.ordinal,
      FieldClass.InlineEntityList.ordinal
    )

    /** A version of FIELD_CLASSES_IN_COLLECTION_TABLE to use in SQL IN statements */
    private val COLLECTION_FIELDS =
      FIELD_CLASSES_IN_COLLECTION_TABLE.joinToString(prefix = "(", postfix = ")")

    private val FIELD_CLASSES_FOR_ENTITY_COLLECTIONS = listOf(
      FieldClass.InlineEntityCollection.ordinal,
      FieldClass.InlineEntityList.ordinal
    )

    private val INLINE_ENTITY_COLLECTIONS =
      FIELD_CLASSES_FOR_ENTITY_COLLECTIONS.joinToString(prefix = "(", postfix = ")")

    /**
     * The id and name of a sentinel type, to ensure references are namespaced separately to
     * primitive types. Changing this value will require a DB migration!
     */
    @VisibleForTesting
    const val REFERENCE_TYPE_SENTINEL = 1000000
    private const val REFERENCE_TYPE_SENTINEL_NAME = "SENTINEL TYPE FOR REFERENCES"

    /**
     * A StorageKey used internally by the DB for recording inline entities.
     */
    @VisibleForTesting
    class InlineStorageKey(
      private val parentKey: StorageKey,
      private val fieldName: String
    ) : StorageKey("inline") {
      /**
       * A unique component to the key. This is required because there may be multiple inline
       * entities stored against a single fieldName (for collections and lists).
       */

      val unique = (Math.random() * Long.MAX_VALUE).roundToLong()
      override fun toKeyString(): String = "{${parentKey.embed()}}!$unique/$fieldName"
      override fun childKeyWithComponent(component: String): StorageKey =
        InlineStorageKey(parentKey, "$fieldName/$component")

      companion object {
        // Given a string inline storage key, returns the string storage key of the top
        // level entity that contains it.
        fun getTopLevelKey(inline: String) =
          inline.substring(inline.lastIndexOf('{') + 1, inline.indexOf('}'))
      }
    }
  }
}
