'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ShakyTriangle from '../components/ShakyTriangle';
import DragDrop from '../components/DragDrop';

interface Position {
  x: number | null,
  y: number | null
}

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState<Position>({ x: null, y: null });
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [showButtons, setShowButtons] = useState(false);
  const [showFinalButton, setShowFinalButton] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const h2Ref = useRef<HTMLHeadingElement>(null);
  const [romFile, setRomFile] = useState<File[]>([]);
  const [patchedRomFile, setPatchedRomFile] = useState<File[]>([]);
  const [patchFile, setPatchFile] = useState<File[]>([]);


  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    if (h1Ref.current && h2Ref.current) {
      const h1 = h1Ref.current;
      const h2 = h2Ref.current;
      setTimeout(() => {
        h1.style.transform = 'translateY(-30vh)';
        h1.style.transition = 'transform 0.7s ease';
        h2.style.transform = 'translateY(-30vh)';
        h2.style.fontSize = '1.3rem';
        h2.style.transition = 'transform 0.75s, font-size 0.75s ease';
      }, 500);
    }

    setTimeout(() => {
      setShowButtons(true);
    }, 750);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (selectedButton) {
      setShowFileUpload(true);
    } else {
      setShowFileUpload(false);
      setRomFile([]);
      setPatchFile([]);
      setPatchedRomFile([]);
    }
  }, [selectedButton]);

  useEffect(() => {
    let show = false;
    if (selectedButton === 'apply') {
      if (romFile.length > 0 && patchFile.length > 0) {
        show = true;
      }
    } else if (selectedButton === 'create') {
      if (romFile.length > 0 && patchedRomFile.length > 0) {
        show = true;
      }
    }
    setTimeout(() => {
      setShowFinalButton(show);
    }, 150);

  }, [romFile, patchFile, patchedRomFile, selectedButton]);


  const handleRomSelected = useCallback((files: File[]) => {
    setRomFile(files);
  }, []);

  const handlePatchSelected = useCallback((files: File[]) => {
    setPatchFile(files);
  }, []);

  const handlePatchedRomSelected = useCallback((files: File[]) => {
    setPatchedRomFile(files);
  }, []);

  const makeFile = async () => {
    const formData = new FormData();
    let url = '';
    let fileName = 'download';

    if (selectedButton === "apply" && romFile.length > 0 && patchFile.length > 0) {
      formData.append('rom', romFile[0]);
      formData.append('patch', patchFile[0]);
      url = '/api/apply';
      fileName = 'patched.z64';
    } else if (selectedButton === "create" && romFile.length > 0 && patchedRomFile.length > 0) {
      formData.append('original', romFile[0]); 
      formData.append('modified', patchedRomFile[0]); 
      url = '/api/create';
      fileName = 'patch.bps';
    } else {
      return;
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Something went wrong');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
      console.error('Error:', error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-gray-50 text-teal-700 overflow-hidden pt-20">
      <ShakyTriangle position="tl" mousePosition={mousePosition} />
      <ShakyTriangle position="tr" mousePosition={mousePosition} />
      <ShakyTriangle position="bl" mousePosition={mousePosition} />
      <ShakyTriangle position="br" mousePosition={mousePosition} />
      <h1 className="text-9xl font-bold mt-[30vh] mb-4 px-[50%] font-pirata" ref={h1Ref}>BPSmith</h1>
      <h2 className="text-2xl mx-auto font-ubuntu" ref={h2Ref}>Blacksmithing BPS files to bring your ROM hacks to life</h2>

      <div className={`z-10 font-ubuntu flex flex-row items-center justify-center space-x-4 transition-all duration-700 ease-in-out`}
        style={{ transform: showButtons ? 'translateY(-27.5vh)' : 'translateY(0)', opacity: showButtons ? 1 : 0 }}
      >
        <button
          onClick={() => setSelectedButton('apply')}
          className={`z-10 px-5 py-3 rounded-sm hover:cursor-pointer hover:font-bold hover:rounded-xl transition-all duration-200 ${selectedButton === 'apply'
            ? 'bg-teal-700 text-gray-50 border border-teal-700'
            : 'bg-transparent text-teal-700 border border-teal-700'
            }`}
        >
          Apply Patch
        </button>

        <button
          onClick={() => setSelectedButton('create')}
          className={`z-10 px-5 py-3 rounded-sm hover:cursor-pointer hover:font-bold hover:rounded-xl transition-all duration-200 ${selectedButton === 'create'
            ? 'bg-teal-700 text-gray-50 border border-teal-700'
            : 'bg-transparent text-teal-700 border border-teal-700'
            }`}
        >
          Create Patch
        </button>
      </div>

      <div className="relative z-10 flex flex-row items-start justify-center w-full px-4 space-x-3"
        style={{
          transform: 'translateY(-26vh)',
          transition: 'opacity 0.7s ease-in-out',
          opacity: showFileUpload ? 1 : 0,
          pointerEvents: showFileUpload ? 'auto' : 'none'
        }}
      >
        <div className="transition-all duration-700 ease-in-out transform"
          style={{
            transform: showFileUpload ? 'translateX(0)' : 'translateX(-20vw)',
            opacity: showFileUpload ? 1 : 0
          }}
        >
          <DragDrop onFilesSelected={handleRomSelected} applyOrCreate={selectedButton} leftOrRight="left" />
        </div>

        <div className="transition-all duration-700 ease-in-out transform"
          style={{
            transform: showFileUpload ? 'translateX(0)' : 'translateX(20vw)',
            opacity: showFileUpload ? 1 : 0
          }}
        >
          <div style={{ display: selectedButton === 'apply' || !selectedButton ? 'block' : 'none' }}>
            <DragDrop
              onFilesSelected={handlePatchSelected}
              applyOrCreate="apply"
              leftOrRight="right"
            />
          </div>
          <div style={{ display: selectedButton === 'create' ? 'block' : 'none' }}>
            <DragDrop
              onFilesSelected={handlePatchedRomSelected}
              applyOrCreate="create"
              leftOrRight="right"
            />
          </div>
        </div>
      </div>

      <div
        className={`flex justify-center items-center transition-opacity duration-500 ease mt-1 ${showFinalButton ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: 'translateY(-24vh)' }}
      >
        <button onClick={makeFile} className="font-ubuntu px-6 py-3 bg-gray-50 btn-hover-shadow border border-teal-700 rounded-sm hover:text-gray-50 hover:cursor-pointer hover:font-bold hover:rounded-xl transition-all duration-500 ease-in-out">
          {selectedButton === "apply" ? <p>Apply</p> : <p>Create</p>}
        </button>
      </div>
    </main>
  );
}