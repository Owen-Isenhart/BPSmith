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
  const [romFile, setRomFile] = useState<File | null>(null);
  const [patchedRomFile, setPatchedRomFile] = useState<File | null>(null);
  const [patchFile, setPatchFile] = useState<File | null>(null);

  // stuff on mount
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);

    // idk why I didn't do this in tailwind but it's already done
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

    // timeout gives the buttons aura when they appear
    setTimeout(() => {
      setShowButtons(true);
    }, 750);

    // cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    if (selectedButton) { // once they've selected a button, show the file upload
      setShowFileUpload(true);
    } else {
      setShowFileUpload(false);
      setRomFile(null);
      setPatchFile(null);
      setPatchedRomFile(null);
    }
  }, [selectedButton]);

  useEffect(() => {
    let show = false;
    if (selectedButton === 'apply') { // if they're applying a patch and have supplied a rom and patch, then show the apply button
      if (romFile && patchFile) {
        show = true;
      }
    } else if (selectedButton === 'create') { // if they're creating a patch and have supplied two roms, then show the create button
      if (romFile && patchedRomFile) {
        show = true;
      }
    }
    setTimeout(() => { // timeout gives this button some aura but not as much as the others
      setShowFinalButton(show);
    }, 150);
    
  }, [romFile, patchFile, patchedRomFile, selectedButton]);


  const handleRomSelected = useCallback((file: File) => {
    setRomFile(file ? file : null);
  }, []);

  const handlePatchSelected = useCallback((file: File) => {
    setPatchFile(file ? file : null);
  }, []);

  const handlePatchedRomSelected = useCallback((file: File) => {
    setPatchedRomFile(file ? file : null);
  }, []);

  const makeFile = async () => {
    if (selectedButton === "apply"){
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ROM: romFile, Patch: patchFile })
      });
      const data = await res.json();
      console.log(data)
    }
    else{
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ROM: romFile, modifiedROM: patchedRomFile })
      });
      const data = await res.json();
      console.log(data)
    } 
  }

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