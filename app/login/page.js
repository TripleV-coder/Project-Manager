'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, Mail, Lock, Eye, EyeOff, CheckCircle, Shield, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Footer from '@/components/Footer';
import { useTranslation } from '@/contexts/AppSettingsContext';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');

  useEffect(() => {
    if (searchParams.get('firstAdmin') === 'true') {
      setSuccessMessage(t('firstAdminCreated'));
    }
  }, [searchParams, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(15000)
      });

      if (!response.ok) {
        let errorMessage = t('errorOccurred');
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `${t('error')} ${response.status}`;
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true);
        setTwoFactorEmail(data.email);
        setLoading(false);
        return;
      }

      // Validate response structure
      if (!data.token || !data.user) {
        setError(t('invalidAuthResponse'));
        setLoading(false);
        return;
      }

      localStorage.setItem('pm_token', data.token);
      localStorage.setItem('pm_user', JSON.stringify(data.user));

      // Stop loading before redirect
      setLoading(false);

      // Navigate after a brief delay to allow UI update
      setTimeout(() => {
        if (data.user.first_login || data.user.must_change_password) {
          router.push('/first-login');
        } else {
          router.push('/dashboard');
        }
      }, 100);
    } catch (_err) {
      setError(t('serverConnectionError'));
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: twoFactorEmail,
          token: twoFactorCode.replace(/\s/g, ''),
          isBackupCode: useBackupCode
        }),
        signal: AbortSignal.timeout(15000)
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('invalidCode'));
        setLoading(false);
        return;
      }

      // Validate response structure
      if (!data.data?.token || !data.data?.user) {
        setError(t('invalidAuthResponse'));
        setLoading(false);
        return;
      }

      localStorage.setItem('pm_token', data.data.token);
      localStorage.setItem('pm_user', JSON.stringify(data.data.user));

      // Show warning if backup codes are running low
      if (data.data.backupCodesRemaining !== undefined && data.data.backupCodesRemaining <= 3) {
        alert(t('backupCodesWarning').replace('{count}', data.data.backupCodesRemaining));
      }

      setLoading(false);

      setTimeout(() => {
        if (data.data.user.first_login || data.data.user.must_change_password) {
          router.push('/first-login');
        } else {
          router.push('/dashboard');
        }
      }, 100);
    } catch (_err) {
      setError(t('serverConnectionError'));
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setRequires2FA(false);
    setTwoFactorCode('');
    setUseBackupCode(false);
    setTwoFactorEmail('');
    setError('');
  };

  // 2FA verification screen
  if (requires2FA) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('twoFactorVerification')}</h1>
            <p className="text-gray-600 dark:text-gray-400">{t('enterAuthCode')}</p>
          </div>

          <Card className="shadow-xl border-0">
            <CardHeader>
              <CardTitle>{t('twoFactorTitle')}</CardTitle>
              <CardDescription>
                {useBackupCode
                  ? t('enterBackupCode')
                  : t('enter6DigitCode')}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handle2FASubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="twoFactorCode">
                    {useBackupCode ? t('backupCode') : t('verificationCode')}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="twoFactorCode"
                      type="text"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(useBackupCode
                        ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
                        : e.target.value.replace(/\D/g, '').slice(0, 6)
                      )}
                      className="pl-10 text-center text-xl tracking-widest"
                      placeholder={useBackupCode ? 'ABCD1234' : '000000'}
                      maxLength={useBackupCode ? 8 : 6}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setTwoFactorCode('');
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {useBackupCode
                    ? t('useAuthApp')
                    : t('useBackupCode')}
                </button>
              </CardContent>

              <CardFooter className="flex flex-col gap-2">
                <Button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  disabled={loading || (useBackupCode ? twoFactorCode.length !== 8 : twoFactorCode.length !== 6)}
                >
                  {loading ? t('verifying') : t('verify')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={resetToLogin}
                >
                  {t('backToLogin')}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('projectManagementPlatform')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('connectToAccessSpace')}</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>{t('login')}</CardTitle>
            <CardDescription>
              {t('enterCredentials')}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {successMessage && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="votre@email.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('password')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={loading}
              >
                {loading ? t('loggingIn') : t('loginButton')}
              </Button>
            </CardFooter>
          </form>
        </Card>

      </div>
    </div>
  );
}

function LoadingFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center">{t('loading')}</div>
  );
}

export default function Login() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <Suspense fallback={<LoadingFallback />}>
          <LoginContent />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
