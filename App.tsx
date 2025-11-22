
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ModelList from './components/ModelList';
import DetailPanel from './components/DetailPanel';
import { STLModel, Folder } from './types';
import { generateThumbnail } from './services/thumbnailGenerator';
import { api } from './services/api';

const App = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [models, setModels] = useState<STLModel[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string>('all');
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<number>(0);

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [fetchedFolders, fetchedModels] = await Promise.all([
          api.getFolders(),
          api.getModels('all') // Fetch all initially
        ]);
        setFolders(fetchedFolders);
        setModels(fetchedModels);
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter models based on selection (client-side filter for responsiveness)
  // In a large scale app, we would fetch api.getModels(currentFolderId) when folder changes
  const filteredModels = currentFolderId === 'all' 
    ? models 
    : models.filter(m => m.folderId === currentFolderId);

  const selectedModel = models.find(m => m.id === selectedModelId) || null;

  const handleCreateFolder = async (name: string) => {
    try {
      const newFolder = await api.createFolder(name);
      setFolders(prev => [...prev, newFolder]);
    } catch (error) {
      console.error("Failed to create folder:", error);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    try {
      await api.updateFolder(id, newName);
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name: newName } : f));
    } catch (error) {
      console.error("Failed to rename folder", error);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    // Client side validation
    const hasModels = models.some(m => m.folderId === id);
    if (hasModels) {
      // This should technically be prevented by UI, but as a safeguard:
      alert("Folder must be empty to delete.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this folder?")) return;

    try {
      await api.deleteFolder(id);
      setFolders(prev => prev.filter(f => f.id !== id));
      if (currentFolderId === id) setCurrentFolderId('all');
    } catch (error) {
      console.error("Failed to delete folder", error);
      alert(error instanceof Error ? error.message : "Failed to delete folder");
    }
  };

  const handleUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    setUploadQueue(prev => prev + files.length);
    
    // Process uploads sequentially or in parallel depending on requirements
    // Here we do them individually to update UI progressively
    for (const file of files) {
      try {
        let thumbnail: string | undefined = undefined;

        // Generate thumbnail client-side before upload if it's an STL
        if (file.name.toLowerCase().endsWith('.stl')) {
           try {
             thumbnail = await generateThumbnail(file);
           } catch (e) {
             console.warn("Thumbnail generation failed, uploading without thumbnail");
           }
        }

        // Upload to API
        // We default to the first folder if 'all' is selected, or the current folder
        const targetFolderId = currentFolderId === 'all' && folders.length > 0 ? folders[0].id : currentFolderId;
        
        const newModel = await api.uploadModel(file, targetFolderId, thumbnail);
        
        setModels(prev => [newModel, ...prev]);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      } finally {
        setUploadQueue(prev => prev - 1);
      }
    }
  };

  const handleUpdateModel = async (id: string, updates: Partial<STLModel>) => {
    try {
      // Optimistic update
      setModels(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
      
      // API call
      await api.updateModel(id, updates);
    } catch (error) {
      console.error("Failed to update model:", error);
      // Revert logic could go here
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this model?")) return;
    
    try {
      await api.deleteModel(id);
      setModels(prev => prev.filter(m => m.id !== id));
      if (selectedModelId === id) setSelectedModelId(null);
    } catch (error) {
      console.error("Failed to delete model:", error);
    }
  };

  return (
    <div className="flex h-screen bg-vault-900 text-slate-200 font-sans selection:bg-blue-500/30">
      <Sidebar 
        folders={folders} 
        models={models}
        currentFolderId={currentFolderId}
        onSelectFolder={(id) => {
            setCurrentFolderId(id);
            setSelectedModelId(null);
        }}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
      />
      
      <main className="flex-1 flex overflow-hidden relative">
        {isLoading ? (
           <div className="absolute inset-0 flex items-center justify-center bg-vault-900 z-50">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
           </div>
        ) : (
          <ModelList 
            models={filteredModels} 
            onUpload={handleUpload}
            onSelectModel={(m) => setSelectedModelId(m.id)}
            selectedModelId={selectedModelId}
          />
        )}

        {/* Upload Indicator */}
        {uploadQueue > 0 && (
           <div className="absolute bottom-6 left-6 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-pulse">
             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
             <span className="text-sm font-medium">Uploading {uploadQueue} file(s)...</span>
           </div>
        )}

        {/* Slide-over panel */}
        <div className={`absolute top-0 right-0 h-full transition-transform duration-300 ease-in-out transform ${selectedModelId ? 'translate-x-0' : 'translate-x-full'}`}>
          <DetailPanel 
            model={selectedModel} 
            onClose={() => setSelectedModelId(null)}
            onUpdate={handleUpdateModel}
            onDelete={handleDeleteModel}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
