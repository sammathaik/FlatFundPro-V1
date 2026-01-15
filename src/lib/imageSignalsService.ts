import ExifReader from 'exifreader';
import { supabase } from './supabase';

export interface PerceptualHashResult {
  hash: string;
  algorithm: 'dhash';
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarToPaymentId: string | null;
  similarityPercentage: number;
  explanation: string;
}

export interface MetadataSignal {
  exifAvailable: boolean;
  creationDate: string | null;
  sourceType: 'screenshot' | 'camera' | 'unknown' | 'edited';
  metadataStripped: boolean;
  editorDetected: string | null;
  notes: string;
}

export interface ScreenshotValiditySignal {
  looksLikeScreenshot: boolean;
  aspectRatio: string;
  resolutionWidth: number;
  resolutionHeight: number;
  textDensityScore: number;
  explanation: string;
}

export interface ImageSignalsAnalysis {
  duplicateCheck: DuplicateCheckResult;
  metadataSignal: MetadataSignal;
  screenshotValidity: ScreenshotValiditySignal;
  perceptualHash: string;
}

export class ImageSignalsService {
  static async computePerceptualHash(imageUrl: string): Promise<PerceptualHashResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const hash = this.computeDHash(img);
          resolve({ hash, algorithm: 'dhash' });
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private static computeDHash(img: HTMLImageElement): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');

    const width = 9;
    const height = 8;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(img, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const grayscale: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      grayscale.push(Math.round(gray));
    }

    let hash = '';
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width - 1; col++) {
        const idx = row * width + col;
        const left = grayscale[idx];
        const right = grayscale[idx + 1];
        hash += left < right ? '1' : '0';
      }
    }

    return this.binaryToHex(hash);
  }

  private static binaryToHex(binary: string): string {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      const chunk = binary.substr(i, 4);
      hex += parseInt(chunk, 2).toString(16);
    }
    return hex;
  }

  static async checkForDuplicates(
    perceptualHash: string,
    currentPaymentId: string
  ): Promise<DuplicateCheckResult> {
    try {
      const { data, error } = await supabase.rpc('check_similar_images', {
        p_perceptual_hash: perceptualHash,
        p_payment_id: currentPaymentId,
        p_similarity_threshold: 85
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].found) {
        return {
          isDuplicate: true,
          similarToPaymentId: data[0].similar_payment_id,
          similarityPercentage: data[0].similarity_pct,
          explanation: data[0].explanation
        };
      }

      return {
        isDuplicate: false,
        similarToPaymentId: null,
        similarityPercentage: 0,
        explanation: 'No similar images found'
      };
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        similarToPaymentId: null,
        similarityPercentage: 0,
        explanation: 'Error during duplicate check'
      };
    }
  }

  static async extractMetadataSignals(imageFile: File | Blob): Promise<MetadataSignal> {
    try {
      const tags = await ExifReader.load(imageFile);

      const hasExif = Object.keys(tags).length > 10;

      let sourceType: 'screenshot' | 'camera' | 'unknown' | 'edited' = 'unknown';
      let editorDetected: string | null = null;
      let metadataStripped = !hasExif;
      let creationDate: string | null = null;
      let notes = '';

      if (hasExif) {
        const software = tags.Software?.description || tags.ProcessingSoftware?.description || '';
        const make = tags.Make?.description || '';
        const model = tags.Model?.description || '';

        if (software.toLowerCase().includes('screenshot')) {
          sourceType = 'screenshot';
          notes = 'Image contains screenshot metadata';
        } else if (software.toLowerCase().match(/photoshop|gimp|paint|editor|pixlr|canva/)) {
          sourceType = 'edited';
          editorDetected = software;
          notes = `Image edited with: ${software}`;
        } else if (make || model) {
          sourceType = 'camera';
          notes = `Photo taken with: ${make} ${model}`.trim();
        } else if (software) {
          sourceType = 'screenshot';
          notes = `Created by: ${software}`;
        }

        if (tags.DateTime?.description) {
          creationDate = tags.DateTime.description;
        } else if (tags.DateTimeOriginal?.description) {
          creationDate = tags.DateTimeOriginal.description;
        }
      } else {
        notes = 'No EXIF metadata found (common for screenshots or web-saved images)';
      }

      return {
        exifAvailable: hasExif,
        creationDate,
        sourceType,
        metadataStripped,
        editorDetected,
        notes
      };
    } catch (error) {
      return {
        exifAvailable: false,
        creationDate: null,
        sourceType: 'unknown',
        metadataStripped: true,
        editorDetected: null,
        notes: 'Unable to read EXIF data (this is normal for many screenshots)'
      };
    }
  }

  static async analyzeScreenshotValidity(imageUrl: string): Promise<ScreenshotValiditySignal> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;

        const aspectRatio = height / width;
        let aspectRatioText = '';
        let looksLikeScreenshot = false;
        let explanation = '';

        if (aspectRatio >= 1.7 && aspectRatio <= 1.9) {
          aspectRatioText = '9:16 (Standard)';
          looksLikeScreenshot = true;
          explanation = 'Standard mobile screenshot aspect ratio';
        } else if (aspectRatio >= 2.0 && aspectRatio <= 2.3) {
          aspectRatioText = '9:19.5 (Tall)';
          looksLikeScreenshot = true;
          explanation = 'Modern tall mobile screenshot (iPhone 12+, etc.)';
        } else if (aspectRatio >= 1.3 && aspectRatio <= 1.6) {
          aspectRatioText = '3:4 or 9:13';
          looksLikeScreenshot = true;
          explanation = 'Tablet or older mobile screenshot';
        } else if (aspectRatio < 1.0) {
          aspectRatioText = 'Landscape';
          looksLikeScreenshot = false;
          explanation = 'Unusual: Payment screenshots are typically portrait mode';
        } else {
          aspectRatioText = `Unusual (${aspectRatio.toFixed(2)})`;
          looksLikeScreenshot = false;
          explanation = 'Non-standard aspect ratio for mobile screenshot';
        }

        if (width < 200 || height < 300) {
          looksLikeScreenshot = false;
          explanation += '; Very low resolution';
        } else if (width > 2000 || height > 4000) {
          explanation += '; Unusually high resolution';
        }

        const textDensityScore = this.estimateTextDensity(img);

        resolve({
          looksLikeScreenshot,
          aspectRatio: aspectRatioText,
          resolutionWidth: width,
          resolutionHeight: height,
          textDensityScore,
          explanation
        });
      };

      img.onerror = () => {
        resolve({
          looksLikeScreenshot: false,
          aspectRatio: 'Unknown',
          resolutionWidth: 0,
          resolutionHeight: 0,
          textDensityScore: 0,
          explanation: 'Failed to analyze image'
        });
      };

      img.src = imageUrl;
    });
  }

  private static estimateTextDensity(img: HTMLImageElement): number {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0;

      const sampleWidth = 100;
      const sampleHeight = 100;
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;

      ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const pixels = imageData.data;

      let edgeCount = 0;
      const threshold = 30;

      for (let y = 1; y < sampleHeight - 1; y++) {
        for (let x = 1; x < sampleWidth - 1; x++) {
          const idx = (y * sampleWidth + x) * 4;
          const gray = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];

          const rightIdx = (y * sampleWidth + x + 1) * 4;
          const rightGray = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2];

          if (Math.abs(gray - rightGray) > threshold) {
            edgeCount++;
          }
        }
      }

      const maxEdges = (sampleWidth - 2) * (sampleHeight - 2);
      const density = Math.min(100, Math.round((edgeCount / maxEdges) * 100 * 3));

      return density;
    } catch (error) {
      return 50;
    }
  }

  static async analyzeImage(
    imageUrl: string,
    imageFile: File | Blob,
    paymentId: string
  ): Promise<ImageSignalsAnalysis> {
    const [hashResult, metadataSignal, screenshotValidity] = await Promise.all([
      this.computePerceptualHash(imageUrl),
      this.extractMetadataSignals(imageFile),
      this.analyzeScreenshotValidity(imageUrl)
    ]);

    const duplicateCheck = await this.checkForDuplicates(hashResult.hash, paymentId);

    return {
      duplicateCheck,
      metadataSignal,
      screenshotValidity,
      perceptualHash: hashResult.hash
    };
  }

  static async storeImageSignals(
    paymentSubmissionId: string,
    imageUrl: string,
    analysis: ImageSignalsAnalysis
  ): Promise<void> {
    try {
      const { error: signalsError } = await supabase
        .from('payment_image_signals')
        .insert({
          payment_submission_id: paymentSubmissionId,
          image_url: imageUrl,
          perceptual_hash: analysis.perceptualHash,
          duplicate_detected: analysis.duplicateCheck.isDuplicate,
          similar_to_payment_id: analysis.duplicateCheck.similarToPaymentId,
          similarity_percentage: analysis.duplicateCheck.similarityPercentage,
          similarity_explanation: analysis.duplicateCheck.explanation,
          exif_available: analysis.metadataSignal.exifAvailable,
          exif_creation_date: analysis.metadataSignal.creationDate,
          exif_source_type: analysis.metadataSignal.sourceType,
          exif_metadata_stripped: analysis.metadataSignal.metadataStripped,
          exif_editor_detected: analysis.metadataSignal.editorDetected,
          metadata_notes: analysis.metadataSignal.notes,
          looks_like_screenshot: analysis.screenshotValidity.looksLikeScreenshot,
          aspect_ratio: analysis.screenshotValidity.aspectRatio,
          resolution_width: analysis.screenshotValidity.resolutionWidth,
          resolution_height: analysis.screenshotValidity.resolutionHeight,
          text_density_score: analysis.screenshotValidity.textDensityScore,
          screenshot_validity_explanation: analysis.screenshotValidity.explanation,
          analysis_status: 'completed',
          analyzed_at: new Date().toISOString()
        });

      if (signalsError) throw signalsError;

      const { data: existingHash } = await supabase
        .from('image_perceptual_hash_index')
        .select('perceptual_hash, upload_count')
        .eq('perceptual_hash', analysis.perceptualHash)
        .maybeSingle();

      if (existingHash) {
        await supabase
          .from('image_perceptual_hash_index')
          .update({
            upload_count: existingHash.upload_count + 1,
            last_updated_at: new Date().toISOString()
          })
          .eq('perceptual_hash', analysis.perceptualHash);

        await supabase
          .from('payment_image_signals')
          .update({
            duplicate_detected: true,
            similarity_percentage: 100,
            similarity_explanation: 'Duplicate detected after hash index update'
          })
          .eq('payment_submission_id', paymentSubmissionId);
      } else {
        const { error: hashError } = await supabase
          .from('image_perceptual_hash_index')
          .insert({
            perceptual_hash: analysis.perceptualHash,
            hash_algorithm: 'dhash',
            first_payment_id: paymentSubmissionId,
            first_uploaded_at: new Date().toISOString(),
            upload_count: 1
          });

        if (hashError) {
          console.warn('Hash index storage warning:', hashError);
        }
      }
    } catch (error) {
      console.error('Error storing image signals:', error);
      await supabase
        .from('payment_image_signals')
        .insert({
          payment_submission_id: paymentSubmissionId,
          image_url: imageUrl,
          analysis_status: 'failed',
          analysis_error: error instanceof Error ? error.message : 'Unknown error',
          analyzed_at: new Date().toISOString()
        });
    }
  }
}
