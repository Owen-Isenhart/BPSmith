// component for uploading files

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileUp, File as FileIcon, X } from 'lucide-react';

const formatFileSize = (bytes) => {
  if (bytes === 0) 
    return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function FileDropzone({ onFilesSelected, applyOrCreate, leftOrRight }) {
  const [files, setFiles] = useState([]);
  const [rejectedFiles, setRejectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles, fileRejections) => {
    const newFiles = acceptedFiles.map(file => Object.assign(file));
    setFiles(newFiles);
    onFilesSelected(newFiles); 
    setRejectedFiles(fileRejections.map(rejection => ({
      file: rejection.file,
      errors: rejection.errors,
    })));
  }, [onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: leftOrRight === "left"
      ? { 'application/octet-stream': ['.z64'] } // left drop zone always only accepts original ROM
      : applyOrCreate === "apply" ? { 'application/octet-stream': ['.bps'] } : { 'application/octet-stream': ['.z64'] }, // right drop zone accepts .bps on apply or .z64 on create
  });

  const removeFile = (fileName) => {
    const updatedFiles = files.filter(file => file.name !== fileName);
    setFiles(updatedFiles);
    onFilesSelected(updatedFiles); 
  };

  const removeRejectedFile = (fileName) => {
    setRejectedFiles(prev => prev.filter(rejected => rejected.file.name !== fileName));
  };

  const dropzoneBaseStyle = "flex flex-col items-center justify-center text-md p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out";
  const dropzoneActiveStyle = "border-teal-700 bg-teal-50 py-9"; // had to add padding bc it removes subtext making it smaller so this balances it
  const dropzoneAcceptStyle = "border-teal-700 bg-teal-50";
  const dropzoneRejectStyle = "border-rose-700 bg-rose-50";

  let dropzoneClassName = dropzoneBaseStyle;
  if (isDragActive) {
    dropzoneClassName = `${dropzoneBaseStyle} ${dropzoneActiveStyle}`;
  } else if (files.length > 0) { // can't use isDragAccept for some reason (probably due to file type) so this works good enough
    dropzoneClassName = `${dropzoneBaseStyle} ${dropzoneAcceptStyle}`;
  } else if (isDragReject) {
    dropzoneClassName = `${dropzoneBaseStyle} ${dropzoneRejectStyle}`;
  }

  return (
    <div className="w-sm max-w-md mx-auto p-4 font-ubuntu">
      <div
        {...getRootProps()}
        className={dropzoneClassName}
      >
        <input {...getInputProps()} />
        <FileUp className={`w-16 h-16 mb-4 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        {isDragActive ? ( // show some text if they're hovering with a file
          <p className="text-blue-600 font-semibold">Drop the file here ...</p>
        ) : ( // if not hovering
          leftOrRight === "left" ? ( // if left, just the og rom
            <>
              <p className="text-gray-500 text-center">
                Drag & drop ROM file here, or <span className="font-semibold text-blue-600 hover:underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Accepted: z64
              </p>
            </>

          ) : ( // if right
            applyOrCreate === "apply" ? ( // if apply, it needs patch file
              <>
                <p className="text-gray-500 text-center">
                  Drag & drop patch file here, or <span className="font-semibold text-blue-600 hover:underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Accepted: BPS
                </p>
              </>
            ) : ( // if create, it needs a modified rom file
              <>
                <p className="text-gray-500 text-center">
                  Drag & drop modified ROM, or <span className="font-semibold text-blue-600 hover:underline">browse</span>
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Accepted: z64
                </p>
              </>
            )

          )
        )}
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${files.length > 0 ? 'opacity-100 scale-y-100 mt-6' : 'opacity-0 scale-y-0 mt-0'}`} style={{ transformOrigin: 'top' }}>
        {files.length > 0 && ( // if there's accepted files, show them below the dropzone
          <div>
            <h3 className="text-md font-semibold text-teal-700 mb-3">Selected File:</h3>
            <ul className="space-y-2">
              {files.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-teal-50 rounded-md border border-teal-700 shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <FileIcon className="w-6 h-6 text-teal-700" />
                    <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="p-1 text-gray-700 hover:text-rose-700 hover:cursor-pointer rounded-full transition-all"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${rejectedFiles.length > 0 ? 'opacity-100 scale-y-100 mt-6' : 'opacity-0 scale-y-0 mt-0'}`} style={{ transformOrigin: 'top' }}>
        {rejectedFiles.length > 0 && ( // if there's rejected files, show them below the drop zone
          <div>
            <h3 className="text-md font-semibold text-rose-700 mb-3">Rejected Files:</h3>
            <ul className="space-y-2">
              {rejectedFiles.map(({ file, errors }) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-rose-50 rounded-md border border-red-200 shadow-sm"
                >
                  <div className="flex items-center space-x-3">
                    <FileIcon className="w-6 h-6 text-rose-700" />
                    <span className="text-sm text-gray-700 font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    {errors.map(error => ( // i shortened the main error message because it was way too yappy
                      <p key={error.code} className="text-xs text-rose-700 mt-1">{error.message.replace('one of application/octet-stream,', 'of type')}</p>
                    ))}
                  </div>
                  <button
                    onClick={() => removeRejectedFile(file.name)}
                    className="p-1 text-gray-700 hover:cursor-pointer hover:text-rose-700 rounded-full hover:bg-rose-50 transition-all"
                    aria-label={`Dismiss rejected file ${file.name}`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}