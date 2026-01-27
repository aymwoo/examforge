import { useState } from "react";
import { Upload, Clipboard, X, Image as ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";
import { resolveAssetUrl } from "@/utils/url";
import {
  uploadQuestionImage,
  addClipboardImage,
  deleteQuestionImage,
} from "@/services/questions";

interface QuestionImageManagerProps {
  questionId?: string;
  images: string[];
  onImagesChange: (images: string[]) => void;
  isEditing?: boolean;
}

export default function QuestionImageManager({
  questionId,
  images,
  onImagesChange,
}: QuestionImageManagerProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!questionId) {
      // 新建模式，转换为base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        onImagesChange([...images, result]);
      };
      reader.readAsDataURL(file);
      return;
    }

    // 编辑模式，上传到服务器
    setUploading(true);
    try {
      const result = await uploadQuestionImage(questionId, file);
      const updatedImages = [...images, result.imagePath];
      onImagesChange(updatedImages);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleClipboardPaste = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);

          if (!questionId) {
            // 新建模式
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              onImagesChange([...images, result]);
            };
            reader.readAsDataURL(blob);
          } else {
            // 编辑模式
            const reader = new FileReader();
            reader.onload = async (event) => {
              const result = event.target?.result as string;
              try {
                const uploadResult = await addClipboardImage(
                  questionId,
                  result,
                );
                const updatedImages = [...images, uploadResult.imagePath];
                onImagesChange(updatedImages);
              } catch (error) {
                console.error("Clipboard upload failed:", error);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!questionId) {
      // 新建模式，直接从数组删除
      const updatedImages = images.filter((_, i) => i !== index);
      onImagesChange(updatedImages);
      return;
    }

    // 编辑模式，从服务器删除
    try {
      await deleteQuestionImage(questionId, index);
      const updatedImages = images.filter((_, i) => i !== index);
      onImagesChange(updatedImages);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const getImageSrc = (imagePath: string) => resolveAssetUrl(imagePath);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleFileUpload(file);
              }
            }}
            className="hidden"
            id="image-upload"
          />
          <label
            htmlFor="image-upload"
            className="cursor-pointer inline-flex items-center px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 border border-accent-200 rounded-lg hover:bg-accent-100"
          >
            <Upload className="h-3 w-3 mr-1" />
            {uploading ? "上传中..." : "上传图片"}
          </label>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleClipboardPaste}
          className="text-xs"
        >
          <Clipboard className="h-3 w-3 mr-1" />
          从剪贴板粘贴
        </Button>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="relative group">
              <img
                src={getImageSrc(image)}
                alt={`示例图 ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-border"
              />
              <button
                onClick={() => handleDeleteImage(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={`删除示例图 ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <ImageIcon className="h-8 w-8 mx-auto text-ink-400 mb-2" />
          <p className="text-sm text-ink-600">暂无示例图</p>
          <p className="text-xs text-ink-400 mt-1">
            点击上传或从剪贴板粘贴图片
          </p>
        </div>
      )}
    </div>
  );
}
