/* Resolve assets relative to this file on both preview and battery pages. */
var videoRatingPilotAssetBase = new URL('.', document.currentScript.src).href;
var videoRatingPilotSettings = { manifest: 'pool.json', lists: 'lists.json' };
