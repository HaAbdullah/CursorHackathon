import { Camera, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import AppFooter from "./AppFooter.jsx";

const MAX_PHOTOS = 5;

export default function UploadScreen({ onSubmit }) {
  const [photos, setPhotos] = useState([]);
  const inputId = useId();
  const inputRef = useRef(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    return () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview));
  }, []);

  function addPhotos(event) {
    const available = MAX_PHOTOS - photos.length;
    const selected = Array.from(event.target.files || []).slice(0, available);
    if (!selected.length) return;
    setPhotos((current) => [
      ...current,
      ...selected.map((file) => ({ file, preview: URL.createObjectURL(file) })),
    ]);
    event.target.value = "";
  }

  function removePhoto(index) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].preview);
      return current.filter((_, photoIndex) => photoIndex !== index);
    });
  }

  return (
    <section className="screen upload-screen">
      <header className="screen-header">
        <p className="eyebrow">Label photos</p>
        <h1>Show us the ingredients</h1>
        <p>Use clear, close photos. Include another panel if the list wraps around the package.</p>
      </header>

      <input
        ref={inputRef}
        id={inputId}
        className="visually-hidden"
        type="file"
        accept="image/*"
        multiple
        onChange={addPhotos}
      />

      <div className="photo-grid" aria-live="polite">
        {photos.map((photo, index) => (
          <div className="photo-tile" key={`${photo.file.name}-${photo.file.lastModified}`}>
            <img src={photo.preview} alt={`Selected label ${index + 1}`} />
            <button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="add-photo-tile" htmlFor={inputId}>
            <span className="add-icon"><Plus size={21} aria-hidden="true" /></span>
            <span>Add photo</span>
            <small>{photos.length}/5 selected</small>
          </label>
        )}
      </div>

      <div className="upload-tip">
        <Camera size={19} aria-hidden="true" />
        <p>Keep the ingredients panel flat, well lit, and in focus.</p>
      </div>

      <button
        type="button"
        className="button button-primary button-full analyze-button"
        disabled={photos.length === 0}
        onClick={() => onSubmit(photos.map((photo) => photo.file))}
      >
        Analyze {photos.length || ""} {photos.length === 1 ? "photo" : "photos"}
      </button>
      <AppFooter />
    </section>
  );
}
