/**
 * Image Upload Utilities
 * 
 * Utilities for downloading, cropping, and uploading images
 */

import { lmsAdminApi } from '../../../../api/lmsAdminClient';
import type { MediaRef } from '@gravyty/domain';

/**
 * Crop image to 16:9 aspect ratio (1600x900)
 * Centers the crop on the image
 */
export async function cropTo16x9(imageFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Target dimensions (16:9 aspect ratio)
        const targetWidth = 1600;
        const targetHeight = 900;
        const targetAspectRatio = targetWidth / targetHeight; // 16/9 ≈ 1.778

        // Calculate source dimensions maintaining aspect ratio
        let sourceWidth = img.width;
        let sourceHeight = img.height;
        const sourceAspectRatio = sourceWidth / sourceHeight;

        let cropX = 0;
        let cropY = 0;
        let cropWidth = sourceWidth;
        let cropHeight = sourceHeight;

        // Crop source image to match target aspect ratio
        if (sourceAspectRatio > targetAspectRatio) {
          // Source is wider - crop width
          cropWidth = sourceHeight * targetAspectRatio;
          cropX = (sourceWidth - cropWidth) / 2; // Center horizontally
        } else {
          // Source is taller - crop height
          cropHeight = sourceWidth / targetAspectRatio;
          cropY = (sourceHeight - cropHeight) / 2; // Center vertically
        }

        // Set canvas size to target dimensions
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Draw cropped and resized image
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          0,
          0,
          targetWidth,
          targetHeight
        );

        // Convert canvas to blob, then to File
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            const croppedFile = new File([blob], imageFile.name, {
              type: imageFile.type || 'image/png',
              lastModified: Date.now(),
            });
            resolve(croppedFile);
          },
          imageFile.type || 'image/png',
          0.95 // Quality (for JPEG)
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(imageFile);
  });
}

/**
 * Download image from URL using backend proxy (to avoid CORS issues)
 */
export async function downloadImage(imageUrl: string, useProxy: boolean = true): Promise<File> {
  console.log('[imageUpload] Downloading image from URL:', imageUrl, 'useProxy:', useProxy);
  
  try {
    let blob: Blob;
    let contentType: string;

    if (useProxy) {
      // Use backend proxy to avoid CORS issues (especially for OpenAI Azure blob storage)
      const proxyResponse = await lmsAdminApi.downloadAIImage({ image_url: imageUrl });
      
      if ('error' in proxyResponse) {
        throw new Error(proxyResponse.error.message || 'Failed to download image via proxy');
      }

      // Convert data URL to blob
      const response = await fetch(proxyResponse.data.data_url);
      blob = await response.blob();
      contentType = proxyResponse.data.content_type;
    } else {
      // Direct download (for URLs that support CORS)
      const response = await fetch(imageUrl, {
        mode: 'cors',
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}. ${errorText}`);
      }

      blob = await response.blob();
      contentType = response.headers.get('content-type') || 'image/png';
    }

    const filename = `downloaded-${Date.now()}.${contentType.split('/')[1] || 'png'}`;

    console.log('[imageUpload] Image downloaded successfully:', {
      size: blob.size,
      contentType,
      filename,
    });

    return new File([blob], filename, { type: contentType });
  } catch (error) {
    console.error('[imageUpload] Error downloading image:', error);
    throw error;
  }
}

/**
 * Download image from URL, optionally crop to 16:9, and upload to S3
 */
export async function downloadAndUploadImage(
  imageUrl: string,
  filename: string,
  mediaType: 'cover' | 'video' | 'poster' | 'attachment',
  courseId?: string,
  lessonId?: string,
  temporary?: boolean,
  shouldCropTo16x9: boolean = true // Default: true for cover images
): Promise<MediaRef> {
  console.log('[imageUpload] Starting download and upload process:', {
    imageUrl,
    filename,
    mediaType,
    courseId,
    temporary,
    shouldCropTo16x9,
  });

  try {
    // Download image - use proxy for AI-generated images (OpenAI Azure blob storage has CORS restrictions)
    // Check if URL is from OpenAI/Azure blob storage
    const isAIImage = imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') || 
                      imageUrl.includes('openai.com') ||
                      imageUrl.includes('dalle');
    console.log('[imageUpload] Step 1: Downloading image...', { isAIImage, useProxy: isAIImage });
    const downloadedFile = await downloadImage(imageUrl, isAIImage);

    // Crop if requested
    console.log('[imageUpload] Step 2: Processing image...');
    const fileToUpload = shouldCropTo16x9 ? await cropTo16x9(downloadedFile) : downloadedFile;
    console.log('[imageUpload] Image processed:', {
      originalSize: downloadedFile.size,
      processedSize: fileToUpload.size,
      type: fileToUpload.type,
    });

    // Get presigned upload URL (this creates the media record)
    console.log('[imageUpload] Step 3: Getting presigned upload URL...');
    const presignResponse = await lmsAdminApi.presignMediaUpload({
      media_type: mediaType,
      course_id: courseId,
      lesson_id: lessonId,
      filename: filename,
      content_type: fileToUpload.type,
      temporary: temporary,
    });

    if ('error' in presignResponse) {
      throw new Error(presignResponse.error.message || 'Failed to get upload URL');
    }

    const mediaId = presignResponse.data.media_ref.media_id;
    console.log('[imageUpload] Step 4: Uploading via API proxy (to avoid CORS)...', {
      mediaId,
      contentType: fileToUpload.type,
    });

    // Upload through API proxy to avoid CORS issues with S3 presigned URLs
    // The API proxy handles the S3 upload server-side
    const uploadResponse = await lmsAdminApi.uploadMedia(mediaId, fileToUpload);

    if ('error' in uploadResponse) {
      throw new Error(uploadResponse.error.message || 'Failed to upload image');
    }

    console.log('[imageUpload] Upload successful!', {
      mediaId: uploadResponse.data.media_ref.media_id,
      url: uploadResponse.data.media_ref.url,
    });

    return uploadResponse.data.media_ref;
  } catch (error) {
    console.error('[imageUpload] Error in downloadAndUploadImage:', error);
    throw error;
  }
}

