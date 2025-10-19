import React, { useState } from 'react';
import type { BoundingBox } from '../types';

interface ImageManagerProps {
  savedImages: Array<{url: string, answerPosition: BoundingBox}>;
  onDelete: (url: string) => void;
  onClose: () => void;
}

const ImageManager: React.FC<ImageManagerProps> = ({ savedImages, onDelete, onClose }) => {
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (url: string) => {
    if (confirm('Delete this image from the database?')) {
      setDeleting(url);
      await onDelete(url);
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-2xl font-bold">Saved Images ({savedImages.length})</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 flex-1">
          {savedImages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No saved images yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedImages.map((image, index) => (
                <div key={image.url} className="border rounded-lg overflow-hidden shadow-md">
                  <div className="aspect-video relative bg-gray-200">
                    <img
                      src={image.url}
                      alt={`Saved image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-3 bg-gray-50">
                    <p className="text-xs text-gray-600 mb-2 truncate">
                      Position: ({image.answerPosition.x_min.toFixed(2)}, {image.answerPosition.y_min.toFixed(2)})
                    </p>
                    <button
                      onClick={() => handleDelete(image.url)}
                      disabled={deleting === image.url}
                      className={`w-full py-2 px-4 rounded font-semibold transition-colors ${
                        deleting === image.url
                          ? 'bg-gray-400 text-white cursor-wait'
                          : 'bg-red-600 text-white hover:bg-red-700 active:scale-95'
                      }`}
                    >
                      {deleting === image.url ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageManager;

