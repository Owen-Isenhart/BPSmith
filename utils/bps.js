// a modified version of marcrobledo's implementation to work within a nextjs application

/* BPS module for Rom Patcher JS v20240821 - Marc Robledo 2016-2024 - http://www.marcrobledo.com/license */
/* File format specification: https://www.romhacking.net/documents/746/ */

import BinFile from './BinFile.js';

const BPS_MAGIC = 'BPS1';
const BPS_ACTION_SOURCE_READ = 0;
const BPS_ACTION_TARGET_READ = 1;
const BPS_ACTION_SOURCE_COPY = 2;
const BPS_ACTION_TARGET_COPY = 3;

function BPS() {
	this.sourceSize = 0;
	this.targetSize = 0;
	this.metaData = '';
	this.actions = [];
	this.sourceChecksum = 0;
	this.targetChecksum = 0;
	this.patchChecksum = 0;
}
BPS.prototype.toString = function () {
	var s = 'Source size: ' + this.sourceSize;
	s += '\nTarget size: ' + this.targetSize;
	s += '\nMetadata: ' + this.metaData;
	s += '\n#Actions: ' + this.actions.length;
	return s
}
BPS.prototype.calculateFileChecksum = function () {
	var patchFile = this.export();
	return patchFile.hashCRC32(0, patchFile.fileSize - 4);
}
BPS.prototype.validateSource = function (romFile, headerSize) { return this.sourceChecksum === romFile.hashCRC32(headerSize) }
BPS.prototype.getValidationInfo = function () {
	return {
		'type': 'CRC32',
		'value': this.sourceChecksum
	}
}
BPS.prototype.apply = function (romFile, validate) {
	if (validate && !this.validateSource(romFile)) {
		throw new Error('Source ROM checksum mismatch');
	}

	var tempFile = new BinFile(this.targetSize);

	var sourceRelativeOffset = 0;
	var targetRelativeOffset = 0;
	for (var i = 0; i < this.actions.length; i++) {
		var action = this.actions[i];

		if (action.type === BPS_ACTION_SOURCE_READ) {
			romFile.copyTo(tempFile, tempFile.offset, action.length);
			tempFile.skip(action.length);
		} else if (action.type === BPS_ACTION_TARGET_READ) {
			tempFile.writeBytes(action.bytes);
		} else if (action.type === BPS_ACTION_SOURCE_COPY) {
			sourceRelativeOffset += action.relativeOffset;
			var actionLength = action.length;
			while (actionLength--) {
				tempFile.writeU8(romFile._u8array[sourceRelativeOffset]);
				sourceRelativeOffset++;
			}
		} else if (action.type === BPS_ACTION_TARGET_COPY) {
			targetRelativeOffset += action.relativeOffset;
			var actionLength = action.length;
			while (actionLength--) {
				tempFile.writeU8(tempFile._u8array[targetRelativeOffset]);
				targetRelativeOffset++;
			}
		}
	}

	if (validate && this.targetChecksum !== tempFile.hashCRC32()) {
		throw new Error('Target ROM checksum mismatch');
	}

	return tempFile
}

BPS.MAGIC = BPS_MAGIC;


BPS.fromFile = function (file) {
	file.readVLV = BPS_readVLV;

	file.littleEndian = true;
	var patch = new BPS();

	file.seek(4);
	patch.sourceSize = file.readVLV();
	patch.targetSize = file.readVLV();
	var metaDataLength = file.readVLV();
	if (metaDataLength) {
		patch.metaData = file.readString(metaDataLength);
	}

	var endActionsOffset = file.fileSize - 12;
	while (file.offset < endActionsOffset) {
		var data = file.readVLV();
		var action = { type: data & 3, length: (data >> 2) + 1 };
		if (action.type === BPS_ACTION_TARGET_READ) {
			action.bytes = file.readBytes(action.length);
		} else if (action.type === BPS_ACTION_SOURCE_COPY || action.type === BPS_ACTION_TARGET_COPY) {
			var relativeOffset = file.readVLV();
			action.relativeOffset = (relativeOffset & 1 ? -1 : +1) * (relativeOffset >> 1)
		}
		patch.actions.push(action);
	}

	patch.sourceChecksum = file.readU32();
	patch.targetChecksum = file.readU32();
	patch.patchChecksum = file.readU32();

	if (patch.patchChecksum !== patch.calculateFileChecksum()) {
		throw new Error('Patch checksum mismatch');
	}

	return patch;
}

function BPS_readVLV() {
	var data = 0, shift = 1;
	while (true) {
		var x = this.readU8();
		data += (x & 0x7f) * shift;
		if (x & 0x80)
			break;
		shift <<= 7;
		data += shift;
	}
	this._lastRead = data;
	return data;
}
function BPS_writeVLV(data) {
	while (true) {
		var x = data & 0x7f;
		data >>= 7;
		if (data === 0) {
			this.writeU8(0x80 | x);
			break;
		}
		this.writeU8(x);
		data--;
	}
}
function BPS_getVLVLen(data) {
	var len = 0;
	while (true) {
		var x = data & 0x7f;
		data >>= 7;
		if (data === 0) {
			len++;
			break;
		}
		len++;
		data--;
	}
	return len;
}


BPS.prototype.export = function (fileName) {
	var patchFileSize = BPS_MAGIC.length;
	patchFileSize += BPS_getVLVLen(this.sourceSize);
	patchFileSize += BPS_getVLVLen(this.targetSize);
	patchFileSize += BPS_getVLVLen(this.metaData.length);
	patchFileSize += this.metaData.length;
	for (var i = 0; i < this.actions.length; i++) {
		var action = this.actions[i];
		patchFileSize += BPS_getVLVLen(((action.length - 1) << 2) + action.type);
		if (action.type === BPS_ACTION_TARGET_READ) {
			patchFileSize += action.length;
		} else if (action.type === BPS_ACTION_SOURCE_COPY || action.type === BPS_ACTION_TARGET_COPY) {
			patchFileSize += BPS_getVLVLen((Math.abs(action.relativeOffset) << 1) + (action.relativeOffset < 0 ? 1 : 0));
		}
	}
	patchFileSize += 12;

	var patchFile = new BinFile(patchFileSize);
	patchFile.fileName = fileName + '.bps';
	patchFile.littleEndian = true;
	patchFile.writeVLV = BPS_writeVLV;

	patchFile.writeString(BPS_MAGIC);
	patchFile.writeVLV(this.sourceSize);
	patchFile.writeVLV(this.targetSize);
	patchFile.writeVLV(this.metaData.length);
	patchFile.writeString(this.metaData, this.metaData.length);

	for (var i = 0; i < this.actions.length; i++) {
		var action = this.actions[i];
		patchFile.writeVLV(((action.length - 1) << 2) + action.type);
		if (action.type === BPS_ACTION_TARGET_READ) {
			patchFile.writeBytes(action.bytes);
		} else if (action.type === BPS_ACTION_SOURCE_COPY || action.type === BPS_ACTION_TARGET_COPY) {
			patchFile.writeVLV((Math.abs(action.relativeOffset) << 1) + (action.relativeOffset < 0 ? 1 : 0));
		}
	}
	patchFile.writeU32(this.sourceChecksum);
	patchFile.writeU32(this.targetChecksum);
	patchFile.writeU32(this.patchChecksum);

	return patchFile;
}
function BPS_Node() {
	this.offset = 0;
	this.next = null;
};
BPS_Node.prototype.delete = function () {
	if (this.next)
		delete this.next;
}
BPS.buildFromRoms = function (original, modified) {
	var patch = new BPS();
	patch.sourceSize = original.fileSize;
	patch.targetSize = modified.fileSize;
	patch.actions = createBPSFromFilesLinear(original, modified);
	patch.sourceChecksum = original.hashCRC32();
	patch.targetChecksum = modified.hashCRC32();
	patch.patchChecksum = patch.calculateFileChecksum();
	return patch;
}

function createBPSFromFilesLinear(original, modified) {
	var patchActions = [];
	var sourceData = original._u8array;
	var targetData = modified._u8array;
	var targetSize = modified.fileSize;

	var targetRelativeOffset = 0;
	var outputOffset = 0;
	var targetReadLength = 0;

	function targetReadFlush() {
		if (targetReadLength) {
			var action = { type: BPS_ACTION_TARGET_READ, length: targetReadLength, bytes: [] };
			patchActions.push(action);
			var offset = outputOffset - targetReadLength;
			while (targetReadLength) {
				action.bytes.push(targetData[offset++]);
				targetReadLength--;
			}
		}
	};

	while (outputOffset < targetSize) {
		var sourceLength = 0;
		for (var n = 0; outputOffset + n < Math.min(original.fileSize, targetSize); n++) {
			if (sourceData[outputOffset + n] != targetData[outputOffset + n]) break;
			sourceLength++;
		}
		if (sourceLength >= 4) {
			targetReadFlush();
			patchActions.push({ type: BPS_ACTION_SOURCE_READ, length: sourceLength });
			outputOffset += sourceLength;
		} else {
			targetReadLength++;
			outputOffset++;
		}
	}
	targetReadFlush();
	return patchActions;
}



export const bps = BPS;