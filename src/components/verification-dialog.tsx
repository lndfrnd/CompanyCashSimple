import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface VerificationDialogProps {
  isOpen: boolean;
  onVerified: () => void;
  onClose: () => void;
  phoneNumber: string;
}

export function VerificationDialog({ isOpen, onVerified, onClose, phoneNumber }: VerificationDialogProps) {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [remainingTime, setRemainingTime] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isOpen && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, remainingTime]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, any 6-digit code works
      // In production, this would verify against Twilio's API
      if (code.length === 6) {
        onVerified();
      } else {
        setError('Invalid verification code');
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setRemainingTime(30);
    // In production, this would call Twilio's API to resend the code
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter confirmation code</DialogTitle>
          <DialogDescription>
            Check your email and enter the code - Try 6548
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-4">
            <Input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
                setError('');
              }}
              className="text-center text-2xl tracking-widest"
              maxLength={6}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleVerify} 
              disabled={code.length !== 6 || isVerifying}
              className="w-full"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="ghost"
                disabled={!canResend}
                onClick={handleResend}
                className="text-sm"
              >
                Resend code
              </Button>
              {!canResend && (
                <span className="text-sm text-muted-foreground">
                  ({remainingTime}s)
                </span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}