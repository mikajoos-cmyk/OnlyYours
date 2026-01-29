// src/components/profile/ImageCropDialog.tsx
import { useState, useRef, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Loader2Icon, ZoomInIcon, ZoomOutIcon } from 'lucide-react';

interface ImageCropDialogProps {
    isOpen: boolean;
    imageFile: File | null;
    onClose: () => void;
    onCropComplete: (croppedBlob: Blob) => void;
}

export default function ImageCropDialog({
    isOpen,
    imageFile,
    onClose,
    onCropComplete,
}: ImageCropDialogProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isProcessing, setIsProcessing] = useState(false);

    // Load image when file changes
    useEffect(() => {
        if (!imageFile) {
            setImage(null);
            return;
        }

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target?.result as string;
        };

        img.onload = () => {
            setImage(img);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        };

        reader.readAsDataURL(imageFile);
    }, [imageFile]);

    // Draw canvas whenever image, zoom, or position changes
    useEffect(() => {
        if (!image || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Canvas size
        const canvasSize = 400;
        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Calculate scaled image dimensions
        const scale = Math.min(canvasSize / image.width, canvasSize / image.height);
        const scaledWidth = image.width * scale * zoom;
        const scaledHeight = image.height * scale * zoom;

        // Center the image initially, then apply position offset
        const x = (canvasSize - scaledWidth) / 2 + position.x;
        const y = (canvasSize - scaledHeight) / 2 + position.y;

        // Draw image
        ctx.drawImage(image, x, y, scaledWidth, scaledHeight);

        // Draw circular crop overlay
        ctx.save();

        // Darken everything outside the circle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Cut out the circle
        ctx.globalCompositeOperation = 'destination-out';
        const cropRadius = canvasSize / 2 - 20; // 20px padding
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, cropRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Draw circle border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(canvasSize / 2, canvasSize / 2, cropRadius, 0, Math.PI * 2);
        ctx.stroke();
    }, [image, zoom, position]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleCrop = async () => {
        if (!image || !canvasRef.current) return;

        setIsProcessing(true);
        try {
            const canvas = canvasRef.current;
            const canvasSize = 400;
            const cropRadius = canvasSize / 2 - 20;

            // Create a new canvas for the cropped image
            const cropCanvas = document.createElement('canvas');
            const cropSize = cropRadius * 2;
            cropCanvas.width = cropSize;
            cropCanvas.height = cropSize;
            const cropCtx = cropCanvas.getContext('2d');
            if (!cropCtx) return;

            // Calculate the source region from the main canvas
            const sourceX = canvasSize / 2 - cropRadius;
            const sourceY = canvasSize / 2 - cropRadius;

            // Create circular clipping path
            cropCtx.beginPath();
            cropCtx.arc(cropRadius, cropRadius, cropRadius, 0, Math.PI * 2);
            cropCtx.closePath();
            cropCtx.clip();

            // Draw the cropped portion
            cropCtx.drawImage(
                canvas,
                sourceX,
                sourceY,
                cropSize,
                cropSize,
                0,
                0,
                cropSize,
                cropSize
            );

            // Convert to blob
            cropCanvas.toBlob((blob) => {
                if (blob) {
                    onCropComplete(blob);
                    handleClose();
                }
                setIsProcessing(false);
            }, 'image/jpeg', 0.95);
        } catch (error) {
            console.error('Error cropping image:', error);
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setImage(null);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        setIsDragging(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-card border-border max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-foreground">Profilbild zuschneiden</DialogTitle>
                    <DialogDescription className="text-muted-foreground">
                        Ziehen Sie das Bild, um es zu positionieren, und verwenden Sie den Schieberegler zum Zoomen.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Canvas */}
                    <div className="flex justify-center">
                        <canvas
                            ref={canvasRef}
                            className="border border-border rounded-lg cursor-move"
                            style={{ maxWidth: '100%', height: 'auto' }}
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        />
                    </div>

                    {/* Zoom Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-foreground flex items-center gap-2">
                                <ZoomOutIcon className="w-4 h-4" />
                                Zoom
                            </Label>
                            <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}x</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Slider
                                value={[zoom]}
                                onValueChange={(values: number[]) => setZoom(values[0])}
                                min={1}
                                max={3}
                                step={0.1}
                                className="flex-1"
                            />
                            <ZoomInIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isProcessing}
                        className="bg-background text-foreground border-border hover:bg-neutral"
                    >
                        Abbrechen
                    </Button>
                    <Button
                        type="button"
                        onClick={handleCrop}
                        disabled={!image || isProcessing}
                        className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                                Verarbeite...
                            </>
                        ) : (
                            'Speichern'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
