/* Resolve assets relative to this file on both preview and battery pages. */
var captionCheckAssetBase = new URL('.', document.currentScript.src).href;
var captionCheckSettings = { manifest: 'pool.json', lists: 'lists.json' };
