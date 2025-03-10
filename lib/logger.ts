// lib/logger.ts
export function logInfo(message: string, data?: Record<string, unknown>) {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
    
    // Di production, Anda mungkin ingin mengirim log ke layanan monitoring
    if (process.env.NODE_ENV === 'production') {
      // Misalnya, kirim ke Sentry, LogRocket, atau layanan monitoring lainnya
      // Uncomment and configure when ready to use
      // sendToMonitoringService('info', message, data);
    }
  }
  
  export function logError(message: string, error: unknown) {
    console.error(`[ERROR] ${message}`, error);
    
    // Di production, Anda mungkin ingin mengirim error ke layanan monitoring
    if (process.env.NODE_ENV === 'production') {
      // Misalnya, kirim ke Sentry, LogRocket, atau layanan monitoring lainnya
      // Uncomment and configure when ready to use
      // sendToMonitoringService('error', message, { error });
    }
  }
  
  export function logWarning(message: string, data?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : '');
  }
  
  // Placeholder for future monitoring service integration
  // function sendToMonitoringService(level: 'info' | 'error' | 'warn', message: string, data?: Record<string, unknown>) {
  //   // Implementation for your monitoring service
  // }