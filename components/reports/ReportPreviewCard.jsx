'use client';

import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ReportPreviewCard({ reportType, projects, tasks, users, t }) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle>{t('previewContent')}</CardTitle>
        <CardDescription>{t('previewDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {reportType === 'global' && (
            <>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('globalStats')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {projects.length} {t('projects').toLowerCase()}, {tasks.length}{' '}
                    {t('tasks').toLowerCase()}, {users.length} {t('users').toLowerCase()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('projectsList')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('projectsListDesc')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('tasksDistribution')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('tasksDistributionDesc')}
                  </p>
                </div>
              </div>
            </>
          )}
          {reportType === 'projet' && (
            <>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('projectInfo')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('projectInfoDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('tasksList')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('tasksListDesc')}</p>
                </div>
              </div>
            </>
          )}
          {reportType === 'performance' && (
            <>
              <div className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <div className="font-medium">{t('userStats')}</div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{t('userStatsDesc')}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
