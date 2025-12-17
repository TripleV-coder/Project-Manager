'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, Bell, Shield, Palette, Mail,
  Save, RefreshCw,
  Moon, Sun, Monitor
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAppSettings, useTranslation } from '@/contexts/AppSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const router = useRouter();
  const { theme: currentTheme, setTheme: applyTheme } = useTheme();
  const {
    sidebarCompact: currentSidebarCompact,
    setSidebarCompact: applySidebarCompact,
    primaryColor: currentPrimaryColor,
    setPrimaryColor: applyPrimaryColor
  } = usePreferences();
  const { updateSettings: updateAppSettings } = useAppSettings();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Général
    appName: 'PM - Gestion de Projets',
    appDescription: 'Plateforme de gestion de projets Agile',
    langue: 'fr',
    timezone: 'Africa/Porto-Novo',
    devise: 'FCFA',
    formatDate: 'DD/MM/YYYY',
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    notifyTaskAssigned: true,
    notifyTaskCompleted: true,
    notifyCommentMention: true,
    notifySprintStart: true,
    notifyBudgetAlert: true,
    // Sécurité
    sessionTimeout: 30,
    passwordMinLength: 8,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    maxLoginAttempts: 5,
    lockoutDuration: 15,
    twoFactorEnabled: false,
    // Apparence
    theme: 'light',
    primaryColor: '#4f46e5',
    sidebarCompact: false
  });

  const loadSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('pm_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }));
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Synchroniser les préférences locales avec les contextes
  useEffect(() => {
    setSettings(prev => ({
      ...prev,
      theme: currentTheme || prev.theme,
      sidebarCompact: currentSidebarCompact,
      primaryColor: currentPrimaryColor || prev.primaryColor
    }));
  }, [currentTheme, currentSidebarCompact, currentPrimaryColor]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('pm_token');
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ settings })
      });

      if (response.ok) {
        // Mettre à jour le contexte global avec les paramètres généraux
        updateAppSettings({
          appName: settings.appName,
          appDescription: settings.appDescription,
          langue: settings.langue,
          timezone: settings.timezone,
          devise: settings.devise,
          formatDate: settings.formatDate,
        });
        toast.success(t('settingsSaved'));
      } else {
        toast.error(t('errorOccurred'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error(t('connectionError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{t('settings')}</h1>
          <p className="text-gray-600">{t('appDescription')}</p>
        </div>
        <Button 
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> {t('loading')}</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> {t('save')}</>
          )}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('general')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('securitySettings')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{t('appearanceSettings')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Général */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('generalSettings')}</CardTitle>
              <CardDescription>{t('appDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('appName')}</Label>
                  <Input
                    value={settings.appName}
                    onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('description')}</Label>
                  <Input
                    value={settings.appDescription}
                    onChange={(e) => setSettings({ ...settings, appDescription: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('language')}</Label>
                  <Select
                    value={settings.langue}
                    onValueChange={(v) => setSettings({ ...settings, langue: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('timezone')}</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Porto-Novo">Cotonou / Porto-Novo (UTC+1)</SelectItem>
                      <SelectItem value="Africa/Abidjan">Abidjan (UTC+0)</SelectItem>
                      <SelectItem value="Africa/Lagos">Lagos (UTC+1)</SelectItem>
                      <SelectItem value="Africa/Douala">Douala (UTC+1)</SelectItem>
                      <SelectItem value="Africa/Dakar">Dakar (UTC+0)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (UTC+1/+2)</SelectItem>
                      <SelectItem value="Europe/London">Londres (UTC+0/+1)</SelectItem>
                      <SelectItem value="America/New_York">New York (UTC-5/-4)</SelectItem>
                      <SelectItem value="America/Montreal">Montréal (UTC-5/-4)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('currency')}</Label>
                  <Select
                    value={settings.devise}
                    onValueChange={(v) => setSettings({ ...settings, devise: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FCFA">FCFA (Franc CFA)</SelectItem>
                      <SelectItem value="EUR">EUR (Euro)</SelectItem>
                      <SelectItem value="USD">USD (Dollar US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('dateFormat')}</Label>
                  <Select
                    value={settings.formatDate}
                    onValueChange={(v) => setSettings({ ...settings, formatDate: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('notificationSettings')}</CardTitle>
              <CardDescription>{t('notifications')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">{t('emailNotifications')}</p>
                      <p className="text-sm text-gray-500">{t('emailNotifications')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium">{t('pushNotifications')}</p>
                      <p className="text-sm text-gray-500">{t('pushNotifications')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(v) => setSettings({ ...settings, pushNotifications: v })}
                  />
                </div>
              </div>

              <Separator />
              <p className="text-sm font-medium text-gray-700">{t('triggerEvents')}</p>

              <div className="space-y-3">
                {[
                  { key: 'notifyTaskAssigned', labelKey: 'notifyTaskAssignedLabel', descKey: 'notifyTaskAssignedDesc' },
                  { key: 'notifyTaskCompleted', labelKey: 'notifyTaskCompletedLabel', descKey: 'notifyTaskCompletedDesc' },
                  { key: 'notifyCommentMention', labelKey: 'notifyCommentMentionLabel', descKey: 'notifyCommentMentionDesc' },
                  { key: 'notifySprintStart', labelKey: 'notifySprintStartLabel', descKey: 'notifySprintStartDesc' },
                  { key: 'notifyBudgetAlert', labelKey: 'notifyBudgetAlertLabel', descKey: 'notifyBudgetAlertDesc' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-sm">{t(item.labelKey)}</p>
                      <p className="text-xs text-gray-500">{t(item.descKey)}</p>
                    </div>
                    <Switch
                      checked={settings[item.key]}
                      onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sécurité */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('securitySettings')}</CardTitle>
              <CardDescription>{t('securitySettings')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('sessionTimeout')} ({t('minutes')})</Label>
                  <Input
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-gray-500">{t('sessionTimeout')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('maxLoginAttempts')}</Label>
                  <Input
                    type="number"
                    value={settings.maxLoginAttempts}
                    onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  />
                  <p className="text-xs text-gray-500">{t('maxLoginAttempts')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('lockoutDuration')} ({t('minutes')})</Label>
                  <Input
                    type="number"
                    value={settings.lockoutDuration}
                    onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 15 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('passwordMinLength')}</Label>
                  <Input
                    type="number"
                    value={settings.passwordMinLength}
                    onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{t('requireNumbers')}</p>
                    <p className="text-sm text-gray-500">{t('requireNumbers')}</p>
                  </div>
                  <Switch
                    checked={settings.passwordRequireNumbers}
                    onCheckedChange={(v) => setSettings({ ...settings, passwordRequireNumbers: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{t('requireSymbols')}</p>
                    <p className="text-sm text-gray-500">{t('requireSymbols')}</p>
                  </div>
                  <Switch
                    checked={settings.passwordRequireSymbols}
                    onCheckedChange={(v) => setSettings({ ...settings, passwordRequireSymbols: v })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">{t('twoFactorAuth')}</p>
                      <p className="text-sm text-gray-500">{t('twoFactorAuth')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.twoFactorEnabled}
                    onCheckedChange={(v) => setSettings({ ...settings, twoFactorEnabled: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Apparence */}
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t('appearanceSettings')}</CardTitle>
              <CardDescription>{t('appearanceSettings')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>{t('theme')}</Label>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', icon: Sun, labelKey: 'light' },
                    { value: 'dark', icon: Moon, labelKey: 'dark' },
                    { value: 'system', icon: Monitor, labelKey: 'system' }
                  ].map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => {
                        setSettings({ ...settings, theme: themeOption.value });
                        applyTheme(themeOption.value);
                        toast.success(t('settingsSaved'));
                      }}
                      className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        settings.theme === themeOption.value
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <themeOption.icon className={`w-6 h-6 ${
                        settings.theme === themeOption.value ? 'text-indigo-600' : 'text-gray-400'
                      }`} />
                      <span className="text-sm font-medium">{t(themeOption.labelKey)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t('primaryColor')}</Label>
                <div className="flex flex-wrap items-center gap-4">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => {
                      setSettings({ ...settings, primaryColor: e.target.value });
                      applyPrimaryColor(e.target.value);
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-600"
                  />
                  <Input
                    value={settings.primaryColor}
                    onChange={(e) => {
                      setSettings({ ...settings, primaryColor: e.target.value });
                      if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) {
                        applyPrimaryColor(e.target.value);
                      }
                    }}
                    className="w-32"
                  />
                  <div className="flex gap-2">
                    {['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setSettings({ ...settings, primaryColor: color });
                          applyPrimaryColor(color);
                          toast.success(t('settingsSaved'));
                        }}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          settings.primaryColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">{t('sidebarCompact')}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('sidebarCompact')}</p>
                </div>
                <Switch
                  checked={settings.sidebarCompact}
                  onCheckedChange={(v) => {
                    setSettings({ ...settings, sidebarCompact: v });
                    applySidebarCompact(v);
                    toast.success(t('settingsSaved'));
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
