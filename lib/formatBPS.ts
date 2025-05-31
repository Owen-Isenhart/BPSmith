import { BinFile } from './BinaryFile';

export const BPS_MAGIC = 'BPS1';
export const BPS_ACTION_SOURCE_READ = 0;
export const BPS_ACTION_TARGET_READ = 1;
export const BPS_ACTION_SOURCE_COPY = 2;
export const BPS_ACTION_TARGET_COPY = 3;

type BPSAction = {
  type: number;
  length: number;
  bytes?: number[];
  relativeOffset?: number;
};

export class BPS {
  sourceSize = 0;
  targetSize = 0;
  metaData = '';
  actions: BPSAction[] = [];
  sourceChecksum = '';
  targetChecksum = '';
  patchChecksum = '';

  toString(): string {
    return `Source size: ${this.sourceSize}\nTarget size: ${this.targetSize}\nMetadata: ${this.metaData}\n#Actions: ${this.actions.length}`;
  }

  calculateFileChecksum(): string {
    const patchFile = this.export();
    return patchFile.hashCRC32(0, patchFile.fileSize - 4);
  }

  validateSource(romFile: BinFile, headerSize = 0): boolean {
    return this.sourceChecksum === romFile.hashCRC32(headerSize);
  }

  apply(romFile: BinFile, validate = false): BinFile {
    if (validate && !this.validateSource(romFile)) {
      throw new Error('Source ROM checksum mismatch');
    }

    const tempFile = new BinFile(this.targetSize);
    let sourceRelativeOffset = 0;
    let targetRelativeOffset = 0;

    for (const action of this.actions) {
      if (action.type === BPS_ACTION_SOURCE_READ) {
        romFile.copyTo(tempFile, tempFile.offset, action.length);
        tempFile.skip(action.length);
      } else if (action.type === BPS_ACTION_TARGET_READ && action.bytes) {
        tempFile.writeBytes(action.bytes);
      } else if (action.type === BPS_ACTION_SOURCE_COPY && action.relativeOffset !== undefined) {
        sourceRelativeOffset += action.relativeOffset;
        for (let i = 0; i < action.length; i++) {
          tempFile.writeU8(romFile['_u8array'][sourceRelativeOffset++]);
        }
      } else if (action.type === BPS_ACTION_TARGET_COPY && action.relativeOffset !== undefined) {
        targetRelativeOffset += action.relativeOffset;
        for (let i = 0; i < action.length; i++) {
          tempFile.writeU8(tempFile['_u8array'][targetRelativeOffset++]);
        }
      }
    }

    if (validate && this.targetChecksum !== tempFile.hashCRC32()) {
      throw new Error('Target ROM checksum mismatch');
    }

    return tempFile;
  }

  static fromFile(file: BinFile): BPS {
    const patch = new BPS();
    file.seek(4);

    patch.sourceSize = BPS.readVLV(file);
    patch.targetSize = BPS.readVLV(file);
    const metaDataLength = BPS.readVLV(file);
    if (metaDataLength) patch.metaData = file.readString(metaDataLength);

    const endActionsOffset = file.fileSize - 12;
    while (file.offset < endActionsOffset) {
      const data = BPS.readVLV(file);
      const action: BPSAction = { type: data & 3, length: (data >> 2) + 1 };

      if (action.type === BPS_ACTION_TARGET_READ) {
        action.bytes = file.readBytes(action.length);
      } else if (action.type === BPS_ACTION_SOURCE_COPY || action.type === BPS_ACTION_TARGET_COPY) {
        const relOffset = BPS.readVLV(file);
        action.relativeOffset = (relOffset & 1 ? -1 : 1) * (relOffset >> 1);
      }

      patch.actions.push(action);
    }

    patch.sourceChecksum = file.readU32().toString(16);
    patch.targetChecksum = file.readU32().toString(16);
    patch.patchChecksum = file.readU32().toString(16);

    if (patch.patchChecksum !== patch.calculateFileChecksum()) {
      throw new Error('Patch checksum mismatch');
    }

    return patch;
  }

  export(fileName = 'patch'): BinFile {
    const patchFile = new BinFile(this.sourceSize + this.targetSize);
    patchFile.fileName = `${fileName}.bps`;
    patchFile.littleEndian = true;

    patchFile.writeString(BPS_MAGIC);
    BPS.writeVLV(patchFile, this.sourceSize);
    BPS.writeVLV(patchFile, this.targetSize);
    BPS.writeVLV(patchFile, this.metaData.length);
    patchFile.writeString(this.metaData);

    for (const action of this.actions) {
      BPS.writeVLV(patchFile, ((action.length - 1) << 2) + action.type);
      if (action.type === BPS_ACTION_TARGET_READ && action.bytes) {
        patchFile.writeBytes(action.bytes);
      } else if ((action.type === BPS_ACTION_SOURCE_COPY || action.type === BPS_ACTION_TARGET_COPY) && action.relativeOffset !== undefined) {
        BPS.writeVLV(patchFile, (Math.abs(action.relativeOffset) << 1) + (action.relativeOffset < 0 ? 1 : 0));
      }
    }

    patchFile.writeU32(parseInt(this.sourceChecksum, 16));
    patchFile.writeU32(parseInt(this.targetChecksum, 16));
    patchFile.writeU32(parseInt(this.patchChecksum, 16));

    return patchFile;
  }

  static readVLV(file: BinFile): number {
    let data = 0;
    let shift = 1;
    while (true) {
      const x = file.readU8();
      data += (x & 0x7f) * shift;
      if (x & 0x80) break;
      shift <<= 7;
      data += shift;
    }
    return data;
  }

  static writeVLV(file: BinFile, data: number) {
    while (true) {
      const x = data & 0x7f;
      data >>= 7;
      if (data === 0) {
        file.writeU8(0x80 | x);
        break;
      }
      file.writeU8(x);
      data--;
    }
  }
}
