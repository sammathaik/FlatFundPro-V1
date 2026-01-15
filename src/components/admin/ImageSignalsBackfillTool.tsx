import { useState } from 'react';
import { Image, AlertCircle, CheckCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ImageSignalsService } from '../../lib/imageSignalsService';

interface BackfillStats {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  skipped: number;
}

export default function ImageSignalsBackfillTool() {
  const [running, setRunning] = useState(false);
  const [stats, setStats] = useState<BackfillStats>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const fetchImageAsBlob = async (url: string): Promise<Blob> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    return await response.blob();
  };

  const processPayment = async (payment: any): Promise<boolean> => {
    try {
      // Check if already processed
      const { data: existing } = await supabase
        .from('payment_image_signals')
        .select('id')
        .eq('payment_submission_id', payment.id)
        .single();

      if (existing) {
        addLog(`⏭️  Skipped ${payment.flat_id} - Already analyzed`);
        setStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
        return true;
      }

      // Fetch image as blob
      const imageBlob = await fetchImageAsBlob(payment.screenshot_url);

      // Analyze image
      const analysis = await ImageSignalsService.analyzeImage(
        payment.screenshot_url,
        imageBlob,
        payment.id
      );

      // Store results
      await ImageSignalsService.storeImageSignals(
        payment.id,
        payment.screenshot_url,
        analysis
      );

      addLog(`✅ Processed ${payment.flat_id} - ${analysis.duplicateCheck.isDuplicate ? 'Duplicate detected!' : 'OK'}`);
      setStats(prev => ({ ...prev, successful: prev.successful + 1 }));
      return true;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Failed ${payment.flat_id} - ${errorMsg}`);
      setStats(prev => ({ ...prev, failed: prev.failed + 1 }));

      // Store failed status
      try {
        await supabase
          .from('payment_image_signals')
          .insert({
            payment_submission_id: payment.id,
            image_url: payment.screenshot_url,
            analysis_status: 'failed',
            analysis_error: errorMsg,
            analyzed_at: new Date().toISOString()
          });
      } catch (e) {
        console.error('Failed to store error status:', e);
      }

      return false;
    }
  };

  const startBackfill = async () => {
    setRunning(true);
    setCompleted(false);
    setLogs([]);
    setStats({
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0
    });

    try {
      addLog('🔍 Fetching payment submissions with screenshots...');

      // Fetch all payments with screenshots
      const { data: payments, error } = await supabase
        .from('payment_submissions')
        .select('id, flat_id, screenshot_url, created_at')
        .not('screenshot_url', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!payments || payments.length === 0) {
        addLog('ℹ️  No payment submissions found with screenshots');
        setRunning(false);
        return;
      }

      addLog(`📊 Found ${payments.length} payment submissions to process`);
      setStats(prev => ({ ...prev, total: payments.length }));

      // Process in batches of 5 to avoid overwhelming the system
      const BATCH_SIZE = 5;
      for (let i = 0; i < payments.length; i += BATCH_SIZE) {
        const batch = payments.slice(i, i + BATCH_SIZE);

        addLog(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(payments.length / BATCH_SIZE)}`);

        await Promise.all(batch.map(payment => processPayment(payment)));

        setStats(prev => ({ ...prev, processed: Math.min(i + BATCH_SIZE, payments.length) }));

        // Small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < payments.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      addLog('✨ Backfill completed successfully!');
      setCompleted(true);

    } catch (error) {
      console.error('Backfill error:', error);
      addLog(`💥 Critical error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const progressPercentage = stats.total > 0
    ? Math.round((stats.processed / stats.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <Image className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Image Signals Backfill Tool</h2>
            <p className="text-sm text-indigo-100">Process existing payment submissions for image analysis</p>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="p-6 bg-blue-50 border-b border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">What does this do?</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Analyzes existing payment screenshots for duplicate detection</li>
              <li>• Extracts metadata and validates screenshot characteristics</li>
              <li>• Enables detection of duplicate images across old and new submissions</li>
              <li>• Safe to run multiple times (skips already-processed payments)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="p-6 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-900">{stats.processed}</div>
              <div className="text-xs text-blue-600">Processed</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-900">{stats.successful}</div>
              <div className="text-xs text-green-600">Successful</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-900">{stats.skipped}</div>
              <div className="text-xs text-yellow-600">Skipped</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
              <div className="text-xs text-red-600">Failed</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-sm text-gray-600 mt-2 text-center">
            {progressPercentage}% complete
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-6 border-b border-gray-200">
        <button
          onClick={startBackfill}
          disabled={running}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
            running
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {running ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : completed ? (
            <>
              <RefreshCw className="w-5 h-5" />
              Run Again
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Backfill
            </>
          )}
        </button>
      </div>

      {/* Logs */}
      {logs.length > 0 && (
        <div className="p-6 bg-gray-900">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Activity Log</h3>
          <div className="bg-black rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1">
            {logs.map((log, index) => (
              <div
                key={index}
                className={`${
                  log.includes('✅') ? 'text-green-400' :
                  log.includes('❌') ? 'text-red-400' :
                  log.includes('⏭️') ? 'text-yellow-400' :
                  log.includes('✨') ? 'text-purple-400' :
                  'text-gray-400'
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completion Message */}
      {completed && (
        <div className="p-6 bg-green-50 border-t border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Backfill completed!</p>
              <p className="text-sm text-green-700">
                Successfully processed {stats.successful} payment submissions.
                {stats.failed > 0 && ` ${stats.failed} failed (check logs above).`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
