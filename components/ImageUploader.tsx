

import React, { useState, useCallback, useEffect } from 'react';

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void;
  file: File | null;
  disabled: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, file, disabled }) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  
  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      onFileSelect(files[0]);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  }, []);

  const handleRemoveImage = () => {
    onFileSelect(null);
  }

  return (
    <div className="flex-grow flex flex-col">
      {preview && file ? (
        <div className="relative flex-grow">
          <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-md" />
           <button 
             onClick={handleRemoveImage}
             disabled={disabled}
             className="absolute top-2 right-2 bg-[#282a36]/50 text-[#F8F8F2] rounded-full p-1.5 hover:bg-black/75 transition-colors disabled:opacity-50"
             aria-label="Remove image"
           >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
           </button>
        </div>
      ) : (
        <div 
          onDragEnter={handleDrag} 
          onDragOver={handleDrag} 
          onDragLeave={handleDrag} 
          onDrop={handleDrop}
          className={`flex-grow flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md transition-colors ${
            isDragging ? 'border-[#ff79c6] bg-[#44475a]/50' : 'border-[#6272a4] hover:border-[#bd93f9]'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <input
            type="file"
            id="file-upload"
            className="sr-only"
            accept="image/png, image/jpeg, image/webp"
            onChange={(e) => handleFileChange(e.target.files)}
            disabled={disabled}
          />
          <label htmlFor="file-upload" className="text-center text-[#6272a4] cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm">
              <span className="font-semibold text-[#bd93f9]">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-[#6272a4]/80 mt-1">PNG, JPG, or WEBP</p>
          </label>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;