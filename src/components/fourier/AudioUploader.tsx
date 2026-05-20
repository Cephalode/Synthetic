import React, { useRef, useCallback } from 'react';
import { decodeAudioFile } from '../../engine/audioUtils';

interface AudioUploaderProps {
  onAudioLoaded: (audioData: Float32Array, sampleRate: number, fileName: string) => void;
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onAudioLoaded }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [fileName, setFileName] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>('');

  const handleFile = useCallback(async (file: File) => {
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/flac', 'audio/x-wav', 'audio/wave'];
    if (!validTypes.some(t => file.type.startsWith(t.split('/')[0])) && !file.name.match(/\.(wav|mp3|ogg|flac)$/i)) {
      setError('Unsupported file type. Please use WAV, MP3, OGG, or FLAC.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const { audioData, sampleRate } = await decodeAudioFile(file);
      setFileName(file.name);
      onAudioLoaded(audioData, sampleRate, file.name);
    } catch (err) {
      setError(`Failed to decode audio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [onAudioLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <div className="panel">
      <h3>Audio Input</h3>
      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${fileName ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.ogg,.flac"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {loading ? (
          <span className="drop-text">Decoding audio...</span>
        ) : fileName ? (
          <span className="drop-text">Loaded: {fileName}</span>
        ) : (
          <span className="drop-text">Drop audio file here or click to browse</span>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
};

export default AudioUploader;
