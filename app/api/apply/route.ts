import { NextResponse } from 'next/server';
import RomPatcher from "../../../utils/RomPatcher";
import BinFile from "../../../utils/BinFile";


export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const romFile = formData.get('rom') as File;
        const patchFile = formData.get('patch') as File;

        if (!romFile || !patchFile) {
            return NextResponse.json({ error: 'Missing files' }, { status: 400 });
        }

        const rom = new BinFile(await romFile.arrayBuffer());
        const patch = new BinFile(await patchFile.arrayBuffer());
        
        const patcher = new RomPatcher(rom, patch); 
        const patchedRom = await patcher.apply();

        const patchedRomBlob = patchedRom.getBlob();

        return new NextResponse(patchedRomBlob, {
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': 'attachment; filename="patched.z64"',
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}