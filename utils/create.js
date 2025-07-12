// a modified version of marcrobledo's implementation to work within a nextjs application

/* Rom Patcher JS v20240302 - Marc Robledo 2016-2024 - http://www.marcrobledo.com/license */

self.importScripts(
	'./RomPatcher.js',
	'./BinFile.js',
	'./HashCalculator.js',
	'./bps.js',
);

self.onmessage = async (event) => {
	const originalFile = new BinFile(event.data.originalRomU8Array);
	const modifiedFile = new BinFile(event.data.modifiedRomU8Array);

	try {
		const patch = await RomPatcher.create(originalFile, modifiedFile);
		const patchFile = patch.export('my_patch');

		self.postMessage(
			{
				success: true,
				patchFileU8Array: patchFile._u8array,
			},
			[patchFile._u8array.buffer]
		);
	} catch (error) {
		self.postMessage({
			success: false,
			errorMessage: error.message,
		});
	}
};