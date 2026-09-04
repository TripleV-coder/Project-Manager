'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function ReportFilters({
  reportType,
  setReportType,
  reportTypes,
  selectedProject,
  setSelectedProject,
  projects,
  exportFormat,
  setExportFormat,
  generating,
  handleGenerateReport,
  t,
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('reportsType')}</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup value={reportType} onValueChange={setReportType}>
            <div className="space-y-3">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <div
                    key={type.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <RadioGroupItem value={type.id} id={type.id} />
                    <label htmlFor={type.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium">{type.name}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{type.description}</p>
                    </label>
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('parameters')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reportType === 'projet' && (
            <div className="space-y-2">
              <Label>{t('selectProject')}</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un projet" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('selectExportFormat')}</Label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">{t('exportFormatPdf')}</SelectItem>
                <SelectItem value="excel">{t('exportFormatExcel')}</SelectItem>
                <SelectItem value="csv">{t('exportFormatCsv')}</SelectItem>
                <SelectItem value="md">Markdown (.md)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-indigo-600 hover:bg-indigo-700"
        size="lg"
        onClick={handleGenerateReport}
        disabled={generating || (reportType === 'projet' && !selectedProject)}
      >
        {generating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            {t('generatingReport')}
          </>
        ) : (
          <>
            <Download className="w-5 h-5 mr-2" />
            {t('generateReportButton')}
          </>
        )}
      </Button>
    </div>
  );
}
