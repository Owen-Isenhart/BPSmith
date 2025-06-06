// we don't need to check stuff here because that should be done in page.tsx before making request
// actually maybe we should do the checks here

import type { NextApiRequest, NextApiResponse } from "next";
import BinaryFile from "../../../lib/BinaryFile";
import BPS from "../../../lib/formatBPS";

// send rom file as BinaryFile
// send patch file as BinaryFile
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { ROM, Patch } = req.body;
  const romFile = new BinaryFile(ROM);
  const patchFile = BPS.fromFile(new BinaryFile(Patch));
  var modifiedROM: BinaryFile;
  try {
    modifiedROM = patchFile.apply(romFile);
    res.status(200).json({ modifiedROM: modifiedROM });
  } catch (error) {
    res.status(400).json({ error: error });
  }
}
