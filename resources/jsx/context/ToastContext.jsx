import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);
let idSeq = 1;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const push = useCallback((msg, icon = 'fa-circle-check') => {
        const id = idSeq++;
        setToasts((t) => [...t, { id, msg, icon }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
    }, []);

    return (
        <ToastContext.Provider value={push}>
            {children}
            <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[200] space-y-2 sm:max-w-sm" role="status" aria-live="polite">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className="ff-toast-pop bg-midnight-800/95 backdrop-blur border border-midnight-400/50 text-white px-4 sm:px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-0"
                    >
                        <i className={`fa-solid ${t.icon} text-midnight-300 w-4 text-center shrink-0`}></i>
                        <span className="text-xs font-semibold min-w-0 break-words">{t.msg}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
