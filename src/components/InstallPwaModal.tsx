import { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPwaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalled?: () => void;
}

export function InstallPwaModal({ isOpen, onClose, onInstalled }: InstallPwaModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Detect if already installed / standalone
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        onInstalled?.();
      }
      setDeferredPrompt(null);
      onClose();
    }
  };

  const handleConfirmIosInstalled = () => {
    setIsInstalled(true);
    onInstalled?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-[max(3.75rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] bg-black/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="bg-[#ffffff] dark:bg-[#0f1d36] border border-[#dbe6f5] dark:border-[#1e2f4d] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5rem)] overflow-y-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#dbe6f5] dark:border-[#1e2f4d] flex items-center justify-between bg-[#f0f5fc] dark:bg-[#0a1120]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-[#0f172a] dark:text-[#f1f5f9]">
                Installa come Web App
              </h3>
              <p className="text-xs text-[#64748b] dark:text-[#94a3b8]">
                Usa a schermo intero e offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748b] hover:text-[#0f172a] dark:hover:text-[#f1f5f9] hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {isInstalled ? (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-center space-y-2">
              <CheckCircle className="w-10 h-10 text-blue-600 mx-auto" />
              <h4 className="font-display font-bold text-base text-blue-900 dark:text-blue-200">
                L'applicazione è già installata!
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Puoi aprirla direttamente dalla schermata Home del tuo dispositivo o dal launcher delle applicazioni.
              </p>
            </div>
          ) : isIOS ? (
            // iOS Instructions
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/40 rounded-xl text-xs text-blue-900 dark:text-blue-200 flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span>
                  Segui questi 3 semplici passaggi in <strong>Safari su iPhone</strong>:
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-[#0f172a] dark:text-[#f1f5f9]">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0f5fc] dark:bg-[#0a1120] border border-[#dbe6f5] dark:border-[#1e2f4d]">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    1
                  </div>
                  <div>
                    <span className="font-semibold block mb-0.5">Tocca l'icona Condividi</span>
                    <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1">
                      In basso nella barra di Safari tocca <Share className="w-3.5 h-3.5 text-blue-600 inline" /> (il quadrato con la freccia).
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0f5fc] dark:bg-[#0a1120] border border-[#dbe6f5] dark:border-[#1e2f4d]">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    2
                  </div>
                  <div>
                    <span className="font-semibold block mb-0.5">Aggiungi a schermata Home</span>
                    <span className="text-[#64748b] dark:text-[#94a3b8] flex items-center gap-1">
                      Scorri il menu e tocca <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" /> <strong>"Aggiungi alla schermata Home"</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#f0f5fc] dark:bg-[#0a1120] border border-[#dbe6f5] dark:border-[#1e2f4d]">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-xs">
                    3
                  </div>
                  <div>
                    <span className="font-semibold block mb-0.5">Conferma "Aggiungi"</span>
                    <span className="text-[#64748b] dark:text-[#94a3b8]">
                      Tocca <strong>"Aggiungi"</strong> in alto a destra. L'icona apparirà sulla schermata principale del tuo iPhone!
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmIosInstalled}
                  className="w-full mt-3 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Ho aggiunto l'app alla schermata Home</span>
                </button>
              </div>
            </div>
          ) : (
            // Desktop / Android Instructions
            <div className="space-y-4">
              <p className="text-xs sm:text-sm text-[#64748b] dark:text-[#94a3b8]">
                Installando l'applicazione potrai aprirla come una vera app nativa: a schermo intero senza barre del browser, con avvio istantaneo e funzionamento garantito anche quando sei offline.
              </p>

              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Installa ora l'app</span>
                </button>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-xs text-amber-900 dark:text-amber-200">
                  Per installarla, tocca l'icona con il simbolo <strong>+</strong> o <strong>Installa</strong> nella barra degli indirizzi del tuo browser (Chrome, Edge o Safari).
                </div>
              )}
            </div>
          )}

          <div className="pt-2 text-[11px] text-[#64748b] dark:text-[#94a3b8] text-center border-t border-[#dbe6f5] dark:border-[#1e2f4d]">
            ✓ Dati 100% individuali e salvati in locale sul tuo dispositivo
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#dbe6f5] dark:border-[#1e2f4d] bg-[#f0f5fc] dark:bg-[#0a1120] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}
