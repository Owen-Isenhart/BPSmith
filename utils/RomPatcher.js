/*
* Rom Patcher JS core
* A ROM patcher/builder made in JavaScript, can be implemented as a webapp or a Node.JS CLI tool
* By Marc Robledo https://www.marcrobledo.com
* Sourcecode: https://github.com/marcrobledo/RomPatcher.js
* License:
*
* MIT License
* * Copyright (c) 2016-2024 Marc Robledo
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
import BinFile from './BinFile.js';
import { bps } from './bps.js';

class RomPatcher {
    constructor(romFile, patchFile) {
        if (!(romFile instanceof BinFile)) {
            throw new Error('ROM file must be an instance of BinFile.');
        }
        if (patchFile && !(patchFile instanceof BinFile)) {
            throw new Error('Patch file must be an instance of BinFile.');
        }

        this._romFile = romFile;
        this._patchFile = patchFile;
        this._patch = null;
    }

    async parsePatchFile() {
        if (!this._patchFile) {
            throw new Error('A patch file must be provided to parse.');
        }

        this._patchFile.littleEndian = false;
        this._patchFile.seek(0);

        const header = this._patchFile.readString(4);

        if (header === 'BPS1') {
            this._patch = bps.fromFile(this._patchFile);
        } else {
            throw new Error('Unsupported or unrecognized patch format.');
        }

        if (this._patch) {
            this._patch._originalPatchFile = this._patchFile;
        } else {
            throw new Error('Failed to parse patch file.');
        }
    }

    async apply() {
        await this.parsePatchFile();
        return this._patch.apply(this._romFile, true);
    }

    static async create(originalFile, modifiedFile) {
        if (!(originalFile instanceof BinFile) || !(modifiedFile instanceof BinFile)) {
            throw new Error('Original and Modified files must be instances of BinFile');
        }

        const patch = bps.buildFromRoms(originalFile, modifiedFile); 

        const patchedForVerification = patch.apply(originalFile);
        if (modifiedFile.hashCRC32() !== patchedForVerification.hashCRC32()) {
            throw new Error('Verification failed: Patched file and modified file mismatch.');
        }

        return patch;
    }
}

export default RomPatcher;