// a modified version of marcrobledo's implementation to work within a nextjs application

/* Rom Patcher JS v20240302 - Marc Robledo 2016-2024 - http://www.marcrobledo.com/license */

self.importScripts(
	'./RomPatcher.js',
	'./BinFile.js',
	'./HashCalculator.js',
	'./bps.js',
);

self.onmessage = async (event) => {
	const romFile = new BinFile(event.data.romFileU8Array);
	romFile.fileName = event.data.romFileName;
	const patchFile = new BinFile(event.data.patchFileU8Array);
	patchFile.fileName = event.data.patchFileName;

	let errorMessage = false;
	let patchedRom;

	try {
		const patcher = new RomPatcher(romFile, patchFile);
		patchedRom = await patcher.apply();
	} catch (evt) {
		errorMessage = evt.message;
	}

	if (patchedRom) {
		self.postMessage(
			{
				success: true,
				patchedRomU8Array: patchedRom._u8array,
				patchedRomFileName: patchedRom.fileName,
			},
			[patchedRom._u8array.buffer]
		);
	} else {
		self.postMessage({
			success: false,
			errorMessage: errorMessage,
		});
	}
};