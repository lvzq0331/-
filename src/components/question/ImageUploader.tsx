// ImageUploader — 图片上传组件（压缩为WebP + 水印）
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  showWatermark?: boolean;
  watermarkText?: string;
  onWatermarkChange?: (enabled: boolean, text: string) => void;
}

export default function ImageUploader({
  images, onChange, maxImages = 5,
  showWatermark = false, watermarkText = '',
  onWatermarkChange
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);

  // 压缩图片为WebP，可选添加水印
  const compressToWebP = async (
    file: File,
    maxWidth = 1200,
    quality = 0.8,
    addWatermark = false,
    watermarkText = ''
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 缩放
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('无法获取Canvas上下文'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          // 添加水印
          if (addWatermark && watermarkText) {
            // 设置水印样式
            const fontSize = Math.max(20, Math.min(width, height) / 40);
            ctx.font = `${fontSize}px Arial`;
            ctx.fillStyle = 'rgba(128, 128, 128, 0.3)';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';

            // 在右下角绘制水印
            ctx.fillText(watermarkText, width - 10, height - 10);

            // 可选：添加对角线重复水印（平铺）
            ctx.save();
            ctx.rotate(-Math.PI / 6);
            ctx.font = `${fontSize * 0.8}px Arial`;
            ctx.fillStyle = 'rgba(128, 128, 128, 0.15)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const watermarkSpacing = fontSize * 8;
            for (let x = -height; x < width + height; x += watermarkSpacing) {
              for (let y = -height; y < height * 2; y += watermarkSpacing) {
                ctx.fillText(watermarkText, x, y);
              }
            }
            ctx.restore();
          }

          // 转换为WebP
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          resolve(webpDataUrl);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // 添加图片
  const handleAddImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (images.length + files.length > maxImages) {
      toast.error(`最多上传 ${maxImages} 张图片`);
      return;
    }

    setCompressing(true);
    try {
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} 不是图片文件`);
          continue;
        }
        // 检查文件大小（限制5MB）
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} 超过5MB限制`);
          continue;
        }
        // 压缩为WebP
        const webpDataUrl = await compressToWebP(file);
        newImages.push(webpDataUrl);
      }
      onChange([...images, ...newImages]);
      toast.success(`已添加 ${newImages.length} 张图片`);
    } catch (err) {
      toast.error('图片处理失败');
    } finally {
      setCompressing(false);
      // 清空input，允许重复选择同一文件
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  // 移除图片
  const handleRemoveImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <div className="space-y-3">
      {/* 图片预览 */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((image, index) => (
            <Card key={index} className="relative group">
              <CardContent className="p-2">
                <img
                  src={image}
                  alt={`图片 ${index + 1}`}
                  className="w-full h-32 object-cover rounded"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 上传按钮 */}
      {images.length < maxImages && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAddImage}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={compressing}
            className="w-full"
          >
            {compressing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                压缩中...
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 mr-2" />
                上传图片（{images.length}/{maxImages}）
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            支持 JPG、PNG、GIF 等格式，自动压缩为 WebP，单张限制 5MB
          </p>
        </div>
      )}
    </div>
  );
}
