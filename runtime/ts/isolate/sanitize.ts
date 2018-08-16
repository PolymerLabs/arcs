import * as dompurify from 'dompurify';

/*
 * Ugly workaround. Internal DOM operations within DOMPurify fail because style% is an illegal attribute name.
 * Browsers allow it when using innerHTML to construct the DOM from a string, but disallow '%' in attribute names when
 * calling element.setAttribute().
 */
const ESCAPED_STYLE_PCT = "__style__pct__";

/*
 * DOMPurify must be told about non-standard HTML elements (e.g. web components). For now we just whitelist them here,
 * but we should consider having some mechanism in the runtime to auto-discover these. Note, if you add a new
 * Web Component to the shell, it must be registered here.
 */
const CUSTOM_ELEMENTS: string[] = [
    'app-shell',
    'arc-config',
    'arc-host',
    'arc-manifest',
    'arc-planner',
    'arc-store',
    'cloud-arc',
    'arc-auth',
    'cloud-handles',
    'cloud-steps',
    'watch-group',
    'cloud-data',
    'fb-user-context',
    'fb-user',
    'fb-users',
    'shell-stores',
    'settings-panel',
    'suggestion-element',
    'user-picker',
    'voice-driver',
    'shell-ui',
    'fb-user',
    'fb-users',
    'vr-app-shell',
    'arc-item',
    'arc-list',
    'local-data',
    'manifest-data',
    'store-explorer',
    'user-data',
    'xen-explorer',
    'cx-button',
    'cx-input',
    'cx-tab-slider',
    'cx-tab',
    'cx-tabs',
    'icon',
    'dancing-dots',
    'data-explorer',
    'data-item',
    'firebase-upload',
    'good-map',
    'mic-input',
    'model-input',
    'simple-tabs',
    'speech-input',
    'test-dancing-dots',
    'test-good-map', ,
    'aframe-html',
    'toggle-button',
    'video-controller',
    'x-list',
    'x-toast',
    'remove',
    'xen-explorer'];

/*
 * Whitelist attribute names not to prune. Ideally, most of these would be auto-discovered somehow such as by tracking
 * calls to observedAttributes().
 */
const CUSTOM_ATTRIBUTES = [
    ESCAPED_STYLE_PCT
];

// List of whitelisted attribute names
const DYNAMIC_WHITELIST = new Set(CUSTOM_ATTRIBUTES);

interface Removed {
    element?: Node;
    attribute?: Node;
}

interface Node {
    name: string;
}

export function sanitize(unsafeString: string): string {

    // TODO(cromwellian): investigate adding a WeakMap memoize here? Ideally, templates should only be purified once.
    const unsafeSafeStyleFixed = unsafeString.replace('style%', ESCAPED_STYLE_PCT);
    let safeString = dompurify.sanitize(unsafeSafeStyleFixed, {
        FORCE_BODY: true,
        ADD_TAGS: CUSTOM_ELEMENTS,
        ADD_ATTR: [...DYNAMIC_WHITELIST]
    });

    /*
     * Total and complete hack. Unfortunately, until we can upstream a better solution into DOMPurify, custom
     * attributes will always be filtered. This code discovers them and whitelists them on the fly. Any attribute
     * not named 'on<event>' that gets filtered will be whitelisted. URI attribute values are already handled internally
     * by DOMPurify, e.g. javascript: protocol.
     *
     * TODO(cromwellian): examine the need for a blacklist of dangerous attributes
     */
    const removedList = dompurify['removed'] as Removed[];

    const attributesToWhiteList = removedList.filter((x => x.attribute && !/^on[^-]/i.test(x.attribute.name)))
        .map(x => x.attribute.name);

    if (attributesToWhiteList.length) {
        attributesToWhiteList.forEach(attr => DYNAMIC_WHITELIST.add(attr));
        // retry with everything whitelisted
        safeString = dompurify.sanitize(unsafeSafeStyleFixed, {
         FORCE_BODY: true,
         ADD_TAGS: CUSTOM_ELEMENTS,
         ADD_ATTR: [...DYNAMIC_WHITELIST]
      });
    }

    return safeString.replace(ESCAPED_STYLE_PCT, 'style%');
}


