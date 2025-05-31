import crc32 from 'crc/crc32';
import fs from 'fs';
import path from 'path';

export class BinFile {
  littleEndian = false;
  offset = 0;
  private _lastRead: any = null;
  private _offsetsStack: number[] = [];
  private _u8array!: Uint8Array;
  fileName!: string;
  fileType!: string;
  fileSize!: number;

  static RUNTIME_ENVIRONMENT: 'browser' | 'node' | 'webworker' | null = (function () {
    if (typeof window === 'object' && typeof window.document === 'object')
      return 'browser';
    else if (typeof require === 'function' && typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string')
      return 'node';
    else
      return null;
  })();

  constructor(
    source: string | number | BinFile | File | FileList | HTMLElement | ArrayBuffer | ArrayBufferView,
    onLoad?: (file: BinFile) => void
  ) {
    if (BinFile.RUNTIME_ENVIRONMENT === 'browser' && (source instanceof File || source instanceof FileList || (source instanceof HTMLElement && source.tagName === 'INPUT' && (source as HTMLInputElement).type === 'file'))) {
      if (source instanceof HTMLElement) source = (source as HTMLInputElement).files!;
      if (source instanceof FileList) source = source[0];

      this.fileName = source.name;
      this.fileType = source.type;
      this.fileSize = source.size;

      const reader = new FileReader();
      reader.onload = () => {
        this._u8array = new Uint8Array(reader.result as ArrayBuffer);
        onLoad?.(this);
      };
      reader.readAsArrayBuffer(source);
    }
    else if (BinFile.RUNTIME_ENVIRONMENT === 'node' && typeof source === 'string') {
      if (!fs.existsSync(source)) throw new Error(`${source} does not exist`);
      const buffer = fs.readFileSync(source);
      this.fileName = path.basename(source);
      this.fileType = 'application/octet-stream';
      this.fileSize = buffer.byteLength;
      this._u8array = new Uint8Array(buffer);
      onLoad?.(this);
    }
    else if (source instanceof BinFile) {
      this.fileName = source.fileName;
      this.fileType = source.fileType;
      this.fileSize = source.fileSize;
      this._u8array = new Uint8Array(source._u8array.buffer.slice(0));
      onLoad?.(this);
    }
    else if (source instanceof ArrayBuffer || source instanceof SharedArrayBuffer) {
      this.fileName = 'file.bin';
      this.fileType = 'application/octet-stream';
      this.fileSize = source.byteLength;
      this._u8array = new Uint8Array(source);
      onLoad?.(this);
    }
    else if (ArrayBuffer.isView(source)) {
      this.fileName = 'file.bin';
      this.fileType = 'application/octet-stream';
      this.fileSize = source.buffer.byteLength;
      this._u8array = new Uint8Array(source.buffer);
      onLoad?.(this);
    }
    else if (typeof source === 'number') {
      this.fileName = 'file.bin';
      this.fileType = 'application/octet-stream';
      this.fileSize = source;
      this._u8array = new Uint8Array(new ArrayBuffer(source));
      onLoad?.(this);
    }
    else {
      throw new Error('Invalid BinFile source');
    }
  }

  push() { this._offsetsStack.push(this.offset); }
  pop() { this.seek(this._offsetsStack.pop()!); }
  seek(offset: number) { this.offset = offset; }
  skip(nBytes: number) { this.offset += nBytes; }
  isEOF(): boolean { return !(this.offset < this.fileSize); }

  readU8() { return this._u8array[this.offset++]; }
  readU16() {
    const val = this.littleEndian
      ? this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8)
      : (this._u8array[this.offset] << 8) + this._u8array[this.offset + 1];
    this.offset += 2;
    return val >>> 0;
  }
  readU24() {
    const val = this.littleEndian
      ? this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8) + (this._u8array[this.offset + 2] << 16)
      : (this._u8array[this.offset] << 16) + (this._u8array[this.offset + 1] << 8) + this._u8array[this.offset + 2];
    this.offset += 3;
    return val >>> 0;
  }
  readU32() {
    const val = this.littleEndian
      ? this._u8array[this.offset] + (this._u8array[this.offset + 1] << 8) + (this._u8array[this.offset + 2] << 16) + (this._u8array[this.offset + 3] << 24)
      : (this._u8array[this.offset] << 24) + (this._u8array[this.offset + 1] << 16) + (this._u8array[this.offset + 2] << 8) + this._u8array[this.offset + 3];
    this.offset += 4;
    return val >>> 0;
  }

  writeU8(val: number) { this._u8array[this.offset++] = val; }
  writeU16(val: number) {
    if (this.littleEndian) {
      this._u8array[this.offset] = val & 0xff;
      this._u8array[this.offset + 1] = val >> 8;
    } else {
      this._u8array[this.offset] = val >> 8;
      this._u8array[this.offset + 1] = val & 0xff;
    }
    this.offset += 2;
  }
  writeU24(val: number) {
    if (this.littleEndian) {
      this._u8array[this.offset] = val & 0xff;
      this._u8array[this.offset + 1] = (val >> 8) & 0xff;
      this._u8array[this.offset + 2] = (val >> 16) & 0xff;
    } else {
      this._u8array[this.offset] = (val >> 16) & 0xff;
      this._u8array[this.offset + 1] = (val >> 8) & 0xff;
      this._u8array[this.offset + 2] = val & 0xff;
    }
    this.offset += 3;
  }
  writeU32(val: number) {
    if (this.littleEndian) {
      this._u8array[this.offset] = val & 0xff;
      this._u8array[this.offset + 1] = (val >> 8) & 0xff;
      this._u8array[this.offset + 2] = (val >> 16) & 0xff;
      this._u8array[this.offset + 3] = (val >> 24) & 0xff;
    } else {
      this._u8array[this.offset] = (val >> 24) & 0xff;
      this._u8array[this.offset + 1] = (val >> 16) & 0xff;
      this._u8array[this.offset + 2] = (val >> 8) & 0xff;
      this._u8array[this.offset + 3] = val & 0xff;
    }
    this.offset += 4;
  }

  readBytes(len: number): number[] {
    const arr = Array.from(this._u8array.slice(this.offset, this.offset + len));
    this.offset += len;
    return arr;
  }
  writeBytes(arr: number[]) {
    arr.forEach((b, i) => this._u8array[this.offset + i] = b);
    this.offset += arr.length;
  }

  readString(len: number): string {
    let s = '';
    for (let i = 0; i < len && (this.offset + i) < this.fileSize && this._u8array[this.offset + i] > 0; i++) {
      s += String.fromCharCode(this._u8array[this.offset + i]);
    }
    this.offset += len;
    return s;
  }
  writeString(str: string, len = str.length) {
    for (let i = 0; i < str.length && i < len; i++) this._u8array[this.offset + i] = str.charCodeAt(i);
    for (let i = str.length; i < len; i++) this._u8array[this.offset + i] = 0x00;
    this.offset += len;
  }

  hashCRC32(start = 0, len?: number): string {
    const slice = this.slice(start, len ?? this.fileSize - start, true);
    return crc32(Buffer.from(slice._u8array)).toString(16);
  }

  slice(offset: number, len: number, doNotClone = false): BinFile {
    if (offset < 0) offset = 0;
    if ((offset + len) > this.fileSize) len = this.fileSize - offset;
    if (offset === 0 && len === this.fileSize && doNotClone) return this;
    const newFile = new BinFile(this._u8array.buffer.slice(offset, offset + len) as ArrayBuffer);
    newFile.fileName = this.fileName;
    newFile.fileType = this.fileType;
    newFile.littleEndian = this.littleEndian;
    return newFile;
  }

  copyTo(target: BinFile, offsetSource: number, len: number, offsetTarget = offsetSource) {
    for (let i = 0; i < len; i++) {
      target._u8array[offsetTarget + i] = this._u8array[offsetSource + i];
    }
  }

  save() {
    if (BinFile.RUNTIME_ENVIRONMENT === 'browser') {
      const blob = new Blob([this._u8array], { type: this.fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.fileName;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else if (BinFile.RUNTIME_ENVIRONMENT === 'node') {
      fs.writeFileSync(this.fileName, Buffer.from(this._u8array));
    } else {
      throw new Error('Unsupported environment');
    }
  }
}