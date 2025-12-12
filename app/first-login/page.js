'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FirstLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    temporary_password: '',
    new_password: '',
    new_password_confirm: ''
  });
  const [showTemp, setShowTemp] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('pm_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/auth/first-login-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        let errorMessage = 'Une erreur est survenue';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `Erreur ${response.status}`;
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Succès, rediriger vers dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Erreur de connexion au serveur');
      setLoading(false);
    }
  };

  const passwordRequirements = [
    { met: formData.new_password.length >= 8 && formData.new_password.length <= 12, text: '8-12 caractères' },
    { met: /[A-Z]/.test(formData.new_password), text: 'Une majuscule' },
    { met: /[a-z]/.test(formData.new_password), text: 'Une minuscule' },
    { met: /[0-9]/.test(formData.new_password), text: 'Un chiffre' },
    { met: /[!@#$%^&*(),.?":{}|<>]/.test(formData.new_password), text: 'Un caractère spécial' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-4 shadow-lg"
          >
            <KeyRound className="w-10 h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Changement de mot de passe obligatoire</h1>
          <p className="text-gray-600">Veuillez définir un nouveau mot de passe pour continuer</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle>Premier login</CardTitle>
            <CardDescription>
              Votre mot de passe temporaire est <strong>00000000</strong>. Vous devez le changer maintenant.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="temporary_password">Mot de passe temporaire</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="temporary_password"
                    type={showTemp ? 'text' : 'password'}
                    value={formData.temporary_password}
                    onChange={(e) => setFormData({ ...formData, temporary_password: e.target.value })}
                    className="pl-10 pr-10"
                    placeholder="00000000"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowTemp(!showTemp)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showTemp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="new_password"
                    type={showNew ? 'text' : 'password'}
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.new_password && (
                  <div className="mt-2 space-y-1">
                    {passwordRequirements.map((req, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <CheckCircle2 className={`w-3 h-3 ${req.met ? 'text-green-500' : 'text-gray-300'}`} />
                        <span className={req.met ? 'text-green-600' : 'text-gray-400'}>{req.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password_confirm">Confirmation du nouveau mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="new_password_confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={formData.new_password_confirm}
                    onChange={(e) => setFormData({ ...formData, new_password_confirm: e.target.value })}
                    className="pl-10 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                {loading ? 'Modification en cours...' : 'Modifier mon mot de passe'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
