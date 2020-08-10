package arcs.android.sdk.host

import kotlinx.coroutines.ExperimentalCoroutinesApi

/**
 * Very temporary type aliases to ease transition from
 * arcs.android.sdk -> arcs.sdk.android
 */
@OptIn(ExperimentalCoroutinesApi::class)
typealias AndroidHost = arcs.sdk.android.host.AndroidHost
typealias ArcHostService = arcs.sdk.android.host.ArcHostService
