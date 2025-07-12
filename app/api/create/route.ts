import { NextResponse } from 'next/server';
import RomPatcher from "../../../utils/RomPatcher";
import BinFile from "../../../utils/BinFile";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const originalFile = formData.get('original') as File;
        const modifiedFile = formData.get('modified') as File;

        if (!originalFile || !modifiedFile) {
            return NextResponse.json({ error: 'Missing original or modified file' }, { status: 400 });
        }

        const originalBin = new BinFile(await originalFile.arrayBuffer());
        const modifiedBin = new BinFile(await modifiedFile.arrayBuffer());

        const patch = await RomPatcher.create(originalBin, modifiedBin);

        const patchBinFile = patch.export('patch'); // The name here is used for the default filename

        const patchBlob = patchBinFile.getBlob();


        return new NextResponse(patchBlob, {
            status: 200,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${patchBinFile.fileName}"`,
            },
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Error creating patch:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}