// a modified version of marcrobledo's implementation to work within a nextjs application

/*
* BinFile.js (last update: 2024-08-21)
* by Marc Robledo, https://www.marcrobledo.com
* * a JS class for reading/writing sequentially binary data from/to a file
* that allows much more manipulation than simple DataView
* compatible with both browsers and Node.js
* * MIT License
* * Copyright (c) 2014-2024 Marc Robledo
* * Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* * The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
*/

import HashCalculator from './HashCalculator.js';

class BinFile {
	constructor(source) {
		this.littleEndian = false;
		this.offset = 0;
		this._lastRead = null;
		this._offsetsStack = [];

		if (source instanceof ArrayBuffer) {
			this.fileName = 'file.bin';
			this.fileType = 'application/octet-stream';
			this.fileSize = source.byteLength;
			this._u8array = new Uint8Array(source);
		} else if (ArrayBuffer.isView(source)) {
			this.fileName = 'file.bin';
			this.fileType = 'application/octet-stream';
			this.fileSize = source.buffer.byteLength;
			this._u8array = new Uint8Array(source.buffer);
		} else if (typeof source === 'number') {
			this.fileName = 'file.bin';
			this.fileType = 'application/octet-stream';
			this.fileSize = source;
			this._u8array = new Uint8Array(new ArrayBuffer(source));
		} else {
			throw new Error('Invalid BinFile source. Use an ArrayBuffer, TypedArray, or a size number.');
		}
	}

	getBlob() {
        return new Blob([this._u8array.buffer]);
    }

	push() {
		this._offsetsStack.push(this.offset);
	}
	pop() {
		this.seek(this._offsetsStack.pop());
	}
	seek(offset) {
		this.offset = offset;
	}
	skip(nBytes) {
		this.offset += nBytes;
	}
	isEOF() {
		return !(this.offset < this.fileSize);
	}

	slice(offset, len) {
		if (typeof offset !== 'number' || offset < 0)
			offset = 0;
		else if (offset >= this.fileSize)
			throw new Error('out of bounds slicing');
		else
			offset = Math.floor(offset);

		if (typeof len !== 'number' || len < 0 || (offset + len) > this.fileSize)
			len = this.fileSize - offset;
		else if (len === 0)
			return new BinFile(0);
		else
			len = Math.floor(len);


		var newFile = new BinFile(this._u8array.buffer.slice(offset, offset + len));
		newFile.fileName = this.fileName;
		newFile.fileType = this.fileType;
		newFile.littleEndian = this.littleEndian;
		return newFile;
	}

	copyTo(target, offsetSource, len, offsetTarget) {
		if (!(target instanceof BinFile))
			throw new Error('target is not a BinFile object');

		if (typeof offsetTarget !== 'number')
			offsetTarget = offsetSource;

		len = len || (this.fileSize - offsetSource);

		for (var i = 0; i < len; i++) {
			target._u8array[offsetTarget + i] = this._u8array[offsetSource + i];
		}
	}

	save(fileName) {
		const fileBlob = new Blob([this._u8array], { type: this.fileType });
		const blobUrl = URL.createObjectURL(fileBlob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = fileName || this.fileName;
		document.body.appendChild(a);
		a.dispatchEvent(new MouseEvent('click'));
		URL.revokeObjectURL(blobUrl);
		document.body.removeChild(a);
	}

	readU8() {
		this._lastRead = this._u8array[this.offset++];
		return this._lastRead
	}
	readU16() {
		if (this.littleEndian)
			this._lastRead = this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8);
		else
			this._lastRead = (this._u8array[this.offset] << 8) + this._u8array[this.offset + 1];

		this.offset += 2;
		return this._lastRead >>> 0
	}
	readU24() {
		if (this.littleEndian)
			this._lastRead = this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8) + (this._u8array[this.offset + 2] << 16);
		else
			this._lastRead = (this._u8array[this.offset] << 16) + (this._u8array[this.offset + 1] << 8) + this._u8array[this.offset + 2];

		this.offset += 3;
		return this._lastRead >>> 0
	}
	readU32() {
		if (this.littleEndian)
			this._lastRead = this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8) + (this._u8array[this.offset + 2] << 16) + (this._u8array[this.offset + 3] << 24);
		else
			this._lastRead = (this._u8array[this.offset] << 24) + (this._u8array[this.offset + 1] << 16) + (this._u8array[this.offset + 2] << 8) + this._u8array[this.offset + 3];

		this.offset += 4;
		return this._lastRead >>> 0
	}

	readBytes(len) {
		this._lastRead = new Array(len);
		for (var i = 0; i < len; i++) {
			this._lastRead[i] = this._u8array[this.offset + i];
		}

		this.offset += len;
		return this._lastRead
	}

	readString(len) {
		this._lastRead = '';
		for (var i = 0; i < len && (this.offset + i) < this.fileSize && this._u8array[this.offset + i] > 0; i++)
			this._lastRead = this._lastRead + String.fromCharCode(this._u8array[this.offset + i]);

		this.offset += len;
		return this._lastRead
	}

	writeU8(u8) {
		this._u8array[this.offset++] = u8;
	}
	writeU16(u16) {
		if (this.littleEndian) {
			this._u8array[this.offset] = u16 & 0xff;
			this._u8array[this.offset + 1] = u16 >> 8;
		} else {
			this._u8array[this.offset] = u16 >> 8;
			this._u8array[this.offset + 1] = u16 & 0xff;
		}

		this.offset += 2;
	}
	writeU24(u24) {
		if (this.littleEndian) {
			this._u8array[this.offset] = u24 & 0x0000ff;
			this._u8array[this.offset + 1] = (u24 & 0x00ff00) >> 8;
			this._u8array[this.offset + 2] = (u24 & 0xff0000) >> 16;
		} else {
			this._u8array[this.offset] = (u24 & 0xff0000) >> 16;
			this._u8array[this.offset + 1] = (u24 & 0x00ff00) >> 8;
			this._u8array[this.offset + 2] = u24 & 0x0000ff;
		}

		this.offset += 3;
	}
	writeU32(u32) {
		if (this.littleEndian) {
			this._u8array[this.offset] = u32 & 0x000000ff;
			this._u8array[this.offset + 1] = (u32 & 0x0000ff00) >> 8;
			this._u8array[this.offset + 2] = (u32 & 0x00ff0000) >> 16;
			this._u8array[this.offset + 3] = (u32 & 0xff000000) >> 24;
		} else {
			this._u8array[this.offset] = (u32 & 0xff000000) >> 24;
			this._u8array[this.offset + 1] = (u32 & 0x00ff0000) >> 16;
			this._u8array[this.offset + 2] = (u32 & 0x0000ff00) >> 8;
			this._u8array[this.offset + 3] = u32 & 0x000000ff;
		}

		this.offset += 4;
	}

	writeBytes(a) {
		for (var i = 0; i < a.length; i++)
			this._u8array[this.offset + i] = a[i]

		this.offset += a.length;
	}

	writeString(str, len) {
		len = len || str.length;
		for (var i = 0; i < str.length && i < len; i++)
			this._u8array[this.offset + i] = str.charCodeAt(i);

		for (; i < len; i++)
			this._u8array[this.offset + i] = 0x00;

		this.offset += len;
	}
    
    hashSHA1(start, len) {
        return HashCalculator.sha1(this.slice(start, len, true)._u8array.buffer);
    }
    hashMD5(start, len) {
        return HashCalculator.md5(this.slice(start, len, true)._u8array.buffer);
    }
    hashCRC32(start, len) {
        return HashCalculator.crc32(this.slice(start, len, true)._u8array.buffer);
    }
}

export default BinFile;