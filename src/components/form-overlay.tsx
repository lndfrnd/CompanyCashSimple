import { Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface FormOverlayProps {
  isVisible: boolean;
  firstName: string;
  color?: string;
}

export function FormOverlay({ isVisible, firstName, color }: FormOverlayProps) {
  const [showLoader, setShowLoader] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    let loaderTimeout: NodeJS.Timeout;
    let messageTimeout: NodeJS.Timeout;

    if (isVisible) {
      setShowLoader(true);
      messageTimeout = setTimeout(() => {
        setShowLoader(false);
        setShowMessage(true);
      }, 2000);
    } else {
      setShowLoader(false);
      setShowMessage(false);
    }

    return () => {
      clearTimeout(loaderTimeout);
      clearTimeout(messageTimeout);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      {showLoader && (
        <div className="animate-in fade-in zoom-in duration-300">
          <Loader2 
            className="h-24 w-24 animate-spin" 
            style={{ color: color || '#000000' }}
          />
        </div>
      )}
      
      {showMessage && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md text-center px-6">
          <h3 className="text-xl font-semibold mb-4">
            Thanks {firstName}!
          </h3>
          <p className="text-muted-foreground mb-3">
            Our expert team will get to work now on matching you with one of our great lending partners. One of our friendly team members will be in touch <strong>ASAP!</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Please keep an eye out on your phone as we'll text before we call!
          </p>
        </div>
      )}
    </div>
  );
}