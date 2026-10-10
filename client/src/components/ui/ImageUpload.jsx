import { useEffect, useId, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import Button from "./Button";

// Single image picker with preview, type/size validation and remove.
//
//   <ImageUpload
//     label="Logo"
//     initialUrl={organization.logo ? buildImageUrl(organization.logo) : null}
//     onChange={({ file, removed }) => ...}
//   />
//
// onChange fires with { file, removed }: file is the newly chosen File (or null), removed is true when
// the user cleared the image. The parent decides what to send (e.g. file -> upload, removed -> clear).
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const ImageUpload = ({
  label,
  initialUrl = null,
  onChange,
  isDisabled = false,
  maxSizeMB = 2,
  helperText,
  error,
  className = "",
  id,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef(null);

  const [preview, setPreview] = useState(initialUrl);
  const [localError, setLocalError] = useState("");

  // Release object URLs created for local previews once they are replaced or unmounted.
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Please choose a JPEG, PNG, WEBP or GIF image.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setLocalError(`Image must be smaller than ${maxSizeMB}MB.`);
      event.target.value = "";
      return;
    }

    setLocalError("");
    setPreview(URL.createObjectURL(file));
    onChange?.({ file, removed: false });
  };

  const handleRemove = () => {
    setPreview(null);
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
    onChange?.({ file: null, removed: true });
  };

  const message = error || localError;

  return (
    <div className={className}>
      {label && <p className="mb-1 block text-sm font-medium text-gray-700">{label}</p>}

      <div className="flex items-center gap-4">
        <div className="flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {preview ? (
            <img src={preview} alt={label ? `${label} preview` : "Preview"} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={26} className="text-gray-300" />
          )}
        </div>

        <div className="min-w-0">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={isDisabled}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={Upload}
              onClick={() => inputRef.current?.click()}
              disabled={isDisabled}
            >
              {preview ? "Change" : "Upload"}
            </Button>

            {preview && (
              <Button type="button" variant="ghost" size="sm" icon={X} onClick={handleRemove} disabled={isDisabled}>
                Remove
              </Button>
            )}
          </div>

          <p className={`mt-1.5 text-xs ${message ? "text-red-600" : "text-gray-500"}`} role={message ? "alert" : undefined}>
            {message || helperText || `JPEG, PNG, WEBP or GIF. Max ${maxSizeMB}MB.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
