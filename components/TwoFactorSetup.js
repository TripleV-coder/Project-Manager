'use client';

import { useState, useEffect } from 'react';
import { Shield, Copy, Check, AlertTriangle, Smartphone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from '@/contexts/AppSettingsContext';

export default function TwoFactorSetup({ isEnabled = false, onStatusChange }) {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(isEnabled);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [backupCodesDialogOpen, setBackupCodesDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Setup state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);

  // Disable state
  const [disablePassword, setDisablePassword] = useState('');
  const [disable2FACode, setDisable2FACode] = useState('');

  // Regenerate state
  const [regeneratePassword, setRegeneratePassword] = useState('');

  const [copiedSecret, setCopiedSecret] = useState(false);

  useEffect(() => {
    setEnabled(isEnabled);
  }, [isEnabled]);

  const startSetup = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        setQrCodeUrl(data.data.qrCodeUrl);
        setSecret(data.data.secret);
        setStep(2);
        setSetupDialogOpen(true);
      } else {
        toast.error(data.error || t('twoFactorSetupError'));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (verificationCode.length !== 6) {
      toast.error(t('twoFactorCodeLength'));
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/auth/2fa/verify-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await response.json();
      if (response.ok) {
        setBackupCodes(data.data.backupCodes);
        setStep(3);
        setEnabled(true);
        onStatusChange?.(true);
        toast.success(t('twoFactorEnabled'));
      } else {
        toast.error(data.error || t('invalidCode'));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error(t('passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: disablePassword,
          token: disable2FACode || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setEnabled(false);
        onStatusChange?.(false);
        setDisableDialogOpen(false);
        setDisablePassword('');
        setDisable2FACode('');
        toast.success(t('twoFactorDisabled'));
      } else {
        toast.error(data.error || t('twoFactorDisableError'));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCodes = async () => {
    if (!regeneratePassword) {
      toast.error(t('passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/auth/2fa/regenerate-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: regeneratePassword })
      });

      const data = await response.json();
      if (response.ok) {
        setBackupCodes(data.data.backupCodes);
        setRegenerateDialogOpen(false);
        setBackupCodesDialogOpen(true);
        setRegeneratePassword('');
        toast.success(t('backupCodesGenerated'));
      } else {
        toast.error(data.error || t('backupCodesError'));
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('connectionError'));
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const copyAllBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    toast.success(t('codesCopied'));
  };

  const closeSetupDialog = () => {
    setSetupDialogOpen(false);
    setStep(1);
    setQrCodeUrl('');
    setSecret('');
    setVerificationCode('');
    setBackupCodes([]);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Shield className={`w-5 h-5 ${enabled ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{t('twoFactorAuth')}</CardTitle>
                <CardDescription>
                  {t('twoFactorDescription')}
                </CardDescription>
              </div>
            </div>
            <Badge className={enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
              {enabled ? t('enabled') : t('disabled')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {enabled ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('twoFactorProtectedMessage')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRegenerateDialogOpen(true)}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {t('regenerateBackupCodes')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setDisableDialogOpen(true)}
                >
                  {t('disable2FA')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t('twoFactorSetupMessage')}
              </p>
              <Button onClick={startSetup} disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('configuring')}
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    {t('configure2FA')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={setupDialogOpen} onOpenChange={closeSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 2 && t('configure2FATitle')}
              {step === 3 && t('backupCodesTitle')}
            </DialogTitle>
            <DialogDescription>
              {step === 2 && t('scanQRCodeMessage')}
              {step === 3 && t('saveBackupCodesMessage')}
            </DialogDescription>
          </DialogHeader>

          {step === 2 && (
            <div className="space-y-6 py-4">
              {/* QR Code */}
              <div className="flex justify-center">
                {qrCodeUrl && (
                  <img
                    src={qrCodeUrl}
                    alt="QR Code 2FA"
                    className="w-48 h-48 border rounded-lg"
                  />
                )}
              </div>

              {/* Manual Entry */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 text-center">
                  {t('orEnterManually')}
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="px-3 py-2 bg-gray-100 rounded font-mono text-sm">
                    {secret}
                  </code>
                  <Button size="sm" variant="ghost" onClick={copySecret}>
                    {copiedSecret ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Verification */}
              <div className="space-y-2">
                <Label>{t('enter6DigitCode')}</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    {t('backupCodesWarningMessage')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <code
                    key={index}
                    className="px-3 py-2 bg-gray-100 rounded font-mono text-sm text-center"
                  >
                    {code}
                  </code>
                ))}
              </div>

              <Button onClick={copyAllBackupCodes} variant="outline" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                {t('copyAllCodes')}
              </Button>
            </div>
          )}

          <DialogFooter>
            {step === 2 && (
              <>
                <Button variant="outline" onClick={closeSetupDialog}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={verifySetup}
                  disabled={loading || verificationCode.length !== 6}
                >
                  {loading ? t('verifying') : t('verifyAndActivate')}
                </Button>
              </>
            )}
            {step === 3 && (
              <Button onClick={closeSetupDialog} className="w-full">
                {t('savedMyCodes')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disable2FATitle')}</DialogTitle>
            <DialogDescription>
              {t('disable2FAWarning')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('password')}</Label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder={t('yourPassword')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('twoFactorCodeOptional')}</Label>
              <Input
                value={disable2FACode}
                onChange={(e) => setDisable2FACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={loading || !disablePassword}
            >
              {loading ? t('disabling') : t('disable2FA')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Codes Dialog */}
      <Dialog open={regenerateDialogOpen} onOpenChange={setRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('regenerateBackupCodesTitle')}</DialogTitle>
            <DialogDescription>
              {t('regenerateBackupCodesWarning')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('password')}</Label>
              <Input
                type="password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
                placeholder={t('yourPassword')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegenerateDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleRegenerateCodes}
              disabled={loading || !regeneratePassword}
            >
              {loading ? t('generating') : t('generateNewCodes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Display Dialog */}
      <Dialog open={backupCodesDialogOpen} onOpenChange={setBackupCodesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('newBackupCodesTitle')}</DialogTitle>
            <DialogDescription>
              {t('saveBackupCodesMessage')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  {t('oldCodesInvalidated')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <code
                  key={index}
                  className="px-3 py-2 bg-gray-100 rounded font-mono text-sm text-center"
                >
                  {code}
                </code>
              ))}
            </div>

            <Button onClick={copyAllBackupCodes} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" />
              {t('copyAllCodes')}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setBackupCodesDialogOpen(false)} className="w-full">
              {t('savedMyCodes')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
